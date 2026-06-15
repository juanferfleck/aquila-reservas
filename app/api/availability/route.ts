import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { MAX_PER_SLOT } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "Fecha requerida" }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    // Verificar si la fecha está bloqueada
    const { data: blocked } = await supabase
      .from("blocked_dates")
      .select("reason")
      .eq("date", date)
      .maybeSingle();

    if (blocked) {
      return NextResponse.json({
        blocked: true,
        reason: blocked.reason ?? "Clase suspendida",
        availability: {},
      });
    }

    // Contar reservas por turno
    const { data, error } = await supabase
      .from("reservations")
      .select("time_slot")
      .eq("date", date)
      .eq("status", "confirmed");

    if (error) throw error;

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      counts[row.time_slot] = (counts[row.time_slot] ?? 0) + 1;
    }

    const availability: Record<string, number> = {};
    for (const [slot, count] of Object.entries(counts)) {
      availability[slot] = Math.max(0, MAX_PER_SLOT - count);
    }

    return NextResponse.json({ blocked: false, availability });
  } catch (err) {
    console.error("Error fetching availability:", err);
    return NextResponse.json({ error: "Error al obtener disponibilidad" }, { status: 500 });
  }
}
