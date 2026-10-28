"use client";
// "Mi plan" (/planes): choose or change the plan. The payment is a simulation.
//  - Signed-in account: pick a plan, confirm the simulated checkout, the plan is saved in the account.
//  - Guest: pick a plan and go on to create the account with it.
import { useState } from "react";
import { PLAN_LIST, planOf } from "@/lib/plans";
import { CeroSays } from "./Cero";
import { DemoTag, MockCheckout, PlanCard, PlanTable } from "./PlanCards";

export default function PlansScreen({ account, forced = false, onPlanSet, onSignup, onBack }) {
  const current = account?.plan ?? null;
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function confirm() {
    if (!picked || busy) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: picked }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "No pude cambiar tu plan.");
      await onPlanSet(picked);
    } catch (e) {
      setError(e.message === "Failed to fetch" ? "No hay conexión. Cambiar de plan necesita internet." : e.message);
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="h-plans-screen" data-testid="plans-screen">
      <CeroSays mood="curioso">{account ? (forced ? "Para seguir, elige el plan de tu cuenta." : "Aquí puedes ver o cambiar tu plan.") : "Elige un plan y crea tu cuenta."}</CeroSays>
      <h1 id="h-plans-screen">{account ? "Mi plan" : "Planes"} <DemoTag /></h1>
      <p className="lead">{forced
        ? "Tu cuenta todavía no tiene un plan. Elígelo para hablarle a Cero con tu voz y guardar tu avance en tu cuenta."
        : "Los planes incluyen hablarle a Cero con tu voz, una lectura más precisa y tu progreso guardado en tu cuenta. Es una demostración: no se cobra nada."}</p>
      {current && <p className="note note-box">Tu plan actual: <strong>{planOf(current)?.name}</strong>.</p>}
      <div className="plan-grid plan-grid-3">
        {PLAN_LIST.map((p) => (
          <PlanCard key={p.id} plan={p} current={p.id === current} selected={p.id === picked} onChoose={(id) => (account ? setPicked(id) : onSignup(id))} ctaLabel={account ? `Elegir ${p.name}` : `Crear cuenta con ${p.name}`} />
        ))}
      </div>
      {account && picked && (
        <>
          <h2>Confirma tu elección</h2>
          <MockCheckout plan={picked} onConfirm={confirm} busy={busy} confirmLabel={`Quedarme con ${planOf(picked).name} (simulado)`} />
          {error && <p className="flash flash-error" role="alert">{error}</p>}
        </>
      )}
      <details className="plan-compare">
        <summary>Comparar los planes en una tabla</summary>
        <PlanTable />
      </details>
      {onBack && !forced && <div className="cta-row"><button type="button" className="btn btn-ghost" onClick={onBack}>Volver</button></div>}
    </section>
  );
}
