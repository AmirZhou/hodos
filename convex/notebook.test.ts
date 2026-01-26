import { describe, it, expect } from "vitest";
import { calculateNextReview, DEFAULT_EASE_FACTOR } from "./notebook";

describe("calculateNextReview", () => {
  it("returns 1 day for first review", () => {
    const result = calculateNextReview(0, DEFAULT_EASE_FACTOR, "medium");

    expect(result.intervalDays).toBe(1);
    expect(result.easeFactor).toBe(DEFAULT_EASE_FACTOR);
  });

  it("returns 3 days after first successful review", () => {
    const result = calculateNextReview(1, DEFAULT_EASE_FACTOR, "medium");

    expect(result.intervalDays).toBe(3);
  });

  it("multiplies interval by ease factor for subsequent reviews", () => {
    // After 3 days, at ease 2.5, next should be ~7 days
    const result = calculateNextReview(3, 2.5, "medium");

    expect(result.intervalDays).toBe(8); // 3 * 2.5 = 7.5, rounded up
  });

  it("reduces interval for hard rating", () => {
    const result = calculateNextReview(7, 2.5, "hard");

    // Hard: interval * 1.2 instead of ease factor
    expect(result.intervalDays).toBe(8); // 7 * 1.2 = 8.4, rounded down
    expect(result.easeFactor).toBeLessThan(2.5);
  });

  it("increases interval for easy rating", () => {
    const result = calculateNextReview(7, 2.5, "easy");

    // Easy: interval * ease * 1.3
    expect(result.intervalDays).toBe(23); // 7 * 2.5 * 1.3 = 22.75
    expect(result.easeFactor).toBeGreaterThan(2.5);
  });

  it("resets interval to 1 for wrong answers", () => {
    const result = calculateNextReview(14, 2.5, "wrong");

    expect(result.intervalDays).toBe(1);
    expect(result.easeFactor).toBeLessThan(2.5);
  });

  it("never lets ease factor go below 1.3", () => {
    // Repeatedly mark wrong to reduce ease
    let ease = DEFAULT_EASE_FACTOR;
    for (let i = 0; i < 10; i++) {
      const result = calculateNextReview(1, ease, "wrong");
      ease = result.easeFactor;
    }

    expect(ease).toBeGreaterThanOrEqual(1.3);
  });

  it("caps maximum interval at 365 days", () => {
    const result = calculateNextReview(300, 2.5, "easy");

    expect(result.intervalDays).toBeLessThanOrEqual(365);
  });
});
