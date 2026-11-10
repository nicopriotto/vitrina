// Records the mocked /demo as sharp, constant-30fps H.264 clips.
// Frames come from Chrome's own screencast (CDP Page.startScreencast) at full device pixels, each with its
// real timestamp; ffmpeg turns them into a CFR MP4. Playwright's recordVideo is VP8 and soft.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

export const SITE = (process.env.SITE || "http://localhost:3000").replace(/\/$/, "");
export const FOOTAGE = path.resolve(import.meta.dirname, "../../public/footage");
export const MANIFEST = path.resolve(import.meta.dirname, "../../src/data/footage.json");
const WORK = process.env.RECORD_WORK || path.join(FOOTAGE, ".frames");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A visible pointer + click ripple drawn inside the page, so the screencast shows where the "user" is.
const CURSOR_JS = `(() => {
  if (window.__cursorInstalled) return; window.__cursorInstalled = true;
  const mk = () => {
    const el = document.createElement("div");
    el.id = "__cursor";
    el.style.cssText = "position:fixed;left:0;top:0;width:34px;height:34px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);transition:opacity 0.3s;opacity:0";
    window.__cursorShow = (on) => { el.style.opacity = on ? "1" : "0"; };
    el.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24"><path d="M4 2l15 9-6.5 1.6L9.6 19z" fill="#ededed" stroke="#141415" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(el);
    const ring = document.createElement("div");
    ring.style.cssText = "position:fixed;left:0;top:0;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;border:3px solid #ff7a45;z-index:2147483646;pointer-events:none;opacity:0";
    document.documentElement.appendChild(ring);
    addEventListener("mousemove", (e) => { el.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)"; }, true);
    addEventListener("mousedown", (e) => {
      ring.style.left = e.clientX + "px"; ring.style.top = e.clientY + "px";
      ring.animate([{ opacity: 0.95, transform: "scale(0.6)" }, { opacity: 0, transform: "scale(3.2)" }], { duration: 520, easing: "ease-out" });
    }, true);
  };
  if (document.documentElement) mk(); else addEventListener("DOMContentLoaded", mk);
})();`;

export async function launch() {
  const executablePath = process.env.CHROMIUM_PATH || (fs.existsSync(CHROME) ? CHROME : undefined);
  const browser = await chromium.launch({ executablePath, headless: true, args: ["--hide-scrollbars", "--window-size=1920,1200", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: "dark", locale: "en-US" });
  await context.addInitScript(CURSOR_JS);
  return { browser, context, size: { w: 1920, h: 1080 } };
}

/** Wait for fonts, images and two painted frames before recording. */
export async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}

/** Human-looking click: glide the mouse in 12 steps, pause 600ms so the cut reads, then click. */
export async function press(page, locator, { steps = 30, pause = 700, keep = false } = {}) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("press: element not visible");
  // the pointer only exists around important clicks: it fades in, glides, pauses, clicks, fades out
  await page.evaluate(() => window.__cursorShow && window.__cursorShow(true));
  await sleep(250);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps });
  await sleep(pause);
  await page.mouse.down();
  await page.mouse.up();
  if (!keep) {
    await sleep(650);
    await page.evaluate(() => window.__cursorShow && window.__cursorShow(false));
  }
}

/** Glide the pointer to a point (or an element's center) without clicking. */
export async function glide(page, target, { steps = 28, pause = 250 } = {}) {
  let x, y;
  if (Array.isArray(target)) [x, y] = target;
  else {
    const box = await target.boundingBox();
    x = box.x + box.width / 2;
    y = box.y + box.height / 2;
  }
  await page.mouse.move(x, y, { steps });
  await sleep(pause);
}

/** Smooth scroll, eased, at the page's own frame rate. */
export async function smoothScroll(page, { to, ms = 4000 }) {
  await page.evaluate(
    ({ to, ms }) =>
      new Promise((resolve) => {
        const el = document.scrollingElement;
        const from = el.scrollTop;
        const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
        const t0 = performance.now();
        const step = (now) => {
          const k = Math.min(1, (now - t0) / ms);
          el.scrollTop = from + (to - from) * ease(k);
          k < 1 ? requestAnimationFrame(step) : resolve();
        };
        requestAnimationFrame(step);
      }),
    { to, ms },
  );
}

export async function resetDemo(context) {
  const p = await context.newPage();
  await p.goto(`${SITE}/demo/orders`);
  await p.evaluate(() => { localStorage.removeItem("vitrina-demo-orders"); localStorage.removeItem("vitrina-demo-wire"); });
  await p.close();
}

export class Clip {
  constructor(session, page, name) {
    this.s = session;
    this.page = page;
    this.name = name;
    this.dir = path.join(WORK, name);
    this.frames = [];
    this.marks = [];
  }

  async start() {
    fs.rmSync(this.dir, { recursive: true, force: true });
    fs.mkdirSync(this.dir, { recursive: true });
    this.cdp = await this.s.context.newCDPSession(this.page);
    this.cdp.on("Page.screencastFrame", (f) => {
      const file = path.join(this.dir, `f${String(this.frames.length).padStart(5, "0")}.jpg`);
      fs.writeFileSync(file, Buffer.from(f.data, "base64"));
      this.frames.push({ file, t: f.metadata.timestamp });
      this.cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
    });
    await this.cdp.send("Page.startScreencast", { format: "jpeg", quality: 94, maxWidth: this.s.size.w, maxHeight: this.s.size.h, everyNthFrame: 1 });
    await this.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await sleep(150);
    this.t0 = this.frames[0]?.t ?? Date.now() / 1000;
    return this;
  }

  mark(what) {
    const t = Date.now() / 1000 - this.t0;
    this.marks.push({ t, what });
    console.log(`  [${this.name}] ${t.toFixed(1)}s ${what}`);
  }

  async stop() {
    const tEnd = Date.now() / 1000;
    await this.cdp.send("Page.stopScreencast").catch(() => {});
    await sleep(200);
    const frames = this.frames.filter((f) => f.t <= tEnd);
    if (!frames.length) throw new Error(`${this.name}: no frames`);
    const lines = [];
    for (let i = 0; i < frames.length; i++) {
      const next = i + 1 < frames.length ? frames[i + 1].t : tEnd;
      lines.push(`file '${frames[i].file}'`, `duration ${Math.max(0.001, next - frames[i].t).toFixed(4)}`);
    }
    lines.push(`file '${frames[frames.length - 1].file}'`);
    const list = path.join(this.dir, "list.txt");
    fs.writeFileSync(list, lines.join("\n"));
    fs.mkdirSync(FOOTAGE, { recursive: true });
    const out = path.join(FOOTAGE, `${this.name}.mp4`);
    const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x141415,fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-movflags", "+faststart", "-r", "30", out], { stdio: "inherit" });
    if (r.status !== 0) throw new Error(`${this.name}: ffmpeg failed`);
    const duration = tEnd - this.t0;
    fs.writeFileSync(path.join(FOOTAGE, `${this.name}.json`), JSON.stringify({ name: this.name, duration, marks: this.marks }, null, 2));
    const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : {};
    manifest[this.name] = { duration: +duration.toFixed(2) };
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
    console.log(`  [${this.name}] wrote ${out}: ${duration.toFixed(1)}s, ${frames.length} frames (${(frames.length / duration).toFixed(1)} fps captured)`);
    if (!process.env.KEEP_FRAMES) fs.rmSync(this.dir, { recursive: true, force: true });
  }
}
