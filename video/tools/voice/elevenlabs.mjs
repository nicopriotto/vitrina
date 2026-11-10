// One continuous ElevenLabs take, pauses between sections -> public/audio/voice.mp3
// Credits are scarce, so this is guarded:
//   node tools/voice/elevenlabs.mjs            -> dry run: shows the character count only
//   node tools/voice/elevenlabs.mjs --go       -> generates (skips if the script text has not changed)
//   node tools/voice/elevenlabs.mjs --go --force
// Reads ELEVEN_LABS_KEY from the repo's .env.local. The key lacks voices_read, so the voice id is set here.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { LINES, SECTIONS } from "./lib.mjs";

config({ path: path.resolve(import.meta.dirname, "../../../.env.local") });
const key = process.env.ELEVEN_LABS_KEY;
const voice = process.env.ELEVENLABS_VOICE_ID || "iP95p4xoKVk53GoZ742B"; // premade "Chris" (picked by ear from tools/voice/samples.mjs)
const model = process.env.ELEVENLABS_MODEL || "eleven_v3"; // most expressive model; reads like a person, not a translator
if (!key) {
  console.error("ELEVEN_LABS_KEY is not set in .env.local");
  process.exit(1);
}

// v3 has no SSML breaks: sections are paragraphs, which it reads with a natural pause
const sep = model === "eleven_v3" ? "\n\n" : ' <break time="1.0s" /> ';
const text = SECTIONS.map((id) => LINES.filter((l) => l.section === id).map((l) => l.say).join(" ")).join(sep);
const chars = text.length;
const hash = crypto.createHash("sha1").update(`${voice}|${model}|${text}`).digest("hex");
const out = path.resolve(import.meta.dirname, "../../public/audio/voice-chris.mp3");
const hashFile = path.resolve(import.meta.dirname, "../../public/audio/voice-chris.hash");

console.log(`script: ${chars} characters, model ${model}, voice ${voice}`);
if (!process.argv.includes("--go")) {
  console.log("dry run: nothing sent. Add --go to generate.");
  process.exit(0);
}
if (fs.existsSync(out) && fs.existsSync(hashFile) && fs.readFileSync(hashFile, "utf8") === hash && !process.argv.includes("--force")) {
  console.log("script unchanged since the last generation: reusing", out);
  process.exit(0);
}

const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
  method: "POST",
  headers: { "xi-api-key": key, "Content-Type": "application/json" },
  body: JSON.stringify({ text, model_id: model, voice_settings: model === "eleven_v3" ? { stability: 0.5 } : { stability: 0.38, similarity_boost: 0.75, style: 0.35, use_speaker_boost: true } }),
});
if (!res.ok) {
  console.error("ElevenLabs error", res.status, (await res.text()).slice(0, 400));
  process.exit(1);
}
fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
fs.writeFileSync(hashFile, hash);
console.log("wrote", out, `(${chars} credits-ish used)`);
