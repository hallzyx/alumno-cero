// Alumno Cero — extra curated topics (one math, one theory). Same shape as topics.js.
// Patterns are written against normalized text (lowercase, no accents) for the local fallback engine.
import { formatMoney } from "./engine.js";

const fmt = formatMoney;

/* -------------------------------------------------------------------------- */
/* Regla de tres (matemática)                                                 */
/* -------------------------------------------------------------------------- */

function solveRule(v, st) {
  const ratio = st.ratio === "known";
  const unit = st.unit === "known";
  const scale = st.scale === "known";
  const { q1, q2, total } = v;
  const diff = q2 - q1;
  const unitVal = total / q1;

  const steps = [
    ratio
      ? { conceptId: "ratio", ok: true, source: "user", text: `Las dos cantidades son proporcionales: si pasan de ${q1} a ${q2}, el precio crece en la misma proporción (eso me enseñaste).` }
      : { conceptId: "ratio", ok: false, source: st.ratio === "wrong" ? "user-wrong" : "guess", text: `Nadie me explicó cómo se relacionan. Si compro ${diff} más, supongo que pago ${diff} más: le sumo la diferencia.` },
    unit
      ? { conceptId: "unit", ok: true, source: "user", text: `Primero divido ${fmt(total)} entre ${q1} para saber cuánto vale UNA unidad.` }
      : { conceptId: "unit", ok: false, source: "guess", text: `Nadie me dijo que hay que hallar el valor de una unidad. Multiplico el precio ${fmt(total)} por ${q2}.` },
    scale
      ? { conceptId: "scale", ok: true, source: "user", text: `Luego multiplico el valor de una unidad por ${q2}, la cantidad que me piden.` }
      : { conceptId: "scale", ok: false, source: "guess", text: "Nadie me dijo que después hay que multiplicar, así que me quedo con el valor de una unidad como respuesta." },
  ];

  const rows = [];
  let answer;
  if (!ratio) {
    answer = total + diff;
    rows.push({ label: "Suma de la diferencia", detail: `${fmt(total)} + ${diff}`, total: fmt(answer) });
  } else if (!unit) {
    answer = total * q2;
    rows.push({ label: "Multiplico todo", detail: `${fmt(total)} × ${q2}`, total: fmt(answer) });
  } else if (!scale) {
    answer = unitVal;
    rows.push({ label: "Valor de 1", detail: `${fmt(total)} ÷ ${q1}`, total: fmt(answer) });
  } else {
    answer = unitVal * q2;
    rows.push({ label: "Valor de 1", detail: `${fmt(total)} ÷ ${q1}`, total: fmt(unitVal) });
    rows.push({ label: `Valor de ${q2}`, detail: `${fmt(unitVal)} × ${q2}`, total: fmt(answer) });
  }
  answer = Math.round(answer * 100) / 100;
  return { steps, rows, answer, expected: v.expected, passed: Math.abs(answer - v.expected) < 0.5, answerText: fmt(answer), expectedText: fmt(v.expected) };
}

export const rule = {
  id: "regla-de-tres",
  subject: "matematica",
  title: "Regla de tres",
  emoji: "🧮",
  blurb: "Cómo saber cuánto cuestan 7 si sabes cuánto cuestan 3.",
  keywords: ["proporcion", "proporcional", "regla de tres", "precio", "cuesta", "cuestan", "unidad", "dividir", "multiplic", "cantidad"],
  hint: "Explica cómo averiguar el precio de varias cosas si sabes el precio de otra cantidad.",
  starter: "Imagina que un amigo sabe que 3 cuadernos cuestan S/ 12 y no sabe cuánto cuestan 7. ¿Cómo le explicas paso a paso cómo averiguarlo?",
  reference: {
    label: "Regla de tres (proporcionalidad directa)",
    note: "Método clásico de la proporcionalidad: se reduce a la unidad y luego se escala. Es la base de recetas, mapas y precios.",
    url: "https://es.wikipedia.org/wiki/Regla_de_tres",
  },
  action: "Esta semana: elige una receta o un producto del súper y calcula cuánto necesitarías para el doble y para la mitad, usando lo que le enseñaste a Cero.",
  concepts: [
    {
      id: "ratio",
      label: "Las dos cantidades son proporcionales: si una se multiplica por un número, la otra también",
      understood: "Si una cantidad se multiplica (el doble, el triple…), la otra se multiplica igual.",
      correct: [[["proporcional", "proporcion", "regla de tres", "el doble", "el triple", "la mitad", "por cada", "misma proporcion", "mismo numero", "tambien se multiplica", "tambien aumenta"], ["cantidad", "cantidades", "precio", "cuesta", "cuestan", "costo", "tambien", "igual", "mismo", "multiplica", "aumenta", "sube", "crece", "doble", "triple"]]],
      misconceptions: [
        {
          id: "suma-diferencia",
          patterns: [[["suma", "sumo", "sumas", "agrega", "agregas", "se le suma", "le sumas", "aumenta lo mismo", "resta", "restas"], ["la misma cantidad", "lo mismo", "la diferencia", "los que faltan", "las que faltan", "mas unidades", "a ambos", "a los dos", "esos mas"]]],
          cero: "Si una cantidad aumenta en un número, la otra también aumenta sumándole ese mismo número.",
          explain: "Esta frase le enseñó a Cero a SUMAR la diferencia en vez de multiplicar. Por eso creyó que, si compras 4 más, el precio sube solo 4 soles.",
        },
      ],
      gap: "Nunca me dijiste cómo se relacionan las dos cantidades, así que asumí que si compro 4 más, pago 4 más.",
      ask: {
        nino: "Si compro el doble de cosas, ¿pago el doble o solo un poquito más?",
        companero: "Si compro 4 cuadernos más, ¿el precio sube sumando o multiplicando? ¿Cómo lo sabes?",
        esceptico: "Demuéstrame con números por qué el precio no sube sumando la misma cantidad de unidades.",
      },
    },
    {
      id: "unit",
      label: "Primero se calcula cuánto vale UNA sola unidad, dividiendo",
      understood: "Primero divido el precio total entre la cantidad para saber cuánto vale una unidad.",
      correct: [
        [["una unidad", "una sola", "cada uno", "cada una", "por unidad", "unitario", "valor de uno", "cuanto vale uno", "cuanto cuesta uno", "cuanto vale 1", "cuanto cuesta 1", "precio de uno", "de uno solo", "de 1"], ["divid", "calcul", "busca", "hallo", "hallar", "saca", "obtiene", "precio", "valor", "cuesta", "vale", "costo", "primero"]],
        [["divid", "dividimos", "dividir", "repart"], ["entre", "cantidad", "unidades", "cuadernos", "kilos", "cosas", "total"]],
      ],
      misconceptions: [],
      gap: "Nunca me dijiste que había que hallar primero el valor de una unidad, así que multipliqué sin más.",
      ask: {
        nino: "¿Cuánto cuesta UN solo cuaderno? ¿Cómo lo averiguo?",
        companero: "¿Qué hago primero con los números que ya conozco antes de calcular lo que me piden?",
        esceptico: "¿Por qué conviene hallar el valor de una unidad antes de calcular el resultado? Justifica con un ejemplo.",
      },
    },
    {
      id: "scale",
      label: "Luego ese valor de una unidad se multiplica por la cantidad que piden",
      understood: "Después multiplico el valor de una unidad por la cantidad que me piden.",
      correct: [[["multiplic", "por la cantidad", "por las que", "por los que", "veces"], ["cantidad", "unidades", "pide", "pidan", "necesit", "quier", "compra", "pregunta", "resultado", "total", "cuantos", "cuantas", "luego", "despues"]]],
      misconceptions: [],
      gap: "Nunca me dijiste qué hacer después de hallar el valor de una unidad, así que me quedé ahí.",
      ask: {
        nino: "Ya sé cuánto cuesta uno. ¿Y ahora qué hago para saber cuánto cuestan varios?",
        companero: "Cuando ya tengo el valor de una unidad, ¿cómo llego al total que me piden?",
        esceptico: "Describe el segundo paso y di por qué lo haces.",
      },
    },
  ],
  variants: [
    { id: "a", q1: 3, q2: 7, total: 12, expected: 28, context: "3 cuadernos cuestan S/ 12 en la librería del colegio.", question: "¿Cuánto cuestan 7 cuadernos iguales?" },
    { id: "b", q1: 4, q2: 10, total: 20, expected: 50, context: "4 kg de manzanas cuestan S/ 20 en el mercado.", question: "¿Cuánto cuestan 10 kg de las mismas manzanas?" },
    { id: "c", q1: 5, q2: 8, total: 60, expected: 96, context: "5 entradas al museo cuestan S/ 60 en total.", question: "¿Cuánto costarán 8 entradas?" },
  ],
  variantOrder: { nino: ["a", "b", "c"], companero: ["a", "c", "b"], esceptico: ["c", "b", "a"] },
  solve: solveRule,
  practice: {
    ratio: [
      { q: "2 lápices cuestan S/ 6. ¿Cuánto cuestan 4 lápices?", options: ["S/ 8 (le sumo 2)", "S/ 12 (el doble de lápices, el doble de precio)", "S/ 24"], correct: 1, why: "Compras el DOBLE de lápices, así que pagas el doble: 6 × 2 = 12. No se suma la diferencia de unidades, se multiplica." },
      { q: "5 entradas cuestan S/ 50. ¿Cuánto cuestan 10 entradas?", options: ["S/ 55", "S/ 100", "S/ 60"], correct: 1, why: "10 es el doble de 5, así que el precio también es el doble: 50 × 2 = 100." },
    ],
    unit: [
      { q: "4 kg de arroz cuestan S/ 20. ¿Cuánto cuesta 1 kg?", options: ["S/ 80", "S/ 5", "S/ 16"], correct: 1, why: "Se divide el total entre la cantidad: 20 ÷ 4 = 5. Así sabes cuánto vale UNA unidad." },
      { q: "Para hallar el precio de una sola unidad hay que…", options: ["Multiplicar el precio por la cantidad", "Dividir el precio total entre la cantidad", "Sumar el precio y la cantidad"], correct: 1, why: "Dividir reparte el total en partes iguales: el resultado es el valor de una unidad." },
    ],
    scale: [
      { q: "1 cuaderno cuesta S/ 4. ¿Cuánto cuestan 6 cuadernos?", options: ["S/ 10", "S/ 24", "S/ 1.50"], correct: 1, why: "Se multiplica el valor de una unidad por la cantidad pedida: 4 × 6 = 24." },
      { q: "Ya sé que 1 gaseosa cuesta S/ 3 y me piden el precio de 5. ¿Qué hago?", options: ["Divido 3 entre 5", "Multiplico 3 por 5", "Resto 5 a 3"], correct: 1, why: "Cinco gaseosas valen 5 veces lo que vale una: 3 × 5 = 15." },
    ],
  },
  modelExplanation:
    "Si dos cantidades son proporcionales, cuando una se multiplica por un número la otra se multiplica por el mismo número. Para resolverlo, primero divido el precio total entre la cantidad para saber cuánto vale una sola unidad. Luego multiplico ese valor de una unidad por la cantidad que me piden y así obtengo el resultado.",
};

/* -------------------------------------------------------------------------- */
/* El ciclo del agua (teoría)                                                 */
/* -------------------------------------------------------------------------- */

function solveWater(v, st) {
  const steps = v.needs.map((id) => {
    const known = st[id] === "known";
    return known
      ? { conceptId: id, ok: true, source: "user", text: v.known[id] }
      : { conceptId: id, ok: false, source: st[id] === "wrong" ? "user-wrong" : "guess", text: v.guess[id] };
  });
  const allKnown = steps.every((s) => s.ok);
  const answer = allKnown ? v.correctAnswer : v.wrongAnswer;
  return { steps, rows: [], answer, expected: v.correctAnswer, passed: allKnown, answerText: answer, expectedText: v.correctAnswer };
}

export const water = {
  id: "ciclo-del-agua",
  subject: "ciencias",
  title: "El ciclo del agua",
  emoji: "💧",
  blurb: "A dónde va el agua de un charco y cómo vuelve en forma de lluvia.",
  keywords: ["agua", "ciclo", "lluvia", "nube", "nubes", "evapor", "vapor", "condens", "mar", "sol", "precipit"],
  hint: "Explica qué le pasa al agua desde que el sol la calienta hasta que vuelve a caer.",
  starter: "Imagina que un amigo cree que cuando un charco se seca, el agua «desaparece». ¿Cómo le explicas a dónde va y cómo vuelve el agua?",
  reference: {
    label: "USGS — Ciclo del agua (Water Science School)",
    note: "El servicio geológico de EE. UU. explica cómo el agua cambia de estado y circula entre el mar, la atmósfera y la tierra.",
    url: "https://www.usgs.gov/special-topics/water-science-school/science/water-cycle",
  },
  action: "Esta semana: pon un vaso con agua al sol y marca el nivel cada día. Luego explícale a alguien a dónde fue el agua.",
  concepts: [
    {
      id: "evap",
      label: "El sol calienta el agua y se evapora: pasa al aire como vapor, no desaparece",
      understood: "El sol calienta el agua y la evapora: sube al aire como vapor de agua.",
      correct: [[["evapor", "vapor"], ["agua", "mar", "rios", "oceano", "charco", "sube", "aire", "gas", "gotas"]]],
      misconceptions: [
        {
          id: "desaparece",
          patterns: [[["agua", "charco", "mojado"], ["desaparece", "se acaba", "se pierde", "deja de existir", "se esfuma", "se va a la nada", "ya no existe"]]],
          cero: "El agua de un charco que se seca desaparece y deja de existir.",
          explain: "Esta frase le enseñó a Cero que el agua se destruye. Por eso no supo decir dónde está el agua de un charco seco: en realidad pasa al aire como vapor.",
        },
      ],
      gap: "Nunca me dijiste qué le pasa al agua cuando el sol la calienta, así que asumí que simplemente desaparece.",
      ask: {
        nino: "Si el charco se seca, ¿a dónde se fue el agua? ¿Se acabó?",
        companero: "Cuando el sol calienta el agua, ¿qué le pasa y a dónde va?",
        esceptico: "El agua no se destruye. Explica dónde está el agua de un charco seco y cómo llegó allí.",
      },
    },
    {
      id: "cond",
      label: "Al subir, el vapor se enfría y se condensa en gotitas que forman las nubes",
      understood: "El vapor sube, se enfría y se condensa en gotitas de agua que forman las nubes.",
      correct: [[["condens", "se enfria", "enfria", "frio", "enfriar"], ["nube", "nubes", "gotas", "gotitas", "liquido", "vapor", "altura", "arriba", "cielo"]]],
      misconceptions: [
        {
          id: "nube-humo",
          patterns: [[["nube", "nubes"], ["son de algodon", "estan hechas de humo", "son de humo", "no tienen agua", "son de vapor invisible", "son gas invisible"]]],
          cero: "Las nubes están hechas de humo o algodón, no de agua.",
          explain: "Esta frase le enseñó a Cero que las nubes no tienen agua. Por eso no entendió de dónde sale la lluvia: las nubes son millones de gotitas de agua.",
        },
      ],
      gap: "Nunca me dijiste qué le pasa al vapor cuando sube, así que asumí que sigue siendo vapor invisible.",
      ask: {
        nino: "¿De qué están hechas las nubes?",
        companero: "Cuando el vapor llega arriba donde hace frío, ¿qué le ocurre?",
        esceptico: "Explica el cambio de estado que forma las nubes y por qué ocurre arriba y no abajo.",
      },
    },
    {
      id: "precip",
      label: "Cuando las gotas pesan mucho caen como lluvia o nieve y el agua vuelve a la tierra",
      understood: "Cuando las gotas se juntan y pesan, caen como lluvia o nieve y el agua regresa a la tierra y al mar.",
      correct: [[["llueve", "lluvia", "precipit", "nieve", "granizo", "caen", "cae ", "caer"], ["gotas", "nubes", "pesan", "pesadas", "agua", "vuelve", "regresa", "rios", "mar", "suelo", "tierra"]]],
      misconceptions: [],
      gap: "Nunca me dijiste cómo vuelve el agua a la tierra, así que asumí que las nubes se quedan quietas.",
      ask: {
        nino: "¿Y la lluvia de dónde sale?",
        companero: "¿Qué pasa con las gotas de las nubes cuando ya hay muchas?",
        esceptico: "Cierra el ciclo: ¿cómo regresa el agua al mar y por qué el proceso se repite?",
      },
    },
  ],
  variants: [
    {
      id: "a",
      needs: ["evap"],
      context: "Después de una tormenta, un charco grande queda en el patio del colegio. A mediodía hay mucho sol y por la tarde el charco ya no está.",
      question: "¿A dónde se fue el agua del charco?",
      correctAnswer: "Se evaporó y ahora está en el aire como vapor",
      wrongAnswer: "Desapareció y ya no existe",
      known: { evap: "Según tu explicación, el sol calienta el agua y la evapora: pasa al aire como vapor." },
      guess: { evap: "Nadie me dijo qué le pasa al agua con el calor; asumo que simplemente desaparece." },
    },
    {
      id: "b",
      needs: ["cond"],
      context: "El vapor de agua sube muy alto en el cielo, donde la temperatura es muy baja.",
      question: "¿Qué le pasa al vapor allá arriba?",
      correctAnswer: "Se enfría y se condensa en gotitas que forman nubes",
      wrongAnswer: "Sigue siendo vapor invisible y no cambia",
      known: { cond: "Según tu explicación, al enfriarse el vapor se condensa en gotitas y forma las nubes." },
      guess: { cond: "Nadie me explicó qué pasa con el vapor arriba; asumo que sigue igual, invisible." },
    },
    {
      id: "c",
      needs: ["precip"],
      context: "Una nube se va cargando de más y más gotitas de agua durante toda la mañana.",
      question: "¿Qué ocurre cuando las gotas ya son muy pesadas?",
      correctAnswer: "Caen como lluvia y el agua vuelve a la tierra",
      wrongAnswer: "Nada: la nube se queda igual para siempre",
      known: { precip: "Según tu explicación, cuando las gotas pesan demasiado caen como lluvia." },
      guess: { precip: "Nadie me dijo cómo vuelve el agua; asumo que las nubes se quedan quietas." },
    },
  ],
  variantOrder: { nino: ["a", "b", "c"], companero: ["a", "c", "b"], esceptico: ["b", "c", "a"] },
  solve: solveWater,
  practice: {
    evap: [
      { q: "Un charco se seca bajo el sol. ¿Qué pasó con el agua?", options: ["Desapareció", "Pasó al aire como vapor", "Se metió dentro del sol"], correct: 1, why: "El agua no se destruye: el calor la evapora y queda en el aire como vapor de agua." },
      { q: "¿Qué energía hace que el agua se evapore en el ciclo del agua?", options: ["El calor del sol", "El viento frío", "La luna"], correct: 0, why: "El sol calienta el agua de mares, ríos y charcos y la evapora." },
    ],
    cond: [
      { q: "¿De qué están hechas las nubes?", options: ["De humo", "De algodón", "De millones de gotitas de agua"], correct: 2, why: "Cuando el vapor se enfría se condensa en gotitas diminutas; juntas forman las nubes." },
      { q: "El vapor sube y llega a una zona muy fría. ¿Qué le ocurre?", options: ["Se condensa", "Se evapora más", "Desaparece"], correct: 0, why: "Al enfriarse, el vapor cambia de gas a líquido: se condensa." },
    ],
    precip: [
      { q: "Cuando las gotitas de una nube se juntan y pesan mucho, ¿qué pasa?", options: ["Se quedan quietas", "Caen como lluvia o nieve", "Se vuelven vapor otra vez"], correct: 1, why: "Al volverse pesadas, la gravedad las hace caer: es la precipitación." },
    ],
  },
  modelExplanation:
    "El sol calienta el agua de los mares, ríos y charcos y la evapora: pasa al aire como vapor, no desaparece. Cuando el vapor sube se enfría y se condensa en gotitas que forman las nubes. Cuando las gotas se juntan y pesan demasiado, caen como lluvia o nieve y el agua vuelve a la tierra y al mar. Así el ciclo se repite.",
};
