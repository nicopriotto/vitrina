import { Easing, interpolate } from "remotion";

// Same two curves as the app (--ease-out-soft) for the whole video.
export const easeOut = Easing.bezier(0.22, 1, 0.36, 1);
export const easeDraw = Easing.bezier(0.65, 0, 0.35, 1);

/** 0 to 1 between `start` and `start + dur` frames, clamped. */
export const prog = (frame: number, start: number, dur: number, ease = easeOut) =>
  interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
