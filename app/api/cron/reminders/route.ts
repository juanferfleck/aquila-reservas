import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendReminder24h, sendReminder2h } from "@/lib/whatsapp";

// Argentina es UTC-3 (sin horario de verano)
// Convierte fecha "2024-06-17" + horario "07:00" a Date UTC
function classToUTC(date: string, timeSlot: string): Date {
  const [year, month, day]   = date.split("-").map(Number);
  const [hours, minutes]     = timeSlot.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours + 3, minutes));
}

function isAuthorized(request: NextRequest): boolean {
  const secret      = process.env.CRON_SECRET;
  if (!secret) return false;

  // Acepta tanto Vercel Cron (Authorization: Bearer ...) como cron externo (?secret=...)
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
  const today    = new Date(nowMs).toISOString().split("T")[0];

  // Traer todas las reservas confirmadas desde hoy con recordatorios pendientes
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

    // Recordatorio 24h: enviar cuando falten entre 23 y 25 horas
    if (!r.reminder_24h_sent && diffHours >= 23 && diffHours < 25) {
      const ok = await sendReminder24h(r);
      if (ok) {
        await supabase
          .from("reservations")
          .update({ reminder_24h_sent: true })
          .eq("id", r.id);
        sent24h++;
      } else {
        errors++;
      }
    }

    // Recordatorio 2h: enviar cuando falte entre 1 y 3 horas
    if (!r.reminder_2h_sent && diffHours >= 1 && diffHours < 3) {
      const ok = await sendReminder2h(r);
      if (ok) {
        await supabase
          .from("reservations")
          .update({ reminder_2h_sent: true })
          .eq("id", r.id);
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
