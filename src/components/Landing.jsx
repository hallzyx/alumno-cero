"use client";
// Landing ("/"): who it is for, what problem it solves, what you get, how it works,
// what data is used, and one clear next step: "Probar ahora" (no sign-up needed).
import {
  ArrowRight, BookOpen, Brain, Calculator, Check, ClipboardList, Database, Dumbbell, FlaskConical, Gift, GraduationCap,
  Highlighter, Lock, Mic, PencilLine, RotateCcw, School, ShieldCheck, Sparkles, Trophy, Users, X,
} from "lucide-react";
import { SUBJECTS } from "@/lib/subjects";
import { TOPICS } from "@/lib/topics";
import { Cero } from "./Cero";

const I = ({ as: Icon, size = 22 }) => <Icon size={size} strokeWidth={2.4} aria-hidden="true" focusable="false" className="ico" />;
const SUBJECT_ICON = { matematica: Calculator, ciencias: FlaskConical };

export default function Landing({ ai, dbOk, hasProgress, onStart, onResume, onLogin, onStartTopic }) {
  return (
    <div className="landing">
      {/* ------------------------------------------------------------ hero */}
      <section className="hero" aria-labelledby="h-welcome">
        <div className="hero-copy">
          <p className="hero-kicker"><span className="tape-label">Para estudiantes de 9 a 14 años</span></p>
          <h1 id="h-welcome" className="display">Enséñale a Cero y descubre <span className="hl">tu error exacto.</span></h1>
          <p className="lead">¿Lees un tema, crees que lo entiendes… y en la prueba te trabas? Explícaselo a <strong>Cero</strong>, un alumno que solo sabe lo que tú le dices. Luego resuelve un problema nuevo: si falla, te señala <strong>la frase tuya que lo confundió</strong>.</p>
          <div className="cta-row cta-hero">
            <button type="button" className="btn btn-primary btn-lg" onClick={onStart} data-testid="start">
              Probar ahora <span className="btn-hint">sin registro</span> <I as={ArrowRight} />
            </button>
            {hasProgress && <button type="button" className="btn btn-secondary btn-lg" onClick={onResume} data-testid="resume"><I as={RotateCcw} /> Seguir donde quedé</button>}
          </div>
          {dbOk
            ? <p className="hero-login">¿Ya tienes cuenta? <button type="button" className="linkish" onClick={onLogin} data-testid="welcome-login">Entrar</button></p>
            : <p className="hero-login" data-testid="db-down-note">Las cuentas no están disponibles ahora mismo. Puedes usar todo sin cuenta: tu avance se guarda en este navegador.</p>}
          <ul className="trust" aria-label="Lo básico">
            <li><I as={Gift} size={18} /> Gratis, sin planes de pago</li>
            <li><I as={Lock} size={18} /> Sin correo para probar</li>
            <li><I as={Sparkles} size={18} /> Unos 5 minutos</li>
          </ul>
        </div>

        <figure className="specimen" data-testid="demo-example">
          <div className="specimen-paper">
            <span className="tape tape-tl" aria-hidden="true" />
            <span className="demo-tag">Ejemplo de demo</span>
            <Cero mood="confundido" cls="cero-lg" decorative />
            <p className="specimen-label">Lo que le enseñaste a Cero:</p>
            <p className="specimen-quote">«El interés se calcula sobre <mark className="pen">lo que pediste</mark>.»</p>
            <p className="pen-note" aria-hidden="true">¡Fallé por esta frase!</p>
            <div className="specimen-answers">
              <p className="ans ans-bad"><span className="ans-label"><I as={X} size={16} /> Cero dijo</span> <s>S/ 1,300</s></p>
              <p className="ans ans-good"><span className="ans-label"><I as={Check} size={16} /> Lo correcto</span> <strong>S/ 1,331</strong></p>
            </div>
            <ul className="specimen-gets" aria-label="Después te llevas">
              <li><I as={Dumbbell} size={16} /> Mini-práctica</li>
              <li><I as={Trophy} size={16} /> Ficha de dominio</li>
              <li><I as={Sparkles} size={16} /> XP</li>
            </ul>
          </div>
          <figcaption>Ejemplo de demostración (tema: interés compuesto, S/ 1,000 al 10% durante 3 años). Cero aprendió una idea equivocada y por eso calculó mal.</figcaption>
        </figure>
      </section>

      {/* --------------------------------------------------- who / problem */}
      <section className="lp-section" id="para-quien" aria-labelledby="h-who">
        <h2 id="h-who" className="lp-h2">¿Para quién es y qué resuelve?</h2>
        <div className="pitch" data-testid="value-prop">
          <article className="sticky sticky-yellow">
            <h3><I as={GraduationCap} /> Si estás en el colegio</h3>
            <p>Para cuando lees, entiendes… y al aplicarlo te trabas. Practicas con temas de Matemática y Ciencias.</p>
          </article>
          <article className="sticky sticky-pink">
            <h3><I as={Highlighter} /> El problema</h3>
            <p>Releer da la sensación de entender. Pero casi nunca alguien te dice <strong>cuál es tu error exacto</strong>.</p>
          </article>
          <article className="sticky sticky-mint">
            <h3><I as={Trophy} /> Lo que te llevas</h3>
            <p>Tu frase equivocada señalada, una práctica corta, tu ficha de dominio y XP para subir de nivel.</p>
          </article>
        </div>
      </section>

      {/* ------------------------------------------------------ how it works */}
      <section className="lp-section how" id="como-funciona" aria-labelledby="h-how">
        <h2 id="h-how" className="lp-h2">¿Cómo funciona?</h2>
        <ol className="how-list">
          <li><span className="how-ico"><I as={PencilLine} size={26} /></span><strong>Le enseñas</strong> Con tus palabras, escribiendo o hablando.</li>
          <li><span className="how-ico"><I as={Brain} size={26} /></span><strong>Cero lo intenta</strong> Resuelve un problema nuevo solo con lo que le dijiste.</li>
          <li><span className="how-ico"><I as={Highlighter} size={26} /></span><strong>Ves tu error</strong> Si falla, se marca la frase que lo confundió.</li>
          <li><span className="how-ico"><I as={Trophy} size={26} /></span><strong>Lo corriges</strong> Practicas, vuelves a enseñarle y ganas tu ficha.</li>
        </ol>
        <div className="cta-row cta-center">
          <button type="button" className="btn btn-primary btn-lg" onClick={onStart} data-testid="start-how">Probar ahora <I as={ArrowRight} /></button>
        </div>
      </section>

      {/* ------------------------------------------------------------ topics */}
      <section className="lp-section" id="materias" aria-labelledby="h-subjects">
        <h2 id="h-subjects" className="lp-h2">Materias y temas</h2>
        <p className="lead">Temas preparados con su examen, práctica y recursos. Elige uno para empezar directo.</p>
        <div className="lp-subjects">
          {Object.values(SUBJECTS).map((sub) => {
            const Icon = SUBJECT_ICON[sub.id] ?? BookOpen;
            return (
              <article key={sub.id} className={`subject-card subject-${sub.tone}`}>
                <header>
                  <span className="subject-ico"><Icon size={26} strokeWidth={2.4} aria-hidden="true" /></span>
                  <div><h3>{sub.name}</h3><p>{sub.tagline}</p></div>
                </header>
                <ul>
                  {TOPICS.filter((t) => t.subject === sub.id).map((t) => (
                    <li key={t.id}>
                      <span className="topic-emoji" aria-hidden="true">{t.emoji}</span>
                      <span className="topic-name"><strong>{t.title}</strong><small>{t.blurb}</small></span>
                      <button type="button" className="btn btn-sm btn-secondary" onClick={() => onStartTopic(t.id)} aria-label={`Probar con ${t.title}`} data-testid={`landing-topic-${t.id}`}>Probar <I as={ArrowRight} size={16} /></button>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------ parents & teachers */}
      <section className="lp-section" id="familias" aria-labelledby="h-family">
        <h2 id="h-family" className="lp-h2">Para familias y docentes</h2>
        <div className="lp-two">
          <div className="lp-panel">
            <h3><I as={Users} /> En casa</h3>
            <ul className="check">
              <li>Su hijo o hija explica un tema con sus palabras, como si le enseñara a un compañero.</li>
              <li>Al final hay una ficha que pueden leer juntos: qué entendió bien y qué corrigió.</li>
              <li>No pedimos correo ni datos de contacto. Sin anuncios.</li>
            </ul>
          </div>
          <div className="lp-panel">
            <h3><I as={School} /> En clase</h3>
            <ul className="check">
              <li>Úsenlo antes de una prueba: cada estudiante le enseña a Cero y descubre su idea equivocada.</li>
              <li>La ficha se puede copiar, descargar o imprimir para revisarla en clase.</li>
              <li>Es una práctica guiada con temas elegidos: <strong>no reemplaza al profe</strong>.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- transparency */}
      <section className="lp-section" id="datos" aria-labelledby="h-data">
        <h2 id="h-data" className="lp-h2">Tus datos, claros</h2>
        <ul className="lp-facts" data-testid="transparency">
          <li><span className="lp-fact-ico"><I as={Gift} /></span><div><strong>Es gratis</strong><p>No hay planes de pago ni compras. Todo lo que ves se puede usar sin pagar.</p></div></li>
          <li><span className="lp-fact-ico"><I as={Lock} /></span><div><strong>Sin cuenta</strong><p>Tu avance se guarda solo en este navegador. Lo borras cuando quieras con «Empezar de nuevo».</p></div></li>
          <li><span className="lp-fact-ico"><I as={Database} /></span><div><strong>Con cuenta (opcional)</strong><p>Guardamos tu usuario, apodo, avatar, grado, la contraseña cifrada y tu avance (explicaciones, exámenes, XP). Sin correo.</p></div></li>
          <li><span className="lp-fact-ico"><I as={Mic} /></span><div><strong>IA y micrófono</strong><p>{ai.configured
            ? "Tu explicación se envía a un modelo de IA (vía OpenRouter) solo cuando se la enseñas a Cero, cuando hace su examen o cuando le pides que te cuente lo que entendió. Si la IA falla, Cero usa un modo básico. El micrófono solo se usa si eliges hablar y tocas el botón; no guardamos el audio."
            : "Aquí la IA está apagada: tu explicación se revisa en tu equipo, sin enviarla a nadie. El micrófono solo se usa si eliges hablar y tocas el botón."}</p></div></li>
        </ul>
      </section>

      {/* --------------------------------------------------------- evidence */}
      <section className="lp-section" id="evidencia" aria-labelledby="h-evidence">
        <div className="lp-evidence">
          <span className="lp-fact-ico"><I as={ShieldCheck} size={26} /></span>
          <div>
            <h2 id="h-evidence" className="lp-h2">¿Por qué enseñar ayuda a aprender?</h2>
            <p>Cuando un estudiante le enseña a un «alumno» digital, se esfuerza más y piensa mejor sus explicaciones. Se llama <strong>efecto protegido</strong> (Chase, Chin, Oppezzo y Schwartz, 2009, Stanford). <a href="https://purl.stanford.edu/zm369yx3532" target="_blank" rel="noopener">Ver el estudio<span className="sr-only"> (se abre en otra pestaña)</span></a></p>
            <p className="note">Alumno Cero es un proyecto nuevo: todavía no tenemos resultados propios ni opiniones de estudiantes, así que no mostramos testimonios. El ejemplo de arriba es una demostración.</p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ final CTA */}
      <section className="lp-final" aria-labelledby="h-final">
        <Cero mood="feliz" cls="cero-lg" decorative />
        <div>
          <h2 id="h-final" className="lp-h2">¿Le enseñas algo a Cero?</h2>
          <p>Elige un tema y en unos minutos sabrás qué idea tienes que corregir.</p>
        </div>
        <button type="button" className="btn btn-primary btn-lg" onClick={onStart} data-testid="start-bottom">Probar ahora <I as={ArrowRight} /></button>
      </section>
    </div>
  );
}

export function LandingNav({ dbOk, onStart, onLogin }) {
  return (
    <nav className="lp-nav" aria-label="Secciones">
      <ul className="lp-links">
        <li><a href="#como-funciona">Cómo funciona</a></li>
        <li><a href="#materias">Materias</a></li>
        <li><a href="#familias">Familias y docentes</a></li>
        <li><a href="#datos">Tus datos</a></li>
      </ul>
      {dbOk && <button type="button" className="btn btn-ghost btn-sm" onClick={onLogin} data-testid="nav-login">Entrar</button>}
      <button type="button" className="btn btn-primary btn-sm nav-cta" onClick={onStart} data-testid="nav-start">Probar <span className="nav-cta-long">ahora</span></button>
    </nav>
  );
}

export function LandingFooter() {
  return (
    <footer className="footer lp-footer">
      <div className="lp-footer-cols">
        <div>
          <p className="lp-footer-brand"><Cero mood="curioso" decorative /> Alumno <span>Cero</span></p>
          <p>Aprende enseñando. Gratis, sin anuncios y sin correo.</p>
        </div>
        <nav aria-label="Pie de página">
          <ul>
            <li><a href="#como-funciona">Cómo funciona</a></li>
            <li><a href="#materias">Materias</a></li>
            <li><a href="#familias">Familias y docentes</a></li>
            <li><a href="#datos">Tus datos</a></li>
          </ul>
        </nav>
      </div>
      <p className="lp-footer-small"><ClipboardList size={16} aria-hidden="true" className="ico" /> Alumno Cero es para practicar con temas elegidos. No reemplaza a tu profe.</p>
    </footer>
  );
}
