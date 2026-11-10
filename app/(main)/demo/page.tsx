import { appUrl } from "@/lib/config";
import { DemoLanding } from "@/components/demo/DemoLanding";
import { AgentCard } from "@/components/landing/AgentCard";
import { ProductBand } from "@/components/landing/ProductBand";

export const dynamic = "force-dynamic";

export default function DemoLandingPage() {
  return (
    <main>
      <section className="mx-auto grid min-h-[calc(100vh-80px)] max-w-[1600px] items-center gap-20 px-10 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div>
          <h1 className="max-w-[760px] text-[64px] font-medium leading-[1.02] tracking-[-0.035em] xl:text-[84px]">Make any store agent-ready in 60 seconds</h1>
          <p className="mt-7 max-w-[38rem] text-[21px] leading-[1.55] text-fg2">
            Paste a store URL. Vitrina publishes an MCP server for it, so any AI agent can search the catalog and check out with PayPal.
          </p>
          <DemoLanding demoUrl={`${appUrl()}/mock/lumen`} />
        </div>
        <AgentCard />
      </section>
      <ProductBand />
    </main>
  );
}
