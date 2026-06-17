import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { WEEKDAY_SLOTS, SATURDAY_SLOTS } from "@/lib/constants";

const SLOT_LABELS: Record<string, string> = Object.fromEntries(
  [...WEEKDAY_SLOTS, ...SATURDAY_SLOTS].map((s) => [s.id, s.label])
);

// Formatea número argentino para la API de Meta (sin +, con 549 prefix)
function formatPhone(number: string): string {
  const digits = number.replace(/\D/g, "");
  if (digits.startsWith("54")) return digits;
  return `549${digits}`;
}

function dateLabel(date: string): string {
  return format(parseISO(date), "EEEE d 'de' MMMM", { locale: es });
}

function slotLabel(timeSlot: string): string {
  return SLOT_LABELS[timeSlot] ?? timeSlot;
}

async function sendTemplate(
  to: string,
  templateName: string,
  params: string[]
): Promise<boolean> {
  const token   = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.warn("WhatsApp: variables de entorno no configuradas, omitiendo envío.");
    return false;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formatPhone(to),
          type: "template",
          template: {
            name: templateName,
            language: { code: "es_AR" },
            components: [
              {
                type: "body",
                parameters: params.map((text) => ({ type: "text", text })),
              },
            ],
          },
        }),
      }
    );

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.error(`WhatsApp template "${templateName}" error:`, JSON.stringify(errBody));
      return false;
    }

    return true;
  } catch (err) {
    console.error("WhatsApp fetch error:", err);
    return false;
  }
}

// ── Las tres funciones de envío ───────────────────────────────

type ReservationInfo = {
  name: string;
  whatsapp: string;
  date: string;
  time_slot: string;
};

// Template: aquila_confirmacion  (3 parámetros)
// Texto en Meta:
// "¡Hola {{1}}! 🦅 Tu clase de prueba en *Aquila Evolución* está confirmada
// para el {{2}} a las {{3}} ✅
//
// Acordate de traer:
// 💧 Una botellita de agua (la podés cargar acá)
// 🏃 Una toalla personal
//
// ¡Te esperamos con todo listo!"
export function sendConfirmation(r: ReservationInfo): Promise<boolean> {
  return sendTemplate(r.whatsapp, "aquila_confirmacion", [
    r.name,
    dateLabel(r.date),
    slotLabel(r.time_slot),
  ]);
}

// Template: aquila_recordatorio_24h  (3 parámetros)
// Texto en Meta:
// "¡Hola {{1}}! 🦅 Mañana {{2}} a las {{3}} es tu clase de prueba
// en *Aquila Evolución* 💪
//
// Recordá traer:
// 💧 Tu botellita de agua (la podés cargar acá)
// 🏃 Una toalla personal
//
// ¡Nos vemos mañana!"
export function sendReminder24h(r: ReservationInfo): Promise<boolean> {
  return sendTemplate(r.whatsapp, "aquila_recordatorio_24h", [
    r.name,
    dateLabel(r.date),
    slotLabel(r.time_slot),
  ]);
}

// Template: aquila_recordatorio_2h  (2 parámetros)
// Texto en Meta:
// "¡Hola {{1}}! 🦅 En 2 horas ({{2}}) arranca tu clase de prueba
// en *Aquila Evolución* ⚡
//
// Revisá que tenés:
// 💧 Tu botellita de agua
// 🏃 Tu toalla personal
//
// ¡Ya falta poquito, te esperamos! 💪"
export function sendReminder2h(r: ReservationInfo): Promise<boolean> {
  return sendTemplate(r.whatsapp, "aquila_recordatorio_2h", [
    r.name,
    slotLabel(r.time_slot),
  ]);
}
