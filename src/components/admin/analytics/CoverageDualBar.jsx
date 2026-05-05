import React from 'react';
import { fmtAdminTime } from '../adminUtils';

export function CoverageDualBar({
  title,
  accessPct,
  coveragePct,
  totalAccesses,
  totalTime,
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span
          className="font-medium text-foreground truncate max-w-[55%]"
          title={title}
        >
          {title}
        </span>
        <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
          <span>{totalAccesses} acessos</span>
          <span className="font-semibold text-foreground">
            {fmtAdminTime(totalTime)}
          </span>
        </div>
      </div>
      <div
        className="flex items-center gap-1.5"
        title={`${Math.round(accessPct)}% dos usuários com permissão abriram este dashboard no período.`}
      >
        <span className="text-[9px] text-primary/70 w-15 shrink-0 text-right uppercase tracking-tighter">
          visitaram
        </span>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${accessPct}%` }}
          />
        </div>
        <span className="text-[9px] font-semibold text-primary w-8">
          {Math.round(accessPct)}%
        </span>
      </div>
      <div
        className="flex items-center gap-1.5"
        title={`${Math.round(coveragePct)}% de todos os usuários da empresa têm permissão para acessar este dashboard.`}
      >
        <span className="text-[9px] text-muted-foreground w-[60px] shrink-0 text-right uppercase tracking-tighter">
          liberados
        </span>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/25 rounded-full transition-all"
            style={{ width: `${coveragePct}%` }}
          />
        </div>
        <span className="text-[9px] font-semibold text-muted-foreground w-8">
          {Math.round(coveragePct)}%
        </span>
      </div>
    </div>
  );
}
