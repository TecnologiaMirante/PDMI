import { useState, useEffect } from "react";
import logoMirante from "@/assets/logo_mirante.png";
import { toast } from "sonner";
import { ShieldCheck, BarChart3 } from "lucide-react";
import portalLogo from "@/assets/PORTAL DE DADOS.svg";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signInWithGoogle } from "@infra/firebase";
import { useTheme } from "@/context/ThemeContext";

// Componente de Ícone atualizado para o novo design (substitui o ChartIconSmall isolado)
function ChartIconBadge() {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-linear-to-br from-primary via-primary/80 to-primary/50 text-primary-foreground shadow-[0_16px_30px_-18px_rgba(var(--primary),0.9)]">
      <BarChart3 className="h-6 w-6" />
    </div>
  );
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { setDark } = useTheme();

  // Força o modo noturno permanentemente sempre que entra na página de login
  useEffect(() => {
    setDark(true);
  }, [setDark]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
      if (err.code === "auth/unauthorized-domain-mirante") {
        toast.error("Acesso restrito a contas @mirante.com.br.");
      } else if (err.code === "auth/popup-closed-by-user") {
        toast.error("Login cancelado. Tente novamente.");
      } else if (err.code === "auth/unauthorized-domain") {
        toast.error(
          "Domínio não autorizado no Firebase. Verifique as configurações.",
        );
      } else {
        toast.error("Falha no login com Google. Tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-8 sm:px-6 lg:px-8 font-sans transition-colors duration-500">
      {/* ── Background Patterns & Ilustração ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Ilustração Temática de Dados ao Fundo */}
        <DataPortalIllustration />

        {/* Gradientes e Texturas adaptáveis ao tema claro/escuro */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.08),transparent_26%),radial-gradient(circle_at_top_right,hsl(var(--primary)/0.12),transparent_28%),linear-gradient(180deg,hsl(var(--background)/0.1),hsl(var(--background)/0.8))]" />

        {/* Orbs Flutuantes de Brilho */}
        <div className="absolute -left-24 top-10 h-64 w-64 rounded-full bg-primary/10 blur-[80px] animate-pulse" />
        <div
          className="absolute -right-16 top-16 h-80 w-80 rounded-full bg-primary/10 blur-[100px] animate-pulse"
          style={{ animationDelay: "1.4s" }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] xl:gap-12">
          {/* ── SEÇÃO ESQUERDA (Branding) ── */}
          <section className="flex flex-col justify-between gap-8 lg:min-h-130 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Pill de Identificação */}
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-border/50 bg-background/40 px-4 py-3 shadow-[0_18px_38px_-24px_rgba(0,0,0,0.5)] backdrop-blur-md">
              <ChartIconBadge />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/90">
                  Business Intelligence
                </p>
                <p className="text-xl font-semibold tracking-tight text-foreground">
                  Portal de Dados
                </p>
              </div>
            </div>

            {/* Titulo Principal */}
            <div className="space-y-5">
              <h1 className="text-justify max-w-lg text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl lg:leading-[1.1]">
                Acesso Integrado aos{" "}
                <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-primary/60">
                  Painéis e Relatórios
                </span>
              </h1>

              <p className="max-w-lg text-base text-justify leading-7 text-muted-foreground sm:text-lg">
                Gerencie todos os painéis e métricas da organização em um único
                ambiente centralizado e seguro.
              </p>
            </div>

            {/* Footer Esquerdo */}
            <div className="hidden lg:flex items-center gap-3 mt-4 self-start rounded-full border border-border/40 bg-card/30 px-5 py-3 backdrop-blur-sm">
              <img
                src={logoMirante}
                alt="Logo Mirante"
                className="h-8 w-auto"
              />
              <span className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                © {new Date().getFullYear()} Mirante Tecnologia
              </span>
            </div>
          </section>

          {/* ── SEÇÃO DIREITA (Card de Login) ── */}
          <section
            className="animate-in fade-in slide-in-from-bottom-10 duration-1000"
            style={{ animationDelay: "0.12s" }}
          >
            <Card className="relative overflow-hidden rounded-4xl border border-border/50 bg-card/60 text-foreground shadow-[0_36px_90px_-44px_rgba(0,0,0,0.3)] backdrop-blur-xl">
              {/* Efeito de Vidro Interno no Card */}
              <div className="absolute inset-0 bg-linear-to-b from-primary/5 to-transparent pointer-events-none" />

              <CardHeader className="flex flex-col items-center text-center border-b border-border/40 p-8 sm:p-10 pb-6 sm:pb-8 relative z-10">
                {/* Logo Centralizado */}
                <div className="h-16 w-auto mb-5 flex items-center justify-center p-2 rounded-[22px] bg-background/80 shadow-[0_22px_40px_-18px_rgba(0,0,0,0.2)] ring-1 ring-border/50 backdrop-blur-sm transition-transform hover:scale-105 duration-300">
                  <img
                    src={portalLogo}
                    alt="Portal de Dados Mirante"
                    className="h-10 w-auto drop-shadow-sm invert dark:invert-0"
                    draggable={false}
                  />
                </div>

                <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
                  Acesso ao Portal
                </CardTitle>

                <CardDescription className="pt-2.5 text-sm leading-6 text-muted-foreground sm:text-base">
                  Utilize suas credenciais corporativas para visualizar os
                  painéis.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6 p-8 sm:p-10 pt-6 sm:pt-8 relative z-10">
                {/* Botão Google Melhorado */}
                <Button
                  id="btn-google-login"
                  variant="outline"
                  size="lg"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full h-14 bg-background/50 hover:bg-background/80 text-foreground border-border/60 font-semibold rounded-2xl text-base shadow-sm transition-all relative overflow-hidden group backdrop-blur-md"
                >
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin relative z-10" />
                  ) : (
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      className="mr-3 relative z-10"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                  )}
                  <span className="relative z-10">
                    {isLoading ? "Autenticando..." : "Entrar com Google"}
                  </span>
                </Button>

                {/* Aviso Restrito */}
                <div className="mt-2 flex items-start gap-3 rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3.5 transition-colors">
                  <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0 text-primary/80" />
                  <p className="text-[13px] leading-relaxed text-left text-muted-foreground">
                    Acesso exclusivo para colaboradores Mirante.{" "}
                    <span className="mt-1 block font-medium text-foreground sm:mt-0 sm:inline">
                      Use seu e-mail corporativo.
                    </span>
                  </p>
                </div>

                {/* Footer Mobile */}
                <div className="lg:hidden flex items-center justify-center gap-2.5 pt-4">
                  <span className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground/50 uppercase">
                    © {new Date().getFullYear()} Mirante Tecnologia
                  </span>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

// ── Ilustração Vetorial Temática (Dados, BI, Gráficos) ──
function DataPortalIllustration() {
  return (
    <svg
      viewBox="0 0 720 880"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0 w-full h-full opacity-40 dark:opacity-20"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <filter id="data-blur-md" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
      </defs>

      {/* Grid de Fundo Sutil */}
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path
          d="M 40 0 L 0 0 0 40"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeOpacity="0.1"
          className="text-primary"
        />
      </pattern>
      <rect width="100%" height="100%" fill="url(#grid)" />

      {/* Elemento de Gráfico de Linhas (Fundo) */}
      <path
        d="M -50 600 Q 150 450 350 550 T 800 300"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.15"
        fill="none"
        className="text-primary"
      />
      <path
        d="M -50 700 Q 200 550 400 650 T 800 400"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.08"
        fill="none"
        strokeDasharray="4 4"
        className="text-primary"
      />

      {/* Widget Abstrato 1 (Gráfico de Barras) */}
      <g transform="translate(80, 120)">
        <rect
          width="120"
          height="90"
          rx="8"
          fill="currentColor"
          fillOpacity="0.03"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth="1"
          className="text-primary"
        />
        <rect
          x="15"
          y="45"
          width="12"
          height="30"
          rx="2"
          fill="currentColor"
          fillOpacity="0.2"
          className="text-primary"
        />
        <rect
          x="35"
          y="25"
          width="12"
          height="50"
          rx="2"
          fill="currentColor"
          fillOpacity="0.4"
          className="text-primary"
        />
        <rect
          x="55"
          y="15"
          width="12"
          height="60"
          rx="2"
          fill="currentColor"
          fillOpacity="0.6"
          className="text-primary"
        />
        <rect
          x="75"
          y="35"
          width="12"
          height="40"
          rx="2"
          fill="currentColor"
          fillOpacity="0.3"
          className="text-primary"
        />
        <rect
          x="95"
          y="55"
          width="12"
          height="20"
          rx="2"
          fill="currentColor"
          fillOpacity="0.15"
          className="text-primary"
        />
      </g>

      {/* Widget Abstrato 2 (Donut Chart) */}
      <g transform="translate(550, 180)">
        <rect
          width="100"
          height="100"
          rx="50"
          fill="currentColor"
          fillOpacity="0.02"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth="1"
          className="text-primary"
        />
        <circle
          cx="50"
          cy="50"
          r="30"
          stroke="currentColor"
          strokeWidth="8"
          strokeOpacity="0.1"
          fill="none"
          className="text-primary"
        />
        <path
          d="M 50 20 A 30 30 0 0 1 78.5 60"
          stroke="currentColor"
          strokeWidth="8"
          strokeOpacity="0.6"
          fill="none"
          strokeLinecap="round"
          className="text-primary"
        />
        <circle
          cx="50"
          cy="50"
          r="4"
          fill="currentColor"
          fillOpacity="0.5"
          className="text-primary"
        />
      </g>

      {/* Nós Conectados (Estilo Network/Data Lineage) */}
      {[
        [200, 300],
        [320, 240],
        [450, 320],
        [580, 420],
        [380, 480],
        [250, 420],
      ].map(([cx, cy], i, arr) => (
        <g key={i}>
          <circle
            cx={cx}
            cy={cy}
            r="6"
            fill="currentColor"
            fillOpacity="0.8"
            className="text-primary"
          />
          <circle
            cx={cx}
            cy={cy}
            r="16"
            fill="currentColor"
            fillOpacity="0.1"
            className="text-primary"
          />
          {i < arr.length - 1 && (
            <line
              x1={cx}
              y1={cy}
              x2={arr[i + 1][0]}
              y2={arr[i + 1][1]}
              stroke="currentColor"
              strokeOpacity="0.15"
              strokeWidth="1.5"
              className="text-primary"
            />
          )}
        </g>
      ))}
      <line
        x1={250}
        y1={420}
        x2={200}
        y2={300}
        stroke="currentColor"
        strokeOpacity="0.15"
        strokeWidth="1.5"
        className="text-primary"
      />

      {/* Elemento flutuante desfocado */}
      <ellipse
        cx="600"
        cy="700"
        rx="150"
        ry="80"
        fill="currentColor"
        fillOpacity="0.05"
        filter="url(#data-blur-md)"
        className="text-primary"
      />
    </svg>
  );
}
