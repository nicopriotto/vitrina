/* eslint-disable @next/next/no-img-element */
import type { ApiProduct } from "./types";

export function ProductCard({ p, compact = false }: { p: ApiProduct; compact?: boolean }) {
  const colors = [...new Set(p.variants.map((v) => v.attributes.color).filter(Boolean))];
  const sizes = [...new Set(p.variants.filter((v) => v.inStock).map((v) => v.attributes.size).filter(Boolean))];
  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-xl bg-[#f3f0e8]">
        {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="h-full w-full object-contain p-[7%]" loading="lazy" />}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <h3 className="truncate text-[14px] font-medium">{p.name}</h3>
        <span className="tnum font-mono text-[14px]">${Number(p.price).toFixed(2)}</span>
      </div>
      {!compact && (
        <div className="mt-1 flex items-baseline justify-between gap-3 text-[13px] text-fg3">
          <span className="truncate">{[colors.length ? `${colors.length} color${colors.length > 1 ? "s" : ""}` : null, sizes.length ? sizes.join(" ") : null].filter(Boolean).join(" · ")}</span>
          {p.originalPrice && <span className="tnum shrink-0 font-mono">{p.originalCurrency} {Number(p.originalPrice).toLocaleString("en-US")}</span>}
        </div>
      )}
      {!p.inStock && <div className="mt-1 text-[13px] text-neg">Sold out</div>}
    </div>
  );
}
