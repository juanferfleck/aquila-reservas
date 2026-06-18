# Blueprint — Sistema de Reservas Aquila Evolución

## Arquitectura general

```
┌─────────────────────────────────────────────────────────────────┐
│                        USUARIO FINAL                            │
│                    reserva.aquilaevo.com                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   Next.js (Vercel)  │
              │   App Router        │
              │                     │
              │  / (página pública) │
              │  /admin (dashboard) │
              └──────────┬──────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐    ┌─────▼─────┐   ┌────▼────────┐
    │ Supabase│    │   Meta    │   │ cron-job.org│
    │(Postgres│    │ WhatsApp  │   │  cada 30min │
    │   RLS)  │    │ Cloud API │   └────┬────────┘
    └─────────┘    └───────────┘        │
                                        │ GET /api/cron/reminders
                                        └────────────────────────▶
```

---

## Flujos principales

### 1. Nueva reserva

```
Usuario llena formulario
        │
        ▼
POST /api/reservations
        │
        ├─ ¿Fecha bloqueada?          → 409 error
        ├─ ¿Turno ya pasó?            → 409 error
        ├─ ¿Turno mañana < 12hs?      → 409 error
        ├─ ¿Email/tel. en attended?   → 409 bloqueado permanente
        ├─ ¿Email/tel. en no_show?    → 409 bloqueado permanente
        ├─ ¿Email/tel. con confirmed? → 409 ya tiene turno
        ├─ ¿Cupo completo (≥3)?       → 409 sin cupo
        │
        ├─ ¿Tiene reserva cancelled?
        │       └─ SÍ → UPDATE (reactivar) ──────────┐
        │       └─ NO → INSERT (nueva)                │
        │                                             │
        └─────────────────────────────────────────────▼
                                          sendConfirmation() → WhatsApp
                                          (fire & forget)
```

### 2. Cambio de turno (usuario)

```
Usuario ingresa email
        │
        ▼
GET /api/my-reservation?email=...
        │
        └─ Devuelve reserva confirmed futura (o null)
                │
                ▼
Usuario elige nueva fecha y horario
        │
        ▼
PATCH /api/my-reservation
        │
        ├─ ¿Nueva fecha bloqueada?       → 409 error
        ├─ ¿Turno ya pasó?               → 409 error
        ├─ ¿Turno mañana < 12hs?         → 409 error
        ├─ ¿Cupo completo (sin contar    → 409 sin cupo
        │    su propia reserva)?
        │
        └─ UPDATE fecha + time_slot
           reminder_24h_sent = false
           reminder_2h_sent  = false
```

### 3. Recordatorios automáticos (cron)

```
cron-job.org → cada 30 minutos
        │
        ▼
GET /api/cron/reminders?secret=...
        │
        ├─ Trae todas las reservas confirmed desde hoy
        │  con algún reminder pendiente
        │
        ├─ Por cada reserva:
        │   ├─ diffHours entre 23 y 25  → sendReminder24h() + marcar enviado
        │   └─ diffHours entre 0.5 y 1.5 → sendReminder1h()  + marcar enviado
        │
        └─ Responde con conteo: { sent_24h, sent_2h, errors }
```

### 4. Panel admin

```
Admin en /admin
        │
        ├─ Login → POST /api/admin/login
        │          verifica contra ADMIN_PASSWORD
        │          guarda en sessionStorage
        │
        ├─ Dashboard → GET /api/reservations
        │              header: x-admin-password
        │              params: filter=upcoming|all / status=cancelled|attended|no_show
        │
        ├─ Cambiar estado → PATCH /api/reservations/[id]
        │                   { status: confirmed|cancelled|attended|no_show }
        │                   usa service role (bypasea RLS)
        │
        └─ Fechas bloqueadas → GET|POST /api/blocked-dates
                               DELETE /api/blocked-dates/[date]
```

---

## Base de datos (Supabase)

### Tabla: `reservations`

| Columna             | Tipo      | Descripción                              |
|---------------------|-----------|------------------------------------------|
| id                  | uuid PK   | Auto-generado                            |
| name                | text      | Nombre completo                          |
| email               | text      | Email (normalizado a minúsculas)         |
| whatsapp            | text      | Número de WhatsApp                       |
| date                | date      | Fecha de la clase (YYYY-MM-DD)           |
| time_slot           | text      | Horario: 07:00 / 08:00 / 18:00 / 19:00  |
| status              | text      | confirmed / cancelled / attended / no_show |
| confirmation_sent   | boolean   | ¿Se envió confirmación WA?               |
| reminder_24h_sent   | boolean   | ¿Se envió recordatorio 24hs?             |
| reminder_2h_sent    | boolean   | ¿Se envió recordatorio 1hs?              |
| created_at          | timestamp | Auto-generado                            |

**RLS:**
- anon key: puede SELECT e INSERT
- service role: puede UPDATE (admin y cron)

### Tabla: `blocked_dates`

| Columna    | Tipo      | Descripción               |
|------------|-----------|---------------------------|
| id         | uuid PK   | Auto-generado             |
| date       | date      | Fecha bloqueada (única)   |
| reason     | text      | Motivo (opcional)         |
| created_at | timestamp | Auto-generado             |

---

## API Endpoints

| Método | Endpoint                        | Auth          | Descripción                        |
|--------|---------------------------------|---------------|------------------------------------|
| POST   | /api/admin/login                | —             | Verifica contraseña admin          |
| GET    | /api/reservations               | admin header  | Lista reservas con filtros         |
| POST   | /api/reservations               | —             | Crea nueva reserva                 |
| PATCH  | /api/reservations/[id]          | admin header  | Cambia estado de reserva           |
| GET    | /api/my-reservation             | —             | Busca reserva activa por email     |
| PATCH  | /api/my-reservation             | —             | Cambia fecha/horario de reserva    |
| GET    | /api/blocked-dates              | —             | Lista fechas bloqueadas            |
| POST   | /api/blocked-dates              | admin header  | Agrega fecha bloqueada             |
| DELETE | /api/blocked-dates/[date]       | admin header  | Elimina fecha bloqueada            |
| GET    | /api/cron/reminders             | CRON_SECRET   | Dispara recordatorios WA           |

---

## Plantillas WhatsApp (Meta Cloud API)

| Nombre                    | Parámetros | Cuándo se envía         |
|---------------------------|------------|-------------------------|
| aquila_confirmacion       | 3          | Al crear/reactivar reserva |
| aquila_recordatorio_24h   | 3          | 23–25hs antes de la clase  |
| aquila_recordatorio_2h    | 2          | 0.5–1.5hs antes de la clase |

**Parámetros:** `{{1}}` = nombre, `{{2}}` = fecha (solo confirmación y 24hs), `{{3}}` = horario

---

## Variables de entorno (Vercel)

| Variable                      | Descripción                          |
|-------------------------------|--------------------------------------|
| NEXT_PUBLIC_SUPABASE_URL      | URL del proyecto Supabase            |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Clave pública Supabase               |
| SUPABASE_SERVICE_ROLE_KEY     | Clave de servicio (bypasea RLS)      |
| ADMIN_PASSWORD                | Contraseña del panel admin           |
| WHATSAPP_ACCESS_TOKEN         | Token de acceso Meta                 |
| WHATSAPP_PHONE_NUMBER_ID      | ID del número: 1093999950472384      |
| CRON_SECRET                   | Clave para autenticar cron-job.org   |

---

## Estados de reserva

```
                    ┌──────────────┐
                    │  confirmed   │◀─────────────────────┐
                    └──────┬───────┘                      │
                           │                              │
              ┌────────────┼────────────┐                 │
              │            │            │                 │
              ▼            ▼            ▼                 │
         ┌─────────┐  ┌─────────┐  ┌─────────┐           │
         │cancelled│  │attended │  │ no_show │           │
         └────┬────┘  └─────────┘  └────┬────┘           │
              │        definitivo        │                │
              │        bloqueado         │                │
              └──────────────────────────┘                │
              puede volver a reservar    │                │
                                         └────────────────┘
                                    "Habilitar para re-agendar"
                                    (admin → pasa a cancelled)
```

---

## Reglas de negocio

- **Cupo máximo:** 3 personas por turno
- **Anticipación mínima:** 12 horas para turnos de mañana (7:00 y 8:00)
- **Clase de prueba única:** bloqueado si ya tiene `attended` o `no_show`
- **Zona horaria:** Argentina UTC-3, sin horario de verano
- **Domingos:** sin clases (deshabilitados en el calendario)
- **Sábados:** solo turno de 8:00
