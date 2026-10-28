import { useState } from "react";

import { parseQuantity } from "../core/units";
import { createDippingObservation, editDipping, listDipping, listPoints } from "../db/service";
import type { ProjectRow } from "../db/service";
import { dipToCsv } from "../io/csv";
import { download, Field, Msg, useAsyncEffect } from "../ui/widgets";
import type { PositionType } from "../db/store";

export default function DippingTab({ project }: { project: ProjectRow }) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listDipping>>>([]);
  const [points, setPoints] = useState<{ id: string; code: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [chainage, setChainage] = useState("");
  const [position, setPosition] = useState<PositionType>("centre");
  const [offset, setOffset] = useState("");
  const [pointId, setPointId] = useState("");
  const [target, setTarget] = useState("");
  const [actual, setActual] = useState("");
  const [remarks, setRemarks] = useState("");

  useAsyncEffect(async () => {
    setRows(await listDipping(project.id));
    const pts = await listPoints(project.id);
    setPoints(pts.map((p) => ({ id: p.id, code: p.point_code })));
  }, [project.id]);

  const add = async () => {
    setError(null);
    const ch = parseM(chainage);
    if (ch === null) { setError("Chainage is required (metres)."); return; }
    const t = parseM(target);
    if (t === null) { setError("Target thread-to-ground distance is required. A missing target blocks the calculation — it must never be assumed (e.g. 30 cm centre / 38 cm side) unless configured."); return; }
    const a = parseM(actual);
    if (a === null) { setError("Actual measurement is required (metres)."); return; }
    const r = await createDippingObservation({
      project_id: project.id, chainage_mm: ch, position_type: position,
      offset_mm: offset.trim() === "" ? null : parseM(offset),
      point_id: pointId || null, target_mm: t, actual_mm: a,
      target_source: "manual", remarks: remarks.trim() || null,
    });
    if (r.error) setError(r.error);
    else {
      const o = r.observation!;
      setOkMsg(`Recorded: difference ${o.difference_mm > 0 ? "+" : ""}${o.difference_mm} mm → ${o.result_type}${o.result_type === "zero" ? "" : ` ${o.correction_mm} mm`}.`);
      setActual(""); setRemarks("");
    }
    setRows(await listDipping(project.id));
  };

  return (
    <div>
      <h2>Dipping</h2>
      <p className="sub">Thread-to-ground dipping: <strong>D = actual − target</strong>. D &gt; 0 → fill, D &lt; 0 → cut (spec §11). This rule is independent of the design-level comparison.</p>
      {error ? <Msg kind="error">{error}</Msg> : null}
      {okMsg ? <Msg kind="ok">{okMsg}</Msg> : null}

      <section className="card">
        <h3>New dipping record</h3>
        <div className="form-grid">
          <Field label="Chainage (m)"><input className="input" value={chainage} onChange={(e) => setChainage(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Position">
            <select className="input" value={position} onChange={(e) => setPosition(e.target.value as PositionType)}>
              {(["centre", "left", "right", "offset"] as PositionType[]).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Offset (m)" hint="offset positions only"><input className="input" value={offset} onChange={(e) => setOffset(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Point / peg" hint="optional">
            <select className="input" value={pointId} onChange={(e) => setPointId(e.target.value)}>
              <option value="">—</option>
              {points.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
            </select>
          </Field>
          <Field label="Target (m)" hint="e.g. 0.38 for 380 mm — entered, never inferred">
            <input className="input" value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Actual (m)"><input className="input" value={actual} onChange={(e) => setActual(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Remarks"><input className="input" value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
        </div>
        <button className="btn" onClick={add}>Calculate and record</button>
      </section>

      <section className="card">
        <h3>Dipping records</h3>
        <table className="table">
          <thead><tr><th>Chainage</th><th>Position</th><th>Target (m)</th><th>Actual (m)</th><th>Diff</th><th>Result</th><th>Correction</th><th>Remarks</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{(r.chainage_mm / 1000).toFixed(3)}</td>
                <td>{r.position_type}</td>
                <td>{(r.target_mm / 1000).toFixed(3)}</td>
                <td>{(r.actual_mm / 1000).toFixed(3)}</td>
                <td>{r.difference_mm > 0 ? "+" : ""}{r.difference_mm} mm</td>
                <td className={`status-${r.result_type}`}>{r.result_type}</td>
                <td>{r.correction_mm === 0 ? "—" : `${r.correction_mm} mm`}</td>
                <td>{r.remarks ?? "—"}</td>
                <td><button className="btn" onClick={async () => {
                  const v = window.prompt(`Update actual measurement for record at ${(r.chainage_mm / 1000).toFixed(3)} m (metres):`, (r.actual_mm / 1000).toFixed(3));
                  if (v === null) return;
                  try { await editDipping(r.id, { actual_mm: parseQuantity(v, "m").ok === true ? (parseQuantity(v, "m") as { value: number }).value : undefined }); setOkMsg("Dipping record updated and recalculated."); }
                  catch (e) { setError((e as Error).message); }
                  setRows(await listDipping(project.id));
                }}>Edit actual</button></td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={9}>No dipping records yet.</td></tr> : null}
          </tbody>
        </table>
        <button className="btn" onClick={async () => download("dipping-corrections.csv", await dipToCsv(rows), "text/csv")}>Export CSV</button>
      </section>
    </div>
  );
}

function parseM(text: string): number | null {
  const r = parseQuantity(text, "m");
  return r.ok ? r.value : null;
}
