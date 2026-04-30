import { useState, useRef, useEffect, useCallback } from "react";
import {
  ChevronDown,
  Send,
  Loader2,
  User,
  Database,
  ArrowDown,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Trash2,
} from "lucide-react";
import iconMara from "@/assets/iconMara.png";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  getAgentMetadata,
  getChatHistory,
  saveChatHistory,
  clearChatHistory,
} from "@infra/firebase";
import { useAuth } from "@/context/AuthContext";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

const INITIAL_MESSAGE = {
  role: "assistant",
  isInitial: true,
  content:
    "Olá! Eu sou a Mara, Analista de BI Sênior. Posso te ajudar com os dados deste dashboard, criar medidas DAX, explicar modelagem, otimizar performance ou tirar qualquer dúvida de Power BI.",
};

function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/#{1,6}\s+/gm, "")
    .replace(/\*\*\*(.+?)\*\*\*/gs, "$1")
    .replace(/\*\*(.+?)\*\*/gs, "$1")
    .replace(/\*(.+?)\*/gs, "$1")
    .replace(/__(.+?)__/gs, "$1")
    .replace(/_(.+?)_/gs, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^>\s*/gm, "")
    .replace(/^\|.+\|$/gm, "")
    .replace(/^[-|:]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function FloatingChatWidget({
  dashboardId,
  dashboard,
  sectorName,
  pbiStatus,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  // "closed" | "opening" | "open" | "closing"
  const [panelState, setPanelState] = useState("closed");
  const { user } = useAuth();
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  // Reseta o estado quando muda de dashboard
  useEffect(() => {
    setMessages([INITIAL_MESSAGE]);
    setHistoryLoaded(false);
    setMetadata(null);
    setMetadataLoaded(false);
    setSnapshotText(null);
    setSnapshotStatus("idle");
  }, [dashboardId]);

  // Gerencia o ciclo de animação via state machine:
  // closed → opening (monta + anima entrada) → open
  // open → closing (anima saída) → closed (desmonta)
  useEffect(() => {
    if (isOpen) {
      setPanelState((prev) =>
        prev === "closed" ? "opening" : prev
      );
    } else {
      setPanelState((prev) =>
        prev === "open" || prev === "opening" ? "closing" : prev
      );
    }
  }, [isOpen]);

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const isStreamingRef = useRef(false);

  const [metadata, setMetadata] = useState(null);
  const [metadataLoaded, setMetadataLoaded] = useState(false);
  const [snapshotText, setSnapshotText] = useState(null);
  const [snapshotStatus, setSnapshotStatus] = useState("idle");

  const [copied, setCopied] = useState(null);
  const [copiedMode, setCopiedMode] = useState(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const isNearBottomRef = useRef(true);

  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (isOpen && !metadataLoaded) {
      getAgentMetadata(dashboardId)
        .then((data) => setMetadata(data))
        .catch(() => setMetadata(null))
        .finally(() => setMetadataLoaded(true));
    }
  }, [isOpen, dashboardId, metadataLoaded]);

  useEffect(() => {
    // Dispara snapshot assim que o metadata foi carregado (mesmo que vazio)
    // O backend faz auto-descoberta por título quando datasetId está ausente
    if (snapshotStatus !== "idle" || !metadataLoaded) return;
    setSnapshotStatus("loading");

    const body = {
      titulo:      dashboard.titulo,              // para auto-descoberta
      datasetId:   metadata?.datasetId   ?? null,
      workspaceId: metadata?.workspaceId ?? null,
      tables:      metadata?.tables      ?? [],
      modelSchema: {
        measures:       metadata?.measures       ?? [],
        columnsByTable: metadata?.columnsByTable ?? {},
        relationships:  metadata?.relationships  ?? [],
      },
    };

    fetch(`${API_BASE}/api/snapshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((r) => r.text())
      .then((text) => {
        setSnapshotText(text || "");
        setSnapshotStatus(text ? "ready" : "error");
      })
      .catch(() => {
        setSnapshotText("");
        setSnapshotStatus("error");
      });
  }, [metadataLoaded, snapshotStatus, metadata, dashboard.titulo]);

  // Carrega histórico do Firestore ao abrir o chat
  useEffect(() => {
    if (isOpen && user?.uid && !historyLoaded) {
      getChatHistory(user.uid, dashboardId).then((history) => {
        if (history && history.length > 0) {
          setMessages(history);
        }
        setHistoryLoaded(true);
      });
    }
  }, [isOpen, user?.uid, dashboardId, historyLoaded]);

  // Salva histórico no Firestore após cada mensagem ser finalizada
  useEffect(() => {
    if (isStreaming || !historyLoaded || !user?.uid) return;
    // Não salva se for apenas a mensagem inicial
    if (messages.length === 1 && messages[0].isInitial) return;

    saveChatHistory(user.uid, dashboardId, messages);
  }, [messages, dashboardId, isStreaming, user?.uid, historyLoaded]);

  // Auto-scroll para o final apenas quando o usuário já está perto do fim
  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingContent]);

  // Ao abrir o chat ou terminar de carregar o histórico: salta direto para o final
  useEffect(() => {
    if (!isOpen) {
      isNearBottomRef.current = true;
      return;
    }
    const raf = requestAnimationFrame(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop =
          messagesContainerRef.current.scrollHeight;
        isNearBottomRef.current = true;
        setShowScrollBottom(false);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen, historyLoaded]);

  const clearHistory = () => {
    setMessages([INITIAL_MESSAGE]);
    if (user?.uid) {
      clearChatHistory(user.uid, dashboardId);
    }
    setClearDialogOpen(false);
  };

  const handleMessagesScroll = (e) => {
    const el = e.currentTarget;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distFromBottom < 80;
    isNearBottomRef.current = nearBottom;
    setShowScrollBottom(!nearBottom);
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
      isNearBottomRef.current = true;
      setShowScrollBottom(false);
    }
  };

  const handleCopy = async (content, index, mode) => {
    if (!content) return;
    const text = mode === "markdown" ? content : stripMarkdown(content);

    try {
      // Tenta usar a API moderna primeiro
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback para contextos não seguros (sem HTTPS)
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand("copy");
        } catch (err) {
          console.error("Fallback de cópia falhou:", err);
        }
        document.body.removeChild(textArea);
      }

      setCopied(index);
      setCopiedMode(mode);
      setTimeout(() => {
        setCopied(null);
        setCopiedMode(null);
      }, 2000);
    } catch (err) {
      console.error("Falha ao copiar texto:", err);
    }
  };

  const resetTextarea = () => {
    if (textareaRef.current) textareaRef.current.style.height = "40px";
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreamingRef.current) return;

    const userMsg = { role: "user", content: text };
    const history = messages
      .filter((m) => !m.isInitial && !(m.role === "assistant" && !m.content))
      .slice(-6);
    const apiMessages = [...history, userMsg];

    setMessages((prev) => [
      ...prev,
      userMsg,
      { role: "assistant", content: "" },
    ]);
    setInput("");
    resetTextarea();
    isStreamingRef.current = true;
    setIsStreaming(true);
    setStreamingContent("");

    try {
      abortRef.current = new AbortController();
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          context: {
            dashboardId,
            titulo: dashboard.titulo,
            descricao: dashboard.descricao || "",
            sectorName: sectorName || "",
            pbiStatus: pbiStatus || null,
            metadata,
          },
          snapshotText: snapshotText || "",
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error("API error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      let sseError = false;
      let sseErrorMsg = "Desculpe, ocorreu um erro. Tente novamente.";

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let boundary;
        while ((boundary = buffer.indexOf("\n\n")) !== -1) {
          const event = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);

          for (const line of event.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") break outer;
            if (data.startsWith("[ERROR")) {
              sseError = true;
              if (data === "[ERROR:rate_limit]") {
                sseErrorMsg =
                  "Limite de requisições atingido. Aguarde 1 minuto e tente novamente.";
              }
              break outer;
            }
            try {
              accumulated += JSON.parse(data);
              setStreamingContent(accumulated);
            } catch {}
          }
        }
      }

      if (sseError)
        throw Object.assign(new Error("stream_error"), {
          errorMsg: sseErrorMsg,
        });

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: accumulated,
        };
        return updated;
      });
    } catch (err) {
      if (err.name !== "AbortError") {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content:
              err.errorMsg ?? "Desculpe, ocorreu um erro. Tente novamente.",
          };
          return updated;
        });
      }
    } finally {
      setStreamingContent("");
      isStreamingRef.current = false;
      setIsStreaming(false);
    }
  }, [
    input,
    messages,
    dashboard,
    sectorName,
    pbiStatus,
    metadata,
    snapshotText,
  ]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInput = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 112) + "px";
  };

  const handleClose = () => {
    abortRef.current?.abort();
    setIsOpen(false);
    // panelState vai para "closing" → onAnimationEnd completa o ciclo
  };

  const snapshotLabel = {
    idle: null,
    loading: "· sintonizando dados…",
    ready: "· dados em tempo real",
    error: "· erro na leitura",
  }[snapshotStatus];

  const snapshotError = snapshotStatus === "error" || (snapshotText && snapshotText.startsWith("❌")) 
    ? snapshotText 
    : null;

  const mdComponents = {
    h1: ({ children }) => (
      <p className="font-black text-base mb-1">{children}</p>
    ),
    h2: ({ children }) => (
      <p className="font-bold text-sm mb-1 mt-2">{children}</p>
    ),
    h3: ({ children }) => (
      <p className="font-semibold text-sm mb-0.5 mt-1.5">{children}</p>
    ),
    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    ul: ({ children }) => (
      <ul className="list-disc pl-4 my-1 space-y-0.5">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal pl-4 my-1 space-y-0.5">{children}</ol>
    ),
    li: ({ children }) => <li className="text-sm leading-snug">{children}</li>,
    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
    code: ({ children }) => (
      <code className="bg-black/10 dark:bg-white/10 px-1 rounded text-xs font-mono">
        {children}
      </code>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-current/30 pl-2 my-1 opacity-80">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto my-2">
        <table className="text-xs border-collapse w-full">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border border-current/20 px-2 py-1 bg-current/10 font-bold text-left">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-current/20 px-2 py-1">{children}</td>
    ),
    hr: () => <hr className="border-current/20 my-2" />,
  };

  const panelSize = isExpanded
    ? "sm:w-[620px] sm:h-[min(840px,90dvh)] h-[95dvh]"
    : "sm:w-96 sm:h-[min(580px,85dvh)] h-[min(520px,80dvh)]";

  return (
    <>
      {/* Botão flutuante de abrir */}
      {panelState === "closed" && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-full shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 hover:scale-105 transition-all duration-200 cursor-pointer animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-200"
          aria-label="Abrir Analista BI"
        >
          <img src={iconMara} alt="Mara" className="size-7 object-cover rounded-full shrink-0" />
          <span className="text-sm font-semibold">Analista BI</span>
        </button>
      )}

      {/* Painel do chat — montado durante opening/open/closing, animado via keyframes */}
      {panelState !== "closed" && (
        <div
          onAnimationEnd={(e) => {
            if (e.target !== e.currentTarget) return;
            if (e.animationName === "chat-in") setPanelState("open");
            if (e.animationName === "chat-out") {
              setPanelState("closed");
              setIsExpanded(false);
            }
          }}
          className={`fixed bottom-0 right-0 z-50 flex flex-col w-full sm:bottom-6 sm:right-6 bg-card border border-border/60 rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-black/20 overflow-hidden origin-bottom-right chat-resize
            ${panelState === "opening" ? "chat-enter" : ""}
            ${panelState === "closing" ? "chat-exit" : ""}
            ${panelSize}`}
        >
          {/* Header com gradiente */}
          <div className="relative flex items-center gap-3 px-4 py-3.5 bg-linear-to-br from-primary via-primary to-primary/90 text-primary-foreground shrink-0">
            {/* Reflexo sutil no topo do header */}
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent" />

            <div className="w-8 h-8 rounded-full ring-1 ring-white/20 shrink-0 overflow-hidden">
              <img src={iconMara} alt="Mara" className="w-full h-full object-cover" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white text-sm font-bold leading-none">
                  Mara · Analista BI
                </p>
              </div>

              <p className="text-[11px] font-bold text-primary-foreground/65 truncate mt-0.5 flex items-center gap-1">
                {dashboard.titulo}
                {snapshotLabel && (
                  <span className="flex items-center gap-0.5">
                    {snapshotStatus === "loading" && (
                      <Loader2 className="size-2.5 animate-spin" />
                    )}
                    {snapshotStatus === "ready" && (
                      <Database className="size-2.5" />
                    )}
                    {snapshotLabel}
                  </span>
                )}
              </p>
            </div>

            {messages.length > 1 && (
              <button
                onClick={() => setClearDialogOpen(true)}
                className="cursor-pointer w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors shrink-0 opacity-60 hover:opacity-100"
                aria-label="Limpar conversa"
                title="Limpar conversa"
              >
                <Trash2 className="text-primary-foreground size-3.5" />
              </button>
            )}

            <button
              onClick={() => setIsExpanded((v) => !v)}
              className="cursor-pointer w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
              aria-label={isExpanded ? "Recolher chat" : "Expandir chat"}
            >
              {isExpanded ? (
                <Minimize2 className="size-3.5" />
              ) : (
                <Maximize2 className="size-3.5" />
              )}
            </button>

            <button
              onClick={handleClose}
              className="cursor-pointer w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
              aria-label="Fechar chat"
            >
              <ChevronDown className="size-4" />
            </button>
          </div>

          {/* Faixa de STATUS/ERRO */}
          {snapshotError ? (
            <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-800/50 px-4 py-1.5 shrink-0">
              <span className="size-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider truncate">
                {snapshotError}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/50 px-4 py-1.5 shrink-0">
              <span className="size-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                Versão Beta · inteligência em treinamento
              </span>
            </div>
          )}

          {/* Área de mensagens */}
          <div className="relative flex-1 overflow-hidden bg-muted/20">
            <div
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
              className="h-full overflow-y-auto p-4 space-y-4"
            >
              {messages.map((msg, i) => {
                const isAssistant = msg.role === "assistant";
                const isLastMsg = i === messages.length - 1;
                const isActiveStream = isAssistant && isStreaming && isLastMsg;
                const showTyping = isActiveStream && !streamingContent;
                const displayContent =
                  isActiveStream && streamingContent
                    ? streamingContent
                    : msg.content;
                const showCopy =
                  !isActiveStream && msg.content && !msg.isInitial;

                /* ── Mensagem inicial: card flutuante centralizado ── */
                if (msg.isInitial) {
                  return (
                    <div key={i} className="flex justify-center pt-2 pb-1">
                      <div className="max-w-[88%] flex flex-col items-center gap-2 bg-muted/50 border border-border/60 rounded-2xl px-5 py-4 text-center shadow-sm">
                        <div className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-primary/20">
                          <img src={iconMara} alt="Mara" className="w-full h-full object-cover" />
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  );
                }

                /* ── Mensagem normal ── */
                return (
                  <div key={i} className="group flex flex-col gap-0.5">
                    <div
                      className={`flex gap-2.5 ${!isAssistant ? "flex-row-reverse" : ""}`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-7 h-7 rounded-full shrink-0 overflow-hidden ring-1 ${
                          isAssistant
                            ? "ring-primary/30"
                            : "flex items-center justify-center bg-secondary text-secondary-foreground ring-border/40"
                        }`}
                      >
                        {isAssistant ? (
                          <img src={iconMara} alt="Mara" className="w-full h-full object-cover" />
                        ) : user?.picture ? (
                          <img
                            src={user.picture}
                            referrerPolicy="no-referrer"
                            alt="Usuário"
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="size-3.5" />
                        )}
                      </div>

                      {/* Bolha */}
                      <div
                        className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isAssistant
                            ? "bg-card border border-border/50 text-foreground rounded-tl-sm shadow-sm"
                            : "bg-linear-to-br from-primary to-primary/85 text-primary-foreground rounded-tr-sm shadow-sm"
                        }`}
                      >
                        {showTyping ? (
                          <span className="flex items-center gap-1 h-4">
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            />
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
                              style={{ animationDelay: "150ms" }}
                            />
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            />
                          </span>
                        ) : isAssistant ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={mdComponents}
                          >
                            {displayContent}
                          </ReactMarkdown>
                        ) : (
                          msg.content
                        )}
                      </div>
                    </div>

                    {/* Ações de cópia — fica visível 2s após copiar mesmo sem hover */}
                    {showCopy && (
                      <div
                        className={`flex items-center gap-2 px-9 transition-opacity duration-150 ${
                          copied === i
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        } ${!isAssistant ? "flex-row-reverse" : ""}`}
                      >
                        <button
                          onClick={() => handleCopy(displayContent, i, "text")}
                          className="cursor-pointer flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copied === i && copiedMode === "text" ? (
                            <Check className="size-3 text-green-500" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                          {copied === i && copiedMode === "text"
                            ? "Copiado!"
                            : "Copiar mensagem"}
                        </button>
                        {isAssistant && (
                          <>
                            <span className="text-muted-foreground/40 text-[11px] select-none">
                              ·
                            </span>
                            <button
                              onClick={() =>
                                handleCopy(displayContent, i, "markdown")
                              }
                              className="cursor-pointer flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {copied === i && copiedMode === "markdown" ? (
                                <Check className="size-3 text-green-500" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                              {copied === i && copiedMode === "markdown"
                                ? "Copiado!"
                                : "Copiar como markdown"}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Botão ir ao final */}
            {showScrollBottom && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-3 right-3 flex items-center justify-center w-8 h-8 rounded-full bg-card border border-border/60 shadow-md text-muted-foreground hover:text-foreground hover:shadow-lg transition-all z-10"
                aria-label="Ir ao final"
              >
                <ArrowDown className="size-4" />
              </button>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border/60 bg-card shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={handleInput}
                placeholder={
                  snapshotStatus === "loading"
                    ? "Carregando dados do dashboard…"
                    : "Pergunte sobre os dados..."
                }
                rows={1}
                disabled={isStreaming || snapshotStatus === "loading"}
                className="flex-1 resize-none bg-muted/70 border border-border/40 rounded-2xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/30 disabled:opacity-50 max-h-28 transition-colors"
                style={{ minHeight: "40px" }}
              />
              <Button
                size="icon"
                onClick={sendMessage}
                disabled={!input.trim() || isStreaming || snapshotStatus === "loading"}
                className="shrink-0 rounded-xl w-10 h-10 shadow-sm"
                aria-label="Enviar mensagem"
              >
                {isStreaming ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : snapshotStatus === "loading" ? (
                  <Loader2 className="size-4 animate-spin opacity-50" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-center mt-2 transition-colors">
              {snapshotStatus === "loading" ? (
                <span className="text-amber-500 dark:text-amber-400 font-medium">
                  Aguarde · sincronizando dados do dashboard…
                </span>
              ) : snapshotStatus === "error" ? (
                <span className="text-muted-foreground/60">
                  Sem dados em tempo real · Enter para enviar · Shift+Enter para nova linha
                </span>
              ) : (
                <span className="text-muted-foreground/60">
                  Enter para enviar · Shift+Enter para nova linha
                </span>
              )}
            </p>
          </div>
        </div>
      )}
      {/* Diálogo de confirmação para limpar histórico */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá permanentemente todo o histórico de mensagens
              deste dashboard. Você não poderá desfazer isso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={clearHistory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, limpar histórico
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
