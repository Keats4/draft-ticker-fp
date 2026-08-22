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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Latest host publish time and the number of contributing host boards.
 *  `latest_pub_at` is "YYYY-MM-DD HH:MM:SS" exactly as the source sends it,
 *  with no stated timezone, so it is rendered as sent, NOT converted to PT,
 *  and carries no timezone label the source never asserted. There is no
 *  draft count in this payload and none is shown. The publish skew across
 *  hosts is not surfaced here (methodology, session four). Consumer wording
 *  ("market update" / "draft sources") is header-only; methodology keeps the
 *  precise "host boards" term. */
function fmtFresh(
  latestPubAt: string,
  sourceCount: number
): { full: string; compact: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(latestPubAt);
  let t = latestPubAt;
  if (m) {
    const h24 = Number(m[4]);
    const ampm = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    t = `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${h12}:${m[5]} ${ampm}`;
  }
  return {
    full: `Latest market update ${t} · ${sourceCount} draft source${sourceCount === 1 ? "" : "s"}`,
    compact: `Updated ${t}`,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const snap = await loadLatestSnapshot();
  const fresh = snap ? fmtFresh(snap.meta.latest_pub_at, snap.meta.source_count) : null;
  const freshness = fresh
    ? { label: fresh.full, compact: fresh.compact, live: true }
    : { label: "Fixture data, not live", compact: "Fixture data", live: false };

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NavBar freshness={freshness} />
        <div className="flex-1">{children}</div>
        <footer className="mt-10 border-t border-[var(--border)] px-4 py-5 text-xs text-[var(--ink-3)]">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-4 gap-y-1">
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
