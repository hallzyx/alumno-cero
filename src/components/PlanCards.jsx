"use client";
// Plan cards (landing pricing, plan chooser) and the simulated checkout.
// Everything here is a DEMO: there is no payment gateway and no card data is ever collected.
import { useState } from "react";
import { ArrowRight, Check, LoaderCircle, School, ShieldCheck, User, Users } from "lucide-react";
import { GUEST, PLAN_LIST, PLANS } from "@/lib/plans";

const ICON = { invitado: User, familia: User, "familia-plus": Users, colegio: School };
const I = ({ as: Icon, size = 22 }) => <Icon size={size} strokeWidth={2.4} aria-hidden="true" focusable="false" className="ico" />;

export function DemoTag({ children = "Precios de demostración" }) {
  return <span className="demo-tag demo-tag-inline">{children}</span>;
}

/** One card. `onChoose` makes the CTA appear; `current` marks the plan the account already has. */
export function PlanCard({ plan, onChoose, ctaLabel, current = false, selected = false, compact = false }) {
  const Icon = ICON[plan.id] ?? User;
  return (
    <article className={`plan-card ${plan.highlight ? "plan-hl" : ""} ${selected ? "plan-selected" : ""} ${plan.id === "invitado" ? "plan-guest" : ""}`} data-testid={`plan-${plan.id}`}>
      {plan.highlight && <span className="plan-ribbon">El más elegido</span>}
      <header>
        <span className="plan-ico"><Icon size={24} strokeWidth={2.4} aria-hidden="true" /></span>
        <div><h3>{plan.name}</h3><p>{plan.tagline}</p></div>
      </header>
      <p className="plan-price"><strong>{plan.priceText}</strong> <small>{plan.priceNote}</small></p>
      {!compact && (
        <ul className="plan-features">
          {plan.features.map((f) => <li key={f}><I as={Check} size={18} /> <span>{f}</span></li>)}
        </ul>
      )}
      {current
        ? <p className="plan-current"><I as={Check} size={18} /> Es tu plan actual</p>
        : onChoose && <button type="button" className={`btn ${plan.highlight || plan.id === "invitado" ? "btn-primary" : "btn-secondary"} btn-block`} onClick={() => onChoose(plan.id)} data-testid={`choose-${plan.id}`}>{ctaLabel ?? `Elegir ${plan.name}`} <I as={ArrowRight} size={18} /></button>}
    </article>
  );
}

const ROWS = [
  ["Escribir tus explicaciones", true, true, true, true],
  ["Dictado por voz", false, true, true, true],
  ["Cero lee dentro de tu aparato (sin mandar nada por internet)", true, true, true, true],
  ["Cero entiende mejor lo que explicas", false, true, true, true],
  ["Progreso guardado en tu cuenta", "Solo en tu aparato", true, true, true],
  ["Funciona sin internet", true, true, true, true],
  ["Varios estudiantes con perfil propio", false, false, "Hasta 4", "Alumnos por aula"],
  ["Aulas y panel docente", false, false, false, true],
];
const cell = (v) => (v === true ? <><Check size={18} strokeWidth={3} aria-hidden="true" /><span className="sr-only">Incluido</span></> : v === false ? <><span aria-hidden="true">—</span><span className="sr-only">No incluido</span></> : v);

export function PlanTable() {
  return (
    <div className="table-wrap plan-table" role="region" aria-label="Comparación de planes" tabIndex={0}>
      <table className="calc">
        <caption className="sr-only">Comparación de planes</caption>
        <thead>
          <tr><th scope="col">Qué incluye</th><th scope="col">Invitado</th><th scope="col">Familia</th><th scope="col">Familia+</th><th scope="col">Colegios</th></tr>
        </thead>
        <tbody>
          {ROWS.map(([label, ...vals]) => <tr key={label}><th scope="row">{label}</th>{vals.map((v, i) => <td key={i}>{cell(v)}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

/** Landing pricing section. */
export function Pricing({ onGuest, onChoose }) {
  return (
    <section className="lp-section" id="planes" aria-labelledby="h-plans" data-testid="pricing">
      <h2 id="h-plans" className="lp-h2">Planes <DemoTag /></h2>
      <p className="lead">Prueba gratis como invitado. Si quieres guardar tu progreso en tu cuenta, estudiar con varios hijos o llevarlo al aula, elige un plan. <strong>Es una vista de demostración: no hay cobro real.</strong></p>
      <div className="plan-grid">
        <PlanCard plan={GUEST} ctaLabel="Probar ahora" onChoose={() => onGuest()} />
        {PLAN_LIST.map((p) => <PlanCard key={p.id} plan={p} onChoose={onChoose} ctaLabel={p.id === "colegio" ? "Solicitar demo" : undefined} />)}
      </div>
      <details className="plan-compare">
        <summary>Comparar los planes en una tabla</summary>
        <PlanTable />
      </details>
      <p className="note">Por qué hay planes: el cerebro grande de Cero, el que vive en internet, cuesta dinero cada vez que se usa, así que va incluido en los planes. Como invitado, Cero lee dentro de tu propio aparato, y aprender sigue siendo posible aunque no tengas internet.</p>
    </section>
  );
}

/** Simulated checkout. `onConfirm` runs only after the learner ticks that they understand it is a simulation. */
export function MockCheckout({ plan, onConfirm, busy = false, confirmLabel = "Confirmar plan (simulado)", ack, onAck, error, children }) {
  const [own, setOwn] = useState(false);
  const ok = ack ?? own; // controlled when the parent form needs to validate it
  const setOk = onAck ?? setOwn;
  const p = PLANS[plan];
  if (!p) return null;
  return (
    <div className="checkout" data-testid="checkout">
      <p className="checkout-head"><ShieldCheck size={20} strokeWidth={2.4} aria-hidden="true" /> Resumen del plan <DemoTag>Simulación</DemoTag></p>
      <dl className="checkout-lines">
        <div><dt>Plan</dt><dd>{p.name} · {p.tagline}</dd></div>
        <div><dt>Precio</dt><dd>{p.priceText} <small>{p.priceNote}</small></dd></div>
        <div><dt>Hoy pagas</dt><dd><strong>$ 0 COP</strong> <small>(demostración)</small></dd></div>
      </dl>
      <label className="keep-box">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} data-testid="checkout-ack" />
        <span>Entiendo que esto es una <strong>simulación</strong>: no se cobra nada y no se piden datos de tarjeta.</span>
      </label>
      {error && <p className="field-error" id="err-ack" data-testid="checkout-error">{error}</p>}
      {children}
      {onConfirm && (
        <button type="button" className="btn btn-primary btn-lg" disabled={!ok || busy} onClick={onConfirm} data-testid="checkout-confirm">
          {busy ? <>Un momento… <LoaderCircle size={22} strokeWidth={2.6} aria-hidden="true" className="ico spin-ico" /></> : <>{confirmLabel} <ArrowRight size={22} strokeWidth={2.6} aria-hidden="true" className="ico" /></>}
        </button>
      )}
    </div>
  );
}
