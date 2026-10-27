"use client";
// "Mi hub": level, XP, streak, badges, subjects with their topics, mastery cards and recent activity.
import { useEffect, useState } from "react";
import { Calculator, Compass, Dumbbell, Flame, FlaskConical, Library, Lock, Pencil, Play, Star, Trophy, Zap, BookCheck, ArrowRight } from "lucide-react";
import { BADGES } from "@/lib/levels";
import { SUBJECTS } from "@/lib/subjects";
import { TOPICS, getTopic } from "@/lib/topics";
import { planOf } from "@/lib/plans";
import Avatar from "./Avatar";
import LocalAICard from "./LocalAICard";

const BADGE_ICONS = { Pencil, Trophy, Zap, BookCheck, Library, Dumbbell, Flame, Compass, Star };
const SUBJECT_ICONS = { Calculator, FlaskConical };
const fmtDate = (d) => new Date(d).toLocaleDateString("es-PE", { day: "numeric", month: "short" });

export default function Hub({ onContinue, onStartTopic, onExpired, refreshKey, account, caps = {}, online = true, onGo }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let alive = true;
    setError(null);
    fetch("/api/hub")
      .then(async (r) => {
        if (r.status === 401) { onExpired?.(); return; }
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(r.status === 503 ? "No pude conectar con la base de datos para cargar tu hub." : j.error || "No pude cargar tu hub.");
        if (alive) setData(j);
      })
      .catch((e) => alive && setError(e.message === "Failed to fetch" ? "Parece que no hay conexión." : e.message));
    return () => { alive = false; };
  }, [refreshKey, retry]); // eslint-disable-line react-hooks/exhaustive-deps

  // No connection: the stats come from the server, but practising does not need it.
  if (error && !online) return (
    <section data-testid="hub" aria-labelledby="h-hub">
      <h1 id="h-hub">Mi hub</h1>
      <p className="note note-box" data-testid="hub-offline">Estás sin conexión, así que no puedo mostrar tu nivel ni tus fichas ahora. <strong>Puedes seguir practicando</strong>: tu avance se guarda en este dispositivo y se sincroniza cuando vuelva internet.</p>
      <div className="hub-subjects">
        {Object.values(SUBJECTS).map((sub) => (
          <article key={sub.id} className={`subject-card subject-${sub.tone}`}>
            <header><div><h3>{sub.name}</h3><p>{sub.tagline}</p></div></header>
            <ul>
              {TOPICS.filter((t) => t.subject === sub.id).map((t) => (
                <li key={t.id}>
                  <span className="topic-emoji" aria-hidden="true">{t.emoji}</span>
                  <span className="topic-name"><strong>{t.title}</strong><small>{t.blurb}</small></span>
                  <button className="btn btn-sm btn-primary" onClick={() => onStartTopic(t.id)} data-testid={`start-${t.id}`}>Empezar <ArrowRight size={16} strokeWidth={3} aria-hidden="true" className="ico" /></button>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );

  if (error) return (
    <section data-testid="hub" aria-labelledby="h-hub">
      <h1 id="h-hub">Mi hub</h1>
      <p className="flash flash-error" role="alert">{error}</p>
      <div className="cta-row">
        <button type="button" className="btn btn-primary" onClick={() => setRetry((n) => n + 1)} data-testid="hub-retry">Reintentar</button>
      </div>
    </section>
  );
  if (!data) return <section data-testid="hub" aria-busy="true"><h1>Mi hub</h1><p className="lead">Cargando tu mochila…</p></section>;

  const { learner, level, stats, badges, sessions, cards, recent } = data;
  const earned = new Set(badges.map((b) => b.code));
  const inProgress = sessions.find((s) => s.status === "in_progress" && getTopic(s.topicId));
  const statusOf = (id) => (sessions.some((s) => s.topicId === id && s.status === "mastered") ? "mastered" : sessions.some((s) => s.topicId === id) ? "started" : "new");

  return (
    <section aria-labelledby="h-hub" data-testid="hub">
      <div className="hub-hero">
        <Avatar id={learner.avatar} size={76} />
        <div className="hub-hero-body">
          <h1 id="h-hub">¡Hola, {learner.nickname}!</h1>
          <p className="hub-level"><strong>Nivel {level.n}</strong> · {level.title}</p>
          <div className="xpbar" role="progressbar" aria-label="Experiencia" aria-valuemin={0} aria-valuemax={level.needed} aria-valuenow={level.into} aria-valuetext={`${level.into} de ${level.needed} XP para el siguiente nivel`}>
            <span style={{ width: `${level.pct}%` }} />
          </div>
          <p className="hub-xp">{level.xp} XP · te faltan {level.next - level.xp} para el nivel {level.n + 1}</p>
        </div>
      </div>

      {planOf(account?.plan) && (
        <div className="plan-strip" data-testid="plan-strip">
          <p><strong>Plan {planOf(account.plan).name}</strong> · IA en la nube · dictado por voz · progreso sincronizado</p>
          <div className="plan-strip-actions">
            {caps.family && <button type="button" className="btn btn-secondary btn-sm" onClick={() => onGo("family")} data-testid="hub-family">Panel familiar</button>}
            {caps.classrooms && <button type="button" className="btn btn-secondary btn-sm" onClick={() => onGo("classes")} data-testid="hub-classes">Panel docente</button>}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onGo("plans")} data-testid="hub-plan">Ver o cambiar mi plan</button>
          </div>
        </div>
      )}

      <ul className="hub-stats" aria-label="Tus números">
        <li><Flame aria-hidden="true" /><strong>{stats.streak}</strong><span>días de racha</span></li>
        <li><BookCheck aria-hidden="true" /><strong>{stats.mastered}</strong><span>fichas</span></li>
        <li><Trophy aria-hidden="true" /><strong>{stats.passed}</strong><span>aprobados</span></li>
        <li><Pencil aria-hidden="true" /><strong>{stats.attempts}</strong><span>exámenes</span></li>
      </ul>

      <div className="hub-cols">
      <div className="hub-main">
      {inProgress && (
        <div className="hub-continue">
          <p><strong>Sigues con:</strong> {getTopic(inProgress.topicId).emoji} {getTopic(inProgress.topicId).title}</p>
          <button className="btn btn-primary btn-lg" onClick={() => onContinue(inProgress.sid)} data-testid="hub-continue"><Play size={22} strokeWidth={2.6} aria-hidden="true" className="ico" /> Seguir donde lo dejé</button>
        </div>
      )}

      <h2>Tus materias</h2>
      <div className="hub-subjects">
        {Object.values(SUBJECTS).map((sub) => {
          const topics = TOPICS.filter((t) => t.subject === sub.id);
          const done = topics.filter((t) => statusOf(t.id) === "mastered").length;
          const Icon = SUBJECT_ICONS[sub.icon];
          return (
            <article key={sub.id} className={`subject-card subject-${sub.tone}`} data-testid={`subject-${sub.id}`}>
              <header>
                <span className="subject-ico"><Icon size={26} strokeWidth={2.4} aria-hidden="true" /></span>
                <div><h3>{sub.name}</h3><p>{sub.tagline}</p></div>
                <span className="subject-count">{done}/{topics.length}</span>
              </header>
              <ul>
                {topics.map((t) => {
                  const st = statusOf(t.id);
                  return (
                    <li key={t.id}>
                      <span className="topic-emoji" aria-hidden="true">{t.emoji}</span>
                      <span className="topic-name"><strong>{t.title}</strong><small>{st === "mastered" ? "¡Dominado!" : st === "started" ? "En curso" : t.blurb}</small></span>
                      <button className={`btn btn-sm ${st === "new" ? "btn-primary" : "btn-secondary"}`} onClick={() => onStartTopic(t.id)} aria-label={`${st === "mastered" ? "Repetir" : "Empezar"} ${t.title}`} data-testid={`start-${t.id}`}>{st === "mastered" ? "Repetir" : "Empezar"} <ArrowRight size={16} strokeWidth={3} aria-hidden="true" className="ico" /></button>
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>

      </div>
      <aside className="hub-side">
      <h2>Estudiar sin internet</h2>
      <LocalAICard audience="plan" online={online} />
      <h2>Insignias <small>{earned.size}/{Object.keys(BADGES).length}</small></h2>
      <ul className="badge-grid" data-testid="badges">
        {Object.entries(BADGES).map(([code, b]) => {
          const Icon = BADGE_ICONS[b.icon] ?? Star;
          const on = earned.has(code);
          return (
            <li key={code} className={`badge-card ${on ? "on" : "off"}`}>
              <span className="badge-ico">{on ? <Icon size={26} strokeWidth={2.4} aria-hidden="true" /> : <Lock size={22} strokeWidth={2.4} aria-hidden="true" />}</span>
              <strong>{b.name}</strong>
              <small>{b.desc}</small>
              <span className="sr-only">{on ? "Conseguida" : "Bloqueada"}</span>
            </li>
          );
        })}
      </ul>

      <h2>Mis fichas <small>{cards.length}</small></h2>
      {cards.length === 0
        ? <p className="note note-box">Todavía no tienes fichas. ¡Haz que Cero apruebe un examen para conseguir la primera!</p>
        : <ul className="card-list" data-testid="cards">{cards.map((c) => {
            const t = getTopic(c.topicId);
            return (
              <li key={c.id}>
                <details>
                  <summary><span aria-hidden="true">{t?.emoji}</span> <strong>{t?.title ?? c.topicId}</strong> <small>{fmtDate(c.at)} · {c.attempts} {c.attempts === 1 ? "intento" : "intentos"}</small></summary>
                  <blockquote className="own">{c.explanation}</blockquote>
                  <ul className="check">{c.concepts.map((x) => <li key={x}>{x}</li>)}</ul>
                </details>
              </li>
            );
          })}</ul>}

      {recent.length > 0 && (
        <>
          <h2>Última actividad</h2>
          <ul className="recent">
            {recent.map((a, i) => (
              <li key={i}><span className={`dot ${a.passed ? "dot-ok" : "dot-bad"}`} aria-hidden="true" /> {getTopic(a.topicId)?.title}: intento {a.attemptNo} — {a.passed ? "Cero aprobó" : "Cero falló"} <small>{fmtDate(a.at)}{a.ai ? " · con IA" : ""}</small></li>
            ))}
          </ul>
        </>
      )}
      </aside>
      </div>
    </section>
  );
}
