// Cero is literally a zero: an oval "0" drawn in marker, with a face. Moods: curioso, pensando, feliz, confundido.
const Eye = ({ cx, cy, r }) => (
  <>
    <circle cx={cx} cy={cy} r={r} className="c-eye" />
    <circle cx={cx + r * 0.35} cy={cy - r * 0.4} r={r * 0.36} className="c-shine" />
  </>
);

const FACES = {
  curioso: (
    <>
      <Eye cx={27} cy={33} r={4} /><Eye cx={45} cy={33} r={4} />
      <path d="M21 24 q5 -4 10 -1" className="c-line" /><path d="M41 22 q5 -3 10 0" className="c-line" />
      <ellipse cx="36" cy="47" rx="3.4" ry="4" className="c-mouth" />
      <ellipse cx="19.5" cy="41.5" rx="3.6" ry="2.4" className="c-cheek" /><ellipse cx="52.5" cy="41.5" rx="3.6" ry="2.4" className="c-cheek" />
    </>
  ),
  pensando: (
    <>
      <Eye cx={30} cy={31} r={3.4} /><Eye cx={47} cy={31} r={3.4} />
      <path d="M24 25 q5 -2 10 0" className="c-line" /><path d="M42 20 q5 -4 10 -1" className="c-line" />
      <path d="M31 48 q4 -2 9 0" className="c-line" />
      <circle cx="63" cy="15" r="2.6" className="c-drop" /><circle cx="68.5" cy="7" r="1.8" className="c-drop" />
    </>
  ),
  feliz: (
    <>
      <path d="M21 34 q5 -7 10 0" className="c-line" /><path d="M41 34 q5 -7 10 0" className="c-line" />
      <path d="M25 43 q11 12 22 0 z" className="c-smile" />
      <ellipse cx="19" cy="42" rx="3.8" ry="2.6" className="c-cheek" /><ellipse cx="53" cy="42" rx="3.8" ry="2.6" className="c-cheek" />
    </>
  ),
  confundido: (
    <>
      <Eye cx={27} cy={33} r={4.6} /><Eye cx={46} cy={34} r={2.6} />
      <path d="M20 27 l11 -5" className="c-line" /><path d="M41 22 q6 -1 10 5" className="c-line" />
      <path d="M25 48 q4 -4 7 0 t7 0 t7 0" className="c-line" />
      <path d="M59 15 q3.5 5.5 0 8 q-3.5 -2.5 0 -8z" className="c-drop" />
    </>
  ),
};

export function Cero({ mood = "curioso", cls = "", decorative = false }) {
  return (
    <span className={`cero cero-${mood} ${cls}`} data-testid="cero" data-mood={mood} {...(decorative ? {} : { role: "img", "aria-label": `Cero, ${mood}` })}>
      <svg viewBox="0 0 72 72" aria-hidden="true" focusable="false">
        <ellipse cx="37" cy="70" rx="17" ry="2.6" className="c-ground" />
        <ellipse cx="36" cy="37" rx="25" ry="31" className="c-body" />
        <path d="M21 16 q6 -8 15 -9" className="c-gloss" />
        <ellipse cx="36" cy="37" rx="25" ry="31" className="c-ring" />
        {FACES[mood]}
      </svg>
    </span>
  );
}

export function CeroSays({ mood, children, cls = "" }) {
  return (
    <div className={`cero-row ${cls}`}>
      <Cero mood={mood} />
      <p className="bubble">{children}</p>
    </div>
  );
}
