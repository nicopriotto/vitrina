import takeJson from "./data/take.json";
import { FPS } from "./theme";

export type Take = {
  estimated?: boolean;
  duration: number;
  words: [string, number, number][];
  lines?: { id: string; a: number; b: number }[];
  sections: { id: string; a: number; b: number; pause: number }[];
};

export const take = takeJson as unknown as Take;
export const TOTAL = Math.ceil(take.duration * FPS);

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, "");

/** Frame where a phrase starts being spoken (searched in Whisper's words). The cut re-flows when the voice changes. */
export function cue(phrase: string, after = 0): number {
  const target = phrase.split(/\s+/).map(norm).filter(Boolean);
  const heard = take.words.map(([w]) => norm(w));
  for (let i = 0; i + target.length <= heard.length; i++) {
    if (take.words[i][1] < after) continue;
    if (target.every((t, k) => heard[i + k] === t)) return Math.round(take.words[i][1] * FPS);
  }
  console.warn(`cue("${phrase}") not found`);
  return Math.round(after * FPS);
}

/** Frame where a phrase starts, or the fallback. */
export function section(id: string) {
  const s = take.sections.find((x) => x.id === id);
  if (!s) throw new Error(`section ${id} missing in take.json`);
  return { from: Math.max(0, Math.round(s.a * FPS) - 12), to: Math.round(s.b * FPS) + 18, a: Math.round(s.a * FPS), b: Math.round(s.b * FPS) };
}

/** Frame where a phrase finishes being spoken. */
export function cueEnd(phrase: string, after = 0): number {
  const target = phrase.split(/\s+/).map(norm).filter(Boolean);
  const heard = take.words.map(([w]) => norm(w));
  for (let i = 0; i + target.length <= heard.length; i++) {
    if (take.words[i][1] < after) continue;
    if (target.every((t, k) => heard[i + k] === t)) return Math.round(take.words[i + target.length - 1][2] * FPS);
  }
  console.warn(`cueEnd("${phrase}") not found`);
  return Math.round(after * FPS);
}
