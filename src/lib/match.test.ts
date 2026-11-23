import { describe, expect, it } from "vitest";
import { isOpenMatch, normalizeItemPair, swipeOpenedMatch } from "./match";

describe("isOpenMatch", () => {
  it("treats active and reserved as open", () => {
    expect(isOpenMatch("active")).toBe(true);
    expect(isOpenMatch("reserved")).toBe(true);
  });

  it("treats closed or missing matches as not open", () => {
    expect(isOpenMatch("cancelled")).toBe(false);
    expect(isOpenMatch("completed")).toBe(false);
    expect(isOpenMatch(null)).toBe(false);
    expect(isOpenMatch(undefined)).toBe(false);
  });
});

describe("swipeOpenedMatch", () => {
  it("is true when the swipe created a brand-new match", () => {
    expect(swipeOpenedMatch(null, "active")).toBe(true);
  });

  it("is true when the swipe re-opened a cancelled match", () => {
    expect(swipeOpenedMatch("cancelled", "active")).toBe(true);
  });

  it("is false when the match was already open before the swipe", () => {
    expect(swipeOpenedMatch("active", "active")).toBe(false);
    expect(swipeOpenedMatch("reserved", "reserved")).toBe(false);
  });

  it("is false when there is still no open match (no reciprocal like)", () => {
    expect(swipeOpenedMatch(null, null)).toBe(false);
    expect(swipeOpenedMatch("cancelled", "cancelled")).toBe(false);
    expect(swipeOpenedMatch("completed", "completed")).toBe(false);
  });
});

describe("normalizeItemPair", () => {
  it("puts the smaller id first regardless of argument order", () => {
    const a = "0b7f2c1e-0000-4000-8000-000000000001";
    const b = "9c1d3e2f-0000-4000-8000-000000000002";
    expect(normalizeItemPair(a, b)).toEqual([a, b]);
    expect(normalizeItemPair(b, a)).toEqual([a, b]);
  });
});
