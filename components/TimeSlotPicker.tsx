"use client";

import { useEffect, useState } from "react";
import { format, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { WEEKDAY_SLOTS, SATURDAY_SLOTS, MAX_PER_SLOT } from "@/lib/constants";
import clsx from "clsx";
import { Clock, Users, Ban } from "lucide-react";

type Props = {
  date: Date;
  selected: string | null;
  onSelect: (slot: string) => void;
};

type AvailabilityResponse = {
  blocked: boolean;
  reason?: string;
  availability: Record<string, number>;
};

function getSlotsForDate(date: Date) {
  return getDay(date) === 6 ? SATURDAY_SLOTS : WEEKDAY_SLOTS;
}

export default function TimeSlotPicker({ date, selected, onSelect }: Props) {
  const [avail, setAvail]   = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const slots = getSlotsForDate(date);

  useEffect(() => {
    const fetchAvailability = async () => {
      setLoading(true);
      try {
        const dateStr = format(date, "yyyy-MM-dd");
        const res = await fetch(`/api/availability?date=${dateStr}`);
        const data: AvailabilityResponse = await res.json();
        setAvail(data);
      } catch {
        setAvail({ blocked: false, availability: {} });
      } finally {
        setLoading(false);
      }
    };
    fetchAvailability();
  }, [date]);

  const getSpots = (slotId: string): number =>
    slotId in (avail?.availability ?? {}) ? avail!.availability[slotId] : MAX_PER_SLOT;

  return (
    <div className="w-full">
      <p className="text-sm text-stone-500 mb-4 text-center capitalize font-medium">
        {format(date, "EEEE d 'de' MMMM", { locale: es })}
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 border-2 border-aquila-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : avail?.blocked ? (
        <div className="flex flex-col items-center gap-3 py-6 rounded-2xl bg-coral-50 border border-coral-200 px-4">
          <Ban className="w-8 h-8 text-coral-400" />
          <div className="text-center">
            <p className="text-sm font-bold text-coral-700">Sin clases este día</p>
            <p className="text-xs text-coral-500 mt-1">{avail.reason ?? "Clase suspendida"}</p>
          </div>
          <p className="text-xs text-stone-400">Por favor elegí otra fecha.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {slots.map((slot, i) => {
            const spots      = getSpots(slot.id);
            const isFull     = spots <= 0;
            const isSelected = selected === slot.id;

            return (
              <button
                key={slot.id}
                onClick={() => !isFull && onSelect(slot.id)}
                disabled={isFull}
                style={{ animationDelay: `${i * 60}ms` }}
                className={clsx(
                  "animate-scale-in min-h-[90px] flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 select-none",
                  isFull
                    ? "border-stone-100 bg-stone-50 cursor-not-allowed opacity-50"
                    : isSelected
                    ? "border-coral-500 bg-coral-500 shadow-btn-coral scale-[1.03]"
                    : "border-aquila-100 bg-white hover:border-aquila-300 hover:bg-aquila-50 hover:scale-[1.02] cursor-pointer active:scale-95"
                )}
              >
                <Clock className={clsx("w-4 h-4", isSelected ? "text-white" : "text-aquila-400")} />
                <span className={clsx("text-base font-bold", isSelected ? "text-white" : "text-aquila-800")}>
                  {slot.label}
                </span>
                <div className="flex items-center gap-1">
                  <Users className={clsx("w-3 h-3", isSelected ? "text-coral-200" : "text-stone-400")} />
                  <span
                    className={clsx(
                      "text-xs font-semibold",
                      isFull ? "text-red-400" :
                      spots === 1 ? "text-amber-500" :
                      isSelected ? "text-coral-100" : "text-stone-400"
                    )}
                  >
                    {isFull ? "Completo" : spots === 1 ? "¡Último lugar!" : `${spots} lugares`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
