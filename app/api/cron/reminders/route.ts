import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendReminder24h, sendReminder2h } from "@/lib/whatsapp";

// Argentina es UTC-3 (sin horario de verano)
function classToUTC(date: string, timeSlot: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes]   = timeSlot.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours + 3, minutes));
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader  = request.headers.get("authorization");
  const querySecret = new URL(request.url).searchParams.get("secret");
  return authHeader === `Bearer ${secret}` || querySecret === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const nowMs    = Date.now();

  // Hora actual en Argentina (UTC-3)
  const ARG_OFFSET_MS  = 3 * 60 * 60 * 1000;
  const nowArgMs       = nowMs - ARG_OFFSET_MS;
  const nowArg         = new Date(nowArgMs);
  const argTotalMin    = nowArg.getUTCHours() * 60 + nowArg.getUTCMinutes();

  // Fecha de mañana en Argentina
  const tomorrowArg  = new Date(nowArgMs + 24 * 60 * 60 * 1000);
  const tomorrowDate = tomorrowArg.toISOString().split("T")[0];

  // Fecha de hoy en Argentina
  const today = nowArg.toISOString().split("T")[0];

  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("id, name, whatsapp, date, time_slot, reminder_24h_sent, reminder_2h_sent")
    .eq("status", "confirmed")
    .gte("date", today)
    .or("reminder_24h_sent.eq.false,reminder_2h_sent.eq.false");

  if (error) {
    console.error("Cron reminders: error al consultar BD:", error);
    return NextResponse.json({ error: "Error de base de datos" }, { status: 500 });
  }

  let sent24h = 0;
  let sent2h  = 0;
  let errors  = 0;

  for (const r of reservations ?? []) {
    const classMs   = classToUTC(r.date, r.time_slot).getTime();
    const diffHours = (classMs - nowMs) / (1000 * 60 * 60);

    // Recordatorio día anterior: enviar a las 20:00 ARG (±25 min) si la clase es mañana
    if (!r.reminder_24h_sent && r.date === tomorrowDate && Math.abs(argTotalMin - 20 * 60) <= 25) {
      const ok = await sendReminder24h(r);
      if (ok) {
        await supabase.from("reservations").update({ reminder_24h_sent: true }).eq("id", r.id);
        sent24h++;
      } else {
        errors++;
      }
    }

    // Recordatorio 1h: enviar cuando falte entre 0.75 y 1.25 horas
    if (!r.reminder_2h_sent && diffHours >= 0.75 && diffHours < 1.25) {
      const ok = await sendReminder2h(r);
      if (ok) {
        await supabase.from("reservations").update({ reminder_2h_sent: true }).eq("id", r.id);
        sent2h++;
      } else {
        errors++;
      }
    }
  }

  console.log(`Cron reminders: 24h=${sent24h}, 2h=${sent2h}, errores=${errors}`);

  return NextResponse.json({
    ok: true,
    checked:  reservations?.length ?? 0,
    sent_24h: sent24h,
    sent_2h:  sent2h,
    errors,
    timestamp: new Date().toISOString(),
  });
}
