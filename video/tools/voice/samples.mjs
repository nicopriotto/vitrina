// A few short voice candidates of the hook, to choose a voice by ear before spending a full take.
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
config({ path: path.resolve(import.meta.dirname, "../../../.env.local") });
const text = "Your next customer won't browse your store. [short pause] They'll send an agent. Like Sam, tonight: \"Find me a black tee, size M, under forty dollars. And buy it.\"";
const VOICES = { chris: "iP95p4xoKVk53GoZ742B", eric: "cjVigY5qzO86Huf0OWal", jessica: "cgSgspJ2msm6clMCkdW9" };
for (const [name, id] of Object.entries(VOICES)) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${id}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVEN_LABS_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: "eleven_v3", voice_settings: { stability: 0.5 } }),
  });
  if (!res.ok) { console.error(name, res.status, (await res.text()).slice(0, 300)); continue; }
  fs.writeFileSync(path.resolve(import.meta.dirname, `../../public/audio/samples/${name}-v3.mp3`), Buffer.from(await res.arrayBuffer()));
  console.log("ok", name, text.length);
}
