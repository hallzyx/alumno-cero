"use client";
// Family panel (Familia+) and teacher panel (Colegios): profiles of the account, their progress, and a way
// to study as one of them. Adult mode = the account owner; profiles don't sign in on their own.
import { useEffect, useState } from "react";
import { Copy, GraduationCap, LoaderCircle, Plus, School, Trophy, UserPlus, Users as Users2 } from "lucide-react";
import { PLANS } from "@/lib/plans";
import Avatar, { AVATARS } from "./Avatar";

const GRADES = [
  { id: "primaria-alta", label: "Primaria (5.º o 6.º)" },
  { id: "secundaria-1", label: "1.º de secundaria" },
  { id: "secundaria-2", label: "2.º de secundaria" },
  { id: "secundaria-3", label: "3.º de secundaria" },
  { id: "otro", label: "Otro" },
];
const gradeLabel = (id) => GRADES.find((g) => g.id === id)?.label ?? "";
const when = (d) => (d ? new Date(d).toLocaleDateString("es-PE", { day: "numeric", month: "short" }) : "—");

function useAccount() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const load = () => fetch("/api/account").then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setData(j); setError(null); }).catch((e) => setError(e.message || "No pude cargar el panel."));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, error, reload: load };
}

function AddProfile({ classrooms = [], withClassroom = false, noun = "estudiante", disabled, disabledText, onAdded }) {
  const [form, setForm] = useState({ nickname: "", avatar: "star", grade: "secundaria-1", classroomId: "" });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const up = (k) => (e) => setForm((f) => ({ ...f, [k]: typeof e === "string" ? e : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/profiles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, classroomId: form.classroomId || undefined }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "No pude añadirlo.");
      setForm((f) => ({ ...f, nickname: "" }));
      setMsg({ ok: true, text: `¡Listo! ${form.nickname} ya tiene su perfil.` });
      await onAdded();
    } catch (err) {
      setMsg({ ok: false, text: err.message === "Failed to fetch" ? "No hay conexión. Esto necesita internet." : err.message });
    }
    setBusy(false);
  }

  if (disabled) return <p className="note note-box">{disabledText}</p>;
  return (
    <form className="panel-form" onSubmit={submit} data-testid="add-profile">
      <h3><UserPlus size={22} strokeWidth={2.4} aria-hidden="true" /> Añadir {noun}</h3>
      <div className="field">
        <label htmlFor="np-name">Nombre o apodo</label>
        <input id="np-name" value={form.nickname} onChange={up("nickname")} maxLength={24} required placeholder="por ejemplo: Valeria" data-testid="np-name" />
      </div>
      <div className="field">
        <label htmlFor="np-grade">Grado</label>
        <select id="np-grade" value={form.grade} onChange={up("grade")}>{GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</select>
      </div>
      {withClassroom && (
        <div className="field">
          <label htmlFor="np-class">Aula</label>
          <select id="np-class" value={form.classroomId} onChange={up("classroomId")} data-testid="np-class">
            <option value="">Sin aula</option>
            {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <fieldset className="field avatar-pick">
        <legend>Avatar</legend>
        <div className="avatar-row">
          {AVATARS.map((a) => (
            <label key={a.id} className={`avatar-opt ${form.avatar === a.id ? "on" : ""}`}>
              <input type="radio" name="np-avatar" value={a.id} checked={form.avatar === a.id} onChange={() => up("avatar")(a.id)} />
              <Avatar id={a.id} size={44} /><span>{a.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div aria-live="polite">{msg && <p className={`flash ${msg.ok ? "flash-info" : "flash-error"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}</div>
      <button type="submit" className="btn btn-primary" disabled={busy} data-testid="np-submit">{busy ? <>Añadiendo… <LoaderCircle size={20} strokeWidth={2.6} aria-hidden="true" className="ico spin-ico" /></> : <><Plus size={20} strokeWidth={2.6} aria-hidden="true" className="ico" /> Añadir</>}</button>
    </form>
  );
}

function LevelBar({ level }) {
  return <div className="xpbar xpbar-sm" role="img" aria-label={`Nivel ${level.n}, ${level.into} de ${level.needed} XP para el siguiente`}><span style={{ width: `${level.pct}%` }} /></div>;
}

function Shell({ title, icon: Icon, intro, state, children }) {
  return (
    <section aria-labelledby="h-panel" data-testid="panel">
      <h1 id="h-panel"><Icon size={30} strokeWidth={2.4} aria-hidden="true" className="ico" /> {title}</h1>
      <p className="lead">{intro}</p>
      {state.error && <p className="flash flash-error" role="alert">{state.error} <button type="button" className="linkish" onClick={state.reload}>Reintentar</button></p>}
      {!state.data && !state.error && <p className="note" aria-busy="true">Cargando…</p>}
      {state.data && children}
    </section>
  );
}

function OwnerBanner({ data, onSwitch }) {
  if (data.isOwner) return null;
  const owner = data.profiles.find((p) => p.isOwner);
  return (
    <div className="hub-continue" data-testid="not-owner">
      <p>Ahora estudia <strong>{data.profiles.find((p) => p.id === data.activeId)?.nickname}</strong>. Para gestionar perfiles vuelve al modo adulto.</p>
      <button type="button" className="btn btn-primary" onClick={() => onSwitch(owner.id)}>Volver al perfil adulto</button>
    </div>
  );
}

/* --------------------------------- family ---------------------------------- */

export function FamilyPanel({ onSwitch }) {
  const state = useAccount();
  const { data } = state;
  const kids = data ? data.profiles.filter((p) => !p.isOwner) : [];
  return (
    <Shell title="Panel familiar" icon={Users2} intro="Ve cómo avanza cada hijo o hija y cambia de perfil en un toque. Cada uno tiene su propio nivel, insignias y fichas." state={state}>
      {data && (
        <>
          <OwnerBanner data={data} onSwitch={onSwitch} />
          <p className="note"><strong>{data.profiles.length}</strong> de {data.caps.maxChildren + 1} perfiles usados.</p>
          <ul className="profile-grid" data-testid="profiles">
            {data.profiles.map((p) => (
              <li key={p.id} className={`profile-card ${p.id === data.activeId ? "is-active" : ""}`}>
                <header><Avatar id={p.avatar} size={52} /><div><h3>{p.nickname}{p.isOwner && <small> (adulto)</small>}</h3><p>{gradeLabel(p.grade)}</p></div></header>
                <p className="profile-level"><strong>Nivel {p.level.n}</strong> · {p.level.title}</p>
                <LevelBar level={p.level} />
                <dl className="profile-stats">
                  <div><dt>Fichas</dt><dd>{p.mastered}</dd></div>
                  <div><dt>Exámenes</dt><dd>{p.attempts}</dd></div>
                  <div><dt>Aprobados</dt><dd>{p.passed}</dd></div>
                  <div><dt>Visto</dt><dd>{when(p.lastSeen)}</dd></div>
                </dl>
                {p.id === data.activeId
                  ? <p className="plan-current">Estudiando ahora</p>
                  : <button type="button" className="btn btn-secondary btn-block" onClick={() => onSwitch(p.id)} data-testid={`study-as-${p.id}`}>Estudiar como {p.nickname}</button>}
              </li>
            ))}
          </ul>
          <AddProfile noun="hijo o hija" disabled={!data.isOwner || kids.length >= data.caps.maxChildren} disabledText={!data.isOwner ? "Vuelve al perfil adulto para añadir perfiles." : `Ya usaste los ${data.caps.maxChildren + 1} perfiles de tu plan.`} onAdded={state.reload} />
        </>
      )}
    </Shell>
  );
}


/* --------------------------------- classes --------------------------------- */

export function ClassesPanel({ onSwitch }) {
  const state = useAccount();
  const { data } = state;
  const [filter, setFilter] = useState("all");
  const [cls, setCls] = useState({ name: "", grade: "secundaria-1" });
  const [clsMsg, setClsMsg] = useState(null);
  const [copied, setCopied] = useState(null);
  const students = data ? data.profiles.filter((p) => !p.isOwner) : [];
  const shown = students.filter((s) => filter === "all" || (filter === "none" ? !s.classroomId : s.classroomId === filter));
  const className = (id) => data?.classrooms.find((c) => c.id === id)?.name ?? "Sin aula";

  async function createClass(e) {
    e.preventDefault();
    setClsMsg(null);
    try {
      const r = await fetch("/api/classrooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cls) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "No pude crear el aula.");
      setCls((c) => ({ ...c, name: "" }));
      setClsMsg({ ok: true, text: `Aula creada. Código: ${j.code}` });
      await state.reload();
    } catch (err) {
      setClsMsg({ ok: false, text: err.message === "Failed to fetch" ? "No hay conexión. Esto necesita internet." : err.message });
    }
  }

  const copy = async (c) => { try { await navigator.clipboard.writeText(c.code); setCopied(c.id); setTimeout(() => setCopied(null), 1800); } catch { /* ignore */ } };

  return (
    <Shell title="Panel docente" icon={School} intro="Crea aulas, añade alumnos y mira el nivel, las fichas y la actividad de cada uno. En esta demo entras como cada alumno desde aquí." state={state}>
      {data && (
        <>
          <OwnerBanner data={data} onSwitch={onSwitch} />
          <h2>Aulas <small>{data.classrooms.length}/{PLANS.colegio.maxClassrooms}</small></h2>
          <ul className="class-grid" data-testid="classrooms">
            {data.classrooms.map((c) => (
              <li key={c.id} className="class-card">
                <h3>{c.name}</h3>
                <p>{gradeLabel(c.grade)} · {c.students} {c.students === 1 ? "alumno" : "alumnos"}</p>
                <p className="class-code">Código <strong>{c.code}</strong> <button type="button" className="mochila-use" onClick={() => copy(c)} aria-label={`Copiar el código ${c.code}`}><Copy size={14} strokeWidth={3} aria-hidden="true" /> {copied === c.id ? "copiado" : "copiar"}</button></p>
              </li>
            ))}
            {data.classrooms.length === 0 && <li className="note note-box">Todavía no tienes aulas. Crea la primera abajo.</li>}
          </ul>
          {data.isOwner && (
            <form className="panel-form" onSubmit={createClass} data-testid="add-classroom">
              <h3><GraduationCap size={22} strokeWidth={2.4} aria-hidden="true" /> Nueva aula</h3>
              <div className="field"><label htmlFor="cl-name">Nombre del aula</label><input id="cl-name" value={cls.name} onChange={(e) => setCls((c) => ({ ...c, name: e.target.value }))} maxLength={60} required placeholder="por ejemplo: 2.º B" data-testid="cl-name" /></div>
              <div className="field"><label htmlFor="cl-grade">Grado</label><select id="cl-grade" value={cls.grade} onChange={(e) => setCls((c) => ({ ...c, grade: e.target.value }))}>{GRADES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</select></div>
              <div aria-live="polite">{clsMsg && <p className={`flash ${clsMsg.ok ? "flash-info" : "flash-error"}`} role={clsMsg.ok ? "status" : "alert"}>{clsMsg.text}</p>}</div>
              <button type="submit" className="btn btn-primary" data-testid="cl-submit"><Plus size={20} strokeWidth={2.6} aria-hidden="true" className="ico" /> Crear aula</button>
            </form>
          )}

          <h2>Alumnos <small>{students.length}</small></h2>
          {students.length > 0 && (
            <div className="field panel-filter">
              <label htmlFor="cl-filter">Ver</label>
              <select id="cl-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">Todos</option>
                {data.classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="none">Sin aula</option>
              </select>
            </div>
          )}
          {shown.length > 0 ? (
            <div className="table-wrap" role="region" aria-label="Alumnos" tabIndex={0}>
              <table className="calc" data-testid="students">
                <caption className="sr-only">Alumnos y su avance</caption>
                <thead><tr><th scope="col">Alumno</th><th scope="col">Aula</th><th scope="col">Nivel</th><th scope="col">Fichas</th><th scope="col">Aprobados</th><th scope="col">Visto</th><th scope="col"><span className="sr-only">Acción</span></th></tr></thead>
                <tbody>
                  {shown.map((s) => (
                    <tr key={s.id}>
                      <th scope="row"><span className="stu"><Avatar id={s.avatar} size={30} /> {s.nickname}</span></th>
                      <td>{className(s.classroomId)}</td>
                      <td>{s.level.n} <small>· {s.level.xp} XP</small></td>
                      <td>{s.mastered}</td>
                      <td><Trophy size={14} strokeWidth={2.6} aria-hidden="true" className="ico" /> {s.passed}</td>
                      <td>{when(s.lastSeen)}</td>
                      <td>{s.id === data.activeId ? <span className="plan-current">Activo</span> : <button type="button" className="btn btn-sm btn-secondary" onClick={() => onSwitch(s.id)} data-testid={`study-as-${s.id}`}>Entrar como alumno</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="note note-box">{students.length ? "No hay alumnos en esa aula." : "Todavía no hay alumnos. Añade el primero abajo."}</p>}

          <AddProfile noun="alumno" withClassroom classrooms={data.classrooms} disabled={!data.isOwner || students.length >= data.caps.maxChildren} disabledText={!data.isOwner ? "Vuelve al perfil docente para añadir alumnos." : "Llegaste al máximo de alumnos del plan."} onAdded={state.reload} />
        </>
      )}
    </Shell>
  );
}
