"use client";

import {
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";

export default function TiltCard({
  children,
  className = "",
  max = 10,
  glare = true,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  glare?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [glareStyle, setGlareStyle] = useState<React.CSSProperties>({
    opacity: 0,
  });

  const handleMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * (max * 2);
    const rotateX = (0.5 - py) * (max * 2);
    setStyle({
      transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`,
      boxShadow: `${-rotateY * 1.4}px ${rotateX * 1.4 + 22}px 48px -22px rgba(8,21,52,0.35)`,
    });
    if (glare) {
      setGlareStyle({
        opacity: 1,
        background: `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,0.55), transparent 45%)`,
      });
    }
  };

  const reset = () => {
    setStyle({ transform: "rotateX(0) rotateY(0)" });
    setGlareStyle({ opacity: 0 });
  };

  return (
    <div className="scene-3d">
      <div
        ref={ref}
        onPointerMove={handleMove}
        onPointerLeave={reset}
        className={`tilt-card relative ${className}`}
        style={style}
      >
        {children}
        {glare && (
          <div
            className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
            style={glareStyle}
          />
        )}
      </div>
    </div>
  );
}
