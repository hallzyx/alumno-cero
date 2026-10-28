"use client";
// "El cerebro de Cero en tu aparato": explains what will be downloaded and why, lets the learner accept or refuse,
// and shows the REAL download progress. Used for guests (their text never leaves the device)
// and by paid plans to prepare the offline fallback. Copy is written for kids: no model/GPU/WebGPU jargon.
import { useEffect, useSyncExternalStore } from "react";
import { Cpu, Download, LoaderCircle, ShieldCheck, TriangleAlert } from "lucide-react";
import { MODEL_SIZE_TEXT, getServerSnapshot, getSnapshot, giveConsent, loadEngine, probe, subscribe } from "@/lib/webllm";

export function useLocalAI() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => { probe(); }, []);
  return snap;
}

export default function LocalAICard({ audience = "guest", declined = false, onDecline, online = true }) {
  const ai = useLocalAI();
  const busy = ai.phase === "downloading" || ai.phase === "loading";
  const ready = ai.cached || ai.phase === "ready";
  const pct = Math.round((ai.progress ?? 0) * 100);

  async function download() {
    giveConsent();
    try { await loadEngine(); } catch { /* the error is shown from the store */ }
  }

  return (
    <aside className={`localai ${ready ? "is-ready" : ""}`} data-testid="local-ai" aria-label="El cerebro de Cero en tu aparato">
      <p className="localai-head"><Cpu size={20} strokeWidth={2.4} aria-hidden="true" /> El cerebro de Cero en tu aparato</p>

      {!ai.checked && <p className="note">Viendo si tu aparato puede darle un cerebro a Cero…</p>}

      {ai.checked && !ai.supported && (
        <>
          <p className="note"><TriangleAlert size={18} strokeWidth={2.4} aria-hidden="true" className="ico" /> Este navegador no puede darle a Cero su cerebro propio, así que Cero te leerá con las <strong>reglas del tema</strong>. También funciona sin internet. Para probarlo, abre la app con Chrome o Edge actualizados en un computador con tarjeta de video.</p>
          {ai.gpuWhy && <p className="note small-print" data-testid="local-ai-why">Para tus papás o profe: {ai.gpuWhy}.</p>}
        </>
      )}

      {ai.checked && ai.supported && ready && (
        <p className="note" data-testid="local-ai-ready"><ShieldCheck size={18} strokeWidth={2.4} aria-hidden="true" className="ico" /> <strong>¡Listo!</strong> Cero lee con un cerebro que vive en tu aparato: lo que escribes no sale de aquí y funciona sin internet.</p>
      )}

      {ai.checked && ai.supported && !ready && !busy && !declined && (
        <>
          <p>{audience === "guest"
            ? "Para que Cero lea lo que explicas sin mandar nada por internet, tu aparato bajará una vez un archivo grande: el cerebro de Cero."
            : "Prepárate para estudiar sin internet: baja ahora el cerebro de Cero y seguirá leyéndote aunque se corte la conexión."}</p>
          <ul className="localai-facts">
            <li>Se baja <strong>una sola vez</strong> ({MODEL_SIZE_TEXT}) y queda guardado en tu navegador.</li>
            <li>Hace trabajar fuerte a tu aparato y gasta batería. Si usas datos del celular, mejor bájalo con wifi.</li>
            <li>Es más pequeño que el cerebro que vive en internet, así que Cero puede equivocarse más al leer. Siempre revisamos que las frases marcadas sean tuyas.</li>
          </ul>
          <div className="cta-row">
            <button type="button" className="btn btn-primary" onClick={download} disabled={!online} data-testid="local-ai-download"><Download size={20} strokeWidth={2.4} aria-hidden="true" className="ico" /> Bajar el cerebro de Cero ({MODEL_SIZE_TEXT})</button>
            {onDecline && <button type="button" className="btn btn-ghost" onClick={onDecline} data-testid="local-ai-decline">Usar la lectura sencilla</button>}
          </div>
          {!online && <p className="note">Ahora no tienes internet, y para bajarlo lo necesitas.</p>}
        </>
      )}

      {ai.checked && ai.supported && !ready && !busy && declined && (
        <p className="note">Elegiste la lectura sencilla: Cero te leerá con las reglas del tema. <button type="button" className="linkish" onClick={download} disabled={!online}>Bajar el cerebro de Cero igualmente</button></p>
      )}

      {busy && (
        <div role="status" aria-live="polite" data-testid="local-ai-progress">
          <p className="note"><LoaderCircle size={18} strokeWidth={2.6} aria-hidden="true" className="ico spin-ico" /> {ai.phase === "downloading" ? `Bajando el cerebro de Cero… ${pct}%` : "Despertando a Cero…"}</p>
          <div className="wordmeter" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
        </div>
      )}

      {ai.phase === "error" && ai.error && <p className="flash flash-error" role="alert" title={ai.error}>No pude preparar el cerebro de Cero en tu aparato. Cero te leerá con las reglas del tema.</p>}
      {ai.lastError && <p className="note note-box" data-testid="local-ai-lasterror" title={ai.lastError}>La última vez Cero no pudo leer con su cerebro y usó las reglas del tema. Puedes intentarlo de nuevo.</p>}
    </aside>
  );
}
