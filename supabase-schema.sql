-- =====================================================
-- Correr este script en el SQL Editor de Supabase
-- =====================================================

-- Tabla de reservas
CREATE TABLE public.reservations (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  whatsapp    TEXT        NOT NULL,
  date        DATE        NOT NULL,
  time_slot   TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'confirmed'
                          CHECK (status IN ('confirmed', 'cancelled')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reservations_date_slot
  ON public.reservations (date, time_slot)
  WHERE status = 'confirmed';

CREATE INDEX idx_reservations_email
  ON public.reservations (email)
  WHERE status = 'confirmed';

CREATE INDEX idx_reservations_whatsapp
  ON public.reservations (whatsapp)
  WHERE status = 'confirmed';

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insertar reservas" ON public.reservations
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Leer disponibilidad" ON public.reservations
  FOR SELECT TO anon USING (true);

-- =====================================================
-- Tabla de días bloqueados (feriados, suspensiones)
-- =====================================================

CREATE TABLE public.blocked_dates (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  date       DATE        NOT NULL UNIQUE,
  reason     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

-- Lectura pública para mostrar días no disponibles
CREATE POLICY "Leer días bloqueados" ON public.blocked_dates
  FOR SELECT TO anon USING (true);

-- Escritura solo desde el service role (panel de admin)
-- Las operaciones de admin usan la service_role key que bypasea RLS
