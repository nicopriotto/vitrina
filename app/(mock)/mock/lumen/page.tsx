import Link from "next/link";
import { PRODUCTS, formatUsd, priceUsd } from "./data";

export default async function LumenHome({ searchParams }: { searchParams: Promise<{ jsonld?: string }> }) {
  const { jsonld } = await searchParams;
  const qs = jsonld === "1" ? "?jsonld=1" : "";
  return (
    <main>
      <section className="hero">
        <h1>Quiet essentials, cut and sewn in Brooklyn.</h1>
        <p>Lumen Studio is a small label making tees, sweatshirts, caps and totes in short runs. Nothing loud, everything lasts.</p>
      </section>
      <section className="grid">
        {PRODUCTS.map((p) => (
          <Link key={p.handle} href={`/mock/lumen/p/${p.handle}${qs}`} className="card">
            <div className="img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${p.colors[0].image}`} alt={p.name} />
            </div>
            <h3>{p.name}</h3>
            <div className="price">{formatUsd(priceUsd(p))}</div>
          </Link>
        ))}
      </section>
    </main>
  );
}
