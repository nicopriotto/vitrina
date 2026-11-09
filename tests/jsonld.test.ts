import { describe, expect, it } from "vitest";
import { discoverProductLinks, parseJsonLdProducts } from "@/lib/ingest/jsonld";

const page = (ld: unknown) =>
  `<html><body><script type="application/ld+json">${JSON.stringify(ld)}</script></body></html>`;

describe("parseJsonLdProducts", () => {
  it("parses a simple Product with one offer", () => {
    const html = page({
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Linen Shirt",
      description: "Soft",
      image: "/img/a.jpg",
      offers: { "@type": "Offer", price: "59.90", priceCurrency: "USD", availability: "https://schema.org/InStock" },
    });
    const [p] = parseJsonLdProducts(html, "https://shop.test/p/linen");
    expect(p.name).toBe("Linen Shirt");
    expect(p.price).toBe(59.9);
    expect(p.currency).toBe("USD");
    expect(p.image_url).toBe("https://shop.test/img/a.jpg");
    expect(p.variants).toEqual([]);
    expect(p.in_stock).toBe(true);
  });

  it("turns multiple offers into variants with color/size and stock", () => {
    const html = page({
      "@type": "Product",
      name: "Tee",
      offers: [
        { "@type": "Offer", name: "Black / M", price: 38000, priceCurrency: "ARS", availability: "InStock" },
        { "@type": "Offer", name: "Black / L", price: 38000, priceCurrency: "ARS", availability: "https://schema.org/OutOfStock" },
      ],
    });
    const [p] = parseJsonLdProducts(html, "https://shop.test/p/tee");
    expect(p.currency).toBe("ARS");
    expect(p.variants).toHaveLength(2);
    expect(p.variants[0]).toMatchObject({ color: "Black", size: "M", in_stock: true });
    expect(p.variants[1]).toMatchObject({ size: "L", in_stock: false });
    expect(p.in_stock).toBe(true);
  });

  it("finds products inside @graph and ignores malformed blocks", () => {
    const html =
      `<script type="application/ld+json">{ not json</script>` +
      page({ "@graph": [{ "@type": "WebSite", name: "x" }, { "@type": "Product", name: "Cap", offers: { price: "10", priceCurrency: "USD" } }] });
    const found = parseJsonLdProducts(html, "https://shop.test/");
    expect(found.map((p) => p.name)).toEqual(["Cap"]);
  });

  it("returns nothing when there is no Product", () => {
    expect(parseJsonLdProducts("<html><body>hi</body></html>", "https://x.test")).toEqual([]);
  });
});

describe("discoverProductLinks", () => {
  it("prefers product-looking paths, dedupes and stays on-origin", () => {
    const html = `<a href="/p/a">A</a><a href="/p/a#x">A again</a><a href="/products/b">B</a><a href="https://other.com/p/z">Z</a><a href="/about">About</a>`;
    expect(discoverProductLinks(html, "https://shop.test/")).toEqual(["https://shop.test/p/a", "https://shop.test/products/b"]);
  });

  it("falls back to image cards when paths are unrecognised", () => {
    const html = `<a href="/zapatilla-roja"><img src="x.jpg">Zapatilla</a><a href="/contacto">Contacto</a>`;
    expect(discoverProductLinks(html, "https://shop.test/")).toEqual(["https://shop.test/zapatilla-roja"]);
  });
});
