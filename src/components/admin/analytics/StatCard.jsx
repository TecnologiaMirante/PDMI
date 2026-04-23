import React from 'react';

export function StatCard({
  icon,
  label,
  value,
  sub,
  accent = false,
  warning = false,
}) {
  return (
    <div
      className={`bg-card border rounded-2xl p-4 flex items-center gap-3 shadow-sm ${
        warning
          ? "border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10"
          : accent
            ? "border-primary/30 bg-primary/5"
            : "border-border"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          warning ? "bg-amber-500/10" : "bg-primary/10"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground leading-none mb-1">
          {label}
        </p>
        <p className="text-xl font-black text-foreground leading-none">
          {value}
        </p>
        {sub && (
          <p className="text-[9px] text-muted-foreground/60 mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  );
}
