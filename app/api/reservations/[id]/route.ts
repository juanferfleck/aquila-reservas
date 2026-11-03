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
  const body: { status?: string; enrollment?: string | null } = await request.json();
  const { status, enrollment } = body;

  const VALID_STATUSES    = ["confirmed", "cancelled", "attended", "no_show"];
  const VALID_ENROLLMENTS = ["enrolled", "not_returned"];

  if (status === undefined && enrollment === undefined) {
    return NextResponse.json({ error: "Falta el estado o la inscripción." }, { status: 400 });
  }
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "Estado inválido. Debe ser: confirmed, cancelled, attended o no_show." },
      { status: 400 }
    );
  }
  if (enrollment !== undefined && enrollment !== null && !VALID_ENROLLMENTS.includes(enrollment)) {
    return NextResponse.json(
      { error: "Inscripción inválida. Debe ser: enrolled, not_returned o null." },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: current, error: currentError } = await supabase
      .from("reservations")
      .select("status, no_show_count, enrollment")
      .eq("id", id)
      .maybeSingle();

    if (currentError) throw currentError;
    if (!current) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
    }

    // La inscripción (se anotó en Aquila / no volvió) solo tiene sentido para quien asistió
    if (enrollment !== undefined && (status ?? current.status) !== "attended") {
      return NextResponse.json(
        { error: "Solo se puede marcar la inscripción de quien asistió a la clase de prueba." },
        { status: 409 }
      );
    }

    const update: { status?: string; no_show_count?: number; enrollment?: string | null } = {};

    if (status !== undefined) {
      update.status = status;

      // no_show_count lleva la cuenta de inasistencias de la persona (una sola fila por persona):
      // sube al marcar "no asistió" y baja si el admin corrige ese error.
      const count = current.no_show_count ?? 0;
      if (status === "no_show" && current.status !== "no_show") {
        update.no_show_count = count + 1;
      } else if (status !== "no_show" && current.status === "no_show") {
        update.no_show_count = Math.max(0, count - 1);
      }

      // Si deja de figurar como asistida, la marca de inscripción ya no corresponde
      if (status !== "attended" && current.enrollment) {
        update.enrollment = null;
      }
    }

    if (enrollment !== undefined) {
      update.enrollment = enrollment;
    }

    const { data, error } = await supabase
      .from("reservations")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ reservation: data });
  } catch (err) {
    console.error("Error updating reservation:", err);
    return NextResponse.json({ error: "Error al actualizar la reserva" }, { status: 500 });
  }
}
