import React from "react";
import { AbsoluteFill, Composition } from "remotion";
import { Cut } from "./Cut";
import { Bg, Punch } from "./components/kit";
import { MONO } from "./fonts";
import { C, FPS, H, W } from "./theme";
import { TOTAL } from "./timing";

const Thumbnail: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Bg />
    <AbsoluteFill style={{ padding: "0 90px", justifyContent: "center", gap: 18 }}>
      <div style={{ fontFamily: MONO, fontSize: 44, color: C.fg2 }}>vitrina<span style={{ color: C.accent }}>/</span></div>
      <Punch text="Agents shop. Humans approve." at={0} size={110} hi={["approve."]} />
    </AbsoluteFill>
  </AbsoluteFill>
);

export const Root: React.FC = () => (
  <>
    <Composition id="Demo" component={Cut} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
    <Composition id="Thumbnail" component={Thumbnail} durationInFrames={1} fps={FPS} width={1280} height={720} />
  </>
);
