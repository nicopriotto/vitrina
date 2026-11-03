import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vitrina — agent-ready stores",
  description: "Paste a store URL. Vitrina publishes an MCP server for it so any AI agent can search the catalog and check out with PayPal.",
};

const link = "inline-flex items-center gap-1 text-[15px] text-fg2 transition-colors hover:text-fg";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen">
        <header className="mx-auto flex h-20 max-w-[1600px] items-center justify-between px-10">
          <Link href="/" className="font-mono text-[28px] font-medium leading-none tracking-tight">
            vitrina<span className="text-accent">/</span>
          </Link>
          <nav className="flex items-center gap-8">
            <Link href="/#how" className={link}>How it works</Link>
            <Link href="/demo" className={link}>Live demo</Link>
            <a href="https://modelcontextprotocol.io" target="_blank" rel="noreferrer" className={link}>
              What is MCP <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
            </a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
