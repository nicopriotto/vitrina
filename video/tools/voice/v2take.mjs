// The whole script on eleven_multilingual_v2 (Chris), one request per line, chained with request stitching:
// each line gets the ids of the three lines before it, so voice and prosody stay the same from start to end.
// Short requests avoid the drift long single takes show. Same settings and seed for every line.
//   node tools/voice/v2take.mjs [--go]   -> public/audio/v2/<line>.mp3 (+ ids.json)
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { LINES } from "./lib.mjs";

config({ path: path.resolve(import.meta.dirname, "../../../.env.local") });
const voice = "iP95p4xoKVk53GoZ742B"; // Chris
const dir = path.resolve(import.meta.dirname, "../../public/audio/v2");
const chars = LINES.reduce((n, l) => n + l.say.length, 0);
console.log(`${LINES.length} lines, ${chars} characters`);
if (!process.argv.includes("--go")) process.exit(0);
fs.mkdirSync(dir, { recursive: true });
const idsFile = path.join(dir, "ids.json");
const ids = fs.existsSync(idsFile) ? JSON.parse(fs.readFileSync(idsFile, "utf8")) : {};
const done = [];
for (const [i, l] of LINES.entries()) {
  const out = path.join(dir, `${l.id}.mp3`);
  if (fs.existsSync(out) && ids[l.id]) { done.push(ids[l.id]); continue; }
  const body = {
    text: l.say,
    model_id: "eleven_multilingual_v2",
    seed: 4417,
    previous_request_ids: done.slice(-3),
    voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
  };
  if (LINES[i + 1]) body.next_text = LINES[i + 1].say;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVEN_LABS_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error("ElevenLabs error", l.id, res.status, (await res.text()).slice(0, 300));
    process.exit(1);
  }
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  ids[l.id] = res.headers.get("request-id");
  fs.writeFileSync(idsFile, JSON.stringify(ids, null, 1));
  done.push(ids[l.id]);
  console.log("wrote", l.id, ids[l.id] ? "" : "(no request id)");
}
