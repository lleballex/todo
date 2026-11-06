import { useEffect, type CSSProperties } from "react";

export interface CelebrationPosition {
  id: number;
  left: number;
  top: number;
  width: number;
}

const particles = [
  [5, -28, -46, -140, "#3939ed"],
  [12, 20, -59, 150, "#a9a9ff"],
  [19, -15, 34, 100, "#3b3bea"],
  [27, 28, -38, -100, "#efbb55"],
  [35, -12, -60, 120, "#7777ff"],
  [42, 18, 40, -160, "#3939ed"],
  [50, -26, -42, 140, "#efbb55"],
  [58, 15, -64, -110, "#a9a9ff"],
  [66, -18, 35, 150, "#3939ed"],
  [73, 25, -39, -160, "#7777ff"],
  [80, -14, -55, 120, "#efbb55"],
  [88, 23, 35, -130, "#a9a9ff"],
] as const;
const confetti = [
  ...particles,
  ...particles.map(
    ([x, dx, dy, rotate, color]) =>
      [Math.min(x + 4, 96), -dx, -dy, -rotate, color] as const,
  ),
];

export function CompletionCelebration({
  position,
  onFinish,
}: {
  position: CelebrationPosition;
  onFinish: (id: number) => void;
}) {
  useEffect(() => {
    const timeout = window.setTimeout(() => onFinish(position.id), 1250);
    return () => window.clearTimeout(timeout);
  }, [onFinish, position.id]);

  return (
    <div
      className="completion-celebration"
      aria-hidden="true"
      style={{ left: position.left, top: position.top, width: position.width }}
    >
      {confetti.map(([x, dx, dy, rotate, color], index) => (
        <span
          key={index}
          className="completion-particle"
          style={
            {
              left: `${x}%`,
              "--particle-x": `${dx}px`,
              "--particle-arc-x": `${Math.round(dx * 0.55)}px`,
              "--particle-peak-y": `${Math.round(dy * 0.7)}px`,
              "--particle-sway-y": `${dy + 8}px`,
              "--particle-sway-x": `${Math.round(dx * 0.7) + (index % 2 ? 10 : -10)}px`,
              "--particle-fall-y": `${dy + 30 + (index % 3) * 5}px`,
              "--particle-rotation": `${rotate}deg`,
              "--particle-end-rotation": `${rotate * 2}deg`,
              "--particle-color": color,
              "--particle-delay": `${(index % 5) * 20}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
