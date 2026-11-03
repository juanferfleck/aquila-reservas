"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3, Loader2, AlertTriangle, RefreshCw,
  CalendarCheck, XCircle, CheckCircle2, RotateCcw, UserMinus, UserX,
  GraduationCap, HelpCircle,
} from "lucide-react";
import type { Reservation } from "@/lib/supabase";
import StatusDonut, { type DonutSlice } from "./StatusDonut";

type Stats = {
  total: number;
  cancelled: number;
  attended: number;
  noShow: number;
  confirmed: number;
  rebookedAfterCancel: number;
  lostAfterCancel: number;
  enrolled: number;     // asistieron y se inscribieron en Aquila
  notReturned: number;  // asistieron, probaron y no volvieron
  undecided: number;    // asistieron y el admin todavía no lo definió
};

// Una persona = un email. Se considera que "volvió a agendar" si tiene alguna
// reserva no cancelada creada después de su última cancelación.
function computeStats(reservations: Reservation[]): Stats {
  const byEmail = new Map<string, Reservation[]>();
  for (const r of reservations) {
    const key = r.email.toLowerCase().trim();
    const list = byEmail.get(key);
    if (list) list.push(r);
    else byEmail.set(key, [r]);
  }

  let rebookedAfterCancel = 0;
  let lostAfterCancel = 0;

  for (const list of byEmail.values()) {
    const cancels = list.filter((r) => r.status === "cancelled");
    if (cancels.length === 0) continue;

    const lastCancelAt = cancels.reduce(
      (max, r) => (r.created_at > max ? r.created_at : max),
      cancels[0].created_at
    );
    const volvio = list.some(
      (r) => r.status !== "cancelled" && r.created_at > lastCancelAt
    );

    if (volvio) rebookedAfterCancel++;
    else lostAfterCancel++;
  }

  const attended = reservations.filter((r) => r.status === "attended");

  return {
    total:     reservations.length,
    cancelled: reservations.filter((r) => r.status === "cancelled").length,
    attended:  reservations.filter((r) => r.status === "attended").length,
    noShow:    reservations.filter((r) => r.status === "no_show").length,
    confirmed: reservations.filter((r) => r.status === "confirmed").length,
    rebookedAfterCancel,
    lostAfterCancel,
    enrolled:    attended.filter((r) => r.enrollment === "enrolled").length,
    notReturned: attended.filter((r) => r.enrollment === "not_returned").length,
    undecided:   attended.filter((r) => !r.enrollment).length,
  };
}

// Orden validado con el script de validación de paletas: azul → verde → amarillo → rojo
const DONUT_COLORS = {
  confirmed: "#2a78d6",
  attended:  "#1baf7a",
  noShow:    "#eda100",
  cancelled: "#e34948",
} as const;

// Mismos colores del gráfico de arriba, en su orden validado (azul → verde → amarillo,
// ΔE CVD ≥ 9): sin definir = azul (igual que "sin resolver"), inscripción = verde.
const ENROLLMENT_COLORS = {
  undecided:   "#2a78d6",
  enrolled:    "#1baf7a",
  notReturned: "#eda100",
} as const;

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "aquila" | "stone" | "emerald" | "amber" | "coral";
  hint?: string;
};

const TONES: Record<StatCardProps["tone"], string> = {
  aquila:  "bg-aquila-50 border-aquila-100 text-aquila-700",
  stone:   "bg-stone-50 border-stone-100 text-stone-500",
  emerald: "bg-emerald-50/60 border-emerald-100 text-emerald-700",
  amber:   "bg-amber-50/60 border-amber-100 text-amber-700",
  coral:   "bg-coral-50 border-coral-100 text-coral-600",
};

function StatCard({ icon, label, value, tone, hint }: StatCardProps) {
  return (
    <div className={`flex flex-col gap-1 rounded-2xl border px-3 py-3 ${TONES[tone]}`}>
      <div className="flex items-center gap-1.5 opacity-80">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider leading-tight">
          {label}
        </span>
      </div>
      <span className="text-2xl font-bold leading-none">{value}</span>
      {hint && <span className="text-[10px] font-medium opacity-80 leading-tight">{hint}</span>}
    </div>
  );
}

type Props = { password: string };

export default function StatsPanel({ password }: Props) {
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reservations?filter=all", {
        headers: { "x-admin-password": password },
      });

      if (!res.ok) { setError("Error al cargar las estadísticas."); return; }

      const data: { reservations: Reservation[] } = await res.json();
      setStats(computeStats(data.reservations));
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => { load(); }, [load]);

  const donutSlices: DonutSlice[] = stats
    ? [
        { label: "Confirmadas (sin resolver)", value: stats.confirmed, color: DONUT_COLORS.confirmed },
        { label: "Asistieron",                 value: stats.attended,  color: DONUT_COLORS.attended  },
        { label: "No asistieron",              value: stats.noShow,    color: DONUT_COLORS.noShow    },
        { label: "Canceladas",                 value: stats.cancelled, color: DONUT_COLORS.cancelled },
      ]
    : [];

  const enrollmentSlices: DonutSlice[] = stats
    ? [
        { label: "Sin definir",             value: stats.undecided,   color: ENROLLMENT_COLORS.undecided   },
        { label: "Se inscribieron",         value: stats.enrolled,    color: ENROLLMENT_COLORS.enrolled    },
        { label: "Probaron y no volvieron", value: stats.notReturned, color: ENROLLMENT_COLORS.notReturned },
      ]
    : [];
  const attendedTotal = stats ? stats.enrolled + stats.notReturned + stats.undecided : 0;
  const enrolledPct   = attendedTotal > 0 && stats ? Math.round((stats.enrolled / attendedTotal) * 100) : 0;

  return (
    <div className="bg-white rounded-3xl border border-aquila-100 shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-aquila-800 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-aquila-500" />
          Resumen
        </h2>
        <button
          onClick={load}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-aquila-100 text-aquila-400 hover:text-aquila-700 hover:border-aquila-300 transition-all"
          title="Recargar"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 text-aquila-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-2xl bg-red-50 border border-red-200 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : stats ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <StatCard
              icon={<CalendarCheck className="w-3.5 h-3.5" />}
              label="Total"
              value={stats.total}
              tone="aquila"
            />
            <StatCard
              icon={<XCircle className="w-3.5 h-3.5" />}
              label="Canceladas"
              value={stats.cancelled}
              tone="stone"
            />
            <StatCard
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              label="Asistieron"
              value={stats.attended}
              tone="emerald"
            />
            <StatCard
              icon={<UserX className="w-3.5 h-3.5" />}
              label="No asistieron"
              value={stats.noShow}
              tone="amber"
            />
            <StatCard
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              label="Volvieron tras cancelar"
              value={stats.rebookedAfterCancel}
              tone="aquila"
            />
            <StatCard
              icon={<UserMinus className="w-3.5 h-3.5" />}
              label="No volvieron tras cancelar"
              value={stats.lostAfterCancel}
              tone="coral"
            />
          </div>

          <div className="border-t border-aquila-100/70 pt-5 mt-1">
            <p className="text-xs font-bold text-aquila-700 mb-3 text-center sm:text-left">
              Cómo terminaron las reservas
            </p>
            <StatusDonut unitLabel="reservas" slices={donutSlices} />
          </div>

          <p className="text-[10px] text-stone-400 leading-relaxed px-1">
            Las dos últimas cuentan personas (por email), no reservas: de quienes
            cancelaron alguna vez, cuántas volvieron a sacar turno después y
            cuántas no.
          </p>

          <div className="border-t border-aquila-100/70 pt-5 mt-1">
            <p className="text-xs font-bold text-aquila-700 mb-3 text-center sm:text-left">
              Después de la clase de prueba
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              <StatCard
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                label="Asistieron"
                value={attendedTotal}
                tone="aquila"
              />
              <StatCard
                icon={<GraduationCap className="w-3.5 h-3.5" />}
                label="Se inscribieron"
                value={stats.enrolled}
                tone="emerald"
                hint={attendedTotal > 0 ? `${enrolledPct}% de quienes asistieron` : undefined}
              />
              <StatCard
                icon={<UserMinus className="w-3.5 h-3.5" />}
                label="Probaron y no volvieron"
                value={stats.notReturned}
                tone="amber"
              />
              <StatCard
                icon={<HelpCircle className="w-3.5 h-3.5" />}
                label="Sin definir"
                value={stats.undecided}
                tone="stone"
              />
            </div>

            {attendedTotal > 0 ? (
              <StatusDonut unitLabel="asistentes" slices={enrollmentSlices} />
            ) : (
              <p className="text-xs text-stone-400 text-center py-4">
                Todavía no hay personas marcadas como asistidas.
              </p>
            )}

            <p className="text-[10px] text-stone-400 leading-relaxed px-1 mt-3">
              Se marca desde la reserva de cada persona que asistió (filtro
              &quot;Asistidas&quot;): si se inscribió y sigue en las clases, o si probó y
              no volvió.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
