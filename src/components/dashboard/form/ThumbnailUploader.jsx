import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Componente responsável por exibir o preview da imagem e permitir upload
 * @param {Object} props
 * @param {string} props.thumbPreview - URL local para preview
 * @param {Function} props.onClear - Função para limpar a imagem selecionada
 * @param {Function} props.onChange - Handler do input file
 */
export default function ThumbnailUploader({ thumbPreview, onClear, onChange }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-6">
      <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase block mb-3">
        Thumbnail
      </label>
      <div className="relative">
        {thumbPreview ? (
          <div className="relative w-full">
            <img
              src={thumbPreview}
              alt="Preview"
              className="w-full h-52 object-cover rounded-xl border border-border"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={onClear}
              className="absolute top-2 right-2 h-7 w-7 bg-destructive hover:bg-destructive/90 rounded-full text-white z-10 shadow-md"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          <div className="w-full h-52 bg-muted/40 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-primary"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              Clique para adicionar imagem
            </p>
            <p className="text-xs text-muted-foreground/60">PNG, JPG, WEBP</p>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={onChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-xl"
        />
      </div>
    </div>
  );
}
