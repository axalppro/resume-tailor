import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { ProviderBadge } from "@/components/provider-badge";

export const metadata: Metadata = {
  title: "Resume Tailor",
  description: "Private hybrid AI + manual resume tailoring for Typst.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold text-brand-dark">
              Resume Tailor
            </Link>
            <nav className="flex gap-6 text-sm text-slate-600">
              <Link href="/" className="hover:text-brand">Dashboard</Link>
              <Link href="/jobs/new" className="hover:text-brand">New job offer</Link>
              <Link href="/profile" className="hover:text-brand">Profile</Link>
              <Link href="/settings" className="hover:text-brand">Settings</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 pb-10 pt-4 text-xs text-slate-400">
          <span>Phase 2 · Hybrid AI (mock | ollama | anthropic | perplexity) · Local-first</span>
          <ProviderBadge />
        </footer>
      </body>
    </html>
  );
}
