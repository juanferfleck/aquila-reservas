import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getSupabaseAdmin } from "@/lib/supabase";
import { MAX_PER_SLOT } from "@/lib/constants";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function err(msg: string, status: number) {
  return NextResponse.json({ error: msg }, { status });
}

// GET /api/my-reservation?email=...
export async function GET(request: NextRequest) {
  const email = new URL(request.url).searchParams.get("email")?.toLowerCase().trim();

  if (!email || !EMAIL_REGEX.test(email)) {
    return err("Email inválido", 400);
  }

  const supabase = getSupabase();
  const today    = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("reservations")
    .select("id, name, date, time_slot")
    .eq("email", email)
    .eq("status", "confirmed")
    .gte("date", today)
    .order("date", { ascending: true })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ reservation: data ?? null });
}

// PATCH /api/my-reservation
export async function PATCH(request: NextRequest) {
  const body: { email?: string; new_date?: string; new_time_slot?: string } =
    await request.json();

  const { email, new_date, new_time_slot } = body;

  if (!email || !new_date || !new_time_slot) {
    return err("Faltan campos requeridos", 400);
  }

  const cleanEmail = email.toLowerCase().trim();
  const supabase   = getSupabase();
  const today      = new Date().toISOString().split("T")[0];

  // Buscar la reserva activa del usuario
  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, date, time_slot")
    .eq("email", cleanEmail)
    .eq("status", "confirmed")
    .gte("date", today)
    .order("date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!reservation) {
    return err("No encontramos una reserva activa con ese email.", 404);
  }

  if (reservation.date === new_date && reservation.time_slot === new_time_slot) {
    return err("Ya tenés ese día y horario reservado.", 409);
  }

  // Verificar que la nueva fecha no esté bloqueada
  const { data: blocked } = await supabase
    .from("blocked_dates")
    .select("reason")
    .eq("date", new_date)
    .maybeSingle();

  if (blocked) {
    return err(
      `No hay clases ese día: ${blocked.reason ?? "Clase suspendida"}. Elegí otra fecha.`,
      409
    );
  }

  // Verificar cupo del nuevo turno
  const { count } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("date", new_date)
    .eq("time_slot", new_time_slot)
    .eq("status", "confirmed")
    .neq("id", reservation.id);

  if ((count ?? 0) >= MAX_PER_SLOT) {
    return err("Ese turno ya está completo. Por favor elegí otro horario.", 409);
  }

  // Actualizar con service role para bypassear RLS
  // Resetear flags de recordatorio para que se envíen en la nueva fecha
  const { data: updated, error } = await getSupabaseAdmin()
    .from("reservations")
    .update({ date: new_date, time_slot: new_time_slot, reminder_24h_sent: false, reminder_2h_sent: false })
    .eq("id", reservation.id)
    .select("id, name, date, time_slot")
    .single();

  if (error) {
    console.error("Error updating reservation:", error);
    return err("Error al cambiar el turno. Intentá de nuevo.", 500);
  }

  return NextResponse.json({ reservation: updated });
}
