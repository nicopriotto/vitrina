import type { Metadata } from "next";
import Link from "next/link";
import "./lumen.css";

export const metadata: Metadata = {
  title: "Lumen Studio — Essentials made in Brooklyn",
  description: "Lumen Studio is a small Brooklyn clothing label making quiet, well-cut essentials: tees, sweatshirts, caps and totes.",
};

export default function LumenLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="lumen">
        <div className="bar">Free shipping over $75 · Made in Brooklyn</div>
        <header className="nav">
          <nav className="links">
            <Link href="/mock/lumen">Shop</Link>
            <Link href="/mock/lumen">Tees</Link>
            <Link href="/mock/lumen">Sweatshirts</Link>
            <Link href="/mock/lumen">Accessories</Link>
          </nav>
          <Link href="/mock/lumen" className="logo">LUMEN</Link>
          <button className="cart" type="button">Cart (0)</button>
        </header>
        {children}
        <footer>
          <span>© 2026 Lumen Studio · 214 Bedford Ave, Brooklyn, NY</span>
          <span>@lumen.studio.ba</span>
        </footer>
      </body>
    </html>
  );
}
