"use client";
// "IA en tu navegador": explains what will be downloaded and why, lets the learner accept or refuse,
// and shows the REAL download progress. Used for guests (their text never leaves the device)
// and by paid plans to prepare the offline fallback.
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
    <aside className={`localai ${ready ? "is-ready" : ""}`} data-testid="local-ai" aria-label="IA en tu navegador">
      <p className="localai-head"><Cpu size={20} strokeWidth={2.4} aria-hidden="true" /> IA en tu navegador <span className="chip">WebGPU</span></p>

      {!ai.checked && <p className="note">Revisando si tu dispositivo puede correr la IA…</p>}

      {ai.checked && !ai.supported && (
        <p className="note"><TriangleAlert size={18} strokeWidth={2.4} aria-hidden="true" className="ico" /> Este navegador no tiene WebGPU, así que Cero leerá tu explicación con su <strong>modo básico</strong> (sin IA), que también funciona sin internet. Para la IA del navegador prueba con Chrome o Edge recientes en un equipo con GPU.{ai.gpuWhy && <> <span data-testid="local-ai-why">Motivo: {ai.gpuWhy}.</span></>}</p>
      )}

      {ai.checked && ai.supported && ready && (
        <p className="note" data-testid="local-ai-ready"><ShieldCheck size={18} strokeWidth={2.4} aria-hidden="true" className="ico" /> <strong>Lista.</strong> Cero te lee con una IA que corre en este dispositivo: tu texto no sale de aquí y funciona sin internet.</p>
      )}

      {ai.checked && ai.supported && !ready && !busy && !declined && (
        <>
          <p>{audience === "guest"
            ? "Para que Cero lea tu explicación con IA sin enviar nada a internet, tu navegador descargará un modelo pequeño."
            : "Prepárate para estudiar sin internet: descarga ahora la IA del navegador y Cero seguirá leyéndote aunque se corte la conexión."}</p>
          <ul className="localai-facts">
            <li>Se descarga <strong>una sola vez</strong> ({MODEL_SIZE_TEXT}) y queda guardada en tu navegador.</li>
            <li>Usa tu GPU y algo de batería mientras trabaja. Con datos móviles, mejor descárgala con wifi.</li>
            <li>Es más pequeña que la IA en la nube: Cero puede equivocarse más al leer. Siempre verificamos sus citas.</li>
          </ul>
          <div className="cta-row">
            <button type="button" className="btn btn-primary" onClick={download} disabled={!online} data-testid="local-ai-download"><Download size={20} strokeWidth={2.4} aria-hidden="true" className="ico" /> Descargar la IA ({MODEL_SIZE_TEXT})</button>
            {onDecline && <button type="button" className="btn btn-ghost" onClick={onDecline} data-testid="local-ai-decline">Usar el modo básico</button>}
          </div>
          {!online && <p className="note">Ahora no tienes conexión: la descarga necesita internet.</p>}
        </>
      )}

      {ai.checked && ai.supported && !ready && !busy && declined && (
        <p className="note">Elegiste el modo básico. Cero te leerá con reglas del tema, sin IA. <button type="button" className="linkish" onClick={download} disabled={!online}>Descargar la IA igualmente</button></p>
      )}

      {busy && (
        <div role="status" aria-live="polite" data-testid="local-ai-progress">
          <p className="note"><LoaderCircle size={18} strokeWidth={2.6} aria-hidden="true" className="ico spin-ico" /> {ai.phase === "downloading" ? `Descargando la IA… ${pct}%` : "Preparando la IA en tu GPU…"}</p>
          <div className="wordmeter" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
          {ai.text && <p className="note small-print">{ai.text}</p>}
        </div>
      )}

      {ai.phase === "error" && ai.error && <p className="flash flash-error" role="alert">No pude cargar la IA del navegador: {ai.error} Cero usará el modo básico.</p>}
      {ai.lastError && <p className="note note-box" data-testid="local-ai-lasterror">La última lectura con la IA del navegador no salió bien ({ai.lastError}), así que Cero usó su modo básico. Puedes intentarlo de nuevo.</p>}
    </aside>
  );
}
