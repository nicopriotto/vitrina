import fs from "node:fs";
import path from "node:path";

export const LINES = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, "voice-lines.json"), "utf8"));

/** Section ids in order of first appearance. */
export const SECTIONS = [...new Set(LINES.map((l) => l.section))];

export const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, "");
export const words = (text) => text.split(/\s+/).filter((w) => norm(w));
