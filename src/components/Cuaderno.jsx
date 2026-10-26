// A notebook page with math written by hand: stacked fractions, ruled lines, red ink for mistakes.
// Expression syntax: `{a|b}` is a stacked fraction a over b; everything else is plain text.
import { Check, X } from "lucide-react";

const FRACTION = /(\{[^|}]+\|[^}]+\})/g;

function MathText({ expr }) {
  const spoken = expr.replace(/\{([^|}]+)\|([^}]+)\}/g, "$1 sobre $2").replace(/×/g, " por ").replace(/÷/g, " entre ").replace(/−/g, " menos ");
  return (
    <span className="math" role="math" aria-label={spoken}>
      {expr.split(FRACTION).map((part, i) => {
        const m = /^\{([^|}]+)\|([^}]+)\}$/.exec(part);
        return m ? (
          <span key={i} className="frac" aria-hidden="true"><span className="num">{m[1]}</span><span className="den">{m[2]}</span></span>
        ) : (
          <span key={i} aria-hidden="true">{part}</span>
        );
      })}
    </span>
  );
}

/**
 * tone "cero": Cero's own page (marks=true flags the lines built on a wrong or missing idea).
 * tone "fix": the correct page written "by the teacher" (green check on every line).
 */
export default function Cuaderno({ work, title, tone = "cero", marks = false, testid }) {
  return (
    <figure className={`cuaderno cuaderno-${tone}`} data-testid={testid}>
      <figcaption className="cuaderno-title">{title}</figcaption>
      <ol className="cn-lines">
        {work.map((l, i) => {
          const bad = marks && tone === "cero" && l.ok === false;
          return (
            <li key={i} className={`cn-line ${bad ? "bad" : ""} ${l.final ? "final" : ""}`}>
              <span className="cn-label">{l.label}</span>
              <span className="cn-exprs">{l.exprs.map((x, j) => <MathText key={j} expr={x} />)}</span>
              {bad && <span className="cn-mark cn-x" role="img" aria-label="Esta línea tiene un error"><X size={22} strokeWidth={3.2} /></span>}
              {tone === "fix" && <span className="cn-mark cn-ok" role="img" aria-label="Correcto"><Check size={22} strokeWidth={3.2} /></span>}
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
