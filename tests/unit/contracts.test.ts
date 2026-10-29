import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  ROUND_DURATIONS,
  isRoundConfig,
  normalizeConfig,
  validateRoundConfig,
} from "../../packages/contracts/src/index";
describe("shared round configuration boundary", () => {
  it("accepts each supported duration and cooldown boundary", () => {
    for (const durationSeconds of ROUND_DURATIONS)
      for (const cooldownSeconds of [1, 5])
        expect(
          isRoundConfig({
            ...DEFAULT_CONFIG,
            durationSeconds,
            cooldownSeconds,
          }),
        ).toBe(true);
  });
  it("rejects untrusted malformed storage and missing fields", () => {
    for (const input of [
      null,
      undefined,
      "live",
      42,
      [],
      {},
      { ...DEFAULT_CONFIG, title: 5 },
    ])
      expect(isRoundConfig(input)).toBe(false);
  });
  it("gives actionable errors for blank, overlong, and ambiguous crew names", () => {
    expect(
      validateRoundConfig({
        ...DEFAULT_CONFIG,
        title: "  ",
        coralName: "x".repeat(21),
      }),
    ).toEqual({
      title: "Enter a round title.",
      coralName: "Use 20 characters or fewer.",
    });
    expect(
      validateRoundConfig({
        ...DEFAULT_CONFIG,
        coralName: "  crew ",
        mintName: "CREW",
      }).mintName,
    ).toBe("Give each team a different name.");
    expect(
      validateRoundConfig({ ...DEFAULT_CONFIG, title: "x".repeat(61) }).title,
    ).toBe("Use 60 characters or fewer.");
  });
  it("rejects non-finite, fractional, string and unsupported rule values", () => {
    for (const cooldownSeconds of [0, 6, 1.5, NaN, Infinity, "2"])
      expect(
        validateRoundConfig({ ...DEFAULT_CONFIG, cooldownSeconds })
          .cooldownSeconds,
      ).toBeDefined();
    for (const durationSeconds of [0, 44, 46, 120, "45"])
      expect(
        validateRoundConfig({ ...DEFAULT_CONFIG, durationSeconds })
          .durationSeconds,
      ).toBeDefined();
  });
  it("normalizes only surrounding whitespace, preserving meaningful names", () => {
    expect(
      normalizeConfig({
        ...DEFAULT_CONFIG,
        coralName: "  Tea crew  ",
        title: " Tea vs Coffee ",
      }),
    ).toEqual({
      ...DEFAULT_CONFIG,
      coralName: "Tea crew",
      title: "Tea vs Coffee",
    });
  });
});
