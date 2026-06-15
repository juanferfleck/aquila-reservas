"use client";

import { format, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, Calendar, Clock, MessageCircle } from "lucide-react";
import { WEEKDAY_SLOTS, SATURDAY_SLOTS, WHATSAPP_NUMBER } from "@/lib/constants";

type Props = {
  name: string;
  date: Date;
  timeSlot: string;
  onReset: () => void;
};

function getSlotLabel(date: Date, slotId: string): string {
  const slots = getDay(date) === 6 ? SATURDAY_SLOTS : WEEKDAY_SLOTS;
  return slots.find((s) => s.id === slotId)?.label ?? slotId;
}

export default function SuccessScreen({ name, date, timeSlot, onReset }: Props) {
  const slotLabel  = getSlotLabel(date, timeSlot);
  const firstName  = name.split(" ")[0];
  const dateStr    = format(date, "EEEE d 'de' MMMM", { locale: es });

  const waMessage = encodeURIComponent(
    `Hola! Soy ${name} y reservé mi clase de prueba en Aquila Evolución para el ${dateStr} a las ${slotLabel}. ¡Ya estoy listo/a!`
  );

  return (
    <div className="flex flex-col items-center text-center gap-6 py-2">

      {/* Ícono con ring animado */}
      <div className="relative animate-scale-in">
        <div className="absolute inset-0 rounded-full bg-coral-400/20 animate-pulse-ring" />
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-aquila-100 to-coral-100 flex items-center justify-center animate-float">
          <CheckCircle2 className="w-10 h-10 text-aquila-700" strokeWidth={1.5} />
        </div>
      </div>

      <div className="animate-slide-up flex flex-col gap-1">
        <h2 className="text-xl font-bold text-aquila-900">
          ¡Reserva confirmada, {firstName}!
        </h2>
        <p className="text-sm text-stone-500 leading-relaxed max-w-[260px] mx-auto">
          Te esperamos para tu clase de prueba gratuita de calistenia.
        </p>
      </div>

      {/* Resumen */}
      <div
        className="w-full rounded-2xl p-4 flex flex-col gap-3 text-left animate-slide-up border border-aquila-100"
        style={{
          background: "linear-gradient(135deg, #f2f4f7 0%, #fff3f0 100%)",
          animationDelay: "100ms",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-aquila-100 flex items-center justify-center shadow-sm shrink-0">
            <Calendar className="w-4 h-4 text-aquila-600" />
          </div>
          <div>
            <p className="text-[10px] text-aquila-400 font-bold uppercase tracking-wider">Fecha</p>
            <p className="text-sm font-semibold text-aquila-800 capitalize">{dateStr}</p>
          </div>
        </div>

        <div className="h-px bg-aquila-100" />

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-aquila-100 flex items-center justify-center shadow-sm shrink-0">
            <Clock className="w-4 h-4 text-coral-500" />
          </div>
          <div>
            <p className="text-[10px] text-aquila-400 font-bold uppercase tracking-wider">Horario</p>
            <p className="text-sm font-semibold text-aquila-800">{slotLabel}</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-stone-400 px-2 animate-fade-in delay-200">
        Traé ropa cómoda. Si necesitás cancelar o reprogramar,
        escribinos por WhatsApp.
      </p>

      {/* CTA WhatsApp */}
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`}
        target="_blank"
        rel="noopener noreferrer"
        className="animate-slide-up w-full flex items-center justify-center gap-2 py-4 px-5 rounded-2xl bg-[#25D366] text-white text-sm font-bold shadow-md active:scale-95 transition-all duration-150 hover:brightness-105"
        style={{ animationDelay: "300ms" }}
      >
        <MessageCircle className="w-4 h-4" />
        Avisar por WhatsApp
      </a>

      <button
        onClick={onReset}
        className="text-xs text-aquila-400 hover:text-coral-500 underline underline-offset-4 transition-colors duration-200"
      >
        Hacer otra reserva
      </button>
    </div>
  );
}
