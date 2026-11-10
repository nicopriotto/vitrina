// Stills of the store for the "what a person sees" shots.
import { chromium } from "playwright";
const SITE = process.env.SITE || "http://localhost:3000";
const b = await chromium.launch({ channel: "chrome" });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
for (const [url, out] of [["/mock/lumen/p/remera-classic", "pdp"], ["/mock/lumen", "home"]]) {
  await p.goto(SITE + url, { waitUntil: "networkidle" });
  await p.waitForTimeout(600);
  await p.screenshot({ path: `public/shots/${out}.png` });
}
await b.close();
console.log("ok");
