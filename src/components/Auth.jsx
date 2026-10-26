"use client";
// Sign up / sign in. Username + password; no email (it's for school kids).
// Optional and late: it can carry the anonymous progress of this browser into the account.
import { useRef, useState } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle, Save } from "lucide-react";
import Avatar, { AVATARS } from "./Avatar";
import { CeroSays } from "./Cero";

const GRADES = [
  { id: "primaria-alta", label: "Primaria (5.º o 6.º)" },
  { id: "secundaria-1", label: "1.º de secundaria" },
  { id: "secundaria-2", label: "2.º de secundaria" },
  { id: "secundaria-3", label: "3.º de secundaria" },
  { id: "otro", label: "Otro" },
];

// Same rules as the server (src/lib/learner.js), checked here first for instant, specific feedback.
function check(form, mode) {
  const errors = {};
  const u = form.username.trim().toLowerCase();
  if (!u) errors.username = "Escribe un usuario.";
  else if (mode === "register" && !/^[a-z0-9_]{3,20}$/.test(u)) errors.username = "Usa de 3 a 20 letras minúsculas, números o _ (sin espacios ni tildes).";
  if (!form.password) errors.password = "Escribe tu contraseña.";
  else if (mode === "register" && form.password.length < 4) errors.password = "Tu contraseña necesita al menos 4 caracteres.";
  return errors;
}

export default function Auth({ dbOk, initialMode = "register", saving = "", onDone, onSkip, skipLabel = "Seguir sin cuenta" }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ username: "", password: "", nickname: "", avatar: "zero", grade: "secundaria-1" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [keep, setKeep] = useState(true);
  const formRef = useRef(null);
  const up = (k) => (e) => {
    const value = typeof e === "string" ? e : e.target.value;
    setForm((f) => ({ ...f, [k]: value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  function switchMode(m) {
    setMode(m); setErrors({}); setError(null);
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const found = check(form, mode);
    setErrors(found);
    setError(null);
    const first = Object.keys(found)[0];
    if (first) { formRef.current?.querySelector(`[name="${first}"]`)?.focus(); return; }
    setBusy(true);
    try {
      const r = await fetch(`/api/auth/${mode === "register" ? "register" : "login"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 409) { setErrors({ username: j.error }); formRef.current?.querySelector('[name="username"]')?.focus(); setBusy(false); return; }
        throw new Error(r.status === 503 ? "No pude conectar con el servidor de cuentas. Prueba en un rato o sigue sin cuenta: tu avance queda en este navegador." : j.error || "No se pudo continuar. Revisa tus datos.");
      }
      await onDone(Boolean(saving) && keep);
    } catch (err) {
      setError(err.message === "Failed to fetch" ? "Parece que no hay conexión. Revisa tu internet y vuelve a intentar." : err.message);
      setBusy(false);
    }
  }

  const reg = mode === "register";
  const fieldProps = (k) => ({
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": [errors[k] && `err-${k}`, `hint-${k}`].filter(Boolean).join(" ") || undefined,
  });

  return (
    <section aria-labelledby="h-auth" data-testid="auth" className="auth">
      <CeroSays mood="curioso">{saving ? "¡Guardo todo lo que lograste para que no se pierda!" : reg ? "¡Crea tu cuenta y guardo todo lo que aprendas!" : "¡Qué bueno verte de nuevo!"}</CeroSays>
      <h1 id="h-auth">{saving ? "Guarda tu progreso" : reg ? "Crea tu cuenta" : "Entra a tu cuenta"}</h1>
      <p className="lead">{reg ? "Es gratis y opcional. Solo pedimos un usuario y una contraseña: sin correo." : "Escribe tu usuario y tu contraseña."}</p>
      {!dbOk && <p className="flash flash-error" role="alert">El servidor de cuentas no responde ahora. Puedes intentarlo igual o seguir sin cuenta: tu progreso quedará en este navegador.</p>}

      <div className="seg auth-tabs" role="group" aria-label="¿Qué quieres hacer?">
        <button type="button" aria-pressed={reg} className={`btn ${reg ? "btn-primary" : "btn-secondary"}`} onClick={() => switchMode("register")} data-testid="auth-tab-register">Crear cuenta</button>
        <button type="button" aria-pressed={!reg} className={`btn ${!reg ? "btn-primary" : "btn-secondary"}`} onClick={() => switchMode("login")} data-testid="auth-tab-login">Ya tengo cuenta</button>
      </div>

      {saving && (
        <label className="keep-box" data-testid="auth-keep">
          <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
          <span><Save size={18} strokeWidth={2.4} aria-hidden="true" className="ico" /> Guardar en {reg ? "mi nueva cuenta" : "mi cuenta"} {saving}.</span>
        </label>
      )}

      <form className="auth-form" onSubmit={submit} noValidate ref={formRef} aria-busy={busy}>
        <div className="field">
          <label htmlFor="f-username">Usuario</label>
          <input id="f-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={20} value={form.username} onChange={up("username")} placeholder="por ejemplo: sofia_9" data-testid="auth-username" {...fieldProps("username")} />
          {reg && <small id="hint-username">Letras minúsculas, números y _ (sin espacios).</small>}
          {errors.username && <p className="field-error" id="err-username" data-testid="auth-error-username">{errors.username}</p>}
        </div>
        <div className="field">
          <label htmlFor="f-password">Contraseña</label>
          <div className="pw-wrap">
            <input id="f-password" name="password" type={showPw ? "text" : "password"} autoComplete={reg ? "new-password" : "current-password"} maxLength={72} value={form.password} onChange={up("password")} placeholder={reg ? "mínimo 4 caracteres" : ""} data-testid="auth-password" {...fieldProps("password")} />
            <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)} aria-pressed={showPw} aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}>
              {showPw ? <EyeOff size={20} strokeWidth={2.4} aria-hidden="true" /> : <Eye size={20} strokeWidth={2.4} aria-hidden="true" />}
            </button>
          </div>
          {reg && <small id="hint-password">No pedimos correo, así que no podemos recuperarla: anótala en un lugar seguro.</small>}
          {errors.password && <p className="field-error" id="err-password" data-testid="auth-error-password">{errors.password}</p>}
        </div>
        {reg && (
          <>
            <div className="field">
              <label htmlFor="f-nickname">¿Cómo te llamamos? <small>(opcional)</small></label>
              <input id="f-nickname" name="nickname" maxLength={24} value={form.nickname} onChange={up("nickname")} placeholder="tu nombre o apodo" data-testid="auth-nickname" />
            </div>
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
            <div className="field">
              <label htmlFor="f-grade">Tu grado</label>
              <select id="f-grade" name="grade" value={form.grade} onChange={up("grade")}>{GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</select>
            </div>
          </>
        )}
        <div aria-live="assertive">
          {error && <p className="flash flash-error" data-testid="auth-error">{error}</p>}
          {!error && Object.values(errors).some(Boolean) && <p className="sr-only">Revisa los campos marcados.</p>}
        </div>
        <div className="cta-row">
          <button type="submit" className="btn btn-primary btn-lg" disabled={busy} data-testid="auth-submit">
            {busy ? <>Un momento… <LoaderCircle size={22} strokeWidth={2.6} aria-hidden="true" className="ico spin-ico" /></> : <>{reg ? (saving ? "Crear cuenta y guardar" : "Crear mi cuenta") : "Entrar"} <ArrowRight size={22} strokeWidth={2.6} aria-hidden="true" className="ico" /></>}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onSkip} data-testid="auth-skip">{skipLabel}</button>
        </div>
        <p className="note">Crear una cuenta es opcional y gratis. Guarda tu nivel, insignias y fichas para verlos desde cualquier equipo.</p>
      </form>
    </section>
  );
}
