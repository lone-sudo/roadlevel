import { useState } from "react";

import { compareGroundPointWithDesign, createDesignLevel, deleteDesignLevel, listDesignLevels, listPoints } from "../db/service";
import type { ProjectRow } from "../db/service";
import { parseDesignCsv, designLevelsToCsv } from "../io/csv";
import type { PositionType } from "../db/store";
import { download, Field, Msg, useAsyncEffect } from "../ui/widgets";

type DesignRow = import("../db/service").RoadLevelDB["designLevels"]["value"];

export default function DesignTab({ project }: { project: ProjectRow }) {
  const [rows, setRows] = useState<DesignRow[]>([]);
  const [points, setPoints] = useState<{ id: string; code: string; chainage_mm: number | null; position_type: string | null; known_rl_mm: number | null }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  // manual entry
  const [chainage, setChainage] = useState("");
  const [position, setPosition] = useState<PositionType>("centre");
  const [offset, setOffset] = useState("");
  const [rl, setRl] = useState("");
  const [revision, setRevision] = useState("");
  const [source, setSource] = useState("Drawing R-XXX");

  // CSV import preview
  const [preview, setPreview] = useState<{ rows: ReturnType<typeof parseDesignCsv>["rows"]; errors: string[] } | null>(null);

  const load = async () => {
    setRows(await listDesignLevels(project.id));
    const all = await listPoints(project.id);
    setPoints(all.filter((p) => p.known_rl_mm != null).map((p) => ({ id: p.id, code: p.point_code, chainage_mm: p.chainage_mm, position_type: p.position_type, known_rl_mm: p.known_rl_mm })));
  };
  useAsyncEffect(async () => { await load(); }, [project.id]);

  const add = async () => {
    setError(null);
    const ch = parseQuantityQuiet(chainage);
    if (!ch) { setError("Chainage is required (metres)."); return; }
    const rlVal = parseQuantityQuiet(rl);
    if (!rlVal) { setError("Design RL is required (metres)."); return; }
    const r = await createDesignLevel({
      project_id: project.id, alignment_id: null,
      chainage_mm: ch, position_type: position,
      offset_mm: offset.trim() === "" ? null : parseQuantityQuiet(offset),
      design_rl_mm: rlVal, revision: revision.trim() || null,
      source_reference: source.trim() || null,
    });
    if ("error" in r && r.error) setError(r.error);
    else { setOkMsg("Design level saved."); setChainage(""); setRl(""); setOffset(""); }
    await load();
  };

  const importCsv = async (file: File) => {
    const parsed = parseDesignCsv(await file.text());
    setPreview(parsed);
    if (parsed.errors.length === 0) {
      let saved = 0;
      const problems: string[] = [];
      for (const row of parsed.rows) {
        const r = await createDesignLevel({
          project_id: project.id, alignment_id: null, ...row,
        });
        if ("error" in r && r.error) problems.push(`chainage ${(row.chainage_mm / 1000).toFixed(3)} ${row.position_type}: ${r.error}`);
        else saved++;
      }
      if (problems.length > 0) setError(`Imported ${saved} row(s); ${problems.length} row(s) need resolution:\n${problems.join("\n")}`);
      else setOkMsg(`Imported ${saved} design row(s).`);
      await load();
    }
  };

  const compare = async (pointId: string, designId: string) => {
    setError(null);
    const r = await compareGroundPointWithDesign(project.id, pointId, designId);
    if (r.blocked) { setError(r.blocked); return; }
    if (r.result) {
      setOkMsg(
        r.result.resultType === "zero"
          ? "Zero difference — existing ground matches the design level."
          : `${r.result.resultType === "cut" ? "Cut" : "Fill"} ${r.result.magnitudeMm} mm (signed difference ${r.result.differenceMm > 0 ? "+" : ""}${r.result.differenceMm} mm).`,
      );
    }
  };

  return (
    <div>
      <h2>Design levels</h2>
      {error ? <Msg kind="error">{error}</Msg> : null}
      {okMsg ? <Msg kind="ok">{okMsg}</Msg> : null}

      <section className="card">
        <h3>Enter design level manually</h3>
        <div className="form-grid">
          <Field label="Chainage (m)"><input className="input" value={chainage} onChange={(e) => setChainage(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Position">
            <select className="input" value={position} onChange={(e) => setPosition(e.target.value as PositionType)}>
              {(["centre", "left", "right", "offset"] as PositionType[]).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Offset (m, offset positions only)"><input className="input" value={offset} onChange={(e) => setOffset(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Design RL (m)"><input className="input" value={rl} onChange={(e) => setRl(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Revision" hint="e.g. rev C — used for duplicate detection"><input className="input" value={revision} onChange={(e) => setRevision(e.target.value)} /></Field>
          <Field label="Source reference"><input className="input" value={source} onChange={(e) => setSource(e.target.value)} /></Field>
        </div>
        <button className="btn" onClick={add}>Save design level</button>
      </section>

      <section className="card">
        <h3>Import design CSV</h3>
        <p className="sub">Columns: <code>chainage_m, position (centre|left|right|offset), design_rl_m, offset_m?, revision?, source_reference?</code>. A preview is shown and duplicates are flagged — never silently overwritten.</p>
        <input type="file" accept=".csv,text/csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); }} />
        {preview && preview.errors.length > 0 ? <Msg kind="error">Import errors — nothing was saved from the failing rows:<br />{preview.errors.map((e, i) => <span key={i}>{e}<br /></span>)}</Msg> : null}
      </section>

      <section className="card">
        <h3>Design profile ({rows.length} rows)</h3>
        <table className="table">
          <thead><tr><th>Chainage (m)</th><th>Position</th><th>RL (m)</th><th>Rev</th><th>Source</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{(r.chainage_mm / 1000).toFixed(3)}</td>
                <td>{r.position_type}{r.offset_mm != null ? ` (${(r.offset_mm / 1000).toFixed(3)} m)` : ""}</td>
                <td><strong>{(r.design_rl_mm / 1000).toFixed(3)}</strong></td>
                <td>{r.revision ?? "—"}</td>
                <td>{r.source_reference ?? "—"}</td>
                <td><button className="btn" onClick={async () => { await deleteDesignLevel(r.id); await load(); }}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="btn" onClick={async () => download("design-levels.csv", designLevelsToCsv(project.id, rows), "text/csv")}>Export design CSV</button>
      </section>

      <section className="card">
        <h3>Compare with existing ground</h3>
        <p className="sub">Both levels must be at the same chainage and position; mismatched comparisons are blocked and must be resolved explicitly.</p>
        <div className="row">
          <select className="input" id="cmp-point" defaultValue="">
            <option value="">Ground point…</option>
            {points.map((p) => <option key={p.id} value={p.id}>{p.code} @ {p.chainage_mm == null ? "no chainage" : (p.chainage_mm / 1000).toFixed(3)} ({p.position_type ?? "no position"}) RL {(p.known_rl_mm! / 1000).toFixed(3)}</option>)}
          </select>
          <select className="input" id="cmp-design" defaultValue="">
            <option value="">Design level…</option>
            {rows.map((r) => <option key={r.id} value={r.id}>{(r.chainage_mm / 1000).toFixed(3)} {r.position_type} RL {(r.design_rl_mm / 1000).toFixed(3)}</option>)}
          </select>
          <button className="btn" onClick={() => {
            const p = (document.getElementById("cmp-point") as HTMLSelectElement).value;
            const d = (document.getElementById("cmp-design") as HTMLSelectElement).value;
            if (!p || !d) { setError("Select both a ground point and a design level."); return; }
            void compare(p, d);
          }}>Compare</button>
        </div>
      </section>
    </div>
  );
}

/** Quiet parse: returns integer mm or null; caller surfaces a message. */
import { parseQuantity } from "../core/units";
function parseQuantityQuiet(text: string): number | null {
  const r = parseQuantity(text, "m");
  return r.ok ? r.value : null;
}
