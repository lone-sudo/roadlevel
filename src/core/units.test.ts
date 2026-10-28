import { describe, expect, it } from "vitest";

import { formatMmAsMetres, parseQuantity } from "./units";

describe("boundary unit conversion (spec Part II)", () => {
  it("metres: 1830.009 m = 1830009 mm", () => {
    expect(parseQuantity("1830.009", "m")).toEqual({ ok: true, value: 1830009 });
  });
  it("metres: 1.250 staff reading = 1250 mm", () => {
    expect(parseQuantity("1.250", "m")).toEqual({ ok: true, value: 1250 });
  });
  it("metres: 1829.764 m = 1829764 mm", () => {
    expect(parseQuantity("1829.764", "m")).toEqual({ ok: true, value: 1829764 });
  });
  it("rejects more precision than millimetres can represent — never silently discarded", () => {
    const r = parseQuantity("1.2505", "m");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("must not be silently discarded");
  });
  it("centimetre values: 22 cm = 220 mm, 30 cm = 300 mm, 38 cm = 380 mm", () => {
    expect(parseQuantity("22", "cm")).toEqual({ ok: true, value: 220 });
    expect(parseQuantity("30", "cm")).toEqual({ ok: true, value: 300 });
    expect(parseQuantity("38", "cm")).toEqual({ ok: true, value: 380 });
  });
  it("tenth-of-a-centimetre values are representable: 22.5 cm = 225 mm", () => {
    expect(parseQuantity("22.5", "cm")).toEqual({ ok: true, value: 225 });
  });
  it("hundredth-of-a-centimetre values are rejected", () => {
    expect(parseQuantity("22.05", "cm").ok).toBe(false);
  });
  it("millimetre values must be whole numbers", () => {
    expect(parseQuantity("380", "mm")).toEqual({ ok: true, value: 380 });
    expect(parseQuantity("380.5", "mm").ok).toBe(false);
  });
  it("empty values are rejected, never treated as zero", () => {
    expect(parseQuantity("", "m").ok).toBe(false);
    expect(parseQuantity("   ", "mm").ok).toBe(false);
  });
  it("negative readings parse but the engine rejects them for staff/dipping input", () => {
    expect(parseQuantity("-1.250", "m")).toEqual({ ok: true, value: -1250 });
  });
  it("formatting: 99375 mm displays as 99.375 m", () => {
    expect(formatMmAsMetres(99375)).toBe("99.375");
    expect(formatMmAsMetres(null)).toBe("—");
  });
});
