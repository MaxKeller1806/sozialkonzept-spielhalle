"use client";

import { useEffect, useRef } from "react";

/** Certiano-Farbwelt für die Loginseite (Brandingbereich). */
export const LOGIN_COLORS = {
  navyDeep: "#001428",
  navy: "#002855",
  navyMid: "#003d73",
  navyHover: "#004985",
  accent: "#38bdf8",
} as const;

/** Maximale Auslenkung der Trennkante in px (horizontal, Mitte). */
export const LOGIN_CURVE_BULGE_PX = 80;

const LG_BREAKPOINT = 1024;

/**
 * Kreisbogen-Kante für den Branding-Container.
 * Feste Sagitta in px – gleiche Wölbung auf allen Bildschirmgrößen, keine Endbeulen.
 */
export function useLoginBrandingCurve(bulgePx = LOGIN_CURVE_BULGE_PX) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const apply = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w <= 0 || h <= 0) return;

      if (window.innerWidth < LG_BREAKPOINT) {
        el.style.clipPath = "";
        el.style.setProperty("-webkit-clip-path", "");
        return;
      }

      const s = bulgePx;
      const r = h * h / (8 * s) + s / 2;
      const path = `path('M 0 0 L ${w - s} 0 A ${r} ${r} 0 0 1 ${w - s} ${h} L 0 ${h} Z')`;
      el.style.clipPath = path;
      el.style.setProperty("-webkit-clip-path", path);
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener("resize", apply);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, [bulgePx]);

  return ref;
}
