import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getSupabaseAdmin } from "@/lib/supabase";

function isAdminAuthorized(request: NextRequest): boolean {
  const password = request.headers.get("x-admin-password");
  return !!process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD;
}

// GET — devuelve todos los días bloqueados futuros (público)
export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await getSupabase()
      .from("blocked_dates")
      .select("id, date, reason")
      .gte("date", today)
      .order("date", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ blocked: data ?? [] });
  } catch (err) {
    console.error("Error fetching blocked dates:", err);
    return NextResponse.json({ error: "Error al obtener días bloqueados" }, { status: 500 });
  }
}

// POST — bloquea un día (solo admin)
export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { date, reason } = await request.json();

    if (!date) {
      return NextResponse.json({ error: "La fecha es requerida" }, { status: 400 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from("blocked_dates")
      .insert({ date, reason: reason?.trim() || null })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Esta fecha ya está bloqueada" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ blocked: data }, { status: 201 });
  } catch (err) {
    console.error("Error blocking date:", err);
    return NextResponse.json({ error: "Error al bloquear la fecha" }, { status: 500 });
  }
}
