import { appUrl } from "@/lib/config";
import { serverAiConfigured } from "@/lib/llm";
import { LandingForm } from "@/components/LandingForm";
import { AgentCard } from "@/components/landing/AgentCard";
import { ProductBand } from "@/components/landing/ProductBand";

export const dynamic = "force-dynamic";

const steps = [
  ["Read", "Shopify catalog, structured data, or plain HTML read by Claude, GPT or Llama."],
  ["Publish", "A catalog and a store-specific MCP endpoint, in about a minute."],
  ["Sell", "Agents build the order. The buyer approves with PayPal. Funds go to the store."],
];

export default function Landing() {
  return (
    <main>
      <section className="mx-auto grid min-h-[calc(100vh-80px)] max-w-[1600px] items-center gap-20 px-10 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div>
          <h1 className="max-w-[760px] text-[64px] font-medium leading-[1.02] tracking-[-0.035em] xl:text-[84px]">
            Make any store agent-ready in 60 seconds
          </h1>
          <p className="mt-7 max-w-[38rem] text-[21px] leading-[1.55] text-fg2">
            Paste a store URL. Vitrina publishes an MCP server for it, so any AI agent can search the catalog and check out with PayPal.
          </p>
          <LandingForm demoUrl={`${appUrl()}/mock/lumen`} serverAi={serverAiConfigured()} />
        </div>
        <AgentCard />
      </section>

      <ProductBand />

      <section id="how" className="border-t border-hair">
        <div className="mx-auto max-w-[1600px] px-10 py-20">
          <h2 className="text-[13px] font-medium text-fg3">How it works</h2>
          <ol className="mt-8 grid gap-12 md:grid-cols-3">
            {steps.map(([t, d], i) => (
              <li key={t} className="flex gap-6">
                <span className="tnum font-mono text-[15px] text-accent">0{i + 1}</span>
                <div>
                  <h3 className="text-[24px] font-medium tracking-tight">{t}</h3>
                  <p className="mt-3 max-w-[26rem] text-[17px] leading-relaxed text-fg2">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
