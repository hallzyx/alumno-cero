// Browser-only: a small LLM that runs on the learner's GPU (WebGPU) through WebLLM.
// Used (1) by guests, whose text never leaves the device, and (2) as the offline fallback of paid plans.
// The model is downloaded once (hundreds of MB) after the learner agrees, and cached by the browser.

const MODEL_F16 = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
const MODEL_F32 = "Qwen2.5-1.5B-Instruct-q4f32_1-MLC";
const CONSENT_KEY = "alumno-cero:webgpu-consent";
export const MODEL_SIZE_TEXT = "cerca de 1 GB";

// The model library reads the prompt in chunks of up to 1024 tokens, one GPU submission each. Our analysis
// prompt is ~700 tokens, and at ~300 tokens/s (a laptop RTX) that single chunk runs past Windows' 2 s GPU
// watchdog (TDR): the driver resets the device (DXGI_ERROR_DEVICE_HUNG) and WebLLM dies before answering.
// Small chunks keep every submission well under the limit; the kernels accept any size up to the compiled one.
const PREFILL_CHUNK = 128;

const SERVER = { checked: false, supported: false, f16: false, gpuWhy: "", cached: false, phase: "idle", progress: 0, text: "", modelId: null, consent: false, error: null, lastError: null };
let snap = SERVER;
const subs = new Set();
const set = (patch) => { snap = { ...snap, ...patch }; subs.forEach((f) => f()); };

export const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
export const getSnapshot = () => snap;
export const getServerSnapshot = () => SERVER;

let engine = null;
let loading = null;

/** Detect WebGPU, pick the model that fits the GPU and see if it is already cached. Cheap: downloads nothing. */
export async function probe() {
  if (snap.checked) return snap;
  let supported = false;
  let f16 = false;
  let gpuWhy = "";
  try {
    if (typeof navigator === "undefined" || !navigator.gpu) {
      gpuWhy = typeof window !== "undefined" && !window.isSecureContext
        ? "la página no está en un contexto seguro (usa localhost o https)"
        : "el navegador no expone navigator.gpu (WebGPU está desactivado o no disponible)";
    } else {
      // Some browsers (Brave, laptops with two GPUs) only hand out an adapter for a specific power preference.
      for (const opts of [undefined, { powerPreference: "high-performance" }, { powerPreference: "low-power" }]) {
        const adapter = await navigator.gpu.requestAdapter(opts).catch(() => null);
        if (adapter) { supported = true; f16 = adapter.features.has("shader-f16"); break; }
      }
      if (!supported) gpuWhy = "WebGPU existe pero el navegador no encontró ninguna GPU compatible (revisa los drivers y la aceleración por hardware)";
    }
  } catch (e) { gpuWhy = String(e?.message ?? e).slice(0, 160); }
  const modelId = f16 ? MODEL_F16 : MODEL_F32;
  let cached = false;
  if (supported) {
    try { cached = await (await import("@mlc-ai/web-llm")).hasModelInCache(modelId); } catch { /* unknown */ }
  }
  let consent = false;
  try { consent = localStorage.getItem(CONSENT_KEY) === "1"; } catch { /* private mode */ }
  set({ checked: true, supported, f16, gpuWhy, modelId, cached, consent, phase: cached ? "cached" : "idle" });
  return snap;
}

export function giveConsent() {
  try { localStorage.setItem(CONSENT_KEY, "1"); } catch { /* ignore */ }
  set({ consent: true });
}

/** Load (downloading first if needed) the model into the GPU. Resolves with the engine. */
export function loadEngine() {
  if (engine) return Promise.resolve(engine);
  if (loading) return loading;
  loading = (async () => {
    const info = await probe();
    if (!info.supported) throw new Error("Este navegador no tiene WebGPU.");
    set({ phase: info.cached ? "loading" : "downloading", progress: 0, text: "", error: null });
    try {
      const web = await import("@mlc-ai/web-llm");
      engine = await web.CreateMLCEngine(info.modelId, {
        initProgressCallback: (r) => set({ progress: r.progress ?? 0, text: r.text ?? "" }),
      });
      // WebLLM has no option for this (the chunk size comes from the compiled library), so set it on the pipeline.
      for (const p of engine.loadedModelIdToPipeline?.values?.() ?? []) {
        if (Number.isInteger(p?.prefillChunkSize) && p.prefillChunkSize > PREFILL_CHUNK) p.prefillChunkSize = PREFILL_CHUNK;
      }
      set({ phase: "ready", cached: true, progress: 1 });
      return engine;
    } catch (e) {
      set({ phase: "error", error: e?.message ?? "No se pudo cargar la IA del navegador." });
      throw e;
    } finally {
      loading = null;
    }
  })();
  return loading;
}

/**
 * One JSON answer from the local model. `grammar` (EBNF) or `schema` (a JSON Schema object) constrains the
 * output so even a small model returns valid JSON; the caller still validates every field.
 * Resolves with { content, finish }: finish is "stop", "length" (hit max_tokens) or "abort" (timed out).
 */
export async function chatJson(messages, { grammar, schema, max_tokens = 900, timeoutMs = 120_000 } = {}) {
  const e = await loadEngine();
  set({ phase: "thinking", lastError: null });
  const timer = setTimeout(() => { try { e.interruptGenerate(); } catch { /* ignore */ } }, timeoutMs);
  try {
    const res = await e.chat.completions.create({
      messages,
      temperature: 0,
      max_tokens,
      response_format: grammar ? { type: "grammar", grammar } : schema ? { type: "json_object", schema: JSON.stringify(schema) } : { type: "json_object" },
    });
    set({ phase: "ready" });
    const choice = res.choices?.[0];
    return { content: choice?.message?.content ?? "", finish: choice?.finish_reason ?? "stop" };
  } catch (err) {
    // A lost GPU device leaves a dead engine: drop it and re-detect WebGPU on the next try.
    console.warn("[webgpu] la IA del navegador falló:", err);
    engine = null;
    set({ phase: "error", lastError: explain(err), checked: false });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** A lost GPU shows up as a cryptic binding error from the half-disposed engine: say what really happened. */
function explain(err) {
  const msg = String(err?.message ?? err);
  if (/device (was )?lost|deleted object|already been disposed|DXGI/i.test(msg)) return "la GPU se reinició a mitad de la lectura";
  return msg.slice(0, 200);
}

/** The model answered but its output could not be verified (kept to explain the fallback to the learner). */
export function reportUnverified(reason = "su respuesta no pasó la verificación de citas") {
  set({ lastError: reason, phase: snap.phase === "error" ? "ready" : snap.phase });
}
