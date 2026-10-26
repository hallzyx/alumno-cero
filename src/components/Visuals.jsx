"use client";
// Interactive visuals for the "mochila": math gets simulators, science gets diagrams you can poke.
import { useState } from "react";

const money = (n) => `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Slider({ label, value, min, max, step = 1, onChange, unit = "" }) {
  const id = `sl-${label.replace(/\W/g, "")}`;
  return (
    <label className="vz-slider" htmlFor={id}>
      <span>{label}: <strong>{value}{unit}</strong></span>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

/* ------------------------------ MATH SIMULATORS ----------------------------- */

function Growth() {
  const [cap, setCap] = useState(1000);
  const [rate, setRate] = useState(10);
  const [years, setYears] = useState(5);
  const rows = Array.from({ length: years }, (_, i) => {
    const y = i + 1;
    return { y, simple: cap * (1 + (rate / 100) * y), compound: cap * (1 + rate / 100) ** y };
  });
  const max = rows[rows.length - 1].compound;
  const last = rows[rows.length - 1];
  const W = 320, H = 150, bw = Math.min(22, (W - 20) / years / 2.4);
  return (
    <div className="vz">
      <div className="vz-controls">
        <Slider label="Capital" value={cap} min={100} max={5000} step={100} onChange={setCap} unit=" S/" />
        <Slider label="Tasa anual" value={rate} min={1} max={30} onChange={setRate} unit="%" />
        <Slider label="Años" value={years} min={1} max={10} onChange={setYears} />
      </div>
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="vz-svg" role="img" aria-label={`Comparación entre interés simple y compuesto durante ${years} años`}>
        {rows.map((r, i) => {
          const x = 14 + i * ((W - 28) / years);
          const hs = (r.simple / max) * H;
          const hc = (r.compound / max) * H;
          return (
            <g key={r.y}>
              <rect x={x} y={H - hs} width={bw} height={hs} className="vz-bar-a" rx="3" />
              <rect x={x + bw + 2} y={H - hc} width={bw} height={hc} className="vz-bar-b" rx="3" />
              <text x={x + bw} y={H + 15} textAnchor="middle" className="vz-axis">{r.y}</text>
            </g>
          );
        })}
      </svg>
      <p className="vz-legend"><span className="dot dot-a" /> Siempre sobre el capital inicial: <strong>{money(last.simple)}</strong></p>
      <p className="vz-legend"><span className="dot dot-b" /> Sobre el saldo acumulado (compuesto): <strong>{money(last.compound)}</strong></p>
      <p className="vz-result">Diferencia tras {years} años: <strong>{money(last.compound - last.simple)}</strong> más gracias al «interés sobre interés».</p>
    </div>
  );
}

function Discounts() {
  const [price, setPrice] = useState(200);
  const [d1, setD1] = useState(30);
  const [d2, setD2] = useState(20);
  const after1 = price * (1 - d1 / 100);
  const after2 = after1 * (1 - d2 / 100);
  const summed = price * (1 - Math.min(100, d1 + d2) / 100);
  const bars = [
    { label: "Precio original", v: price, cls: "vz-fill-ink" },
    { label: `Con ${d1}% de descuento`, v: after1, cls: "vz-fill-blue" },
    { label: `Luego ${d2}% sobre eso`, v: after2, cls: "vz-fill-green" },
    { label: `Si fuera ${Math.min(100, d1 + d2)}% de golpe`, v: summed, cls: "vz-fill-red" },
  ];
  return (
    <div className="vz">
      <div className="vz-controls">
        <Slider label="Precio" value={price} min={50} max={500} step={10} onChange={setPrice} unit=" S/" />
        <Slider label="Primer descuento" value={d1} min={5} max={60} step={5} onChange={setD1} unit="%" />
        <Slider label="Segundo descuento" value={d2} min={5} max={60} step={5} onChange={setD2} unit="%" />
      </div>
      <ul className="vz-bars">
        {bars.map((b) => (
          <li key={b.label}>
            <span className="vz-bar-label">{b.label}</span>
            <span className="vz-track"><span className={`vz-fill ${b.cls}`} style={{ width: `${Math.max(2, (b.v / price) * 100)}%` }} /></span>
            <strong>{money(b.v)}</strong>
          </li>
        ))}
      </ul>
      <p className="vz-result">Pagas {money(after2)}, no {money(summed)}: el segundo descuento se calcula sobre un precio <strong>ya rebajado</strong>.</p>
    </div>
  );
}

function Proportion() {
  const [unit, setUnit] = useState(4);
  const [q1, setQ1] = useState(3);
  const [q2, setQ2] = useState(7);
  const total = unit * q1;
  return (
    <div className="vz">
      <div className="vz-controls">
        <Slider label="Cantidad conocida" value={q1} min={2} max={8} onChange={(v) => { setQ1(v); if (q2 <= v) setQ2(v + 1); }} />
        <Slider label="Precio de cada uno" value={unit} min={1} max={10} onChange={setUnit} unit=" S/" />
        <Slider label="Cantidad que piden" value={q2} min={q1 + 1} max={12} onChange={setQ2} />
      </div>
      <p className="vz-step"><strong>1.</strong> {q1} cuestan {money(total)} → dividimos: {money(total)} ÷ {q1} = <strong>{money(unit)}</strong> cada uno</p>
      <div className="vz-blocks" aria-hidden="true">{Array.from({ length: q1 }, (_, i) => <span key={i} className="vz-block">{unit}</span>)}</div>
      <p className="vz-step"><strong>2.</strong> Multiplicamos por {q2}: {money(unit)} × {q2} = <strong>{money(unit * q2)}</strong></p>
      <div className="vz-blocks" aria-hidden="true">{Array.from({ length: q2 }, (_, i) => <span key={i} className={`vz-block ${i >= q1 ? "new" : ""}`}>{unit}</span>)}</div>
      <p className="vz-result">¡{q2 - q1} más no cuestan {q2 - q1} soles más! Cada uno suma {money(unit)}.</p>
    </div>
  );
}

/* ----------------------------- SCIENCE DIAGRAMS ----------------------------- */

function Photosynthesis() {
  const [on, setOn] = useState({ light: true, water: true, co2: true });
  const toggle = (k) => setOn((s) => ({ ...s, [k]: !s[k] }));
  const all = on.light && on.water && on.co2;
  const missing = [!on.light && "la luz", !on.water && "el agua", !on.co2 && "el CO₂"].filter(Boolean);
  const inputs = [
    { k: "light", label: "☀️ Luz" },
    { k: "water", label: "💧 Agua" },
    { k: "co2", label: "☁️ CO₂" },
  ];
  return (
    <div className="vz">
      <p className="vz-hint">Toca para quitar un ingrediente y mira qué pasa:</p>
      <div className="vz-toggles" role="group" aria-label="Ingredientes de la fotosíntesis">
        {inputs.map((i) => (
          <button key={i.k} type="button" className={`vz-chip ${on[i.k] ? "on" : "off"}`} aria-pressed={on[i.k]} onClick={() => toggle(i.k)}>{i.label}{on[i.k] ? "" : " (quitado)"}</button>
        ))}
      </div>
      <svg viewBox="0 0 320 170" className="vz-svg" role="img" aria-label="Diagrama de la fotosíntesis">
        <circle cx="38" cy="34" r="20" className="vz-sun" opacity={on.light ? 1 : 0.2} />
        <path d="M64 40 L112 78" className="vz-arrow" opacity={on.light ? 1 : 0.15} />
        <path d="M30 150 q40 -10 80 -34" className="vz-arrow" opacity={on.water ? 1 : 0.15} />
        <path d="M290 30 q-40 6 -80 42" className="vz-arrow" opacity={on.co2 ? 1 : 0.15} />
        <path d="M160 150 L160 90" className="vz-stem" />
        <path d="M160 100 q-46 -6 -50 -46 q42 4 50 46z" className="vz-leaf" />
        <path d="M160 92 q46 -6 52 -46 q-44 4 -52 46z" className="vz-leaf" />
        <text x="160" y="164" textAnchor="middle" className="vz-axis">raíz → agua · hojas → luz y CO₂</text>
        <text x="286" y="110" textAnchor="end" className={`vz-out ${all ? "" : "dim"}`}>🍬 glucosa</text>
        <text x="286" y="132" textAnchor="end" className={`vz-out ${all ? "" : "dim"}`}>🫧 oxígeno</text>
      </svg>
      <p className={`vz-result ${all ? "good" : "bad"}`}>
        {all ? "¡Entran luz, agua y CO₂ → sale glucosa (alimento) y oxígeno!" : `Sin ${missing.join(" ni ")} no se fabrica glucosa nueva: falta un ingrediente.`}
      </p>
    </div>
  );
}

const WATER_STAGES = [
  { id: "evap", name: "1. Evaporación", text: "El sol calienta el agua del mar, los ríos y los charcos. El agua se evapora y sube al aire como vapor. ¡No desaparece!" },
  { id: "cond", name: "2. Condensación", text: "Arriba hace frío: el vapor se enfría y se condensa en gotitas diminutas. Millones de gotitas juntas forman una nube." },
  { id: "precip", name: "3. Precipitación", text: "Cuando las gotas se juntan y pesan demasiado, caen como lluvia o nieve. El agua vuelve a la tierra y al mar… y el ciclo se repite." },
];

function WaterCycle() {
  const [stage, setStage] = useState(0);
  const s = WATER_STAGES[stage];
  const lit = (id) => (s.id === id ? 1 : 0.25);
  return (
    <div className="vz">
      <div className="vz-toggles" role="group" aria-label="Etapas del ciclo del agua">
        {WATER_STAGES.map((w, i) => (
          <button key={w.id} type="button" className={`vz-chip ${i === stage ? "on" : ""}`} aria-pressed={i === stage} onClick={() => setStage(i)}>{w.name}</button>
        ))}
      </div>
      <svg viewBox="0 0 320 170" className="vz-svg" role="img" aria-label={`Ciclo del agua: ${s.name}`}>
        <circle cx="40" cy="30" r="18" className="vz-sun" />
        <path d="M20 150 q70 -16 150 0 t140 0 V170 H20z" className="vz-sea" />
        <g opacity={lit("evap")}>
          <path d="M70 128 v-48" className="vz-arrow" /><path d="M100 128 v-60" className="vz-arrow" /><path d="M130 128 v-48" className="vz-arrow" />
          <text x="100" y="150" textAnchor="middle" className="vz-axis">vapor ↑</text>
        </g>
        <g opacity={lit("cond")}>
          <ellipse cx="210" cy="42" rx="42" ry="18" className="vz-cloud" /><ellipse cx="180" cy="50" rx="26" ry="14" className="vz-cloud" /><ellipse cx="240" cy="52" rx="26" ry="14" className="vz-cloud" />
        </g>
        <g opacity={lit("precip")}>
          <path d="M190 78 l-6 18 M210 78 l-6 18 M230 78 l-6 18 M200 100 l-6 18 M220 100 l-6 18" className="vz-rain" />
        </g>
      </svg>
      <p className="vz-result"><strong>{s.name.slice(3)}:</strong> {s.text}</p>
    </div>
  );
}

export const VISUALS = { growth: Growth, discounts: Discounts, proportion: Proportion, photosynthesis: Photosynthesis, watercycle: WaterCycle };
