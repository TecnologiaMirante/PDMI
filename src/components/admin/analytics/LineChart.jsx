import React, { useState } from 'react';

export function LineChart({ data }) {
  const [hovered, setHovered] = useState(null);

  const W = 500;
  const H = 130;
  const PAD = { top: 16, right: 20, bottom: 28, left: 40 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const yTicks = [0, Math.ceil(maxVal / 2), maxVal];

  const xScale = (i) => PAD.left + (i / Math.max(data.length - 1, 1)) * innerW;
  const yScale = (v) => PAD.top + (1 - v / maxVal) * innerH;

  const pts = data.map((d, i) => [xScale(i), yScale(d.value)]);
  const linePath = pts
    .map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`))
    .join(" ");
  const areaPath =
    `M ${pts[0][0]} ${yScale(0)} ` +
    pts.map((p) => `L ${p[0]} ${p[1]}`).join(" ") +
    ` L ${pts[pts.length - 1][0]} ${yScale(0)} Z`;

  const xLabelIndexes = new Set([0, data.length - 1]);
  for (let i = 7; i < data.length - 7; i += 7) xLabelIndexes.add(i);

  const maxIdx = data.reduce(
    (mi, d, i) => (d.value > data[mi].value ? i : mi),
    0,
  );
  const hasData = data.some((d) => d.value > 0);

  const hov = hovered !== null ? data[hovered] : null;
  const hovX = hovered !== null ? xScale(hovered) : 0;
  const hovY = hovered !== null ? yScale(data[hovered].value) : 0;
  const tipW = 64;
  const tipH = 30;
  const tipX = Math.min(
    Math.max(hovX - tipW / 2, PAD.left),
    W - PAD.right - tipW,
  );
  const tipY = hovY - tipH - 6 < PAD.top ? hovY + 8 : hovY - tipH - 6;

  return (
    <div className="w-full relative">
      {!hasData && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-xs text-muted-foreground/50 italic">
            Os dados comeÃ§arÃ£o a aparecer a partir dos prÃ³ximos acessos
          </p>
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: "130px" }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid horizontal */}
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 6}
              y={yScale(tick) + 3.5}
              textAnchor="end"
              fontSize="9"
              fill="currentColor"
              fillOpacity="0.4"
            >
              {tick}
            </text>
          </g>
        ))}

        {/* Baseline */}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={yScale(0)}
          y2={yScale(0)}
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeWidth="1"
        />

        {/* Ãrea */}
        {hasData && <path d={areaPath} fill="url(#chartGrad)" />}

        {/* Linha */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={hasData ? 1 : 0.2}
        />

        {/* Label do pico (mÃ¡ximo) */}
        {hasData && data[maxIdx].value > 0 && hovered !== maxIdx && (
          <g>
            <rect
              x={Math.min(
                Math.max(xScale(maxIdx) - 20, PAD.left),
                W - PAD.right - 40,
              )}
              y={yScale(data[maxIdx].value) - 20}
              width={40}
              height={16}
              rx={4}
              fill="var(--primary)"
              fillOpacity="0.15"
            />
            <text
              x={Math.min(
                Math.max(xScale(maxIdx), PAD.left + 20),
                W - PAD.right - 20,
              )}
              y={yScale(data[maxIdx].value) - 8}
              textAnchor="middle"
              fontSize="9"
              fill="var(--primary)"
              fontWeight="bold"
            >
              {data[maxIdx].value}
            </text>
          </g>
        )}

        {/* Pontos */}
        {data.map((d, i) =>
          d.value > 0 ? (
            <circle
              key={i}
              cx={xScale(i)}
              cy={yScale(d.value)}
              r={hovered === i ? 5 : 3}
              fill="var(--primary)"
              stroke="white"
              strokeWidth="1.5"
              style={{ transition: "r 0.1s" }}
            />
          ) : null,
        )}

        {/* Crosshair no hover */}
        {hovered !== null && hov && hov.value > 0 && (
          <line
            x1={hovX}
            x2={hovX}
            y1={PAD.top}
            y2={yScale(0)}
            stroke="var(--primary)"
            strokeOpacity="0.2"
            strokeWidth="1"
            strokeDasharray="3,3"
          />
        )}

        {/* Tooltip SVG */}
        {hovered !== null && hov && hov.value > 0 && (
          <g transform={`translate(${tipX},${tipY})`}>
            <rect
              width={tipW}
              height={tipH}
              rx={5}
              fill="#0f172a"
              opacity="0.88"
            />
            <text
              x={tipW / 2}
              y={13}
              textAnchor="middle"
              fontSize="11"
              fill="white"
              fontWeight="bold"
            >
              {hov.value}
            </text>
            <text
              x={tipW / 2}
              y={24}
              textAnchor="middle"
              fontSize="8"
              fill="#94a3b8"
            >
              {hov.date?.slice(5)}
            </text>
          </g>
        )}

        {/* Ãreas de hover invisÃ­veis */}
        {data.map((_, i) => {
          const step = innerW / Math.max(data.length - 1, 1);
          return (
            <rect
              key={`hit-${i}`}
              x={xScale(i) - step / 2}
              y={PAD.top}
              width={step}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "crosshair" }}
            />
          );
        })}

        {/* Labels X */}
        {[...xLabelIndexes].map((i) => (
          <text
            key={i}
            x={xScale(i)}
            y={H - 4}
            textAnchor="middle"
            fontSize="8.5"
            fill="currentColor"
            fillOpacity="0.45"
          >
            {data[i]?.date?.slice(5)}
          </text>
        ))}
      </svg>
    </div>
  );
}
