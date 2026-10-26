"use client";
// Celebrates XP, level-ups and new badges after an event.
import { useEffect } from "react";
import { Award, PartyPopper, Sparkles, X } from "lucide-react";

export default function RewardToast({ reward, onClose }) {
  useEffect(() => {
    if (!reward) return;
    const t = setTimeout(onClose, 8000);
    return () => clearTimeout(t);
  }, [reward]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!reward || (!reward.gained && !reward.newBadges?.length && !reward.levelUp)) return null;
  return (
    <aside className={`toast ${reward.levelUp ? "toast-level" : ""}`} role="status" aria-live="polite" data-testid="reward">
      <button className="toast-x" onClick={onClose} aria-label="Cerrar"><X size={18} strokeWidth={3} aria-hidden="true" /></button>
      {reward.levelUp && <p className="toast-big"><PartyPopper size={22} aria-hidden="true" /> ¡Subiste al nivel {reward.level.n}: {reward.level.title}!</p>}
      {reward.gained > 0 && (
        <>
          <p className="toast-xp"><Sparkles size={20} aria-hidden="true" /> +{reward.gained} XP</p>
          <ul>{reward.lines.map((l) => <li key={l.label}>{l.label} <strong>+{l.xp}</strong></li>)}</ul>
        </>
      )}
      {reward.newBadges?.map((b) => <p key={b.code} className="toast-badge"><Award size={20} aria-hidden="true" /> Insignia nueva: <strong>{b.name}</strong></p>)}
    </aside>
  );
}
