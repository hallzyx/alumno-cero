// Subjects: each one changes how the teaching step feels and which resources the learner gets.
// "steps" (math): procedures. Cero is a robot: skip a step and it gets lost.
// "concepts" (theory): causes and relations. Cero needs the "because" and the "if…then".

export const SUBJECTS = {
  matematica: {
    id: "matematica",
    name: "Matemática",
    icon: "Calculator",
    tone: "blue",
    mode: "steps",
    tagline: "Pasos, números y trucos",
    teach: {
      title: "Enséñale el procedimiento, paso a paso",
      help: "Cero es como una calculadora que no sabe qué botón apretar. Dile qué haces primero, después y por qué, y usa un ejemplo con números.",
      starters: [
        { label: "Primero…", text: "Primero " },
        { label: "Después…", text: "Después " },
        { label: "Por ejemplo, con números…", text: "Por ejemplo, con números: " },
        { label: "Por eso el resultado es…", text: "Por eso el resultado es " },
      ],
      example: "Un buen paso a paso: «Primero hago…, después…, y por eso obtengo…».",
    },
    exam: { intro: "Mira cómo Cero hace las cuentas, línea por línea, con lo que le enseñaste." },
  },
  ciencias: {
    id: "ciencias",
    name: "Ciencias",
    icon: "FlaskConical",
    tone: "green",
    mode: "concepts",
    tagline: "Causas, procesos y porqués",
    teach: {
      title: "Explícale cómo funciona y por qué pasa",
      help: "Cero no sabe nada del tema. Cuéntale qué entra, qué cambia y qué sale, y usa «porque» y «entonces». Una comparación («es como…») ayuda mucho.",
      starters: [
        { label: "Esto pasa porque…", text: "Esto pasa porque " },
        { label: "Si falta…, entonces…", text: "Si falta , entonces " },
        { label: "Es como…", text: "Es como " },
        { label: "Al final se obtiene…", text: "Al final se obtiene " },
      ],
      example: "Una buena explicación tiene causas: «pasa X porque Y; si no hay Y, entonces…».",
    },
    exam: { intro: "Mira cómo razona Cero, idea por idea, usando solo tu explicación." },
  },
};

export const subjectOf = (topic) => SUBJECTS[topic?.subject] ?? SUBJECTS.ciencias;
