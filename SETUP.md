# Setup · Reserva Clase de Prueba — Aquila Evolución

## 1. Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) → New Project
2. En **SQL Editor**, pegar y ejecutar el contenido de `supabase-schema.sql`
3. Ir a **Settings → API** y copiar:
   - `Project URL`
   - `anon public` key

## 2. Variables de entorno

Crear el archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

## 3. Logo

Copiar el logo de Aquila Evolución en:

```
public/logo.png   (o .svg)
```

Luego descomentar el bloque `<Image>` en `app/page.tsx` y borrar el SVG placeholder.

## 4. Número de WhatsApp

En `components/SuccessScreen.tsx` y `app/page.tsx`, reemplazar:

```
5491100000000
```

por el número real en formato internacional sin el `+`.

## 5. Horarios disponibles

Editar `lib/constants.ts` para ajustar los turnos y el máximo de personas por clase:

```ts
export const MAX_PER_SLOT = 5;   // personas máximo por turno
export const TIME_SLOTS = [...];  // turnos disponibles
```

## 6. Correr en desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## 7. Deploy (Vercel)

```bash
npx vercel
```

Agregar las variables de entorno en el dashboard de Vercel.
