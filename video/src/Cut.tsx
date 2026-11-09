import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { prog } from "./anim";
import { Bg, Captions, Sound } from "./components/kit";
import { MONO } from "./fonts";
import * as S from "./v5/scenes";
import { C, FPS } from "./theme";
import { take, TOTAL } from "./timing";
import { BeatCtx } from "./ui";

/**
 * The voice is the clock. Each beat starts on its first spoken line and runs until the next beat begins;
 * beats that explain one idea across several lines (scrape, MCP map, shop) are a single continuous scene.
 * One transition for the whole video: a plain crossfade.
 */
const BEATS: { first: string; node: React.FC; captions?: boolean }[] = [
  { first: "H1", node: S.Hook, captions: false }, // the line is on screen as kinetic type
  { first: "H3", node: S.SamAsks }, // Sam asks; the agent never finds Lumen
  { first: "H5", node: S.Lumen }, // the same tee, frosted over
  { first: "P1", node: S.AgentSees }, // what a person sees vs what an agent sees; no feed, no API, no checkout
  { first: "P3", node: S.LongTail }, // PayPal reaches the head; the tail is left behind
  { first: "T1", node: S.Turn }, // vitrina (n.) shop window, for agents
  { first: "I1", node: S.Maya }, // Maya pastes her URL + PayPal email
  { first: "I2", node: S.Reads }, // the glass clears as Vitrina reads the store
  { first: "I3", node: S.Catalog }, // the same HTML becomes a catalog
  { first: "C1", node: S.Live }, // climax: Lumen is live on Vitrina (music lift)
  { first: "C2", node: S.Clients }, // shoppers add Vitrina once; every store is one search away
  { first: "R1", node: S.Again }, // back to Sam: finds, builds, stops, pays
  { first: "R6", node: S.Money }, // the money lands with Maya
  { first: "K1", node: S.Checkout }, // how a store with no checkout gets paid
  { first: "S1", node: S.Ship }, // the order lands with the address; Maya ships it; every tool call
  { first: "X1", node: S.End, captions: false }, // end card
];

const FADE = 8;
const startOf = (id: string) => Math.max(0, Math.round(take.lines!.find((l) => l.id === id)!.a * FPS) - FADE);
const starts = BEATS.map((b, i) => (i === 0 ? 0 : startOf(b.first)));
const spans = BEATS.map((_, i) => {
  const from = i === 0 ? 0 : starts[i] - FADE;
  const end = i + 1 < starts.length ? starts[i + 1] : TOTAL;
  return { from, len: end - from };
});

const Fade: React.FC<{ children: React.ReactNode; first: boolean }> = ({ children, first }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: first ? 1 : prog(f, 0, FADE) }}>{children}</AbsoluteFill>;
};

/** The brand, small and always visible, top left. */
const Mark: React.FC = () => (
  <div style={{ position: "absolute", left: 72, top: 26, fontFamily: MONO, fontSize: 40, fontWeight: 500, letterSpacing: "-0.04em", color: C.fg }}>
    vitrina<span style={{ color: C.accent }}>/</span>
  </div>
);

/** Captions are hidden where the same words are already on screen as type. */
const quiet = BEATS.map((b, i) => (b.captions === false ? spans[i] : null)).filter(Boolean) as { from: number; len: number }[];
const Subs: React.FC = () => {
  const f = useCurrentFrame();
  if (quiet.some((q) => f >= q.from + 8 && f < q.from + q.len)) return null;
  return (
    <>
      <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(14,14,15,0.85) 0%, rgba(14,14,15,0) 22%)", pointerEvents: "none" }} />
      <Captions />
    </>
  );
};
const End0 = spans[spans.length - 1].from;
const TopMark: React.FC = () => {
  const f = useCurrentFrame();
  return <div style={{ opacity: 1 - prog(f, End0, 10) }}><Mark /></div>;
};

export const Cut: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg, color: C.fg }}>
    <Bg />
    {BEATS.map((b, i) => {
      const Scene = b.node;
      return (
        <Sequence key={b.first} from={spans[i].from} durationInFrames={spans[i].len}>
          <BeatCtx.Provider value={spans[i]}>
            <Fade first={i === 0}>
              <Scene />
            </Fade>
          </BeatCtx.Provider>
        </Sequence>
      );
    })}
    <TopMark />
    <Subs />
    <Sound total={TOTAL} />
  </AbsoluteFill>
);
