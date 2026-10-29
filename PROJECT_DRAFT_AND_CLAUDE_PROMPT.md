# ROADLEVEL 🚧📐
## Complete Project Brief, Technical Status, Site Discoveries & Handover Message to Claude

**Application Name:** RoadLevel  
**Repository:** [https://github.com/lone-sudo/roadlevel](https://github.com/lone-sudo/roadlevel)  
**Branch:** `main`  
**Current Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Dexie.js (IndexedDB), Vite PWA, Tesseract.js (Offline Web Worker OCR), SheetJS (`xlsx`)  
**Target Environment:** Offline-first Android smartphone (PWA / Web) and Laptop / Field Office PC  
**Primary Users:** Road construction site technicians, survey assistants, site engineers, inspectorate technicians  

---

# PART 1: THE COMPLETE PRODUCT BRIEF & SPECIFICATION

## 1. Executive Summary & Problem Statement
Road construction surveying currently relies almost entirely on physical paper field books, manual arithmetic, and mental cross-section adjustments. On active road construction sites, differential levelling is performed with a dumpy level / optical level and a levelling staff. 

This manual process introduces severe challenges:
1. **Repetitive, Error-Prone Arithmetic:** A 1 km stretch of road can require hundreds of readings. Arithmetic mistakes in collimation height, reduced levels (RLs), peg-marking offsets, or dipping corrections directly translate into expensive earthwork rework or incorrect pavement thickness.
2. **Confusing Observation Types:** Sights must be correctly categorized as Backsight (BS), Intermediate Sight (IS), Foresight (FS), Benchmark (BM), Temporary Benchmark (TBM), Road Beacon, or Change Point (CP).
3. **Connecting Instrument Setups:** When the tripod is moved, the change point reading from the old setup (FS) must accurately connect to the first reading of the new setup (BS) to establish the new Height of Collimation / Height of Instrument (Col / HI).
4. **Camber & Cross-Section Target Geometry:** Left, Centreline, and Right pegs have different design levels due to the road's crossfall or crown camber (e.g. 2.5% slope).
5. **Harsh Operating Environment:** Active road sites feature blinding sunlight glare, blowing dust, rain, heavy equipment vibrations (graders, vibratory rollers), and remote locations with zero cellular internet access.
6. **Handwritten Records & Traceability:** Paper records cannot be easily searched, verified by arithmetic check formulas ($\sum \text{BS} - \sum \text{FS} = \text{Last RL} - \text{First RL}$), backed up, or converted into official spreadsheets without tedious manual transcription.

**RoadLevel** is built to solve these problems as an **offline-first digital field assistant**. It is not intended to replace approved civil engineering drawings or engineering judgement, but to eliminate arithmetic errors and provide a fast, trustworthy digital survey book.

---

## 2. Core Surveying Workflows to Support

The application strictly separates two distinct site workflows:

### Workflow A: Ground-Level Surveying & Differential Levelling
Records existing ground levels, natural ground profiles, layer tops, or benchmark runs using a dumpy level:
* **Height of Collimation / Instrument (Col / HI) Method:**
  $$\text{Col (HI)} = \text{Known Benchmark RL} + \text{Backsight (BS)}$$
  $$\text{Reduced Level (RL)} = \text{Col} - \text{Staff Reading (IS or FS)}$$
* **Rise and Fall Method:**
  $$\text{Diff} = \text{Previous Sight} - \text{Current Sight} \quad (\text{Diff} > 0 \rightarrow \text{Rise}, \ \text{Diff} < 0 \rightarrow \text{Fall})$$
  $$\text{RL} = \text{Previous RL} + \text{Rise} - \text{Fall}$$
* **Standard Arithmetic Check:**
  $$\sum \text{BS} - \sum \text{FS} = \text{Last RL} - \text{First RL} = \sum \text{Rise} - \sum \text{Fall}$$

### Workflow B: Road Dipping & Peg Setting-Out
Guides the construction team and motor grader operators towards the required road layer or formation level:
* **Peg Setting-Out & Peg Marking:**
  * Uses a site allowance (configured at +300 mm):
    $$\text{Adjusted Design Level} = \text{Centreline Design RL} + \text{Allowance (300 mm)}$$
  * When staff is held on top of a wooden peg driven into the ground, staff reading reduces the peg's top elevation ($\text{Peg RL}$).
  * Signed marking offset from peg top:
    $$\text{Marking Offset} = \text{Adjusted Design Level} - \text{Peg RL}$$
  * If **positive (+55 mm)**: Measure and mark **55 mm UPWARD** from top of wooden peg.
  * If **negative (-20 mm)**: Measure and mark **20 mm DOWNWARD** from top of wooden peg.
* **Road Dipping (Thread-to-Ground Check):**
  * A string thread is stretched tightly between the marks on the left and right pegs across the road carriageway.
  * Vertical tape measurements are taken from the string down to the compacted ground/gravel:
    $$\text{Correction} = \text{Actual Distance} - \text{Target Distance}$$
  * If **Actual > Target (+)**: **FILL** (ground is too low, add material).
  * If **Actual < Target (-)**: **CUT** (ground is too high, grade down).
  * If **Actual = Target (0)**: **ON TARGET** (zero correction).

---

# PART 2: EVERYTHING DISCOVERED, CHANGED & BUILT SO FAR

Based on actual handwritten field books provided by practicing site personnel (see photos in repository), the application was evolved from a basic prototype into a realistic site tool:

### 1. Integer Millimetres vs. Decimal Metres
* **Site Discovery:** Surveyors in Commonwealth/African road works write staff readings and elevations as integer millimetres in their physical books (e.g. `1155` for 1.155 m, `1484` for 1.484 m, and `1842059` for 1,842.059 m).
* **Implementation:** Added a unit toggle (`mm` vs `m`) and intelligent auto-detection: numbers $\ge 50$ entered without decimals are automatically treated as millimetres.

### 2. Cross-Section Offsets Across the Carriageway
* **Site Discovery:** At each station/chainage (e.g. `0+140`, `0+160`, `0+180`), the staff person walks across the road taking Intermediate Sights (IS) at regular lateral offsets. The user's notebook specifically showed:
  * `-4.2 m` (Left Edge / Shoulder)
  * `-3.0 m` (Left Lane)
  * `0.0 m` (Centreline / CL)
  * `+3.0 m` (Right Lane)
  * `+4.2 m` (Right Edge / Shoulder)
  *(and on 9 m roads: `-4.5, -3.0, 0, +3.0, +4.5`)*
* **Implementation:** Added an `Interval (Offset)` column and quick one-click generator buttons (`+ Road Section (-4.2 to +4.2)`, `+ Section (-4.5 to +4.5)`).

### 3. Physical Field Book Column Alignment & Automatic Cut/Fill ($\Delta$)
* **Site Discovery:** The physical field book contains a dedicated sub-column right beside `IS` where the surveyor writes the difference:
  $$\text{Diff (Cut/Fill)} = \text{Design RL} - \text{Reduced Level}$$
  * Example from notebook: `IS = 1449` $\rightarrow$ `Red = 1841765`, `Design = 1841958` $\rightarrow$ writes **`+193`** (Fill 193 mm).
  * Example of cut: `IS = 1629` $\rightarrow$ writes **`-18`** (Cut 18 mm).
* **Implementation:** Re-ordered table columns to match the real physical ledger:
  $$\text{Line \#} \ | \ \text{Type} \ | \ \text{Chainage} \ | \ \text{Interval} \ | \ \text{BS} \ | \ \text{IS} \ | \ \mathbf{\text{Diff (+/- mm)}} \ | \ \text{FS} \ | \ \text{Col (HI)} \ | \ \text{Red (RL)} \ | \ \text{Design RL} \ | \ \text{Remarks}$$
  As soon as `IS` is entered, `Red` is computed, and if `Design RL` is entered, `Diff` immediately shows bold **`+193`** or **`-18`**.

### 4. 3-Point Dipping Sets (`L, CL, R`) with Road Camber
* **Site Discovery:** In the dipping preparation notes, each station (e.g. `0+580`, `0+600`, `0+620`) has exactly 3 readings: Left peg, Centreline, and Right peg. Centreline design is higher than the edges due to crown camber (e.g. at `0+580`: Left Design = `1834095`, Centre Design = `1834120`, Right Design = `1834095` $\rightarrow$ 25 mm camber difference). The user notes showed dipping corrections: `+26 mm`, `+33 mm`, `+45 mm`, and `-25 mm`.
* **Implementation:** Added a **`+ 3-Pt Dipping Set (L, CL, R)`** generator button and synchronized dipping presets.

### 5. Single-Line Change Points (CP)
* **Site Discovery:** When shifting the instrument, surveyors write both the closing Foresight (FS = `1700`) and the opening Backsight (BS = `0901`) on the exact same row.
* **Implementation:** Updated reduction math so a row with both `FS` and `BS` first calculates CP elevation from `FS`, and then immediately calculates the new `Col` from `BS`.

### 6. Eradication of Dull Numbers & Triple-Theme Display
* **User Feedback:** *"Also now the numbers are too dull they can't be seen."*
* **Fix:** Completely eliminated washed-out gray text (`text-slate-500`, thin fonts). Replaced with:
  * **Light Mode:** High-contrast pitch-black text (`text-black font-black font-mono text-sm sm:text-base`) with crisp borders.
  * **Dark Mode:** Luminous white, golden amber, and electric cyan.
  * **Sunlight Mode:** Ultra-high-contrast saturated amber and pure black for direct sunlight on site.
  * Distinct bold colors for Collimation (Indigo/Cyan), Reduced Level (Black on amber ledger tint), and Cut/Fill (Emerald green / Crimson red).

### 7. Spreadsheet-Speed Down-Column Keyboard Navigation
* **User Feedback:** *"When I enter my IS and press enter, I have to manually use my mouse to move to the next line."*
* **Fix:** When entering values in `IS`, `BS`, or `Design RL`, pressing **Enter** advances focus straight down to the same column on the next row. If pressed on the bottom row, it automatically creates a new row and places the cursor right there.

### 8. Removal of Intrusive Warning Banners & Addition of Field Guide
* Replaced the loud red/yellow error banner with a quiet, professional engineering status bar showing lines, $\sum \text{BS}$, $\sum \text{FS}$, and unit status.
* Added a modal **"Field Guide"** in plain English with visual step-by-step illustrations for non-technical site staff.

---

# PART 3: THE MESSAGE & ARCHITECTURAL CHALLENGE TO CLAUDE

> **Copy and paste the following prompt directly into Claude:**

```markdown
Hi Claude,

I am building "RoadLevel", an offline-first road surveying, levelling, peg setting-out, and dipping application for Android smartphones and laptops.
The full GitHub repository is available here: https://github.com/lone-sudo/roadlevel (branch: main).

Please review the complete project brief and the changes we have made so far (detailed above in PART 1 and PART 2).

The users of this app are road construction technicians, survey assistants, and site engineers. They spend their days on hot, dusty construction sites using optical dumpy levels and levelling staffs. They understand surveying concepts (Backsight, Intermediate Sight, Foresight, Collimation HI, Benchmarks, Chainages, Offsets, Pegs, Camber, and Dipping), but they are NOT tech-savvy. They hate bloated, confusing, slow software, and they especially dislike interfaces that look "AI-generated" or resemble generic SaaS marketing dashboards with floating cards and pastel bubbles.

I want you to critically review this project from an architectural, engineering, and UX perspective. Even if it means tearing down and rebuilding parts from scratch, tell me:

### 1. How to make the UI/UX 100% authentic, user-friendly, and NOT look "AI-generated":
- How can we make this software look and feel like battle-tested civil engineering software (comparable to Trimble Survey Controller, Leica Geo Office, AutoCAD Civil 3D, or a high-precision digital replica of a classical surveyor's field book)?
- What visual elements, component patterns, typography, and tabular layouts should be used or eliminated?

### 2. Mobile & Harsh Site Ergonomics:
- The site environment is brutal: intense tropical sun glare, dust/dirt on phone screens, users wearing gloves or using fat thumbs, and heavy equipment vibrating nearby.
- How should the mobile entry interface be redesigned? Should we have a dedicated, oversized on-screen Survey Numeric Keypad (with large buttons for digits, decimal, `+`, `-`, `CL`, `L`, `R`, `BS`, `IS`, `FS`, `Enter Next`) instead of relying on the standard Android keyboard?
- How should one-handed operation be optimized when walking along a road chainage?

### 3. Architecture & Tech Stack Evaluation:
- Currently, the app is built with React 19, TypeScript, Tailwind CSS v4, Dexie.js (IndexedDB wrapper) as a Progressive Web App (PWA) with Service Worker caching, and Tesseract.js in Web Workers for on-device OCR.
- Is this PWA stack sufficient for a production-grade field engineering tool, or should any layer be refactored or rebuilt?
  * Should the tabular grid be a virtualized canvas-based grid (like Canvas-datagrid / Glide Data Grid) for zero-latency handling of 5,000+ chainage observations?
  * Should local storage remain Dexie IndexedDB or move to SQLite via WASM (wa-sqlite) or OPFS (Origin Private File System)?
  * How should the offline OCR pipeline be structured so that photos of handwritten field-book pages are processed with maximum reliability on mid-range Android phones?
  * Would you recommend staying with a PWA or migrating to Flutter / Kotlin Multiplatform?

### 4. Missing or Advanced Road Surveying Math & Capabilities:
- Looking at the actual site notes (5-point cross sections at `-4.2, -3.0, 0, +3.0, +4.2`, 3-point dipping sets with 25 mm camber, +300 mm peg setting allowance, and single-line CP reductions):
  * What critical civil engineering workflows are missing? (e.g. superelevation transitions on horizontal curves, vertical parabolic curve levels [crests/sags], automated crossfall camber generators, bulk CSV design level profile imports)?
  * How should cross-section dipping calculations be structured so that the motor grader operator receives instant, foolproof Cut/Fill grade stakes?

### 5. Step-by-Step Implementation Roadmap:
- Give me your prioritized, concrete recommendations: what to refactor immediately, what to keep, what to rebuild, and exactly how the code and components should be structured.

Please be rigorous, practical, and direct. Treat this like an experienced senior civil engineering software architect and principal UX designer doing a comprehensive codebase review.
```

---

# PART 4: REPOSITORY STRUCTURE OVERVIEW FOR REVIEWERS

```
RoadLevel/
├── public/
│   ├── manifest.webmanifest      # PWA Web App Manifest
│   └── pwa-icon.svg             # Application icons
├── src/
│   ├── components/
│   │   ├── FieldBook/
│   │   │   ├── SurveyBookGrid.tsx     # Main Ledger Table (BS, IS, Diff, FS, Col, Red, Design RL)
│   │   │   ├── FieldGuideModal.tsx    # Plain-English visual guide for site technicians
│   │   │   └── FieldBookView.tsx      # Legacy view
│   │   ├── PegSetting/
│   │   │   └── PegSettingView.tsx     # +300mm allowance & signed peg offset calculator
│   │   ├── Dipping/
│   │   │   └── DippingView.tsx        # Thread-to-ground Cut/Fill calculator
│   │   ├── Reports/
│   │   │   └── ReportsView.tsx        # 8-Sheet Excel Export & printable site records
│   │   ├── Navbar.tsx                 # Top bar with 3-theme toggle & project switcher
│   │   └── MobileBottomNav.tsx        # Fixed bottom navigation for mobile phones
│   ├── db/
│   │   └── database.ts                # Dexie IndexedDB v4 offline storage schemas
│   ├── utils/
│   │   ├── surveyCalculations.ts      # Core surveying engine (HI, Rise/Fall, Pegs, Dipping, Checks)
│   │   ├── surveyCalculations.test.ts # Vitest automated test suite (15 passing tests)
│   │   ├── excelExport.ts             # SheetJS 8-sheet workbook exporter
│   │   └── ocrScanner.ts              # Client-side Tesseract.js handwriting OCR scanner
│   ├── App.tsx                        # Main application container & theme state
│   └── main.tsx                       # React DOM entrypoint & service worker registration
├── START_ROADLEVEL.bat                # Windows desktop double-click launcher
├── package.json                       # Dependencies & scripts
├── vite.config.ts                     # Vite + vite-plugin-pwa configuration
└── README.md                          # Repository documentation
```
