import { BookOpen, Leaf, Rocket, Star, Zap } from "lucide-react";
import { Cero } from "./Cero";

export const AVATARS = [
  { id: "zero", label: "Cero" },
  { id: "rocket", label: "Cohete" },
  { id: "book", label: "Libro" },
  { id: "star", label: "Estrella" },
  { id: "bolt", label: "Rayo" },
  { id: "leaf", label: "Hoja" },
];
const ICONS = { rocket: Rocket, book: BookOpen, star: Star, bolt: Zap, leaf: Leaf };

export default function Avatar({ id = "zero", size = 56 }) {
  const Icon = ICONS[id];
  return (
    <span className={`avatar avatar-${id}`} style={{ width: size, height: size }} aria-hidden="true">
      {Icon ? <Icon size={size * 0.52} strokeWidth={2.4} /> : <Cero mood="feliz" decorative />}
    </span>
  );
}
