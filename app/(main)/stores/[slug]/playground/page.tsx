import { notFound } from "next/navigation";
import { appUrl } from "@/lib/config";
import { llmInfo } from "@/lib/llm";
import { getStoreBySlug } from "@/lib/stores";
import { Playground } from "@/components/Playground";
import { StoreNav } from "@/components/StoreNav";

export const dynamic = "force-dynamic";

export default async function PlaygroundPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store || store.status !== "ready") notFound();
  return (
    <>
    <StoreNav name={store.name} slug={slug} />
    <div className="h-6" />
    <Playground
      slug={slug}
      storeName={store.name}
      mcpUrl={`${appUrl()}/api/stores/${slug}/mcp`}
      paypalClientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? ""}
      aiLabel={llmInfo().label}
    />
    </>
  );
}
