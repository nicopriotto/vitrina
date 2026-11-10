// Writes src/data/take.json with *estimated* word timings so the cut renders before real audio exists.
// Replace it with the real one: `npm run voice` then `npm run transcribe`.
import fs from "node:fs";
import path from "node:path";
import { LINES, SECTIONS, words } from "./lib.mjs";

const OUT = path.resolve(import.meta.dirname, "../../src/data/take.json");
const WORD = 0.34; // seconds per word
const COMMA = 0.22;
const STOP = 0.4;
const SECTION_PAUSE = 0.9;

let t = 0.8;
const out = [];
const sections = [];
for (const id of SECTIONS) {
  const a = t;
  for (const line of LINES.filter((l) => l.section === id)) {
    for (const w of words(line.text)) {
      const s = t;
      t += WORD + Math.min(w.length, 10) * 0.012;
      out.push([w.replace(/[“”"]/g, ""), +s.toFixed(3), +(t - 0.03).toFixed(3)]);
      if (/[,:;]$/.test(w)) t += COMMA;
      if (/[.?!]$/.test(w)) t += STOP;
    }
  }
  sections.push({ id, a: +a.toFixed(3), b: +t.toFixed(3), pause: SECTION_PAUSE });
  t += SECTION_PAUSE;
}
const data = { estimated: true, duration: +(t + 1.5).toFixed(2), words: out, sections };
fs.writeFileSync(OUT, JSON.stringify(data, null, 1));
console.log(`take.json (estimated): ${data.duration}s, ${out.length} words, ${sections.length} sections`);
