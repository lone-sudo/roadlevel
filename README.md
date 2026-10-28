# RoadLevel

Offline-first road surveying assistant for an Android phone or any laptop browser:
a digital field book, reduced-level calculations across instrument setups, peg
setting-out with a configurable allowance, and thread-to-ground dipping corrections.

Built as an installable PWA (React + TypeScript + Vite). All data is stored
locally in IndexedDB. Core calculations never touch the network.

**This is a calculation and record-keeping assistant. It does not replace
approved drawings, survey specifications, independent checks or engineering
judgement.**

## Try it / run it

- Hosted (deployment URL): [README deployment placeholder — see "Deployment" below]
- Local:

```bash
npm install
npm run dev        # http://localhost:5179
npm test           # 45 calculation/data tests (spec Tests 1–21 + validation)
npm run build      # production build + service worker in dist/
```

Install on Android: open the app URL in Chrome → ⋮ → **Add to Home screen /
Install app**. The app shell is precached by the service worker; records
persist in IndexedDB and continue working with no signal.

## Documentation

- [`docs/SPEC.md`](docs/SPEC.md) — full product requirements, technical specification and development blueprint
- [`docs/WALKTHROUGH.md`](docs/WALKTHROUGH.md) — step-by-step user walkthrough (install → project → field book → pegs → dipping → export)
- [`JOURNAL.md`](JOURNAL.md) — build journal (architecture decisions, test results, known limitations)

## Source layout

- `src/core/units.ts` — integer-millimetre boundary conversions with precision validation
- `src/core/engine.ts` — the deterministic calculation engine (HI/HOC, Rise & Fall, arithmetic checks, peg marking, dipping, ground-vs-design, beacon)
- `src/core/*.test.ts` — spec test cases; expected values were fixed before implementation
- `src/db/store.ts` — IndexedDB schema, versioned project backup/restore
- `src/db/service.ts` — domain service: sessions, setups, recalculation, design levels, peg marks, dipping, beacon checks, audit events
- `src/io/csv.ts` — CSV parse/serialize with unit-validated import
- `src/screens/*` — UI screens (projects, settings, field book, points/beacons, design levels, peg setting-out, dipping, backup/audit)

## What is implemented (Milestones 1–4 core, per spec §35)

- HI/HOC and Rise & Fall reduction across multiple instrument setups, with change-point linkage validation
- Arithmetic checks (ΣBS−ΣFS and ΣRise−ΣFall), displayed separately from independent verification
- Project register with per-project settings, audit trail, dashboard summary
- Design levels: manual entry, validated CSV import with duplicate flagging, design-vs-ground compare that blocks mismatches
- Peg setting-out with configurable allowance and signed direction convention, exact values always kept, stale-result review after setting changes
- Dipping corrections using the confirmed D = actual − target rule
- Beacon verification with the difference always shown and tolerance status "not configured" unless a tolerance is explicitly set
- Versioned JSON backup export/restore with pre-restore validation and never-silent-overwrite naming
- Service-worker-cached offline app shell

## Deferrals (tracked in the build journal)

- Excel workbook import/export (spec Milestone 4, second half) — CSV only for now
- Field-book photograph capture and OCR extraction (Milestone 6) — the schema
  keeps `fieldBookImages` and `extractionRecords` stores so backups stay forward-compatible
- Crossfall target derivation — intentionally deferred until the geometric convention is confirmed (spec §13, §37.2)
- Native Android app — PWA first; reassess only if the PWA fails a documented requirement (spec §37.6)

## Deployment

The production PWA build is deployed to a public HTTPS URL so it can be
installed on an Android phone directly from Chrome. Currently served at:

**https://roadlevel-sites-preview.roadlevel.pages.dev**  *(placeholder — replace with your actual deployed URL)*

## Governing rule

RoadLevel may automate arithmetic, validation and record-keeping, but it must
never silently invent an observation, hide a failed check or turn an unconfirmed
site convention into an authoritative surveying rule.

## Known limitations (before field use)

- Browser storage can be cleared by the user or OS; no other automatic protection exists. Export backups regularly (Backup tab → Export project backup).
- Arithmetic checks are arithmetic only; independent benchmark closure is not yet automated beyond beacon differences.
- Offline behaviour and IndexedDB persistence must be validated on the intended Android phone (spec Test 30/31) before relying on it in the field.
- Scanned field-book support is not implemented in this build.
