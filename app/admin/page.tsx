"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Ban, Plus, Trash2, Lock, LogOut, Calendar, AlertTriangle } from "lucide-react";
import clsx from "clsx";

type BlockedDate = {
  id: string;
  date: string;
  reason: string | null;
};

export default function AdminPage() {
  const [password, setPassword]       = useState("");
  const [authed, setAuthed]           = useState(false);
  const [authError, setAuthError]     = useState("");
  const [blocked, setBlocked]         = useState<BlockedDate[]>([]);
  const [loading, setLoading]         = useState(false);
  const [newDate, setNewDate]         = useState("");
  const [newReason, setNewReason]     = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [formError, setFormError]     = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const savedPassword = typeof window !== "undefined" ? sessionStorage.getItem("admin_pw") ?? "" : "";

  const fetchBlocked = useCallback(async (pw: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/blocked-dates", {
        headers: { "x-admin-password": pw },
      });
      const data: { blocked?: BlockedDate[] } = await res.json();
      setBlocked(data.blocked ?? []);
    } catch {
      setBlocked([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Intentar auto-login si hay contraseña en sesión
  useEffect(() => {
    if (savedPassword) {
      setPassword(savedPassword);
      setAuthed(true);
      fetchBlocked(savedPassword);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const res = await fetch("/api/blocked-dates", {
      headers: { "x-admin-password": password },
    });
    if (res.status === 401) {
      setAuthError("Contraseña incorrecta");
      return;
    }
    sessionStorage.setItem("admin_pw", password);
    setAuthed(true);
    const data: { blocked?: BlockedDate[] } = await res.json();
    setBlocked(data.blocked ?? []);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_pw");
    setAuthed(false);
    setPassword("");
    setBlocked([]);
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
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ date: newDate, reason: newReason || null }),
      });
      const data: { error?: string } = await res.json();

      if (!res.ok) {
        setFormError(data.error ?? "Error al bloquear la fecha.");
        return;
      }

      setFormSuccess(`✓ Fecha ${format(parseISO(newDate), "d 'de' MMMM", { locale: es })} bloqueada.`);
      setNewDate("");
      setNewReason("");
      fetchBlocked(password);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnblock = async (date: string) => {
    if (!confirm(`¿Desbloquear el ${format(parseISO(date), "d 'de' MMMM yyyy", { locale: es })}?`)) return;

    await fetch(`/api/blocked-dates/${date}`, {
      method: "DELETE",
      headers: { "x-admin-password": password },
    });
    fetchBlocked(password);
  };

  if (!authed) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-aquila-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-card-lg border border-aquila-100 p-8">
          <div className="flex flex-col items-center gap-4 mb-8">
            <Image src="/logo.png" alt="Aquila Evolución" width={150} height={77} className="object-contain" />
            <div className="text-center">
              <h1 className="text-lg font-bold text-aquila-800">Panel de Administración</h1>
              <p className="text-sm text-stone-400 mt-1">Ingresá tu contraseña para continuar</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-2xl border-2 border-aquila-100 bg-white px-4 focus-within:border-aquila-500 transition-colors">
              <Lock className="w-4 h-4 text-aquila-400 shrink-0" />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="flex-1 min-h-[52px] bg-transparent text-sm text-aquila-900 placeholder:text-stone-400 outline-none"
              />
            </div>

            {authError && (
              <p className="text-xs text-red-500 text-center">{authError}</p>
            )}

            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-aquila-700 to-aquila-600 text-white text-sm font-bold shadow-btn hover:from-aquila-800 hover:to-aquila-700 transition-all active:scale-95"
            >
              Ingresar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-aquila-50 px-4 py-8">
      <div className="max-w-lg mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Aquila Evolución" width={110} height={57} className="object-contain" />
            <div>
              <h1 className="text-sm font-bold text-aquila-800">Panel Admin</h1>
              <p className="text-xs text-stone-400">Gestión de fechas</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-coral-500 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Salir
          </button>
        </div>

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
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full min-h-[48px] rounded-2xl border-2 border-aquila-100 px-4 text-sm text-aquila-800 outline-none focus:border-aquila-500 transition-colors bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-aquila-600 uppercase tracking-wider pl-1 block mb-1.5">
                Motivo <span className="text-stone-400 normal-case font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Feriado nacional, Suspensión imprevista..."
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
              <p className="text-xs text-aquila-600 font-semibold text-center">{formSuccess}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={clsx(
                "flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-95",
                submitting
                  ? "bg-coral-300 cursor-not-allowed"
                  : "bg-coral-500 hover:bg-coral-600 shadow-btn-coral"
              )}
            >
              <Ban className="w-4 h-4" />
              {submitting ? "Bloqueando…" : "Bloquear fecha"}
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

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-aquila-400 border-t-transparent rounded-full animate-spin" />
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
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-coral-100 text-stone-400 hover:text-coral-600 transition-all shrink-0"
                    title="Desbloquear"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex items-start gap-2 rounded-2xl bg-aquila-50 border border-aquila-100 px-4 py-3">
          <Plus className="w-4 h-4 text-aquila-400 shrink-0 mt-0.5" />
          <p className="text-xs text-stone-400 leading-relaxed">
            Los días bloqueados aparecen tachados en el calendario del público y no permiten nuevas reservas.
          </p>
        </div>

      </div>
    </div>
  );
}
