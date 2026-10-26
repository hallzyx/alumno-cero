// Preconfigured "mochila" resources per topic: glossary, worked example, memory trick, and a visual.
// `visual` selects an interactive component in components/Visuals.jsx.

export const RESOURCES = {
  "interes-compuesto": {
    visual: "growth",
    glossary: [
      { term: "Capital", def: "El dinero con el que empiezas (lo que depositas o lo que te prestan)." },
      { term: "Tasa de interés", def: "Un porcentaje que se aplica cada periodo. 10% anual = 10 por cada 100 al año." },
      { term: "Interés", def: "El dinero extra que ganas (ahorro) o pagas (deuda)." },
      { term: "Saldo acumulado", def: "Todo lo que hay ahora: capital más los intereses que ya se ganaron." },
    ],
    trick: "Interés compuesto = «interés sobre interés». Cada año la base es el saldo NUEVO, no el inicial.",
    example: {
      title: "S/ 100 al 10% anual durante 3 años",
      steps: ["Año 1: 10% de 100 = 10 → saldo 110", "Año 2: 10% de 110 = 11 → saldo 121", "Año 3: 10% de 121 = 12.10 → saldo 133.10"],
    },
  },
  "descuentos-sucesivos": {
    visual: "discounts",
    glossary: [
      { term: "Descuento", def: "Un porcentaje del precio que se resta de ese precio." },
      { term: "Descuento sucesivo", def: "Un segundo descuento que se aplica sobre el precio que ya quedó rebajado." },
      { term: "Precio final", def: "Lo que realmente pagas después de todos los descuentos." },
    ],
    trick: "30% + 20% NO es 50%: el segundo descuento se calcula sobre un precio más chico.",
    example: {
      title: "Polera de S/ 200 con 30% y luego 20%",
      steps: ["30% de 200 = 60 → pagas 140", "20% de 140 = 28 → pagas 112", "Con 50% directo serían S/ 100: ¡no es lo mismo!"],
    },
  },
  "regla-de-tres": {
    visual: "proportion",
    glossary: [
      { term: "Proporcional", def: "Dos cantidades que crecen juntas: si una se duplica, la otra también." },
      { term: "Valor unitario", def: "Lo que vale UNA sola unidad (1 cuaderno, 1 kg…)." },
      { term: "Regla de tres", def: "Método para hallar una cantidad que falta usando una proporción." },
    ],
    trick: "Siempre pregúntate: «¿cuánto vale UNO?». Divide primero, multiplica después.",
    example: {
      title: "3 cuadernos cuestan S/ 12. ¿Y 7?",
      steps: ["Valor de 1: 12 ÷ 3 = 4", "Valor de 7: 4 × 7 = 28", "Comprobación: 7 cuadernos es más del doble de 3, ¡28 es más del doble de 12!"],
    },
  },
  fotosintesis: {
    visual: "photosynthesis",
    glossary: [
      { term: "Fotosíntesis", def: "El proceso con el que la planta fabrica su alimento usando la luz." },
      { term: "Clorofila", def: "El pigmento verde de las hojas que capta la luz del sol." },
      { term: "Glucosa", def: "El azúcar que fabrica la planta: su alimento y la materia de su cuerpo." },
      { term: "CO₂", def: "Dióxido de carbono: un gas del aire que aporta el carbono." },
    ],
    trick: "Entra: agua + CO₂ + luz. Sale: glucosa + oxígeno. ¡La tierra NO es la comida!",
    example: {
      title: "El árbol que ganó 78 kg",
      steps: ["La tierra casi no perdió peso", "El agua aporta parte de la materia", "El carbono viene del CO₂ del aire: ¡de ahí sale la mayor parte!"],
    },
  },
  "ciclo-del-agua": {
    visual: "watercycle",
    glossary: [
      { term: "Evaporación", def: "El agua líquida pasa a vapor por el calor del sol." },
      { term: "Condensación", def: "El vapor se enfría y se convierte en gotitas: así se forman las nubes." },
      { term: "Precipitación", def: "El agua cae del cielo como lluvia, nieve o granizo." },
      { term: "Vapor de agua", def: "Agua en forma de gas: está en el aire, pero no se ve." },
    ],
    trick: "Sube (evapora) → se enfría (condensa) → cae (precipita) → y vuelta a empezar.",
    example: {
      title: "El charco que se secó",
      steps: ["El sol calienta el charco → se evapora", "El vapor sube y se enfría → forma una nube", "Las gotas pesan → llueve y el agua vuelve"],
    },
  },
};
