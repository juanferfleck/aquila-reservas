"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3, Loader2, AlertTriangle, RefreshCw,
  CalendarCheck, XCircle, CheckCircle2, RotateCcw, UserMinus, UserX,
} from "lucide-react";
import type { Reservation } from "@/lib/supabase";

type Stats = {
  total: number;
  cancelled: number;
  attended: number;
  noShow: number;
  rebookedAfterCancel: number;
  lostAfterCancel: number;
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

  return {
    total:     reservations.length,
    cancelled: reservations.filter((r) => r.status === "cancelled").length,
    attended:  reservations.filter((r) => r.status === "attended").length,
    noShow:    reservations.filter((r) => r.status === "no_show").length,
    rebookedAfterCancel,
    lostAfterCancel,
  };
}

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "aquila" | "stone" | "emerald" | "amber" | "coral";
};

const TONES: Record<StatCardProps["tone"], string> = {
  aquila:  "bg-aquila-50 border-aquila-100 text-aquila-700",
  stone:   "bg-stone-50 border-stone-100 text-stone-500",
  emerald: "bg-emerald-50/60 border-emerald-100 text-emerald-700",
  amber:   "bg-amber-50/60 border-amber-100 text-amber-700",
  coral:   "bg-coral-50 border-coral-100 text-coral-600",
};

function StatCard({ icon, label, value, tone }: StatCardProps) {
  return (
    <div className={`flex flex-col gap-1 rounded-2xl border px-3 py-3 ${TONES[tone]}`}>
      <div className="flex items-center gap-1.5 opacity-80">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider leading-tight">
          {label}
        </span>
      </div>
      <span className="text-2xl font-bold leading-none">{value}</span>
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
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
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
          </div>

          <div className="grid grid-cols-2 gap-2">
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

          <p className="text-[10px] text-stone-400 leading-relaxed px-1">
            Las dos últimas cuentan personas (por email), no reservas: de quienes
            cancelaron alguna vez, cuántas volvieron a sacar turno después y
            cuántas no.
          </p>
        </div>
      ) : null}
    </div>
  );
}
