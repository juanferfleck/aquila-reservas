import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;
let _adminClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Faltan variables de entorno de Supabase");
    _client = createClient(url, key);
  }
  return _client;
}

// Cliente con service role para operaciones de admin (bypasea RLS)
export function getSupabaseAdmin(): SupabaseClient {
  if (!_adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Faltan variables de entorno de Supabase Admin");
    _adminClient = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _adminClient;
}

export type Reservation = {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  date: string;
  time_slot: string;
  created_at: string;
  status: "confirmed" | "cancelled" | "attended" | "no_show";
};

export type BlockedDate = {
  id: string;
  date: string;
  reason: string | null;
  created_at: string;
};
