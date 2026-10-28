# RoadLevel — Build journal

Maintained per spec §36 (development governance). One entry per work session,
with decisions, test results and known limitations.

## Session 1 — 2026-10-28 — Calculation engine, data layer, PWA core

### Architecture decisions

- **Framework: React + TypeScript + Vite**, chosen for the initial release (spec §28 allows developer choice; recorded here as required).
- **Internal units: integer millimetres everywhere** (spec Part II). Conversion from user input happens in `src/core/units.ts` only, and over-precision is rejected (e.g. `1.2505 m`), never truncated.
- **Engine is pure**: `src/core/engine.ts` takes validated integer inputs, returns structured results (`complete | incomplete | invalid` + issues). No DB writes from the engine (spec §28).
- **IndexedDB via `idb`** with the schema of spec §16 mapped to object stores and indexes. UUIDs, ISO timestamps, audit events, backups.
- **Recalculation model**: an explicit `recalculateSession()` rebuilds derived levels from raw observations; edits mark nothing silently stale — instead peg-mark snapshots are diffed against current inputs and surfaced in a "Recalculation review" list (spec §30, Test 27). Old peg results are preserved in the audit trail by writing a new snapshot row and deleting the superseded one after recalculation.
- **Backup format**: `{format: "roadlevel-project-backup", format_version: 1, ...}` with pre-restore validation and unique-name protection on "restore as new" (spec §27).

### Test results (all run and passing: `npm test` → 45 tests)

- Spec Tests 1–21: pass with exact expected values.
- Test 22 (engine scope): missing staff reading → incomplete with named missing field; 0 reading is valid (initially the engine wrongly rejected 0; fixed).
- Tests 26, 34 (engine scope): CP mismatch flagged, missing dipping target blocks.
- Import/validation: over-precision CSV rows rejected; quoted CSV parses; export preserves signs and metre conversion.

### Bugs found and fixed during development

1. Engine initially treated a staff reading of exactly 0 as invalid ("must be greater than zero"). Spec says readings must be non-negative; 0 is a valid reading, missing is not. Fixed.
2. Offset column in the peg-setting-out CSV exported raw millimetres under an `offset_m` header. Fixed to metres (`+0.055`). Test updated to the corrected export format.
3. Restore path originally typed with convoluted session filtering; rewritten to id-preserving per-store restore with a new project id/name.
4. Change of a setup's reference happened with no CP validation on the first implementation; added the same-point requirement (Test 26) in `establishSetup`.

### Features postponed or rejected in this build

- Excel workbook import/export (CSV is the Milestone-4 first target; Excel needs a library decision and real sample workbook tests).
- Field-book image capture and OCR (Milestone 6). Sparse stores already exist.
- Crossfall target derivation — blocked per spec §13/§37.2 until the convention is agreed. Targets are manual/entered only.
- Earthwork volumes, cloud sync, collaboration — out of scope until the core is proven.

### Known limitations at end of this session

- Arithmetic checks shown in the app are arithmetic-only checks. Beacon differences are computed but status is "not configured" until the project sets a tolerance (intentional).
- No "independent closure" calculation between two known points beyond beacon checks (spec Test 33's stale-RL behaviour is covered by session recalculation + audit; a dedicated dependency graph is not yet factored out).
- Offline/device acceptance tests (spec Tests 30, 31, 35) still need to be run on the intended Android phone; on this dev machine the PWA shell builds and serves, previews are verified manually.
- Excel round trip untested: does not exist yet.

### Acceptance criteria status (spec §34)

- Specified calculation tests pass ✅
- Calculation engine has no internet dependency ✅
- Multiple setups handled; raw observations distinct from calculated results ✅
- Signed peg convention and dipping rule implemented as confirmed ✅
- Missing data cannot silently become zero; tolerance not assumed; OCR n/a (not built) ✅/n/a
- Data survives restart (IndexedDB; browser-restart test pending on target device) ⚠️ to verify on Android phone
- Backup/restore works locally; CSV export/import round-trip tested at module level ✅ (device test pending)
- Arithmetic-vs-independent distinction visible in UI ✅
- Tested on intended Android phone ❌ outstanding — next session
