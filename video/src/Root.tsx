import React from "react";
import { AbsoluteFill, Composition, Img, staticFile } from "remotion";
import { Cut } from "./Cut";
import { Bg } from "./components/kit";
import { MONO, SANS } from "./fonts";
import { C, FPS, H, W } from "./theme";
import { TOTAL } from "./timing";

/** A crop of the real agent checkout card (docs/screenshots/agent.png), scaled up. */
const CheckoutCrop: React.FC = () => {
  const k = 1.35;
  const [x, y, w, h] = [73, 463, 398, 288];
  return (
    <div style={{ width: w * k, height: h * k, overflow: "hidden", borderRadius: 18, position: "relative", flexShrink: 0, boxShadow: "0 40px 80px rgba(0,0,0,0.45)", transform: "rotate(-3deg)" }}>
      <Img src={staticFile("thumb/agent.png")} style={{ position: "absolute", left: -x * k, top: -y * k, width: 1600 * k }} />
    </div>
  );
};

const Thumbnail: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Bg />
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: "0 70px 0 80px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        <div style={{ fontFamily: MONO, fontSize: 40, color: C.fg2 }}>vitrina<span style={{ color: C.accent }}>/</span></div>
        <div style={{ fontFamily: SANS, fontSize: 92, fontWeight: 500, lineHeight: 1.02, letterSpacing: "-0.03em", color: C.fg }}>
          Any small store,
          <br />
          <span style={{ color: C.accent }}>agent-ready.</span>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 28, color: C.fg3 }}>MCP server + PayPal checkout</div>
      </div>
      <CheckoutCrop />
    </AbsoluteFill>
  </AbsoluteFill>
);

export const Root: React.FC = () => (
  <>
    <Composition id="Demo" component={Cut} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
    <Composition id="Thumbnail" component={Thumbnail} durationInFrames={1} fps={FPS} width={1280} height={720} />
  </>
);
