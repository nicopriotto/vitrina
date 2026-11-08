import React from "react";
import { AbsoluteFill, Audio, Freeze, Img as RImg, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { easeDraw, easeOut, lerp, prog } from "../anim";
import { MONO, SANS } from "../fonts";
import { footage, hasFootage, type Cam } from "../shots";
import { take } from "../timing";
import { C, FPS } from "../theme";
import audio from "../data/audio.json";

/** Quiet graphite background with a hairline grid that drifts slowly (parallax). */
const TICKER = "search_products  ·  create_checkout  ·  get_order_status  ·  get_product  ·  get_store_info  ·  ";
export const Bg: React.FC = () => {
  const f = useCurrentFrame();
  const d = (f * 0.18) % 96;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${C.hair} 1px, transparent 1px), linear-gradient(90deg, ${C.hair} 1px, transparent 1px)`,
          backgroundSize: "96px 96px",
          backgroundPosition: `${-d}px ${-d * 0.6}px`,
          opacity: 0.35,
          maskImage: "radial-gradient(ellipse at 50% 45%, black 20%, transparent 75%)",
        }}
      />
    </AbsoluteFill>
  );
};

/** Section wrapper: scale + blur + fade in, and an exit that pushes toward the viewer. */
export const Part: React.FC<{ from: number; to: number; children: React.ReactNode }> = ({ from, to, children }) => {
  const f = useCurrentFrame();
  const local = f - from;
  const len = to - from;
  const inP = prog(local, 0, 9);
  const outP = prog(local, len - 8, 8, easeDraw);
  const scale = lerp(0.97, 1, inP) * lerp(1, 1.05, outP);
  const opacity = inP * (1 - outP);
  const blur = (1 - inP) * 10 + outP * 8;
  return (
    <AbsoluteFill style={{ transform: `scale(${scale})`, opacity, filter: `blur(${blur}px)` }}>{children}</AbsoluteFill>
  );
};

/** Big kinetic headline: every word rises with a 3 frame stagger; `hi` words get a sweeping accent marker. */
export const Punch: React.FC<{ text: string; at: number; size?: number; hi?: string[]; align?: "left" | "center"; color?: string; style?: React.CSSProperties }> = ({
  text,
  at,
  size = 120,
  hi = [],
  align = "left",
  color = C.fg,
  style,
}) => {
  const f = useCurrentFrame();
  const words = text.split(" ");
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: `0 ${size * 0.26}px`, justifyContent: align === "center" ? "center" : "flex-start", fontFamily: SANS, fontWeight: 600, fontSize: size, lineHeight: 1.04, letterSpacing: "-0.035em", color, ...style }}>
      {words.map((w, i) => {
        const p = prog(f, at + i * 3, 14);
        const marked = hi.includes(w.replace(/[^\w']/g, ""));
        const sweep = marked ? prog(f, at + i * 3 + 8, 16, easeDraw) : 0;
        return (
          <span key={i} style={{ position: "relative", display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 0.35 * size}px)` }}>
            {marked && <span style={{ position: "absolute", left: 0, bottom: size * 0.04, height: size * 0.14, width: `${sweep * 100}%`, background: C.accent, zIndex: -1, opacity: 0.9 }} />}
            <span style={{ color: marked ? C.fg : undefined }}>{w}</span>
          </span>
        );
      })}
    </div>
  );
};

export const Tag: React.FC<{ children: React.ReactNode; at: number; color?: string }> = ({ children, at, color = C.fg3 }) => {
  const p = prog(useCurrentFrame(), at, 14);
  return <div style={{ fontFamily: MONO, fontSize: 26, color, opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>{children}</div>;
};

const FIX: Record<string, string> = { vitrina: "Vitrina", llama: "Llama", paypal: "PayPal", mcp: "MCP", api: "API", claude: "Claude", wix: "Wix", bigcommerce: "BigCommerce", shopware: "Shopware", instagram: "Instagram", tiendanube: "Tiendanube", shopify: "Shopify", html: "HTML", url: "URL", ai: "AI" };

/** Subtitles: each word lights up (0.28 to 1) and rises 6px exactly when it is spoken. */
export const Captions: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  // group into phrases of up to 9 words, cutting at punctuation or pauses over 0.5s
  const groups: [string, number, number][][] = [];
  let cur: [string, number, number][] = [];
  take.words.forEach((w, i) => {
    cur.push(w);
    const next = take.words[i + 1];
    const brk = cur.length >= 9 || /[.?!:]$/.test(w[0]) || (next && next[1] - w[2] > 0.5) || !next;
    if (brk) {
      groups.push(cur);
      cur = [];
    }
  });
  const g = groups.find((grp) => t >= grp[0][1] - 0.15 && t <= grp[grp.length - 1][2] + 0.45);
  if (!g) return null;
  return (
    <div style={{ position: "absolute", left: 160, right: 160, bottom: 96, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0 14px", fontFamily: SANS, fontSize: 44, fontWeight: 500, letterSpacing: "-0.01em" }}>
      {g.map(([w, s], i) => {
        const p = prog(f, Math.round(s * FPS), 5);
        const key = w.toLowerCase().replace(/[^a-z']/g, "");
        return (
          <span key={i} style={{ color: C.fg, opacity: 0.28 + 0.72 * p, transform: `translateY(${(1 - p) * 6}px)`, textShadow: "0 2px 24px rgba(0,0,0,0.6)" }}>
            {FIX[key] ? w.replace(new RegExp(key, "i"), FIX[key]) : w}
          </span>
        );
      })}
    </div>
  );
};

function camAt(cam: Cam, sec: number): [number, number, number] {
  if (sec <= cam[0][0]) return [cam[0][1], cam[0][2], cam[0][3]];
  for (let i = 0; i < cam.length - 1; i++) {
    const [t0, z0, x0, y0] = cam[i];
    const [t1, z1, x1, y1] = cam[i + 1];
    if (sec <= t1) {
      const p = easeDraw(Math.min(1, Math.max(0, (sec - t0) / Math.max(0.001, t1 - t0))));
      return [lerp(z0, z1, p), lerp(x0, x1, p), lerp(y0, y1, p)];
    }
  }
  const l = cam[cam.length - 1];
  return [l[1], l[2], l[3]];
}

/** A recorded clip inside a browser frame, tilted in 3D, with a smoothed zoom/pan camera. */
export const Browser: React.FC<{ clip?: string; still?: string; start?: number; delay?: number; rate?: number; cam: Cam; url: string; width?: number; tilt?: number; x?: number; y?: number; enter?: boolean; children?: React.ReactNode; blur?: number }> = ({
  blur = 0,
  clip = "",
  still,
  delay = 0,
  rate = 1,
  children,
  start = 0,
  cam,
  url,
  width = 1500,
  tilt = 1,
  x = 0,
  y = 0,
  enter = false,
}) => {
  const frame = useCurrentFrame();
  const clipF = hasFootage(clip) ? Math.max(1, Math.floor(((footage[clip].duration - start - 0.15) * FPS) / rate)) : 0;
  const delayF = Math.round(delay * FPS);
  const startF = Math.round(start * FPS);
  const h = Math.round((width * 9) / 16);
  // one constant pose for every shot, so crossfades between screens feel like the same device
  const settle = enter ? prog(frame, 0, 60) : 1;
  const rotY = lerp(14 * tilt, -4 * tilt, settle) + Math.sin(frame / 52) * 0.8 * tilt;
  const rotX = lerp(5 * tilt, 1 * tilt, settle) + Math.cos(frame / 61) * 0.5 * tilt;
  const [z, fx, fy] = camAt(cam, frame / FPS);
  const bar = Math.max(30, width * 0.028);
  return (
    <div style={{ position: "absolute", left: "50%", top: "50%", transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) perspective(2600px) rotateY(${rotY}deg) rotateX(${rotX}deg)`, width, borderRadius: 16, overflow: "hidden", background: C.deep, border: `1px solid ${C.hair}`, boxShadow: "0 40px 120px rgba(0,0,0,0.55)" }}>
      <div style={{ height: bar, display: "flex", alignItems: "center", gap: 6, padding: "0 14px", background: C.surface, borderBottom: `1px solid ${C.hair}` }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 9, height: 9, borderRadius: 5, background: C.raised }} />
        ))}
        <div style={{ marginLeft: 10, flex: 1, height: bar * 0.58, borderRadius: 7, background: C.bg, fontFamily: MONO, fontSize: Math.max(11, width * 0.01), color: C.fg3, display: "flex", alignItems: "center", padding: "0 10px" }}>{url}</div>
      </div>
      <div style={{ position: "relative", width, height: h, overflow: "hidden" }}>
        {still ? (
          <div style={{ position: "absolute", inset: 0, transformOrigin: `${fx * 100}% ${fy * 100}%`, transform: `scale(${z})`, filter: blur > 0.05 ? `blur(${blur}px) saturate(${1 - blur / 30})` : undefined }}>
            <RImg src={staticFile(still)} style={{ width, height: h, objectFit: "cover", objectPosition: "top" }} />
            {children}
          </div>
        ) : hasFootage(clip) ? (
          <div style={{ position: "absolute", inset: 0, transformOrigin: `${fx * 100}% ${fy * 100}%`, transform: `scale(${z})`, filter: blur > 0.05 ? `blur(${blur}px) saturate(${1 - blur / 30})` : undefined }}>
            {delayF > 0 && (
              <Sequence durationInFrames={delayF}>
                <Freeze frame={0}>
                  <OffthreadVideo src={staticFile(`footage/${clip}.mp4`)} startFrom={startF} style={{ width, height: h }} muted />
                </Freeze>
              </Sequence>
            )}
            <Sequence from={delayF} durationInFrames={clipF}>
              <OffthreadVideo src={staticFile(`footage/${clip}.mp4`)} startFrom={startF} playbackRate={rate} style={{ width, height: h }} muted />
            </Sequence>
            <Sequence from={delayF + clipF}>
              <Freeze frame={0}>
                <OffthreadVideo src={staticFile(`footage/${clip}.mp4`)} startFrom={startF + Math.floor(clipF * rate) - 1} style={{ width, height: h }} muted />
              </Freeze>
            </Sequence>
            {children}
          </div>
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: MONO, fontSize: 24, color: C.fg3 }}>{`footage pending: npm run record (${clip})`}</div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(115deg, rgba(255,255,255,0.05) 0%, transparent 35%)", pointerEvents: "none" }} />
      </div>
    </div>
  );
};

export const Money: React.FC<{ value: number; at: number; size?: number; color?: string }> = ({ value, at, size = 120, color = C.fg }) => {
  const p = prog(useCurrentFrame(), at, 26);
  return <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: size, letterSpacing: "-0.03em", color, fontVariantNumeric: "tabular-nums", opacity: p > 0 ? 1 : 0 }}>${(value * p).toFixed(2)}</span>;
};

/** Stamp that slams in with a ring that pulses once. */
export const Stamp: React.FC<{ label: string; at: number }> = ({ label, at }) => {
  const f = useCurrentFrame();
  const p = prog(f, at, 10);
  const ring = prog(f, at + 4, 30);
  return (
    <div style={{ position: "relative", opacity: p, transform: `scale(${lerp(1.5, 1, p)})` }}>
      <div style={{ position: "absolute", inset: -14, borderRadius: 22, border: `3px solid ${C.pos}`, opacity: 1 - ring, transform: `scale(${1 + ring * 0.25})` }} />
      <div style={{ padding: "10px 30px", borderRadius: 14, border: `3px solid ${C.pos}`, color: C.pos, fontFamily: MONO, fontWeight: 500, fontSize: 54, letterSpacing: "0.04em" }}>{label}</div>
    </div>
  );
};

/** Diagram node + connector that trace themselves (SVG strokeDashoffset). */
export const DrawnBox: React.FC<{ x: number; y: number; w: number; h: number; label: string; sub?: string; at: number; accent?: boolean }> = ({ x, y, w, h, label, sub, at, accent }) => {
  const f = useCurrentFrame();
  const len = 2 * (w + h);
  const p = prog(f, at, 24, easeDraw);
  const t = prog(f, at + 14, 14);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={16} fill="none" stroke={accent ? C.accent : C.fg3} strokeWidth={2.5} strokeDasharray={len} strokeDashoffset={len * (1 - p)} />
      <text x={x + w / 2} y={y + h / 2 + (sub ? -4 : 10)} textAnchor="middle" fontFamily={SANS} fontWeight={500} fontSize={34} fill={C.fg} opacity={t}>{label}</text>
      {sub && <text x={x + w / 2} y={y + h / 2 + 34} textAnchor="middle" fontFamily={MONO} fontSize={22} fill={C.fg3} opacity={t}>{sub}</text>}
    </g>
  );
};

export const DrawnArrow: React.FC<{ x1: number; x2: number; y: number; at: number; label?: string }> = ({ x1, x2, y, at, label }) => {
  const f = useCurrentFrame();
  const p = prog(f, at, 20, easeDraw);
  const len = x2 - x1;
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={C.fg3} strokeWidth={2.5} strokeDasharray={len} strokeDashoffset={len * (1 - p)} />
      <path d={`M ${x2 - 14} ${y - 10} L ${x2} ${y} L ${x2 - 14} ${y + 10}`} fill="none" stroke={C.fg3} strokeWidth={2.5} opacity={p > 0.95 ? 1 : 0} />
      {label && <text x={(x1 + x2) / 2} y={y - 22} textAnchor="middle" fontFamily={MONO} fontSize={21} fill={C.fg2} opacity={prog(f, at + 10, 12)}>{label}</text>}
    </g>
  );
};

/** Music (if the file exists) ducked under the voice; the voice itself. */
export const Sound: React.FC<{ total: number }> = ({ total }) => {
  const vol = (frame: number) => {
    const t = frame / FPS;
    const speaking = take.words.some(([, s, e]) => t >= s - 0.2 && t <= e + 0.3);
    const fade = Math.min(interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" }), interpolate(frame, [total - 45, total], [1, 0], { extrapolateLeft: "clamp" }));
    return (speaking ? 0.16 : 0.28) * fade;
  };
  return (
    <>
      {audio.voice && <Audio src={staticFile(`audio/${audio.voice}`)} />}
      {audio.music && <Audio src={staticFile(`audio/${audio.music}`)} volume={vol} />}
    </>
  );
};

export { easeOut };
