import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ALL_SLOTS } from "@/lib/constants";

const SLOT_LABELS: Record<string, string> = Object.fromEntries(
  ALL_SLOTS.map((s) => [s.id, s.label])
);

// Formatea número argentino a E.164 (con +, prefijo 549)
// Argentina móvil: +549 + 10 dígitos (ej: +5493764114013)
function formatPhone(number: string): string {
  const digits = number.replace(/\D/g, "");
  if (digits.startsWith("549")) return `+${digits}`;
  if (digits.startsWith("54"))  return `+549${digits.slice(2)}`;
  return `+549${digits}`;
}

function dateLabel(date: string): string {
  return format(parseISO(date), "EEEE d 'de' MMMM", { locale: es });
}

function slotLabel(timeSlot: string): string {
  return SLOT_LABELS[timeSlot] ?? timeSlot;
}

// Número de WhatsApp Business de Aquila Evolución registrado en YCloud (E.164)
const YCLOUD_FROM = process.env.YCLOUD_WHATSAPP_FROM || "+5493764114013";

// ── Texto de cada plantilla ───────────────────────────────────
// Copia del cuerpo aprobado en Meta/YCloud. Se usa SOLO para avisarle al inbox
// (whatsapp-saas) qué recibió el cliente, así el agente de IA tiene el contexto
// cuando la persona responde. Si cambiás una plantilla en Meta, actualizá
// también su texto acá.
const TEMPLATE_BODIES: Record<string, string> = {
  aquila_confirmacion:
    "¡Hola {{1}}! 🦅 Tu clase de prueba en *Aquila Evolución* está confirmada para el {{2}} a las {{3}} ✅\n\n" +
    "Acordate de traer:\n💧 Una botellita de agua (la podés cargar acá)\n🏃 Una toalla personal\n\n" +
    "📍 Cómo llegar: https://maps.app.goo.gl/9ADdfsjJHKZBRGch8\n\n" +
    "⚠️ ¿No podés venir? Cancelá o cambiá el día en reserva.aquilaevo.com, o avisanos por acá. " +
    "Si no avisás, no podrás reprogramar la clase gratis y la próxima se abona.\n\n" +
    "¡Te esperamos con todo listo!",
  aquila_recordatorio_24h:
    "¡Hola {{1}}! 🦅 Mañana {{2}} a las {{3}} es tu clase de prueba en *Aquila Evolución* 💪\n\n" +
    "Recordá traer:\n💧 Tu botellita de agua (la podés cargar acá)\n🏃 Una toalla personal\n\n" +
    "📍 Cómo llegar: https://maps.app.goo.gl/9ADdfsjJHKZBRGch8\n\n" +
    "⚠️ ¿No podés venir? Cancelá o cambiá el día en reserva.aquilaevo.com, o avisanos por acá. " +
    "Si no avisás, no podrás reprogramar la clase gratis y la próxima se abona.\n\n" +
    "¡Nos vemos mañana!",
  aquila_recordatorio_1h:
    "¡Hola {{1}}! 🦅 En un rato ({{2}}) arranca tu clase de prueba en *Aquila Evolución* ⚡\n\n" +
    "Revisá que tenés:\n💧 Tu botellita de agua\n🏃 Tu toalla personal\n\n" +
    "📍 Cómo llegar: https://maps.app.goo.gl/9ADdfsjJHKZBRGch8\n\n" +
    "⚠️ ¿No podés venir? Avisanos por acá cuanto antes así no perdés la clase gratis 🙏\n\n" +
    "¡Ya falta poquito, te esperamos! 💪",
};

function fillTemplate(templateName: string, params: string[]): string | null {
  const body = TEMPLATE_BODIES[templateName];
  if (!body) return null;
  return body.replace(/\{\{(\d+)\}\}/g, (_, n) => params[Number(n) - 1] ?? "");
}

// ── Aviso al inbox (whatsapp-saas) ────────────────────────────
// Este sistema manda las plantillas directo a YCloud, así que whatsapp-saas no
// se entera. Sin este aviso el agente de IA no ve el mensaje y, si el cliente
// contesta "gracias", responde sin contexto.
// Nunca debe romper la reserva ni el cron: cualquier falla se loguea y se sigue.
// Si falla, whatsapp-saas igual registra el mensaje (con variables sin completar)
// cuando YCloud le notifica la entrega por webhook.
async function notifyInbox(args: {
  to: string;
  /** `id` que YCloud devuelve al enviar. El wamid de WhatsApp NO viene en esa respuesta. */
  ycloudId: string;
  wamid?: string;
  templateName: string;
  text: string;
  name: string;
}): Promise<void> {
  const url = process.env.INBOX_INGEST_URL;
  const secret = process.env.INBOX_INGEST_SECRET;
  if (!url || !secret) return; // no configurado → comportamiento anterior

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        from: YCLOUD_FROM,
        to: formatPhone(args.to),
        ycloud_id: args.ycloudId || undefined,
        wamid: args.wamid || undefined,
        template_name: args.templateName,
        text: args.text,
        contact_name: args.name,
        source: "reservas",
        sent_at: new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      console.error(`Inbox ingest "${args.templateName}" respondió ${res.status}`);
    }
  } catch (err) {
    console.error("Inbox ingest error:", err);
  }
}

async function sendTemplate(
  to: string,
  templateName: string,
  params: string[]
): Promise<boolean> {
  const apiKey = process.env.YCLOUD_API_KEY;

  if (!apiKey) {
    console.warn("WhatsApp: YCLOUD_API_KEY no configurada, omitiendo envío.");
    return false;
  }

  try {
    const res = await fetch(
      "https://api.ycloud.com/v2/whatsapp/messages",
      {
        method: "POST",
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          from: YCLOUD_FROM,
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

    const resBody = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error(`WhatsApp template "${templateName}" error:`, JSON.stringify(resBody));
      return false;
    }

    console.log(`WhatsApp template "${templateName}" enviado a ${formatPhone(to)}:`, JSON.stringify(resBody));

    // Avisar al inbox para que el agente conozca el mensaje. YCloud responde con
    // su `id` pero todavía sin `wamid` (lo asigna después y lo informa por
    // webhook), así que se identifica el mensaje por `id`; whatsapp-saas completa
    // el wamid cuando le llega el primer estado.
    const text = fillTemplate(templateName, params);
    const ycloudId = typeof resBody.id === "string" ? resBody.id : "";
    const wamid = typeof resBody.wamid === "string" ? resBody.wamid : "";
    if (text && (ycloudId || wamid)) {
      await notifyInbox({
        to,
        ycloudId,
        wamid,
        templateName,
        text,
        name: params[0] ?? "",
      });
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
// "¡Hola {{1}}! 🦅 Tu clase de prueba en *Aquila Evolución* está confirmada
// para el {{2}} a las {{3}} ✅
//
// Acordate de traer:
// 💧 Una botellita de agua (la podés cargar acá)
// 🏃 Una toalla personal
//
// 📍 Cómo llegar: https://maps.app.goo.gl/9ADdfsjJHKZBRGch8
//
// ⚠️ ¿No podés venir? Cancelá o cambiá el día en reserva.aquilaevo.com, o
// avisanos por acá. Si no avisás, no podrás reprogramar la clase gratis y
// la próxima se abona.
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
// "¡Hola {{1}}! 🦅 Mañana {{2}} a las {{3}} es tu clase de prueba
// en *Aquila Evolución* 💪
//
// Recordá traer:
// 💧 Tu botellita de agua (la podés cargar acá)
// 🏃 Una toalla personal
//
// 📍 Cómo llegar: https://maps.app.goo.gl/9ADdfsjJHKZBRGch8
//
// ⚠️ ¿No podés venir? Cancelá o cambiá el día en reserva.aquilaevo.com, o
// avisanos por acá. Si no avisás, no podrás reprogramar la clase gratis y
// la próxima se abona.
//
// ¡Nos vemos mañana!"
export function sendReminder24h(r: ReservationInfo): Promise<boolean> {
  return sendTemplate(r.whatsapp, "aquila_recordatorio_24h", [
    r.name,
    dateLabel(r.date),
    slotLabel(r.time_slot),
  ]);
}

// Template: aquila_recordatorio_1h  (2 parámetros)
// "¡Hola {{1}}! 🦅 En un rato ({{2}}) arranca tu clase de prueba
// en *Aquila Evolución* ⚡
//
// Revisá que tenés:
// 💧 Tu botellita de agua
// 🏃 Tu toalla personal
//
// 📍 Cómo llegar: https://maps.app.goo.gl/9ADdfsjJHKZBRGch8
//
// ⚠️ ¿No podés venir? Avisanos por acá cuanto antes así no perdés la
// clase gratis 🙏
//
// ¡Ya falta poquito, te esperamos! 💪"
export function sendReminder1h(r: ReservationInfo): Promise<boolean> {
  return sendTemplate(r.whatsapp, "aquila_recordatorio_1h", [
    r.name,
    slotLabel(r.time_slot),
  ]);
}
