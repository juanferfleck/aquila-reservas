import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getSupabaseAdmin } from "@/lib/supabase";
import { MAX_PER_SLOT } from "@/lib/constants";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
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

    // Bloquear si ya asistió a una clase de prueba (por email)
    const { data: attendedByEmail } = await supabase
      .from("reservations")
      .select("id")
      .eq("email", cleanEmail)
      .eq("status", "attended")
      .maybeSingle();

    if (attendedByEmail) {
      return errorResponse(
        "Ya asististe a una clase de prueba en Aquila Evolución. ¡Escribinos por WhatsApp para más info!",
        409
      );
    }

    // Bloquear si ya asistió a una clase de prueba (por WhatsApp)
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

    // Crear reserva
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

    return NextResponse.json({ reservation: data }, { status: 201 });
  } catch (err) {
    console.error("Error creating reservation:", err);
    return errorResponse("Error al crear la reserva. Intentá de nuevo.", 500);
  }
}
