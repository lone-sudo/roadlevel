import { describe, expect, it } from "vitest";

import { dipToCsv, parseCsv, parseDesignCsv, pegToCsv } from "./csv";

describe("CSV round trip (spec Test 32)", () => {
  it("parses quoted CSV fields including commas and quotes", () => {
    const rows = parseCsv('a,b\n"1,5","say ""hi"""\n2,3');
    expect(rows).toEqual([["a", "b"], ["1,5", 'say "hi"'], ["2", "3"]]);
  });

  it("design import converts metres to integer millimetres at the boundary", () => {
    const r = parseDesignCsv('chainage_m,position,design_rl_m\n1820.000,centre,1830.000\n1,821.000,left,1829.000'.replace("1,821.000", "1821.000"));
    // (the replace strips an accidental comma; the point of the case is headline-free)
    expect(r.errors).toEqual([]);
    expect(r.rows[0]?.chainage_mm).toBe(1820000);
    expect(r.rows[0]?.design_rl_mm).toBe(1830000);
    expect(r.rows[1]?.chainage_mm).toBe(1821000);
    expect(r.rows[1]?.design_rl_mm).toBe(1829000);
    expect(r.rows[1]?.position_type).toBe("left");
  });

  it("rejects over-precision rows instead of silently discarding them", () => {
    const r = parseDesignCsv("chainage_m,position,design_rl_m\n1820.000,centre,1830.0005");
    expect(r.rows).toEqual([]);
    expect(r.errors.length).toBe(1);
    expect(r.errors[0]).toContain("not be silently discarded");
  });

  it("rejects invalid position values", () => {
    const r = parseDesignCsv("chainage_m,position,design_rl_m\n1820.000,middle,1830.000");
    expect(r.rows).toEqual([]);
    expect(r.errors[0]).toContain("position");
  });

  it("exported values preserve sign and metre conversion (dipping)", async () => {
    const csv = await dipToCsv([{
      id: "x", project_id: "p", alignment_id: null, session_id: null, chainage_mm: 1820000,
      point_id: null, position_type: "centre", offset_mm: null, target_mm: 380, actual_mm: 420,
      difference_mm: 40, result_type: "fill", correction_mm: 40, target_source: "manual",
      calculation_version: "1.0.0", measured_at: "2026-10-28T00:00:00Z", remarks: null,
    }]);
    expect(csv).toContain("0.04,fill,40");
    const pegCsv = await pegToCsv([{
      id: "x", project_id: "p", alignment_id: null, chainage_mm: 1820000, peg_point_id: "peg1",
      centre_design_level_id: "d1", centre_design_rl_mm: 1829764, allowance_mm: 300,
      adjusted_design_rl_mm: 1830064, peg_rl_mm: 1830009, mark_offset_mm: 55,
      mark_direction: "upward", calculated_by_convention: "positive-upward",
      calculation_version: "1.0.0", calculated_at: "2026-10-28T00:00:00Z",
    }], () => "PEG L");
    expect(pegCsv).toContain("+0.055");
  });
});
