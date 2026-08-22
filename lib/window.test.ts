import { describe, expect, it } from "vitest";
import { MOVE_WINDOW_DAYS, selectMoveWindow } from "./window";

const days = (start: string, n: number): string[] => {
  const out: string[] = [];
  const d = new Date(start + "T12:00:00Z");
  for (let i = 0; i < n; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
};

describe("selectMoveWindow", () => {
  it("is pinned to a seven-calendar-date window", () => {
    expect(MOVE_WINDOW_DAYS).toBe(7);
  });

  it("returns null for fewer than two usable dates", () => {
    expect(selectMoveWindow([])).toBeNull();
    expect(selectMoveWindow(["2026-08-22"])).toBeNull();
    expect(selectMoveWindow(["2026-08-22", "2026-08-22"])).toBeNull();
  });

  it("3 days of history: uses all of it, not rolling (Since <date>)", () => {
    const w = selectMoveWindow(days("2026-08-16", 3));
    expect(w).toEqual({ start: "2026-08-16", end: "2026-08-18", rolling: false });
  });

  it("6 days of history: uses all of it, not rolling", () => {
    const w = selectMoveWindow(days("2026-08-16", 6));
    expect(w).toEqual({ start: "2026-08-16", end: "2026-08-21", rolling: false });
  });

  it("7 days of history: exactly the full window, rolling (Last 7 days)", () => {
    const w = selectMoveWindow(days("2026-08-16", 7));
    expect(w).toEqual({ start: "2026-08-16", end: "2026-08-22", rolling: true });
  });

  it("8 days of history: drops the oldest date, still rolling", () => {
    const w = selectMoveWindow(days("2026-08-15", 8));
    expect(w).toEqual({ start: "2026-08-16", end: "2026-08-22", rolling: true });
  });

  it("14 days of history: only the most recent 7 calendar dates drive the move", () => {
    const w = selectMoveWindow(days("2026-08-09", 14));
    expect(w).toEqual({ start: "2026-08-16", end: "2026-08-22", rolling: true });
  });

  it("missing capture on the cutoff date: starts at the earliest stored date inside the window, no fabrication", () => {
    // History reaches past the cutoff (Aug 16) but Aug 16 itself was never
    // captured; the window starts at the next real date.
    const dates = ["2026-08-10", "2026-08-12", "2026-08-14", "2026-08-17", "2026-08-19", "2026-08-22"];
    const w = selectMoveWindow(dates);
    expect(w).toEqual({ start: "2026-08-17", end: "2026-08-22", rolling: true });
  });

  it("only the end date remains inside the desired span: no window", () => {
    expect(selectMoveWindow(["2026-08-01", "2026-08-22"])).toBeNull();
  });

  it("unsorted input is handled (and a sparse full span still rolls)", () => {
    const w = selectMoveWindow(["2026-08-21", "2026-08-17", "2026-08-19"]);
    expect(w).toEqual({ start: "2026-08-17", end: "2026-08-21", rolling: false });
  });
});
