"use client";

import { useState } from "react";
import { format, parseISO, getDay } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarClock, ArrowRight, Loader2, CheckCircle2,
  AlertTriangle, X, ChevronLeft,
} from "lucide-react";
import clsx from "clsx";
import CalendarPicker from "@/components/CalendarPicker";
import TimeSlotPicker from "@/components/TimeSlotPicker";
import { WEEKDAY_SLOTS, SATURDAY_SLOTS } from "@/lib/constants";

const SLOT_LABELS: Record<string, string> = Object.fromEntries(
  [...WEEKDAY_SLOTS, ...SATURDAY_SLOTS].map((s) => [s.id, s.label])
);

type ExistingReservation = {
  id: string;
  name: string;
  date: string;
  time_slot: string;
};

type Step = "closed" | "email" | "finding" | "picking" | "confirming" | "success";

export default function ChangeReservationFlow() {
  const [step, setStep]             = useState<Step>("closed");
  const [email, setEmail]           = useState("");
  const [existing, setExisting]     = useState<ExistingReservation | null>(null);
  const [newDate, setNewDate]       = useState<Date | null>(null);
  const [newSlot, setNewSlot]       = useState<string | null>(null);
  const [error, setError]           = useState("");
  const [successInfo, setSuccessInfo] = useState<{ date: string; slot: string } | null>(null);

  const reset = () => {
    setStep("closed");
    setEmail("");
    setExisting(null);
    setNewDate(null);
    setNewSlot(null);
    setError("");
    setSuccessInfo(null);
  };

  // ── Buscar reserva por email ──
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStep("finding");

    try {
      const res = await fetch(
        `/api/my-reservation?email=${encodeURIComponent(email.trim())}`
      );
      const data: { reservation: ExistingReservation | null; error?: string } =
        await res.json();

      if (!res.ok || !data.reservation) {
        setError(
          "No encontramos una reserva activa con ese email. Verificá que sea el mismo con el que te anotaste."
        );
        setStep("email");
        return;
      }

      setExisting(data.reservation);
      setStep("picking");
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
      setStep("email");
    }
  };

  // ── Confirmar cambio ──
  const handleConfirm = async () => {
    if (!newDate || !newSlot || !existing) return;
    setError("");
    setStep("confirming");

    const new_date      = format(newDate, "yyyy-MM-dd");
    const new_time_slot = newSlot;

    try {
      const res = await fetch("/api/my-reservation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), new_date, new_time_slot }),
      });

      const data: { reservation?: ExistingReservation; error?: string } = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al cambiar el turno.");
        setStep("picking");
        return;
      }

      setSuccessInfo({ date: new_date, slot: new_time_slot });
      setStep("success");
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
      setStep("picking");
    }
  };

  const handleDateChange = (date: Date) => {
    setNewDate(date);
    setNewSlot(null);
    setError("");
  };

  const isSaturday = newDate ? getDay(newDate) === 6 : false;

  // ── Cerrado ──
  if (step === "closed") {
    return (
      <button
        onClick={() => setStep("email")}
        className="group flex items-center gap-2 text-xs text-stone-400 hover:text-aquila-600 transition-colors py-1"
      >
        <CalendarClock className="w-3.5 h-3.5 shrink-0" />
        ¿Tenés una reserva y querés cambiar la fecha?
        <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
      </button>
    );
  }

  // ── Éxito ──
  if (step === "success" && successInfo) {
    const dateLabel = format(parseISO(successInfo.date), "EEEE d 'de' MMMM", { locale: es });
    const slotLabel = SLOT_LABELS[successInfo.slot] ?? successInfo.slot;
    return (
      <div className="rounded-2xl bg-aquila-50 border border-aquila-200 p-5 flex flex-col items-center gap-3 text-center animate-scale-in">
        <div className="w-12 h-12 rounded-2xl bg-aquila-100 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-aquila-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-aquila-800">¡Turno cambiado!</p>
          <p className="text-xs text-stone-500 mt-1 capitalize">
            Tu nueva reserva es el <strong>{dateLabel}</strong> a las <strong>{slotLabel}</strong>.
          </p>
        </div>
        <button
          onClick={reset}
          className="text-xs text-aquila-500 hover:text-aquila-700 transition-colors underline underline-offset-2"
        >
          Cerrar
        </button>
      </div>
    );
  }

  // ── Panel expandido ──
  return (
    <div className="rounded-2xl border border-aquila-100 bg-aquila-50/50 overflow-hidden animate-scale-in">

      {/* Header del panel */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-aquila-100">
        <div className="flex items-center gap-2">
          {step === "picking" || step === "confirming" ? (
            <button
              onClick={() => { setStep("email"); setNewDate(null); setNewSlot(null); setError(""); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-aquila-100 text-aquila-400 hover:text-aquila-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : null}
          <CalendarClock className="w-4 h-4 text-aquila-500" />
          <span className="text-xs font-bold text-aquila-700">Cambiar mi turno</span>
        </div>
        <button
          onClick={reset}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-aquila-100 text-stone-400 hover:text-stone-600 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4">

        {/* ── Step: email ── */}
        {(step === "email" || step === "finding") && (
          <form onSubmit={handleLookup} className="flex flex-col gap-3">
            <p className="text-xs text-stone-500 leading-relaxed">
              Ingresá el email con el que te reservaste y te mostramos tu turno actual para que elijas uno nuevo.
            </p>

            <div
              className={clsx(
                "flex items-center gap-2 rounded-xl border-2 px-3 bg-white transition-colors",
                error ? "border-red-300" : "border-aquila-100 focus-within:border-aquila-400"
              )}
            >
              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                autoComplete="email"
                autoFocus
                className="flex-1 min-h-[44px] bg-transparent text-sm text-aquila-900 placeholder:text-stone-400 outline-none"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!email.trim() || step === "finding"}
              className={clsx(
                "flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95",
                !email.trim() || step === "finding"
                  ? "bg-aquila-300 cursor-not-allowed"
                  : "bg-aquila-700 hover:bg-aquila-800 shadow-btn"
              )}
            >
              {step === "finding" ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Buscando…</>
              ) : (
                <>Buscar mi reserva <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        )}

        {/* ── Step: picking ── */}
        {(step === "picking" || step === "confirming") && existing && (
          <div className="flex flex-col gap-4">

            {/* Turno actual */}
            <div className="rounded-xl bg-white border border-aquila-100 px-4 py-3">
              <p className="text-[10px] font-bold text-aquila-400 uppercase tracking-wider mb-1">Tu turno actual</p>
              <p className="text-sm font-bold text-aquila-800 capitalize">
                {format(parseISO(existing.date), "EEEE d 'de' MMMM", { locale: es })}
              </p>
              <p className="text-xs text-stone-400">
                {SLOT_LABELS[existing.time_slot] ?? existing.time_slot}
              </p>
            </div>

            {/* Nueva fecha */}
            <div>
              <p className="text-[10px] font-bold text-aquila-500 uppercase tracking-wider mb-3">
                Elegí la nueva fecha
              </p>
              <CalendarPicker selected={newDate} onSelect={handleDateChange} />
            </div>

            {/* Nuevo horario */}
            {newDate && (
              <div className="animate-slide-down">
                <p className="text-[10px] font-bold text-aquila-500 uppercase tracking-wider mb-3">
                  Elegí el nuevo horario
                  {isSaturday && <span className="text-stone-400 normal-case font-normal"> · Solo 8 AM los sábados</span>}
                </p>
                <TimeSlotPicker
                  date={newDate}
                  selected={newSlot}
                  onSelect={(s) => { setNewSlot(s); setError(""); }}
                />
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 leading-relaxed">{error}</p>
              </div>
            )}

            {/* Botón confirmar */}
            {newDate && newSlot && (
              <div className="animate-slide-up">
                {/* Resumen del cambio */}
                <div className="rounded-xl bg-white border border-aquila-100 px-4 py-3 mb-3">
                  <p className="text-[10px] font-bold text-aquila-400 uppercase tracking-wider mb-1">Nuevo turno</p>
                  <p className="text-sm font-bold text-aquila-800 capitalize">
                    {format(newDate, "EEEE d 'de' MMMM", { locale: es })}
                  </p>
                  <p className="text-xs text-stone-400">{SLOT_LABELS[newSlot]}</p>
                </div>

                <button
                  onClick={handleConfirm}
                  disabled={step === "confirming"}
                  className={clsx(
                    "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95",
                    step === "confirming"
                      ? "bg-aquila-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-aquila-700 to-aquila-600 hover:from-aquila-800 hover:to-aquila-700 shadow-btn"
                  )}
                >
                  {step === "confirming" ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Cambiando turno…</>
                  ) : (
                    <>Confirmar cambio <CheckCircle2 className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
