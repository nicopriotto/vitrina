import React, { createContext, useContext } from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { easeDraw, lerp, prog } from "./anim";
import { MONO, SANS } from "./fonts";
import { C } from "./theme";
import { cue } from "./timing";

/** Where the current beat starts (global frame) and how long it lasts. */
export const BeatCtx = createContext({ from: 0, len: 60 });
export const useBeat = () => useContext(BeatCtx);
/** Local frame of a spoken phrase inside the current beat. */
export const useCue = () => {
  const { from } = useBeat();
  // search from the start of this beat, so a phrase said earlier in the video is never matched
  return (phrase: string, after = from / 30) => Math.max(0, cue(phrase, after) - from);
};

/** Screen zones. Text always lives on the left, visuals on the right: nothing overlaps. */
export const ZONE = { textL: 120, textW: 800, visL: 980, visW: 820, top: 96, h: 800 };

export const Pop: React.FC<{ at: number; children: React.ReactNode; dy?: number; style?: React.CSSProperties }> = ({ at, children, dy = 28, style }) => {
  const p = prog(useCurrentFrame(), at, 12);
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * dy}px) scale(${lerp(0.96, 1, p)})`, ...style }}>{children}</div>;
};

export const Typed: React.FC<{ text: string; at: number; cps?: number; style?: React.CSSProperties }> = ({ text, at, cps = 38, style }) => {
  const f = useCurrentFrame();
  const n = Math.max(0, Math.min(text.length, Math.floor(((f - at) / 30) * cps)));
  const caret = f - at >= 0 && n < text.length;
  return (
    <span style={style}>
      {text.slice(0, n)}
      {caret && <span style={{ color: C.accent }}>|</span>}
    </span>
  );
};

export const CountUp: React.FC<{ to: number; at: number; dur?: number; fmt?: (n: number) => string; style?: React.CSSProperties }> = ({ to, at, dur = 36, fmt = (n) => String(Math.round(n)), style }) => {
  const p = prog(useCurrentFrame(), at, dur);
  return <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>{fmt(to * p)}</span>;
};

export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; accent?: boolean }> = ({ children, style, accent }) => (
  <div style={{ background: C.surface, border: `1px solid ${accent ? C.accent : C.hair}`, borderRadius: 20, ...style }}>{children}</div>
);

export const Chip: React.FC<{ children: React.ReactNode; color?: string; border?: string; size?: number }> = ({ children, color = C.fg, border = C.hair, size = 30 }) => (
  <span style={{ display: "inline-block", fontFamily: MONO, fontSize: size, color, padding: "10px 22px", borderRadius: 14, border: `1px solid ${border}`, background: C.surface }}>{children}</span>
);

/** Big headline on the left, with a visual slot on the right. */
export const Split: React.FC<{ text: string; hi?: string[]; size?: number; at?: number; children?: React.ReactNode; textAt?: number }> = ({ text, hi = [], size = 104, at = 4, children }) => {
  const f = useCurrentFrame();
  const words = text.split(" ");
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: ZONE.textL, top: ZONE.top, width: ZONE.textW, height: ZONE.h, display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: `0 ${size * 0.25}px`, fontFamily: SANS, fontWeight: 600, fontSize: size, lineHeight: 1.04, letterSpacing: "-0.035em" }}>
          {words.map((w, i) => {
            const p = prog(f, at + i * 3, 14);
            const marked = hi.includes(w.replace(/[^\w'$]/g, ""));
            const sweep = marked ? prog(f, at + i * 3 + 8, 16, easeDraw) : 0;
            return (
              <span key={i} style={{ position: "relative", display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 0.35 * size}px)` }}>
                {marked && <span style={{ position: "absolute", left: 0, bottom: size * 0.04, height: size * 0.14, width: `${sweep * 100}%`, background: C.accent, zIndex: -1 }} />}
                {w}
              </span>
            );
          })}
        </div>
      </div>
      <div style={{ position: "absolute", left: ZONE.visL, top: ZONE.top, width: ZONE.visW, height: ZONE.h }}><Drift amp={0.8}>{children}</Drift></div>
    </AbsoluteFill>
  );
};

export const Stage: React.FC<{ label?: string; children: React.ReactNode }> = ({ label, children }) => (
  <AbsoluteFill>
    {label && <div style={{ position: "absolute", left: ZONE.textL, top: 56, fontFamily: MONO, fontSize: 26, color: C.fg3 }}>{label}</div>}
    <div style={{ position: "absolute", left: 120, right: 120, top: ZONE.top + 20, height: ZONE.h - 20, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>
  </AbsoluteFill>
);

export const Img: React.FC<{ name: string; size: number; style?: React.CSSProperties }> = ({ name, size, style }) => (
  <div style={{ width: size, height: size * 1.1, borderRadius: 16, background: "#f3f0e8", display: "grid", placeItems: "center", ...style }}>
    <img src={staticFile(`mock/${name}.webp`)} style={{ width: "88%", height: "88%", objectFit: "contain" }} />
  </div>
);

/** Slow continuous drift so nothing on screen is ever perfectly still. */
export const Drift: React.FC<{ children: React.ReactNode; amp?: number }> = ({ children, amp = 1 }) => {
  const f = useCurrentFrame();
  return <div style={{ width: "100%", height: "100%", transform: `translate(${Math.sin(f / 40) * 6 * amp}px, ${Math.cos(f / 33) * 5 * amp}px) scale(${1 + f * 0.00035 * amp})` }}>{children}</div>;
};
