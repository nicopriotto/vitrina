const rows = [
  { n: "01", title: "Discover", call: "tools/list", out: "Five tools: store info, search, product details, checkout, order status." },
  { n: "02", title: "Search", call: 'search_products(query="t-shirt", color="black", size="M", max_price=40)', out: "Classic Tee · Black / M · $32.00" },
  { n: "03", title: "Check out", call: "create_checkout(items=[Classic Tee, Black / M])", out: "Order #7e1c4a90 · $32.00 · PayPal approval link for the buyer" },
  { n: "04", title: "Confirm", call: "get_order_status(order_id=7e1c4a90)", out: "Paid. The money goes straight to the store." },
];

/** What an agent can do with a store once Vitrina has published its endpoint. */
export function AgentCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-hair bg-deep">
      <div className="flex items-center justify-between border-b border-hair px-6 py-5">
        <div>
          <div className="text-[17px] font-medium">What an agent can do with your store</div>
          <div className="mt-1 text-[14px] text-fg3">Each step is a real tool call on the MCP endpoint</div>
        </div>
        <span className="flex items-center gap-2 text-[13px] text-fg3"><span className="live-dot h-1.5 w-1.5 rounded-full bg-pos" /> live</span>
      </div>
      <ol>
        {rows.map((r) => (
          <li key={r.n} className="grid grid-cols-[48px_1fr] gap-x-2 border-b border-hair px-6 py-5">
            <span className="font-mono text-[14px] text-fg3">{r.n}</span>
            <div>
              <div className="text-[16px] font-medium">{r.title}</div>
              <code className="mt-2 block rounded-lg bg-bg px-3 py-2 font-mono text-[13px] leading-5 text-fg2">{r.call}</code>
              <div className="mt-2 text-[15px] text-fg">{r.out}</div>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex items-center justify-between bg-surface px-6 py-4 text-[14px]">
        <span className="text-fg2">The agent never pays. The buyer approves on PayPal.</span>
        <span className="font-mono text-pos">PAID $32.00</span>
      </div>
    </div>
  );
}
