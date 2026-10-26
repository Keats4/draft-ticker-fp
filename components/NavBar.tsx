"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Five items in a pill group on the canvas tone (no coloured bar): the page
 * reads as one calm surface. The Market Price Index is a badged concept
 * preview promoted to the nav so the in-season thesis is discoverable; the
 * badge on the page keeps it honest. The theme toggle writes the same
 * attribute the inline script in app/layout.tsx sets before paint.
 */
const TABS = [
  { href: "/", label: "Market" },
  { href: "/players", label: "Players" },
  { href: "/calendar", label: "Calendar" },
  { href: "/market-price-index", label: "Price Index" },
  { href: "/methodology", label: "Methodology" },
];

type Theme = "dark" | "light";

function readTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    setTheme(readTheme());
  }, []);
  const flip = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("dt-theme", next);
    } catch {}
    setTheme(next);
  };
  return (
    <button
      type="button"
      onClick={flip}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Light theme" : "Dark theme"}
      className="flex h-8 w-8 items-center justify-center rounded-full text-sm text-[var(--ink-2)] hover:bg-[var(--nav-pill)] hover:text-[var(--foreground)]"
    >
      <span aria-hidden>{theme === "dark" ? "☀" : "☾"}</span>
    </button>
  );
}

export default function NavBar({
  freshness,
}: {
  freshness: { label: string; live: boolean };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const pill = (active: boolean) =>
    active
      ? "bg-[var(--surface)] font-semibold text-[var(--foreground)]"
      : "text-[var(--ink-2)] hover:text-[var(--foreground)]";

  return (
    <header
      className="border-b border-[var(--border)]"
      style={{ background: "var(--nav-bg)", color: "var(--nav-fg)" }}
    >
      <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-bold tracking-tight">
          <span aria-hidden style={{ color: "var(--gold)" }}>▚</span>
          Draft Ticker
        </Link>

        <nav
          className="ml-3 hidden items-center gap-0.5 rounded-full p-1 md:flex"
          style={{ background: "var(--nav-pill)" }}
        >
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-full px-3 py-1.5 text-[13px] ${pill(isActive(t.href))}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-[var(--ink-2)]"
            style={{ background: "var(--nav-pill)" }}
            title="Latest publish time across the contributing draft sources, as sent by the source (timezone not stated)."
          >
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: freshness.live ? "var(--pos)" : "var(--gold)" }}
            />
            {freshness.label}
          </span>

          <ThemeToggle />

          <button
            className="rounded-full px-2 py-1 text-[var(--ink-2)] md:hidden"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            ☰
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-[var(--border)] px-4 pb-3 pt-2 md:hidden">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              onClick={() => setOpen(false)}
              className={`rounded-lg px-3 py-2 text-sm ${
                isActive(t.href)
                  ? "bg-[var(--surface)] font-semibold text-[var(--foreground)]"
                  : "text-[var(--ink-2)]"
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
