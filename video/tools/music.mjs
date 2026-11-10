import fs from "node:fs";
import { config } from "dotenv";
config({ path: "/Users/nicolaspriotto/proyects/payPalAgent/.env.local" });
const res = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", {
  method: "POST",
  headers: { "xi-api-key": process.env.ELEVEN_LABS_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: "Instrumental background bed for a modern tech product launch video. Minimal, confident, warm. Soft analog synth pulse and muted plucks at 100 BPM, light percussion, no vocals. Quiet and sparse for the first 57 seconds, with gentle tension building. At 58 seconds a clear uplifting lift: fuller drums, warm bass, bright chords. Then steady and optimistic, ending softly at 108 seconds.",
    music_length_ms: 108000,
    force_instrumental: true,
  }),
});
if (!res.ok) { console.error("error", res.status, (await res.text()).slice(0, 500)); process.exit(1); }
fs.writeFileSync("public/audio/music.mp3", Buffer.from(await res.arrayBuffer()));
console.log("ok");
