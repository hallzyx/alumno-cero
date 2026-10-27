"use client";
// Header menu of a signed-in account: who is studying, switch profile, panels by plan, my plan, sign out.
import { useEffect, useRef, useState } from "react";
import { ChevronDown, CreditCard, LogOut, School, Users } from "lucide-react";
import { planOf } from "@/lib/plans";
import Avatar from "./Avatar";

export default function AccountMenu({ learner, account, caps, onSwitch, onGo, onLogout }) {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState(null);
  const box = useRef(null);
  const plan = planOf(account?.plan);
  const multi = caps.family || caps.classrooms;

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  useEffect(() => {
    if (!open || !multi || profiles) return;
    fetch("/api/account").then((r) => r.json()).then((j) => setProfiles(j.profiles ?? [])).catch(() => setProfiles([]));
  }, [open, multi, profiles]);

  const pick = (fn) => () => { setOpen(false); fn(); };

  return (
    <div className="acct" ref={box}>
      <button type="button" className="btn btn-ghost btn-sm chip-me" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)} data-testid="me-chip" aria-label={`Mi cuenta: ${learner.nickname}, nivel ${learner.level.n}`}>
        <Avatar id={learner.avatar} size={28} />
        <span className="btn-label">{learner.nickname} · Nv {learner.level.n}</span>
        <ChevronDown size={16} strokeWidth={3} aria-hidden="true" />
      </button>
      {open && (
        <div className="acct-menu" role="menu" data-testid="account-menu">
          <p className="acct-plan">{plan ? <>Plan <strong>{plan.name}</strong></> : "Sin plan todavía"}</p>
          {multi && (
            <div className="acct-profiles" role="group" aria-label="¿Quién estudia ahora?">
              <p className="acct-label">¿Quién estudia ahora?</p>
              {(profiles ?? []).map((p) => (
                <button key={p.id} type="button" role="menuitemradio" aria-checked={p.id === learner.id} className={`acct-item ${p.id === learner.id ? "on" : ""}`} onClick={pick(() => p.id !== learner.id && onSwitch(p.id))} data-testid={`switch-${p.id}`}>
                  <Avatar id={p.avatar} size={28} /> <span>{p.isOwner ? `${p.nickname} (adulto)` : p.nickname}</span> <small>Nv {p.level.n}</small>
                </button>
              ))}
              {!profiles && <p className="note">Cargando…</p>}
            </div>
          )}
          {caps.family && <button type="button" role="menuitem" className="acct-item" onClick={pick(() => onGo("family"))} data-testid="menu-family"><Users size={20} strokeWidth={2.4} aria-hidden="true" /> Panel familiar</button>}
          {caps.classrooms && <button type="button" role="menuitem" className="acct-item" onClick={pick(() => onGo("classes"))} data-testid="menu-classes"><School size={20} strokeWidth={2.4} aria-hidden="true" /> Panel docente</button>}
          <button type="button" role="menuitem" className="acct-item" onClick={pick(() => onGo("plans"))} data-testid="menu-plan"><CreditCard size={20} strokeWidth={2.4} aria-hidden="true" /> Mi plan</button>
          <button type="button" role="menuitem" className="acct-item" onClick={pick(onLogout)} data-testid="logout"><LogOut size={20} strokeWidth={2.4} aria-hidden="true" /> Salir</button>
        </div>
      )}
    </div>
  );
}
