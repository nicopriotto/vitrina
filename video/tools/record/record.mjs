// Usage: node tools/record/record.mjs [site landing ingest connect shop orders]   (default: all)
// Needs the app running (pnpm dev at the repo root) at SITE (default http://localhost:3000).
// One take = one clip. A visible cursor is injected into the page, so clicks and hovers show up in the footage.
import { Clip, SITE, launch, press, resetDemo, settle, sleep, smoothScroll } from "./lib.mjs";

const takes = {
  // The small store itself: no pointer, no zoom, just a slow scroll down the catalog.
  async site(s) {
    const page = await s.context.newPage();
    await page.goto(`${SITE}/mock/lumen`);
    await settle(page);
    await page.mouse.move(1850, 1000);
    const clip = await new Clip(s, page, "site").start();
    clip.mark("store home");
    await sleep(900);
    await smoothScroll(page, { to: 1500, ms: 7000 });
    await smoothScroll(page, { to: 3300, ms: 6000 });
    await sleep(400);
    await clip.stop();
    await page.close();
  },

  async landing(s) {
    const page = await s.context.newPage();
    await page.goto(`${SITE}/demo`);
    await settle(page);
    await page.mouse.move(1500, 700);
    const clip = await new Clip(s, page, "landing").start();
    clip.mark("form starts typing");
    await page.waitForFunction(() => !document.querySelector("form button")?.disabled, null, { timeout: 30000 });
    clip.mark("form filled");
    await sleep(500);
    await press(page, page.getByRole("button", { name: /make it agent-ready/i }));
    clip.mark("clicked");
    await sleep(700);
    await clip.stop();
    await page.close();
  },

  async ingest(s) {
    const page = await s.context.newPage();
    await page.goto(`${SITE}/demo/store`);
    await settle(page);
    await page.mouse.move(1200, 640);
    const clip = await new Clip(s, page, "ingest").start();
    clip.mark("ingestion starts");
    await page.getByText("Endpoint live").first().waitFor({ timeout: 60000 });
    clip.mark("endpoint live");
    await sleep(1500);
    await clip.stop();
    await page.close();
  },

  // The ready store page: copy the endpoint, then click through the clients.
  async connect(s) {
    const page = await s.context.newPage();
    await page.goto(`${SITE}/demo/store?done=1`);
    await settle(page);
    await page.mouse.move(1500, 160);
    const clip = await new Clip(s, page, "connect").start();
    clip.mark("store ready");
    await sleep(900);
    await press(page, page.getByRole("button", { name: "Copy" }).first());
    clip.mark("copied");
    await sleep(800);
    for (const name of ["ChatGPT", "Gemini CLI", "Cursor", "Claude"]) {
      await press(page, page.getByRole("button", { name, exact: true }), { steps: 12, pause: 220 });
      clip.mark(name);
      await sleep(450);
    }
    await sleep(500);
    await clip.stop();
    await page.close();
  },

  // The agent shops; the buyer clicks Pay, approves in the PayPal window, then we look at the wire log.
  async shop(s) {
    await resetDemo(s.context);
    const page = await s.context.newPage();
    await page.goto(`${SITE}/demo/playground`);
    await settle(page);
    await page.mouse.move(1300, 800);
    const clip = await new Clip(s, page, "shop").start();
    clip.mark("agent starts typing");
    await page.getByText("Pay with PayPal").waitFor({ timeout: 60000 });
    clip.mark("checkout card");
    await sleep(1500);
    await press(page, page.getByRole("button", { name: "Pay with PayPal" }));
    clip.mark("clicked pay");
    await page.getByRole("button", { name: /^Pay \$/ }).waitFor();
    await sleep(900);
    await press(page, page.getByRole("button", { name: /^Pay \$/ }));
    clip.mark("approved");
    await page.getByText(/Paid\. Order #/).waitFor({ timeout: 30000 });
    clip.mark("paid confirmation");
    await sleep(900);
    await sleep(900);
    clip.mark("wire log");
    await sleep(1800);
    await clip.stop();
    await page.close();
  },

  // Orders dashboard in its own tab while the playground (not recorded) places an order.
  async orders(s) {
    await resetDemo(s.context);
    const orders = await s.context.newPage();
    await orders.goto(`${SITE}/demo/orders`);
    await settle(orders);
    await orders.mouse.move(1500, 500);
    const clip = await new Clip(s, orders, "orders").start();
    clip.mark("dashboard idle");
    const agent = await s.context.newPage();
    await agent.goto(`${SITE}/demo/playground?autopay=1`);
    await orders.bringToFront();
    await orders.getByText(/Classic Tee/).waitFor({ timeout: 90000 });
    clip.mark("new order arrived");
    // timed to the voice: "The order lands ... marks it shipped" is ~4.4 s
    await sleep(3000);
    await press(orders, orders.getByRole("button", { name: "Mark as shipped" }).first());
    clip.mark("marked shipped");
    await sleep(3000);
    await clip.stop();
    await agent.close();
    await orders.close();
  },
};

const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(takes);
const session = await launch();
try {
  for (const name of wanted) {
    if (!takes[name]) throw new Error(`unknown take "${name}" (have: ${Object.keys(takes).join(", ")})`);
    console.log(`> ${name}`);
    await takes[name](session);
  }
} finally {
  await session.browser.close();
}
