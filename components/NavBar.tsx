"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * Five items. Inside FantasyPros is a pitch document rather than a product
 * surface, so it sits in the footer as "For FantasyPros". The Market Price
 * Index is a badged concept preview promoted to the nav so the in-season
 * thesis is discoverable; the badge on the page keeps it honest. Featured
 * merged into the homepage.
 */
const TABS = [
  { href: "/", label: "Market" },
  { href: "/players", label: "Players" },
  { href: "/calendar", label: "Calendar" },
  { href: "/market-price-index", label: "Price Index" },
  { href: "/methodology", label: "Methodology" },
];

export default function NavBar({
  freshness,
}: {
  freshness: { label: string; live: boolean };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header style={{ background: "var(--navy)" }} className="text-white">
      <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span aria-hidden style={{ color: "var(--gold)" }}>▚</span>
          Draft Ticker
        </Link>

        <nav className="ml-4 hidden gap-1 md:flex">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-md px-3 py-1.5 text-sm ${
                isActive(t.href)
                  ? "bg-white font-medium text-[var(--navy)]"
                  : "text-white/80 hover:text-white"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
            style={{
              background: freshness.live
                ? "rgba(21,128,61,0.18)"
                : "rgba(224,169,46,0.18)",
              color: "#eafaf0",
            }}
            title="Latest publish time across the contributing host boards, as sent by the source (timezone not stated), and how many boards contributed."
          >
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: freshness.live ? "#4ade80" : "#e0a92e" }}
            />
            {freshness.label}
          </span>

          <button
            className="md:hidden"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            ☰
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-white/10 px-4 pb-3 md:hidden">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              onClick={() => setOpen(false)}
              className={`rounded-md px-3 py-2 text-sm ${
                isActive(t.href)
                  ? "bg-white font-medium text-[var(--navy)]"
                  : "text-white/80"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
