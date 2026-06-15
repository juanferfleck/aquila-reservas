import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

type RouteContext = { params: Promise<{ id: string }> };

function isAdminAuthorized(request: NextRequest): boolean {
  const password = request.headers.get("x-admin-password");
  return !!process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  const body: { status?: string } = await request.json();
  const { status } = body;

  const VALID_STATUSES = ["confirmed", "cancelled", "attended", "no_show"];
  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "Estado inválido. Debe ser: confirmed, cancelled o attended." },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("reservations")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ reservation: data });
  } catch (err) {
    console.error("Error updating reservation:", err);
    return NextResponse.json({ error: "Error al actualizar la reserva" }, { status: 500 });
  }
}
