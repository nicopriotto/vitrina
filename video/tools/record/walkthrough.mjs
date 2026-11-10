// Walks the mocked /demo flow and saves a screenshot at each step: out/walkthrough/*.png
import path from "node:path";
import { SITE, launch, press, resetDemo, settle, sleep } from "./lib.mjs";

const out = path.resolve(import.meta.dirname, "../../out/walkthrough");
const s = await launch();
const shot = async (page, name) => { await page.screenshot({ path: path.join(out, `${name}.png`) }); console.log("shot", name); };
try {
  await resetDemo(s.context);
  const page = await s.context.newPage();
  await page.goto(`${SITE}/demo`); await settle(page);
  await page.waitForFunction(() => !document.querySelector("form button")?.disabled, null, { timeout: 30000 });
  await shot(page, "01-landing");
  await page.screenshot({ path: path.join(out, "01b-landing-full.png"), fullPage: true });
  await press(page, page.getByRole("button", { name: /make it agent-ready/i }));
  await page.waitForURL("**/demo/store"); await sleep(6500);
  await shot(page, "02-ingestion");
  await page.getByText("Endpoint live").first().waitFor({ timeout: 60000 }); await sleep(1200);
  await shot(page, "03-store-ready");
  await page.getByRole("button", { name: "ChatGPT" }).click(); await sleep(400);
  await page.screenshot({ path: path.join(out, "03b-connect-chatgpt.png"), clip: { x: 0, y: 0, width: 1920, height: 760 } });
  await page.getByRole("button", { name: "Cursor" }).click(); await sleep(400);
  await page.screenshot({ path: path.join(out, "03c-connect-cursor.png"), clip: { x: 0, y: 0, width: 1920, height: 760 } });
  await page.screenshot({ path: path.join(out, "03d-catalog-full.png"), fullPage: true });

  const orders = await s.context.newPage();
  await orders.goto(`${SITE}/demo/orders`); await settle(orders);
  await shot(orders, "04-orders-before");

  await page.goto(`${SITE}/demo/playground`); await settle(page);
  await page.getByText(/Which one would you like/).waitFor({ timeout: 60000 }); await sleep(800);
  await shot(page, "05-playground-search");
  await page.getByText("Pay with PayPal").waitFor({ timeout: 60000 }); await sleep(1500);
  await shot(page, "06-playground-checkout");
  await page.getByRole("button", { name: "Pay with PayPal" }).click(); await sleep(700);
  await shot(page, "07-paypal-modal");
  await page.getByRole("button", { name: /^Pay \$/ }).click();
  await page.getByText(/Paid\. Order #/).waitFor({ timeout: 30000 }); await sleep(1500);
  await shot(page, "08-playground-paid");
  await orders.bringToFront(); await sleep(1200);
  await shot(orders, "09-orders-after");
} finally {
  await s.browser.close();
}
