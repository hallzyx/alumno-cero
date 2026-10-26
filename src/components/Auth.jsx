"use client";
// Sign up / sign in. Username + password; no email (it's for school kids).
import { useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import Avatar, { AVATARS } from "./Avatar";
import { CeroSays } from "./Cero";

const GRADES = [
  { id: "primaria-alta", label: "Primaria (5.º o 6.º)" },
  { id: "secundaria-1", label: "1.º de secundaria" },
  { id: "secundaria-2", label: "2.º de secundaria" },
  { id: "secundaria-3", label: "3.º de secundaria" },
  { id: "otro", label: "Otro" },
];

export default function Auth({ dbOk, onDone, onSkip }) {
  const [mode, setMode] = useState("register");
  const [form, setForm] = useState({ username: "", password: "", nickname: "", avatar: "zero", grade: "secundaria-1" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const up = (k) => (e) => setForm((f) => ({ ...f, [k]: typeof e === "string" ? e : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/auth/${mode === "register" ? "register" : "login"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo continuar.");
      await onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="h-auth" data-testid="auth">
      <CeroSays mood="curioso">{mode === "register" ? "¡Crea tu cuenta y guardo todo lo que aprendas!" : "¡Qué bueno verte de nuevo!"}</CeroSays>
      <h1 id="h-auth">{mode === "register" ? "Crea tu cuenta" : "Entra a tu cuenta"}</h1>
      {!dbOk && <p className="flash flash-error" role="alert">La base de datos no responde ahora. Puedes seguir sin cuenta y tu progreso quedará solo en este navegador.</p>}
      <div className="seg auth-tabs" role="tablist" aria-label="Cuenta">
        <button type="button" role="tab" aria-selected={mode === "register"} className={`btn ${mode === "register" ? "btn-primary" : "btn-secondary"}`} onClick={() => setMode("register")}>Crear cuenta</button>
        <button type="button" role="tab" aria-selected={mode === "login"} className={`btn ${mode === "login" ? "btn-primary" : "btn-secondary"}`} onClick={() => setMode("login")} data-testid="auth-tab-login">Ya tengo cuenta</button>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <label className="field"><span>Usuario</span>
          <input name="username" autoComplete="username" required minLength={3} maxLength={20} value={form.username} onChange={up("username")} placeholder="por ejemplo: sofia_9" data-testid="auth-username" />
          {mode === "register" && <small>Solo letras minúsculas, números y _ (sin espacios).</small>}
        </label>
        <label className="field"><span>Contraseña</span>
          <input name="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} required minLength={4} value={form.password} onChange={up("password")} placeholder="mínimo 4 caracteres" data-testid="auth-password" />
        </label>
        {mode === "register" && (
          <>
            <label className="field"><span>¿Cómo te llamamos?</span>
              <input name="nickname" maxLength={24} value={form.nickname} onChange={up("nickname")} placeholder="tu nombre o apodo" data-testid="auth-nickname" />
            </label>
            <fieldset className="field avatar-pick">
              <legend>Elige tu avatar</legend>
              <div className="avatar-row">
                {AVATARS.map((a) => (
                  <label key={a.id} className={`avatar-opt ${form.avatar === a.id ? "on" : ""}`}>
                    <input type="radio" name="avatar" value={a.id} checked={form.avatar === a.id} onChange={() => up("avatar")(a.id)} />
                    <Avatar id={a.id} size={52} />
                    <span>{a.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="field"><span>Tu grado</span>
              <select name="grade" value={form.grade} onChange={up("grade")}>{GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</select>
            </label>
          </>
        )}
        {error && <p className="flash flash-error" role="alert" data-testid="auth-error">{error}</p>}
        <div className="cta-row">
          <button type="submit" className="btn btn-primary btn-lg" disabled={busy || !dbOk} data-testid="auth-submit">
            {busy ? <>Un momento… <LoaderCircle size={22} strokeWidth={2.6} aria-hidden="true" className="ico spin" /></> : <>{mode === "register" ? "Crear mi cuenta" : "Entrar"} <ArrowRight size={22} strokeWidth={2.6} aria-hidden="true" className="ico" /></>}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onSkip} data-testid="auth-skip">Seguir sin cuenta</button>
        </div>
      </form>
    </section>
  );
}
