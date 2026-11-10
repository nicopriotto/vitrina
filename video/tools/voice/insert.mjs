// Generates ONE section of the script (default "how") with the same voice, using the neighbouring lines
// as previous_text / next_text so the intonation joins the existing take. Saves credits vs. a full re-take.
//   node tools/voice/insert.mjs [section] --go
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { LINES } from "./lib.mjs";

config({ path: path.resolve(import.meta.dirname, "../../../.env.local") });
const section = process.argv.find((a, i) => i > 1 && !a.startsWith("--")) || "how";
const idx = LINES.map((l, i) => (l.section === section ? i : -1)).filter((i) => i >= 0);
const text = idx.map((i) => LINES[i].say).join(" ");
const prev = LINES[idx[0] - 1]?.say ?? "";
const next = LINES[idx[idx.length - 1] + 1]?.say ?? "";
console.log(`section ${section}: ${text.length} characters`);
if (!process.argv.includes("--go")) process.exit(0);
const voice = "nPczCjzI2devNBz1zQrb";
const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
  method: "POST",
  headers: { "xi-api-key": process.env.ELEVEN_LABS_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ text, previous_text: prev, next_text: next, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.38, similarity_boost: 0.75, style: 0.35, use_speaker_boost: true } }),
});
if (!res.ok) {
  console.error("ElevenLabs error", res.status, (await res.text()).slice(0, 400));
  process.exit(1);
}
const out = path.resolve(import.meta.dirname, `../../public/audio/insert-${section}.mp3`);
fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
console.log("wrote", out);
