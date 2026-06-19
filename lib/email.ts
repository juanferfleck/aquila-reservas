import { Resend } from "resend";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { WEEKDAY_SLOTS, SATURDAY_SLOTS } from "@/lib/constants";

const SLOT_LABELS: Record<string, string> = Object.fromEntries(
  [...WEEKDAY_SLOTS, ...SATURDAY_SLOTS].map((s) => [s.id, s.label])
);

type ReservationInfo = {
  name: string;
  email: string;
  date: string;
  time_slot: string;
};

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("Email: RESEND_API_KEY no configurada, omitiendo envío.");
    return null;
  }
  return new Resend(key);
}

export async function sendConfirmationEmail(r: ReservationInfo): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const dateLabel = format(parseISO(r.date), "EEEE d 'de' MMMM yyyy", { locale: es });
  const slotLabel = SLOT_LABELS[r.time_slot] ?? r.time_slot;

  try {
    const { error } = await resend.emails.send({
      from: "Aquila Evolución <reservas@aquilaevo.com>",
      to: r.email,
      subject: "✅ Tu clase de prueba está confirmada — Aquila Evolución",
      html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8e4dc;">

          <!-- Header -->
          <tr>
            <td style="background:#2d3a2e;padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:800;color:#d4941e;letter-spacing:-0.5px;">🦅 Aquila Evolución</p>
              <p style="margin:6px 0 0;font-size:13px;color:#a8b5a0;">Calistenia · Fuerza · Movimiento</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1a1a1a;">¡Hola, ${r.name}!</p>
              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
                Tu clase de prueba gratuita está <strong style="color:#2d7a3a;">confirmada</strong>. Te esperamos con todo listo 💪
              </p>

              <!-- Fecha y hora -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f3;border:1px solid #e8e4dc;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#9e8a6e;text-transform:uppercase;letter-spacing:1px;">Fecha y horario</p>
                    <p style="margin:0;font-size:17px;font-weight:700;color:#1a1a1a;text-transform:capitalize;">${dateLabel}</p>
                    <p style="margin:4px 0 0;font-size:15px;color:#555;">${slotLabel}</p>
                  </td>
                </tr>
              </table>

              <!-- Qué traer -->
              <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:0.5px;">Acordate de traer</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="padding:8px 0;font-size:15px;color:#333;">💧 Una botellita de agua (la podés cargar acá)</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:15px;color:#333;">🏃 Una toalla personal</td>
                </tr>
              </table>

              <!-- Ubicación -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="https://maps.app.goo.gl/9ADdfsjJHKZBRGch8"
                       style="display:inline-block;background:#2d3a2e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:10px;">
                      📍 Ver ubicación en el mapa
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:14px;color:#888;line-height:1.6;text-align:center;">
                ¿Necesitás cambiar la fecha? Entrá a <a href="https://reserva.aquilaevo.com" style="color:#d4941e;">reserva.aquilaevo.com</a> e ingresá tu email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f7f3;border-top:1px solid #e8e4dc;padding:16px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#aaa;">Aquila Evolución · aquilaevolucion@gmail.com</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Email confirmación error:", JSON.stringify(error));
      return false;
    }

    console.log(`Email confirmación enviado a ${r.email}`);
    return true;
  } catch (err) {
    console.error("Email fetch error:", err);
    return false;
  }
}
