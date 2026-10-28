/**
 * RoadLevel internal unit standard (spec Part II).
 *
 * All levels, level differences, staff readings, dipping distances and
 * allowances are stored internally as integer millimetres.
 *
 * Conversions at the boundary must validate that the value is representable
 * to millimetre precision. The app must never silently discard meaningful
 * precision (spec 4.5).
 */

/** A quantity entered by the user, with an explicit unit. */
export type InputUnit = "m" | "cm" | "mm" | "rl"; // "rl" is the integer field-book convention: 1830009 => 1830.009 m

export const CALCULATION_VERSION = "1.0.0";
export const SCHEMA_VERSION = 1;

/** Precision (decimal places) required by the internal representation. */
export const MM_DECIMALS = 3;

export type ValidationResult<T> =
  | { ok: true; value: T; warnings?: string[] }
  | { ok: false; error: string };

/**
 * Parse a quantity in the given unit into integer millimetres.
 * Rejects values with more precision than the unit permits
 * (metres must have <= 3 decimals, centimetres <= 1, millimetres must be integers).
 */
export function parseQuantity(input: string, unit: InputUnit): ValidationResult<number> {
  const raw = (input ?? "").trim();
  if (raw === "") {
    return { ok: false, error: "Value is required." };
  }
  if (!/^-?\d*\.?\d*$/.test(raw) || /^-?\.?$/.test(raw)) {
    return { ok: false, error: `"${raw}" is not a valid number.` };
  }
  const decimalPart = raw.split(".")[1] ?? "";
  let value: number;
  switch (unit) {
    case "mm": {
      if (decimalPart.length > 0) {
        return { ok: false, error: "Millimetre values must be whole numbers." };
      }
      value = Number(raw);
      if (!Number.isInteger(value)) return { ok: false, error: `"${raw}" is not a valid millimetre value.` };
      return { ok: true, value };
    }
    case "cm": {
      if (decimalPart.length > 1) {
        return { ok: false, error: "Centimetre values allow at most 1 decimal (0.1 cm = 1 mm)." };
      }
      value = Math.round(Number(raw) * 10);
      return { ok: true, value };
    }
    case "m": {
      if (decimalPart.length > MM_DECIMALS) {
        return {
          ok: false,
          error: `"${raw}" m has more than ${MM_DECIMALS} decimal places; this precision cannot be represented in millimetres and must not be silently discarded.`,
        };
      }
      value = Math.round(Number(raw) * 1000);
      // Guard against float artefacts, e.g. 0.145*1000 = 145.00000000000003
      if (!Number.isSafeInteger(value)) return { ok: false, error: `"${raw}" m is not representable in millimetres.` };
      return { ok: true, value };
    }
    case "rl": {
      // Field convention: 1830009 => 1830.009 m (integer metres+mm digits).
      if (!/^-?\d+$/.test(raw)) {
        return { ok: false, error: "Field-convention RLs must be entered as whole integers, e.g. 1830009 = 1830.009 m." };
      }
      const n = Number(raw);
      if (!Number.isSafeInteger(n)) return { ok: false, error: `"${raw}" exceeds the representable range.` };
      // The last three digits are millimetres:
      const metres = Math.trunc(n / 1000);
      const mm = n - metres * 1000;
      return { ok: true, value: metres * 1000 + mm, warnings: [`Interpreted as ${(n / 1000).toFixed(3)} m`] };
    }
    default: {
      const _exhaustive: never = unit;
      return _exhaustive;
    }
  }
}

/** Format integer millimetres for display in metres with 3 decimals. */
export function formatMmAsMetres(mm: number | null | undefined): string {
  if (mm === null || mm === undefined || Number.isNaN(mm)) return "—";
  return (mm / 1000).toFixed(MM_DECIMALS);
}

/** Format integer millimetres as metres (chainage display, 3 dp). */
export function formatChainage(chainageMm: number | null | undefined): string {
  return formatMmAsMetres(chainageMm);
}

/** Signed value with explicit unit, e.g. "+55 mm" or "−60 mm". */
export function formatSignedMm(mm: number): string {
  const sign = mm > 0 ? "+" : mm < 0 ? "−" : "";
  return `${sign}${Math.abs(mm)} mm`;
}

/** Readable instruction for a signed peg-marking offset, per spec 10.2. */
export function describeOffset(offsetMm: number): string {
  if (offsetMm > 0) return `Mark ${offsetMm} mm upward from the top of the peg.`;
  if (offsetMm < 0) return `Mark ${Math.abs(offsetMm)} mm downward from the top of the peg.`;
  return "No offset is required.";
}
