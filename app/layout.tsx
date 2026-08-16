import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import { loadLatestSnapshot } from "@/lib/snapshot";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Draft Ticker",
  description:
    "How fantasy football player values are changing: ADP movement vs expert consensus.",
};

function fmtFresh(iso: string, drafts?: number): string {
  const t = new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return drafts
    ? `Updated ${t} PT · ${drafts.toLocaleString()} drafts`
    : `Updated ${t} PT`;
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const snap = await loadLatestSnapshot();
  const freshness = snap
    ? { label: fmtFresh(snap.captured_at, snap.meta?.total_drafts), live: true }
    : { label: "Fixture data, not live", live: false };

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NavBar freshness={freshness} />
        <div className="flex-1">{children}</div>
        <footer className="mt-10 border-t border-[var(--border)] px-4 py-5 text-xs text-[var(--ink-3)]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1">
            <span>Draft Ticker</span>
            <Link href="/methodology" className="underline">
              Methodology
            </Link>
            <Link href="/inside-fantasypros" className="underline">
              For FantasyPros
            </Link>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
