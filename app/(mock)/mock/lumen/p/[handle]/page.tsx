import { notFound } from "next/navigation";
import { findProduct, formatUsd, priceUsd } from "../../data";

export default async function LumenProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ jsonld?: string }>;
}) {
  const { handle } = await params;
  const { jsonld } = await searchParams;
  const p = findProduct(handle);
  if (!p) notFound();

  const origin = process.env.APP_URL ?? "http://localhost:3000";
  const isSoldOut = (color: string, size: string) => p.soldOut.includes(`${color}/${size}`);

  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: `${origin}${p.colors[0].image}`,
    url: `${origin}/mock/lumen/p/${p.handle}`,
    offers: p.colors.flatMap((c) =>
      p.sizes.map((s) => ({
        "@type": "Offer",
        name: `${c.name} / ${s}`,
        price: priceUsd(p),
        priceCurrency: "USD",
        availability: isSoldOut(c.name, s) ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      })),
    ),
  };

  return (
    <main className="pdp">
      <div className="img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.colors[0].image} alt={p.name} />
      </div>
      <div>
        <div className="label">Lumen Studio</div>
        <h1>{p.name}</h1>
        <div className="price">{formatUsd(priceUsd(p))}</div>
        <p className="desc">{p.description}</p>

        <div className="label">Color</div>
        <div className="swatches">
          {p.colors.map((c) => (
            <span className="sw" key={c.name}>
              <i style={{ background: c.hex }} />
              {c.name}
            </span>
          ))}
        </div>

        {p.colors.length > 1 && (
          <div className="thumbs">
            {p.colors.map((c) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={c.name} src={c.image} alt={`${p.name} in ${c.name}`} />
            ))}
          </div>
        )}

        <div className="label">Size</div>
        <div className="sizes">
          {p.sizes.map((s) => (
            <span key={s} className="sz">{s}</span>
          ))}
        </div>

        <div className="label">Availability</div>
        <ul className="avail">
          {p.colors.map((c) => {
            const off = p.sizes.filter((s) => isSoldOut(c.name, s));
            const on = p.sizes.filter((s) => !isSoldOut(c.name, s));
            return (
              <li key={c.name}>
                {c.name}: {on.length ? `in stock in ${on.join(", ")}` : "sold out"}
                {off.length && on.length ? ` (sold out in ${off.join(", ")})` : ""}
              </li>
            );
          })}
        </ul>

        <button className="add" type="button">Add to cart</button>
        <div className="note">Checkout is coming soon. DM us on Instagram to order.</div>
      </div>
      {jsonld === "1" && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      )}
    </main>
  );
}
