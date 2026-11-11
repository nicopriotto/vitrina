import { notFound } from "next/navigation";
import { getStoreBySlug } from "@/lib/stores";
import { OrdersTable } from "@/components/OrdersLive";
import { StoreNav } from "@/components/StoreNav";

export const dynamic = "force-dynamic";

export default async function OrdersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();
  return (
    <>
      <StoreNav name={store.name} slug={slug} />
      <main className="mx-auto max-w-[1280px] px-10 pb-24 pt-10">
        <h1 className="text-[44px] font-medium leading-[1.1] tracking-[-0.025em]">Orders</h1>
        <p className="mt-2 max-w-xl text-[17px] text-fg2">Every payment from an agent, as it happens. This page updates by itself.</p>
        <div className="mt-10"><OrdersTable slug={slug} /></div>
      </main>
    </>
  );
}
