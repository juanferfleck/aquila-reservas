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
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formatPhone(to),
          type: "template",
          template: {
            name: templateName,
            language: { code: "es" },
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

// Template: aquila_confirmacion
// Parámetros: {{1}} nombre, {{2}} fecha, {{3}} horario
export function sendConfirmation(r: ReservationInfo): Promise<boolean> {
  return sendTemplate(r.whatsapp, "aquila_confirmacion", [
    r.name,
    dateLabel(r.date),
    slotLabel(r.time_slot),
  ]);
}

// Template: aquila_recordatorio_24h
// Parámetros: {{1}} nombre, {{2}} fecha, {{3}} horario
export function sendReminder24h(r: ReservationInfo): Promise<boolean> {
  return sendTemplate(r.whatsapp, "aquila_recordatorio_24h", [
    r.name,
    dateLabel(r.date),
    slotLabel(r.time_slot),
  ]);
}

// Template: aquila_recordatorio_2h
// Parámetros: {{1}} nombre, {{2}} horario
export function sendReminder2h(r: ReservationInfo): Promise<boolean> {
  return sendTemplate(r.whatsapp, "aquila_recordatorio_2h", [
    r.name,
    slotLabel(r.time_slot),
  ]);
}
