"use client";

import { useState } from "react";
import { format } from "date-fns";
import CalendarPicker from "./CalendarPicker";
import TimeSlotPicker from "./TimeSlotPicker";
import ContactForm, { ContactData } from "./ContactForm";
import SuccessScreen from "./SuccessScreen";
import StepIndicator from "./StepIndicator";
import { ChevronRight, Loader2 } from "lucide-react";
import clsx from "clsx";

const STEPS = ["Fecha", "Horario", "Tus datos"];

type Step = 1 | 2 | 3 | 4;

const EMPTY_CONTACT: ContactData = { name: "", email: "", whatsapp: "" };

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string): boolean {
  return phone.replace(/\D/g, "").length >= 8;
}

export default function BookingWizard() {
  const [step, setStep]             = useState<Step>(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [contact, setContact]           = useState<ContactData>(EMPTY_CONTACT);
  const [errors, setErrors]             = useState<Partial<ContactData>>({});
  const [submitting, setSubmitting]     = useState(false);
  const [serverError, setServerError]   = useState<string | null>(null);

  const validateContact = (): boolean => {
    const next: Partial<ContactData> = {};
    if (!contact.name.trim())                next.name     = "Tu nombre es requerido";
    if (!contact.email.trim())               next.email    = "El email es requerido";
    else if (!validateEmail(contact.email))  next.email    = "El email no es válido";
    if (!contact.whatsapp.trim())            next.whatsapp = "Tu WhatsApp es requerido";
    else if (!validatePhone(contact.whatsapp)) next.whatsapp = "Ingresá un número válido";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateContact() || !selectedDate || !selectedSlot) return;

    setSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...contact,
          date: format(selectedDate, "yyyy-MM-dd"),
          time_slot: selectedSlot,
        }),
      });

      const data: { error?: string } = await res.json();

      if (!res.ok) {
        setServerError(data.error ?? "Error al reservar. Intentá de nuevo.");
        return;
      }

      setStep(4);
    } catch {
      setServerError("Error de conexión. Verificá tu internet e intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedDate(null);
    setSelectedSlot(null);
    setContact(EMPTY_CONTACT);
    setErrors({});
    setServerError(null);
  };

  if (step === 4 && selectedDate && selectedSlot) {
    return (
      <SuccessScreen
        name={contact.name}
        date={selectedDate}
        timeSlot={selectedSlot}
        onReset={handleReset}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <StepIndicator currentStep={step} steps={STEPS} />

      {/* key={step} fuerza re-mount y re-anima en cada cambio de paso */}
      <div key={step} className="animate-slide-up">
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <SectionTitle title="¿Qué día venís?" sub="Elegí la fecha para tu clase gratuita" />
            <CalendarPicker selected={selectedDate} onSelect={setSelectedDate} />
            <PrimaryButton label="Continuar" disabled={!selectedDate} onClick={() => setStep(2)} />
          </div>
        )}

        {step === 2 && selectedDate && (
          <div className="flex flex-col gap-5">
            <SectionTitle title="¿A qué hora?" sub="Seleccioná el turno que más te convenga" />
            <TimeSlotPicker date={selectedDate} selected={selectedSlot} onSelect={setSelectedSlot} />
            <div className="flex flex-col gap-2">
              <PrimaryButton label="Continuar" disabled={!selectedSlot} onClick={() => setStep(3)} />
              <BackButton onClick={() => { setStep(1); setSelectedSlot(null); }} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-5">
            <SectionTitle title="Tus datos" sub="Para confirmarte la reserva" />
            <ContactForm
              data={contact}
              onChange={(d) => { setContact(d); setErrors({}); setServerError(null); }}
              errors={errors}
            />

            {serverError && (
              <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 text-center animate-slide-down">
                {serverError}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={clsx(
                  "w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold text-white transition-all duration-200 active:scale-95",
                  submitting
                    ? "bg-aquila-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-aquila-700 to-aquila-600 hover:from-aquila-800 hover:to-aquila-700 shadow-btn"
                )}
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Confirmando…</>
                ) : (
                  <>Confirmar reserva <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
              <BackButton onClick={() => setStep(2)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="text-center">
      <h2 className="text-lg font-bold text-aquila-800">{title}</h2>
      <p className="text-sm text-stone-400 mt-0.5">{sub}</p>
    </div>
  );
}

function PrimaryButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "w-full flex items-center justify-center gap-1 py-4 rounded-2xl text-sm font-bold transition-all duration-200 active:scale-95",
        disabled
          ? "bg-aquila-100 text-aquila-300 cursor-not-allowed"
          : "bg-gradient-to-r from-aquila-700 to-aquila-600 text-white shadow-btn hover:shadow-lg hover:from-aquila-800 hover:to-aquila-700"
      )}
    >
      {label}
      {!disabled && <ChevronRight className="w-4 h-4" />}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-3 text-sm text-aquila-400 hover:text-aquila-600 transition-colors duration-200"
    >
      ← Volver
    </button>
  );
}
