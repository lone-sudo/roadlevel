import { useState } from "react";

import { projectSummary } from "../db/service";
import type { ProjectRow } from "../db/service";
import { exportProjectBackup } from "../db/store";
import { download, Msg, useAsyncEffect } from "../ui/widgets";

type AuditRow = import("../db/store").RoadLevelDB["auditEvents"]["value"];

export default function BackupTab({ project }: { project: ProjectRow }) {
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof projectSummary>> | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useAsyncEffect(async () => {
    const { getDb } = await import("../db/store");
    const db = await getDb();
    const rows = await db.getAllFromIndex("auditEvents", "by-project");
    setAudit(rows.filter((r) => r.project_id === project.id).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).slice(0, 100));
    setSummary(await projectSummary(project.id));
  }, [project.id]);

  return (
    <div>
      <h2>Backup, restore &amp; audit</h2>
      {okMsg ? <Msg kind="ok">{okMsg}</Msg> : null}

      <section className="card">
        <h3>Project status</h3>
        {summary ? (
          <ul className="summary-list">
            <li>Survey points: <strong>{summary.points}</strong> ({summary.bms} with known levels)</li>
            <li>Open survey sessions: <strong>{summary.openSessions}</strong></li>
            <li>Unresolved calculation warnings (peg/accounted recalculation reviews): <strong>{summary.unresolvedCalculationWarnings}</strong></li>
            <li>
              Beacon tolerance: <strong>{project.beacon_tolerance_mm == null ? "not configured — differences shown without pass/fail status" : `±${project.beacon_tolerance_mm} mm`}</strong>
            </li>
          </ul>
        ) : "…"}
      </section>

      <section className="card">
        <h3>Backup</h3>
        <p className="sub">
          Exports a versioned JSON backup of every record, setting and audit event for this project.
          Restore is available from the Projects screen and validates the backup BEFORE writing anything;
          it will never silently overwrite an existing project.
        </p>
        <button className="btn" onClick={() => {
          void exportProjectBackup(project.id).then((b) => {
            download(`${project.name.replace(/[^\w-]+/g, "_")}-backup-${b.exported_at.slice(0, 10)}.json`, JSON.stringify(b, null, 1), "application/json");
            setOkMsg(`Backup exported: ${Object.entries(b.data).map(([k, v]) => `${k}: ${(v as unknown[]).length}`).join(", ")}.`);
          });
        }}>Export project backup</button>
        <Msg kind="warn">
          Local data (IndexedDB) can be cleared by browser data settings or device actions. Export backups regularly —
          this is the only durable copy aside from the device itself.
        </Msg>
      </section>

      <section className="card">
        <h3>Audit trail (latest {audit.length} events)</h3>
        <table className="table">
          <thead><tr><th>Time</th><th>Action</th><th>Entity</th><th>Reason / detail</th></tr></thead>
          <tbody>
            {audit.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.occurred_at).toLocaleString()}</td>
                <td>{a.action}</td>
                <td><small>{a.entity_type}</small></td>
                <td>{a.reason ?? "—"}</td>
              </tr>
            ))}
            {audit.length === 0 ? <tr><td colSpan={4}>No audit events yet.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
