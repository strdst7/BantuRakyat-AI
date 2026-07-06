"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  durationMs?: number;
  prefix?: string;
}

export default function CountUp({ value, durationMs = 1200, prefix = "RM" }: Props) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs]);

  return (
    <span>
      {prefix}
      {display.toLocaleString("en-MY")}
    </span>
  );
}
