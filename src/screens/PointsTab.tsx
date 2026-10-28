import { useState } from "react";

import { parseQuantity } from "../core/units";
import { createPoint, listCalculatedLevels, listPoints, listSessions, performBeaconCheck, updatePoint } from "../db/service";
import type { ProjectRow } from "../db/service";
import type { PointType, PositionType } from "../db/store";
import { download, Field, Msg, useAsyncEffect } from "../ui/widgets";

type Point = import("../db/store").RoadLevelDB["points"]["value"];

export default function PointsTab({ project }: { project: ProjectRow }) {
  const [points, setPoints] = useState<Point[]>([]);
  const [, setSessions] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [checks, setChecks] = useState<Awaited<ReturnType<typeof import("../db/service").listBeaconChecks>> | null>(null);
  const [recentLevels, setRecentLevels] = useState<(Point & { levelId: string; sessionName: string; rl_mm: number })[]>([]);

  // form
  const [code, setCode] = useState("");
  const [type, setType] = useState<PointType>("BM");
  const [chainage, setChainage] = useState("");
  const [offset, setOffset] = useState("");
  const [position, setPosition] = useState<PositionType | "">("");
  const [knownRl, setKnownRl] = useState("");
  const [rlSource, setRlSource] = useState("");
  const [desc, setDesc] = useState("");

  // beacon check form
  const [beaconPoint, setBeaconPoint] = useState("");
  const [levelId, setLevelId] = useState("");

  useAsyncEffect(async () => {
    const pts = await listPoints(project.id);
    const ses = await listSessions(project.id);
    const recent: typeof recentLevels = [];
    for (const s of ses) {
      const levels = await listCalculatedLevels(s.id);
      for (const l of levels) {
        if (l.calculation_status === "complete" && l.rl_mm != null) {
          const p = pts.find((x) => x.id === l.point_id);
          if (p) recent.push({ ...p, levelId: l.id, sessionName: s.name, rl_mm: l.rl_mm });
        }
      }
    }
    setRecentLevels(recent);
    setPoints(pts);
    setSessions(ses.map((x) => ({ id: x.id, name: x.name })));
    const { listBeaconChecks } = await import("../db/service");
    setChecks(await listBeaconChecks(project.id));
  }, [project.id, recentLevels.length]);

  const create = async () => {
    setError(null);
    if (!code.trim()) { setError("Point code is required."); return; }
    const ch = chainage.trim() === "" ? null : parseQuantity(chainage, "m");
    if (ch && !ch.ok) { setError(`Chainage: ${ch.error}`); return; }
    const off = offset.trim() === "" ? null : parseQuantity(offset, "m");
    if (off && !off.ok) { setError(`Offset: ${off.error}`); return; }
    const rl = knownRl.trim() === "" ? null : parseQuantity(knownRl, "m");
    if (rl && !rl.ok) { setError(`Known RL: ${rl.error}`); return; }
    const r = await createPoint({
      project_id: project.id, alignment_id: null,
      point_code: code, point_type: type,
      chainage_mm: ch && ch.ok ? ch.value : null,
      offset_mm: off && off.ok ? off.value : null,
      position_type: position || null,
      known_rl_mm: rl && rl.ok ? rl.value : null,
      known_rl_source: rlSource.trim() || null,
      description: desc.trim() || null,
    });
    if (r.duplicateCodeWarning) setOkMsg(`Point created — WARNING: another point in this project already uses the code "${r.point.point_code}". Disambiguate before relying on it.`);
    else setOkMsg(`Point ${r.point.point_code} created.`);
    setCode(""); setChainage(""); setOffset(""); setPosition(""); setKnownRl(""); setRlSource(""); setDesc("");
    setPoints(await listPoints(project.id));
  };

  const checkBeacon = async () => {
    setError(null);
    try {
      const r = await performBeaconCheck(project.id, beaconPoint, levelId);
      if (r.error) setError(r.error);
      else setOkMsg(`Beacon check recorded: difference ${r.check!.difference_mm > 0 ? "+" : ""}${r.check!.difference_mm} mm — status: ${r.check!.status.replace("-", " ")}.`);
      setChecks(await import("../db/service").then((m) => m.listBeaconChecks(project.id)));
      setRecentLevels([]); // trigger reload of recent levels via useEffect deps
    } catch (e) { setError((e as Error).message); }
  };


  return (
    <div>
      <h2>Points, benchmarks &amp; beacons</h2>
      {error ? <Msg kind="error">{error}</Msg> : null}
      {okMsg ? <Msg kind="ok">{okMsg}</Msg> : null}

      <section className="card">
        <h3>Add point</h3>
        <div className="form-grid">
          <Field label="Point code" hint="user-visible ID, e.g. BM-3, CP-12, LB-40">
            <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <Field label="Type">
            <select className="input" value={type} onChange={(e) => setType(e.target.value as PointType)}>
              {(["BM", "TBM", "CP", "beacon", "ground", "peg", "other"] as PointType[]).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Chainage (m)" hint="optional">
            <input className="input" value={chainage} onChange={(e) => setChainage(e.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Position">
            <select className="input" value={position} onChange={(e) => setPosition(e.target.value as PositionType | "")}>
              <option value="">—</option>
              {(["centre", "left", "right", "offset"] as PositionType[]).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Offset (m)" hint="optional">
            <input className="input" value={offset} onChange={(e) => setOffset(e.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Known RL (m)" hint="required for BM, TBM and beacons">
            <input className="input" value={knownRl} onChange={(e) => setKnownRl(e.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Known RL source" hint="where does this level come from?">
            <input className="input" value={rlSource} onChange={(e) => setRlSource(e.target.value)} placeholder="e.g. drawing R-102 rev C" />
          </Field>
          <Field label="Description">
            <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </Field>
        </div>
        <button className="btn" onClick={create}>Add point</button>
      </section>

      <section className="card">
        <h3>Point register</h3>
        <table className="table">
          <thead><tr><th>Code</th><th>Type</th><th>Chainage</th><th>Position/offset</th><th>Known RL</th><th>Source</th><th></th></tr></thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.id}>
                <td>{p.point_code}</td>
                <td>{p.point_type}</td>
                <td>{p.chainage_mm == null ? "—" : (p.chainage_mm / 1000).toFixed(3)}</td>
                <td>{[p.position_type, p.offset_mm != null ? (p.offset_mm / 1000).toFixed(3) : null].filter(Boolean).join(" ") || "—"}</td>
                <td>{p.known_rl_mm == null ? "—" : (p.known_rl_mm / 1000).toFixed(3)}</td>
                <td>{p.known_rl_source ?? "—"}</td>
                <td><button className="btn" onClick={async () => {
                  const source = window.prompt(`Update known RL source for ${p.point_code}:`) ?? p.known_rl_source;
                  await updatePoint(p.id, { known_rl_source: source });
                  setPoints(await listPoints(project.id));
                }}>Edit source</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h3>Beacon verification</h3>
        <p className="sub">
          {project.beacon_tolerance_mm == null
            ? "No beacon tolerance is configured for this project, so checks will show the difference with tolerance status 'not configured'. The app never assumes a default tolerance."
            : `Configured tolerance: ±${project.beacon_tolerance_mm} mm (source: ${project.beacon_tolerance_source ?? "unrecorded"}).`}
        </p>
        <div className="row">
          <select className="input" value={beaconPoint} onChange={(e) => setBeaconPoint(e.target.value)}>
            <option value="">Beacon / BM / CP…</option>
            {points.filter((p) => ["BM", "TBM", "CP", "beacon"].includes(p.point_type) && p.known_rl_mm != null).map((p) => (
              <option key={p.id} value={p.id}>{p.point_code} (known {(p.known_rl_mm! / 1000).toFixed(3)})</option>
            ))}
          </select>
          <select className="input" value={levelId} onChange={(e) => setLevelId(e.target.value)}>
            <option value="">Calculated level…</option>
            {recentLevels.map((l) => <option key={l.levelId} value={l.levelId}>{l.sessionName}: {(l.rl_mm / 1000).toFixed(3)}</option>)}
          </select>
          <button className="btn" disabled={!beaconPoint || !levelId} onClick={checkBeacon}>Verify against known RL</button>
        </div>
        {checks && checks.length > 0 ? (
          <table className="table">
            <thead><tr><th>Checked</th><th>Known RL</th><th>Calculated RL</th><th>Difference</th><th>Tolerance</th><th>Status</th></tr></thead>
            <tbody>
              {checks.map((c) => (
                <tr key={c.id}>
                  <td>{new Date(c.checked_at).toLocaleString()}</td>
                  <td>{(c.known_rl_mm / 1000).toFixed(3)}</td>
                  <td>{(c.calculated_rl_mm / 1000).toFixed(3)}</td>
                  <td><strong>{c.difference_mm > 0 ? "+" : ""}{c.difference_mm} mm</strong></td>
                  <td>{c.tolerance_mm == null ? "not configured" : `±${c.tolerance_mm} mm`}</td>
                  <td className={`status-${c.status}`}>{c.status.replace("-", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        <button className="btn" onClick={async () => {
          const csv = [["checked_at", "known_rl_m", "calculated_rl_m", "difference_mm", "tolerance_mm", "status"], ...((checks ?? []).map((c) => [c.checked_at, c.known_rl_mm / 1000, c.calculated_rl_mm / 1000, c.difference_mm, c.tolerance_mm ?? "", c.status]))];
          download("beacon-checks.csv", csv.map((r) => r.join(",")).join("\n"), "text/csv");
        }}>Export beacon report CSV</button>
      </section>
    </div>
  );
}
