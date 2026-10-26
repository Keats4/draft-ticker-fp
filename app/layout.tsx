import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import { loadLatestSnapshot } from "@/lib/snapshot";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

/** Production origin. No custom domain is configured; when one exists, this
 *  is the single line to change. metadataBase makes every relative canonical
 *  and og:url below resolve to an absolute URL on this origin. */
const SITE_URL = "https://draft-ticker-fp.vercel.app";
const SITE_TITLE = "Draft Ticker | Fantasy Football ADP Trends";
const SITE_DESCRIPTION =
  "Track rolling 7-day ADP movement against expert consensus, documented events, and fantasy-calendar context.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  // "./" resolves per route, so every page carries exactly one canonical
  // that matches its own og:url - no conflicting values, no duplicates.
  alternates: { canonical: "./" },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
    siteName: "Draft Ticker",
    url: "./",
  },
  // No deliberate social preview image exists yet, so the card type that
  // renders correctly without one. Do not add an image URL that 404s.
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Latest host publish time and the number of contributing host boards.
 *  `latest_pub_at` is "YYYY-MM-DD HH:MM:SS" exactly as the source sends it,
 *  with no stated timezone, so it is rendered as sent, NOT converted to PT,
 *  and carries no timezone label the source never asserted. The publish
 *  skew across hosts is not surfaced here (methodology, session four). The
 *  consumer pill states freshness only ("Updated ..."); the source count
 *  stays on the methodology and provenance surfaces where it is useful. */
function fmtFresh(latestPubAt: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(latestPubAt);
  let t = latestPubAt;
  if (m) {
    const h24 = Number(m[4]);
    const ampm = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    t = `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${h12}:${m[5]} ${ampm}`;
  }
  return `Updated ${t}`;
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const snap = await loadLatestSnapshot();
  const freshness = snap
    ? { label: fmtFresh(snap.meta.latest_pub_at), live: true }
    : { label: "Fixture data, not live", live: false };

  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Theme before paint: dark is the default; a stored light choice
            is applied here so there is no flash. The toggle in NavBar
            writes the same key. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('dt-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}",
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <NavBar freshness={freshness} />
        <div className="flex-1">{children}</div>
        <footer className="mt-10 border-t border-[var(--border)] px-4 py-5 text-xs text-[var(--ink-3)]">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-4 gap-y-1">
            <span>Draft Ticker</span>
            <Link href="/methodology" className="underline">
              Methodology
            </Link>
            <span className="ml-auto">
              An independent project, not affiliated with or endorsed by any
              fantasy sports platform or data provider.
            </span>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
