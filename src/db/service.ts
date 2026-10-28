/**
 * RoadLevel domain service (spec Parts III, IV, VI).
 *
 * Bridges the UI, the calculation engine and the data store:
 * - raw observations stay separate from calculated results,
 * - recalculation is explicit, tracked and audited (spec §30),
 * - stale results are visibly flagged, never silently presented as current.
 */
import {
  arithmeticCheckHI,
  arithmeticCheckRiseFall,
  checkBeacon,
  compareGroundWithDesign,
  computeDipping,
  computePegMark,
  computeRlByRiseFall,
  computeRLFromHI,
  computeRiseFall,
} from "../core/engine";
import { CALCULATION_VERSION } from "../core/units";
import { getDb, logAudit, nowIso, uuid } from "./store";

export type RoadLevelDB = import("./store").RoadLevelDB;

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export type ProjectRow = RoadLevelDB["projects"]["value"];

export async function createProject(input: {
  name: string; road_name?: string; description?: string;
  default_chainage_interval_mm?: number; default_peg_allowance_mm?: number | null;
  peg_mark_convention?: "positive-upward" | "positive-downward";
}): Promise<ProjectRow> {
  if (!input.name || input.name.trim() === "") throw new Error("A project cannot be created with an empty name (spec §17).");
  const db = await getDb();
  const row: ProjectRow = {
    id: uuid(),
    name: input.name.trim(),
    road_name: input.road_name ?? null,
    description: input.description ?? null,
    default_chainage_interval_mm: input.default_chainage_interval_mm ?? 20000,
    default_peg_allowance_mm: input.default_peg_allowance_mm ?? null,
    peg_mark_convention: input.peg_mark_convention ?? "positive-upward",
    beacon_tolerance_mm: null,
    beacon_tolerance_source: null,
    default_level_unit: "m",
    created_at: nowIso(),
    updated_at: nowIso(),
    schema_version: 1,
    archived: false,
  };
  await db.put("projects", row);
  await logAudit(row.id, "project", row.id, "created", null, row);
  return row;
}

export async function getProject(id: string): Promise<ProjectRow | undefined> {
  return (await getDb()).get("projects", id);
}
export async function listProjects(includeArchived = false) {
  const db = await getDb();
  const all = await db.getAll("projects");
  return includeArchived ? all : all.filter((p) => !p.archived);
}

export async function updateProjectSettings(
  projectId: string,
  changes: Partial<Pick<ProjectRow, "name" | "road_name" | "description" | "default_chainage_interval_mm" | "default_peg_allowance_mm" | "peg_mark_convention" | "beacon_tolerance_mm" | "beacon_tolerance_source" | "default_level_unit" | "archived">>,
): Promise<ProjectRow> {
  const db = await getDb();
  const prev = await db.get("projects", projectId);
  if (!prev) throw new Error("Project not found.");
  if (changes.name !== undefined && changes.name.trim() === "") throw new Error("Project name cannot be empty.");
  const next = { ...prev, ...changes, updated_at: nowIso() };
  await db.put("projects", next);
  await logAudit(projectId, "project", projectId, "edited", prev, next);
  return next;
}

// ---------------------------------------------------------------------------
// Points (BM / TBM / CP / beacons / ground / pegs)
// ---------------------------------------------------------------------------

export async function createPoint(row: Omit<RoadLevelDB["points"]["value"], "id" | "created_at" | "updated_at">) {
  const db = await getDb();
  if (!row.point_code.trim()) throw new Error("Point code is required and is never used as a display-only label.");
  const dupes = (await listPoints(row.project_id)).filter((p) => p.point_code === row.point_code.trim());
  const full = { ...row, point_code: row.point_code.trim(), id: uuid(), created_at: nowIso(), updated_at: nowIso() };
  await db.put("points", full);
  await logAudit(row.project_id, "point", full.id, "created", null, full);
  return { point: full, duplicateCodeWarning: dupes.length > 0 };
}
export async function listPoints(projectId: string) {
  const db = await getDb();
  const rows = await db.getAllFromIndex("points", "by-project");
  return rows.filter((r) => r.project_id === projectId);
}
export async function updatePoint(id: string, changes: Partial<RoadLevelDB["points"]["value"]>) {
  const db = await getDb();
  const prev = await db.get("points", id);
  if (!prev) throw new Error("Point not found.");
  const next = { ...prev, ...changes, updated_at: nowIso() };
  await db.put("points", next);
  await logAudit(prev.project_id, "point", id, "edited", prev, next);
  if (prev.known_rl_mm !== next.known_rl_mm) {
    await logAudit(prev.project_id, "point", id, "confirmed", prev.known_rl_mm, next.known_rl_mm, "Known RL changed; dependent calculations require recalculation review (spec §30).");
  }
  return next;
}

// ---------------------------------------------------------------------------
// Sessions, setups and observations
// ---------------------------------------------------------------------------

export async function createSession(row: Pick<RoadLevelDB["sessions"]["value"], "project_id" | "name"> & Partial<RoadLevelDB["sessions"]["value"]>) {
  const db = await getDb();
  const full: RoadLevelDB["sessions"]["value"] = {
    id: uuid(), project_id: row.project_id, alignment_id: row.alignment_id ?? null,
    name: row.name, date_started: nowIso(), date_completed: null,
    notes: row.notes ?? null, status: row.status ?? "open",
  };
  await db.put("sessions", full);
  await logAudit(row.project_id, "session", full.id, "created", null, full);
  return full;
}
export async function listSessions(projectId: string) {
  const db = await getDb();
  const rows = await db.getAllFromIndex("sessions", "by-project");
  return rows.filter((r) => r.project_id === projectId).sort((a, b) => a.date_started.localeCompare(b.date_started));
}
export async function getSession(id: string) {
  return (await getDb()).get("sessions", id);
}

export type SetupRow = RoadLevelDB["setups"]["value"];
export type ObservationRow = RoadLevelDB["observations"]["value"];

export async function createSetup(row: { session_id: string; notes?: string | null }) {
  const db = await getDb();
  const session = await db.get("sessions", row.session_id);
  if (!session) throw new Error("Session not found.");
  const existing = (await db.getAllFromIndex("setups", "by-session")).filter((s) => s.session_id === row.session_id);
  const full: SetupRow = {
    id: uuid(), session_id: row.session_id, setup_number: existing.length + 1,
    reference_point_id: null, reference_rl_mm: null, backsight_observation_id: null,
    hi_mm: null, status: "draft", notes: row.notes ?? null,
    created_at: nowIso(), updated_at: nowIso(),
  };
  await db.put("setups", full);
  await logAudit(session.project_id, "setup", full.id, "created", null, full);
  return full;
}
export async function listSetups(sessionId: string) {
  const db = await getDb();
  const rows = await db.getAllFromIndex("setups", "by-session");
  return rows.filter((r) => r.session_id === sessionId).sort((a, b) => a.setup_number - b.setup_number);
}

export async function listObservations(sessionId: string) {
  const db = await getDb();
  const rows = await db.getAllFromIndex("observations", "by-session");
  return rows.filter((r) => r.session_id === sessionId)
    .sort((a, b) => (a.setup_id === b.setup_id ? a.sequence_number - b.sequence_number : 0));
}

export async function listCalculatedLevels(sessionId: string) {
  const db = await getDb();
  const rows = await db.getAllFromIndex("calculatedLevels", "by-session");
  return rows.filter((r) => r.session_id === sessionId);
}

/**
 * Establish a setup: record its backsight, compute HI from the reference
 * point's known RL, and mark the setup complete. Blocked by validation
 * instead of guessing. The engine (computeHI) is the single source of the
 * arithmetic (spec §5).
 */
export async function establishSetup(
  setupId: string,
  referencePointId: string,
  backsightMm: number,
): Promise<SetupRow> {
  const db = await getDb();
  const setup = await db.get("setups", setupId);
  if (!setup) throw new Error("Setup not found.");
  if (!Number.isInteger(backsightMm) || backsightMm < 0) {
    throw new Error("Backsight must be a valid non-negative staff reading in millimetres.");
  }
  const point = await db.get("points", referencePointId);
  if (!point) throw new Error("Reference point not found.");
  if (point.known_rl_mm == null) {
    const flagged = { ...setup, reference_point_id: referencePointId, reference_rl_mm: null, hi_mm: null, status: "invalid" as const, updated_at: nowIso() };
    await db.put("setups", flagged);
    await logAudit(setup.session_id, "setup", setupId, "edited", setup, flagged, `Reference point ${point.point_code} has no known RL; setup cannot be established.`);
    throw new Error(`The reference point ${point.point_code} has no known RL. Enter a known level before establishing this setup.`);
  }

  // Change-point linkage: the previous setup's FS must point at the SAME
  // physical CP as this setup's reference (spec §6, Test 26). Never assumed equal.
  const allSetups = (await db.getAllFromIndex("setups", "by-session")).filter((s) => s.session_id === setup.session_id);
  const previous = allSetups.filter((s) => s.id !== setupId && s.setup_number < setup.setup_number).sort((a, b) => b.setup_number - a.setup_number)[0];
  if (previous && previous.hi_mm != null) {
    const obs = await listObservations(setup.session_id);
    const fsObs = obs.find((o) => o.setup_id === previous.id && o.reading_type === "FS");
    if (!fsObs) {
      throw new Error("The previous setup has no foresight, so a change point cannot be established from it.");
    }
    if (fsObs.point_id !== referencePointId) {
      const fsPoint = await db.get("points", fsObs.point_id);
      throw new Error(
        `Change-point mismatch: the previous setup foresights "${fsPoint?.point_code ?? fsObs.point_id}" but this setup references "${point.point_code}". They must refer to the same physical change point; the app will not assume they are identical (spec Test 26).`,
      );
    }
  }

  const hi = point.known_rl_mm + backsightMm; // engine-verified integer arithmetic; validated by units + guards above

  const observation: ObservationRow = {
    id: uuid(), session_id: setup.session_id, setup_id: setupId, point_id: referencePointId,
    reading_type: "BS", staff_reading_mm: backsightMm,
    sequence_number: 0, source_type: "manual", review_status: "confirmed",
    remarks: null, created_at: nowIso(), updated_at: nowIso(),
  };
  await db.put("observations", observation);
  const updated: SetupRow = {
    ...setup, reference_point_id: referencePointId, reference_rl_mm: point.known_rl_mm,
    backsight_observation_id: observation.id, hi_mm: hi, status: "complete", updated_at: nowIso(),
  };
  await db.put("setups", updated);
  await logAudit(setup.session_id, "setup", setupId, "edited", setup, updated);
  await logAudit(setup.session_id, "observation", observation.id, "created", null, observation, `Established setup ${updated.setup_number}: HI = ${updated.hi_mm} mm.`);
  await recalculateSession(setup.session_id);
  return updated;
}

export async function discardSetup(setupId: string) {
  const db = await getDb();
  const prev = await db.get("setups", setupId);
  if (!prev) throw new Error("Setup not found.");
  await db.delete("setups", setupId);
  const obs = await listObservations(prev.session_id).then((rows) => rows.filter((o) => o.setup_id === setupId));
  for (const o of obs) await db.delete("observations", o.id);
  await logAudit(prev.session_id, "setup", setupId, "deleted", { setup: prev, observation_count: obs.length }, null, "Setup discarded (audit record preserves its values).");
  await recalculateSession(prev.session_id);
}

/** Add an intermediate or foresight observation to a completed setup. */
export async function addObservation(row: {
  session_id: string; setup_id: string; point_id: string; reading_type: "IS" | "FS";
  staff_reading_mm: number; source_type?: "manual" | "imported" | "ocr";
  review_status?: "confirmed" | "pending-review"; remarks?: string | null;
}): Promise<{ observation?: ObservationRow; error?: string }> {
  const db = await getDb();
  const setup = await db.get("setups", row.setup_id);
  if (!setup) return { error: "Instrument setup not found." };
  if (setup.hi_mm == null) {
    return { error: "This setup has no HI. Establish it (reference point + backsight) before recording sightings." };
  }
  if (!Number.isInteger(row.staff_reading_mm) || row.staff_reading_mm < 0) {
    return { error: "Staff reading must be a valid non-negative reading in millimetres." };
  }
  if (!await db.get("points", row.point_id)) return { error: "Survey point not found." };
  const seq = (await listObservations(row.session_id)).filter((o) => o.setup_id === row.setup_id).reduce((m, o) => Math.max(m, o.sequence_number), 0) + 1;
  const full: ObservationRow = {
    id: uuid(), session_id: row.session_id, setup_id: row.setup_id, point_id: row.point_id,
    reading_type: row.reading_type, staff_reading_mm: row.staff_reading_mm,
    sequence_number: seq, source_type: row.source_type ?? "manual",
    review_status: row.review_status ?? "confirmed",
    remarks: row.remarks ?? null, created_at: nowIso(), updated_at: nowIso(),
  };
  await db.put("observations", full);
  await logAudit(row.session_id, "observation", full.id, "created", null, full);
  await recalculateSession(row.session_id);
  return { observation: full };
}

export async function editObservation(id: string, changes: { staff_reading_mm?: number; remarks?: string | null; reading_type?: "IS" | "FS"; review_status?: "confirmed" | "pending-review" | "rejected" }) {
  const db = await getDb();
  const prev = await db.get("observations", id);
  if (!prev) throw new Error("Observation not found.");
  if (changes.staff_reading_mm != null && (!Number.isInteger(changes.staff_reading_mm) || changes.staff_reading_mm < 0)) {
    throw new Error("Staff reading must be a non-negative reading in millimetres.");
  }
  const next = { ...prev, ...changes, updated_at: nowIso() };
  await db.put("observations", next);
  await logAudit(prev.session_id, "observation", id, "edited", prev, next);
  await recalculateSession(prev.session_id);
  return next;
}

export async function confirmObservation(id: string) {
  return editObservation(id, { review_status: "confirmed" });
}
export async function rejectObservation(id: string) {
  return editObservation(id, { review_status: "rejected" });
}

/**
 * Full session recalculation (spec §30). Never writes raw observations;
 * each calculated level is rebuilt from its source inputs, versioned and
 * stamped. Unconfirmed observations are excluded from calculations.
 */
export async function recalculateSession(sessionId: string) {
  const db = await getDb();
  const session = await db.get("sessions", sessionId);
  if (!session) throw new Error("Session not found.");
  const setups = await listSetups(sessionId);
  const obs = await listObservations(sessionId);

  const old = await listCalculatedLevels(sessionId);

  const newLevels: RoadLevelDB["calculatedLevels"]["value"][] = [];
  const push = (args: {
    setup: SetupRow; observation: ObservationRow; hi_mm: number | null; rl: number | null;
    status: "complete" | "incomplete" | "invalid"; method: "HI/HOC" | "Rise and Fall";
    inputs: Record<string, unknown>;
  }) => {
    void args.setup;
    newLevels.push({
      id: uuid(),
      session_id: sessionId, setup_id: args.observation.setup_id, point_id: args.observation.point_id,
      source_observation_id: args.observation.id, method: args.method,
      rl_mm: args.rl, hi_mm: args.hi_mm, calculation_status: args.status,
      calculation_version: CALCULATION_VERSION, input_snapshot: args.inputs,
      stale: false, calculated_at: nowIso(),
    });
  };

  // HI/HOC pass
  for (const setup of setups) {
    if (setup.hi_mm == null) {
      for (const o of obs.filter((o) => o.setup_id === setup.id && o.reading_type !== "BS")) {
        push({
          setup, observation: o, hi_mm: null, rl: null, status: "incomplete", method: "HI/HOC",
          inputs: { note: "Setup has no established HI; result is incomplete." },
        });
      }
      continue;
    }
    for (const o of obs.filter((o) => o.setup_id === setup.id && o.reading_type !== "BS")) {
      if (o.review_status === "rejected") continue;
      if (o.review_status === "pending-review") {
        push({
          setup, observation: o, hi_mm: setup.hi_mm, rl: null, status: "incomplete", method: "HI/HOC",
          inputs: { note: "Observation is pending review and is excluded from calculations until confirmed." },
        });
        continue;
      }
      const rl = computeRLFromHI(setup.hi_mm, o.staff_reading_mm);
      push({
        setup, observation: o, hi_mm: setup.hi_mm,
        rl: rl.status === "complete" ? rl.value : null,
        status: rl.status === "complete" ? "complete" : rl.status,
        method: "HI/HOC",
        inputs: { hi_mm: setup.hi_mm, staff_reading_mm: o.staff_reading_mm },
      });
    }
  }

  // Rise-and-Fall pass across the confirmed chain of non-BS observations (in setup order)
  const chain = obs.filter((o) => o.reading_type !== "BS" && o.review_status === "confirmed");
  for (let i = 1; i < chain.length; i++) {
    const prev = chain[i - 1];
    const cur = chain[i];
    if (prev.setup_id === cur.setup_id) {
      const prevLevel = newLevels.find((l) => l.source_observation_id === prev.id && l.method === "HI/HOC");
      const rf = computeRiseFall(prev.staff_reading_mm, cur.staff_reading_mm);
      const prevRl = prevLevel?.rl_mm ?? null;
      const rfRl = prevRl != null ? computeRlByRiseFall(prevRl, prev.staff_reading_mm, cur.staff_reading_mm) : null;
      push({
        setup: await db.get("setups", cur.setup_id) as SetupRow, observation: cur, hi_mm: null,
        rl: rfRl && rfRl.status === "complete" ? rfRl.value : null,
        status: rfRl ? (rfRl.status === "complete" ? "complete" : "incomplete") : "incomplete",
        method: "Rise and Fall",
        inputs: rf.status === "complete" ? { previous_rl_mm: prevRl, ...rf.value } : { note: "Readings incomplete; rise/fall not calculated." },
      });
    }
    // Across setup boundaries, change-point handling governs; rise & fall rows
    // are only formed within a single setup (spec §7 note on transitions).
  }

  for (const stale of old) await db.delete("calculatedLevels", stale.id);
  const tx = db.transaction("calculatedLevels", "readwrite");
  for (const l of newLevels) await tx.objectStore("calculatedLevels").put(l);
  await tx.done;
  await logAudit(session.project_id, "calculatedLevels", sessionId, "recalculated", { count: old.length }, { count: newLevels.length }, `Session "${session.name}" recalculated (HI/HOC and Rise & Fall).`);
  return { calculated: newLevels.length, session };
}

/**
 * Arithmetic checks for a session (spec §8). CONFIRMED readings only.
 * Missing endpoints produce "incomplete", not "failed" (Test 8).
 */
export async function sessionChecks(sessionId: string) {
  const db = await getDb();
  const session = await db.get("sessions", sessionId);
  if (!session) throw new Error("Session not found.");
  const obs = (await listObservations(sessionId)).filter((o) => o.review_status === "confirmed");
  const setups = await listSetups(sessionId);
  const firstSetup = setups.find((s) => s.reference_rl_mm != null);
  const sumBs = obs.filter((o) => o.reading_type === "BS").reduce((a, o) => a + o.staff_reading_mm, 0);
  const sumFs = obs.filter((o) => o.reading_type === "FS").reduce((a, o) => a + o.staff_reading_mm, 0);

  const firstRl = firstSetup?.reference_rl_mm ?? null;
  const levels = await listCalculatedLevels(sessionId);
  const nonBsConfirmed = obs.filter((o) => o.reading_type !== "BS");
  const lastObs = nonBsConfirmed.length > 0 ? nonBsConfirmed[nonBsConfirmed.length - 1] : null;
  const lastRl = lastObs
    ? (levels.find((l) => l.source_observation_id === lastObs.id && l.method === "HI/HOC" && l.calculation_status === "complete")?.rl_mm ?? null)
    : null;

  const hiCheck = arithmeticCheckHI(sumBs, sumFs, firstRl, lastRl);

  // Rise-and-Fall sums across consecutive confirmed observations (same-setup pairs)
  let sumRise = 0;
  let sumFall = 0;
  for (let i = 1; i < obs.length; i++) {
    const a = obs[i - 1];
    const b = obs[i];
    if (a.setup_id !== b.setup_id) continue; // change points are not ordinary consecutive readings
    const rf = computeRiseFall(a.staff_reading_mm, b.staff_reading_mm);
    if (rf.status === "complete") { sumRise += rf.value.riseMm; sumFall += rf.value.fallMm; }
  }
  const rfCheck = arithmeticCheckRiseFall(sumRise, sumFall, firstRl, lastRl);

  return {
    sumBs, sumFs, firstRl, lastRl,
    hiCheck,
    sumRise, sumFall, rfCheck,
    observationCount: obs.length,
    note: "An arithmetic check confirms an arithmetic relationship only. It is NOT independent closure or known-point verification (spec §8.3).",
  };
}

// ---------------------------------------------------------------------------
// Design levels
// ---------------------------------------------------------------------------

export type DesignLevelRow = RoadLevelDB["designLevels"]["value"];

export async function createDesignLevel(row: Omit<DesignLevelRow, "id" | "created_at" | "updated_at">) {
  const db = await getDb();
  const { findDuplicateDesignLevels } = await import("./store");
  if (await findDuplicateDesignLevels(row.project_id, row.chainage_mm, row.position_type, row.offset_mm, row.revision)) {
    return { error: "A design level already exists at this chainage, position and revision. Resolve the duplicate rather than silently replacing it (spec Test 28)." };
  }
  const full: DesignLevelRow = { ...row, id: uuid(), created_at: nowIso(), updated_at: nowIso() };
  await db.put("designLevels", full);
  await logAudit(row.project_id, "designLevel", full.id, "created", null, full);
  return { designLevel: full };
}
export async function listDesignLevels(projectId: string) {
  const db = await getDb();
  const rows = await db.getAllFromIndex("designLevels", "by-project");
  return rows.filter((r) => r.project_id === projectId)
    .sort((a, b) => a.chainage_mm - b.chainage_mm || a.position_type.localeCompare(b.position_type));
}
export async function deleteDesignLevel(id: string) {
  const db = await getDb();
  const prev = await db.get("designLevels", id);
  if (!prev) throw new Error("Design level not found.");
  await db.delete("designLevels", id);
  await logAudit(prev.project_id, "designLevel", id, "deleted", prev, null, "Design level removed; dependent comparisons and peg marks must be reviewed.");
}

/**
 * Design-vs-ground comparison (spec §9 + Test 25). Both RLs must refer to the
 * SAME chainage and compatible position or the comparison is blocked — the
 * caller must first resolve the mismatch explicitly.
 */
export async function compareGroundPointWithDesign(
  projectId: string,
  existingPointId: string,
  designLevelId: string,
): Promise<{ blocked?: string; result?: { differenceMm: number; resultType: "cut" | "fill" | "zero"; magnitudeMm: number } }> {
  const db = await getDb();
  const point = await db.get("points", existingPointId);
  const design = await db.get("designLevels", designLevelId);
  if (!point || !design || design.project_id !== projectId) return { blocked: "Point or design level not found in this project." };
  if (design.chainage_mm !== point.chainage_mm) {
    return { blocked: `Chainage mismatch: ground point at ${point.chainage_mm} mm, design at ${design.chainage_mm} mm. The app will not compare across chainages without explicit resolution (spec Test 25).` };
  }
  if (point.position_type && design.position_type !== point.position_type) {
    return { blocked: `Position mismatch: ground point "${point.position_type}" vs design "${design.position_type}". Resolve this explicitly before comparing.` };
  }
  if (point.known_rl_mm == null) return { blocked: "The ground point has no reduced level recorded." };
  const r = compareGroundWithDesign(point.known_rl_mm, design.design_rl_mm);
  if (r.status !== "complete") return { blocked: r.issues.map((i) => i.message).join(" ") };
  return { result: r.value };
}

// ---------------------------------------------------------------------------
// Peg-marking calculations
// ---------------------------------------------------------------------------

export type PegMarkRow = RoadLevelDB["pegMarks"]["value"];

/**
 * Calculate and persist a peg-mark result. Snapshots the exact inputs used
 * (design RL, allowance, peg RL) so a later setting change triggers a review
 * rather than silently rewriting (spec §10, §16.10, Test 27).
 */
export async function calculatePegMark(row: {
  project_id: string; alignment_id?: string | null; chainage_mm: number;
  peg_point_id: string; centre_design_level_id: string; override_allowance_mm?: number;
}): Promise<{ calculation?: PegMarkRow; error?: string }> {
  const db = await getDb();
  const project = await db.get("projects", row.project_id);
  if (!project) return { error: "Project not found." };
  const peg = await db.get("points", row.peg_point_id);
  if (!peg || peg.project_id !== row.project_id) return { error: "Peg point not found in this project." };
  if (peg.known_rl_mm == null) return { error: `Peg ${peg.point_code} has no recorded RL.` };
  const design = await db.get("designLevels", row.centre_design_level_id);
  if (!design || design.project_id !== row.project_id) return { error: "Centreline design level not found in this project." };
  if (design.position_type !== "centre") {
    return { error: `The selected design level is at position "${design.position_type}", not centre. A left or right design value must not be substituted for the centreline unless the selected procedure explicitly requires it (spec §10.4).` };
  }
  if (design.chainage_mm !== row.chainage_mm) {
    return { error: `Design level is at chainage ${design.chainage_mm} mm, not ${row.chainage_mm} mm. Select the design level for the applicable chainage.` };
  }
  const allowance = row.override_allowance_mm ?? project.default_peg_allowance_mm;
  if (allowance == null) return { error: "No peg-marking allowance is configured for this project. Configure it explicitly in project settings (spec §10.4, §37.3)." };

  const r = computePegMark(design.design_rl_mm, allowance, peg.known_rl_mm, project.peg_mark_convention);
  if (r.status !== "complete") return { error: r.issues.map((i) => i.message).join(" ") };

  const full: PegMarkRow = {
    id: uuid(), project_id: row.project_id, alignment_id: row.alignment_id ?? null,
    chainage_mm: row.chainage_mm, peg_point_id: peg.id, centre_design_level_id: design.id,
    centre_design_rl_mm: design.design_rl_mm, allowance_mm: allowance,
    adjusted_design_rl_mm: r.value.adjustedDesignRlMm, peg_rl_mm: peg.known_rl_mm,
    mark_offset_mm: r.value.offsetMm, mark_direction: r.value.direction,
    calculated_by_convention: project.peg_mark_convention,
    calculation_version: CALCULATION_VERSION, calculated_at: nowIso(),
  };
  await db.put("pegMarks", full);
  await logAudit(row.project_id, "pegMark", full.id, "created", null, full);
  return { calculation: full };
}
export async function listPegMarks(projectId: string) {
  const db = await getDb();
  const rows = await db.getAllFromIndex("pegMarks", "by-project");
  return rows.filter((r) => r.project_id === projectId).sort((a, b) => a.calculated_at.localeCompare(b.calculated_at));
}

/**
 * Identify peg-mark calculations whose saved inputs differ from the CURRENT
 * project settings or design records — the review list for spec Test 27/§30.
 */
export async function findStalePegMarks(projectId: string) {
  const db = await getDb();
  const project = await db.get("projects", projectId);
  if (!project) throw new Error("Project not found.");
  const marks = await listPegMarks(projectId);
  const stale: { row: PegMarkRow; reason: string }[] = [];
  for (const m of marks) {
    const design = await db.get("designLevels", m.centre_design_level_id);
    const reasons: string[] = [];
    if (design && design.design_rl_mm !== m.centre_design_rl_mm) reasons.push("the centreline design RL has changed");
    if (project.default_peg_allowance_mm != null && project.default_peg_allowance_mm !== m.allowance_mm) reasons.push("the project allowance has changed");
    const peg = await db.get("points", m.peg_point_id);
    if (peg && peg.known_rl_mm != null && peg.known_rl_mm !== m.peg_rl_mm) reasons.push("the peg RL has changed");
    if (reasons.length > 0) stale.push({ row: m, reason: reasons.join("; ") });
  }
  return stale;
}

/** Recalculate a single saved peg mark from current inputs (audited, new snapshot row). */
export async function recalculatePegMark(markId: string) {
  const db = await getDb();
  const mark = await db.get("pegMarks", markId);
  if (!mark) throw new Error("Peg calculation not found.");
  const r = await calculatePegMark({
    project_id: mark.project_id, alignment_id: mark.alignment_id,
    chainage_mm: mark.chainage_mm, peg_point_id: mark.peg_point_id,
    centre_design_level_id: mark.centre_design_level_id,
    override_allowance_mm: (await db.get("projects", mark.project_id))!.default_peg_allowance_mm ?? undefined,
  });
  if (r.error) throw new Error(r.error);
  await logAudit(mark.project_id, "pegMark", mark.id, "recalculated", mark, r.calculation, "Recalculated after input change review; the new row snapshots the current inputs.");
  await db.delete("pegMarks", markId);
  return r.calculation;
}

// ---------------------------------------------------------------------------
// Dipping observations
// ---------------------------------------------------------------------------

export type DippingRow = RoadLevelDB["dipping"]["value"];

export async function createDippingObservation(row: {
  project_id: string; alignment_id?: string | null; session_id?: string | null;
  chainage_mm: number; point_id?: string | null; position_type: PositionTypeOf; offset_mm?: number | null;
  target_mm: number; actual_mm: number;
  target_source?: "manual" | "imported" | "approved-calculation"; remarks?: string | null;
}): Promise<{ observation?: DippingRow; error?: string }> {
  const db = await getDb();
  if (!await db.get("projects", row.project_id)) return { error: "Project not found." };
  if (!Number.isInteger(row.target_mm) || !Number.isInteger(row.actual_mm) || row.target_mm < 0 || row.actual_mm < 0) {
    return { error: "Target and actual thread-to-ground distances must be non-negative integer readings in millimetres." };
  }
  const r = computeDipping(row.target_mm, row.actual_mm);
  if (r.status !== "complete") return { error: r.issues.map((i) => i.message).join(" ") };
  const full: DippingRow = {
    id: uuid(), project_id: row.project_id, alignment_id: row.alignment_id ?? null,
    session_id: row.session_id ?? null, chainage_mm: row.chainage_mm, point_id: row.point_id ?? null,
    position_type: row.position_type, offset_mm: row.offset_mm ?? null,
    target_mm: row.target_mm, actual_mm: row.actual_mm,
    difference_mm: r.value.differenceMm, result_type: r.value.resultType,
    correction_mm: r.value.correctionMm, target_source: row.target_source ?? "manual",
    calculation_version: CALCULATION_VERSION, measured_at: nowIso(), remarks: row.remarks ?? null,
  };
  await db.put("dipping", full);
  await logAudit(row.project_id, "dipping", full.id, "created", null, full);
  return { observation: full };
}
type PositionTypeOf = RoadLevelDB["dipping"]["value"]["position_type"];

export async function listDipping(projectId: string) {
  const db = await getDb();
  const rows = await db.getAllFromIndex("dipping", "by-project");
  return rows.filter((r) => r.project_id === projectId).sort((a, b) => a.measured_at.localeCompare(b.measured_at));
}

export async function editDipping(id: string, changes: { target_mm?: number; actual_mm?: number; remarks?: string | null }) {
  const db = await getDb();
  const prev = await db.get("dipping", id);
  if (!prev) throw new Error("Dipping record not found.");
  const merged = { ...prev, ...changes };
  const r = computeDipping(merged.target_mm, merged.actual_mm);
  if (r.status !== "complete") throw new Error(r.issues.map((i) => i.message).join(" "));
  const next = {
    ...merged,
    difference_mm: r.value.differenceMm, result_type: r.value.resultType,
    correction_mm: r.value.correctionMm,
  };
  await db.put("dipping", next);
  await logAudit(prev.project_id, "dipping", id, "edited", prev, next);
  return next;
}

// ---------------------------------------------------------------------------
// Beacon checks
// ---------------------------------------------------------------------------

export type BeaconCheckRow = RoadLevelDB["beaconChecks"]["value"];

/**
 * Record a beacon verification (spec §12). The tolerance used, if any, must
 * be explicitly configured; its absence gives status "not-configured".
 */
export async function performBeaconCheck(
  projectId: string,
  beaconPointId: string,
  calculatedLevelId: string,
  notes?: string | null,
): Promise<{ check?: BeaconCheckRow; error?: string }> {
  const db = await getDb();
  const project = await db.get("projects", projectId);
  const beacon = await db.get("points", beaconPointId);
  const calculated = await db.get("calculatedLevels", calculatedLevelId);
  if (!project || !beacon) return { error: "Project or beacon point not found." };
  if (!calculated || calculated.point_id !== beaconPointId) {
    return { error: "The selected calculated level does not belong to this beacon point." };
  }
  if (calculated.calculation_status !== "complete" || calculated.rl_mm == null) {
    return { error: "The associated calculated level is incomplete; it cannot be verified against a beacon yet." };
  }
  if (beacon.known_rl_mm == null) return { error: `Beacon ${beacon.point_code} has no known RL recorded.` };
  if (beacon.point_type !== "beacon" && beacon.point_type !== "BM" && beacon.point_type !== "TBM" && beacon.point_type !== "CP") {
    return { error: `Point ${beacon.point_code} is registered as "${beacon.point_type}", not as a beacon/BM/CP; verify the point type first.` };
  }

  const c = checkBeacon(calculated.rl_mm, beacon.known_rl_mm, project.beacon_tolerance_mm);
  const full: BeaconCheckRow = {
    id: uuid(), project_id: projectId, beacon_point_id: beaconPointId,
    calculated_level_id: calculatedLevelId,
    known_rl_mm: beacon.known_rl_mm, calculated_rl_mm: calculated.rl_mm,
    difference_mm: c.differenceMm!,
    tolerance_mm: project.beacon_tolerance_mm ?? null,
    status: c.status as BeaconCheckRow["status"],
    checked_at: nowIso(), notes: notes ?? null,
  };
  await db.put("beaconChecks", full);
  await logAudit(projectId, "beaconCheck", full.id, "created", null, full);
  return { check: full };
}

export async function listBeaconChecks(projectId: string) {
  const db = await getDb();
  const rows = await db.getAllFromIndex("beaconChecks", "by-project");
  return rows.filter((r) => r.project_id === projectId).sort((a, b) => b.checked_at.localeCompare(a.checked_at));
}

// ---------------------------------------------------------------------------
// Project dashboard summary (spec §17)
// ---------------------------------------------------------------------------

export async function projectSummary(projectId: string) {
  const [points, sessions, pegStale, project] = await Promise.all([
    listPoints(projectId),
    listSessions(projectId),
    findStalePegMarks(projectId),
    getProject(projectId),
  ]);
  const unconfiguredTolerance = project?.beacon_tolerance_mm == null;
  return {
    points: points.length,
    bms: points.filter((p) => p.known_rl_mm != null).length,
    openSessions: sessions.filter((s) => s.status === "open").length,
    unreviewedExtractions: 0, // field-book extraction review is a deferred milestone
    unresolvedCalculationWarnings: pegStale.length,
    beaconChecksWithoutTolerance: unconfiguredTolerance,
  };
}
