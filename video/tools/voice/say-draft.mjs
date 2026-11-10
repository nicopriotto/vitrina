// Scratch voice with macOS `say`, so the cut has real timings and a track to judge pacing.
// Replace with the ElevenLabs take later (npm run voice). Writes public/audio/voice.mp3.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { LINES, SECTIONS } from "./lib.mjs";

const voice = process.env.SAY_VOICE || "Samantha";
const rate = process.env.SAY_RATE || "165";
const dir = path.resolve(import.meta.dirname, "../../public/audio/.say");
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`${cmd} failed`);
};

const parts = [];
SECTIONS.forEach((id, i) => {
  const text = LINES.filter((l) => l.section === id).map((l) => l.say).join(" ");
  const aiff = path.join(dir, `${i}.aiff`);
  run("say", ["-v", voice, "-r", rate, "-o", aiff, text]);
  parts.push(aiff);
});
// 0.8s of lead-in, 0.9s between sections
const inputs = [];
const filters = [];
let n = 0;
const silence = (s) => { inputs.push("-f", "lavfi", "-t", String(s), "-i", "anullsrc=r=22050:cl=mono"); filters.push(`[${n}:a]aformat=sample_rates=22050:channel_layouts=mono[a${n}]`); return n++; };
const clip = (f) => { inputs.push("-i", f); filters.push(`[${n}:a]aformat=sample_rates=22050:channel_layouts=mono[a${n}]`); return n++; };
const order = [silence(0.8)];
parts.forEach((p, i) => { order.push(clip(p)); if (i < parts.length - 1) order.push(silence(0.9)); });
order.push(silence(1.2));
const out = path.resolve(import.meta.dirname, "../../public/audio/voice.mp3");
run("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", `${filters.join(";")};${order.map((k) => `[a${k}]`).join("")}concat=n=${order.length}:v=0:a=1[o]`, "-map", "[o]", "-c:a", "libmp3lame", "-b:a", "192k", out]);
fs.rmSync(dir, { recursive: true, force: true });
console.log("wrote", out);
