import Image from "next/image";
import BookingWizard from "@/components/BookingWizard";
import ChangeReservationFlow from "@/components/ChangeReservationFlow";
import { WHATSAPP_NUMBER, CONTACT_EMAIL } from "@/lib/constants";
import { ShieldCheck, Users, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: ShieldCheck, text: "Gratis, de verdad. Sin letra chica.", color: "bg-aquila-100 text-aquila-700" },
  { icon: Sparkles,    text: "Clases semipersonalizadas",            color: "bg-coral-100 text-coral-600"  },
  { icon: Users,       text: "Entrenamiento grupal con buena onda", color: "bg-aquila-100 text-aquila-700" },
];

export default function Home() {
  return (
    <main className="min-h-dvh flex flex-col bg-white overflow-x-hidden">

      {/* ── Hero ── */}
      <section className="hero-bg relative overflow-hidden flex-1 lg:flex lg:items-center">

        {/* Blob 1 — azul */}
        <div className="absolute -top-20 -left-20 w-72 h-72 lg:w-[28rem] lg:h-[28rem] rounded-full bg-aquila-200/40 blur-3xl animate-blob pointer-events-none" />
        {/* Blob 2 — coral */}
        <div className="absolute top-10 right-0 w-56 h-56 lg:w-96 lg:h-96 rounded-full bg-coral-200/30 blur-3xl animate-blob-slow pointer-events-none" style={{ animationDelay: "3s" }} />
        {/* Blob 3 — azul oscuro */}
        <div className="absolute bottom-0 left-1/3 w-40 h-40 lg:w-72 lg:h-72 rounded-full bg-aquila-300/20 blur-2xl animate-blob pointer-events-none" style={{ animationDelay: "5s" }} />

        {/* Mobile: una columna. Desktop: hero a la izquierda, reserva a la derecha */}
        <div className="relative z-10 mx-auto w-full max-w-md px-6 pt-12 md:max-w-2xl lg:max-w-6xl lg:px-10 lg:pt-16 lg:pb-20 lg:grid lg:grid-cols-2 lg:gap-14 lg:items-center">

          {/* ── Columna izquierda: presentación ── */}
          <div className="flex flex-col items-center text-center gap-6 pb-10 lg:items-start lg:text-left lg:pb-0">

            {/* Logo flotante */}
            <div className="animate-slide-down animate-float">
              <Image
                src="/logo.png"
                alt="Aquila Evolución"
                width={190}
                height={98}
                priority
                className="object-contain drop-shadow-md w-[190px] lg:w-[230px] h-auto"
              />
            </div>

            {/* Titular */}
            <div className="animate-slide-up flex flex-col gap-2" style={{ animationDelay: "100ms" }}>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold leading-tight text-aquila-900">
                Tu clase de prueba{" "}
                <span className="text-gradient">gratuita</span>
                <br />de calistenia
              </h1>
              <p className="text-sm lg:text-base text-aquila-600 leading-relaxed max-w-[280px] mx-auto lg:mx-0 lg:max-w-md">
                Vení a conocer el método, el espacio y la comunidad.
                Te esperamos.
              </p>
            </div>

            {/* Feature pills */}
            <div className="flex flex-col gap-2.5 w-full sm:flex-row sm:flex-wrap sm:justify-center lg:flex-col lg:justify-start lg:max-w-md">
              {FEATURES.map(({ icon: Icon, text, color }, i) => (
                <div
                  key={text}
                  style={{ animationDelay: `${180 + i * 80}ms` }}
                  className="animate-slide-up flex items-center gap-3 bg-white/75 backdrop-blur-sm border border-white/80 rounded-2xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow duration-300 sm:flex-1 sm:min-w-[200px] lg:flex-none"
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-aquila-800 text-left">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Columna derecha: card de reserva ──
              Hasta lg ocupa todo el ancho con la transición curva blanca;
              desde lg queda flotando sobre el fondo del hero. */}
          <div className="relative left-1/2 w-screen -translate-x-1/2 rounded-t-[2.5rem] bg-white px-4 pt-10 pb-14 lg:left-auto lg:w-auto lg:translate-x-0 lg:rounded-none lg:bg-transparent lg:px-0 lg:py-0">
            <div className="mx-auto w-full max-w-md">

              {/* Línea decorativa coral arriba de la card */}
              <div className="h-1 w-16 mx-auto coral-accent-line rounded-full mb-5 animate-fade-in delay-400" />

              <div
                className="bg-white rounded-3xl shadow-card-lg border border-aquila-100/60 p-6 sm:p-7 animate-scale-in"
                style={{ animationDelay: "300ms" }}
              >
                <BookingWizard />
              </div>

              {/* Cambiar turno */}
              <div className="mt-5 animate-fade-in delay-500">
                <ChangeReservationFlow />
              </div>

              {/* Footer */}
              <div className="mt-4 flex flex-col items-center gap-1 animate-fade-in delay-500">
                <p className="text-xs text-stone-400 text-center">
                  ¿Dudas? Contactanos por{" "}
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-coral-600 font-semibold underline underline-offset-2"
                  >
                    WhatsApp
                  </a>
                  {" "}o{" "}
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="text-aquila-600 font-semibold underline underline-offset-2"
                  >
                    email
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
