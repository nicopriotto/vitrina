/* eslint-disable @next/next/no-img-element */
import { PRODUCTS, priceUsd } from "@/app/(mock)/mock/lumen/data";

/** A strip of real catalog photos: the thing Vitrina read, shown as content, not decoration. */
export function ProductBand() {
  const tiles = PRODUCTS.filter((_, i) => i % 3 === 0).slice(0, 10);
  return (
    <section className="border-t border-hair py-14">
      <div className="mx-auto flex max-w-[1600px] items-baseline justify-between px-10">
        <h2 className="text-[22px] font-medium tracking-tight">Read from one URL: a 40-product catalog</h2>
        <span className="font-mono text-[14px] text-fg3">lumenstudio.com</span>
      </div>
      <div className="mt-8 flex gap-5 overflow-hidden px-10">
        {tiles.map((p) => (
          <div key={p.handle} className="w-[200px] shrink-0">
            <div className="aspect-[4/5] rounded-xl bg-[#f3f0e8]">
              <img src={p.colors[0].image} alt={p.name} className="h-full w-full object-contain p-[8%]" loading="lazy" />
            </div>
            <div className="mt-3 flex justify-between text-[14px]"><span className="truncate">{p.name}</span><span className="tnum font-mono text-fg2">${priceUsd(p).toFixed(2)}</span></div>
          </div>
        ))}
      </div>
    </section>
  );
}
