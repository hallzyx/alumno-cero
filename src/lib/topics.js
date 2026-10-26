// Alumno Cero — curated topics.
// Each topic = concepts (with detection patterns and known misconceptions),
// transfer-exam variants in NEW contexts, a solver that uses only the concepts
// the learner taught, targeted micro-practice, and a model explanation used by
// the test-suite (and offered as a last resort after repeated failures).

import { formatMoney } from "./engine.js";
import { rule, water } from "./topics-extra.js";

const fmt = formatMoney;

/* -------------------------------------------------------------------------- */
/* 1. Interés compuesto                                                       */
/* -------------------------------------------------------------------------- */

function solveCompound(v, st) {
  const rateKnown = st.rate === "known";
  const baseKnown = st.base === "known";
  const repeatKnown = st.repeat === "known";
  const yearsApplied = repeatKnown ? v.years : 1;

  const steps = [
    rateKnown
      ? { conceptId: "rate", ok: true, source: "user", text: `Tasa ${v.rate * 100}% anual: por cada S/ 100 gano S/ ${v.rate * 100} en un año (eso me enseñaste).` }
      : { conceptId: "rate", ok: false, source: "guess", text: `Nadie me explicó qué significa «${v.rate * 100}%». Lo leo como S/ ${v.rate * 100} fijos por año.` },
    baseKnown
      ? { conceptId: "base", ok: true, source: "user", text: "Cada año calculo el interés sobre todo lo acumulado (capital + intereses ya ganados)." }
      : { conceptId: "base", ok: false, source: st.base === "wrong" ? "user-wrong" : "guess", text: `Cada año calculo el interés solo sobre ${fmt(v.principal)}, el monto inicial.` },
    repeatKnown
      ? { conceptId: "repeat", ok: true, source: "user", text: `Repito el cálculo ${v.years} veces, una por año.` }
      : { conceptId: "repeat", ok: false, source: st.repeat === "wrong" ? "user-wrong" : "guess", text: "Calculo el interés una sola vez, al final." },
  ];

  let balance = v.principal;
  const rows = [];
  for (let y = 1; y <= yearsApplied; y++) {
    const base = baseKnown ? balance : v.principal;
    const interest = rateKnown ? base * v.rate : v.rate * 100;
    balance += interest;
    rows.push({ label: `Año ${y}`, detail: `interés sobre ${fmt(base)} = ${fmt(interest)}`, total: fmt(balance) });
  }

  const answer = Math.round(balance * 100) / 100;
  return {
    steps,
    rows,
    answer,
    expected: v.expected,
    passed: Math.abs(answer - v.expected) < 0.5,
    answerText: fmt(answer),
    expectedText: fmt(v.expected),
  };
}

const compound = {
  id: "interes-compuesto",
  subject: "matematica",
  title: "Interés compuesto",
  emoji: "💸",
  blurb: "Por qué una deuda o un ahorro crece cada vez más rápido.",
  keywords: ["interes", "prestamo", "ahorro", "deposito", "capital", "tasa", "banco", "deuda"],
  hint: "Explica cómo se calcula el interés de un préstamo o un ahorro cuando pasan varios años.",
  starter: "Imagina que un amigo nunca ha tenido cuenta de ahorros. ¿Cómo le explicas qué pasa con su dinero si lo deja varios años ganando interés?",
  reference: {
    label: "ASBA / SBS Perú — Educación financiera: interés simple y compuesto",
    note: "La SBS publica material para entender cómo crecen ahorros y deudas; la dificultad de aplicar el interés compuesto está documentada en investigación sobre alfabetización financiera (Lusardi & Mitchell, 2014).",
    url: "https://www.sbs.gob.pe/educacion-financiera",
  },
  action: "Esta semana: toma una compra a cuotas o una tarjeta que uses y calcula el costo total aplicando la idea que le enseñaste a Cero. Compara con lo que te dice el banco.",
  concepts: [
    {
      id: "rate",
      label: "La tasa es un porcentaje que se aplica en cada periodo",
      understood: "Una tasa como 10% anual significa ganar (o pagar) una parte del dinero cada año.",
      correct: [[["%", "porcentaje", "tasa", "por ciento"], [" ano ", " anos ", "anual", "periodo", " mes ", "mensual", "plazo", "trimestre"]]],
      misconceptions: [],
      gap: "Nunca me dijiste qué significa una tasa como «10%», así que no supe qué hacer con ese número.",
      ask: {
        nino: "¿Qué quiere decir «10%»? ¿Son 10 monedas?",
        companero: "Si me dicen «10% anual», ¿qué número exactamente me suman cada año?",
        esceptico: "Define «tasa». ¿Es un monto o una proporción? ¿De qué?",
      },
    },
    {
      id: "base",
      label: "Cada periodo, el interés se calcula sobre el saldo acumulado (capital + intereses ya ganados)",
      understood: "Cada periodo el interés se calcula sobre todo lo que ya hay acumulado, intereses incluidos.",
      correct: [
        [
          ["interes", "intereses"],
          ["acumulad", "saldo", "interes sobre interes", "intereses sobre intereses", "ya ganado", "ya generado", "interes anterior", "intereses anteriores", "se suma al capital", "se suman al capital", "capital mas", "capital +", "incluye los intereses", "total actual", "monto actual", "dinero actual", "nueva base", "nuevo capital"],
        ],
      ],
      misconceptions: [
        {
          id: "solo-inicial",
          patterns: [
            [
              ["interes", "intereses"],
              ["lo que pedi", "monto inicial", "capital inicial", "dinero inicial", "cantidad inicial", "importe inicial", "monto original", "capital original", "prestamo inicial", "sobre el prestamo", "sobre lo prestado", "sobre el capital", "solo sobre", "siempre sobre", "valor inicial", "lo que depositaste", "lo que depositas", "lo que ahorraste", "lo que invertiste", "dinero que pedi", "lo que pides"],
            ],
          ],
          cero: "El interés siempre se calcula sobre el monto inicial, no importa cuánto tiempo pase.",
          explain: "Esta frase le enseñó a Cero que la base del interés nunca cambia. Por eso calculó el mismo interés todos los años, ignorando los intereses que ya se habían acumulado.",
        },
      ],
      gap: "Nunca me dijiste sobre qué cantidad se calcula el interés después del primer periodo, así que asumí lo más simple: siempre sobre el monto inicial.",
      ask: {
        nino: "Y el segundo año… ¿los intereses del primer año también ganan intereses?",
        companero: "En el segundo año, ¿el interés se calcula sobre el mismo monto o sobre otro? ¿Cuál?",
        esceptico: "Demuéstralo con números: ¿cuánto interés se gana en el año 2 y sobre qué cantidad exacta?",
      },
    },
    {
      id: "repeat",
      label: "Eso se repite en cada periodo, por eso el crecimiento se acelera",
      understood: "El cálculo se repite en cada periodo (año tras año), así que el crecimiento se acelera.",
      correct: [
        [
          ["cada ano", "cada mes", "cada periodo", "todos los anos", "todos los meses", "ano tras ano", "ano a ano", "mes a mes", "se repite", "repite", "vuelve a", "de nuevo", "otra vez", "periodo tras periodo", "sucesiv", "cada vez"],
          ["interes", "intereses", "calcul", "crece", "aumenta", "sube", "gana", "paga", "cobra"],
        ],
        [["se repite", "se repiten", "repite", "vuelve a", "de nuevo", "otra vez"], ["cada ano", "cada mes", "cada periodo", "todos los anos", "todos los meses", "ano tras ano", "mes a mes", "mientras dure"]],
      ],
      misconceptions: [
        {
          id: "una-vez",
          patterns: [[["interes", "intereses"], ["una sola vez", "solo una vez", "solo al final", "al final del plazo", "unica vez", "se cobra al final", "se paga al final"]]],
          cero: "El interés se calcula una sola vez, al final del plazo.",
          explain: "Esta frase le enseñó a Cero que el interés se calcula una única vez al final. Por eso no repitió el cálculo año por año.",
        },
      ],
      gap: "Nunca me dijiste si el cálculo se repite con el paso del tiempo, así que lo hice una sola vez.",
      ask: {
        nino: "¿Eso pasa solo una vez o cada año?",
        companero: "¿El cálculo del interés se hace una vez al final o se repite cada periodo?",
        esceptico: "¿Cuántas veces se aplica la tasa en 3 años? Justifica.",
      },
    },
  ],
  variants: [
    { id: "a", principal: 1000, rate: 0.1, years: 3, expected: 1331, context: "Ana ahorra S/ 1,000 en una cooperativa que paga 10% anual y deja pasar 3 años sin retirar nada. El interés se suma al saldo cada año.", question: "¿Cuánto tendrá Ana al final de los 3 años?" },
    { id: "b", principal: 2000, rate: 0.05, years: 4, expected: 2431.01, context: "Luis pidió prestados S/ 2,000 para comprar una laptop, a 5% anual, y no pagó nada hasta el final de 4 años. Cada año los intereses se suman a la deuda.", question: "¿Cuánto debe Luis al final de los 4 años?" },
    { id: "c", principal: 500, rate: 0.2, years: 3, expected: 864, context: "Rosa dejó S/ 500 en una cuenta que rinde 20% anual durante 3 años (los intereses se suman al saldo cada año).", question: "¿Cuánto hay en la cuenta de Rosa al final?" },
  ],
  variantOrder: { nino: ["a", "b", "c"], companero: ["a", "b", "c"], esceptico: ["c", "b", "a"] },
  solve: solveCompound,
  practice: {
    rate: [
      { q: "Una cuenta paga 10% anual. Depositas S/ 200. ¿Cuánto interés ganas en el primer año?", options: ["S/ 10", "S/ 20", "S/ 210"], correct: 1, why: "10% de 200 es 20. El «10%» es una proporción del dinero, no S/ 10 fijos." },
      { q: "Con 5% anual sobre S/ 1,000, el interés del primer año es…", options: ["S/ 5", "S/ 50", "S/ 500"], correct: 1, why: "5% de 1,000 = 1,000 × 0.05 = 50." },
    ],
    base: [
      { q: "Tienes S/ 100 al 10% anual. Tras el año 1 tienes S/ 110. ¿Cuánto interés ganas en el año 2?", options: ["S/ 10, porque el capital inicial es 100", "S/ 11, porque ahora la base es 110", "S/ 21"], correct: 1, why: "El año 2 se calcula sobre los S/ 110 acumulados: 10% de 110 = 11. Por eso crece cada vez más rápido." },
      { q: "¿Sobre qué se calcula el interés del año 3?", options: ["Sobre el monto inicial", "Sobre el saldo al final del año 2", "Sobre los intereses del año 1 solamente"], correct: 1, why: "Siempre sobre el saldo acumulado hasta ese momento: capital más todos los intereses anteriores." },
    ],
    repeat: [
      { q: "Una cuenta paga 10% anual y dejas S/ 100 por 2 años, capitalizando cada año. ¿Cuánto hay al final?", options: ["S/ 110", "S/ 120", "S/ 121"], correct: 2, why: "Año 1: 100 → 110. Año 2: 110 → 121. El cálculo se repite cada año sobre el saldo nuevo." },
      { q: "Si el cálculo se repite cada año, ¿cuántas veces se aplica la tasa en 5 años?", options: ["1", "5", "10"], correct: 1, why: "Una vez por año: 5 veces, cada una sobre un saldo más grande." },
    ],
  },
  modelExplanation:
    "El interés es un porcentaje, una tasa, que se aplica cada año al dinero. Por ejemplo, 10% anual significa ganar S/ 10 por cada S/ 100 en un año. Cada año el interés se calcula sobre el saldo acumulado, es decir, el capital más los intereses ya ganados. Esto se repite cada año, así que el dinero crece más rápido con el tiempo: es interés sobre interés.",
};

/* -------------------------------------------------------------------------- */
/* 2. Descuentos sucesivos                                                    */
/* -------------------------------------------------------------------------- */

function solveDiscounts(v, st) {
  const pctKnown = st.pct === "known";
  const secondKnown = st.second === "known";
  const [d1, d2] = v.discounts;

  const steps = [
    pctKnown
      ? { conceptId: "pct", ok: true, source: "user", text: "Un descuento de X% se calcula sobre un precio y se resta de ese precio (eso me enseñaste)." }
      : { conceptId: "pct", ok: false, source: "guess", text: `Nadie me dijo cómo se aplica un «${d1 * 100}%». Lo leo como S/ ${d1 * 100} menos.` },
    secondKnown
      ? { conceptId: "second", ok: true, source: "user", text: "El segundo descuento se aplica sobre el precio que ya quedó rebajado." }
      : { conceptId: "second", ok: false, source: st.second === "wrong" ? "user-wrong" : "guess", text: `Junto los porcentajes: ${d1 * 100}% + ${d2 * 100}% = ${(d1 + d2) * 100}% de descuento sobre el precio original.` },
  ];

  const rows = [];
  let price = v.price;
  if (pctKnown) {
    if (secondKnown) {
      const p1 = v.price * (1 - d1);
      rows.push({ label: "1.er descuento", detail: `${fmt(v.price)} − ${d1 * 100}%`, total: fmt(p1) });
      price = p1 * (1 - d2);
      rows.push({ label: "2.º descuento", detail: `${fmt(p1)} − ${d2 * 100}%`, total: fmt(price) });
    } else {
      price = v.price * (1 - (d1 + d2));
      rows.push({ label: "Descuento total", detail: `${fmt(v.price)} − ${(d1 + d2) * 100}%`, total: fmt(price) });
    }
  } else {
    price = v.price - d1 * 100 - (secondKnown ? 0 : d2 * 100);
    rows.push({ label: "Descuento", detail: `${fmt(v.price)} − S/ ${(d1 + (secondKnown ? 0 : d2)) * 100}`, total: fmt(price) });
  }

  const answer = Math.round(price * 100) / 100;
  return { steps, rows, answer, expected: v.expected, passed: Math.abs(answer - v.expected) < 0.5, answerText: fmt(answer), expectedText: fmt(v.expected) };
}

const discounts = {
  id: "descuentos-sucesivos",
  subject: "matematica",
  title: "Descuentos sucesivos",
  emoji: "🏷️",
  blurb: "Por qué 30% + 20% de descuento no es 50%.",
  keywords: ["descuento", "rebaja", "oferta", "precio", "porcentaje", "%"],
  hint: "Explica qué pasa cuando una tienda aplica un descuento y luego otro descuento adicional.",
  starter: "Imagina que un amigo ve un cartel «30% de descuento + 20% adicional». ¿Cómo le explicas cuánto pagará realmente?",
  reference: {
    label: "INDECOPI — Derechos del consumidor: promociones y descuentos",
    note: "Confundir descuentos acumulados con su suma es un error frecuente en consumo; INDECOPI exige claridad en el precio final.",
    url: "https://www.gob.pe/indecopi",
  },
  action: "Esta semana: la próxima vez que veas «X% + Y% adicional», calcula el precio final en el celular antes de decidir y compáralo con otra tienda.",
  concepts: [
    {
      id: "pct",
      label: "Un descuento de X% se calcula sobre un precio y se resta de ese precio",
      understood: "Un descuento es un porcentaje del precio que se resta del propio precio.",
      correct: [[["descuento", "rebaja", "oferta"], ["se resta", "se quita", "se baja", "menos", "restar", "rebaja el precio", "paga menos", "de ese precio", "del precio", "sobre el precio", "del total"]]],
      misconceptions: [],
      gap: "Nunca me explicaste cómo se aplica un porcentaje de descuento a un precio, así que lo traté como soles sueltos.",
      ask: {
        nino: "¿Un descuento de 30% son 30 soles menos?",
        companero: "¿Un descuento del 30% se calcula sobre qué número y qué se hace con el resultado?",
        esceptico: "Define «30% de descuento» con una operación concreta.",
      },
    },
    {
      id: "second",
      label: "El segundo descuento se aplica sobre el precio ya rebajado, no sobre el original",
      understood: "El segundo descuento se calcula sobre el precio que ya quedó rebajado por el primero.",
      correct: [
        [
          ["segundo", "adicional", "otro descuento", "siguiente", "luego", "despues", "sucesivo", "encima"],
          ["precio ya", "ya rebajado", "ya descontado", "nuevo precio", "precio rebajado", "precio que queda", "precio nuevo", "lo que queda", "del precio final", "sobre el resultado", "sobre ese precio", "precio con descuento", "precio con el primer"],
        ],
      ],
      misconceptions: [
        {
          id: "suma",
          patterns: [
            [
              ["descuento", "descuentos", "porcentaje", "porcentajes", "%"],
              ["se suman", "se juntan", "sumar", "sumas", "suma los", "suma de los", "sumo", "se acumulan en un solo", "= 50", "es 50", "igual a 50", "un solo descuento", "ambos sobre el precio original", "los dos sobre el original", "sobre el precio original"],
            ],
          ],
          cero: "Cuando hay dos descuentos, los porcentajes se suman y se aplican de una vez sobre el precio original.",
          explain: "Esta frase le enseñó a Cero a sumar los porcentajes y aplicarlos sobre el precio original. Por eso descontó de más.",
        },
      ],
      gap: "Nunca me dijiste sobre qué precio se calcula el segundo descuento, así que junté los dos porcentajes.",
      ask: {
        nino: "Y el otro descuento… ¿se pone encima del mismo precio o de uno distinto?",
        companero: "¿El segundo descuento se calcula sobre el precio original o sobre el que ya quedó rebajado?",
        esceptico: "Si fueran 50% y 50%, ¿el producto sería gratis? Explica por qué sí o por qué no.",
      },
    },
  ],
  variants: [
    { id: "a", price: 200, discounts: [0.3, 0.2], expected: 112, context: "Una polera cuesta S/ 200. La tienda anuncia 30% de descuento y, al pagar, otro 20% adicional sobre lo que quede.", question: "¿Cuánto pagarás por la polera?" },
    { id: "b", price: 500, discounts: [0.4, 0.1], expected: 270, context: "Unas zapatillas cuestan S/ 500. Tienen 40% de descuento y, con tu tarjeta del banco, un 10% adicional.", question: "¿Cuál es el precio final de las zapatillas?" },
    { id: "c", price: 80, discounts: [0.25, 0.25], expected: 45, context: "Un libro cuesta S/ 80. Primero se le aplica 25% de descuento y, después, otro 25% de descuento adicional.", question: "¿Cuánto cuesta el libro al final?" },
  ],
  variantOrder: { nino: ["a", "b", "c"], companero: ["a", "b", "c"], esceptico: ["c", "b", "a"] },
  solve: solveDiscounts,
  practice: {
    pct: [
      { q: "Un producto de S/ 100 tiene 30% de descuento. ¿Cuánto pagas?", options: ["S/ 30", "S/ 70", "S/ 130"], correct: 1, why: "30% de 100 = 30, y se resta: 100 − 30 = 70." },
      { q: "Un producto de S/ 50 con 10% de descuento cuesta…", options: ["S/ 40", "S/ 45", "S/ 49"], correct: 1, why: "10% de 50 = 5 → 50 − 5 = 45." },
    ],
    second: [
      { q: "Precio S/ 100. Descuento de 50% y luego otro 50% adicional. ¿Cuánto pagas?", options: ["S/ 0", "S/ 25", "S/ 50"], correct: 1, why: "Tras el 1.º descuento quedan S/ 50. El 2.º es sobre S/ 50: la mitad = S/ 25. No es gratis." },
      { q: "Precio S/ 200, 30% y luego 20% adicional. ¿Sobre qué precio se calcula el 20%?", options: ["Sobre S/ 200", "Sobre S/ 140", "Sobre S/ 100"], correct: 1, why: "Tras el 30% quedan S/ 140; el 20% adicional se calcula sobre esos S/ 140 = 28 → pagas S/ 112." },
    ],
  },
  modelExplanation:
    "Un descuento es un porcentaje del precio que se resta de ese mismo precio. Cuando hay un segundo descuento adicional, se aplica sobre el precio que ya quedó rebajado después del primero, no sobre el precio original. Por eso 30% más 20% no es 50%: el segundo descuento se calcula sobre un precio nuevo, más bajo.",
};

/* -------------------------------------------------------------------------- */
/* 3. Fotosíntesis                                                            */
/* -------------------------------------------------------------------------- */

function solvePhoto(v, st) {
  const steps = v.needs.map((id) => {
    const concept = photosynthesis.concepts.find((c) => c.id === id);
    const known = st[id] === "known";
    return known
      ? { conceptId: id, ok: true, source: "user", text: v.known[id] }
      : { conceptId: id, ok: false, source: st[id] === "wrong" ? "user-wrong" : "guess", text: v.guess[id] };
  });
  const allKnown = steps.every((s) => s.ok);
  const answer = allKnown ? v.correctAnswer : v.wrongAnswer;
  return {
    steps,
    rows: [],
    answer,
    expected: v.correctAnswer,
    passed: allKnown,
    answerText: answer,
    expectedText: v.correctAnswer,
  };
}

const photosynthesis = {
  id: "fotosintesis",
  subject: "ciencias",
  title: "Fotosíntesis",
  emoji: "🌱",
  blurb: "De dónde sale realmente la «comida» de una planta.",
  keywords: ["fotosintesis", "planta", "plantas", "luz", "clorofila", "oxigeno", "glucosa", "hoja"],
  hint: "Explica cómo una planta fabrica su alimento: qué entra, qué sale y qué hace falta.",
  starter: "Imagina que un amigo cree que las plantas «comen tierra». ¿Cómo le explicas cómo se alimenta realmente una planta?",
  reference: {
    label: "Experimento de Van Helmont (siglo XVII): el sauce y la tierra",
    note: "Una planta ganó ~74 kg mientras la tierra apenas perdió peso; el aumento de masa no venía del suelo. Hoy sabemos que el carbono viene del CO₂ del aire.",
    url: "https://es.wikipedia.org/wiki/Jan_Baptist_van_Helmont",
  },
  action: "Esta semana: haz el experimento más simple posible, una planta en la luz y otra en un clóset oscuro con la misma agua, y anota qué ocurre en 7 días.",
  concepts: [
    {
      id: "co2",
      label: "El carbono de la planta viene del CO₂ del aire, no de la tierra",
      understood: "La planta toma CO₂ del aire y con él fabrica su materia (glucosa).",
      correct: [[["co2", "dioxido de carbono", "carbono del aire", "gas del aire"], ["glucosa", "azucar", "alimento", "materia", "masa", "carbono", "fabric", "produc", "convierte", "usa", "toma", "absorbe", "capta", "necesita"]]],
      misconceptions: [
        {
          id: "tierra",
          patterns: [[["tierra", "suelo"], ["se alimenta", "alimento", "comida", "come ", "nutriente", "su masa", "su peso", "engorda", "de la tierra sale", "de la tierra obtiene", "toma su comida"]]],
          cero: "La planta obtiene su alimento y su masa de la tierra.",
          explain: "Esta frase le enseñó a Cero que la masa de la planta sale de la tierra. Por eso se equivocó al decir de dónde salieron los kilos ganados.",
        },
      ],
      gap: "Nunca me dijiste de dónde sale el carbono que forma el cuerpo de la planta, así que asumí lo más intuitivo: de la tierra.",
      ask: {
        nino: "¿Y de dónde sale lo que la planta tiene adentro? ¿Se lo come del suelo?",
        companero: "Si la tierra casi no pierde peso, ¿de dónde sale la materia con la que la planta crece?",
        esceptico: "Una planta triplica su peso y la tierra casi no cambia. ¿De dónde salió esa masa? Justifica.",
      },
    },
    {
      id: "water",
      label: "El agua es otra materia prima que absorben las raíces",
      understood: "El agua, que absorben las raíces, es otra materia prima de la fotosíntesis.",
      correct: [[["agua"], ["raiz", "raices", "absorbe", "necesita", "materia prima", "ingrediente", "usa", "hidrogeno", "toma", "capta"]]],
      misconceptions: [],
      gap: "Nunca me dijiste qué papel tiene el agua.",
      ask: {
        nino: "¿Y el agua que le echan, para qué sirve?",
        companero: "¿Qué papel juega el agua en la fabricación del alimento?",
        esceptico: "¿Es el agua un ingrediente o solo ayuda a que la planta no se seque? Defiéndelo.",
      },
    },
    {
      id: "light",
      label: "La luz aporta la energía que hace posible el proceso",
      understood: "La luz solar aporta la energía necesaria; sin luz no se fabrica glucosa.",
      correct: [[["luz", "sol ", "solar", "energia luminosa", "rayos"], ["energia", "necesita", "necesaria", "fuente", "capta", "usa", "aprovecha", "sin luz", "hace posible", "impulsa", "mueve"]]],
      misconceptions: [],
      gap: "Nunca me dijiste para qué sirve la luz.",
      ask: {
        nino: "¿La luz para qué sirve? ¿Solo para que la planta vea?",
        companero: "¿Qué aporta la luz al proceso?",
        esceptico: "Si pongo la planta en un cuarto oscuro con agua y aire, ¿qué pasa? Razona con tu explicación.",
      },
    },
    {
      id: "outputs",
      label: "El resultado es glucosa (alimento) y oxígeno que se libera",
      understood: "El resultado es glucosa para la planta y oxígeno que se libera al aire.",
      correct: [[["glucosa", "azucar", "alimento"], ["oxigeno", "o2"]]],
      misconceptions: [],
      gap: "Nunca me dijiste qué produce la planta al final.",
      ask: {
        nino: "¿Y qué sale de la planta al final, aparte de crecer?",
        companero: "¿Qué productos obtiene la planta cuando termina el proceso?",
        esceptico: "Enumera todo lo que entra y todo lo que sale del proceso.",
      },
    },
  ],
  variants: [
    {
      id: "a",
      needs: ["co2", "water"],
      context: "Un árbol de 2 kg se plantó en una maceta con 100 kg de tierra seca y solo se le echó agua. Cinco años después el árbol pesa 80 kg y la tierra pesa 99.9 kg.",
      question: "¿De dónde salieron, sobre todo, los casi 78 kg que ganó el árbol?",
      correctAnswer: "Del CO₂ del aire y del agua",
      wrongAnswer: "De la tierra de la maceta",
      known: { co2: "Uso lo que me enseñaste: la materia sale del CO₂ del aire.", water: "Y el agua aporta la otra materia prima." },
      guess: { co2: "Nadie me dijo de dónde sale la materia. Asumo que la planta se alimenta de la tierra.", water: "Nadie me explicó el papel del agua; asumo que solo la mantiene hidratada." },
    },
    {
      id: "b",
      needs: ["co2", "light"],
      context: "Una planta sana vive en un frasco de vidrio cerrado, con agua y buena luz del sol, pero con aire al que se le quitó todo el CO₂.",
      question: "¿Puede la planta fabricar glucosa nueva dentro del frasco?",
      correctAnswer: "No: sin CO₂ no puede fabricar glucosa",
      wrongAnswer: "Sí, con la tierra y la luz le basta",
      known: { co2: "Según tu explicación, sin CO₂ no hay carbono para fabricar glucosa.", light: "La luz está presente, pero sola no alcanza." },
      guess: { co2: "Nadie me dijo que el CO₂ sea necesario; asumo que la tierra la alimenta igual.", light: "Nadie me explicó la luz; asumo que no cambia nada." },
    },
    {
      id: "c",
      needs: ["light", "outputs"],
      context: "Una planta con agua y aire normal se guarda 10 días en un clóset completamente oscuro.",
      question: "¿Fabrica glucosa y libera oxígeno durante esos días?",
      correctAnswer: "No: sin luz no hay fotosíntesis",
      wrongAnswer: "Sí, igual que si estuviera a la luz",
      known: { light: "Según tu explicación, sin luz no hay energía para fabricar glucosa.", outputs: "Y por eso no habría glucosa ni oxígeno nuevos." },
      guess: { light: "Nadie me dijo que la luz sea necesaria; asumo que no importa.", outputs: "No me enseñaste qué produce la planta; asumo que lo de siempre." },
    },
  ],
  variantOrder: { nino: ["a", "c", "b"], companero: ["a", "b", "c"], esceptico: ["b", "a", "c"] },
  solve: solvePhoto,
  practice: {
    co2: [
      { q: "Un árbol gana 78 kg y la tierra casi no pierde peso. ¿De dónde viene sobre todo esa masa?", options: ["De los minerales de la tierra", "Del CO₂ del aire (y del agua)", "De la lluvia únicamente"], correct: 1, why: "El carbono que forma la madera viene del CO₂ del aire; la tierra aporta sobre todo agua y pocos minerales." },
      { q: "Si quitas todo el CO₂ del aire de un frasco con una planta, ¿puede fabricar glucosa nueva?", options: ["Sí, usa la tierra", "No, le falta el carbono", "Sí, con más luz"], correct: 1, why: "Sin CO₂ no hay carbono para fabricar glucosa, aunque haya luz, agua y tierra." },
    ],
    water: [
      { q: "¿Qué hace el agua en la fotosíntesis?", options: ["Solo hidrata a la planta", "Es una materia prima del proceso", "Produce la luz"], correct: 1, why: "El agua que absorben las raíces es una de las materias primas que se transforman en glucosa." },
    ],
    light: [
      { q: "Una planta con agua y aire normal está 10 días en un clóset oscuro. ¿Fabrica glucosa nueva?", options: ["Sí, igual", "No, le falta la energía de la luz", "Solo de noche"], correct: 1, why: "La luz aporta la energía; sin ella la planta no fabrica glucosa y vive de sus reservas." },
    ],
    outputs: [
      { q: "Al terminar la fotosíntesis, ¿qué se obtiene?", options: ["CO₂ y agua", "Glucosa y oxígeno", "Solo oxígeno"], correct: 1, why: "La planta fabrica glucosa para sí misma y libera oxígeno." },
    ],
  },
  modelExplanation:
    "La fotosíntesis es cómo la planta fabrica su alimento. La planta toma CO₂ del aire, y de ahí sale el carbono de su masa, no de la tierra. Las raíces absorben agua, que es otra materia prima. La luz del sol aporta la energía necesaria, y sin luz no se fabrica nada. El resultado es glucosa, que es su alimento, y oxígeno que se libera al aire.",
};

export const TOPICS = [compound, discounts, rule, photosynthesis, water];
export const getTopic = (id) => TOPICS.find((t) => t.id === id) ?? null;

export const LEVELS = {
  nino: { id: "nino", name: "Cero curioso", tag: "Pregunta como un niño de 8 años", intro: "¡Hola! Yo no sé nada de nada. ¡Cuéntame!" },
  companero: { id: "companero", name: "Cero compañero", tag: "Pregunta como un compañero de clase", intro: "Hola. No vi esta clase. ¿Me la explicas?" },
  esceptico: { id: "esceptico", name: "Cero escéptico", tag: "Exige ejemplos con números y usa los casos difíciles", intro: "A ver si me convences. Y con ejemplos concretos." },
};
