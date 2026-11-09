import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { easeDraw, lerp, prog } from "./anim";
import { Browser, Stamp } from "./components/kit";
import { MONO, SANS } from "./fonts";
import type { Cam } from "./shots";
import { C } from "./theme";
import { Chip, CountUp, Pop, Typed, useCue } from "./ui";

/**
 * v4: the voice is the clock. One idea per beat; real recordings of the product, big and calm;
 * built scenes only where the voice explains something the product does not show (scraping, the MCP map).
 */

const Clip: React.FC<{ clip: string; start: number; cam: Cam; url: string; enter?: boolean }> = ({ clip, start, cam, url, enter }) => (
  <Browser clip={clip} start={start} cam={cam} url={url} width={1420} x={0} y={-30} tilt={0.5} enter={enter} />
);

const Img: React.FC<{ name: string; w: number; h: number; pad?: number; style?: React.CSSProperties }> = ({ name, w, h, pad = 8, style }) => (
  <div style={{ width: w, height: h, borderRadius: 16, background: "#f3f0e8", display: "grid", placeItems: "center", overflow: "hidden", ...style }}>
    <img src={staticFile(`mock/${name}.webp`)} style={{ width: `${100 - pad * 2}%`, height: `${100 - pad * 2}%`, objectFit: "contain" }} />
  </div>
);

const Cross: React.FC<{ size?: number; p?: number }> = ({ size = 64, p = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 84 84">
    <circle cx={42} cy={42} r={37} fill="none" stroke={C.neg} strokeWidth={4} />
    <path d="M26 26 L58 58 M58 26 L26 58" stroke={C.neg} strokeWidth={5} strokeLinecap="round" strokeDasharray={90} strokeDashoffset={90 * (1 - p)} />
  </svg>
);

const Check: React.FC<{ size?: number; color?: string }> = ({ size = 56, color = C.pos }) => (
  <svg width={size} height={size} viewBox="0 0 84 84">
    <circle cx={42} cy={42} r={37} fill="none" stroke={color} strokeWidth={4} />
    <path d="M24 44 L37 57 L61 28" fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const bubble = (side: "user" | "agent", children: React.ReactNode, tag: string, color?: string) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: side === "user" ? "flex-end" : "flex-start", gap: 10 }}>
    <span style={{ fontFamily: MONO, fontSize: 24, color: color ?? C.fg3 }}>{tag}</span>
    <div style={{ maxWidth: 1100, padding: "26px 40px", borderRadius: 28, background: side === "user" ? C.raised : C.surface, border: `1px solid ${color ?? C.hair}`, fontFamily: SANS, fontSize: 50, color: C.fg }}>{children}</div>
  </div>
);

// 1 · the store, just scrolling
export const S1: React.FC = () => <Clip clip="site" start={0.3} cam={[[0, 1, 0.5, 0.5]]} url="lumenstudio.com" enter />;

// 2 · a shopper asks an agent, the agent can't
export const A1: React.FC = () => {
  const L = useCue();
  const cant = L("can't");
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 240px", gap: 54 }}>
      <Pop at={L("Shoppers") + 4} style={{ alignSelf: "flex-end" }}>{bubble("user", <Typed text="Buy me a black tee from Lumen." at={L("Shoppers") + 10} cps={30} />, "shopper → AI agent")}</Pop>
      <Pop at={L("Ask") + 6} style={{ alignSelf: "flex-start" }}>
        {bubble("agent", <Typed text="I can't buy from that store." at={L("Ask") + 12} cps={26} />, "AI agent", C.neg)}
      </Pop>
    </AbsoluteFill>
  );
};

// 3 · the agent knocks three times and gets nothing back
export const A2: React.FC = () => {
  const L = useCue();
  const f = useCurrentFrame();
  const reqs: [string, string, number][] = [
    ["GET /api/products", "404 · no API", L("API")],
    ["GET /products.xml", "404 · no feed", L("feed")],
    ["POST /checkout", "none · no checkout", L("checkout")],
  ];
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 140, top: 330, width: 280, height: 220, borderRadius: 24, border: `2px solid ${C.fg3}`, background: C.surface, display: "grid", placeItems: "center", fontFamily: SANS, fontSize: 44 }}>
        <div style={{ textAlign: "center" }}>AI agent<div style={{ fontFamily: MONO, fontSize: 22, color: C.fg3, marginTop: 8 }}>wants to buy</div></div>
      </div>
      <div style={{ position: "absolute", left: 1330, top: 290, width: 440, height: 300, borderRadius: 24, border: `2px solid ${C.fg3}`, background: C.surface, padding: 28 }}>
        <div style={{ fontFamily: SANS, fontSize: 40 }}>Lumen Studio</div>
        <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
          {["tee-ink", "hoodie", "jacket-denim"].map((n) => <Img key={n} name={n} w={110} h={130} />)}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 20, color: C.fg3, marginTop: 20 }}>a storefront for people</div>
      </div>
      {reqs.map(([label, back, at], i) => {
        const y = 345 + i * 78;
        const out = prog(f, at, 26, easeDraw); // flies to the store
        const ret = prog(f, at + 34, 26, easeDraw); // bounces back
        const x = lerp(430, 860, out) - lerp(0, 430, ret);
        const hit = prog(f, at + 26, 8) * (1 - prog(f, at + 46, 20));
        return (
          <React.Fragment key={label}>
            <div style={{ position: "absolute", left: x, top: y, opacity: prog(f, at - 4, 4) * (1 - prog(f, at + 56, 12)), fontFamily: MONO, fontSize: 28, padding: "10px 20px", borderRadius: 12, border: `1px solid ${ret > 0 ? C.neg : C.fg3}`, background: C.raised, whiteSpace: "nowrap" }}>{label}</div>
            <div style={{ position: "absolute", left: 1240, top: y - 6, opacity: hit, transform: `scale(${1 + (1 - hit) * 0.4})` }}><Cross size={56} p={1} /></div>
            <div style={{ position: "absolute", left: 470, top: y + 4, opacity: prog(f, at + 52, 10), fontFamily: MONO, fontSize: 26, color: C.neg, whiteSpace: "nowrap" }}>{back}</div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

// 4 · PayPal reaches the big platforms first; Vitrina brings the rest in
export const A3: React.FC = () => {
  const L = useCue();
  const f = useCurrentFrame();
  const bring = L("Vitrina brings");
  const big = ["Wix", "BigCommerce", "Shopware"];
  const rest = ["Your Shopify store", "Your Instagram shop", "Your own website"];
  const flip = prog(f, bring, 16);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", gap: 120, alignItems: "flex-start" }}>
        <div style={{ width: 640 }}>
          <Pop at={L("PayPal") + 2}><div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 54, marginBottom: 30 }}>Big platforms <span style={{ color: C.fg3, fontWeight: 400 }}>· first</span></div></Pop>
          {big.map((n, i) => (
            <Pop key={n} at={L("big platforms") + i * 8}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 30px", marginBottom: 16, borderRadius: 18, background: C.surface, border: `1px solid ${C.hair}`, fontFamily: SANS, fontSize: 40 }}>
                <span>{n}</span><Check size={46} />
              </div>
            </Pop>
          ))}
        </div>
        <div style={{ width: 640 }}>
          <Pop at={L("PayPal") + 10}><div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 54, marginBottom: 30 }}>Every other store</div></Pop>
          {rest.map((n, i) => (
            <Pop key={n} at={L("PayPal") + 18 + i * 8}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 30px", marginBottom: 16, borderRadius: 18, background: C.surface, border: `1px solid ${flip > 0.5 ? C.accent : C.hair}`, fontFamily: SANS, fontSize: 40, color: flip > 0.5 ? C.fg : C.fg2 }}>
                <span>{n}</span>
                {flip > 0.5 ? <Check size={46} color={C.accent} /> : <Cross size={46} />}
              </div>
            </Pop>
          ))}
          <div style={{ fontFamily: MONO, fontSize: 30, color: C.accent, opacity: flip, marginTop: 14 }}>vitrina/ brings them in</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 5 · paste the URL and the PayPal account: the whole page first, then the form, then the click
export const V1: React.FC = () => <Clip clip="landing" start={0} cam={[[0, 1, 0.5, 0.5], [2.4, 1, 0.5, 0.5], [3.8, 1.5, 0.2, 0.62]]} url="vitrina.app" />;

// 6 · it scrapes the store and returns clean data
const JSON_LINES = ['{', '  "name": "Classic Tee",', '  "variants": ["Black / M", "Navy / L"],', '  "price": 32.00,', '  "currency": "USD",', '  "in_stock": true', '}'];
export const V2: React.FC = () => {
  const L = useCue();
  const f = useCurrentFrame();
  const start = L("scrapes");
  const turn = L("turns");
  const sweep = prog(f, start, 80, easeDraw);
  const imgs = ["tee-ink", "hoodie", "jacket-denim", "jeans-light", "chinos", "shirt-flannel"];
  const chars = JSON_LINES.join("\n");
  const n = Math.max(0, Math.min(chars.length, Math.floor(((f - turn) / 30) * 70)));
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 140, top: 150, width: 760, height: 700, borderRadius: 24, border: `1px solid ${C.hair}`, background: C.surface, overflow: "hidden" }}>
        <div style={{ height: 52, borderBottom: `1px solid ${C.hair}`, display: "flex", alignItems: "center", padding: "0 20px", fontFamily: MONO, fontSize: 22, color: C.fg3 }}>lumenstudio.com</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, padding: 24 }}>
          {imgs.map((m, i) => {
            const hit = prog(f, start + 8 + i * 9, 10);
            return <Img key={m} name={m} w={216} h={250} style={{ outline: `3px solid ${hit > 0.3 ? C.accent : "transparent"}`, outlineOffset: 2 }} />;
          })}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 52 + sweep * 640, height: 3, background: C.accent, boxShadow: `0 0 24px ${C.accent}`, opacity: sweep > 0 && sweep < 1 ? 1 : 0 }} />
        <div style={{ position: "absolute", left: 24, bottom: 18, fontFamily: MONO, fontSize: 24, color: C.accent, opacity: prog(f, start, 8) }}>scraping…</div>
      </div>
      <svg style={{ position: "absolute", left: 930, top: 460, opacity: prog(f, turn - 4, 10) }} width={140} height={80} viewBox="0 0 140 80"><path d="M10 40 H118 M96 18 L120 40 L96 62" fill="none" stroke={C.fg2} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /></svg>
      <div style={{ position: "absolute", left: 1090, top: 190, width: 700, height: 620, borderRadius: 24, border: `1px solid ${f >= turn ? C.accent : C.hair}`, background: C.deep, padding: 36, opacity: prog(f, turn - 6, 10) }}>
        <div style={{ fontFamily: MONO, fontSize: 22, color: C.fg3, marginBottom: 18 }}>clean data an agent can read</div>
        <pre style={{ margin: 0, fontFamily: MONO, fontSize: 30, lineHeight: 1.5, color: C.fg }}>{chars.slice(0, n)}<span style={{ color: C.accent }}>{n < chars.length ? "|" : ""}</span></pre>
      </div>
    </AbsoluteFill>
  );
};

// 7 · every variant a size and a color, every price in dollars
export const V4: React.FC = () => {
  const L = useCue();
  const f = useCurrentFrame();
  const imgs = ["tee-ink", "tee-navy", "tee-sage", "tee-rust"];
  const swatches = ["#17171a", "#1f2a44", "#8e9a82", "#a2532f"];
  const sizeAt = L("size");
  const colorAt = L("color");
  const priceAt = L("price");
  const idx = f < colorAt ? 0 : Math.min(3, Math.floor((f - colorAt) / 16));
  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 150 }}>
      <div style={{ position: "relative", width: 560, height: 680 }}>
        {imgs.map((m, i) => (
          <Img key={m} name={m} w={560} h={680} pad={7} style={{ position: "absolute", inset: 0, borderRadius: 28, opacity: i === idx ? 1 : 0 }} />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 56 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 24, color: C.fg3, marginBottom: 14, opacity: prog(f, sizeAt, 8) }}>size</div>
          <div style={{ display: "flex", gap: 16 }}>{["S", "M", "L", "XL"].map((s, i) => <Pop key={s} at={sizeAt + i * 6}><Chip size={46}>{s}</Chip></Pop>)}</div>
        </div>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 24, color: C.fg3, marginBottom: 14, opacity: prog(f, colorAt, 8) }}>color</div>
          <div style={{ display: "flex", gap: 20 }}>
            {swatches.map((h, i) => (
              <Pop key={h} at={colorAt + i * 6}>
                <div style={{ width: 84, height: 84, borderRadius: 42, background: h, border: `4px solid ${f >= colorAt && idx === i ? C.accent : C.hair}` }} />
              </Pop>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 24, color: C.fg3, marginBottom: 6, opacity: prog(f, priceAt, 8) }}>price · USD</div>
          <div style={{ fontFamily: MONO, fontSize: 150, fontWeight: 500, letterSpacing: "-0.04em", opacity: prog(f, priceAt, 8) }}>
            $<CountUp to={32} at={priceAt} dur={36} fmt={(n) => n.toFixed(2)} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 8 · the whole catalog, as an accordion
const GARMENTS: [string, string, number][] = [
  ["tee-ink", "Classic Tee", 38000], ["hoodie", "Essential Hoodie", 98000], ["jacket-denim", "Denim Chore Jacket", 135000], ["jeans-light", "Straight Jeans", 89000],
  ["chinos", "Slim Chinos", 76000], ["shirt-flannel", "Flannel Check Shirt", 69000], ["sneakers", "Leather Court Sneakers", 112000], ["jacket-leather", "Leather Chore Jacket", 245000],
  ["knit-cable", "Cable Knit Sweater", 96000], ["jacket-varsity", "Varsity Jacket", 142000], ["boots-chelsea", "Chelsea Boots", 168000], ["knit-mohair", "Brushed Cardigan", 88000],
];
const usd = (ars: number) => Math.round((ars * 0.00085) / 2) * 2;

export const V5: React.FC = () => {
  const f = useCurrentFrame();
  const N = GARMENTS.length;
  const sweep = prog(f, 12, 120, easeDraw) * (N - 1);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 160, top: 120, fontFamily: SANS, fontWeight: 600, fontSize: 104, letterSpacing: "-0.035em", opacity: prog(f, 4, 14), transform: `translateY(${(1 - prog(f, 4, 14)) * 30}px)` }}>Your whole catalog.</div>
      <div style={{ position: "absolute", left: 130, right: 130, top: 330, height: 560, display: "flex", gap: 10 }}>
        {GARMENTS.map(([img, name, ars], i) => {
          const near = Math.max(0, 1 - Math.abs(i - sweep));
          return (
            <div key={img} style={{ width: 84 + 440 * near, flexShrink: 0, height: "100%", position: "relative", borderRadius: 18, background: "#f3f0e8", overflow: "hidden" }}>
              <img src={staticFile(`mock/${img}.webp`)} style={{ position: "absolute", left: "50%", top: "46%", height: "76%", transform: `translate(-50%, -50%) scale(${1 + near * 0.1})` }} />
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "14px 20px", background: "linear-gradient(transparent, rgba(0,0,0,0.55))", opacity: near, color: "#fff", fontFamily: SANS, display: "flex", justifyContent: "space-between", fontSize: 28 }}>
                <span>{name}</span><span style={{ fontFamily: MONO }}>${usd(ars)}.00</span>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// 9 · the MCP map: store → MCP, clients → MCP, MCP → PayPal → the store's account
export const M1: React.FC = () => {
  const L = useCue();
  const f = useCurrentFrame();
  const pub = L("publishes");
  const clients: [string, number][] = [["ChatGPT", L("ChatGPT")], ["Claude", L("Claude")], ["Gemini", L("Gemini")], ["Cursor", L("Cursor")]];
  const pay = L("wired");
  const node = (x: number, y: number, w: number, h: number, label: string, sub: string | null, at: number, accent = false, color = C.fg3) => (
    <Pop at={at} style={{ position: "absolute", left: x, top: y, width: w, height: h }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 24, border: `3px solid ${accent ? C.accent : color}`, background: C.surface, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div><div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 46 }}>{label}</div>{sub && <div style={{ fontFamily: MONO, fontSize: 22, color: C.fg3, marginTop: 6 }}>{sub}</div>}</div>
      </div>
    </Pop>
  );
  const line = (x1: number, y1: number, x2: number, y2: number, at: number, color = C.fg2, label?: string) => {
    const p = prog(f, at, 18, easeDraw);
    return (
      <g>
        <line x1={x1} y1={y1} x2={lerp(x1, x2, p)} y2={lerp(y1, y2, p)} stroke={color} strokeWidth={4} strokeLinecap="round" />
        {label && <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 16} textAnchor="middle" fontFamily={MONO} fontSize={26} fill={color} opacity={prog(f, at + 10, 10)}>{label}</text>}
      </g>
    );
  };
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {line(470, 760, 800, 560, pub + 10, C.fg2, "published")}
        {clients.map(([n, at], i) => line(520, 190 + i * 120, 800, 440, at + 4, C.fg3))}
        {line(1140, 480, 1330, 480, pay + 6, C.accent, "checkout")}
        {line(1480, 560, 1480, 720, pay + 26, C.pos, "funds")}
      </svg>
      {node(170, 700, 300, 120, "Your store", "scraped catalog", pub - 20)}
      {node(800, 390, 340, 180, "MCP server", "one per store", pub, true)}
      {clients.map(([n, at], i) => (
        <Pop key={n} at={at} style={{ position: "absolute", left: 220, top: 160 + i * 120 }}><Chip size={36}>{n}</Chip></Pop>
      ))}
      {node(1330, 390, 300, 180, "PayPal", "Orders v2", pay + 2, false, C.accent)}
      {node(1280, 720, 400, 120, "Store's PayPal account", null, pay + 22, false, C.pos)}
    </AbsoluteFill>
  );
};

// 10 · the agent shops (one continuous shot, the camera pans between the things the voice names)
export const P1: React.FC = () => {
  const L = useCue();
  const t = (phrase: string) => L(phrase) / 30;
  return (
    <Clip
      clip="shop"
      start={0}
      cam={[[0, 1, 0.5, 0.5], [Math.max(1.5, t("Now watch") + 0.2), 1.35, 0.45, 0.32], [t("searches"), 1.35, 0.45, 0.32], [t("searches") + 1.3, 1.5, 0.22, 0.34], [t("builds") - 0.2, 1.5, 0.22, 0.34], [t("builds") + 1.4, 1.5, 0.24, 0.7]]}
      url="vitrina.app/demo/playground"
    />
  );
};

// 11 · the agent can't pay: the buyer approves with PayPal (a clean card, not the recorded modal)
export const P4: React.FC = () => {
  const L = useCue();
  const f = useCurrentFrame();
  const cant = L("can't");
  const appr = L("approves");
  const press = appr + 34;
  const down = prog(f, press, 5) * (1 - prog(f, press + 6, 6));
  const spin = prog(f, press + 8, 22);
  const done = f >= press + 30;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 120 }}>
        <Pop at={cant - 4}>
          <div style={{ width: 360, padding: 36, borderRadius: 24, border: `2px solid ${C.fg3}`, background: C.surface, textAlign: "center", opacity: 0.9 }}>
            <div style={{ fontFamily: SANS, fontSize: 44 }}>AI agent</div>
            <div style={{ margin: "18px auto 6px", width: 70 }}><Cross size={70} p={prog(f, cant + 6, 12)} /></div>
            <div style={{ fontFamily: MONO, fontSize: 24, color: C.neg }}>can't pay</div>
          </div>
        </Pop>
        <Pop at={appr - 6} dy={50}>
          <div style={{ width: 640, padding: "44px 54px", borderRadius: 28, background: "#ffffff", color: "#0b1a33", boxShadow: "0 40px 100px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: "#003087", fontStyle: "italic" }}>PayPal</span>
              <span style={{ fontFamily: MONO, fontSize: 20, color: "#6b7a90" }}>sandbox</span>
            </div>
            <div style={{ fontFamily: SANS, fontSize: 34, marginTop: 34 }}>Pay Lumen Studio</div>
            <div style={{ fontFamily: MONO, fontSize: 96, fontWeight: 500, letterSpacing: "-0.04em", marginTop: 6 }}>$32.00</div>
            <div style={{ fontFamily: SANS, fontSize: 24, color: "#6b7a90", marginTop: 12 }}>Funds go to the store's PayPal account</div>
            <div style={{ marginTop: 34, height: 78, borderRadius: 39, background: done ? C.pos : "#0070ba", display: "grid", placeItems: "center", color: "#fff", fontFamily: SANS, fontWeight: 600, fontSize: 32, transform: `scale(${1 - down * 0.04})` }}>
              {done ? "Approved" : spin > 0 ? "…" : "Pay $32.00"}
            </div>
          </div>
        </Pop>
      </div>
    </AbsoluteFill>
  );
};

// 12 · paid
export const P5: React.FC = () => {
  const L = useCue();
  const at = L("Paid");
  return (
    <AbsoluteFill>
      <Clip clip="shop" start={19.6} cam={[[0, 1.2, 0.5, 0.6], [1.8, 1.5, 0.74, 0.76]]} url="vitrina.app/demo/playground" />
      <div style={{ position: "absolute", right: 36, top: 300, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
        <Stamp label="PAID" at={at} />
        <div style={{ fontFamily: MONO, fontSize: 64, fontWeight: 500, opacity: prog(useCurrentFrame(), at, 6) }}>$<CountUp to={32} at={at} dur={24} fmt={(n) => n.toFixed(2)} /></div>
      </div>
    </AbsoluteFill>
  );
};

// 13-14 · the merchant's side
export const D1: React.FC = () => <Clip clip="shop" start={21.2} cam={[[0, 1.2, 0.74, 0.3], [1.6, 1.5, 0.74, 0.3]]} url="vitrina.app/demo/playground" />;
export const D2: React.FC = () => <Clip clip="orders" start={18.3} cam={[[0, 1.1, 0.5, 0.45], [2.2, 1.35, 0.5, 0.5]]} url="vitrina.app/demo/orders" />;

export const C1: React.FC = () => {
  const L = useCue();
  const f = useCurrentFrame();
  const p = prog(f, 0, 18);
  const tag = L("Agents shop");
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 34 }}>
      <div style={{ fontFamily: MONO, fontSize: 170, fontWeight: 500, letterSpacing: "-0.05em", opacity: p, transform: `scale(${lerp(0.94, 1, p)})` }}>vitrina<span style={{ color: C.accent }}>/</span></div>
      <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 52, color: C.fg2, opacity: prog(f, L("An MCP"), 14) }}>An MCP for any store, wired to PayPal</div>
      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 92, letterSpacing: "-0.03em", opacity: prog(f, tag, 14), transform: `translateY(${(1 - prog(f, tag, 14)) * 24}px)` }}>Agents shop. Humans approve.</div>
    </AbsoluteFill>
  );
};
