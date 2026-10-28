import { useState } from "react";

import * as S from "../db/service";
import { exportProjectBackup, previewBackup, restoreBackup } from "../db/store";
import { download, Field, Msg, useAsyncEffect } from "../ui/widgets";

export default function ProjectsScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const [projects, setProjects] = useState<S.ProjectRow[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useAsyncEffect(async () => {
    setProjects(await S.listProjects(includeArchived));
  }, [includeArchived]);

  const create = async () => {
    setError(null);
    try {
      const p = await S.createProject({ name, default_peg_allowance_mm: null });
      setProjects(await S.listProjects(includeArchived));
      setNote(`Project "${p.name}" created. Configure its allowance and tolerance in settings before calculating.`);
      setName("");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const importBackup = async (file: File) => {
    const json = JSON.parse(await file.text());
    const preview = previewBackup(json);
    if (!preview.valid) {
      setError(`Backup rejected: ${preview.problems.join(" ")}`);
      return;
    }
    const choice = window.prompt(
      `Backup is valid.\nProject: ${preview.project_name}\nRecords: ${Object.entries(preview.counts).map(([k, v]) => `${k}: ${v}`).join(", ")}\n\nWarnings: ${preview.warnings.join(" ") || "none"}\n\nType NEW to restore as a new project, or REPLACE to overwrite the project it came from:`,
      "NEW",
    );
    if (!choice) return;
    const mode = choice.trim().toUpperCase() === "REPLACE" ? "replace-project" : "as-new-project";
    try {
      const { projectId } = await restoreBackup(json, mode);
      setProjects(await S.listProjects(true));
      setNote(`Restored "${preview.project_name}" (${mode.replace("-", " ")}).`);
      void projectId;
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const exportBackup = async (id: string, projectName: string) => {
    const backup = await exportProjectBackup(id);
    download(`${projectName.replace(/[^\w-]+/g, "_")}-backup-${backup.exported_at.slice(0, 10)}.json`, JSON.stringify(backup, null, 1), "application/json");
    setNote(`Backup exported (${backup.image_count} images linked, content saved separately in Milestone 6).`);
  };

  return (
    <div>
      <h1>RoadLevel — Projects</h1>
      <p className="sub">Offline-first road surveying assistant. All data is stored locally on this device.</p>
      {error ? <Msg kind="error">{error}</Msg> : null}
      {note ? <Msg kind="ok">{note}</Msg> : null}

      <section className="card">
        <h2>Create project</h2>
        <Field label="Project name" hint="Required — an empty name cannot be saved.">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Access Road Section 3" />
        </Field>
        <button className="btn" disabled={name.trim() === ""} onClick={create}>Create project</button>
      </section>

      <section className="card">
        <h2>Projects</h2>
        <label className="inline">
          <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
          Show archived
        </label>
        <table className="table">
          <thead><tr><th>Name</th><th>Road / section</th><th>Allowance</th><th>Beacon tolerance</th><th></th></tr></thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className={p.archived ? "archived" : ""}>
                <td><strong>{p.name}</strong></td>
                <td>{p.road_name ?? "—"}</td>
                <td>{p.default_peg_allowance_mm == null ? <em>not configured</em> : `${p.default_peg_allowance_mm} mm`}</td>
                <td>{p.beacon_tolerance_mm == null ? <em>not configured</em> : `±${p.beacon_tolerance_mm} mm`}</td>
                <td className="actions">
                  <button className="btn" onClick={() => onOpen(p.id)}>Open</button>
                  <button className="btn" onClick={() => void exportBackup(p.id, p.name)}>Export backup</button>
                  <button className="btn" onClick={async () => {
                    await S.updateProjectSettings(p.id, { archived: !p.archived });
                    setProjects(await S.listProjects(includeArchived));
                  }}>{p.archived ? "Restore" : "Archive"}</button>
                </td>
              </tr>
            ))}
            {projects.length === 0 ? <tr><td colSpan={5}>No projects yet — create one above.</td></tr> : null}
          </tbody>
        </table>
        <label className="inline">
          Import project backup:
          <input type="file" accept="application/json" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importBackup(f); }} />
        </label>
      </section>
    </div>
  );
}
