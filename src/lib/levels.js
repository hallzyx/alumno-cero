// Gamification rules shared by server and client (pure functions, no DB).

/** XP needed to *reach* level n (n >= 1). Level 1 starts at 0. */
export const xpToReach = (n) => 40 * (n - 1) ** 2;

export const TITLES = [
  "Cuaderno nuevo", "Lápiz afilado", "Regla y escuadra", "Mochila llena", "Estudiante estrella",
  "Delegado de aula", "Mente curiosa", "Cerebrito", "Maestro del cole", "Leyenda del colegio",
];

export function levelFor(xp) {
  const total = Math.max(0, Number(xp) || 0);
  let n = 1;
  while (total >= xpToReach(n + 1)) n += 1;
  const from = xpToReach(n);
  const to = xpToReach(n + 1);
  return { n, title: TITLES[Math.min(n, TITLES.length) - 1], xp: total, into: total - from, needed: to - from, next: to, pct: Math.round(((total - from) / (to - from)) * 100) };
}

export const XP = {
  attempt: 10,        // every exam Cero takes
  pass: 30,           // Cero passed
  firstTry: 20,       // passed at the first attempt
  mastered: 50,       // got the mastery card
  practice: 5,        // each right answer in a mini-practice
  daily: 15,          // first activity of the day
};

export const BADGES = {
  "primer-examen": { name: "Primer examen", desc: "Le enseñaste algo a Cero por primera vez.", icon: "Pencil" },
  "aprobe": { name: "¡Aprobé!", desc: "Cero aprobó un examen con tu explicación.", icon: "Trophy" },
  "al-primer-intento": { name: "Al primer intento", desc: "Cero aprobó sin necesitar corregir nada.", icon: "Zap" },
  "primera-ficha": { name: "Primera ficha", desc: "Conseguiste tu primera ficha de dominio.", icon: "BookCheck" },
  "coleccionista": { name: "Coleccionista", desc: "Tienes 3 fichas de dominio.", icon: "Library" },
  "constante": { name: "Constante", desc: "Hiciste 10 exámenes.", icon: "Dumbbell" },
  "racha-3": { name: "Racha de 3 días", desc: "Estudiaste 3 días seguidos.", icon: "Flame" },
  "racha-7": { name: "Racha de 7 días", desc: "Una semana entera sin faltar.", icon: "Flame" },
  "explorador": { name: "Explorador", desc: "Dominaste temas de 2 materias distintas.", icon: "Compass" },
  "estrella": { name: "Estudiante estrella", desc: "Llegaste al nivel 5.", icon: "Star" },
};
