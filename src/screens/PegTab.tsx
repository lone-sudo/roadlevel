import { useState } from "react";

import { parseQuantity } from "../core/units";
import { calculatePegMark, findStalePegMarks, listDesignLevels, listPegMarks, listPoints, recalculatePegMark } from "../db/service";
import type { ProjectRow } from "../db/service";
import { pegToCsv } from "../io/csv";
import { download, Msg, useAsyncEffect } from "../ui/widgets";

export default function PegTab({ project }: { project: ProjectRow }) {
  const [designs, setDesigns] = useState<import("../db/service").RoadLevelDB["designLevels"]["value"][]>([]);
  const [points, setPoints] = useState<{ id: string; code: string; point_type: string; chainage_mm: number | null; known_rl_mm: number | null }[]>([]);
  const [marks, setMarks] = useState<Awaited<ReturnType<typeof listPegMarks>>>([]);
  const [stale, setStale] = useState<Awaited<ReturnType<typeof findStalePegMarks>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [chainage, setChainage] = useState("");
  const [designId, setDesignId] = useState("");
  const [pegId, setPegId] = useState("");

  const load = async () => {
    setDesigns(await listDesignLevels(project.id));
    const pts = await listPoints(project.id);
    setPoints(pts.filter((p) => p.point_type === "peg" || p.point_type === "ground").map((p) => ({ id: p.id, code: p.point_code, point_type: p.point_type, chainage_mm: p.chainage_mm, known_rl_mm: p.known_rl_mm })));
    setMarks(await listPegMarks(project.id));
    setStale(await findStalePegMarks(project.id));
  };
  useAsyncEffect(async () => { await load(); }, [project.id]);

  const calculate = async () => {
    setError(null);
    const ch = parseM(chainage);
    if (ch === null) { setError("Chainage is required (metres)."); return; }
    const r = await calculatePegMark({
      project_id: project.id, chainage_mm: ch, peg_point_id: pegId, centre_design_level_id: designId,
    });
    if (r.error) setError(r.error);
    else setOkMsg("Peg-mark calculation saved (exact values, inputs snapshotted).");
    await load();
  };

  return (
    <div>
      <h2>Peg setting-out</h2>
      {error ? <Msg kind="error">{error}</Msg> : null}
      {okMsg ? <Msg kind="ok">{okMsg}</Msg> : null}

      {project.default_peg_allowance_mm == null ? (
        <Msg kind="warn">No peg-marking allowance is configured for this project. The current site convention (+300 mm) is a project setting, not a universal rule — set it explicitly in Settings before calculating.</Msg>
      ) : (
        <p className="sub">Allowance: <strong>{project.default_peg_allowance_mm} mm</strong> · convention: <strong>{project.peg_mark_convention}</strong>. Exact values are always kept; rounding is never automatic.</p>
      )}

      {stale.length > 0 ? (
        <section className="card">
          <h3>Recalculation review ({stale.length})</h3>
          <p className="sub">Saved peg-mark results whose inputs have since changed (spec §30, Test 27). Old results and the change are traceable in the audit trail.</p>
          <table className="table">
            <thead><tr><th>Chainage</th><th>Peg</th><th>Why it needs review</th><th></th></tr></thead>
            <tbody>
              {stale.map((s) => (
                <tr key={s.row.id}>
                  <td>{(s.row.chainage_mm / 1000).toFixed(3)}</td>
                  <td>{points.find((p) => p.id === s.row.peg_point_id)?.code ?? s.row.peg_point_id.slice(0, 8)}</td>
                  <td>{s.reason}</td>
                  <td><button className="btn" onClick={async () => { await recalculatePegMark(s.row.id); await load(); setOkMsg("Peg mark recalculated from current inputs; previous result kept in the audit trail."); }}>Recalculate</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="card">
        <h3>New calculation</h3>
        <div className="form-grid">
          <label className="field"><span className="field-label">Chainage (m)</span>
            <input className="input" value={chainage} onChange={(e) => setChainage(e.target.value)} inputMode="decimal" />
          </label>
          <label className="field"><span className="field-label">Centreline design level</span>
            <select className="input" value={designId} onChange={(e) => setDesignId(e.target.value)}>
              <option value="">— centre positions only —</option>
              {designs.filter((d) => d.position_type === "centre").map((d) => (
                <option key={d.id} value={d.id}>{(d.chainage_mm / 1000).toFixed(3)} m · centre · RL {(d.design_rl_mm / 1000).toFixed(3)}</option>
              ))}
            </select>
          </label>
          <label className="field"><span className="field-label">Peg</span>
            <select className="input" value={pegId} onChange={(e) => setPegId(e.target.value)}>
              <option value="">— pegs and ground points —</option>
              {points.map((p) => <option key={p.id} value={p.id}>{p.code} ({p.point_type}, RL {p.known_rl_mm == null ? "missing!" : (p.known_rl_mm / 1000).toFixed(3)})</option>)}
            </select>
          </label>
        </div>
        <button className="btn" disabled={!designId || !pegId} onClick={calculate}>Calculate marking offset</button>
      </section>

      <section className="card">
        <h3>Setting-out table</h3>
        <table className="table">
          <thead><tr><th>Peg</th><th>Chainage</th><th>Peg RL (m)</th><th>Centre design (m)</th><th>Allowance</th><th>Adjusted design (m)</th><th>Offset</th><th>Instruction</th></tr></thead>
          <tbody>
            {marks.map((m) => (
              <tr key={m.id}>
                <td>{points.find((p) => p.id === m.peg_point_id)?.code ?? m.peg_point_id.slice(0, 8)}</td>
                <td>{(m.chainage_mm / 1000).toFixed(3)}</td>
                <td>{(m.peg_rl_mm / 1000).toFixed(3)}</td>
                <td>{(m.centre_design_rl_mm / 1000).toFixed(3)}</td>
                <td>{m.allowance_mm} mm</td>
                <td><strong>{(m.adjusted_design_rl_mm / 1000).toFixed(3)}</strong></td>
                <td>{m.mark_offset_mm > 0 ? "+" : ""}{m.mark_offset_mm} mm ({m.mark_direction})</td>
                <td>{m.mark_direction === "zero" ? "No offset required." : `Mark ${Math.abs(m.mark_offset_mm)} mm ${m.mark_direction}.`}</td>
              </tr>
            ))}
            {marks.length === 0 ? <tr><td colSpan={8}>No calculations yet.</td></tr> : null}
          </tbody>
        </table>
        <button className="btn" onClick={async () => download("peg-setting-out.csv", await pegToCsv(marks, (id) => points.find((p) => p.id === id)?.code ?? id), "text/csv")}>Export CSV</button>
      </section>
    </div>
  );
}

function parseM(text: string): number | null {
  const r = parseQuantity(text, "m");
  return r.ok ? r.value : null;
}
