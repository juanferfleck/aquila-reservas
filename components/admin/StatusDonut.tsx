"use client";

import { useState } from "react";

// Paleta categórica validada para daltonismo (ΔE CVD ≥ 8 entre adyacentes).
// El orden de los segmentos es el orden validado: azul → verde → amarillo → rojo.
export type DonutSlice = {
  label: string;
  value: number;
  color: string;
};

const SIZE   = 200;
const STROKE = 22;
const R      = (SIZE - STROKE) / 2;
const C      = 2 * Math.PI * R;
const GAP    = 3; // separación entre segmentos, en px de arco

// Reparto por mayor resto: los porcentajes mostrados suman exactamente 100.
function toPercentLabels(values: number[], total: number): string[] {
  if (total === 0) return values.map(() => "0%");

  const exact  = values.map((v) => (v / total) * 100);
  const floors = exact.map((p) => Math.floor(p));
  let resto    = 100 - floors.reduce((a, b) => a + b, 0);

  // Los que no llegan a 1% se muestran como "<1%" y quedan fuera del reparto
  const elegibles = exact
    .map((p, i) => ({ i, frac: p - Math.floor(p), visible: p >= 1 }))
    .filter((x) => x.visible)
    .sort((a, b) => b.frac - a.frac);

  const extra = new Set<number>();
  for (const cand of elegibles) {
    if (resto <= 0) break;
    extra.add(cand.i);
    resto--;
  }

  return exact.map((p, i) => {
    if (p === 0) return "0%";
    if (p < 1)   return "<1%";
    return `${floors[i] + (extra.has(i) ? 1 : 0)}%`;
  });
}

type Props = { slices: DonutSlice[]; unitLabel: string };

export default function StatusDonut({ slices, unitLabel }: Props) {
  const [active, setActive] = useState<number | null>(null);

  const total   = slices.reduce((sum, s) => sum + s.value, 0);
  const labels  = toPercentLabels(slices.map((s) => s.value), total);
  const visible = slices.filter((s) => s.value > 0);
  const single  = visible.length === 1;

  let offset = 0;
  const arcs = slices.map((s, i) => {
    const len = total === 0 ? 0 : (s.value / total) * C;
    const arc = {
      ...s,
      index: i,
      // Sin separación cuando un solo estado ocupa el anillo completo
      length: single ? len : Math.max(len - GAP, 0),
      offset,
    };
    offset += len;
    return arc;
  });

  const focused = active !== null ? slices[active] : null;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-start sm:gap-10">

      {/* Anillo */}
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={
            total === 0
              ? "Sin reservas registradas"
              : `Distribución de ${total} reservas: ` +
                slices.map((s, i) => `${s.label} ${labels[i]}`).join(", ")
          }
        >
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {/* Pista */}
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke="#e4e9ef"
              strokeWidth={STROKE}
            />
            {arcs.map((a) =>
              a.length <= 0 ? null : (
                <circle
                  key={a.label}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={STROKE}
                  strokeDasharray={`${a.length} ${C - a.length}`}
                  strokeDashoffset={-a.offset}
                  className="transition-opacity duration-200 cursor-default"
                  style={{ opacity: active === null || active === a.index ? 1 : 0.3 }}
                  onMouseEnter={() => setActive(a.index)}
                  onMouseLeave={() => setActive(null)}
                />
              )
            )}
          </g>
        </svg>

        {/* Centro: total, o el segmento apuntado */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-8 text-center">
          {focused && total > 0 ? (
            <>
              <span className="text-3xl font-bold leading-none text-aquila-900">
                {labels[active as number]}
              </span>
              <span className="text-[11px] font-bold text-stone-500 mt-1 leading-tight">
                {focused.label}
              </span>
              <span className="text-[10px] text-stone-400 leading-tight">
                {focused.value} de {total}
              </span>
            </>
          ) : (
            <>
              <span className="text-3xl font-bold leading-none text-aquila-900">{total}</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mt-1">
                {unitLabel}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Referencias con el porcentaje de cada estado */}
      <ul className="flex flex-col gap-2 w-full sm:w-auto sm:min-w-[220px]">
        {slices.map((s, i) => (
          <li
            key={s.label}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors"
            style={{ backgroundColor: active === i ? "#f2f4f7" : "transparent" }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-xs font-medium text-stone-600 flex-1 min-w-0 truncate">
              {s.label}
            </span>
            <span className="text-xs text-stone-400 tabular-nums">{s.value}</span>
            <span className="text-xs font-bold text-aquila-800 tabular-nums w-10 text-right">
              {labels[i]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
