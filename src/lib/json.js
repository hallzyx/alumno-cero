/** Extract the first JSON object from a model reply (tolerates code fences / chatter). Shared by server and browser. */
export function parseJson(text) {
  const raw = String(text ?? "").replace(/```(?:json)?/gi, "");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(raw.slice(start, end + 1)); } catch { return null; }
}

/**
 * Every complete JSON object nested inside a reply, innermost first, even if the reply itself is cut off
 * (a small model that hits max_tokens mid-answer still leaves its finished items usable).
 */
export function parseJsonObjects(text) {
  const raw = String(text ?? "");
  const out = [];
  const opens = [];
  let inStr = false;
  let esc = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === "{") opens.push(i);
    else if (ch === "}" && opens.length) {
      const start = opens.pop();
      try { out.push(JSON.parse(raw.slice(start, i + 1))); } catch { /* not a full object */ }
    }
  }
  return out;
}
