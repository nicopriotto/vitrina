import React from "react";
import { AbsoluteFill, Img as RImg, Sequence, staticFile, useCurrentFrame } from "remotion";
import { easeDraw, lerp, prog } from "../anim";
import { Browser, Punch, Stamp } from "../components/kit";
import { MONO, SANS, SERIF } from "../fonts";
import { C } from "../theme";
import { cueEnd, take } from "../timing";
import { Typed, useBeat, useCue } from "../ui";
import {
  AgentMsg,
  Avatar,
  Fade,
  HtmlSoup,
  LiveDot,
  Panel,
  Persona,
  Phone,
  PP,
  ProductTile,
  Reveal,

  ToolRow,
  UserMsg,
  Wire,
} from "./parts";

const useCueEnd = () => {
  const { from } = useBeat();
  return (phrase: string) => Math.max(0, cueEnd(phrase, from / 30) - from);
};

const ASK = "Find me a black tee, size M, under $40. And buy it.";
const MCP_HOST = "Vitrina · MCP";

// ───────────────────────────── 01 Hook ─────────────────────────────
export const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const at = useCue();
  const a2 = at("instead");
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${1.1 - f * 0.0007})` }}>
        <RImg src={staticFile("shots/home.png")} style={{ width: "100%", height: "100%", objectFit: "cover", filter: `blur(${prog(f, at("browse"), 36) * 14}px)` }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "rgba(14,14,15,0.62)" }} />
      <AbsoluteFill style={{ padding: "0 180px", justifyContent: "center", gap: 28 }}>
        <div style={{ opacity: lerp(1, 0.38, prog(f, a2, 12)) }}>
          <Punch text="Your next customer won't browse your store." at={at("your next")} size={100} />
        </div>
        <Punch text="Instead, they'll send an agent." at={a2} size={100} hi={["agent"]} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 02 Sam asks, the agent never finds Lumen ─────────────────────────────
const RETAIL = [
  { store: "megamart.com", name: "Basic Crew Tee", price: "$12.99" },
  { store: "shopco.com", name: "Cotton Tee, 3-pack", price: "$24.00" },
  { store: "fastfit.com", name: "Essential Tee", price: "$19.50" },
];

export const SamAsks: React.FC = () => {
  const f = useCurrentFrame();
  const at = useCue();
  const end = useCueEnd();
  const t0 = at("find me");
  const t1 = end("buy it");
  const send = t1 + 4;
  const cps = ASK.length / Math.max(1, (t1 - t0) / 30);
  const c1 = at("the agent checks");
  const miss = at("never finds");
  return (
    <AbsoluteFill>
      <Persona who="sam" at={4} style={{ position: "absolute", left: 150, top: 470 }} />
      <Phone x={640} enter input={f < send && f >= t0 ? <Typed text={ASK} at={t0} cps={cps} /> : undefined}>
        <Reveal at={send}>
          <UserMsg>{ASK}</UserMsg>
        </Reveal>
        <Reveal at={c1}>
          <ToolRow name="web_search" where="the web" at={c1} doneAt={c1 + 26} />
        </Reveal>
        <Reveal at={c1 + 26}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {RETAIL.map((r) => (
              <div key={r.store} style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <ProductTile size={64} muted />
                <div style={{ display: "flex", flexDirection: "column", fontFamily: SANS, fontSize: 19, color: C.fg }}>
                  <span>{r.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 15, color: C.fg3 }}>{r.store}</span>
                </div>
                <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 18, color: C.fg2 }}>{r.price}</span>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal at={miss}>
          <AgentMsg>Here are a few options from big retailers.</AgentMsg>
        </Reveal>
      </Phone>
      <div style={{ position: "absolute", left: 1010, top: 250, width: 760 }}>
        <Fade at={c1}>
          <Panel title="stores the agent can read">
            {RETAIL.map((r, i) => (
              <Fade key={r.store} at={c1 + 6 + i * 7} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", borderBottom: `1px solid ${C.hair}`, fontFamily: MONO, fontSize: 24 }}>
                <span style={{ color: C.pos }}>✓</span>
                <span style={{ color: C.fg }}>{r.store}</span>
                <span style={{ marginLeft: "auto", color: C.fg3, fontSize: 20 }}>catalog · checkout</span>
              </Fade>
            ))}
            <Fade at={miss} style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 0 6px", fontFamily: MONO, fontSize: 24 }}>
              <span style={{ color: C.neg }}>✕</span>
              <span style={{ color: C.fg3, textDecoration: "line-through" }}>lumenstudio.com</span>
              <span style={{ marginLeft: "auto", color: C.neg, fontSize: 20 }}>nothing to read</span>
            </Fade>
          </Panel>
        </Fade>
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 03 Lumen: same tee, invisible ─────────────────────────────
export const Lumen: React.FC = () => {
  const f = useCurrentFrame();
  const at = useCue();
  const tSame = at("exact tee") / 30;
  return (
    <AbsoluteFill>
      <Browser
        still="shots/home.png"
        url="lumenstudio.com"
        width={1460}
        y={-10}
        enter
        blur={prog(f, at("invisible") - 2, 24) * 12}
        cam={[
          [0, 1.0, 0.5, 0.5],
          [tSame - 0.1, 1.0, 0.5, 0.5],
          [tSame + 0.9, 1.55, 0.27, 0.6],
        ]}
      />
    </AbsoluteFill>
  );
};

// ───────────────────────────── 04 What an agent sees ─────────────────────────────
const REQS = [
  { cue: "no product feed", verb: "GET", path: "/products.json", res: "404 Not Found" },
  { cue: "no api", verb: "GET", path: "/api/products", res: "404 Not Found" },
  { cue: "no checkout", verb: "POST", path: "/checkout", res: "no such endpoint" },
];

export const AgentSees: React.FC = () => {
  const f = useCurrentFrame();
  const at = useCue();
  const see = at("they see this");
  const swap = at("no product feed");
  const noCheckout = at("no checkout");
  const out = prog(f, swap - 6, 12);
  const move = prog(f, see - 18, 26, easeDraw);
  return (
    <AbsoluteFill>
      <div style={{ opacity: 1 - out }}>
        <div style={{ position: "absolute", left: 110, top: 150, fontFamily: MONO, fontSize: 24, color: C.fg3, opacity: prog(f, see, 12) }}>what a person sees</div>
        <Browser
          still="shots/home.png"
          url="lumenstudio.com"
          width={lerp(1460, 820, move)}
          x={lerp(0, -450, move)}
          y={lerp(-10, 30, move)}
          tilt={lerp(1, 0.5, move)}
          blur={lerp(12, 0, prog(f, 6, 22))}
          cam={[
            [0, 1.55, 0.27, 0.6],
            [(see - 18) / 30, 1.55, 0.27, 0.6],
            [(see + 12) / 30, 1.3, 0.3, 0.55],
          ]}
        />
      </div>
      <div style={{ position: "absolute", left: 110, top: 210, width: 820, opacity: out }}>
        <Panel title="agent → lumenstudio.com">
          {REQS.map((r) => {
            const t = at(r.cue);
            return (
              <Fade key={r.path} at={t} style={{ display: "flex", gap: 18, padding: "16px 0", borderBottom: `1px solid ${C.hair}`, fontFamily: MONO, fontSize: 27 }}>
                <span style={{ color: C.fg3, width: 74 }}>{r.verb}</span>
                <span style={{ color: C.fg }}>{r.path}</span>
                <span style={{ marginLeft: "auto", color: C.neg }}>{r.res}</span>
              </Fade>
            );
          })}
        </Panel>
      </div>
      <div style={{ position: "absolute", left: 990, top: 150, fontFamily: MONO, fontSize: 24, color: C.fg3, opacity: prog(f, see, 12) }}>what an agent sees</div>
      <div style={{ position: "absolute", left: 990, top: 210, width: 830, height: 640, overflow: "hidden", borderRadius: 22, border: `1px solid ${C.hair}`, background: C.deep, opacity: prog(f, see - 4, 12) }}>
        <div style={{ padding: "20px 0" }}>
          <HtmlSoup lit={{ price: see + 22, note: noCheckout }} color={{ note: C.neg }} scroll={lerp(0, 110, prog(f, see, 150, easeDraw))} size={18} dim={0.75} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 05 The long tail ─────────────────────────────
const N = 64;
const X0 = 210;
const X1 = 1710;
const BASE = 790;
const BW = (X1 - X0) / N;
const HEAD = 6;
const LUMEN = 38;
const barH = (i: number) => 500 * Math.pow(1 / (1 + i * 0.5), 0.9) + 8;

export const LongTail: React.FC = () => {
  const f = useCurrentFrame();
  const at = useCue();
  const pp = at("paypal is bringing");
  const chk = at("agentic checkout");
  const small = at("small stores");
  const behind = at("left behind");
  const tailDim = prog(f, small, 16);
  const lx = X0 + LUMEN * BW + BW / 2;
  const ly = BASE - barH(LUMEN);
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line x1={X0 - 20} x2={X1 + 20} y1={BASE} y2={BASE} stroke={C.hair} strokeWidth={2} />
        {Array.from({ length: N }).map((_, i) => {
          const g = prog(f, 2 + i * 0.4, 16);
          const h = barH(i) * g;
          const head = i < HEAD;
          const blue = head ? prog(f, pp + i * 2, 12) : 0;
          const isLumen = i === LUMEN;
          const fill = isLumen && f >= small ? C.accent : blue > 0 ? PP.blue : C.fg3;
          const op = head ? lerp(0.55, 1, blue) : isLumen ? lerp(0.55, 1, tailDim) : lerp(0.55, 0.3, tailDim) * lerp(1, 0.45, prog(f, behind, 20));
          return <rect key={i} x={X0 + i * BW + 2} y={BASE - h} width={BW - 4} height={h} rx={3} fill={fill} opacity={op} />;
        })}
        <text x={X1} y={BASE + 50} textAnchor="end" fontFamily={MONO} fontSize={22} fill={C.fg3} opacity={prog(f, 10, 14)}>
          online stores, biggest to smallest
        </text>
      </svg>
      <Fade at={pp + 4} style={{ position: "absolute", left: X0 + HEAD * BW + 40, top: BASE - barH(0) + 10 }}>
        <div style={{ fontFamily: SANS, fontSize: 44, fontWeight: 500, color: C.fg }}>Big platforms</div>
        <div style={{ fontFamily: MONO, fontSize: 22, color: C.fg3, marginTop: 6 }}>Wix · BigCommerce · Shopware</div>
        <Fade at={chk} style={{ marginTop: 18, display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 16px", borderRadius: 12, background: PP.soft, border: `1px solid ${PP.blue}`, fontFamily: MONO, fontSize: 22, color: "#8cc2ff" }}>
          PayPal agentic checkout
        </Fade>
      </Fade>

      <Fade at={small + 6} style={{ position: "absolute", left: lx - 120, top: ly - 170, width: 240, textAlign: "center" }}>
        <div style={{ fontFamily: SANS, fontSize: 40, fontWeight: 500, color: C.fg }}>Small stores</div>
        <div style={{ fontFamily: MONO, fontSize: 22, color: C.accent, marginTop: 6 }}>Lumen is here</div>
        <div style={{ width: 2, height: 60, background: C.accent, margin: "12px auto 0", opacity: 0.8 }} />
      </Fade>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 06 vitrina (n.) shop window ─────────────────────────────
export const Turn: React.FC = () => {
  const f = useCurrentFrame();
  const at = useCue();
  const w = at("so we built");
  const sp = at("in spanish");
  const sw = at("shop window");
  const fa = at("this one is");
  const glass = prog(f, fa, 24, easeDraw);
  const sweep = prog(f, fa + 6, 40, easeDraw);
  const L = 2 * (1560 + 560);
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="gl" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="1" stopColor={C.accent} stopOpacity="0.7" />
          </linearGradient>
          <clipPath id="pane">
            <rect x={180} y={240} width={1560} height={560} rx={36} />
          </clipPath>
        </defs>
        <rect x={180} y={240} width={1560} height={560} rx={36} fill="rgba(255,255,255,0.025)" opacity={glass} />
        <rect x={180} y={240} width={1560} height={560} rx={36} fill="none" stroke="url(#gl)" strokeWidth={2.5} strokeDasharray={L} strokeDashoffset={L * (1 - glass)} />
        <g clipPath="url(#pane)">
          <rect x={lerp(-200, 1900, sweep)} y={150} width={140} height={800} fill="#ffffff" opacity={0.06 * (1 - Math.abs(sweep - 0.5) * 2) + 0.02 * (sweep > 0 && sweep < 1 ? 1 : 0)} transform={`skewX(-18)`} />
        </g>
      </svg>
      <div style={{ position: "absolute", left: 280, top: 300 }}>
        <Fade at={w} dy={30}>
          <div style={{ fontFamily: SERIF, fontSize: 230, lineHeight: 0.95, color: C.fg, letterSpacing: "-0.01em" }}>vitrina</div>
        </Fade>
        <Fade at={sp} style={{ fontFamily: MONO, fontSize: 30, color: C.fg3, marginTop: 18 }}>
          /bi.ˈtɾi.na/ &nbsp; noun · Spanish
        </Fade>
        <div style={{ display: "flex", alignItems: "baseline", marginTop: 26, fontFamily: SERIF, fontStyle: "italic", fontSize: 96, color: C.fg }}>
          <Fade at={sw}>shop window</Fade>
          <Fade at={fa + 4} style={{ color: C.accent }}>
            ,&nbsp;for agents.
          </Fade>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 07 Maya connects her store ─────────────────────────────
export const Maya: React.FC = () => {
  const at = useCue();
  const tP = at("pastes her") / 30;
  return (
    <AbsoluteFill>
      <Persona who="maya" at={2} style={{ position: "absolute", right: 120, top: 40 }} />
      <Browser
        clip="landing"
        start={0}
        delay={Math.max(0, tP - 0.25)}
        rate={1.15}
        url="vitrina.dev"
        width={1440}
        y={40}
        enter
        cam={[
          [0, 1.0, 0.5, 0.5],
          [tP, 1.0, 0.5, 0.5],
          [tP + 1.1, 1.5, 0.18, 0.76],
        ]}
      />
    </AbsoluteFill>
  );
};

// ───────────────────────────── 08 Vitrina reads the store (the glass clears) ─────────────────────────────
type Cam = [number, number, number, number][];
// the camera travels down the products as they come in, then hands its last frame to the catalog shot
const READS: { start: number; rate: number; cam: Cam; end: Cam } = {
  start: 1.4,
  rate: 1.6,
  cam: [
    [0.6, 1.55, 0.64, 0.22],
    [6.0, 1.55, 0.64, 0.92],
  ],
  end: [[0, 1.55, 0.64, 0.92]],
};
const beatFrom = (id: string) => Math.round(take.lines!.find((l) => l.id === id)!.a * 30) - 16;

export const Reads: React.FC = () => {
  return (
    <AbsoluteFill>
      <Browser clip="ingest" start={READS.start} rate={READS.rate} url="vitrina.dev/stores/lumen-studio" width={1440} y={20} cam={READS.cam} />
    </AbsoluteFill>
  );
};

// ───────────────────────────── 09 HTML becomes a catalog ─────────────────────────────
const JSON_LINES: { k?: "title" | "price" | "black" | "size" | "stock"; t: React.ReactNode }[] = [
  { t: "{" },
  { k: "title", t: <>  <K>"name"</K>: <S>"Classic Tee"</S>,</> },
  { k: "price", t: <>  <K>"price"</K>: <Num>32.00</Num>, <K>"currency"</K>: <S>"USD"</S>,</> },
  { k: "black", t: <>  <K>"colors"</K>: [<S>"Black"</S>, <S>"Navy"</S>, <S>"Sage"</S>, <S>"Rust"</S>],</> },
  { k: "size", t: <>  <K>"sizes"</K>: [<S>"S"</S>, <S>"M"</S>, <S>"L"</S>, <S>"XL"</S>],</> },
  { k: "stock", t: <>  <K>"in_stock"</K>: {"{"} <S>"Black"</S>: [<S>"S"</S>, <S>"M"</S>, <S>"L"</S>] {"}"}</> },
  { t: "}" },
];
function K({ children }: { children: React.ReactNode }) {
  return <span style={{ color: C.fg2 }}>{children}</span>;
}
function S({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "#e9c49a" }}>{children}</span>;
}
function Num({ children }: { children: React.ReactNode }) {
  return <span style={{ color: C.accent }}>{children}</span>;
}

export const Catalog: React.FC = () => {
  const f = useCurrentFrame();
  const at = useCue();
  const t = at("turns all of");
  const step = 8;
  const lit: Record<string, number> = {};
  JSON_LINES.forEach((l, i) => {
    if (l.k) lit[l.k] = t + 6 + i * step;
  });
  const arrow = prog(f, t, 16, easeDraw);
  const back = prog(f, 4, 22, easeDraw);
  const carry = READS.start + ((beatFrom("I3") - beatFrom("I2")) / 30) * READS.rate;
  const html = prog(f, 12, 16);
  const { len } = useBeat();
  const leave = prog(f, len - 24, 22, easeDraw); // steps back as the store comes forward
  return (
    <AbsoluteFill style={{ opacity: 1 - leave * 0.6, transform: `scale(${lerp(1, 0.94, leave)})` }}>
      {back < 1 && (
        <div style={{ position: "absolute", inset: 0, opacity: 1 - back, transform: `scale(${lerp(1, 0.9, back)})` }}>
          <Browser clip="ingest" start={carry} rate={READS.rate} url="vitrina.dev/stores/lumen-studio" width={1440} y={20} cam={READS.end} />
        </div>
      )}
      <div style={{ position: "absolute", left: 100, top: 170, fontFamily: MONO, fontSize: 24, color: C.fg3, opacity: html }}>the page</div>
      <div style={{ position: "absolute", left: 100, top: 220, width: 800, height: 620, overflow: "hidden", borderRadius: 22, border: `1px solid ${C.hair}`, background: C.deep, opacity: html, transform: `translateY(${(1 - html) * 24}px)` }}>
        <div style={{ padding: "18px 0" }}>
          <HtmlSoup lit={lit} scroll={150} size={17} dim={0.5} />
        </div>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line x1={920} x2={920 + 80 * arrow} y1={530} y2={530} stroke={C.accent} strokeWidth={3} />
        <path d="M 988 518 L 1002 530 L 988 542" fill="none" stroke={C.accent} strokeWidth={3} opacity={arrow > 0.95 ? 1 : 0} />
      </svg>
      <div style={{ position: "absolute", left: 1030, top: 170, fontFamily: MONO, fontSize: 24, color: C.fg3, opacity: prog(f, t, 12) }}>what the agent gets</div>
      <div style={{ position: "absolute", left: 1030, top: 220, width: 790, opacity: prog(f, t + 2, 12) }}>
        <Panel
          title={
            <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <ProductTile img="tee-ink" size={46} />
              <span style={{ color: C.fg }}>Classic Tee</span>
            </span>
          }
          right={<span style={{ color: C.fg3 }}>catalog</span>}
        >
          <div style={{ fontFamily: MONO, fontSize: 25, lineHeight: 1.75, whiteSpace: "pre", color: C.fg3 }}>
            {JSON_LINES.map((l, i) => (
              <Fade key={i} at={t + 6 + i * step} dy={8}>
                {l.t}
              </Fade>
            ))}
          </div>
        </Panel>
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 10 Climax: Lumen is an MCP server ─────────────────────────────
export const Live: React.FC = () => {
  const at = useCue();
  const f = useCurrentFrame();
  const t = at("lumen is live");
  const come = prog(f, 0, 26, easeDraw);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 300, right: 300, top: 110, display: "flex", alignItems: "center", gap: 26 }}>
        <Punch text="Lumen is live on Vitrina." at={t} size={84} hi={["Vitrina"]} />
      </div>
      <div style={{ position: "absolute", left: 300, top: 214, display: "flex", gap: 14, fontFamily: MONO, fontSize: 26, color: C.fg3 }}>
        <Fade at={at("an mcp")}>MCP server</Fade>
        <Fade at={at("wired to")} style={{ color: "#8cc2ff" }}>· wired to PayPal</Fade>
      </div>
      {/* the store comes forward again, the way it stepped back into the catalog */}
      <div style={{ position: "absolute", inset: 0, opacity: come, transform: `scale(${lerp(0.9, 1, come)})` }}>
        <Browser
          clip="ingest"
          start={12.9}
          url="vitrina.dev/stores/lumen-studio"
          width={1240}
          y={130}
          tilt={0.6}
          cam={[
            [0, 1.0, 0.5, 0.5],
            [1.2, 1.0, 0.5, 0.5],
            [5.5, 1.14, 0.45, 0.55],
          ]}
        />
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 11 Shoppers add Vitrina once; every store is one search away ─────────────────────────────
const CLIENTS = [
  { name: "Claude", cue: "claude" },
  { name: "ChatGPT", cue: "chatgpt" },
  { name: "Gemini", cue: "gemini" },
];
const SHOPS = ["Clay Corner", "Harbor Knits", "Ojo Eyewear", "Lumen Studio", "Field Notes Co.", "Tidewater Soap", "Second Shelf Books", "Moss Ceramics"];
const LUMEN_I = 3;
const bez = (a: number, b: number, c: number, d: number, t: number) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d;
const VX = 790;
const VW = 340;
const VY = 450;
const VH = 180;
const VC = VY + VH / 2;
const SX = 1340;
const shopY = (i: number) => 236 + i * 80 + 32;
const cliY = (i: number) => 380 + i * 160;

export const Clients: React.FC = () => {
  const f = useCurrentFrame();
  const at = useCue();
  const stores = at("add stores"); // the stores fill the screen as soon as they are named
  const vit = at("add vitrina");
  const every = at("every vitrina");
  const search = at("search away");
  const lumen = at("lumen included");
  // each client arrives on its name, never two at once
  const times: number[] = [];
  CLIENTS.forEach((c, i) => {
    const want = at(c.cue);
    times.push(i === 0 ? want : Math.max(want, times[i - 1] + 14));
  });
  const focus = prog(f, lumen, 14);
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {CLIENTS.map((c, i) => {
          const y = cliY(i) + 32;
          return <Wire key={c.name} d={`M 470 ${y} C 630 ${y}, 630 ${VC}, ${VX} ${VC}`} len={520} at={times[i] + 8} dur={18} color={C.accent} />;
        })}
        {SHOPS.map((name, i) => {
          const y = shopY(i);
          const p = prog(f, search + i * 2, 20, easeDraw);
          const lit = i === LUMEN_I ? 1 : 1 - focus * 0.7;
          return (
            <g key={name} opacity={lit}>
              <Wire d={`M ${VX + VW} ${VC} C ${VX + VW + 110} ${VC}, ${SX - 110} ${y}, ${SX} ${y}`} len={560} at={every + i * 3} dur={16} color={i === LUMEN_I && focus > 0 ? C.accent : C.fg3} />
              {p > 0 && p < 1 && <circle r={6} fill={C.accent} cx={bez(VX + VW, VX + VW + 110, SX - 110, SX, p)} cy={bez(VC, VC, y, y, p)} />}
            </g>
          );
        })}
      </svg>
      {/* the shopper's assistants */}
      {CLIENTS.map((c, i) => {
        const p = prog(f, times[i], 14);
        const on = prog(f, times[i] + 18, 10);
        return (
          <div key={c.name} style={{ position: "absolute", left: 170, top: cliY(i), width: 300, height: 64, opacity: p, transform: `translateX(${(1 - p) * -36}px)`, borderRadius: 16, border: `1px solid ${on > 0.5 ? "rgba(255,122,69,0.5)" : C.hair}`, background: C.surface, display: "flex", alignItems: "center", padding: "0 22px", fontFamily: SANS, fontSize: 28, fontWeight: 500, color: C.fg }}>
            {c.name}
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 18, color: C.accent, opacity: on }}>+ Vitrina</span>
          </div>
        );
      })}
      {/* one MCP for the shopper */}
      <Fade at={vit} dy={16} style={{ position: "absolute", left: VX, top: VY, width: VW, height: VH, borderRadius: 24, background: C.surface, border: `1.5px solid ${C.accent}`, boxShadow: "0 30px 90px rgba(0,0,0,0.45)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <span style={{ fontFamily: MONO, fontSize: 52, fontWeight: 500, letterSpacing: "-0.04em", color: C.fg }}>
          vitrina<span style={{ color: C.accent }}>/</span>
        </span>
        <span style={{ fontFamily: MONO, fontSize: 19, color: C.fg3 }}>one MCP · added once</span>
      </Fade>
      {/* every store on Vitrina */}
      {SHOPS.map((name, i) => {
        const p = prog(f, stores + i * 4, 12);
        const isL = i === LUMEN_I;
        const hit = prog(f, search + i * 2 + 18, 6) * (1 - prog(f, search + i * 2 + 26, 14));
        const lit = isL ? 1 : 1 - focus * 0.6;
        return (
          <div key={name} style={{ position: "absolute", left: SX, top: shopY(i) - 32, width: 440, height: 64, opacity: p * lit, transform: `translateX(${(1 - p) * 30}px) scale(${isL ? lerp(1, 1.06, focus) : 1})`, transformOrigin: "left center", borderRadius: 14, border: `1px solid ${isL && focus > 0.5 ? C.accent : hit > 0.3 ? "rgba(255,122,69,0.45)" : C.hair}`, background: C.surface, display: "flex", alignItems: "center", gap: 12, padding: "0 20px" }}>
            {isL ? <Avatar who="maya" size={36} /> : <span style={{ width: 10, height: 10, borderRadius: 5, background: C.fg3, margin: "0 13px" }} />}
            <span style={{ fontFamily: SANS, fontSize: 25, color: C.fg, whiteSpace: "nowrap" }}>{name}</span>
            {isL && <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 18, color: C.accent, opacity: focus, whiteSpace: "nowrap" }}>Classic Tee · $32</span>}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ───────────────────────────── 12 Back to Sam: finds, builds, stops, pays ─────────────────────────────
const LogRow: React.FC<{ at: number; name: string; args: string; res: React.ReactNode; hi?: number }> = ({ at, name, args, res, hi }) => {
  const f = useCurrentFrame();
  const h = hi !== undefined ? prog(f, hi, 10) : 0;
  return (
    <Fade at={at} style={{ padding: "16px 0", borderBottom: `1px solid ${C.hair}`, fontFamily: MONO }}>
      <div style={{ display: "flex", gap: 14, fontSize: 25 }}>
        <span style={{ color: C.accent }}>→</span>
        <span style={{ color: C.fg }}>{name}</span>
      </div>
      <div style={{ fontSize: 19, color: C.fg3, margin: "6px 0 0 36px" }}>{args}</div>
      <div style={{ position: "relative", display: "inline-block", fontSize: 21, color: C.fg2, margin: "8px 0 0 36px", padding: "2px 8px", borderRadius: 8 }}>
        <span style={{ position: "absolute", inset: 0, borderRadius: 8, border: `1.5px solid ${C.accent}`, opacity: h }} />
        {res}
      </div>
    </Fade>
  );
};

export const Again: React.FC = () => {
  const f = useCurrentFrame();
  const at = useCue();
  const tBack = at("back to sam");
  const send = at("same request") + 10;
  const cps = ASK.length / Math.max(1, (send - 6 - tBack) / 30);
  const tFind = at("this time");
  const tCard = at("finds lumen's");
  const tPrice = at("thirty-two");
  const tBuild = at("it builds");
  const tServer = at("prices it on");
  const tStop = at("then the agent stops");
  const tCall = at("sam's call");
  const tPay = at("sam approves");
  const tPaid = at("paid");
  const sheetIn = prog(f, tPay - 4, 14);
  const sheetOut = prog(f, tPaid - 2, 12);
  const press = prog(f, tPaid - 14, 6) * (1 - prog(f, tPaid - 6, 6));
  const pulse = f >= tCall && f < tPay ? 1 + Math.sin((f - tCall) / 4) * 0.03 : 1;
  return (
    <AbsoluteFill>
      <Persona who="sam" at={4} style={{ position: "absolute", left: 150, top: 470 }} />
      <Phone
        x={640}
        enter
        input={f < send && f >= tBack ? <Typed text={ASK} at={tBack} cps={cps} /> : undefined}
        overlay={
          sheetIn > 0 && sheetOut < 1 ? (
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 560, transform: `translateY(${(1 - sheetIn + sheetOut) * 100}%)`, background: "#ffffff", borderRadius: "34px 34px 0 0", padding: "26px 30px", display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 -20px 60px rgba(0,0,0,0.5)" }}>
              <div style={{ width: 60, height: 6, borderRadius: 3, background: "#d6d6d6", alignSelf: "center" }} />
              <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 34, color: PP.navy, letterSpacing: "-0.02em" }}>PayPal</div>
              <div style={{ fontFamily: SANS, fontSize: 20, color: "#555" }}>Pay Lumen Studio</div>
              <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 52, color: "#111", letterSpacing: "-0.02em" }}>$32.00 USD</div>
              <div style={{ fontFamily: SANS, fontSize: 19, color: "#555", padding: "14px 0", borderTop: "1px solid #eee", borderBottom: "1px solid #eee" }}>Classic Tee · Black / M</div>
              <div style={{ fontFamily: SANS, fontSize: 18, color: "#555" }}>Ship to · 88 Kent Ave, Brooklyn NY</div>
              <div style={{ marginTop: "auto", height: 62, borderRadius: 31, background: PP.blue, color: "#fff", display: "grid", placeItems: "center", fontFamily: SANS, fontWeight: 600, fontSize: 22, transform: `scale(${1 - press * 0.05})`, filter: `brightness(${1 - press * 0.15})` }}>Complete purchase</div>
            </div>
          ) : null
        }
      >
        <Reveal at={at("has vitrina")} h={80}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 14, border: `1px solid rgba(255,122,69,0.45)`, fontFamily: MONO, fontSize: 17, color: C.fg2 }}>
            <LiveDot color={C.accent} /> Vitrina connected
            <span style={{ marginLeft: "auto", color: C.fg3 }}>independent stores</span>
          </div>
        </Reveal>
        <Reveal at={send}>
          <UserMsg>{ASK}</UserMsg>
        </Reveal>
        <Reveal at={tFind}>
          <ToolRow name="search_products" where={MCP_HOST} at={tFind} doneAt={tFind + 22} tint={C.accent} />
        </Reveal>
        <Reveal at={tCard} h={200}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", padding: 12, borderRadius: 16, background: C.surface, border: `1px solid ${C.hair}` }}>
            <ProductTile img="tee-ink" size={92} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2, fontFamily: SANS }}>
              <span style={{ fontSize: 22, fontWeight: 500, color: C.fg }}>Classic Tee</span>
              <span style={{ fontSize: 17, color: C.fg3 }}>Lumen Studio · Brooklyn</span>
              <span style={{ fontFamily: MONO, fontSize: 17, color: C.fg2, marginTop: 4 }}>Black · M</span>
            </div>
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 22, color: C.fg, opacity: prog(f, tPrice, 8) }}>$32.00</span>
          </div>
        </Reveal>
        <Reveal at={tBuild}>
          <ToolRow name="create_checkout" where={MCP_HOST} at={tBuild} doneAt={tBuild + 22} tint={C.accent} />
        </Reveal>
        <Reveal at={tBuild + 22} h={220}>
          <div style={{ padding: "14px 16px", borderRadius: 16, background: C.surface, border: `1px solid ${C.hair}`, fontFamily: SANS, fontSize: 19, color: C.fg2, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex" }}>
              <span>1 × Classic Tee, Black / M</span>
              <span style={{ marginLeft: "auto", fontFamily: MONO }}>$32.00</span>
            </div>
            <div style={{ display: "flex" }}>
              <span>Shipping</span>
              <span style={{ marginLeft: "auto", fontFamily: MONO }}>Free</span>
            </div>
            <div style={{ display: "flex", borderTop: `1px solid ${C.hair}`, paddingTop: 8, color: C.fg, fontSize: 22, fontWeight: 500 }}>
              <span>Total</span>
              <span style={{ marginLeft: "auto", fontFamily: MONO }}>$32.00</span>
            </div>
            <span style={{ alignSelf: "flex-end", fontFamily: MONO, fontSize: 15, color: C.accent, opacity: prog(f, tServer, 10) }}>priced by the store's server</span>
          </div>
        </Reveal>
        <Reveal at={tStop} h={200}>
          <AgentMsg>Your order is ready. I can't pay for you, so you approve it.</AgentMsg>
          <div style={{ marginTop: 12, height: 56, borderRadius: 28, background: PP.yellow, display: "grid", placeItems: "center", fontFamily: SANS, fontWeight: 700, fontSize: 21, color: PP.navy, transform: `scale(${pulse})` }}>Pay with PayPal</div>
        </Reveal>
        <Reveal at={tPaid + 4}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 14, background: "rgba(76,195,138,0.12)", border: `1px solid ${C.pos}`, fontFamily: SANS, fontSize: 20, color: C.fg }}>
            <span style={{ color: C.pos }}>✓</span> Paid · order 7e1c4a90
          </div>
        </Reveal>
      </Phone>
      <div style={{ position: "absolute", left: 1010, top: 170, width: 790 }}>
        <Fade at={tFind - 6}>
          <Panel
            title={
              <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <LiveDot /> vitrina.dev/mcp
              </span>
            }
            right={<span style={{ color: C.fg3 }}>tool calls</span>}
          >
            <LogRow at={tFind + 4} name="search_products" args={'{ color: "black", size: "M", max_price: 40 }'} res="Classic Tee · Lumen Studio · $32.00" />
            <LogRow at={tBuild + 4} name="create_checkout" args={'{ item: "Classic Tee", variant: "Black / M" }'} res="payee Lumen Studio · total $32.00, on the server" hi={tServer} />
            <LogRow at={tPaid} name="get_order_status" args={'{ order: "7e1c4a90" }'} res={<span style={{ color: C.pos }}>COMPLETED · paid via PayPal</span>} />
          </Panel>
        </Fade>
        <div style={{ position: "absolute", right: 40, bottom: -130 }}>
          {f >= tPaid && <Stamp label="PAID" at={tPaid} />}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 13 The money lands with Maya ─────────────────────────────
export const Money: React.FC = () => {
  const f = useCurrentFrame();
  const at = useCue();
  const go = at("money goes");
  const acct = at("paypal account");
  const travel = prog(f, go + 4, acct - go + 6, easeDraw);
  const Y = 520;
  const xs = [380, 960, 1540];
  const x = travel < 0.5 ? lerp(xs[0], xs[1], travel * 2) : lerp(xs[1], xs[2], (travel - 0.5) * 2);
  const done = prog(f, acct + 10, 14);
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <Wire d={`M ${xs[0] + 80} ${Y} L ${xs[1] - 110} ${Y}`} len={400} at={4} color={C.fg3} />
        <Wire d={`M ${xs[1] + 110} ${Y} L ${xs[2] - 80} ${Y}`} len={400} at={12} color={PP.blue} width={3.5} />
      </svg>
      <Fade at={0} style={{ position: "absolute", left: xs[0] - 70, top: Y - 70, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <Avatar who="sam" size={140} />
        <span style={{ fontFamily: SANS, fontSize: 30, color: C.fg }}>Sam</span>
      </Fade>
      <Fade at={2} style={{ position: "absolute", left: xs[1] - 110, top: Y - 80, width: 220, height: 160, borderRadius: 30, border: `2px solid ${PP.blue}`, background: "rgba(0,112,224,0.10)", display: "grid", placeItems: "center" }}>
        <span style={{ fontFamily: SANS, fontSize: 44, fontWeight: 700, color: "#8cc2ff", letterSpacing: "-0.02em" }}>PayPal</span>
      </Fade>
      <Fade at={4} style={{ position: "absolute", left: xs[2] - 70, top: Y - 70, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <Avatar who="maya" size={140} />
        <span style={{ fontFamily: SANS, fontSize: 30, color: C.fg }}>Maya</span>
      </Fade>
      {travel > 0 && travel < 1 && (
        <div style={{ position: "absolute", left: x - 70, top: Y - 150, width: 140, padding: "10px 0", borderRadius: 14, background: C.fg, color: "#141415", fontFamily: MONO, fontSize: 26, fontWeight: 500, textAlign: "center" }}>$32.00</div>
      )}
      <div style={{ position: "absolute", left: xs[2] - 230, top: Y - 330, width: 460, opacity: done, transform: `translateY(${(1 - done) * 20}px)` }}>
        <Panel title={<span style={{ color: "#8cc2ff" }}>PayPal</span>} right={<span style={{ color: C.fg3 }}>now</span>}>
          <div style={{ fontFamily: SANS, fontSize: 24, color: C.fg2 }}>You received a payment</div>
          <div style={{ fontFamily: MONO, fontSize: 44, color: C.fg, marginTop: 6 }}>+$32.00 USD</div>
          <div style={{ fontFamily: MONO, fontSize: 18, color: C.fg3, marginTop: 6 }}>from Sam · Classic Tee, Black / M</div>
        </Panel>
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 13b How a store with no checkout gets paid ─────────────────────────────
const ROWS = [
  { k: "payee", v: "maya@lumenstudio.com" },
  { k: "items", v: "1 × Classic Tee, Black / M" },
  { k: "total", v: "$32.00 USD" },
  { k: "card", v: "Visa •••• 4417" },
  { k: "ship to", v: "88 Kent Ave, Brooklyn NY" },
];
const CX = 700;
const CY = 230;
const CW = 600;
const rowY = (i: number) => CY + 84 + i * 72 + 36;

export const Checkout: React.FC = () => {
  const f = useCurrentFrame();
  const at = useCue();
  const q = at("but how");
  const setup = at("maya's paypal email");
  const order = at("vitrina creates");
  const tItems = at("the items");
  const tTotal = at("and the total");
  const tCat = at("lumen's catalog");
  const tPayee = at("the payee is");
  const tCard = at("sam's card");
  const tShip = at("and address");
  const tNever = at("the agent never");
  const qOut = prog(f, setup - 8, 12);
  const rowAt = [tPayee, tItems, tTotal, tCard, tShip];
  const hidden = prog(f, tNever, 14);
  const payeeHi = prog(f, tPayee, 10);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 180, right: 180, top: 380, opacity: 1 - qOut, transform: `translateY(${-qOut * 40}px)` }}>
        <Punch text="But how does a store with no checkout get paid?" at={q} size={84} hi={["checkout"]} />
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <Wire d={`M 520 ${rowY(0) - 150} C 620 ${rowY(0) - 150}, 600 ${rowY(0)}, ${CX} ${rowY(0)}`} len={300} at={tPayee} color={C.accent} />
        <Wire d={`M 520 ${(rowY(1) + rowY(2)) / 2 + 120} C 620 ${(rowY(1) + rowY(2)) / 2 + 120}, 600 ${rowY(1)}, ${CX} ${rowY(1)}`} len={300} at={tCat} color={C.fg3} />
        <Wire d={`M 520 ${(rowY(1) + rowY(2)) / 2 + 120} C 620 ${(rowY(1) + rowY(2)) / 2 + 120}, 600 ${rowY(2)}, ${CX} ${rowY(2)}`} len={300} at={tCat + 4} color={C.fg3} />
        <Wire d={`M 1440 ${(rowY(3) + rowY(4)) / 2} C 1360 ${(rowY(3) + rowY(4)) / 2}, 1360 ${rowY(3)}, ${CX + CW} ${rowY(3)}`} len={200} at={tCard} color={PP.blue} />
        <Wire d={`M 1440 ${(rowY(3) + rowY(4)) / 2} C 1360 ${(rowY(3) + rowY(4)) / 2}, 1360 ${rowY(4)}, ${CX + CW} ${rowY(4)}`} len={200} at={tShip} color={PP.blue} />
      </svg>
      {/* sources */}
      <Fade at={setup} style={{ position: "absolute", left: 140, top: rowY(0) - 196, width: 380, padding: "18px 22px", borderRadius: 18, background: C.surface, border: `1px solid ${payeeHi > 0.5 ? C.accent : C.hair}`, display: "flex", gap: 14, alignItems: "center" }}>
        <Avatar who="maya" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: SANS, fontSize: 24, color: C.fg }}>Maya's setup</span>
          <span style={{ fontFamily: MONO, fontSize: 18, color: C.fg3 }}>maya@lumenstudio.com</span>
        </div>
      </Fade>
      <Fade at={tItems} style={{ position: "absolute", left: 140, top: (rowY(1) + rowY(2)) / 2 + 120 - 44, width: 380, padding: "14px 22px", borderRadius: 18, background: C.surface, border: `1px solid ${C.hair}`, display: "flex", gap: 14, alignItems: "center" }}>
        <ProductTile img="tee-ink" size={56} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: SANS, fontSize: 24, color: C.fg }}>Lumen's catalog</span>
          <span style={{ fontFamily: MONO, fontSize: 18, color: C.fg3 }}>prices set by the store</span>
        </div>
      </Fade>
      <Fade at={tCard - 4} style={{ position: "absolute", left: 1440, top: (rowY(3) + rowY(4)) / 2 - 44, width: 360, padding: "16px 22px", borderRadius: 18, background: "rgba(0,112,224,0.10)", border: `1px solid ${PP.blue}`, display: "flex", gap: 14, alignItems: "center" }}>
        <Avatar who="sam" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: SANS, fontSize: 24, color: C.fg }}>Sam's PayPal</span>
          <span style={{ fontFamily: MONO, fontSize: 18, color: "#8cc2ff" }}>card · address</span>
        </div>
      </Fade>
      {/* the PayPal order */}
      <Fade at={order} dy={24} style={{ position: "absolute", left: CX, top: CY, width: CW, borderRadius: 24, background: C.surface, border: `1.5px solid ${PP.blue}`, boxShadow: "0 30px 90px rgba(0,0,0,0.45)", overflow: "hidden" }}>
        <div style={{ height: 84, display: "flex", alignItems: "center", padding: "0 30px", borderBottom: `1px solid ${C.hair}`, background: "rgba(0,112,224,0.08)" }}>
          <span style={{ fontFamily: SANS, fontSize: 34, fontWeight: 700, color: "#8cc2ff", letterSpacing: "-0.02em" }}>PayPal</span>
          <span style={{ fontFamily: SANS, fontSize: 26, color: C.fg, marginLeft: 12 }}>order</span>
          <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 19, color: C.fg3 }}>created by Vitrina</span>
        </div>
        {ROWS.map((r, i) => {
          const p = prog(f, rowAt[i], 12);
          const hi = i === 0 ? payeeHi : 0;
          return (
            <div key={r.k} style={{ position: "relative", height: 72, display: "flex", alignItems: "center", padding: "0 30px", borderBottom: i < ROWS.length - 1 ? `1px solid ${C.hair}` : undefined, opacity: lerp(0.18, 1, p) }}>
              <span style={{ position: "absolute", inset: 0, background: C.accent, opacity: hi * 0.1 }} />
              <span style={{ position: "relative", fontFamily: MONO, fontSize: 21, color: C.fg3, width: 120, flexShrink: 0, whiteSpace: "nowrap" }}>{r.k}</span>
              <span style={{ position: "relative", flex: 1, minWidth: 0, fontFamily: i === 2 ? MONO : SANS, fontSize: 25, color: C.fg, whiteSpace: "nowrap" }}>
                <span style={{ opacity: i >= 3 ? 1 - hidden : 1 }}>{p > 0.05 ? r.v : ""}</span>
                {i >= 3 && hidden > 0 && <span style={{ position: "absolute", left: 0, top: "50%", width: i === 3 ? 150 : 190, height: 26, marginTop: -13, borderRadius: 6, background: "rgba(255,255,255,0.14)", opacity: hidden, transform: `scaleX(${lerp(0.6, 1, hidden)})`, transformOrigin: "left center" }} />}
              </span>
              {i >= 3 && hidden > 0 && <span style={{ position: "absolute", right: 30, fontFamily: MONO, fontSize: 17, color: C.accent, opacity: hidden, whiteSpace: "nowrap" }}>only PayPal sees this</span>}
            </div>
          );
        })}
      </Fade>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 14 Maya ships it, like any order ─────────────────────────────
export const Ship: React.FC = () => {
  const f = useCurrentFrame();
  const at = useCue();
  const land = at("lands") / 30;
  const addr = at("sam's address") / 30;
  const pack = at("packs it");
  const see = at("she can see");
  const step = at("every step");
  const side = prog(f, see - 6, 26, easeDraw);
  const label = prog(f, pack, 14) * (1 - prog(f, see - 10, 12));
  return (
    <AbsoluteFill>
      <Persona who="maya" at={2} style={{ position: "absolute", right: 120, top: 40 }} />
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${-420 * side}px) scale(${lerp(1, 0.72, side)})` }}>
        <Browser
          clip="orders"
          start={Math.max(0, 19.52 - land - 0.15)}
          url="vitrina.dev/stores/lumen-studio/orders"
          width={1440}
          y={40}
          cam={[
            [0, 1.15, 0.5, 0.46],
            [addr - 0.3, 1.15, 0.5, 0.46],
            [addr + 0.7, 2.1, 0.48, 0.53],
            [see / 30 - 0.2, 2.1, 0.48, 0.53],
            [see / 30 + 0.7, 1.15, 0.5, 0.46],
          ]}
        />
      </div>
      {/* Maya ships with her usual carrier: Vitrina just hands her the address */}
      <div style={{ position: "absolute", left: 90, bottom: 150, width: 430, opacity: label, transform: `translateY(${(1 - label) * 24}px) rotate(-1.5deg)`, borderRadius: 14, background: "#f3efe6", color: "#1b1b1b", padding: "18px 22px", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 15, color: "#6b665c", borderBottom: "1px solid #d6d0c2", paddingBottom: 8 }}>
          <span>from Lumen Studio</span>
          <span>1 × Classic Tee</span>
        </div>
        <div style={{ fontFamily: SANS, fontSize: 26, fontWeight: 600, marginTop: 10 }}>Sam Carter</div>
        <div style={{ fontFamily: SANS, fontSize: 22, lineHeight: 1.35 }}>88 Kent Ave<br />Brooklyn, NY 11249</div>
      </div>
      <div style={{ position: "absolute", left: 1120, top: 220, width: 720, opacity: side, transform: `translateX(${(1 - side) * 80}px)` }}>
        <Panel
          title={
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <LiveDot /> every tool call
            </span>
          }
          right={<span style={{ color: C.fg3 }}>order 7e1c4a90</span>}
        >
          <LogRow at={step + 2} name="search_products" args={'{ color: "black", size: "M", max_price: 40 }'} res="Classic Tee · Lumen Studio · $32.00" />
          <LogRow at={step + 10} name="create_checkout" args={'{ item: "Classic Tee", variant: "Black / M" }'} res="PayPal order · $32.00" />
          <LogRow at={step + 18} name="get_order_status" args={'{ order: "7e1c4a90" }'} res={<span style={{ color: C.pos }}>COMPLETED · paid via PayPal</span>} />
        </Panel>
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 15 End card ─────────────────────────────
export const End: React.FC = () => {
  const f = useCurrentFrame();
  const at = useCue();
  const shop = at("agents shop");
  const glass = prog(f, 0, 30, easeDraw);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: 1300, height: 600, borderRadius: 40, border: `1.5px solid rgba(255,255,255,${0.18 * glass})`, background: `rgba(255,255,255,${0.025 * glass})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22 }}>
        <Fade at={2} dy={20} style={{ fontFamily: MONO, fontSize: 150, fontWeight: 500, letterSpacing: "-0.05em", color: C.fg }}>
          vitrina<span style={{ color: C.accent }}>/</span>
        </Fade>
        <Fade at={at("any store")} style={{ fontFamily: SANS, fontSize: 52, color: C.fg }}>
          Any store, ready for agents.
        </Fade>
        <Fade at={at("wired to")} style={{ fontFamily: SANS, fontSize: 40, color: "#8cc2ff" }}>
          Wired to PayPal.
        </Fade>
        <div style={{ marginTop: 26 }}>
          <Punch text="Agents shop. Humans approve." at={shop} size={64} hi={["approve"]} align="center" />
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 60, fontFamily: MONO, fontSize: 20, color: C.fg3, opacity: prog(f, shop + 20, 20) }}>
        MCP server · PayPal checkout
      </div>
    </AbsoluteFill>
  );
};
