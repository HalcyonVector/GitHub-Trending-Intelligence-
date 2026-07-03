import { describe, it, expect } from "vitest";
import { formatStat, formatDelta, getLanguageColor, scoreColor, relativeTime } from "./utils";

describe("formatStat", () => {
  it("passes small numbers through", () => {
    expect(formatStat(0)).toBe("0");
    expect(formatStat(500)).toBe("500");
  });
  it("adds k / M suffixes", () => {
    expect(formatStat(1500)).toBe("1.5k");
    expect(formatStat(2_500_000)).toBe("2.5M");
  });
});

describe("formatDelta", () => {
  it("signs positive and negative, zero is bare", () => {
    expect(formatDelta(0)).toBe("0");
    expect(formatDelta(1200)).toBe("+1.2k");
    expect(formatDelta(-1200)).toBe("-1.2k");
  });
});

describe("getLanguageColor", () => {
  it("returns a known color, falls back for unknown/null", () => {
    expect(getLanguageColor("Python")).toBe("#3572A5");
    expect(getLanguageColor("Brainfuck")).toBe("#6b7280");
    expect(getLanguageColor(null)).toBe("#6b7280");
  });
});

describe("scoreColor", () => {
  it("buckets by score", () => {
    expect(scoreColor(90)).toBe("text-score-hot");
    expect(scoreColor(65)).toBe("text-score-high");
    expect(scoreColor(45)).toBe("text-score-mid");
    expect(scoreColor(10)).toBe("text-score-low");
  });
});

describe("relativeTime", () => {
  it("labels recent dates", () => {
    expect(relativeTime(new Date().toISOString())).toBe("today");
    const y = new Date();
    y.setDate(y.getDate() - 1);
    expect(relativeTime(y.toISOString())).toBe("yesterday");
  });
});
