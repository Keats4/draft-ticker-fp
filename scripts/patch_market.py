#!/usr/bin/env python3
"""Apply-time patch: market page gains player links, nav, featured card."""
p = open('app/page.tsx').read()
assert 'next/link' not in p

p = p.replace('import { loadLatestTwoEcrSnapshots, loadLatestTwoSnapshots } from "@/lib/snapshot";',
              'import Link from "next/link";\nimport { loadLatestTwoEcrSnapshots, loadLatestTwoSnapshots } from "@/lib/snapshot";')

p = p.replace("""  const ecrMissing = rows.filter((r) => r.ecr === null).length;
  const hasMovement = previous !== null;""",
"""  const ecrMissing = rows.filter((r) => r.ecr === null).length;
  const hasMovement = previous !== null;
  const featured =
    rows
      .slice(0, 100)
      .filter((r) => r.gap !== null)
      .sort((a, b) => Math.abs(b.gap!) - Math.abs(a.gap!))[0] ?? null;""")

p = p.replace("""        <p className="mt-1 text-neutral-500">
          How fantasy football draft values are moving.
        </p>
      </header>""",
"""        <p className="mt-1 text-neutral-500">
          How fantasy football draft values are moving.
        </p>
        <nav className="mt-2 flex gap-4 text-xs text-neutral-400">
          <Link className="hover:underline" href="/calendar">
            Market Calendar
          </Link>
          <Link className="hover:underline" href="/methodology">
            Methodology
          </Link>
        </nav>
      </header>""")

p = p.replace("""      <div className="overflow-x-auto rounded-lg border border-neutral-200">""",
"""      {featured && (
        <Link
          href={`/player/${featured.sleeperId ?? `ffc-${featured.ffcId}`}`}
          className="mb-6 block rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 hover:border-blue-300"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Featured player — widest market/expert gap in the top 100
          </p>
          <p className="mt-1 text-sm text-blue-900">
            <span className="font-semibold">{featured.name}</span> (
            {featured.position}, {featured.team}) — ADP {featured.adp}, ECR{" "}
            {featured.ecr}, gap {featured.gap! > 0 ? "+" : ""}
            {featured.gap}. View the player page →
          </p>
        </Link>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200">""")

p = p.replace('<td className="px-3 py-2 font-medium">{r.name}</td>',
"""<td className="px-3 py-2 font-medium">
                  <Link
                    href={`/player/${r.sleeperId ?? `ffc-${r.ffcId}`}`}
                    className="hover:underline"
                  >
                    {r.name}
                  </Link>
                </td>""")

open('app/page.tsx', 'w').write(p)
print('market page patched: links, nav, featured card')
