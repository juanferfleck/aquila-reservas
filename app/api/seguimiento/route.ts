import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getSupabase } from "@/lib/supabase";

// Lista mínima para los recordatorios de seguimiento de la clase de prueba.
// Devuelve SOLO quienes asistieron y todavía no figuran como inscriptos, con los
// datos justos para escribirles (sin email). Es de solo lectura: usa la clave
// pública de Supabase, no la de administrador.
// Se autentica con su propia clave (SEGUIMIENTO_SECRET), solo por el encabezado
// Authorization: Bearer <clave>. No se acepta por la URL para que no quede en logs.

export const dynamic = "force-dynamic";

const DIAS_POR_DEFECTO = 35;
const DIAS_MAXIMOS = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.SEGUIMIENTO_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const esperado = Buffer.from(`Bearer ${secret}`);
  const recibido = Buffer.from(header);
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}

// Fecha YYYY-MM-DD en Argentina (UTC-3, sin horario de verano)
function fechaArgentina(offsetDias = 0): string {
  const ms = Date.now() - 3 * 60 * 60 * 1000 + offsetDias * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const param = Number(new URL(request.url).searchParams.get("dias"));
  const dias =
    Number.isInteger(param) && param > 0 ? Math.min(param, DIAS_MAXIMOS) : DIAS_POR_DEFECTO;
  const hoy = fechaArgentina();
  const desde = fechaArgentina(-dias);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reservations")
    .select("name, whatsapp, date, time_slot, enrollment")
    .eq("status", "attended")
    .or("enrollment.is.null,enrollment.eq.not_returned")
    .gte("date", desde)
    .lte("date", hoy)
    .order("date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "No se pudo leer las reservas" }, { status: 500 });
  }

  return NextResponse.json(
    { hoy, desde, reservas: data ?? [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}
