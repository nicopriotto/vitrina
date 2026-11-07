import { notFound } from "next/navigation";
import { appUrl } from "@/lib/config";
import { getStoreBySlug } from "@/lib/stores";
import { StoreView } from "@/components/StoreView";

export const dynamic = "force-dynamic";

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();
  const { payeeEmail, createdAt, logoUrl, currency, ...pub } = store;
  void payeeEmail; void createdAt; void logoUrl; void currency;
  return <StoreView initialStore={pub} mcpUrl={`${appUrl()}/api/stores/${slug}/mcp`} />;
}
