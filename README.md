# Alumno Cero

**Aprende enseñándole a una IA que no sabe nada.** Explicas un tema con tus palabras; Cero solo puede usar lo que tú le dijiste para resolver un problema *nuevo*. Si falla, la app te muestra **qué frase tuya** lo confundió, te da una mini-práctica dirigida y te lleva a una ficha de dominio con tu explicación ya corregida.

Entrega para **Órbita LATAM · Reto Calentamiento (1K)** · Categoría *Educational apps* · B2C.

- **MVP:** https://hallzyx.github.io/alumno-cero/ (GitHub Pages)
- **Video de funcionamiento (≤ 5 min):** _pendiente de enlazar antes de entregar_
- **Acceso:** público, sin registro ni credenciales.

## Problema y persona usuaria

**Persona:** estudiante o adulto que *lee y cree entender* un concepto cotidiano (interés compuesto, descuentos sucesivos, fotosíntesis) pero falla al aplicarlo en un caso distinto al del ejemplo, y no sabe cuál es su error exacto. Puede tener poco tiempo y conectividad intermitente.

**Problema:** la brecha entre *reconocer* una idea y *saber usarla*. Los materiales no avisan qué parte de la comprensión del usuario está mal.

## Solución

1. **Enseñas** (texto o dictado por voz opcional).
2. **Cero lee tu explicación** y dice qué entendió, citando tus frases, y qué dudas le quedan.
3. **Examen de transferencia:** Cero resuelve un caso en un contexto nuevo usando *solo* tus ideas. Lo que no le enseñaste, lo adivina de forma coherente (y se equivoca).
4. **Diagnóstico:** si falla, se resalta la frase que causó el error o el hueco que faltó.
5. **Mini-práctica dirigida** a ese concepto y **reexplicación**. Aprobado el examen, recibes una **ficha de dominio** (copiar, descargar o imprimir) con tu explicación corregida y una acción para la semana.

## Referencia verificable

- Chase, C. C., Chin, D. B., Oppezzo, M. A., & Schwartz, D. L. (2009). *Teachable Agents and the Protégé Effect: Increasing the Effort Towards Learning.* Journal of Science Education and Technology. https://purl.stanford.edu/zm369yx3532
- Cada tema enlaza además su propia referencia en la ficha (SBS Perú, INDECOPI, experimento de Van Helmont).

## Cómo funciona por dentro (y su límite)

Cero **no es un LLM**. Es un motor determinista (`src/engine.js`) que detecta, mediante patrones, qué conceptos y qué malentendidos frecuentes aparecen en tu explicación, y un resolutor por tema (`src/topics.js`) que solo aplica los pasos que tú enseñaste. Ventajas: funciona **sin conexión**, **no envía tus textos a ningún servidor** y su comportamiento es verificable con pruebas.

**Límites declarados:**
- Hay **3 temas curados**; el motor reconoce un conjunto finito de formulaciones y malentendidos. Si dices algo correcto con palabras muy inusuales, Cero puede decir que «no se lo dijiste».
- No sustituye a un docente ni evalúa comprensión en general.
- El dictado por voz usa la API del navegador (puede enviar audio al proveedor del navegador); es opcional y solo se activa al pulsar «Dictar».
- El contenido de ejemplo del botón «Cargar ejemplo de demo» está marcado como demo.

## Onboarding (guía oficial adaptada)

Bienvenida con resultado a la vista → objetivo (tema + para qué) → fricciones (tarjetas con botones Sí/No, alternativa accesible al swipe) → preferencias que **cambian** cómo pregunta Cero y qué examen toca → enseñanza real (interacción desde el primer minuto) → procesamiento real y local → primer valor (ficha). Omitimos a propósito: prueba social (no inventamos testimonios), tabla comparativa, registro y paywall (el producto es gratuito y sin cuenta).

## Datos y privacidad

Todo el progreso se guarda en `localStorage` de tu navegador (clave `alumno-cero:v1`); «Empezar de nuevo» lo borra. No hay cuentas, servidor ni analítica.

## Desarrollo

```bash
python3 -m http.server 8123          # sirve el sitio estático
node --test tests/engine.test.mjs    # pruebas del motor
node tests/e2e.mjs http://localhost:8123/   # recorrido completo (requiere Playwright)
```

## Aporte propio y herramientas

Idea, producto y dirección de Brayan Ccarita. Se usaron asistentes de IA (Claude) para generar buena parte del código y del diseño, con pruebas automáticas del motor y del recorrido completo. Sin dependencias de runtime ni componentes de terceros.
