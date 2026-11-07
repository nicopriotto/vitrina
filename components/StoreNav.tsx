"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function StoreNav({ name, slug, demo = false }: { name: string; slug: string; demo?: boolean }) {
  const path = usePathname();
  const base = demo ? "/demo" : `/stores/${slug}`;
  const items = [
    { href: demo ? "/demo/store?done=1" : base, match: demo ? "/demo/store" : null, label: "Overview" },
    { href: `${base}/playground`, match: `${base}/playground`, label: "Agent playground" },
    { href: `${base}/orders`, match: `${base}/orders`, label: "Orders" },
  ];
  const active = (i: (typeof items)[number]) => (i.match ? path.startsWith(i.match) : path === base);
  return (
    <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between border-b border-hair px-10">
      <div className="flex items-center gap-3 text-[15px]">
        <span className="live-dot h-1.5 w-1.5 rounded-full bg-pos" />
        <span className="font-medium">{name}</span>
        <span className="text-fg3">agent endpoint live</span>
      </div>
      <nav className="flex h-full items-stretch gap-8">
        {items.map((i) => (
          <Link key={i.label} href={i.href} className={`relative flex items-center text-[15px] transition-colors ${active(i) ? "text-fg" : "text-fg3 hover:text-fg"}`}>
            {i.label}
            {active(i) && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" />}
          </Link>
        ))}
      </nav>
    </div>
  );
}
