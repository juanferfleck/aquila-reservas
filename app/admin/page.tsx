"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Ban, Trash2, Lock, LogOut, Calendar,
  AlertTriangle, Loader2, CheckCircle2, LayoutList,
} from "lucide-react";
import clsx from "clsx";
import ReservationsDashboard from "@/components/admin/ReservationsDashboard";

type BlockedDate = {
  id: string;
  date: string;
  reason: string | null;
};

type Tab = "reservations" | "blocked";

const SESSION_KEY = "aquila_admin_pw";

// ─── Helpers de API ───────────────────────────────────────────

async function verifyPassword(password: string): Promise<boolean> {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return res.ok;
}

async function fetchBlockedDates(password: string): Promise<BlockedDate[]> {
  const res = await fetch("/api/blocked-dates", {
    headers: { "x-admin-password": password },
  });
  if (!res.ok) return [];
  const data: { blocked?: BlockedDate[] } = await res.json();
  return data.blocked ?? [];
}

// ─── Componente principal ─────────────────────────────────────

export default function AdminPage() {
  const [password, setPassword]       = useState("");
  const [authed, setAuthed]           = useState(false);
  const [authError, setAuthError]     = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab]     = useState<Tab>("reservations");
  const [blocked, setBlocked]         = useState<BlockedDate[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [newDate, setNewDate]         = useState("");
  const [newReason, setNewReason]     = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [formError, setFormError]     = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const loadBlocked = useCallback(async (pw: string) => {
    setLoadingList(true);
    try {
      const data = await fetchBlockedDates(pw);
      setBlocked(data);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    const savedPw = sessionStorage.getItem(SESSION_KEY);
    if (!savedPw) {
      setAuthLoading(false);
      return;
    }
    verifyPassword(savedPw).then((valid) => {
      if (valid) {
        setPassword(savedPw);
        setAuthed(true);
        loadBlocked(savedPw);
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }
      setAuthLoading(false);
    });
  }, [loadBlocked]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    const valid = await verifyPassword(password);

    if (!valid) {
      setAuthError("Contraseña incorrecta. Intentá de nuevo.");
      setPassword("");
      setAuthLoading(false);
      return;
    }

    sessionStorage.setItem(SESSION_KEY, password);
    setAuthed(true);
    await loadBlocked(password);
    setAuthLoading(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
    setPassword("");
    setBlocked([]);
    setFormError("");
    setFormSuccess("");
  };

  const handleBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!newDate) {
      setFormError("Seleccioná una fecha.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/blocked-dates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ date: newDate, reason: newReason.trim() || null }),
      });

      if (res.status === 401) { handleLogout(); return; }

      const data: { error?: string } = await res.json();

      if (!res.ok) {
        setFormError(data.error ?? "Error al bloquear la fecha.");
        return;
      }

      setFormSuccess(
        `✓ ${format(parseISO(newDate), "d 'de' MMMM", { locale: es })} bloqueado correctamente.`
      );
      setNewDate("");
      setNewReason("");
      await loadBlocked(password);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnblock = async (date: string) => {
    const dateLabel = format(parseISO(date), "d 'de' MMMM yyyy", { locale: es });
    if (!confirm(`¿Desbloquear el ${dateLabel}?`)) return;

    const res = await fetch(`/api/blocked-dates/${date}`, {
      method: "DELETE",
      headers: { "x-admin-password": password },
    });

    if (res.status === 401) { handleLogout(); return; }
    await loadBlocked(password);
  };

  // ─── Pantalla de carga ───────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-aquila-50">
        <Loader2 className="w-8 h-8 text-aquila-400 animate-spin" />
      </div>
    );
  }

  // ─── Pantalla de login ───────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-aquila-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-card-lg border border-aquila-100 p-8 animate-scale-in">
          <div className="flex flex-col items-center gap-4 mb-8">
            <Image src="/logo.png" alt="Aquila Evolución" width={150} height={77} className="object-contain" />
            <div className="text-center">
              <h1 className="text-lg font-bold text-aquila-800">Panel de Administración</h1>
              <p className="text-sm text-stone-400 mt-1">Ingresá tu contraseña para continuar</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div
              className={clsx(
                "flex items-center gap-3 rounded-2xl border-2 px-4 transition-colors",
                authError ? "border-red-300 bg-red-50/30" : "border-aquila-100 focus-within:border-aquila-500"
              )}
            >
              <Lock className={clsx("w-4 h-4 shrink-0", authError ? "text-red-400" : "text-aquila-400")} />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setAuthError(""); }}
                autoComplete="current-password"
                autoFocus
                className="flex-1 min-h-[52px] bg-transparent text-sm text-aquila-900 placeholder:text-stone-400 outline-none"
              />
            </div>

            {authError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 animate-slide-down">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-xs text-red-600 font-medium">{authError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!password.trim()}
              className={clsx(
                "w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold text-white transition-all active:scale-95",
                !password.trim()
                  ? "bg-aquila-300 cursor-not-allowed"
                  : "bg-gradient-to-r from-aquila-700 to-aquila-600 shadow-btn hover:from-aquila-800 hover:to-aquila-700"
              )}
            >
              Ingresar
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Panel principal ─────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-aquila-50 pb-10">

      {/* Header sticky */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-aquila-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Aquila Evolución" width={90} height={46} className="object-contain" />
            <span className="text-xs font-bold text-aquila-600 bg-aquila-100 px-2 py-0.5 rounded-full">Admin</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-coral-500 transition-colors py-2 px-3 rounded-xl hover:bg-coral-50"
          >
            <LogOut className="w-4 h-4" />
            Salir
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 flex flex-col gap-4">

        {/* Tabs de navegación */}
        <div className="flex gap-2 bg-white rounded-2xl border border-aquila-100 p-1.5 shadow-sm">
          <button
            onClick={() => setActiveTab("reservations")}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === "reservations"
                ? "bg-aquila-700 text-white shadow-btn"
                : "text-aquila-500 hover:text-aquila-700"
            )}
          >
            <LayoutList className="w-4 h-4" />
            Reservas
          </button>
          <button
            onClick={() => { setActiveTab("blocked"); loadBlocked(password); }}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === "blocked"
                ? "bg-aquila-700 text-white shadow-btn"
                : "text-aquila-500 hover:text-aquila-700"
            )}
          >
            <Ban className="w-4 h-4" />
            Fechas
          </button>
        </div>

        {/* ── Tab: Reservas ── */}
        {activeTab === "reservations" && (
          <div className="bg-white rounded-3xl border border-aquila-100 shadow-card p-5">
            <h2 className="text-sm font-bold text-aquila-800 mb-4 flex items-center gap-2">
              <LayoutList className="w-4 h-4 text-aquila-500" />
              Turnos reservados
            </h2>
            <ReservationsDashboard password={password} />
          </div>
        )}

        {/* ── Tab: Fechas bloqueadas ── */}
        {activeTab === "blocked" && (
          <>
            {/* Bloquear una fecha */}
            <div className="bg-white rounded-3xl border border-aquila-100 shadow-card p-6">
              <h2 className="text-sm font-bold text-aquila-800 mb-4 flex items-center gap-2">
                <Ban className="w-4 h-4 text-coral-500" />
                Bloquear una fecha
              </h2>

              <form onSubmit={handleBlock} className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-bold text-aquila-600 uppercase tracking-wider pl-1 block mb-1.5">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => { setNewDate(e.target.value); setFormError(""); setFormSuccess(""); }}
                    className="w-full min-h-[48px] rounded-2xl border-2 border-aquila-100 px-4 text-sm text-aquila-800 outline-none focus:border-aquila-500 transition-colors bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-aquila-600 uppercase tracking-wider pl-1 block mb-1.5">
                    Motivo <span className="text-stone-400 normal-case font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Feriado nacional, Suspensión imprevista…"
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    className="w-full min-h-[48px] rounded-2xl border-2 border-aquila-100 px-4 text-sm text-aquila-800 placeholder:text-stone-400 outline-none focus:border-aquila-500 transition-colors bg-white"
                  />
                </div>

                {formError && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-xs text-red-600">{formError}</p>
                  </div>
                )}

                {formSuccess && (
                  <div className="flex items-center gap-2 rounded-xl bg-aquila-50 border border-aquila-200 px-3 py-2">
                    <CheckCircle2 className="w-4 h-4 text-aquila-600 shrink-0" />
                    <p className="text-xs text-aquila-700 font-medium">{formSuccess}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !newDate}
                  className={clsx(
                    "flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-95",
                    submitting || !newDate
                      ? "bg-coral-300 cursor-not-allowed"
                      : "bg-coral-500 hover:bg-coral-600 shadow-btn-coral"
                  )}
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Bloqueando…</>
                  ) : (
                    <><Ban className="w-4 h-4" />Bloquear fecha</>
                  )}
                </button>
              </form>
            </div>

            {/* Lista de fechas bloqueadas */}
            <div className="bg-white rounded-3xl border border-aquila-100 shadow-card p-6">
              <h2 className="text-sm font-bold text-aquila-800 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-aquila-500" />
                Fechas bloqueadas
                {blocked.length > 0 && (
                  <span className="ml-auto bg-coral-100 text-coral-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {blocked.length}
                  </span>
                )}
              </h2>

              {loadingList ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 text-aquila-400 animate-spin" />
                </div>
              ) : blocked.length === 0 ? (
                <p className="text-sm text-stone-400 text-center py-6">
                  No hay fechas bloqueadas próximas.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {blocked.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-aquila-50 border border-aquila-100 px-4 py-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Ban className="w-4 h-4 text-coral-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-aquila-800 capitalize">
                            {format(parseISO(b.date), "EEEE d 'de' MMMM yyyy", { locale: es })}
                          </p>
                          {b.reason && (
                            <p className="text-xs text-stone-400 truncate">{b.reason}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnblock(b.date)}
                        title="Desbloquear"
                        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-coral-100 text-stone-400 hover:text-coral-600 transition-all shrink-0 active:scale-90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
