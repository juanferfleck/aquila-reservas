import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

function isAdminAuthorized(request: NextRequest): boolean {
  const password = request.headers.get("x-admin-password");
  return !!process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD;
}

// DELETE — desbloquea un día (solo admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { date } = await params;

  try {
    const { error } = await getSupabaseAdmin()
      .from("blocked_dates")
      .delete()
      .eq("date", date);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error unblocking date:", err);
    return NextResponse.json({ error: "Error al desbloquear la fecha" }, { status: 500 });
  }
}
