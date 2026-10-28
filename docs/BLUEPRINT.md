# ROADLEVEL — Implementation Plan and DEVELOPMENT BLUEPRINT

**Document status:** Draft for technical implementation
**Working name:** RoadLevel
**Primary platform:** Android smartphone
**Secondary platform:** Laptop/desktop browser
**Operating mode:** Offline-first

---

# PART I — PRODUCT DEFINITION

## 1. Product vision

RoadLevel is an offline-first digital field assistant designed around practical
road construction surveying. It replaces repetitive manual calculations and
helps digitise the paper field book without removing the surveyor's control
over observations.

Two related workflows:

1. **Ground-level surveying** — record dumpy-level observations, calculate
   reduced levels, manage instrument setups, check benchmarks.
2. **Road dipping and peg setting-out** — compare design levels with peg
   levels, calculate marking offsets, record thread-to-ground distances,
   determine cut/fill corrections.

## 2. Core principles

- **Accuracy first** — explicit formulas, verified units.
- **Offline first** — core operations work with no connectivity.
- **No silent guessing** — missing or uncertain observations stay missing.
- **Traceability** — every result traces back to source observations.
- **Separation of concerns** — raw observations, calculated RLs, design values,
  peg-marking offsets and dipping corrections stay distinct.
- **Configurable site procedures** — allowances, targets, tolerances and
  chainage intervals are project settings, never universal surveying law.
- **Human confirmation** — OCR-extracted readings require review.
- **Recoverability** — export, backup, restore.
- **Practical usability** — fast on a smartphone at a construction site.

## 3. Initial release scope

### Included

Project management; digital field book; height-of-instrument/HOC
calculations; rise & fall; multiple instrument setups; BM/TBM/CP/road-beacon
records; chainage and offset management; design-level entry and import;
existing-ground vs design comparison; peg-marking with configurable allowance;
dipping targets and actual measurements; cut/fill/zero corrections; local
storage and offline operation; CSV import/export; validation warnings; basic
reports; project backup and restore.

### Deferred

Automatic crossfall-target derivation; advanced handwriting recognition;
earthwork volumes; cloud sync; multi-user collaboration; automatic design-data
fetching; advanced visualisation.

---

# PART II — NUMERICAL AND UNIT CONVENTIONS

## 4. Internal unit standard

**Integer millimetres** for every principal quantity.

### 4.1 Reduced levels and differences

- `1830009` means 1,830.009 m; RL(m) = RL(mm)/1000; RL(mm) = RL(m)×1000.
- Conversion at the boundary must check millimetre representability — never
  silently discard meaningful precision.

### 4.2 Staff readings — integer millimetres where precision permits.

### 4.3 Dipping distances — integer millimetres (22 cm = 220 mm, etc.).

### 4.4 Configured allowances — integer millimetres; current site example +300 mm.

### 4.5 Why integers matter

Reduces floating-point rounding issues and makes results easy to test. UI
always shows the unit and distinguishes metres / centimetres / millimetres.

---

# PART III — EXACT CALCULATION SPECIFICATION

## 5. Height of Instrument method

```
HI = RL_reference + BS
RL_point = HI − staffing reading
HI_mm = RL_reference_mm + BS_mm
RL_point_mm = HI_mm − reading_mm
```

Validation: valid reference RL required; BS required for HI; staffing reading
valid and non-negative; missing inputs ⇒ RL not presented as complete;
calculated RL retains links to setup and observation; HI never carried into a
new setup unless explicitly established.

## 6. Change-point and multiple-setup handling

```
HI_1 = RL_BM + BS_1
RL_CP = HI_1 − FS_CP
HI_2 = RL_CP + BS_2        (new instrument position)
RL_point = HI_2 − reading
```

Same physical CP must be identifiable across FS (previous setup) and BS (next
setup); flag otherwise. Never use the previous setup's HI after a move.

## 7. Rise and Fall method

```
Δ = reading_previous − reading_current
Rise = max(Δ, 0);  Fall = max(−Δ, 0)
RL_current = RL_previous + Rise − Fall
```

Setup transitions are not ordinary consecutive ground points; validate them
through the change-point rules.

## 8. Levelling arithmetic checks

- **HOC:** ΣBS − ΣFS = RL_last − RL_first
- **Rise & Fall:** ΣRise − ΣFall = RL_last − RL_first
- Discrepancy `E_arith` must be exactly 0 mm for a pass, with all required
  records complete; incomplete runs are marked "incomplete", never passed.
- **Arithmetic pass ≠ independent verification.** These are surfaced as
  separate statuses throughout the app.

## 9. Existing ground vs design level

```
D = RL_existing − RL_design
D > 0 → Cut = D;   D < 0 → Fill = −D;   D = 0 → zero
```

Both RLs must share chainage, position, offset convention and datum; mismatch
must block final comparison pending explicit user resolution.

## 10. Peg-marking calculation

With `RL_C` = centreline design RL, `A` = allowance, `RL_P` = peg RL:

```
RL_A = RL_C + A
M    = RL_A − RL_P
```

Current site convention: `M > 0` mark **upward** from peg top by M mm; `M < 0`
mark **downward** by |M|; convention stored per project.

Confirmed example: RL_C = 1,829,764 mm, A = +300 mm → RL_A = 1,830,064 mm;
left peg RL 1,830,009 → **+55 mm upward**; right peg RL 1,830,045 →
**+19 mm upward**. Exact values retained; any rounded ruler mark is a separate
clearly-labelled display value, never the stored result. Centreline design
level must be unambiguous or the calculation is blocked.

## 11. Dipping correction

Thread-to-ground convention:

```
D = A_actual − T_target
D > 0 → Fill = D;   D < 0 → Cut = −D;   D = 0 → zero correction
```

Examples: 420 vs 380 ⇒ Fill 40 mm; 320 vs 380 ⇒ Cut 60 mm; 300 vs 300 ⇒
zero. Same rule across 220/240/300/380/420 targets. **Never substitute the
existing-ground-vs-design formula here.**

## 12. Beacon verification

```
E_beacon = RL_calculated − RL_known
```

With an explicitly configured tolerance τ: within tolerance if |E| ≤ τ, else
outside. Without one: show the difference, label status **Not configured** —
never assume ±10 mm. Tolerance and its source are stored with project settings.

## 13. Crossfall and target distances

Initial release: targets entered manually or imported from a design schedule.
No crossfall derivation until percentage-vs-ratio, rising/falling side,
reference level/position and camber/superelevation rules are agreed.

---

# PART IV — DATABASE DESIGN

## 14. Storage decision

Installable offline-first **PWA + IndexedDB** for the Android-focused first
release; relational-in-concept schema so a later SQLite migration stays
possible. Core calculations require no server.

Rules: stable UUIDs; raw observations separate from calculated results;
integer millimetres; ISO 8601 timestamps; explicit settings; calculation/schema
-version stamps on saved results; original scanned images retained; audit
trail; versioned backups; labels never used as sole identifiers.

## 15. Entities

Project, Alignment, DesignLevel, SurveySession, InstrumentSetup, SurveyPoint,
Observation, CalculatedLevel, BeaconCheck, DippingObservation,
PegMarkCalculation, FieldBookImage, ExtractionRecord, AuditEvent, AppSettings,
with the relationships described in the full specification (one project → many
alignments/sessions; session → setups → observations; observation → point +
setup; calculated level → observation + inputs; etc.).

## 16. Detailed logical schema (field-level)

- **Project** — id, name, road_name, description, default_chainage_interval_mm,
  default_peg_allowance_mm, default_level_unit, peg_mark_convention,
  beacon_tolerance_mm (nullable), beacon_tolerance_source, created_at,
  updated_at, schema_version, archived.
- **Alignment** — id, project_id, name, start/end_chainage_mm, description.
- **DesignLevel** — id, project_id, alignment_id, chainage_mm, position_type,
  offset_mm, design_rl_mm, revision, source_reference, timestamps. Duplicate
  chainage+position+revision flagged, never silently replaced.
- **SurveySession** — id, project_id, alignment_id, name, date_started,
  date_completed, notes, status(open/completed/archived).
- **SurveyPoint** — id, project_id, alignment_id, point_code, point_type
  (BM/TBM/CP/beacon/ground/peg/other), chainage_mm, offset_mm, position_type,
  known_rl_mm, known_rl_source, description, timestamps.
- **InstrumentSetup** — id, session_id, setup_number, reference_point_id,
  reference_rl_mm (snapshot), backsight_observation_id, hi_mm,
  status(draft/complete/invalid), notes, timestamps. Snapshot makes results
  reproducible; changed known RL flags affected calculations for review.
- **Observation** — id, session_id, setup_id, point_id, reading_type
  (BS/IS/FS), staff_reading_mm, sequence_number, source_type
  (manual/imported/OCR), review_status(confirmed/pending/rejected), remarks,
  timestamps. OCR observations cannot be confirmed until reviewed.
- **CalculatedLevel** — id, session_id, setup_id, point_id,
  source_observation_id, method (HI/HOC or Rise&Fall), rl_mm, hi_mm,
  calculation_status, calculation_version, input_snapshot, calculated_at.
- **BeaconCheck** — id, project_id, beacon_point_id, calculated_level_id,
  known_rl_mm, calculated_rl_mm (snapshots), difference_mm, tolerance_mm,
  status, checked_at, notes.
- **PegMarkCalculation** — id, project_id, alignment_id, chainage_mm,
  peg_point_id, centre_design_level_id, centre_design_rl_mm, allowance_mm,
  adjusted_design_rl_mm, peg_rl_mm, mark_offset_mm, mark_direction
  (up/down/zero), calculation_version, calculated_at. Snapshots drive
  recalculation review when design RL or allowance changes.
- **DippingObservation** — id, project_id, alignment_id, session_id,
  chainage_mm, point_id, position_type, offset_mm, target_mm, actual_mm,
  difference_mm, result_type(cut/fill/zero), correction_mm, target_source,
  calculation_version, measured_at, remarks. Target and actual stored
  separately; difference/result are derived and recalculable.
- **FieldBookImage** — id, project_id, session_id, image_blob,
  original_filename, captured_at, notes, review_status.
- **ExtractionRecord** — id, image_id, extraction_engine, extracted_data,
  uncertainty_data, review_status, reviewed_at, created_at. Revisions never
  overwrite the original image or prior review decisions.
- **AuditEvent** — id, project_id, entity_type, entity_id, action
  (created/edited/confirmed/recalculated/imported/deleted), previous_value,
  new_value, reason, occurred_at.
- **AppSettings** — id (settings key), value, updated_at. App-level display
  preferences only; project calculations use project settings.

---

# PART V — IMPLEMENTATION PLAN

## 17. Build order (milestones)

1. **Calculation engine** — pure HI/HOC, rise & fall, arithmetic checks, peg
   marking, dipping, ground-vs-design, beacon difference; automated tests
   first, expected values fixed before implementation.
2. **Local project + field book UI** — projects, IndexedDB, points, setups,
   observation entry, calculated RL display, audit.
3. **Design levels and setting-out** — design records, chainage management,
   peg screen, dipping screen, per-project settings, basic reports.
4. **Import/export and backup** — CSV, versioned backup, restore preview with
   validation, never-silent-overwrite naming.
5. **Beacons and verification** — known-point register, beacon checks,
   configurable tolerance, verification reports.
6. **Field-book photography** — capture, retention, extraction preview,
   review/correction, audit trail (basic capture may precede recognition).
7. **Field testing** — real field-book pages, actual chainages, independently
   checked calculations; resolve usability before expanding scope.

## 18. Acceptance criteria for first release

Specified calculation tests pass; engine is network-free; multiple setups
correct; raw/calc separation; confirmed signed peg convention; confirmed
dipping rule; missing data never becomes zero; unconfigured tolerance never
treated as confirmed; OCR uncertainty requires review (when built); data
survives restart; backup/restore on target device; CSV round trip preserves
values/units; arithmetic ≠ independent verification visible in UI; tested on
the intended Android phone; known limitations documented before field use.

## 19. Governance

Maintain a build journal (architecture decisions, formulas, schema changes,
test results, bugs/fixes, offline behaviour, device compatibility, postponed
features, known limitations, reasons). Every milestone has explicit
acceptance criteria; do not mark a milestone done because the UI renders.
Test incrementally on the intended Android device.

---

# PART VII — KEY TEST CASES (specification of record)

**Core (expected values fixed in advance):**

1. HI: RL 100,000 + BS 1,250 ⇒ HI 101,250; IS 1,875 ⇒ RL 99,375 mm.
2. FS to CP: HI 101,250 − FS 2,000 ⇒ CP RL 99,250 mm.
3. New setup: CP 99,250 + BS 1,500 ⇒ HI 100,750 (old HI never reused).
4. Rise: 1,800 → 1,500 ⇒ rise 300; RL 100,000 → 100,300.
5. Fall: 1,500 → 1,900 ⇒ fall 400; RL 100,300 → 99,900.
6. Arithmetic check passes: ΣBS 3,500 − ΣFS 2,000 = 1,500 = ΔRL.
7. Arithmetic check fails (last RL 101,400): discrepancy 100 mm, Failed. No
   silent RL adjustment.
8. Incomplete run ⇒ arithmetic check Incomplete; no independent-verification
   claim; missing input identified.
9. Peg left: RL_C 1,829,764 + 300, peg 1,830,009 ⇒ +55 mm upward.
10. Peg right: ⇒ +19 mm upward.
11. Peg negative: adjusted 1,830,000, peg 1,830,060 ⇒ −60 mm downward.
12. Peg zero: adjusted = peg ⇒ 0, direction zero, no invented offset.
13. Dipping fill: 420 vs 380 ⇒ +40, Fill 40 mm.
14. Dipping cut: 320 vs 380 ⇒ −60, Cut 60 mm.
15. Dipping zero: 300 vs 300 ⇒ zero.
16. Dipping other target: 240 vs 220 ⇒ +20, Fill 20 mm.
17. Ground above design: 1,830,050 vs 1,830,000 ⇒ Cut 50 mm.
18. Ground below design: 1,829,950 vs 1,830,000 ⇒ Fill 50 mm.
19. Beacon within configured 10 mm: +8 ⇒ within.
20. Beacon outside configured 10 mm: +12 ⇒ outside.
21. Beacon tolerance not configured: difference shown, status "Not configured".

**Data-integrity/workflow:** missing observation ⇒ incomplete with missing
field named (22); unreviewed OCR unusable as confirmed (23); OCR corrections
retain image and audit (24); design mismatch blocks comparison (25); CP
mismatch warns, never assumes (26); setting change ⇒ recalculation review with
traceability (27); duplicate design row flagged (28); backup/restore preserves
records (29); offline operation after install (30); data survives browser
restart (31); CSV round trip preserves values/units (32); stale calculated
results flagged or recalculated with audit (33); missing target blocks dipping
(34); images stay linked across restarts (35).

---

# PART VIII — OPEN DECISIONS AND RISKS

- **Beacon tolerance** (unconfirmed): nullable storage; no pass/fail until set.
- **Crossfall derivation**: deferred; no invented formula.
- **Peg allowance**: configurable per project; every calculation records the
  value used.
- **Rounding for marking**: never automatic; optional separate display value
  with a stated rounding rule.
- **Offline handwriting recognition**: modular, review-required, tested before
  promising accuracy.
- **PWA vs native Android**: PWA first; reassess only on a documented failure.

**Risks and mitigations:** incorrect formula ⇒ independent test cases and
documented rules; mixed units ⇒ integer internals + import validation; wrong CP
linkage ⇒ identifiers + setup validation; bad OCR ⇒ human review + image
retention; stale values ⇒ dependency tracking + recalculation status; data loss
⇒ local persistence + versioned backups; unconfirmed tolerance ⇒ nullable
config + explicit status; crossfall assumptions ⇒ defer; cleared browser
storage ⇒ frequent user-controlled backups with warnings; false confidence from
arithmetic checks ⇒ arithmetic kept separate from independent verification.

## Final development directive

Build a practical, offline-first road surveying assistant with a transparent
calculation engine and a traceable local data model. Priority order: raw
observations → HI/RL across setups → arithmetic/reference checks → design
import and comparison → peg offsets with configured allowance → dipping
corrections → save/review/export/backup. Advanced recognition, crossfall,
volumes and cloud follow only after the core is tested.

**Governing rule:** RoadLevel may automate arithmetic, validation and
record-keeping, but it must never silently invent an observation, hide a failed
check, or turn an unconfirmed site convention into an authoritative surveying
rule.
