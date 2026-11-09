import footageJson from "./data/footage.json";

/** Camera keyframes: [seconds into the beat, zoom, focusX, focusY] (focus as 0..1 of the frame). */
export type Cam = [number, number, number, number][];

// Clips are recorded from /demo by `npm run record` (tools/record/record.mjs).
export const footage = footageJson as Record<string, { duration: number }>;
export const hasFootage = (name: string) => Boolean(footage[name]);
