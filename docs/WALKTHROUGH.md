# RoadLevel — User walkthrough

How to use RoadLevel for a real road-levelling job, from creating a project to
exporting results. Everything works offline once the app is open/installed.

---

## Step 0 — Install it on your phone (or laptop)

1. Open the app's URL in **Chrome on your Android phone**.
2. Tap the ⋮ menu → **Add to Home screen / Install app**.
3. Open it from the home screen — it runs full-screen and works with no signal.

> The dev server (`npm run dev`) is localhost-only. For your phone you need the
> hosted deployment URL (see README "Try it online") or, on the same Wi-Fi,
> `npm run dev -- --host` and your PC's LAN address like `http://192.168.x.x:5179`.

## Step 1 — Create a project (Projects tab)

1. Tap **New project**.
2. Enter a **name** (required) and optionally the road name/description.
3. Confirm the **peg-marking allowance** (your current site procedure uses
   **+300 mm**) — this is a per-project setting, never a hidden default.
4. Leave **beacon tolerance** blank unless you have a confirmed value and its
   source. Blank means beacon checks show "not configured", never a guess.

## Step 2 — Register your known points (Points tab)

Before levelling, register points you will reference:

- **BM / TBM** — enter the point code and its **known RL** plus the source
  (e.g. "TBM14, RL 1830.450 m, from approved drawing").
- **Beacons** — same fixture type; the known RL is used later for verification.
- **CPs, ground points, pegs** can be created ahead of time or on the fly from
  the field book.

IDs (point codes) may repeat in different projects, but the app warns about
ambiguous duplicates within one project.

## Step 3 — Record a levelling run (Field book tab)

1. **New session** — e.g. "Chainage 0+100 to 0+260 ground levels".
2. **New setup** — pick the reference point (your BM/CP), confirm its RL, and
   enter the **backsight** reading. The app calculates:
   - `HI = RL_reference + BS`
   - every reading entered on that setup: `RL = HI − reading`.
3. Add observations in order: **IS** for intermediate ground points, **FS** on
   the change point when you want to move the instrument.
4. **Move the instrument**: start a *new setup* referencing the CP you just
   foresighted. Enter the new **BS** on that CP (same point ID or explicitly
   accepting the app's linkage). The new HI is calculated from the CP — the old
   HI is **never** reused.
5. Each observation shows the raw staff reading plus its calculated RL and the
   setup it came from.

Validation you will see: over-precise readings rejected (e.g. 1.2505 m can't be
read to mm), missing readings leave RL **incomplete** (never treated as zero),
and change-point mismatches are flagged rather than assumed.

## Step 4 — Check the run (Field book → arithmetic checks)

At the bottom of the session the app shows both required checks:

- **ΣBS − ΣFS = RL_last − RL_first** (Height-of-Collimation check)
- **ΣRise − ΣFall = RL_last − RL_first** (Rise & Fall check)

A "passed" check proves **arithmetic only** — it is displayed separately from
independent verification, and closing back onto a known point is where true
verification happens (Step 8).

## Step 5 — Import design levels (Design tab)

1. **Import CSV** (or enter manually). Columns: chainage, position (centre /
   left / right / offset), design RL, optional revision.
2. Review the preview; values must parse as millimetre-representable metres
   (1830.764 ✓, 1830.7641 ✗). Reject any over-precise or signed-unit rows.
3. Duplicates at the same chainage+position+revision are **flagged**, never
   silently overwritten — resolve or delete explicitly.
4. Use **Compare against ground** to get cut/fill per chainage. A comparison is
   blocked (with the reason) if chainage/offset don't match — the app won't
   invent a match.

## Step 6 — Calculate peg setting-out (Peg tab)

For each peg:

| Peg | Peg RL | Adjusted design | Offset | Instruction |
|---|---:|---:|---:|---|
| Left | 1830.009 m | 1830.064 m | **+55 mm** | Mark **55 mm upward** from peg top |
| Right | 1830.045 m | 1830.064 m | **+19 mm** | Mark **19 mm upward** from peg top |

Adjusted design = centreline design RL + allowance (+300 mm here).

- Positive offset → mark **upward**, negative → **downward**, zero → no mark.
- Exact mm values are always shown; if you want rounded ruler marks, that's a
  separate clearly-labelled display value, never the stored result.
- If you later change the allowance, the app shows a **recalculation review**
  list — affected results are re-calculated only on your action and the old
  values stay in the audit trail.

## Step 7 — Dipping (Dipping tab)

Record thread-to-ground checks per chainage and position:

- **Target** (e.g. 380 mm, or 300 mm at centre) and **actual** (e.g. 420 mm).
- The app computes `D = actual − target`:
  - Actual **420** vs target **380** → **+40 mm → Fill 40 mm.**
  - Actual **320** vs target **380** → **−60 mm → Cut 60 mm.**
  - Actual **300** vs target **300** → **zero correction.**
- Missing target → **no correction calculated**; the app asks for it. It will
  never assume "30 cm centre / 38 cm sides" from a rule it wasn't given.

## Step 8 — Verify points (Points tab → Beacon checks)

When a calculated RL exists for a registered beacon:

- Shows the signed difference `calculated − known` (± mm and m).
- Tolerance status:
  - **Within tolerance** / **Outside tolerance** — only if the project has an
    explicitly-configured tolerance.
  - **Not configured** — otherwise. The difference is still shown; the app
    never assumes ±10 mm or any default.

## Step 9 — Export and back up (Backup tab)

- **CSV export** — field book, peg table, dipping. Values, signs and units
  preserved (metres in metre columns, signed mm where relevant).
- **Export project backup** — a versioned JSON file containing the project,
  observations, derived results, settings, images, and audit events. Keep
  copies off the phone.
- **Restore** — opens a preview/validation step first. Import **as a new
  project** (unique name) or **replace an existing project** only after an
  explicit confirmation; never a silent overwrite.
- **Audit events** — every important change is listed here with before/after
  values.

## What it will not do (by design, in this build)

- No Excel import/export yet (CSV only).
- No field-book photo/OCR — its data stores exist for a future build.
- No derived crossfall targets — manual/imported only until the convention is
  confirmed.
- No cloud sync — data is local; backups are your recovery path.
- No volume or rate calculations.

## Daily rhythm suggestion

1. Start a session before leaving the office/dry hut (it'll work offline).
2. Record observations as you go — the field book is designed for rapid
   sequential entry.
3. Run arithmetic checks the same evening while points are fresh.
4. Back up the project after each change that matters.
5. Export CSV/peg/dipping tables when site paperwork is needed.
