import React from "react";
import { AbsoluteFill, Img as RImg, staticFile, useCurrentFrame } from "remotion";
import { easeDraw, lerp, prog } from "../anim";
import { MONO, SANS } from "../fonts";
import { C } from "../theme";

export const PP = { blue: "#0070e0", navy: "#003087", yellow: "#ffc439", soft: "rgba(0,112,224,0.16)" };
export const PERSONA = { sam: { initial: "S", name: "Sam", role: "buyer", color: "#c9b99a" }, maya: { initial: "M", name: "Maya", role: "owner, Lumen Studio", color: "#8e9a82" } };

const NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/**
 * The signature: frosted shop-window glass. `amount` 0..1 frosts whatever is behind it;
 * `clear` 0..1 wipes it clear from left to right (Vitrina reading the store).
 */
export const Frost: React.FC<{ amount: number; clear?: number; style?: React.CSSProperties }> = ({ amount, clear = 0, style }) => {
  if (amount <= 0.001) return null;
  const edge = clear * 120 - 10;
  const mask = clear > 0 ? `linear-gradient(90deg, transparent ${edge}%, black ${edge + 20}%)` : undefined;
  return (
    <AbsoluteFill
      style={{
        backdropFilter: `blur(${amount * 22}px) saturate(${1 - 0.5 * amount}) brightness(${1 - 0.18 * amount})`,
        WebkitBackdropFilter: `blur(${amount * 22}px) saturate(${1 - 0.5 * amount})`,
        background: `rgba(30,30,33,${0.22 * amount})`,
        maskImage: mask,
        WebkitMaskImage: mask,
        ...style,
      }}
    >
      <AbsoluteFill style={{ backgroundImage: NOISE, opacity: 0.22 * amount, mixBlendMode: "overlay" }} />
      <AbsoluteFill style={{ background: "linear-gradient(115deg, rgba(255,255,255,0.10) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.05) 100%)", opacity: amount }} />
    </AbsoluteFill>
  );
};

/** Grows from nothing (height and opacity), so new chat items push older ones up smoothly. */
export const Reveal: React.FC<{ at: number; children: React.ReactNode; h?: number; style?: React.CSSProperties }> = ({ at, children, h = 420, style }) => {
  const f = useCurrentFrame();
  const p = prog(f, at, 14);
  if (f < at) return null;
  return <div style={{ maxHeight: p * h, opacity: prog(f, at + 3, 12), transform: `translateY(${(1 - p) * 14}px)`, overflow: "hidden", flexShrink: 0, ...style }}>{children}</div>;
};

export const Fade: React.FC<{ at: number; children: React.ReactNode; dur?: number; dy?: number; style?: React.CSSProperties }> = ({ at, children, dur = 14, dy = 16, style }) => {
  const p = prog(useCurrentFrame(), at, dur);
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * dy}px)`, ...style }}>{children}</div>;
};

export const Avatar: React.FC<{ who: keyof typeof PERSONA; size?: number }> = ({ who, size = 44 }) => {
  const p = PERSONA[who];
  return (
    <span style={{ width: size, height: size, borderRadius: size, background: p.color, color: "#141415", display: "inline-grid", placeItems: "center", fontFamily: SANS, fontWeight: 600, fontSize: size * 0.46, flexShrink: 0 }}>{p.initial}</span>
  );
};

/** Who we're looking at: a small, consistent name tag. */
export const Persona: React.FC<{ who: keyof typeof PERSONA; at?: number; style?: React.CSSProperties }> = ({ who, at = 0, style }) => {
  const p = PERSONA[who];
  return (
    <Fade at={at} style={{ display: "flex", alignItems: "center", gap: 14, ...style }}>
      <Avatar who={who} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontFamily: SANS, fontSize: 28, fontWeight: 500, color: C.fg }}>{p.name}</span>
        <span style={{ fontFamily: MONO, fontSize: 19, color: C.fg3 }}>{p.role}</span>
      </div>
    </Fade>
  );
};

/** Sam's phone: a plain assistant app. Children fill the chat area, bottom aligned. */
export const Phone: React.FC<{ x: number; y?: number; children?: React.ReactNode; input?: React.ReactNode; overlay?: React.ReactNode; enter?: boolean }> = ({ x, y = 0, children, input, overlay, enter }) => {
  const f = useCurrentFrame();
  const e = enter ? prog(f, 0, 40) : 1;
  const W = 420;
  const H = 840;
  return (
    <div
      style={{
        position: "absolute",
        left: x - W / 2,
        top: 540 - H / 2 - 40 + y,
        width: W,
        height: H,
        transform: `perspective(2400px) rotateY(${lerp(16, 7, e) + Math.sin(f / 50) * 0.8}deg) rotateX(${2 + Math.cos(f / 60) * 0.5}deg) translateY(${(1 - e) * 40}px)`,
        opacity: e,
        borderRadius: 62,
        background: "#0a0a0b",
        padding: 12,
        border: `1px solid ${C.hair}`,
        boxShadow: "0 50px 120px rgba(0,0,0,0.6), inset 0 0 0 2px #1d1d20",
      }}
    >
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 50, background: "#111113", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 34px", fontFamily: SANS, fontWeight: 600, fontSize: 19, color: C.fg }}>
          <span>11:04</span>
          <span style={{ width: 110, height: 30, borderRadius: 20, background: "#000" }} />
          <span style={{ display: "flex", gap: 3, alignItems: "flex-end" }}>
            {[8, 11, 14, 17].map((h) => (
              <i key={h} style={{ width: 4, height: h, borderRadius: 1, background: C.fg }} />
            ))}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 22px 14px", borderBottom: `1px solid ${C.hair}` }}>
          <span style={{ width: 28, height: 28, borderRadius: 9, background: C.raised, display: "grid", placeItems: "center" }}>
            <span style={{ width: 10, height: 10, borderRadius: 10, background: C.fg2 }} />
          </span>
          <span style={{ fontFamily: SANS, fontSize: 21, fontWeight: 500, color: C.fg }}>Assistant</span>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 14, padding: "16px 20px", overflow: "hidden" }}>{children}</div>
        <div style={{ margin: "0 16px 22px", minHeight: 56, borderRadius: 28, background: C.raised, display: "flex", alignItems: "center", padding: "10px 22px", fontFamily: SANS, fontSize: 20, color: C.fg }}>{input ?? <span style={{ color: C.fg3 }}>Ask anything</span>}</div>
        {overlay}
      </div>
    </div>
  );
};

export const UserMsg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ alignSelf: "flex-end", maxWidth: "86%", background: C.fg, color: "#141415", borderRadius: "22px 22px 6px 22px", padding: "12px 18px", fontFamily: SANS, fontSize: 21, lineHeight: 1.3 }}>{children}</div>
);

export const AgentMsg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: SANS, fontSize: 21, lineHeight: 1.35, color: C.fg }}>{children}</div>
);

/** A tool call as the assistant shows it: monospace, with where it went. */
export const ToolRow: React.FC<{ name: string; where: string; at: number; doneAt: number; tint?: string }> = ({ name, where, at, doneAt, tint = C.fg2 }) => {
  const f = useCurrentFrame();
  const done = f >= doneAt;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 14, background: C.surface, border: `1px solid ${C.hair}`, fontFamily: MONO, fontSize: 17 }}>
      <span style={{ width: 16, height: 16, borderRadius: 16, border: `2px solid ${done ? C.pos : C.fg3}`, borderTopColor: done ? C.pos : "transparent", transform: `rotate(${done ? 0 : (f - at) * 18}deg)`, display: "grid", placeItems: "center", color: C.pos, fontSize: 11 }}>{done ? "✓" : ""}</span>
      <span style={{ color: tint }}>{name}</span>
      <span style={{ color: C.fg3, marginLeft: "auto" }}>{where}</span>
    </div>
  );
};

export const TeeIcon: React.FC<{ size: number; color?: string }> = ({ size, color = "#5b5b61" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M32 16 L43 11 Q50 19 57 11 L68 16 L88 31 L79 44 L70 38 L70 90 L30 90 L30 38 L21 44 L12 31 Z" fill={color} />
  </svg>
);

export const ProductTile: React.FC<{ img?: string; size: number; muted?: boolean }> = ({ img, size, muted }) => (
  <div style={{ width: size, height: size, borderRadius: 12, background: muted ? "#232326" : "#f3f0e8", display: "grid", placeItems: "center", flexShrink: 0, overflow: "hidden" }}>
    {img ? <RImg src={staticFile(`mock/${img}.webp`)} style={{ width: "86%", height: "86%", objectFit: "contain" }} /> : <TeeIcon size={size * 0.7} />}
  </div>
);

/** A panel with a mono header, used for logs beside the phone. */
export const Panel: React.FC<{ title: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties }> = ({ title, right, children, style }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.hair}`, borderRadius: 22, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.35)", ...style }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 26px", borderBottom: `1px solid ${C.hair}`, fontFamily: MONO, fontSize: 21, color: C.fg2 }}>
      {title}
      <span style={{ marginLeft: "auto" }}>{right}</span>
    </div>
    <div style={{ padding: "20px 26px" }}>{children}</div>
  </div>
);

export const LiveDot: React.FC<{ color?: string }> = ({ color = C.pos }) => {
  const f = useCurrentFrame();
  return <span style={{ width: 11, height: 11, borderRadius: 11, background: color, boxShadow: `0 0 0 ${4 + Math.sin(f / 6) * 3}px ${color}33`, display: "inline-block" }} />;
};

// ---------- the store's page as an agent reads it (real markup from /mock/lumen/p/remera-classic) ----------
export type HtmlKey = "title" | "price" | "black" | "size" | "stock" | "note";
export const HTML: [string, HtmlKey?][] = [
  ['<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/>'],
  ['<link rel="stylesheet" href="/_next/static/css/app/layout.css?v=1794278256429"/>'],
  ['<script src="/_next/static/chunks/webpack.js" async=""></script>'],
  ['<script src="/_next/static/chunks/main-app.js" async=""></script>'],
  ["</head><body><div class=\"bar\">Free shipping over $75 · Made in Brooklyn</div>"],
  ['<header><nav><a href="/mock/lumen">Shop</a><a>Tees</a><a>Sweatshirts</a></nav>'],
  ['<main class="pdp"><div class="img"><img src="/mock/lumen/tee-ink.webp"/>'],
  ['</div><div><div class="label">Lumen Studio</div>'],
  ["<h1>Classic Tee</h1>", "title"],
  ['<div class="price">$32.00</div>', "price"],
  ['<p class="desc">Our everyday tee. 180 gsm combed cotton jersey,'],
  ["relaxed straight fit, pre-washed so it feels broken-in…</p>"],
  ['<div class="label">Color</div><div class="swatches">'],
  ['<span class="sw"><i style="background:#17171a"></i>Black</span>', "black"],
  ['<span class="sw"><i style="background:#1f2a44"></i>Navy</span>'],
  ['<span class="sw"><i style="background:#8e9a82"></i>Sage</span>'],
  ['<div class="label">Size</div><div class="sizes"><span class="sz">S</span>'],
  ['<span class="sz">M</span><span class="sz">L</span><span class="sz">XL</span>', "size"],
  ["<li>Black<!-- -->: <!-- -->in stock in S, M, L<!-- --> (sold out in XL)</li>", "stock"],
  ['<button class="add" type="button">Add to cart</button>'],
  ['<div class="note">Checkout is coming soon. DM us on Instagram to order.</div>', "note"],
  ['<script>self.__next_f.push([1,"6e:\\"$Sreact.suspense\\"\\n72:I[\\"(app-pages-'],
  ['browser)/./node_modules/.pnpm/next@15.5.29/dist/client/components/'],
  ['builtin/global-error.js\\",[\\"app-pages-internals\\"]\\n:HL[\\"/_next/'],
  ['static/css/app/(mock)/mock/lumen/layout.css\\",\\"style\\"]\\n:N17942'],
  ['78256493.4363\\n3:\\"$EObject.defineProperty(()=>{ctx.componentMod.'],
  ['preloadStyle(fullHref,ctx.renderOpts.crossOrigin,ctx.nonce)})\\"'],
  ['</script><footer><span>© 2026 Lumen Studio · 214 Bedford Ave</span>'],
];

export const HtmlSoup: React.FC<{ lit?: Partial<Record<HtmlKey, number>>; color?: Partial<Record<HtmlKey, string>>; scroll?: number; size?: number; dim?: number }> = ({ lit = {}, color = {}, scroll = 0, size = 19, dim = 1 }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ fontFamily: MONO, fontSize: size, lineHeight: 1.62, whiteSpace: "pre", transform: `translateY(${-scroll}px)` }}>
      {HTML.map(([line, key], i) => {
        const at = key ? lit[key] : undefined;
        const p = at !== undefined ? prog(f, at, 10) : 0;
        const hue = (key && color[key]) || C.accent;
        return (
          <div key={i} style={{ position: "relative", padding: "0 14px", opacity: lerp(dim, 1, p) }}>
            <span style={{ position: "absolute", inset: 0, background: hue, opacity: p * 0.16, borderLeft: `3px solid ${hue}` }} />
            {line.split(/(<[^>]+>)/).map((tok, k) => (
              <span key={k} style={{ position: "relative", color: tok.startsWith("<") ? (p > 0.5 ? C.fg2 : "#5f5f66") : p > 0.5 ? C.fg : C.fg2 }}>{tok}</span>
            ))}
          </div>
        );
      })}
    </div>
  );
};

/** A line that draws itself between two points (with an optional curve). */
export const Wire: React.FC<{ d: string; len: number; at: number; dur?: number; color?: string; width?: number; dash?: boolean }> = ({ d, len, at, dur = 20, color = C.fg3, width = 2.5, dash }) => {
  const p = prog(useCurrentFrame(), at, dur, easeDraw);
  if (dash) return <path d={d} fill="none" stroke={color} strokeWidth={width} strokeDasharray="6 8" opacity={p} />;
  return <path d={d} fill="none" stroke={color} strokeWidth={width} strokeDasharray={len} strokeDashoffset={len * (1 - p)} strokeLinecap="round" />;
};
