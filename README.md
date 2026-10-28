# RoadLevel 🚧📐
### Offline-First Road Surveying, Levelling, Dipping & Peg-Setting Application

**RoadLevel** is a field-hardened, offline-first digital assistant designed specifically for road construction site personnel, survey assistants, site engineers, and technicians. Built around testable surveying principles, it replaces error-prone manual calculations and paper record-keeping with transparent, verifiable digital workflows.

---

## 🎯 Key Capabilities & Verified Surveying Mathematics

### 1. Differential Levelling (Digital Field Book & RL Calculator)
* **Height of Instrument (HI / HOC):**
  $$\text{HI} = \text{Known RL} + \text{Backsight (BS)}$$
  $$\text{RL} = \text{HI} - \text{Staff Reading (IS or FS)}$$
* **Rise & Fall Method:**
  $$\text{Difference} = \text{Previous Reading} - \text{Current Reading}$$
  $$\text{If } \text{Diff} > 0 \rightarrow \text{Rise}; \quad \text{If } \text{Diff} < 0 \rightarrow \text{Fall}$$
  $$\text{RL} = \text{Previous RL} + \text{Rise} - \text{Fall}$$
* **Standard Arithmetic Check (Section 6.3):**
  $$\sum \text{BS} - \sum \text{FS} = \text{Last RL} - \text{First RL} = \sum \text{Rise} - \sum \text{Fall}$$
  * Live status indicator: `PASSED`, `INCOMPLETE`, or `FAILED`.
  * Distinctly separates arithmetic verification from independent closure on a known reference benchmark.
* **Multi-Setup Instrument Management:** Seamless change-point (CP) tracking across setups with connection warnings for missing links.

### 2. Peg Setting-Out & Peg-Marking Calculator (Section 9)
* **Adjusted Design Level:**
  $$\text{Adjusted Design Level} = \text{Centre Design RL} + \text{Configured Allowance}$$
  *(Default allowance: +300 mm, user configurable in Project Settings)*
* **Signed Peg-Marking Offset:**
  $$\text{Offset} = \text{Adjusted Design Level} - \text{Peg RL}$$
* **Direction Convention (Section 9.3):**
  * **Positive ($> 0$):** Measured and marked **UPWARD** from the top of the peg.
  * **Negative ($< 0$):** Measured and marked **DOWNWARD** from the top of the peg.
  * **Zero ($= 0$):** On level.
* **Worked Example (Section 9.2):**
  | Item | Value |
  |---|---|
  | Centre Design RL | 1,829,764 mm |
  | Allowance | +300 mm |
  | **Adjusted Design Level** | **1,830,064 mm** |
  | Left Peg RL | 1,830,009 mm $\rightarrow$ **+55 mm upward** |
  | Right Peg RL | 1,830,045 mm $\rightarrow$ **+19 mm upward** |
* Includes a graphical **Visual Peg Marking Diagram** with offset arrows.

### 3. Dipping & Thread-to-Ground Correction (Section 10)
* **Formula:**
  $$\text{Correction} = \text{Actual Measurement} - \text{Target Measurement}$$
  * **Actual > Target (+):** Reported as **FILL** (e.g. Target 38 cm, Actual 42 cm $\rightarrow$ **Fill 4 cm / 40 mm**).
  * **Actual < Target (-):** Reported as **CUT** (e.g. Target 38 cm, Actual 32 cm $\rightarrow$ **Cut 6 cm / 60 mm**).
  * **Actual = Target (0):** **No correction required (On target)**.
* Interactive cross-section diagram showing stretched thread, target grade line, ground profile, and cut/fill arrow.

### 4. Road Beacon & Benchmark Register (Section 7)
* Compares calculated reduced levels with official known beacon RLs:
  $$\text{Difference} = \text{Calculated RL} - \text{Known RL}$$
* **Configurable Survey Tolerance:** Supports project-defined limits (e.g. $\pm 10\text{ mm}$); defaults to `Tolerance Not Configured` until explicitly set by the engineer (Section 7.2).

### 5. On-Device Field Book OCR & Human Review (Section 11)
* **100% Offline Optical Character Recognition:** Powered by client-side Web Workers (Tesseract.js). Photos never leave the phone.
* Image pre-processing: canvas rotation (90° increments), contrast enhancement, and grayscaling for faint site handwriting.
* **Human-in-the-Loop Safety:** Extracted values are marked *Pending Review* with uncertain digits highlighted in amber. Readings must be human-confirmed before being accepted into calculations.

### 6. Reports, Multi-Sheet Excel & Audit Trail (Sections 5.3 & 14)
* **Multi-Sheet Excel Workbook Export (`.xlsx`):**
  1. `Project Summary`
  2. `Field Book`
  3. `Reduced Levels` (Collimation & Rise/Fall)
  4. `Design Levels`
  5. `Peg Setting-Out`
  6. `Dipping Corrections`
  7. `Beacon Checks`
  8. `Audit Log`
* **Audit Trail:** Preserves full history of any edited observations with previous value, corrected value, timestamp, and reason.
* **Full JSON Backup & Restore:** Safeguards project databases locally with zero reliance on cloud servers.

---

## 🛠️ Architecture & Offline-First Tech Stack

* **Platform:** Installable Progressive Web App (PWA) with Service Worker precaching (`vite-plugin-pwa`) and Web App Manifest.
* **Local Database:** Dexie.js (IndexedDB wrapper) with reactive live queries (`useLiveQuery`).
* **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons.
* **Excel Engine:** SheetJS (`xlsx`) for multi-sheet workbook generation and CSV mapping.
* **OCR Engine:** Tesseract.js running 100% locally in browser Web Workers.
* **Test Suite:** Vitest automated tests verifying all mathematical formulas.

---

## 🚀 Running the Project

### Prerequisites
* Node.js $\ge 18$
* npm

### Install Dependencies
```bash
npm install
```

### Run Local Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in Chrome or mobile browser.

### Run Unit Tests
```bash
npx vitest run
```

### Production Build
```bash
npm run build
```
Generates offline-ready service worker and PWA bundle in `dist/`.

---

## 📱 Mobile Installation (Android / iOS)
1. Open RoadLevel in Chrome on Android (or Safari on iOS).
2. Tap the browser menu ($\vdots$ or Share).
3. Select **"Add to Home Screen"** or **"Install Application"**.
4. RoadLevel will install as a standalone full-screen application and continue working seamlessly even in airplane mode with zero mobile reception.
