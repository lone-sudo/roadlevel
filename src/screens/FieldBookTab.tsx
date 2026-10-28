import { useState } from "react";

import { parseQuantity } from "../core/units";
import * as S from "../db/service";
import type { RoadLevelDB } from "../db/store";
import { download, Field, Msg, useAsyncEffect } from "../ui/widgets";
import { fieldBookToCsv } from "../io/csv";

type SetupRow = RoadLevelDB["setups"]["value"];
type Point = RoadLevelDB["points"]["value"];

export default function FieldBookTab({ project }: { project: S.ProjectRow }) {
  const [sessions, setSessions] = useState<RoadLevelDB["sessions"]["value"][]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState("");
  const [setups, setSetups] = useState<SetupRow[]>([]);
  const [obs, setObs] = useState<RoadLevelDB["observations"]["value"][]>([]);
  const [levels, setLevels] = useState<Map<string, S.RoadLevelDB["calculatedLevels"]["value"]>>(new Map());
  const [points, setPoints] = useState<Point[]>([]);
  const [checks, setChecks] = useState<Awaited<ReturnType<typeof S.sessionChecks>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  // entry form state
  const [entrySetup, setEntrySetup] = useState("");
  const [entryPoint, setEntryPoint] = useState("");
  const [entryType, setEntryType] = useState<"IS" | "FS">("IS");
  const [entryReading, setEntryReading] = useState("");
  const [entryRemarks, setEntryRemarks] = useState("");
  // setup form state
  const [refPoint, setRefPoint] = useState("");
  const [bsReading, setBsReading] = useState("");

  const load = async (sessionId: string | null) => {
    setSessions(await S.listSessions(project.id));
    setPoints(await S.listPoints(project.id));
    if (sessionId) {
      const s = await S.listSetups(sessionId);
      const o = await S.listObservations(sessionId);
      const l = await S.listCalculatedLevels(sessionId);
      setSetups(s);
      setObs(o);
      setLevels(new Map(l.filter((x) => x.source_observation_id != null).map((x) => [x.source_observation_id as string, x])));
      setChecks(await S.sessionChecks(sessionId));
      if (s.length > 0 && entrySetup === "") setEntrySetup(s[s.length - 1].id);
    } else {
      setSetups([]); setObs([]); setLevels(new Map()); setChecks(null);
    }
  };
  useAsyncEffect(async () => { await load(activeId); }, [activeId]);

  const createSession = async () => {
    if (!sessionName.trim()) { setError("A session needs a name."); return; }
    const s = await S.createSession({ project_id: project.id, name: sessionName.trim() });
    setSessionName("");
    setActiveId(s.id);
  };

  const pointById = new Map(points.map((p) => [p.id, p]));
  const codeOf = (id: string) => pointById.get(id)?.point_code ?? id.slice(0, 8);

  const establish = async (setupId: string) => {
    setError(null);
    try {
      const bs = parseQuantity(bsReading, "m");
      if (!bs.ok) { setError(`Backsight: ${bs.error}`); return; }
      // The reference is selected by point; the backsight here is entered in metres.
      await S.establishSetup(setupId, refPoint, bs.value);
      setBsReading("");
      setOkMsg("Setup established: HI calculated from the reference point's known RL.");
      await load(activeId);
    } catch (e) {
      setError((e as Error).message);
      await load(activeId);
    }
  };

  const addObs = async () => {
    setError(null);
    if (!entrySetup || !entryPoint) { setError("Select the setup and the point being sighted."); return; }
    const reading = parseQuantity(entryReading, "m");
    if (!reading.ok) { setError(`Staff reading: ${reading.error}`); return; }
    try {
      const r = await S.addObservation({
        session_id: activeId!, setup_id: entrySetup, point_id: entryPoint,
        reading_type: entryType, staff_reading_mm: reading.value,
        remarks: entryRemarks.trim() || null,
      });
      if ("error" in r && r.error) { setError(r.error); }
      else { setOkMsg("Observation recorded and reduced levels recalculated."); setEntryReading(""); }
      await load(activeId);
    } catch (e) { setError((e as Error).message); await load(activeId); }
  };

  const activeSession = sessions.find((s) => s.id === activeId);

  return (
    <div>
      <h2>Field book</h2>
      {error ? <Msg kind="error">{error}</Msg> : null}
      {okMsg ? <Msg kind="ok">{okMsg}</Msg> : null}

      <section className="card">
        <h3>Sessions</h3>
        <div className="row">
          <input className="input" placeholder="New session name" value={sessionName} onChange={(e) => setSessionName(e.target.value)} />
          <button className="btn" onClick={createSession}>Create session</button>
        </div>
        <div className="row">
          <select className="input" value={activeId ?? ""} onChange={(e) => { setActiveId(e.target.value || null); setEntrySetup(""); }}>
            <option value="">— select session —</option>
            {sessions.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.status})</option>)}
          </select>
        </div>
      </section>

      {activeSession ? (
        <>
          <section className="card">
            <h3>Instrument setups of "{activeSession.name}"</h3>
            <p className="sub">A new setup must be established from a reference point (BM/TBM/CP) with a known RL, using a backsight. A CP must be the same physical point as the previous setup's foresight.</p>
            <table className="table">
              <thead><tr><th>#</th><th>Reference</th><th>Reference RL</th><th>BS</th><th>HI</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {setups.map((s) => (
                  <tr key={s.id}>
                    <td>{s.setup_number}</td>
                    <td>{s.reference_point_id ? codeOf(s.reference_point_id) : <em>not established</em>}</td>
                    <td>{s.reference_rl_mm == null ? "—" : (s.reference_rl_mm / 1000).toFixed(3)}</td>
                    <td>{s.backsight_observation_id ? (() => { const o = obs.find((x) => x.id === s.backsight_observation_id); return o ? (o.staff_reading_mm / 1000).toFixed(3) : "—"; })() : "—"}</td>
                    <td><strong>{s.hi_mm == null ? "—" : (s.hi_mm / 1000).toFixed(3)}</strong></td>
                    <td className={`status-${s.status}`}>{s.status}</td>
                    <td>
                      {s.status !== "complete" ? (
                        <span className="row">
                          <select className="input" value={refPoint} onChange={(e) => setRefPoint(e.target.value)}>
                            <option value="">Reference point…</option>
                            {points.filter((p) => p.known_rl_mm != null).map((p) => <option key={p.id} value={p.id}>{p.point_code} ({(p.known_rl_mm! / 1000).toFixed(3)})</option>)}
                          </select>
                          <input className="input" style={{ width: 90 }} placeholder="BS (m)" value={bsReading} onChange={(e) => setBsReading(e.target.value)} />
                          <button className="btn" onClick={() => void establish(s.id)}>Establish</button>
                        </span>
                      ) : <button className="btn" onClick={async () => { await S.discardSetup(s.id); await load(activeId); setOkMsg("Setup discarded (values preserved in the audit trail)."); }}>Discard setup</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn" onClick={async () => { await S.createSetup({ session_id: activeSession.id }); await load(activeId); }}>Add instrument setup</button>
          </section>

          <section className="card">
            <h3>Record observation</h3>
            <div className="form-grid">
              <Field label="From setup">
                <select className="input" value={entrySetup} onChange={(e) => setEntrySetup(e.target.value)}>
                  <option value="">—</option>
                  {setups.filter((s) => s.hi_mm != null).map((s) => <option key={s.id} value={s.id}>Setup {s.setup_number} (HI {(s.hi_mm! / 1000).toFixed(3)})</option>)}
                </select>
              </Field>
              <Field label="Point sighted">
                <select className="input" value={entryPoint} onChange={(e) => setEntryPoint(e.target.value)}>
                  <option value="">—</option>
                  {points.map((p) => <option key={p.id} value={p.id}>{p.point_code} ({p.point_type})</option>)}
                </select>
              </Field>
              <Field label="Reading type" hint="FS = foresight (to a change point at setup end or run end)">
                <select className="input" value={entryType} onChange={(e) => setEntryType(e.target.value as "IS" | "FS")}>
                  <option value="IS">IS</option>
                  <option value="FS">FS</option>
                </select>
              </Field>
              <Field label="Staff reading" hint="metres with mm precision, e.g. 1.875">
                <input className="input" value={entryReading} onChange={(e) => setEntryReading(e.target.value)} inputMode="decimal" />
              </Field>
              <Field label="Remarks">
                <input className="input" value={entryRemarks} onChange={(e) => setEntryRemarks(e.target.value)} />
              </Field>
            </div>
            <button className="btn" onClick={addObs}>Record observation</button>
          </section>

          <section className="card">
            <h3>Reduction (raw observation → calculated RL)</h3>
            <table className="table">
              <thead><tr><th>Setup</th><th>Point</th><th>Type</th><th>Reading (m)</th><th>Review</th><th>RL (m)</th><th>ΔR/F (mm)</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {obs.map((o) => {
                  const setup = setups.find((s) => s.id === o.setup_id);
                  const l = levels.get(o.id);
                  const rf = l?.method === "Rise and Fall" ? l.input_snapshot as { riseMm?: number; fallMm?: number } : null;
                  return (
                    <tr key={o.id}>
                      <td>{setup?.setup_number ?? "—"}</td>
                      <td>{codeOf(o.point_id)}</td>
                      <td>{o.reading_type}</td>
                      <td>{(o.staff_reading_mm / 1000).toFixed(3)}</td>
                      <td className={`status-${o.review_status}`}>{o.review_status}</td>
                      <td><strong>{l?.rl_mm != null ? (l.rl_mm / 1000).toFixed(3) : "—"}</strong> <small>{l?.method ?? ""}</small></td>
                      <td>{rf ? (rf.riseMm ?? 0) - (rf.fallMm ?? 0) : "—"}</td>
                      <td className={`status-${l?.calculation_status ?? "none"}`}>{l?.calculation_status ?? "no calculation"}</td>
                      <td>
                        {o.review_status !== "confirmed" ? <button className="btn" onClick={async () => { await S.confirmObservation(o.id); await load(activeId); }}>Confirm</button> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button className="btn" onClick={async () => {
              const csv = await fieldBookToCsv(codeOf, activeSession.name, setups, obs, [...levels.values()]);
              download(`fieldbook-${activeSession.name.replace(/[^\w-]+/g, "_")}.csv`, csv, "text/csv");
            }}>Export field book CSV</button>
          </section>

          {checks ? (
            <section className="card">
              <h3>Arithmetic checks</h3>
              <p className="sub">{checks.note}</p>
              <table className="table">
                <thead><tr><th>Check</th><th>Σ− sums</th><th>RL last − first</th><th>Discrepancy (mm)</th><th>Status</th></tr></thead>
                <tbody>
                  <tr>
                    <td>ΣBS − ΣFS (HI method)</td>
                    <td>{checks.hiCheck.sumMinusFsmm ?? "—"}</td>
                    <td>{checks.hiCheck.lastMinusFirstMm ?? "—"}</td>
                    <td>{checks.hiCheck.discrepancyMm ?? "—"}</td>
                    <td className={`status-${checks.hiCheck.status}`}>{checks.hiCheck.status}</td>
                  </tr>
                  <tr>
                    <td>ΣRise − ΣFall</td>
                    <td>{checks.rfCheck.sumMinusFsmm ?? "—"}</td>
                    <td>{checks.rfCheck.lastMinusFirstMm ?? "—"}</td>
                    <td>{checks.rfCheck.discrepancyMm ?? "—"}</td>
                    <td className={`status-${checks.rfCheck.status}`}>{checks.rfCheck.status}</td>
                  </tr>
                </tbody>
              </table>
              <p className="sub">ΣBS = {checks.sumBs} mm · ΣFS = {checks.sumFs} mm · ΣRise = {checks.sumRise} mm · ΣFall = {checks.sumFall} mm</p>
              <Msg kind="warn">A passed arithmetic check does NOT constitute independent verification against a known point.</Msg>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
