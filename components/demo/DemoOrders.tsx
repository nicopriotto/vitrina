"use client";

import { OrdersTableView } from "../OrdersLive";
import { StoreNav } from "../StoreNav";
import { DEMO_STORE, resetDemo, useDemoOrders } from "@/lib/demo";

export function DemoOrders() {
  const [orders, setOrders] = useDemoOrders();
  return (
    <>
      <StoreNav name={DEMO_STORE.name} slug={DEMO_STORE.slug} demo />
      <main className="mx-auto max-w-[1280px] px-10 pb-24 pt-10">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[44px] font-medium leading-[1.1] tracking-[-0.025em]">Orders</h1>
            <p className="mt-2 max-w-xl text-[17px] text-fg2">Every payment from an agent, as it happens. This page updates by itself.</p>
          </div>
          <button onClick={resetDemo} className="mt-3 text-[13px] text-fg3 transition-colors hover:text-fg">Reset demo</button>
        </div>
        <div className="mt-10"><OrdersTableView orders={orders} playgroundHref="/demo/playground" onShip={(id) => setOrders((p) => p.map((o) => (o.id === id ? { ...o, shippedAt: new Date().toISOString() } : o)))} /></div>
      </main>
    </>
  );
}
