"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO, isToday, isTomorrow, isPast } from "date-fns";
import { es } from "date-fns/locale";
import {
  MessageCircle, XCircle, CheckCircle2, Loader2,
  CalendarDays, User, Mail, Phone, RefreshCw,
  ChevronRight, AlertTriangle, UserX, ArrowDownUp,
} from "lucide-react";
import clsx from "clsx";
import type { Reservation } from "@/lib/supabase";
import { ALL_SLOTS } from "@/lib/constants";

const SLOT_LABELS: Record<string, string> = Object.fromEntries(
  ALL_SLOTS.map((s) => [s.id, s.label])
);

type Filter = "upcoming" | "all" | "cancelled" | "attended" | "no_show";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "upcoming",  label: "Próximas"     },
  { id: "all",       label: "Todas"        },
  { id: "cancelled", label: "Canceladas"   },
  { id: "attended",  label: "Asistidas"    },
  { id: "no_show",   label: "No asistieron" },
];

type SortOrder = "desc" | "asc";

// "Próximas" se lee mejor cronológicamente; el resto (reservas pasadas)
// arranca por la más reciente.
function defaultSortFor(f: Filter): SortOrder {
  return f === "upcoming" ? "asc" : "desc";
}

const SORT_LABELS: Record<SortOrder, string> = {
  desc: "Más recientes primero",
  asc:  "Más antiguas primero",
};

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
  if (status === "no_show")
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
        No asistió
      </span>
    );
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
      Asistió ✓
    </span>
  );
}

type ActionStatus = "confirmed" | "cancelled" | "attended" | "no_show";
type Enrollment   = NonNullable<Reservation["enrollment"]>;
type Props = { password: string };

// Qué pasó después de la clase de prueba (solo para quienes asistieron)
function EnrollmentBadge({ enrollment }: { enrollment: Reservation["enrollment"] }) {
  if (enrollment === "enrolled")
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
        Se inscribió
      </span>
    );
  if (enrollment === "not_returned")
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
        No volvió
      </span>
    );
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700">
      Sin definir
    </span>
  );
}

export default function ReservationsDashboard({ password }: Props) {
  const [filter, setFilter]             = useState<Filter>("upcoming");
  const [sortOrder, setSortOrder]       = useState<SortOrder>(defaultSortFor("upcoming"));
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading]           = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [error, setError]               = useState("");

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

        if (!res.ok) { setError("Error al cargar las reservas."); return; }

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

  const updateReservation = async (
    id: string,
    body: { status?: ActionStatus; enrollment?: Enrollment | null }
  ) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) return;

      // El servidor también ajusta no_show_count y enrollment según el cambio de estado
      const { reservation }: { reservation: Reservation } = await res.json();
      setReservations((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status:        reservation.status,
                no_show_count: reservation.no_show_count,
                enrollment:    reservation.enrollment,
              }
            : r
        )
      );
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const changeStatus     = (id: string, status: ActionStatus) => updateReservation(id, { status });
  const changeEnrollment = (id: string, enrollment: Enrollment | null) =>
    updateReservation(id, { enrollment });

  const grouped = reservations.reduce<Record<string, Reservation[]>>((acc, r) => {
    if (!acc[r.date]) acc[r.date] = [];
    acc[r.date].push(r);
    return acc;
  }, {});
  const dir = sortOrder === "asc" ? 1 : -1;
  const sortedDates = Object.keys(grouped).sort((a, b) => a.localeCompare(b) * dir);
  for (const date of sortedDates) {
    grouped[date].sort((a, b) => a.time_slot.localeCompare(b.time_slot) * dir);
  }

  const emptyMsg: Record<Filter, string> = {
    upcoming:  "No hay reservas próximas.",
    all:       "No hay reservas registradas.",
    cancelled: "No hay reservas canceladas.",
    attended:  "Nadie marcado como asistido aún.",
    no_show:   "Sin inasistencias registradas.",
  };

  return (
    <div className="flex flex-col gap-4">

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto lg:overflow-visible lg:flex-wrap pb-1 -mx-1 px-1 scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              setFilter(f.id);
              setSortOrder(defaultSortFor(f.id));
            }}
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

      {/* Orden */}
      {reservations.length > 0 && !loading && (
        <div className="flex justify-end -mt-2">
          <button
            onClick={() => setSortOrder((v) => (v === "desc" ? "asc" : "desc"))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-aquila-100 text-[11px] font-bold text-aquila-600 hover:border-aquila-300 hover:text-aquila-700 transition-all active:scale-95"
            title="Cambiar el orden"
          >
            <ArrowDownUp className="w-3 h-3" />
            {SORT_LABELS[sortOrder]}
          </button>
        </div>
      )}

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
          <p className="text-sm text-stone-400 font-medium">{emptyMsg[filter]}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {sortedDates.map((date) => (
            <div key={date}>
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

              <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-2">
                {grouped[date].map((r) => (
                  <ReservationCard
                    key={r.id}
                    reservation={r}
                    isLoading={!!actionLoading[r.id]}
                    onChangeStatus={changeStatus}
                    onChangeEnrollment={changeEnrollment}
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
  onChangeStatus: (id: string, status: ActionStatus) => void;
  onChangeEnrollment: (id: string, enrollment: Enrollment | null) => void;
};

function ReservationCard({ reservation: r, isLoading, onChangeStatus, onChangeEnrollment }: CardProps) {
  const [expanded, setExpanded] = useState(false);
  const slotLabel  = SLOT_LABELS[r.time_slot] ?? r.time_slot;
  const isPastDate = isPast(parseISO(r.date)) && !isToday(parseISO(r.date));
  const noShows    = r.no_show_count ?? 0;
  // Con status no_show, la inasistencia actual ya la dice el badge de estado:
  // el aviso extra aparece solo si hay otras anteriores.
  const showNoShowBadge = noShows > (r.status === "no_show" ? 1 : 0);

  return (
    <div
      className={clsx(
        "rounded-2xl border transition-all duration-200",
        r.status === "cancelled" ? "bg-stone-50 border-stone-100 opacity-75"    :
        r.status === "attended"  ? "bg-emerald-50/50 border-emerald-100"         :
        r.status === "no_show"   ? "bg-amber-50/50 border-amber-100"             :
        isPastDate               ? "bg-aquila-50/50 border-aquila-100/60"        :
                                   "bg-white border-aquila-100"
      )}
    >
      {/* Fila principal — toca para expandir */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div
          className={clsx(
            "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
            r.status === "attended"  ? "bg-emerald-100 text-emerald-700" :
            r.status === "no_show"   ? "bg-amber-100 text-amber-700"     :
            r.status === "cancelled" ? "bg-stone-100 text-stone-400"     :
                                       "bg-aquila-100 text-aquila-700"
          )}
        >
          {r.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-aquila-900 truncate">{r.name}</p>
            <StatusBadge status={r.status} />
            {r.status === "attended" && <EnrollmentBadge enrollment={r.enrollment} />}
            {showNoShowBadge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                Faltó {noShows} {noShows === 1 ? "vez" : "veces"}
              </span>
            )}
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

          {/* Datos */}
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
            {noShows > 0 && (
              <div className="flex items-center gap-2 text-xs text-amber-700 font-medium">
                <UserX className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Se anotó y no asistió {noShows} {noShows === 1 ? "vez" : "veces"}
                </span>
              </div>
            )}
          </div>

          {/* Acciones */}
          {isLoading ? (
            <div className="flex justify-center py-2">
              <Loader2 className="w-5 h-5 text-aquila-400 animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-2">

              {/* WhatsApp — siempre */}
              <a
                href={toWhatsAppUrl(r.whatsapp, r.name, r.date, r.time_slot)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white text-xs font-bold transition-all active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                Escribir por WhatsApp
              </a>

              {/* Confirmada: marcar asistencia + cancelar */}
              {r.status === "confirmed" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onChangeStatus(r.id, "attended")}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all active:scale-95"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Ya asistió
                    </button>
                    <button
                      onClick={() => onChangeStatus(r.id, "no_show")}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all active:scale-95"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      No asistió
                    </button>
                  </div>
                  <button
                    onClick={() => onChangeStatus(r.id, "cancelled")}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-stone-200 text-stone-500 text-xs font-medium hover:bg-stone-50 transition-all active:scale-95"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancelar (la persona lo pidió)
                  </button>
                </>
              )}

              {/* Cancelada: restaurar */}
              {r.status === "cancelled" && (
                <button
                  onClick={() => onChangeStatus(r.id, "confirmed")}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-aquila-300 text-aquila-700 text-xs font-bold hover:bg-aquila-50 transition-all active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Restaurar reserva
                </button>
              )}

              {/* Asistió: bloqueada definitiva + qué pasó después de la clase de prueba */}
              {r.status === "attended" && (
                <div className="flex flex-col gap-2">
                  <p className="text-center text-xs text-stone-400 py-1">
                    Ya asistió — no puede reservar nuevamente.
                  </p>
                  <p className="text-xs font-bold text-aquila-700">
                    ¿Qué pasó después de la clase de prueba?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onChangeEnrollment(r.id, "enrolled")}
                      className={clsx(
                        "min-h-[44px] flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95",
                        r.enrollment === "enrolled"
                          ? "bg-emerald-600 text-white"
                          : "border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      )}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      Se inscribió y sigue
                    </button>
                    <button
                      onClick={() => onChangeEnrollment(r.id, "not_returned")}
                      className={clsx(
                        "min-h-[44px] flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95",
                        r.enrollment === "not_returned"
                          ? "bg-amber-500 text-white"
                          : "border-2 border-amber-200 text-amber-700 hover:bg-amber-50"
                      )}
                    >
                      <UserX className="w-3.5 h-3.5 shrink-0" />
                      Probó y no volvió
                    </button>
                  </div>
                  {r.enrollment && (
                    <button
                      onClick={() => onChangeEnrollment(r.id, null)}
                      className="min-h-[44px] text-xs font-medium text-stone-400 hover:text-stone-600 underline underline-offset-2 transition-colors"
                    >
                      Quitar la marca (volver a sin definir)
                    </button>
                  )}
                </div>
              )}

              {/* No asistió: puede volver a reservar sola; el botón corrige una marca equivocada */}
              {r.status === "no_show" && (
                <div className="flex flex-col gap-2">
                  <p className="text-center text-xs text-stone-400 py-1">
                    No asistió — puede volver a reservar y se suma a su contador.
                  </p>
                  <button
                    onClick={() => onChangeStatus(r.id, "confirmed")}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-aquila-300 text-aquila-700 text-xs font-bold hover:bg-aquila-50 transition-all active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Me equivoqué: volver a confirmada
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
