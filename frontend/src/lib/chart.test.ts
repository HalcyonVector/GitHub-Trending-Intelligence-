import { describe, it, expect } from "vitest";
import { sparkPath, sparkLastY, statusColor, parseCompetitors } from "./chart";

describe("sparkPath", () => {
  it("returns empty for no data", () => {
    expect(sparkPath([], 100, 50)).toBe("");
  });
  it("starts with a move and contains line segments", () => {
    const d = sparkPath([1, 2, 3, 2], 100, 50);
    expect(d.startsWith("M")).toBe(true);
    expect(d).toContain("L");
  });
});

describe("sparkLastY", () => {
  it("maps the max value to the top (y=0)", () => {
    // last point is the max -> should sit at the top of the box (y ~ 0)
    expect(sparkLastY([1, 2, 3], 50)).toBeCloseTo(0, 5);
  });
});

describe("statusColor", () => {
  it("maps status to the right token", () => {
    expect(statusColor("rising")).toBe("var(--gain)");
    expect(statusColor("declining")).toBe("var(--loss)");
    expect(statusColor("stable")).toBe("var(--dim)");
  });
});

describe("parseCompetitors", () => {
  it("parses a JSON array string", () => {
    expect(parseCompetitors('["a/b", "c/d"]')).toEqual(["a/b", "c/d"]);
  });
  it("returns empty for null/empty", () => {
    expect(parseCompetitors(null)).toEqual([]);
    expect(parseCompetitors("")).toEqual([]);
  });
  it("falls back to comma splitting for non-JSON", () => {
    expect(parseCompetitors("a, b, c")).toEqual(["a", "b", "c"]);
  });
});
