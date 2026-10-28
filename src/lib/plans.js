// Plans (shared by server and client). Prices are DEMO prices: there is no payment gateway.
// Who gets what:
//  - Invitado (no account): text input only, AI runs in the browser (WebGPU), progress stays on the device.
//  - Familia / Familia+ / Colegios: cloud AI (OpenRouter), voice dictation, progress synced to the database,
//    offline use with the in-browser AI as fallback.

export const GUEST = {
  id: "invitado",
  name: "Invitado",
  tagline: "Sin cuenta, para probar y practicar",
  priceText: "Gratis",
  priceNote: "para siempre",
  features: [
    "Escribir tus explicaciones (sin voz)",
    "Cero lee dentro de tu aparato: lo que escribes no sale de aquí",
    "Funciona sin internet una vez cargada",
    "Tu progreso se guarda solo en tu aparato",
  ],
};

export const PLANS = {
  familia: {
    id: "familia",
    name: "Familia",
    tagline: "Para tu hijo o hija",
    price: 19900,
    priceText: "$ 19.900 COP",
    priceNote: "al mes (precio de demostración)",
    maxChildren: 0,
    maxClassrooms: 0,
    cloudAI: true,
    voice: true,
    features: [
      "1 estudiante con su propio hub, nivel e insignias",
      "Cero entiende mejor lo que explicas y arma exámenes más justos",
      "Háblale a Cero con tu voz",
      "Tu progreso queda guardado en tu cuenta",
      "Sin internet sigues estudiando, y tu avance se guarda al volver",
    ],
  },
  "familia-plus": {
    id: "familia-plus",
    name: "Familia+",
    tagline: "Si tienes varios hijos",
    price: 39900,
    priceText: "$ 39.900 COP",
    priceNote: "al mes (precio de demostración)",
    maxChildren: 3,
    maxClassrooms: 0,
    cloudAI: true,
    voice: true,
    highlight: true,
    features: [
      "Hasta 4 estudiantes con perfiles separados",
      "Panel familiar para ver el avance de cada hijo",
      "Todo lo del plan Familia",
      "Cambia de perfil en un toque",
    ],
  },
  colegio: {
    id: "colegio",
    name: "Colegios",
    tagline: "Para aulas y escuelas",
    price: null,
    priceText: "A medida",
    priceNote: "por alumno, con demo gratuita (simulado)",
    maxChildren: 400,
    maxClassrooms: 12,
    cloudAI: true,
    voice: true,
    features: [
      "Aulas con alumnos y código de aula",
      "Panel docente: nivel, fichas y temas de cada alumno",
      "Todo lo del plan Familia para cada alumno",
      "Pensado para laboratorios con poca conexión",
    ],
  },
};

export const PLAN_LIST = [PLANS.familia, PLANS["familia-plus"], PLANS.colegio];
export const isPlan = (id) => Object.prototype.hasOwnProperty.call(PLANS, id);
export const planOf = (id) => (isPlan(id) ? PLANS[id] : null);

/** What the interface should offer for a plan id (null/undefined = guest). */
export function capabilities(planId) {
  const p = planOf(planId);
  return {
    plan: p?.id ?? null,
    cloudAI: Boolean(p?.cloudAI),
    voice: Boolean(p?.voice),
    family: planId === "familia-plus",
    classrooms: planId === "colegio",
    maxChildren: p?.maxChildren ?? 0,
  };
}
