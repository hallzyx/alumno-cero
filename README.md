# Alumno Cero

**Aprende enseñándole a una IA que no sabe nada.** Explicas un tema con tus palabras; Cero solo puede usar lo que tú le dijiste para resolver un problema *nuevo*. Si falla, la app te muestra **qué frase tuya** lo confundió, te da una mini-práctica dirigida y te lleva a una ficha de dominio con tu explicación ya corregida.

Entrega para **Órbita LATAM · Reto Calentamiento (1K)** · Categoría *Educational apps* · B2C.

- **MVP:** https://hallzyx.github.io/alumno-cero/ (versión estática original en GitHub Pages)
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

## Cómo funciona por dentro (IA al centro)

Con la key de OpenRouter en `.env`, la IA hace el trabajo principal; sin key (o si falla) entra el **modo básico** local:

1. **Análisis (`/api/analyze`):** un LLM decide, para cada idea del tema, si el estudiante la dijo bien, mal o no la dijo. Debe citar un fragmento literal de su texto.
2. **Examen (`/api/exam`):** Cero (el LLM) resuelve un problema nuevo usando solo lo que el estudiante enseñó; las ideas faltantes o erróneas se aplican como suposición/error.
3. **Contra alucinaciones:** temperatura 0, salida JSON cerrada, lista cerrada de ideas, el modelo nunca ve la respuesta correcta, y el servidor valida todo: la cita debe existir palabra por palabra en el texto (si no, la idea cuenta como no dicha), y la aritmética/respuesta se verifica contra el solver del tema (`src/lib/topics.js`). Si no valida tras 2 intentos, se usa el motor determinista (`src/lib/engine.js`) y la UI lo indica.
4. **Extras:** dictado por voz (`/api/transcribe`, `OPENROUTER_VOICE_MODEL`) y «Cero con IA» (`/api/cero`), un comentario en personaje. Los modelos de texto usan `OPENROUTER_WRITING_MODEL`.

**Límites declarados:**
- Hay **3 temas curados**. La IA puede equivocarse al juzgar; por eso es estricta (ante la duda, «no lo dijiste») y la práctica corrige.
- No sustituye a un docente.
- Con la key activa, el texto y el audio salen a OpenRouter; sin key, nada sale del dispositivo.

## Onboarding (guía oficial adaptada)

Bienvenida con resultado a la vista → objetivo (tema + para qué) → fricciones (tarjetas con botones Sí/No, alternativa accesible al swipe) → preferencias que **cambian** cómo pregunta Cero y qué examen toca → enseñanza real (interacción desde el primer minuto) → procesamiento real y local → primer valor (ficha). Omitimos a propósito: prueba social (no inventamos testimonios), tabla comparativa, registro y paywall (el producto es gratuito y sin cuenta).

## Recorrido de demostración para el jurado (≈ 3 min)

1. Abre el MVP → **Empezar** → elige *Interés compuesto* y un objetivo → marca fricciones → elige **Cero escéptico** (cambia cómo pregunta).
2. En «Enseñar» pulsa **Cargar ejemplo de demo** (texto de ejemplo con un malentendido típico) → **Enseñar a Cero**.
3. Revisa lo que Cero entendió → **Dejar que Cero haga el examen** → **Ver si acertó**: aparece la frase tuya resaltada que causó el error.
4. **Practicar este punto** → corrige tu explicación («el interés se calcula sobre el saldo acumulado, con los intereses ya ganados») → examen aprobado → **ficha de dominio**.
5. Casos límite: texto vacío, muy corto o de otro tema muestran un mensaje y permiten continuar; recargar la página conserva el progreso.

## Hub digital (cuentas, niveles y recursos)

- **Cuentas:** usuario + contraseña (hash `scrypt`, sesión en cookie `httpOnly`). Sin correo: pensado para chicos de colegio. También se puede usar sin cuenta (progreso solo en el navegador).
- **Base de datos MySQL/MariaDB** (`root`, sin contraseña, puerto `33065`; la base `alumno_cero` y sus tablas se crean solas): `learners`, `auth_sessions`, `learning_sessions` (retomar donde lo dejaste), `attempts` (cada examen con su análisis), `mastery_cards`, `xp_log`, `badges`.
- **Gamificación:** XP por examen, aprobar, aprobar al primer intento, ficha de dominio, práctica y primer estudio del día; 10 niveles con títulos escolares; racha de días; 10 insignias. Todo se calcula en el servidor y es idempotente (no se puede ganar dos veces el mismo XP).
- **Materias y experiencia distinta:** *Matemática* (procedimiento paso a paso, simuladores interactivos) y *Ciencias* (causas y porqués, diagramas que se tocan). Cada tema trae su «mochila»: glosario, ejemplo resuelto, truco y simulador/diagrama. 5 temas: interés compuesto, descuentos sucesivos, regla de tres, fotosíntesis y ciclo del agua.

- **Rutas con URL:** `/` (inicio), `/cuenta`, `/hub`, `/temas` y `/aprender/<tema>/<paso>` (`dificultades`, `ajustes`, `ensenar`, `cero-responde`, `examen`, `resultado`, `practica`, `ficha`). Funcionan los botones atrás/adelante y recargar o compartir un enlace directo. Si eliges un tema desde el hub no se vuelve a mostrar la lista de temas.
- **Escritorio:** hub y «Enséñale» pasan a dos columnas en pantallas anchas.

## Datos y privacidad

Con cuenta, tu progreso, fichas y texto de los exámenes se guardan en la base de datos. Sin cuenta, solo en `localStorage` (clave `alumno-cero:v1`). La API key de OpenRouter vive solo en el servidor (`.env`).

## Desarrollo (Next.js)

```bash
npm install
cp .env.example .env     # y pega tu OPENROUTER_API_KEY; ajusta DB_* si tu MySQL no es root/33065
npm run dev              # http://localhost:3000
npm test                 # pruebas del motor
npm run build && npm start
```

Estructura: `src/app` (páginas y rutas `api/`), `src/components` (UI React), `src/lib` (motor, temas, almacenamiento, cliente OpenRouter, grabación de audio), `public` (fuentes y manifest).
Variables en `.env`: `OPENROUTER_API_KEY`, `OPENROUTER_VOICE_MODEL`, `OPENROUTER_WRITING_MODEL`. El modelo de voz debe aceptar audio de entrada.

Nota: al migrar a Next.js se eliminó el service worker (el modo 100 % offline del MVP estático); el examen y el análisis siguen corriendo en el cliente.

## Aporte propio y herramientas

Idea, producto y dirección de Brayan Ccarita. Se usaron asistentes de IA (Claude) para generar buena parte del código y del diseño, con pruebas automáticas del motor y del recorrido completo. Dependencias de runtime: Next.js y React.
