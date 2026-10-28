# RoadLevel — Comprehensive User Walkthrough

This guide walks you step-by-step through a complete road construction surveying workflow using RoadLevel: from setting up a project to recording dumpy level readings, verifying arithmetic checks, calculating peg-marking offsets, performing dipping corrections, checking known road beacons, digitising paper field-book pages with OCR, and exporting 8-sheet Excel workbooks.

---

## Table of Contents
1. [Step 1: Project Setup & Survey Settings](#step-1-project-setup--survey-settings)
2. [Step 2: Reference-Point Register (BMs, TBMs & Road Beacons)](#step-2-reference-point-register-bms-tbms--road-beacons)
3. [Step 3: Recording Field Book Observations (Dumpy Level)](#step-3-recording-field-book-observations-dumpy-level)
4. [Step 4: Checking Arithmetic & Multi-Setup Change Points](#step-4-checking-arithmetic--multi-setup-change-points)
5. [Step 5: Reduced-Level Calculator (HI & Rise/Fall Verification)](#step-5-reduced-level-calculator-hi--risefall-verification)
6. [Step 6: Approved Design Levels & 20m Profile Generator](#step-6-approved-design-levels--20m-profile-generator)
7. [Step 7: Peg Setting-Out & Peg-Marking Calculator (+300 mm Allowance)](#step-7-peg-setting-out--peg-marking-calculator-300-mm-allowance)
8. [Step 8: Road Dipping & Thread-to-Ground Correction (Cut/Fill)](#step-8-road-dipping--thread-to-ground-correction-cutfill)
9. [Step 9: Photographing & Digitising Paper Field Books (OCR Scanner)](#step-9-photographing--digitising-paper-field-books-ocr-scanner)
10. [Step 10: Reports, 8-Sheet Excel Export & Full JSON Backup](#step-10-reports-8-sheet-excel-export--full-json-backup)

---

## Step 1: Project Setup & Survey Settings

1. In the top navigation bar, select your project or click **"+ New Project..."**.
2. Set your **Level Unit Convention**:
   * **Integer mm Mode (e.g. 1830009):** Matches the site convention where levels are recorded as whole millimetres without a decimal point.
   * **Decimal Metres Mode (e.g. 1830.009 m):** Standard 3-decimal surveying notation.
3. Confirm the **Peg-Marking Allowance**:
   * Standard site workflow uses **+300 mm**. This is added to the centreline design RL.
4. Set the **Beacon Tolerance**:
   * If specified in your contract (e.g. $\pm 10\text{ mm}$), enter it. If unconfirmed, leave it blank; RoadLevel will display the difference without guessing or forcing a pass/fail status.
5. Tap **"Save Project Settings"**.

---

## Step 2: Reference-Point Register (BMs, TBMs & Road Beacons)

Navigate to the **Beacons & BMs** tab to record your established reference points:

1. **Master Benchmark (BM):** Enter the point code (e.g. `BM-01`), known RL ($100.000\text{ m}$), datum, chainage, and description (e.g. *"Brass plug in culvert headwall at Ch 0+000"*).
2. **Road Beacon (BEACON):** Enter the known beacon code (e.g. `RB-12`), known RL ($1,830.000\text{ m}$), chainage ($0+080$), and offset.
3. Tap **"Register Reference Point"**.

---

## Step 3: Recording Field Book Observations (Dumpy Level)

Navigate to the **Field Book** tab:

1. **Active Instrument Setup:**
   * Setup #1 starts automatically with a Backsight (BS) onto your benchmark (e.g. `BM-01`, $\text{BS} = 1.250\text{ m}$).
   * RoadLevel calculates the **Height of Instrument (HI)**:
     $$\text{HI} = 100.000 + 1.250 = 101.250\text{ m}$$
2. **Enter Ground Observations:**
   * Select Point Type: `Ground` or `Peg`.
   * Chainage: `0+000`.
   * Position: `Centre (CL)`.
   * Enter Intermediate Sight (IS): `1.875` m.
   * Tap **"Record Observation"** (or hit Enter).
   * RoadLevel immediately computes the Reduced Level:
     $$\text{RL} = 101.250 - 1.875 = 99.375\text{ m}$$
3. **Smart Pattern Assistant:**
   * The app automatically suggests the next position (`Left` $\rightarrow$ `Right` $\rightarrow$ next chainage $+20\text{ m}$).
   * Click the **"+20m Chainage"** button to advance chainages automatically without retyping.
   * *Safety Note:* Observations are **never** copied automatically; staff readings must always be entered by the surveyor.

---

## Step 4: Checking Arithmetic & Multi-Setup Change Points

### Moving the Instrument (Change Points):
1. When sightlines become too long or obstructed, take a **Foresight (FS)** on a stable Change Point (e.g. `CP-1` or `TBM-01`).
2. Move the dumpy level to the new position.
3. Click **"New Setup / Change Point (CP)"**.
4. Enter the new setup details: select `CP-1` as the Backsight Point and enter the new **Backsight (BS)** reading (e.g. $2.100\text{ m}$).
5. The new setup's HI is computed from the established CP level. The previous setup's HI is never silently reused.

### Live Arithmetic Checks:
At the top of the Field Book, the **Arithmetic Check Banner** verifies your run in real time:
$$\sum \text{BS} - \sum \text{FS} = \text{Last RL} - \text{First RL} = \sum \text{Rise} - \sum \text{Fall}$$
* **PASSED (Green):** Arithmetic check passes to the millimetre.
* **INCOMPLETE (Amber):** Readings are missing (e.g. foresight needed to close run).
* **FAILED (Red):** Arithmetic discrepancy detected.

---

## Step 5: Reduced-Level Calculator (HI & Rise/Fall Verification)

Navigate to the **RL Calculator** tab:

* **Dual-Method Comparison:** View all observations computed simultaneously using both the **Height of Collimation (HI)** method and the **Rise and Fall** method.
* **Exact Match Verification:** A green checkmark confirms both methods agree to $0.001\text{ m}$ across the entire run.
* **Interactive Scratchpad:** Test hypothetical staff readings and benchmark elevations before logging them.

---

## Step 6: Approved Design Levels & 20m Profile Generator

Navigate to the **Design Levels** tab:

1. **Enter Design Levels:** Input approved target levels at each chainage and position.
2. **20m Profile Generator:** If the road section has a constant longitudinal gradient (e.g. $+0.5\%$), enter the start chainage, end chainage, start RL, and grade. Click **"Generate Profile"** to instantly generate all 20m interval design levels.
3. **Existing Ground vs Design Comparison:** The table displays:
   $$\text{Difference} = \text{Existing Ground RL} - \text{Design RL}$$
   * Positive difference $\rightarrow$ **CUT** (ground is above design).
   * Negative difference $\rightarrow$ **FILL** (ground is below design).

---

## Step 7: Peg Setting-Out & Peg-Marking Calculator (+300 mm Allowance)

Navigate to the **Peg Setting** tab:

1. **Enter Chainage and Centreline Design RL:**
   * e.g. Chainage `0+000`, Centre Design RL: `1829764` (in integer mm mode).
2. **Apply Site Allowance:**
   * Configured allowance is `+300 mm`.
   * Adjusted Design Level:
     $$1,829,764 + 300 = 1,830,064\text{ mm}$$
3. **Enter Measured Peg RL:**
   * **Left Peg:** Measured RL = `1830009 mm`.
     $$\text{Offset} = 1,830,064 - 1,830,009 = \mathbf{+55\text{ mm}}$$
     👉 **Instruction:** *"Mark 55 mm upward from top of peg"*.
   * **Right Peg:** Measured RL = `1830045 mm`.
     $$\text{Offset} = 1,830,064 - 1,830,045 = \mathbf{+19\text{ mm}}$$
     👉 **Instruction:** *"Mark 19 mm upward from top of peg"*.
4. **Visual Peg Marking Diagram:** An interactive graphic displays the physical wooden peg, peg top level, thread level line, and an offset arrow so the technician cannot mistake upward from downward marking!

---

## Step 8: Road Dipping & Thread-to-Ground Correction (Cut/Fill)

Navigate to the **Dipping** tab:

1. A thread is stretched horizontally between the marked pegs across the road formation.
2. Measure the vertical distance from the thread down to the ground.
3. **Enter Dipping Values:**
   * **Example A (Fill):** Target = `38 cm`, Actual = `42 cm`.
     $$\text{Correction} = 42 - 38 = +4\text{ cm} \rightarrow \mathbf{\text{Fill } 4\text{ cm } (40\text{ mm})}$$
   * **Example B (Cut):** Target = `38 cm`, Actual = `32 cm`.
     $$\text{Correction} = 32 - 38 = -6\text{ cm} \rightarrow \mathbf{\text{Cut } 6\text{ cm } (60\text{ mm})}$$
   * **Example C (On Target):** Target = `30 cm`, Actual = `30 cm`.
     $$\text{Correction} = 30 - 30 = 0\text{ cm} \rightarrow \mathbf{\text{No correction required}}$$
4. **Cross-Section Diagram:** An SVG visual shows the ground elevation relative to the target line, with directional Cut/Fill arrows.

---

## Step 9: Photographing & Digitising Paper Field Books (OCR Scanner)

Navigate to the **Scan Field Book** tab:

1. **Capture Photograph:** Tap **"Take Photo"** on your phone (or **"Upload Image"** on desktop).
2. **Image Pre-processing:** Use the **"Rotate (90°)"** button to orient the page. The app automatically optimizes contrast and converts to grayscale for clearer handwriting extraction.
3. **Run On-Device OCR:** Tap **"Run On-Device OCR"**. Tesseract.js runs inside your browser via local Web Workers. No images leave your phone.
4. **Human Review & Confirmation:**
   * The extracted rows appear side-by-side with your photo.
   * Low-confidence or ambiguous numbers are highlighted in amber.
   * Edit any unclear digits directly in the table.
   * Click **"Verify"** on each row.
5. **Import:** Tap **"Confirm & Import into Field Book"** to commit the verified observations.

---

## Step 10: Reports, 8-Sheet Excel Export & Full JSON Backup

Navigate to the **Reports & Export** tab:

1. **Export Excel (.xlsx):** Click **"Export Excel (.xlsx)"** to download a formatted multi-sheet workbook containing:
   * *Project Summary*
   * *Field Book*
   * *Reduced Levels*
   * *Design Levels*
   * *Peg Setting-Out*
   * *Dipping Corrections*
   * *Beacon Checks*
   * *Audit Log*
2. **Print Site Report:** Click **"Print Report"** to view or print the official engineering certificate, complete with surveyor signature blocks and check stamps.
3. **Backup Data:** Click **"Backup Data"** to download an encrypted JSON file of your entire database.
4. **Audit Trail:** Every edit made to previously saved observations is listed in the modification log with the old value, new value, timestamp, and surveyor's reason.
