"use client";

import { useState, useEffect } from "react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isBefore, startOfDay, addMonths, subMonths, getDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Ban } from "lucide-react";
import clsx from "clsx";

type Props = {
  selected: Date | null;
  onSelect: (date: Date) => void;
};

const DAYS_LABEL = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];

export default function CalendarPicker({ selected, onSelect }: Props) {
  const [viewMonth, setViewMonth]         = useState(new Date());
  const [blockedDates, setBlockedDates]   = useState<Set<string>>(new Set());
  const [blockedReasons, setBlockedReasons] = useState<Record<string, string>>({});
  const [tooltip, setTooltip]             = useState<string | null>(null);

  const today = startOfDay(new Date());

  useEffect(() => {
    fetch("/api/blocked-dates")
      .then((r) => r.json())
      .then((data: { blocked?: Array<{ date: string; reason: string | null }> }) => {
        const dates   = new Set<string>();
        const reasons: Record<string, string> = {};
        for (const b of data.blocked ?? []) {
          dates.add(b.date);
          if (b.reason) reasons[b.date] = b.reason;
        }
        setBlockedDates(dates);
        setBlockedReasons(reasons);
      })
      .catch(() => {});
  }, []);

  const days           = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) });
  const firstDayIndex  = getDay(startOfMonth(viewMonth));

  const isPast      = (d: Date) => isBefore(d, today);
  const isSunday    = (d: Date) => getDay(d) === 0;
  const isBlocked   = (d: Date) => blockedDates.has(format(d, "yyyy-MM-dd"));
  const isDisabled  = (d: Date) => isPast(d) || isSunday(d) || isBlocked(d);

  const canGoPrev = viewMonth.getFullYear() > today.getFullYear() || viewMonth.getMonth() > today.getMonth();
  const canGoNext = viewMonth.getFullYear() < addMonths(today, 2).getFullYear() || viewMonth.getMonth() < addMonths(today, 2).getMonth();

  const handleDayClick = (day: Date) => {
    if (isPast(day) || isSunday(day)) return;
    if (isBlocked(day)) {
      const key    = format(day, "yyyy-MM-dd");
      const reason = blockedReasons[key] ?? "Clase suspendida";
      setTooltip(reason);
      setTimeout(() => setTooltip(null), 3000);
      return;
    }
    setTooltip(null);
    onSelect(day);
  };

  return (
    <div className="w-full">
      {/* Navegación de mes */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => canGoPrev && setViewMonth(subMonths(viewMonth, 1))}
          disabled={!canGoPrev}
          aria-label="Mes anterior"
          className={clsx(
            "w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200",
            canGoPrev ? "hover:bg-aquila-100 active:scale-90 text-aquila-700" : "text-stone-300 cursor-not-allowed"
          )}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h3 className="text-sm font-bold text-aquila-800 capitalize tracking-wide">
          {format(viewMonth, "MMMM yyyy", { locale: es })}
        </h3>

        <button
          onClick={() => canGoNext && setViewMonth(addMonths(viewMonth, 1))}
          disabled={!canGoNext}
          aria-label="Mes siguiente"
          className={clsx(
            "w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200",
            canGoNext ? "hover:bg-aquila-100 active:scale-90 text-aquila-700" : "text-stone-300 cursor-not-allowed"
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Cabecera días */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_LABEL.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold text-aquila-400 py-1 uppercase tracking-widest">
            {d}
          </div>
        ))}
      </div>

      {/* Grilla */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDayIndex }).map((_, i) => <div key={`e-${i}`} />)}

        {days.map((day) => {
          const disabled   = isDisabled(day);
          const blocked    = isBlocked(day);
          const isSelected = selected ? isSameDay(day, selected) : false;
          const isToday    = isSameDay(day, today);

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              className={clsx(
                "relative w-full aspect-square min-h-[44px] flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-200 select-none",
                blocked
                  ? "bg-coral-50 text-coral-300 cursor-not-allowed"
                  : disabled
                  ? "text-stone-300 cursor-not-allowed"
                  : "cursor-pointer active:scale-90",
                !disabled && !isSelected && !blocked && "text-aquila-800 hover:bg-aquila-100 hover:text-aquila-700",
                isSelected && "bg-aquila-700 text-white shadow-btn scale-105",
                isToday && !isSelected && !disabled && !blocked && "ring-2 ring-aquila-300 ring-offset-1"
              )}
            >
              {format(day, "d")}
              {blocked && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                  <Ban className="w-2 h-2 text-coral-400" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tooltip de día bloqueado */}
      {tooltip && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-coral-50 border border-coral-200 px-3 py-2.5 animate-slide-down">
          <Ban className="w-4 h-4 text-coral-500 shrink-0" />
          <p className="text-xs text-coral-700 font-medium">{tooltip}</p>
        </div>
      )}

      <p className="text-xs text-stone-400 mt-4 text-center">
        Domingos sin clases · Sábados solo 08:00
      </p>
    </div>
  );
}
