import { NextRequest, NextResponse } from "next/server";
import { getDay, parseISO } from "date-fns";
import { getSupabase, getSupabaseAdmin } from "@/lib/supabase";
import { MAX_PER_SLOT, MORNING_SLOT_IDS, getSlotsForDay } from "@/lib/constants";
import { sendConfirmation } from "@/lib/whatsapp";
import { sendConfirmationEmail } from "@/lib/email";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// no_show_count y enrollment son solo para el admin: nunca se devuelven en las respuestas públicas
function withoutAdminFields<T extends { no_show_count?: number; enrollment?: string | null }>(
  reservation: T
) {
  const { no_show_count: _noShowCount, enrollment: _enrollment, ...publicFields } = reservation;
  return publicFields;
}

// Para decidir si un email repetido es la misma persona: primer nombre (sin tildes ni
// mayúsculas) o teléfono (últimos 10 dígitos, sin importar el formato)
function firstName(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().split(/\s+/)[0] ?? "";
}

function phoneKey(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

function isAdminAuthorized(request: NextRequest): boolean {
  const password = request.headers.get("x-admin-password");
  return !!process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD;
}

// ── GET: listar reservas (admin) ──────────────────────────────
export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return errorResponse("No autorizado", 401);
  }

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter"); // upcoming | all
  const status = searchParams.get("status"); // confirmed | cancelled | attended

  const supabase = getSupabaseAdmin();
  const today = new Date().toISOString().split("T")[0];

  let query = supabase
    .from("reservations")
    .select("*")
    .order("date", { ascending: true })
    .order("time_slot", { ascending: true });

  if (filter === "upcoming") {
    query = query.eq("status", "confirmed").gte("date", today);
  } else if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching reservations:", error);
    return errorResponse("Error al obtener reservas", 500);
  }

  return NextResponse.json({ reservations: data ?? [] });
}

// ── POST: crear reserva ───────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, whatsapp, date, time_slot } = body as Record<string, string>;

    if (!name?.trim() || !email?.trim() || !whatsapp?.trim() || !date || !time_slot) {
      return errorResponse("Todos los campos son requeridos.", 400);
    }
    if (!EMAIL_REGEX.test(email)) {
      return errorResponse("El email no es válido.", 400);
    }

    const supabase   = getSupabase();
    const today      = new Date().toISOString().split("T")[0];
    const cleanEmail = email.toLowerCase().trim();

    // Verificar si la fecha está bloqueada
    const { data: blocked } = await supabase
      .from("blocked_dates")
      .select("reason")
      .eq("date", date)
      .maybeSingle();

    if (blocked) {
      return errorResponse(
        `No hay clases ese día: ${blocked.reason ?? "Clase suspendida"}. Por favor elegí otra fecha.`,
        409
      );
    }

    // Verificar que el turno exista para ese día de la semana
    const validSlotIds = getSlotsForDay(getDay(parseISO(date))).map((s) => s.id);
    if (!validSlotIds.includes(time_slot)) {
      return errorResponse(
        "Ese horario no está disponible para el día elegido. Por favor elegí otro.",
        409
      );
    }

    // Verificar que el turno no haya pasado y la regla de 12hs para turnos de mañana
    const slotDateTime = new Date(`${date}T${time_slot}:00-03:00`);
    const now = new Date();

    if (slotDateTime <= now) {
      return errorResponse("Este turno ya pasó. Por favor elegí otro horario.", 409);
    }

    if (MORNING_SLOT_IDS.includes(time_slot)) {
      const hoursUntil = (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntil < 12) {
        return errorResponse(
          "Los turnos de mañana deben reservarse con al menos 12 horas de anticipación.",
          409
        );
      }
    }

    // Bloquear si ya asistió (ya usó su clase de prueba) — por email.
    // Quien no asistió (no_show) sí puede volver a reservar.
    const { data: attendedByEmail } = await supabase
      .from("reservations")
      .select("id")
      .eq("email", cleanEmail)
      .eq("status", "attended")
      .maybeSingle();

    if (attendedByEmail) {
      return errorResponse(
        "Ya asististe a tu clase de prueba en Aquila Evolución. ¡Escribinos por WhatsApp para más info!",
        409
      );
    }

    // Bloquear si ya asistió — por WhatsApp
    const { data: attendedByPhone } = await supabase
      .from("reservations")
      .select("id")
      .eq("whatsapp", whatsapp.trim())
      .eq("status", "attended")
      .maybeSingle();

    if (attendedByPhone) {
      return errorResponse(
        "Este número ya asistió a una clase de prueba. ¡Escribinos por WhatsApp para más info!",
        409
      );
    }

    // Bloquear si el email ya tiene reserva activa futura
    const { data: byEmail } = await supabase
      .from("reservations")
      .select("id")
      .eq("email", cleanEmail)
      .eq("status", "confirmed")
      .gte("date", today)
      .maybeSingle();

    if (byEmail) {
      return errorResponse(
        "Este email ya tiene una clase de prueba reservada. Para cambiarla, escribinos por WhatsApp.",
        409
      );
    }

    // Bloquear si el WhatsApp ya tiene reserva activa futura
    const { data: byPhone } = await supabase
      .from("reservations")
      .select("id")
      .eq("whatsapp", whatsapp.trim())
      .eq("status", "confirmed")
      .gte("date", today)
      .maybeSingle();

    if (byPhone) {
      return errorResponse(
        "Este número de WhatsApp ya tiene una clase de prueba reservada. Para cambiarla, escribinos.",
        409
      );
    }

    // Verificar cupo del turno (máx. 3 por clase)
    const { count, error: countError } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("date", date)
      .eq("time_slot", time_slot)
      .eq("status", "confirmed");

    if (countError) throw countError;

    if ((count ?? 0) >= MAX_PER_SLOT) {
      return errorResponse(
        "Este turno ya está completo. Por favor elegí otro horario.",
        409
      );
    }

    // Si la persona ya tiene una reserva cancelada o no asistida, reactivarla en lugar de crear
    // un duplicado (en no_show se conserva no_show_count como historial).
    // La identidad es el email; el WhatsApp nunca se usa para tomar la fila de otra persona.
    // Si el email coincide pero ni el primer nombre ni el teléfono, es otra persona
    // (email compartido o mal escrito): se crea una reserva aparte.
    const { data: previous } = await supabase
      .from("reservations")
      .select("id, name, whatsapp")
      .eq("email", cleanEmail)
      .in("status", ["cancelled", "no_show"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const newPhone = phoneKey(whatsapp);
    const reusable =
      previous &&
      (firstName(previous.name) === firstName(name) ||
        (newPhone !== "" && phoneKey(previous.whatsapp) === newPhone))
        ? previous
        : null;

    if (reusable) {
      const { data, error } = await getSupabaseAdmin()
        .from("reservations")
        .update({
          name:              name.trim(),
          whatsapp:          whatsapp.trim(),
          date,
          time_slot,
          status:            "confirmed",
          reminder_24h_sent: false,
          reminder_1h_sent:  false,
        })
        .eq("id", reusable.id)
        .select()
        .single();

      if (error) throw error;
      const [waOk, emailOk] = await Promise.all([
        sendConfirmation(data).catch(() => false),
        sendConfirmationEmail(data).catch(() => false),
      ]);
      if (waOk || emailOk) {
        await getSupabaseAdmin()
          .from("reservations")
          .update({ confirmation_sent: true })
          .eq("id", data.id);
      }
      return NextResponse.json({ reservation: withoutAdminFields(data) }, { status: 201 });
    }

    // Crear reserva nueva
    const { data, error } = await supabase
      .from("reservations")
      .insert({
        name:      name.trim(),
        email:     cleanEmail,
        whatsapp:  whatsapp.trim(),
        date,
        time_slot,
        status:    "confirmed",
      })
      .select()
      .single();

    if (error) throw error;

    const [waOk, emailOk] = await Promise.all([
      sendConfirmation(data).catch(() => false),
      sendConfirmationEmail(data).catch(() => false),
    ]);
    if (waOk || emailOk) {
      await getSupabaseAdmin()
        .from("reservations")
        .update({ confirmation_sent: true })
        .eq("id", data.id);
    }

    return NextResponse.json({ reservation: withoutAdminFields(data) }, { status: 201 });
  } catch (err) {
    console.error("Error creating reservation:", err);
    return errorResponse("Error al crear la reserva. Intentá de nuevo.", 500);
  }
}
