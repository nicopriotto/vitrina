// Generates sections one request at a time (eleven_v3, Chris). Long v3 takes drift: the voice gets brighter
// and harsher toward the end. Short requests each start fresh, so the whole read keeps the quality of its opening.
//   node tools/voice/sections.mjs turn input climax ... [--go]   -> public/audio/sec-<section>.mp3
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { LINES } from "./lib.mjs";

config({ path: path.resolve(import.meta.dirname, "../../../.env.local") });
const wanted = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const voice = "iP95p4xoKVk53GoZ742B"; // Chris
let total = 0;
const jobs = wanted.map((s) => {
  const text = LINES.filter((l) => l.section === s).map((l) => l.say).join(" ");
  total += text.length;
  return { s, text };
});
console.log(jobs.map((j) => `${j.s}: ${j.text.length}`).join(", "), `= ${total} characters`);
if (!process.argv.includes("--go")) process.exit(0);
for (const { s, text } of jobs) {
  const out = path.resolve(import.meta.dirname, `../../public/audio/sec-${s}.mp3`);
  if (fs.existsSync(out)) { console.log("keep", s); continue; }
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVEN_LABS_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: "eleven_v3", voice_settings: { stability: 0.5 } }),
  });
  if (!res.ok) {
    console.error("ElevenLabs error", s, res.status, (await res.text()).slice(0, 300));
    process.exit(1);
  }
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  console.log("wrote", s);
}
