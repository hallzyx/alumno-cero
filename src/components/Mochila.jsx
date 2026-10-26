"use client";
// "Mi mochila": preconfigured resources for the current topic. Tabs adapt to the subject.
import { useState } from "react";
import { BookOpen, Calculator, FlaskConical, Lightbulb, ListChecks, Plus } from "lucide-react";
import { RESOURCES } from "@/lib/resources";
import { subjectOf } from "@/lib/subjects";
import { VISUALS } from "./Visuals";

export default function Mochila({ topic, onInsert }) {
  const res = RESOURCES[topic.id];
  const subject = subjectOf(topic);
  const [tab, setTab] = useState(null);
  if (!res) return null;
  const Visual = VISUALS[res.visual];
  const isMath = subject.mode === "steps";
  const tabs = [
    { id: "visual", label: isMath ? "Simulador" : "Diagrama", icon: isMath ? Calculator : FlaskConical },
    { id: "example", label: "Ejemplo resuelto", icon: ListChecks },
    { id: "glossary", label: "Glosario", icon: BookOpen },
    { id: "trick", label: "Truco", icon: Lightbulb },
  ];
  return (
    <section className={`mochila mochila-${subject.tone}`} aria-label="Mi mochila de recursos" data-testid="mochila">
      <h2 className="mochila-title">🎒 Mi mochila <small>{subject.name}</small></h2>
      <div className="mochila-tabs" role="tablist" aria-label="Recursos">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls="mochila-panel" className={`mochila-tab ${tab === t.id ? "on" : ""}`} onClick={() => setTab(tab === t.id ? null : t.id)}>
            <t.icon size={18} strokeWidth={2.4} aria-hidden="true" /> {t.label}
          </button>
        ))}
      </div>
      {tab && (
        <div className="mochila-panel" id="mochila-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === "visual" && <Visual />}
          {tab === "example" && (
            <div>
              <p className="mochila-h">{res.example.title}</p>
              <ol className="mochila-steps">{res.example.steps.map((s) => <li key={s}>{s}</li>)}</ol>
            </div>
          )}
          {tab === "glossary" && (
            <dl className="mochila-gloss">
              {res.glossary.map((g) => (
                <div key={g.term}>
                  <dt>{g.term}</dt>
                  <dd>{g.def} <button type="button" className="mochila-use" onClick={() => onInsert(g.term)} aria-label={`Usar la palabra ${g.term} en mi explicación`}><Plus size={14} strokeWidth={3} aria-hidden="true" /> usar</button></dd>
                </div>
              ))}
            </dl>
          )}
          {tab === "trick" && <p className="mochila-trick">{res.trick}</p>}
        </div>
      )}
    </section>
  );
}
