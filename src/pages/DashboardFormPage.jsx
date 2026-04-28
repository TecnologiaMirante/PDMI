import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ChevronLeft, Save } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import {
  getDashboards,
  getUsers,
  getDashboard,
  createDashboard,
  updateDashboard,
  getSectors,
  createSector,
  createNotification,
} from "@infra/firebase";
import { useAuth } from "@/context/AuthContext";

import ThumbnailUploader from "@/components/dashboard/form/ThumbnailUploader";
import MetadataFields from "@/components/dashboard/form/MetadataFields";
import AccessManager from "@/components/dashboard/form/AccessManager";
import { compressImage } from "@/utils/imageUtils";

// ── Schema de validação ────────────────────────────────────────
const schema = z.object({
  titulo: z.string().min(1, "Título é obrigatório.").max(100, "Máximo 100 caracteres."),
  descricao: z.string().max(500, "Máximo 500 caracteres.").optional(),
  sectorId: z.string().min(1, "Setor é obrigatório."),
  newSetorValue: z.string().optional(),
  link: z.string().optional(),
  isVisible: z.boolean(),
}).refine(
  (data) => data.sectorId !== "__new__" || (data.newSetorValue?.trim().length ?? 0) > 0,
  { message: "Informe o nome do novo setor.", path: ["newSetorValue"] },
);

// ── Campo de erro inline ───────────────────────────────────────
function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

export default function DashboardFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);

  // Campos fora do RHF (não são inputs padrão)
  const [thumb, setThumb] = useState("");
  const [thumbPreview, setThumbPreview] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchUser, setSearchUser] = useState("");
  const [searchAccess, setSearchAccess] = useState("");

  const [setores, setSetores] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  const originalDataRef = useRef(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      titulo: "",
      descricao: "",
      sectorId: "",
      newSetorValue: "",
      link: "",
      isVisible: true,
    },
  });

  const sectorId = watch("sectorId");

  useEffect(() => {
    async function loadData() {
      try {
        const [sectorsData, usersData] = await Promise.all([
          getSectors(),
          getUsers(),
        ]);
        setSetores(sectorsData);
        setAllUsers(
          [...usersData].sort((a, b) =>
            (a.display_name || "").localeCompare(b.display_name || ""),
          ),
        );

        if (isEditMode) {
          const dash = await getDashboard(id);
          if (dash) {
            reset({
              titulo: dash.titulo || "",
              descricao: dash.descricao || "",
              sectorId: dash.sectorId || dash.setor || "",
              newSetorValue: "",
              link: dash.link || "",
              isVisible: dash.isVisible !== undefined ? dash.isVisible : true,
            });
            setThumb(dash.thumb || "");
            setThumbPreview(dash.thumb || "");
            setSelectedUsers(dash.users_acess || []);
            originalDataRef.current = {
              titulo: dash.titulo || "",
              descricao: dash.descricao || "",
              sectorId: dash.sectorId || dash.setor || "",
              link: dash.link || "",
              thumb: dash.thumb || "",
              isVisible: dash.isVisible !== undefined ? dash.isVisible : true,
              users_acess: dash.users_acess || [],
            };
          } else {
            toast.error("Dashboard não encontrado.");
            navigate("/admin");
          }
          setLoading(false);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Erro ao carregar dados.");
      }
    }
    loadData();
  }, [id, isEditMode, navigate, reset]);

  const availableUsers = useMemo(() => {
    return allUsers.filter((u) => {
      const uid = u.id || u.uid;
      if (selectedUsers.includes(uid)) return false;
      if (!searchUser) return true;
      const q = searchUser.toLowerCase();
      return (
        u.display_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    });
  }, [searchUser, selectedUsers, allUsers]);

  const selectedUsersList = useMemo(() => {
    const list = allUsers.filter((u) => selectedUsers.includes(u.id || u.uid));
    if (!searchAccess) return list;
    const q = searchAccess.toLowerCase();
    return list.filter(
      (u) =>
        u.display_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q),
    );
  }, [selectedUsers, allUsers, searchAccess]);

  const handleThumbChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setThumbPreview(url);
    try {
      const optimizedBase64 = await compressImage(file, 800, 0.7);
      setThumb(optimizedBase64);
    } catch (err) {
      console.error("Erro ao comprimir imagem:", err);
      toast.error("Erro ao processar imagem.");
    }
  };

  const handleAddUser = (uid) => {
    setSelectedUsers((prev) => [...prev, uid]);
    setSearchUser("");
  };

  const handleRemoveUser = (uid) => {
    setSelectedUsers((prev) => prev.filter((u) => u !== uid));
  };

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      const uid = user?.uid || user?.id || "unknown";
      let resolvedSectorId = values.sectorId;

      if (values.sectorId === "__new__") {
        resolvedSectorId = await createSector({ name: values.newSetorValue }, uid);
      }

      const data = {
        titulo: values.titulo,
        descricao: values.descricao || "",
        sectorId: resolvedSectorId,
        link: values.link || "",
        thumb: thumb,
        users_acess: selectedUsers,
        isVisible: values.isVisible,
      };

      if (isEditMode) {
        await updateDashboard(id, data, uid);

        const orig = originalDataRef.current;
        if (orig) {
          const changes = [];
          if (values.titulo !== orig.titulo) changes.push("título");
          if ((values.descricao || "") !== orig.descricao) changes.push("descrição");
          if (values.link !== orig.link) changes.push("link do relatório");
          if (thumb !== orig.thumb) changes.push("imagem de capa");
          if (resolvedSectorId !== orig.sectorId) changes.push("setor");
          if (values.isVisible !== orig.isVisible)
            changes.push(`visibilidade (agora ${values.isVisible ? "visível" : "oculto"})`);

          const addedUsers = selectedUsers.filter((u) => !orig.users_acess.includes(u));
          for (const addedUid of addedUsers) {
            createNotification(
              {
                title: `Você recebeu acesso: ${values.titulo}`,
                message: `O dashboard "${values.titulo}" foi disponibilizado para você no portal.`,
                type: "success",
                targetUsers: [addedUid],
              },
              uid,
            ).catch(() => {});
          }

          const existingUsers = selectedUsers.filter((u) => orig.users_acess.includes(u));
          if (changes.length > 0 && existingUsers.length > 0) {
            createNotification(
              {
                title: `Dashboard atualizado: ${values.titulo}`,
                message: `"${values.titulo}" foi modificado — ${changes.join(", ")}.`,
                type: "info",
                targetUsers: existingUsers,
              },
              uid,
            ).catch(() => {});
          }
        }
        toast.success("Dashboard atualizado com sucesso!");
      } else {
        await createDashboard(data, uid);
        if (selectedUsers.length > 0) {
          createNotification(
            {
              title: `Novo dashboard: ${values.titulo}`,
              message: `O dashboard "${values.titulo}" está disponível no portal e você já tem acesso.`,
              type: "success",
              targetUsers: selectedUsers,
            },
            uid,
          ).catch(() => {});
        }
        toast.success("Dashboard criado com sucesso!");
      }
      navigate("/admin");
    } catch (error) {
      console.error("Erro ao salvar dashboard:", error);
      toast.error("Erro ao salvar dashboard.");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-xl text-foreground font-semibold">Acesso bloqueado.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="sticky top-0 z-10 flex items-center gap-4 px-4 md:px-6 py-4 shadow-sm bg-card border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin")}
          className="gap-1 text-primary"
        >
          <ChevronLeft className="size-4" />
          Voltar
        </Button>
        <h1 className="text-lg font-bold text-foreground">
          {isEditMode ? "Editar Dashboard" : "Criar Dashboard"}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle variant="page" />
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={saving}
            className="gap-1.5"
          >
            <Save className="size-4" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-5">
          <ThumbnailUploader
            thumbPreview={thumbPreview}
            onChange={handleThumbChange}
            onClear={() => { setThumb(""); setThumbPreview(""); }}
          />

          {/* Campos com validação injetada via Controller/register */}
          <MetadataFields
            register={register}
            control={control}
            errors={errors}
            FieldError={FieldError}
            sectorId={sectorId}
            setores={setores}
          />

          <AccessManager
            selectedUsers={selectedUsers}
            selectedUsersList={selectedUsersList}
            availableUsers={availableUsers}
            searchAccess={searchAccess}
            setSearchAccess={setSearchAccess}
            searchUser={searchUser}
            setSearchUser={setSearchUser}
            onAddUser={handleAddUser}
            onRemoveUser={handleRemoveUser}
          />
        </div>
      </main>
    </div>
  );
}
