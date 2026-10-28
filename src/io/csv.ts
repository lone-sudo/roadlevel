/**
 * CSV import/export (spec §26, Milestone 4).
 * Exports must preserve units, signs, source values and calculation statuses;
 * imports must validate and convert to integer millimetres at the boundary —
 * never a silent metre/millimetre conversion error (spec Test 32).
 */
import { parseQuantity } from "../core/units";
import type { DesignLevelRow, DippingRow, PegMarkRow, SetupRow } from "../db/service";
import type { RoadLevelDB, PositionType } from "../db/store";
import type { ObservationRow } from "../db/service";

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(r.map(csvEscape).join(","));
  return lines.join("\r\n");
}

/** Parse CSV text into a table of string cells (RFC 4180-ish, quoted fields supported). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const nc = text[i + 1];
    if (inQuotes) {
      if (c === '"') {
        if (nc === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && nc === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length > 0) { row.push(field); if (row.some((f) => f !== "")) rows.push(row); }
  return rows;
}

export type DesignImportRow = {
  chainage_mm: number; position_type: PositionType; offset_mm: number | null;
  design_rl_mm: number; revision: string | null; source_reference: string;
};

/**
 * Parse and validate a design-level CSV import. Every conversion to integer
 * millimetres happens here, at the boundary, with validation errors returned
 * per row rather than silently coerced (spec §22, Test 32).
 */
export function parseDesignCsv(text: string): { rows: DesignImportRow[]; errors: string[] } {
  const errors: string[] = [];
  const rows: DesignImportRow[] = [];
  const table = parseCsv(text);
  if (table.length < 2) return { rows, errors: ["The CSV must contain a header row and at least one data row."] };
  const headers = table[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const idx = (name: string) => headers.indexOf(name);
  const req = ["chainage_m", "position", "design_rl_m"];
  for (const r of req) if (idx(r) === -1) errors.push(`Missing required column "${r}". Expected columns: chainage_m, position (centre|left|right|offset), design_rl_m, optionally offset_m, revision, source_reference.`);
  if (errors.length > 0) return { rows, errors };
  for (let i = 1; i < table.length; i++) {
    const cells = table[i];
    const label = `Row ${i + 1}`;
    const pos = (cells[idx("position")] ?? "").trim().toLowerCase();
    if (!["centre", "left", "right", "offset"].includes(pos)) { errors.push(`${label}: position "${cells[idx("position")]}" must be centre, left, right or offset.`); continue; }
    const chainage = parseQuantity(cells[idx("chainage_m")] ?? "", "m");
    if (!chainage.ok) { errors.push(`${label}: chainage_m ${chainage.error}`); continue; }
    const rl = parseQuantity(cells[idx("design_rl_m")] ?? "", "m");
    if (!rl.ok) { errors.push(`${label}: design_rl_m ${rl.error}`); continue; }
    let offsetMm: number | null = null;
    if (idx("offset_m") !== -1 && (cells[idx("offset_m")] ?? "") !== "") {
      const off = parseQuantity(cells[idx("offset_m")], "m");
      if (!off.ok) { errors.push(`${label}: offset_m ${off.error}`); continue; }
      offsetMm = off.value;
    }
    rows.push({
      chainage_mm: chainage.value, position_type: pos as PositionType, offset_mm: offsetMm,
      design_rl_mm: rl.value,
      revision: idx("revision") !== -1 && cells[idx("revision")] !== "" ? cells[idx("revision")].trim() : null,
      source_reference: idx("source_reference") !== -1 ? cells[idx("source_reference")].trim() : "CSV import",
    });
  }
  return { rows, errors };
}

export function designLevelsToCsv(projectId: string, rows: DesignLevelRow[]): string {
  void projectId;
  return toCsv(
    ["chainage_m", "position", "offset_m", "design_rl_m", "revision", "source_reference"],
    rows.map((r) => [r.chainage_mm / 1000, r.position_type, r.offset_mm === null ? "" : r.offset_mm / 1000, r.design_rl_mm / 1000, r.revision ?? "", r.source_reference ?? ""]),
  );
}

/** Field-book CSV export: raw observations + calculated RLs (spec §26). */
export async function fieldBookToCsv(
  pointCode: (pointId: string) => string,
  sessionName: string,
  setups: SetupRow[],
  obs: ObservationRow[],
  levels: RoadLevelDB["calculatedLevels"]["value"][],
): Promise<string> {
  const levelByObs = new Map(levels.map((l) => [l.source_observation_id, l]));
  return toCsv(
    ["session", "setup_no", "setup_hi_m", "obs_id", "point", "reading_type", "staff_reading_m", "review_status", "calc_rl_m", "calc_status", "method", "remarks"],
    obs.map((o) => {
      const setup = setups.find((s) => s.id === o.setup_id);
      const l = levelByObs.get(o.id) ?? null;
      return [
        sessionName, setup?.setup_number ?? "", setup?.hi_mm == null ? "" : setup.hi_mm / 1000,
        o.id, pointCode(o.point_id), o.reading_type, o.staff_reading_mm / 1000,
        o.review_status,
        l && l.rl_mm != null ? l.rl_mm / 1000 : "INCOMPLETE", l?.calculation_status ?? "",
        l?.method ?? "", o.remarks ?? "",
      ];
    }),
  );
}

export type DippingRecord = DippingRow;
export async function dipToCsv(rows: DippingRecord[]): Promise<string> {
  return toCsv(
    ["chainage_m", "position", "offset_m", "target_m", "actual_m", "difference_m", "result", "correction_m", "target_source", "measured_at", "remarks"],
    rows.map((r) => [
      r.chainage_mm / 1000, r.position_type, r.offset_mm == null ? "" : r.offset_mm / 1000,
      r.target_mm / 1000, r.actual_mm / 1000, r.difference_mm / 1000, r.result_type,
      r.correction_mm, r.target_source, r.measured_at, r.remarks ?? "",
    ]),
  );
}
export async function pegToCsv(rows: PegMarkRow[], pointCode: (id: string) => string): Promise<string> {
  return toCsv(
    ["chainage_m", "peg", "peg_rl_m", "centre_design_rl_m", "allowance_m", "adjusted_design_m", "offset_m", "direction", "convention", "calculated_at"],
    rows.map((r) => [
      r.chainage_mm / 1000, pointCode(r.peg_point_id), r.peg_rl_mm / 1000,
      r.centre_design_rl_mm / 1000, r.allowance_mm / 1000, r.adjusted_design_rl_mm / 1000,
      (r.mark_offset_mm > 0 ? "+" : "") + r.mark_offset_mm / 1000, r.mark_direction,
      r.calculated_by_convention, r.calculated_at,
    ]),
  );
}
