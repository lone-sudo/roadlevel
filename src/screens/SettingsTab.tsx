import { useState } from "react";

import { updateProjectSettings } from "../db/service";
import type { ProjectRow } from "../db/service";
import { Field, Msg, useAsyncEffect } from "../ui/widgets";

export default function SettingsTab({ project }: { project: ProjectRow }) {
  const [p, setP] = useState<ProjectRow>(project);
  const [allowance, setAllowance] = useState(project.default_peg_allowance_mm == null ? "" : String(project.default_peg_allowance_mm));
  const [interval, setInterval ] = useState(String(project.default_chainage_interval_mm));
  const [tolerance, setTolerance] = useState(project.beacon_tolerance_mm == null ? "" : String(project.beacon_tolerance_mm));
  const [toleranceSource, setToleranceSource] = useState(project.beacon_tolerance_source ?? "");
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [changeNotice, setChangeNotice] = useState<string | null>(null);

  useAsyncEffect(async () => { setP(project); }, [project.id]);

  const save = async () => {
    setError(null);
    try {
      const allowanceInt = allowance.trim() === "" ? null : Number(allowance);
      if (allowanceInt !== null && (!Number.isInteger(allowanceInt) || allowanceInt < 0)) throw new Error("Allowance must be an integer number of millimetres, e.g. 300.");
      const intervalInt = Number(interval);
      if (!Number.isInteger(intervalInt) || intervalInt <= 0) throw new Error("Default chainage interval must be a positive integer in millimetres, e.g. 20000 = 20 m.");
      const toleranceInt = tolerance.trim() === "" ? null : Number(tolerance);
      if (toleranceInt !== null && (!Number.isInteger(toleranceInt) || toleranceInt < 0)) throw new Error("Beacon tolerance must be an integer number of millimetres or left blank.");
      const prev = { allowance: p.default_peg_allowance_mm, tolerance: p.beacon_tolerance_mm, convention: p.peg_mark_convention };
      const next = await updateProjectSettings(project.id, {
        name: p.name, road_name: p.road_name, description: p.description,
        default_chainage_interval_mm: intervalInt,
        default_peg_allowance_mm: allowanceInt,
        peg_mark_convention: p.peg_mark_convention as ProjectRow["peg_mark_convention"],
        beacon_tolerance_mm: toleranceInt,
        beacon_tolerance_source: toleranceSource.trim() || null,
        default_level_unit: p.default_level_unit,
      });
      setP(next);
      setOkMsg("Settings saved. Settings changes never silently rewrite historical calculations — dependent results are flagged for review in the relevant screens.");
      const changes: string[] = [];
      if (prev.allowance !== allowanceInt) changes.push(`peg-marking allowance ${prev.allowance ?? "unset"} → ${allowanceInt ?? "unset"}`);
      if (prev.tolerance !== toleranceInt) changes.push(`beacon tolerance ${prev.tolerance ?? "\(unconfigured\)"} → ${toleranceInt ?? "(unconfigured)"}`.replace("\\(", "(").replace("\\)", ")"));
      if (changes.length > 0) setChangeNotice(`Changed: ${changes.join("; ")}. Check "Recalculation review" on the Peg screen.`);
    } catch (e) { setError((e as Error).message); }
  };

  return (
    <div>
      <h2>Project settings</h2>
      <p className="sub">Site conventions are stored per project. The +300 mm allowance and any beacon tolerance confirmed here apply to THIS project only and are snapshotted into every calculation.</p>
      {error ? <Msg kind="error">{error}</Msg> : null}
      {okMsg ? <Msg kind="ok">{okMsg}</Msg> : null}
      {changeNotice ? <Msg kind="warn">{changeNotice}</Msg> : null}

      <section className="card">
        <div className="form-grid">
          <Field label="Project name"><input className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
          <Field label="Road / section"><input className="input" value={p.road_name ?? ""} onChange={(e) => setP({ ...p, road_name: e.target.value })} /></Field>
          <Field label="Description"><input className="input" value={p.description ?? ""} onChange={(e) => setP({ ...p, description: e.target.value })} /></Field>
          <Field label="Default chainage interval (mm)" hint="e.g. 20000 for 20 m stations"><input className="input" value={interval} onChange={(e) => setInterval(e.target.value)} inputMode="numeric" /></Field>
          <Field label="Peg-marking allowance (mm)" hint="blank = unset; the +300 mm site convention must be confirmed per project">
            <input className="input" value={allowance} onChange={(e) => setAllowance(e.target.value)} inputMode="numeric" placeholder="e.g. 300" />
          </Field>
          <Field label="Peg-mark direction convention">
            <select className="input" value={p.peg_mark_convention} onChange={(e) => setP({ ...p, peg_mark_convention: e.target.value as ProjectRow["peg_mark_convention"] })}>
              <option value="positive-upward">positive-upward (+ offset → mark upward)</option>
              <option value="positive-downward">positive-downward (offset signs reversed)</option>
            </select>
          </Field>
          <Field label="Display level unit" hint="internal storage is always integer millimetres">
            <select className="input" value={p.default_level_unit} onChange={(e) => setP({ ...p, default_level_unit: e.target.value })}>
              <option value="m">metres (m, 3 dp shown)</option>
            </select>
          </Field>
          <Field label="Beacon tolerance (±mm)" hint="leave blank until a valid tolerance is confirmed — the app will show differences without pass/fail status">
            <input className="input" value={tolerance} onChange={(e) => setTolerance(e.target.value)} inputMode="numeric" placeholder="unconfigured" />
          </Field>
          <Field label="Tolerance source" hint="specification or document this tolerance comes from">
            <input className="input" value={toleranceSource} onChange={(e) => setToleranceSource(e.target.value)} />
          </Field>
        </div>
        <button className="btn" onClick={save}>Save settings</button>
      </section>
    </div>
  );
}
