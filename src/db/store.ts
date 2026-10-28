/**
 * RoadLevel local data-access layer (spec Part IV).
 *
 * The UI never touches IndexedDB directly; all access goes through this module.
 * Storage and dates rules:
 * - UUIDs for all ids
 * - integer millimetres for levels/distances
 * - ISO 8601 timestamps
 * - audit events for important changes
 * - versioned backup format
 *
 * Note (scope): field-book images and OCR extraction are a deferred milestone;
 * the stores exist so backups and schema remain forward-compatible.
 */
import type { DBSchema } from "idb";
import { openDB } from "idb";

import { CALCULATION_VERSION, SCHEMA_VERSION } from "../core/units";

export const DB_NAME = "roadlevel";
export const DB_VERSION = 1;

export type PointType = "BM" | "TBM" | "CP" | "beacon" | "ground" | "peg" | "other";
export type ReadingType = "BS" | "IS" | "FS";
export type PositionType = "centre" | "left" | "right" | "offset";

export interface RoadLevelDB extends DBSchema {
  projects: {
    key: string;
    value: {
      id: string; name: string; road_name: string | null; description: string | null;
      default_chainage_interval_mm: number; default_peg_allowance_mm: number | null;
      peg_mark_convention: "positive-upward" | "positive-downward";
      beacon_tolerance_mm: number | null; beacon_tolerance_source: string | null;
      default_level_unit: string; created_at: string; updated_at: string;
      schema_version: number; archived: boolean;
    };
  };
  alignments: {
    key: string;
    value: { id: string; project_id: string; name: string; start_chainage_mm: number | null; end_chainage_mm: number | null; description: string | null; created_at: string };
    indexes: { "by-project": string };
  };
  designLevels: {
    key: string;
    value: {
      id: string; project_id: string; alignment_id: string | null;
      chainage_mm: number; position_type: PositionType; offset_mm: number | null;
      design_rl_mm: number; revision: string | null; source_reference: string | null;
      created_at: string; updated_at: string;
    };
    indexes: { "by-project": string };
  };
  sessions: {
    key: string;
    value: { id: string; project_id: string; alignment_id: string | null; name: string; date_started: string; date_completed: string | null; notes: string | null; status: "open" | "completed" | "archived" };
    indexes: { "by-project": string };
  };
  points: {
    key: string;
    value: {
      id: string; project_id: string; alignment_id: string | null;
      point_code: string; point_type: PointType;
      chainage_mm: number | null; offset_mm: number | null; position_type: PositionType | null;
      known_rl_mm: number | null; known_rl_source: string | null;
      description: string | null; created_at: string; updated_at: string;
    };
    indexes: { "by-project": string; "by-code": string };
  };
  setups: {
    key: string;
    value: {
      id: string; session_id: string; setup_number: number;
      reference_point_id: string | null; reference_rl_mm: number | null;
      backsight_observation_id: string | null; hi_mm: number | null;
      status: "draft" | "complete" | "invalid"; notes: string | null;
      created_at: string; updated_at: string;
    };
    indexes: { "by-session": string };
  };
  observations: {
    key: string;
    value: {
      id: string; session_id: string; setup_id: string; point_id: string;
      reading_type: ReadingType; staff_reading_mm: number;
      sequence_number: number; source_type: "manual" | "imported" | "ocr";
      review_status: "confirmed" | "pending-review" | "rejected";
      remarks: string | null; created_at: string; updated_at: string;
    };
    indexes: { "by-session": string; "by-setup": string };
  };
  calculatedLevels: {
    key: string;
    value: {
      id: string; session_id: string; setup_id: string | null; point_id: string;
      source_observation_id: string | null; method: "HI/HOC" | "Rise and Fall";
      rl_mm: number | null; hi_mm: number | null;
      calculation_status: "complete" | "incomplete" | "invalid";
      calculation_version: string; input_snapshot: Record<string, unknown>;
      stale: boolean; calculated_at: string;
    };
    indexes: { "by-session": string; "by-point": string };
  };
  beaconChecks: {
    key: string;
    value: {
      id: string; project_id: string; beacon_point_id: string;
      calculated_level_id: string; known_rl_mm: number; calculated_rl_mm: number;
      difference_mm: number; tolerance_mm: number | null;
      status: "within-tolerance" | "outside-tolerance" | "not-configured" | "incomplete";
      checked_at: string; notes: string | null;
    };
    indexes: { "by-project": string };
  };
  dipping: {
    key: string;
    value: {
      id: string; project_id: string; alignment_id: string | null; session_id: string | null;
      chainage_mm: number; point_id: string | null; position_type: PositionType; offset_mm: number | null;
      target_mm: number; actual_mm: number; difference_mm: number;
      result_type: "cut" | "fill" | "zero"; correction_mm: number;
      target_source: "manual" | "imported" | "approved-calculation";
      calculation_version: string; measured_at: string; remarks: string | null;
    };
    indexes: { "by-project": string };
  };
  pegMarks: {
    key: string;
    value: {
      id: string; project_id: string; alignment_id: string | null; chainage_mm: number;
      peg_point_id: string; centre_design_level_id: string;
      centre_design_rl_mm: number; allowance_mm: number; adjusted_design_rl_mm: number;
      peg_rl_mm: number; mark_offset_mm: number;
      mark_direction: "upward" | "downward" | "zero";
      calculated_by_convention: string;
      calculation_version: string; calculated_at: string;
    };
    indexes: { "by-project": string };
  };
  fieldBookImages: {
    key: string;
    value: {
      id: string; project_id: string; session_id: string | null;
      image_blob: Blob; original_filename: string | null; captured_at: string;
      notes: string | null; review_status: "unprocessed" | "pending-review" | "reviewed";
    };
    indexes: { "by-project": string };
  };
  extractionRecords: {
    key: string;
    value: {
      id: string; image_id: string; extraction_engine: string;
      extracted_data: unknown; uncertainty_data: unknown;
      review_status: "pending" | "partially-reviewed" | "confirmed" | "rejected";
      reviewed_at: string | null; created_at: string;
    };
    indexes: { "by-image": string };
  };
  auditEvents: {
    key: string;
    value: {
      id: string; project_id: string; entity_type: string; entity_id: string;
      action: "created" | "edited" | "confirmed" | "recalculated" | "imported" | "deleted";
      previous_value: unknown; new_value: unknown;
      reason: string | null; occurred_at: string;
    };
    indexes: { "by-project": string };
  };
  appSettings: {
    key: string;
    value: { id: string; value: unknown; updated_at: string };
  };
}

let dbPromise: Promise<import("idb").IDBPDatabase<RoadLevelDB>> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<RoadLevelDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("projects")) {
          db.createObjectStore("projects", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("alignments"))
          db.createObjectStore("alignments", { keyPath: "id" }).createIndex("by-project", "project_id");
        if (!db.objectStoreNames.contains("designLevels"))
          db.createObjectStore("designLevels", { keyPath: "id" }).createIndex("by-project", "project_id");
        if (!db.objectStoreNames.contains("sessions"))
          db.createObjectStore("sessions", { keyPath: "id" }).createIndex("by-project", "project_id");
        if (!db.objectStoreNames.contains("points")) {
          const s = db.createObjectStore("points", { keyPath: "id" });
          s.createIndex("by-project", "project_id");
          s.createIndex("by-code", "point_code");
        }
        if (!db.objectStoreNames.contains("setups"))
          db.createObjectStore("setups", { keyPath: "id" }).createIndex("by-session", "session_id");
        if (!db.objectStoreNames.contains("observations")) {
          const s = db.createObjectStore("observations", { keyPath: "id" });
          s.createIndex("by-session", "session_id");
          s.createIndex("by-setup", "setup_id");
        }
        if (!db.objectStoreNames.contains("calculatedLevels")) {
          const s = db.createObjectStore("calculatedLevels", { keyPath: "id" });
          s.createIndex("by-session", "session_id");
          s.createIndex("by-point", "point_id");
        }
        if (!db.objectStoreNames.contains("beaconChecks"))
          db.createObjectStore("beaconChecks", { keyPath: "id" }).createIndex("by-project", "project_id");
        if (!db.objectStoreNames.contains("dipping"))
          db.createObjectStore("dipping", { keyPath: "id" }).createIndex("by-project", "project_id");
        if (!db.objectStoreNames.contains("pegMarks"))
          db.createObjectStore("pegMarks", { keyPath: "id" }).createIndex("by-project", "project_id");
        if (!db.objectStoreNames.contains("fieldBookImages"))
          db.createObjectStore("fieldBookImages", { keyPath: "id" }).createIndex("by-project", "project_id");
        if (!db.objectStoreNames.contains("extractionRecords"))
          db.createObjectStore("extractionRecords", { keyPath: "id" }).createIndex("by-image", "image_id");
        if (!db.objectStoreNames.contains("auditEvents"))
          db.createObjectStore("auditEvents", { keyPath: "id" }).createIndex("by-project", "project_id");
        if (!db.objectStoreNames.contains("appSettings"))
          db.createObjectStore("appSettings", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Audit-event helper: every important change gets a traceable event. */
export async function logAudit(
  projectId: string,
  entityType: string,
  entityId: string,
  action: import("./store").RoadLevelDB["auditEvents"]["value"]["action"],
  previousValue: unknown,
  newValue: unknown,
  reason: string | null = null,
) {
  const db = await getDb();
  const event = {
    id: uuid(), project_id: projectId, entity_type: entityType, entity_id: entityId,
    action, previous_value: previousValue, new_value: newValue,
    reason, occurred_at: nowIso(),
  };
  await db.put("auditEvents", event);
  return event;
}

export const BACKUP_FORMAT_VERSION = 1;

export type ProjectBackup = {
  format: "roadlevel-project-backup";
  format_version: number;
  schema_version: number;
  calculation_version: string;
  exported_at: string;
  project: RoadLevelDB["projects"]["value"];
  data: Record<string, unknown[]>;
  image_count: number;
};

const PROJECT_STORES = [
  "alignments", "designLevels", "sessions", "points", "setups", "observations",
  "calculatedLevels", "beaconChecks", "dipping", "pegMarks", "auditEvents",
] as const;

/** Export a complete, versioned project backup (spec §27). */
export async function exportProjectBackup(projectId: string): Promise<ProjectBackup> {
  const db = await getDb();
  const project = await db.get("projects", projectId);
  if (!project) throw new Error(`Project ${projectId} not found.`);
  const allSessions = await db.getAllFromIndex("sessions", "by-project");
  const projectSessions = new Set(allSessions.filter((s) => s.project_id === projectId).map((s) => s.id));
  const sessionScoped = new Set(["setups", "observations", "calculatedLevels"]);
  const data: Record<string, unknown[]> = {};
  let imageCount = 0;
  for (const storeName of PROJECT_STORES) {
    const rows = await db.getAll(storeName as "alignments");
    data[storeName] = rows.filter((r: { project_id?: string; session_id?: string }) =>
      sessionScoped.has(storeName)
        ? r.session_id !== undefined && projectSessions.has(r.session_id)
        : r.project_id === projectId,
    );
  }
  const images = await db.getAllFromIndex("fieldBookImages", "by-project");
  imageCount = images.filter((i) => i.project_id === projectId).length;
  return {
    format: "roadlevel-project-backup",
    format_version: BACKUP_FORMAT_VERSION,
    schema_version: SCHEMA_VERSION,
    calculation_version: CALCULATION_VERSION,
    exported_at: nowIso(),
    project,
    data,
    image_count: imageCount,
  };
}

export type RestorePreview = {
  valid: boolean;
  problems: string[];
  project_name: string;
  counts: Record<string, number>;
  warnings: string[];
};

/** Validate a backup file BEFORE restore, per spec §27. */
export function previewBackup(json: unknown): RestorePreview {
  const problems: string[] = [];
  const warnings: string[] = [];
  const b = json as ProjectBackup | null;
  if (!b || typeof b !== "object") { problems.push("The file does not contain a RoadLevel project backup."); return { valid: false, problems, project_name: "(unknown)", counts: {}, warnings }; }
  if (b.format !== "roadlevel-project-backup") problems.push(`Unrecognised backup format "${String(b.format)}".`);
  if (typeof b.format_version !== "number") problems.push("Backup format version is missing.");
  else if (b.format_version > BACKUP_FORMAT_VERSION) problems.push(`Backup format version ${b.format_version} is newer than this app supports (${BACKUP_FORMAT_VERSION}).`);
  if (!b.project?.name) problems.push("Backup contains no project name.");
  const counts: Record<string, number> = {};
  for (const [k, v] of Object.entries(b.data ?? {})) counts[k] = Array.isArray(v) ? v.length : 0;
  if (b.exported_at === undefined) problems.push("Backup exported_at timestamp missing.");
  if (b.project?.beacon_tolerance_mm == null) warnings.push("Backup has no configured beacon tolerance; beacon statuses will read 'not configured'.");
  if (b.project?.default_peg_allowance_mm == null) warnings.push("Backup has no peg-marking allowance; peg calculations will be blocked until it is configured.");
  return { valid: problems.length === 0, problems, project_name: b.project?.name ?? "(unknown)", counts, warnings };
}

/**
 * Restore a validated backup either as a new project (re-id'd) or replacing the
 * same project id after explicit confirmation. Never silently overwrites.
 */
export async function restoreBackup(
  json: unknown,
  mode: "as-new-project" | "replace-project",
): Promise<{ projectId: string; restoredName: string }> {
  const b = json as ProjectBackup;
  const p = previewBackup(b);
  if (!p.valid) throw new Error(`Backup is invalid: ${p.problems.join(" ")}`);
  const db = await getDb();
  // Restoring as-new keeps the original record ids but writes under a new
  // project id and a unique project name, so an existing project is never
  // silently overwritten (spec §27).
  const newId = mode === "as-new-project" ? uuid() : b.project.id;
  const name = mode === "as-new-project" ? await uniqueProjectName(b.project.name) : b.project.name;
  const project = { ...b.project, id: newId, name, updated_at: nowIso() };
  await db.put("projects", project);
  for (const storeName of PROJECT_STORES) {
    const rows = (b.data?.[storeName] ?? []) as Record<string, unknown>[];
    for (const row of rows) {
      await db.put(storeName as "alignments", { ...row } as never);
    }
  }
  await logAudit(newId, "project", newId, "created", null, project, `Restored from backup exported ${b.exported_at} (${mode}).`);
  return { projectId: newId, restoredName: name };
}

async function uniqueProjectName(base: string): Promise<string> {
  const db = await getDb();
  const all = await db.getAll("projects");
  const names = new Set(all.map((p) => p.name));
  if (!names.has(base)) return base;
  let i = 2;
  while (names.has(`${base} (restored ${i})`)) i++;
  return `${base} (restored ${i})`;
}

/** Duplicate design level detection (spec §16.3 / Test 28). */
export async function findDuplicateDesignLevels(
  projectId: string,
  chainageMm: number,
  positionType: PositionType,
  offsetMm: number | null,
  revision: string | null,
  excludeId?: string,
): Promise<boolean> {
  const db = await getDb();
  const rows = await db.getAllFromIndex("designLevels", "by-project");
  return rows.some((r) =>
    r.project_id === projectId && r.id !== excludeId &&
    r.chainage_mm === chainageMm && r.position_type === positionType &&
    r.offset_mm === offsetMm && (r.revision ?? "") === (revision ?? ""));
}

/** Sessions of a project (helper for other modules). */
export async function getSessionsFor(projectId: string) {
  const db = await getDb();
  return db.getAllFromIndex("sessions", "by-project").then((rows) => rows.filter((s) => s.project_id === projectId));
}
