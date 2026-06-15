"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO, isToday, isTomorrow, isPast } from "date-fns";
import { es } from "date-fns/locale";
import {
  MessageCircle, XCircle, CheckCircle2, Loader2,
  CalendarDays, User, Mail, Phone, RefreshCw,
  ChevronRight, AlertTriangle,
} from "lucide-react";
import clsx from "clsx";
import type { Reservation } from "@/lib/supabase";
import { WEEKDAY_SLOTS, SATURDAY_SLOTS } from "@/lib/constants";

const SLOT_LABELS: Record<string, string> = Object.fromEntries(
  [...WEEKDAY_SLOTS, ...SATURDAY_SLOTS].map((s) => [s.id, s.label])
);

type Filter = "upcoming" | "all" | "cancelled" | "attended";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "upcoming",  label: "Próximas" },
  { id: "all",       label: "Todas"    },
  { id: "cancelled", label: "Canceladas" },
  { id: "attended",  label: "Asistidas" },
];

function toWhatsAppUrl(number: string, name: string, date: string, slot: string): string {
  const digits = number.replace(/\D/g, "");
  const phone = digits.startsWith("54") ? digits : `549${digits}`;
  const dateLabel = format(parseISO(date), "d 'de' MMMM yyyy", { locale: es });
  const slotLabel = SLOT_LABELS[slot] ?? slot;
  const msg = encodeURIComponent(
    `Hola ${name}! Te escribimos desde Aquila Evolución sobre tu reserva del ${dateLabel} a las ${slotLabel}.`
  );
  return `https://wa.me/${phone}?text=${msg}`;
}

function getDateLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date))    return "Hoy";
  if (isTomorrow(date)) return "Mañana";
  return format(date, "EEEE d 'de' MMMM", { locale: es });
}

function StatusBadge({ status }: { status: Reservation["status"] }) {
  if (status === "confirmed")
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-aquila-100 text-aquila-700">
        Confirmada
      </span>
    );
  if (status === "cancelled")
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-500">
        Cancelada
      </span>
    );
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
      Asistió ✓
    </span>
  );
}

type Props = { password: string };

export default function ReservationsDashboard({ password }: Props) {
  const [filter, setFilter]         = useState<Filter>("upcoming");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [error, setError]           = useState("");

  const fetchReservations = useCallback(
    async (f: Filter) => {
      setLoading(true);
      setError("");
      try {
        const param =
          f === "upcoming" ? "filter=upcoming" :
          f === "all"      ? "filter=all"      :
          `status=${f}`;

        const res = await fetch(`/api/reservations?${param}`, {
          headers: { "x-admin-password": password },
        });

        if (!res.ok) {
          setError("Error al cargar las reservas.");
          return;
        }

        const data: { reservations: Reservation[] } = await res.json();
        setReservations(data.reservations);
      } finally {
        setLoading(false);
      }
    },
    [password]
  );

  useEffect(() => {
    fetchReservations(filter);
  }, [filter, fetchReservations]);

  const changeStatus = async (
    id: string,
    status: "confirmed" | "cancelled" | "attended"
  ) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) return;

      // Actualizar en local sin refetch
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Agrupar por fecha para mostrar encabezados
  const grouped = reservations.reduce<Record<string, Reservation[]>>((acc, r) => {
    if (!acc[r.date]) acc[r.date] = [];
    acc[r.date].push(r);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="flex flex-col gap-4">

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={clsx(
              "shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap",
              filter === f.id
                ? "bg-aquila-700 text-white shadow-btn"
                : "bg-white text-aquila-600 border border-aquila-100 hover:border-aquila-300"
            )}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={() => fetchReservations(filter)}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-white border border-aquila-100 text-aquila-400 hover:text-aquila-700 hover:border-aquila-300 transition-all"
          title="Recargar"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-aquila-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-2xl bg-red-50 border border-red-200 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : reservations.length === 0 ? (
        <div className="text-center py-12">
          <CalendarDays className="w-10 h-10 text-aquila-200 mx-auto mb-3" />
          <p className="text-sm text-stone-400 font-medium">
            {filter === "upcoming"  ? "No hay reservas próximas." :
             filter === "cancelled" ? "No hay reservas canceladas." :
             filter === "attended"  ? "Nadie marcado como asistido aún." :
             "No hay reservas registradas."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {sortedDates.map((date) => (
            <div key={date}>
              {/* Encabezado de fecha */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={clsx(
                    "text-xs font-bold uppercase tracking-wider capitalize",
                    isPast(parseISO(date)) && !isToday(parseISO(date))
                      ? "text-stone-400"
                      : isToday(parseISO(date))
                      ? "text-coral-600"
                      : "text-aquila-700"
                  )}
                >
                  {getDateLabel(date)}
                </span>
                <div className="flex-1 h-px bg-aquila-100" />
                <span className="text-[10px] text-stone-400">
                  {grouped[date].length} reserva{grouped[date].length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Cards de reservas */}
              <div className="flex flex-col gap-2">
                {grouped[date].map((r) => (
                  <ReservationCard
                    key={r.id}
                    reservation={r}
                    isLoading={!!actionLoading[r.id]}
                    onChangeStatus={changeStatus}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Card individual ───────────────────────────────────────────

type CardProps = {
  reservation: Reservation;
  isLoading: boolean;
  onChangeStatus: (id: string, status: "confirmed" | "cancelled" | "attended") => void;
};

function ReservationCard({ reservation: r, isLoading, onChangeStatus }: CardProps) {
  const [expanded, setExpanded] = useState(false);
  const slotLabel = SLOT_LABELS[r.time_slot] ?? r.time_slot;
  const isPastDate = isPast(parseISO(r.date)) && !isToday(parseISO(r.date));

  return (
    <div
      className={clsx(
        "rounded-2xl border transition-all duration-200",
        r.status === "cancelled"
          ? "bg-stone-50 border-stone-100 opacity-75"
          : r.status === "attended"
          ? "bg-emerald-50/50 border-emerald-100"
          : isPastDate
          ? "bg-aquila-50/50 border-aquila-100/60"
          : "bg-white border-aquila-100"
      )}
    >
      {/* Fila principal */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Avatar inicial */}
        <div
          className={clsx(
            "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
            r.status === "attended"
              ? "bg-emerald-100 text-emerald-700"
              : r.status === "cancelled"
              ? "bg-stone-100 text-stone-400"
              : "bg-aquila-100 text-aquila-700"
          )}
        >
          {r.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-aquila-900 truncate">{r.name}</p>
            <StatusBadge status={r.status} />
          </div>
          <p className="text-xs text-stone-400 mt-0.5">{slotLabel}</p>
        </div>

        <ChevronRight
          className={clsx(
            "w-4 h-4 text-stone-300 shrink-0 transition-transform duration-200",
            expanded && "rotate-90"
          )}
        />
      </button>

      {/* Panel expandido */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-aquila-100/60 pt-3 flex flex-col gap-3">
          {/* Datos de contacto */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <Mail className="w-3.5 h-3.5 text-aquila-400 shrink-0" />
              <span className="break-all">{r.email}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <Phone className="w-3.5 h-3.5 text-aquila-400 shrink-0" />
              <span>{r.whatsapp}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <CalendarDays className="w-3.5 h-3.5 text-aquila-400 shrink-0" />
              <span className="capitalize">
                {format(parseISO(r.date), "EEEE d 'de' MMMM yyyy", { locale: es })}
                {" · "}{slotLabel}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span>Reservó el {format(parseISO(r.created_at), "d/MM/yy 'a las' HH:mm")}</span>
            </div>
          </div>

          {/* Acciones */}
          {isLoading ? (
            <div className="flex justify-center py-2">
              <Loader2 className="w-5 h-5 text-aquila-400 animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* WhatsApp — siempre disponible */}
              <a
                href={toWhatsAppUrl(r.whatsapp, r.name, r.date, r.time_slot)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white text-xs font-bold transition-all active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                Escribir por WhatsApp
              </a>

              {/* Acciones según estado */}
              {r.status === "confirmed" && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onChangeStatus(r.id, "attended")}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all active:scale-95"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ya asistió
                  </button>
                  <button
                    onClick={() => onChangeStatus(r.id, "cancelled")}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-coral-500 hover:bg-coral-600 text-white text-xs font-bold transition-all active:scale-95"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancelar
                  </button>
                </div>
              )}

              {r.status === "cancelled" && (
                <button
                  onClick={() => onChangeStatus(r.id, "confirmed")}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-aquila-300 text-aquila-700 text-xs font-bold hover:bg-aquila-50 transition-all active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Restaurar reserva
                </button>
              )}

              {r.status === "attended" && (
                <p className="text-center text-xs text-stone-400 py-1">
                  Esta persona ya asistió — no puede reservar nuevamente.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
