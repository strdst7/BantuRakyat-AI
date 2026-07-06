"use client";

import { useEffect, useRef, useState } from "react";
import { Landmark, HandCoins, HeartPulse, GraduationCap, Home } from "lucide-react";

const FLOATERS = [
  { Icon: HandCoins, label: "STR", x: "8%", y: "22%", z: 60, delay: 0, tint: "text-kuning-400" },
  { Icon: HeartPulse, label: "MySalam", x: "82%", y: "18%", z: 90, delay: 1.2, tint: "text-merah-500" },
  { Icon: GraduationCap, label: "PTPTN", x: "72%", y: "68%", z: 40, delay: 2.1, tint: "text-biru-200" },
  { Icon: Home, label: "RMR", x: "14%", y: "70%", z: 75, delay: 0.7, tint: "text-hijau-400" },
];

export default function HeroScene() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [scroll, setScroll] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (frame.current) return;
      frame.current = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        setTilt({ x, y });
        frame.current = null;
      });
    };
    const onScroll = () => setScroll(window.scrollY);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden scene-3d">
      {/* Aurora blobs */}
      <div
        className="absolute -top-24 -left-20 h-[26rem] w-[26rem] rounded-full bg-biru-400/40 blur-3xl animate-drift"
        style={{ transform: `translate(${tilt.x * -20}px, ${tilt.y * -20 + scroll * 0.15}px)` }}
      />
      <div
        className="absolute top-10 right-0 h-[30rem] w-[30rem] rounded-full bg-kuning-400/30 blur-3xl animate-drift"
        style={{ animationDelay: "-6s", transform: `translate(${tilt.x * 24}px, ${tilt.y * 24 + scroll * 0.1}px)` }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-[22rem] w-[22rem] rounded-full bg-hijau-400/25 blur-3xl animate-drift"
        style={{ animationDelay: "-11s" }}
      />

      {/* Perspective grid */}
      <div className="absolute inset-0 grid-glow opacity-60" />

      {/* Rotating halo behind the emblem */}
      <div
        className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full border border-white/15 animate-spin-slow"
        style={{ transform: `translate(-50%,-50%) rotateX(62deg)` }}
      />
      <div
        className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 h-52 w-52 rounded-full border border-kuning-400/25 animate-spin-slow"
        style={{ animationDirection: "reverse", transform: `translate(-50%,-50%) rotateX(62deg)` }}
      />

      {/* Central floating emblem */}
      <div
        className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2"
        style={{
          transform: `translate(-50%,-50%) rotateX(${tilt.y * -6}deg) rotateY(${tilt.x * 8}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        <div className="animate-floaty">
          <div className="relative grid place-items-center h-28 w-28 rounded-3xl glass-dark shadow-2xl animate-ring-pulse">
            <Landmark className="h-12 w-12 text-kuning-400" />
          </div>
        </div>
      </div>

      {/* Floating benefit chips */}
      {FLOATERS.map(({ Icon, label, x, y, z, delay, tint }) => (
        <div
          key={label}
          className="absolute"
          style={{
            left: x,
            top: y,
            transform: `translate(${tilt.x * (z / 3)}px, ${tilt.y * (z / 3) + scroll * (z / 900)}px)`,
          }}
        >
          <div className="animate-floaty" style={{ animationDelay: `${delay}s` }}>
            <div className="flex items-center gap-2 rounded-2xl glass-dark px-3 py-2 shadow-xl">
              <Icon className={`h-5 w-5 ${tint}`} />
              <span className="text-xs font-semibold text-white/90">{label}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
