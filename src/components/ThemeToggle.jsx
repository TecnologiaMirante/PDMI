import { useTheme } from "@/context/ThemeContext";

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14" height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13" height="13"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

/**
 * ThemeToggle — variante "navbar" (sobre fundo escuro teal) ou "page" (sobre fundo claro/escuro da página).
 * Prop: variant = "navbar" | "page"
 */
export default function ThemeToggle({ variant = "navbar" }) {
  const { dark, toggleTheme } = useTheme();

  if (variant === "page") {
    // Versão compacta para navbars de páginas internas (fundo claro ou escuro)
    return (
      <button
        onClick={toggleTheme}
        aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
        title={dark ? "Modo claro" : "Modo escuro"}
        className="flex items-center gap-1.5 bg-muted border border-border rounded-full
                   px-2 py-1.5 cursor-pointer select-none hover:bg-accent
                   transition-all duration-200 group"
      >
        {/* Track */}
        <div
          className="relative w-9 h-5 rounded-full transition-all duration-400 shrink-0"
          style={{
            background: dark
              ? "linear-gradient(135deg, #1a237e 0%, #283593 100%)"
              : "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
            boxShadow: dark
              ? "0 0 8px rgba(99,102,241,0.4)"
              : "0 0 8px rgba(251,191,36,0.4)",
          }}
        >
          {dark && (
            <>
              <span className="absolute top-[3px] left-[4px] w-0.5 h-0.5 bg-white rounded-full opacity-80" />
              <span className="absolute top-[9px] left-[6px] w-0.5 h-0.5 bg-white rounded-full opacity-60" />
              <span className="absolute top-[5px] left-[10px] w-0.5 h-0.5 bg-white rounded-full opacity-70" />
            </>
          )}
          <div
            className="absolute top-[2px] w-[18px] h-[18px] rounded-full flex items-center justify-center
                       transition-all duration-300 ease-in-out shadow-md"
            style={{
              left: dark ? "calc(100% - 20px)" : "2px",
              background: dark ? "#c7d2fe" : "#fff",
            }}
          >
            {dark ? (
              <MoonIcon className="text-indigo-800" />
            ) : (
              <SunIcon className="text-amber-500" />
            )}
          </div>
        </div>
        <span className="text-foreground text-[11px] font-medium hidden sm:block min-w-[28px] leading-none">
          {dark ? "Dark" : "Light"}
        </span>
      </button>
    );
  }

  // variant === "navbar" — sobre fundo teal
  return (
    <button
      onClick={toggleTheme}
      aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={dark ? "Modo claro" : "Modo escuro"}
      className="flex items-center gap-1.5 bg-white/10 border border-white/25 rounded-full
                 px-2 py-1.5 cursor-pointer select-none hover:bg-white/20
                 transition-all duration-200 group"
    >
      <div
        className="relative w-9 h-5 rounded-full transition-all duration-400 shrink-0"
        style={{
          background: dark
            ? "linear-gradient(135deg, #1a237e 0%, #283593 100%)"
            : "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
          boxShadow: dark
            ? "0 0 8px rgba(99,102,241,0.5)"
            : "0 0 8px rgba(251,191,36,0.5)",
        }}
      >
        {dark && (
          <>
            <span className="absolute top-[3px] left-[4px] w-0.5 h-0.5 bg-white rounded-full opacity-80" />
            <span className="absolute top-[9px] left-[6px] w-0.5 h-0.5 bg-white rounded-full opacity-60" />
            <span className="absolute top-[5px] left-[10px] w-0.5 h-0.5 bg-white rounded-full opacity-70" />
          </>
        )}
        <div
          className="absolute top-[2px] w-[18px] h-[18px] rounded-full flex items-center justify-center
                     transition-all duration-300 ease-in-out shadow-md"
          style={{
            left: dark ? "calc(100% - 20px)" : "2px",
            background: dark ? "#c7d2fe" : "#fff",
          }}
        >
          {dark ? <MoonIcon /> : <SunIcon />}
        </div>
      </div>
      <span className="text-white text-[11px] font-medium hidden sm:block min-w-[28px] leading-none">
        {dark ? "Dark" : "Light"}
      </span>
    </button>
  );
}
