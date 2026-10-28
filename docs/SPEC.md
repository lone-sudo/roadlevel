# ROADLEVEL
## Product Requirements, Technical Specification and Development Blueprint

**Document status:** Draft for technical implementation  
**Working name:** RoadLevel  
**Primary platform:** Android smartphone  
**Secondary platform:** Laptop/desktop browser  
**Operating mode:** Offline-first  
**Primary purpose:** Road levelling, reduced-level calculations, peg setting-out, dipping corrections and survey record management  
**Intended users:** Road construction site personnel, survey assistants, site engineers and technicians

---

# PART I — PRODUCT DEFINITION

## 1. Product vision

RoadLevel is an offline-first digital field assistant designed around practical road construction surveying.

It will replace repetitive manual calculations and help digitise the paper field book without removing the user's control over survey observations.

The application will support two distinct but related workflows:

1. **Ground-level surveying:** Recording dumpy-level observations, calculating reduced levels, managing instrument setups and checking benchmarks.
2. **Road dipping and peg setting-out:** Comparing design levels with peg levels, calculating marking offsets, recording thread-to-ground distances and determining cut or fill corrections.

Additional capabilities will include design-level imports, beacon verification, photographing handwritten field books, editable extraction of readings, reports, CSV/Excel exchange and local backups.

## 2. Core principles

RoadLevel must follow these principles throughout development:

- **Accuracy first:** Calculations must follow explicit formulas and verified units.
- **Offline first:** Core operations must work without internet connectivity.
- **No silent guessing:** Missing or uncertain observations must remain missing or uncertain.
- **Traceability:** Every result must be traceable to its source observations and settings.
- **Separation of concerns:** Raw observations, calculated RLs, design values, peg-marking offsets and dipping corrections must remain distinct.
- **Configurable site procedures:** Allowances, targets, tolerances and chainage intervals must not be hardcoded as universal surveying rules.
- **Human confirmation:** OCR-extracted observations require review before they enter calculations.
- **Recoverability:** Projects must support export, backup and restore.
- **Practical usability:** The interface must be quick to use on a smartphone at a construction site.

RoadLevel is a calculation and record-keeping assistant. It does not replace approved drawings, survey specifications, independent checks or engineering judgement.

## 3. Initial release scope

### Included in the first usable release

- Project management.
- Digital field book.
- Height of Instrument/Height of Collimation calculations.
- Rise and Fall calculations.
- Multiple instrument setups.
- BM, TBM, CP and road beacon records.
- Chainage and offset management.
- Design-level entry and import.
- Existing-ground versus design-level comparison.
- Peg-marking calculations using a configurable allowance.
- Dipping target and actual measurement entry.
- Cut/fill/zero correction calculations.
- Local storage and offline operation.
- CSV import/export.
- Calculation checks and validation warnings.
- Basic reports.
- Project backup and restore.

### Deferred until the core is proven

- Automatic derivation of crossfall targets from approved road geometry.
- Advanced handwriting recognition.
- Earthwork volume calculations.
- Cloud synchronisation.
- Multi-user collaboration.
- Automatic fetching of design data from external systems.
- Advanced profile and cross-section visualisation.

The deferred features must not delay the validation of the core surveying calculations.

---

# PART II — NUMERICAL AND UNIT CONVENTIONS

## 4. Internal unit standard

The most important technical decision is to use one unambiguous internal representation for every quantity.

### 4.1 Reduced levels and level differences

Store reduced levels and level differences as **integer millimetres**.

The user's field convention is:

- `1830009` means 1,830.009 m.
- `1830045` means 1,830.045 m.
- `1829764` means 1,829.764 m.

Therefore:

RL(m) = RL(mm) / 1000, and RL(mm) = RL(m) × 1000.

When converting a value in metres to the internal integer representation, the application must check whether the value is representable to the selected millimetre precision. It must not silently discard meaningful precision.

### 4.2 Staff readings

Staff readings should be stored as integer millimetres where the source precision permits it.

For example, a staff reading of 1.250 m becomes 1,250 mm.

The UI may display the reading in metres, but its internal representation must be explicit.

### 4.3 Dipping distances

Store dipping targets and actual measurements as integer millimetres.

Examples:

- 22 cm = 220 mm.
- 24 cm = 240 mm.
- 30 cm = 300 mm.
- 38 cm = 380 mm.
- 42 cm = 420 mm.

### 4.4 Configured allowances

Store the peg-marking allowance as an integer number of millimetres.

The current site example uses `+300 mm`.

### 4.5 Why integer units matter

Using integer millimetres for the principal level and distance calculations reduces floating-point rounding issues and makes the results easier to test.

The application may use decimal representations during import or display conversion, but it must validate and convert them to the internal unit convention at the boundary.

The UI must always show the unit and must distinguish between metres, centimetres and millimetres.

---

# PART III — EXACT CALCULATION SPECIFICATION

## 5. Height of Instrument method

For an instrument setup:

HI = RL_reference + BS

For any point observed from that setup:

RL_point = HI − StaffReading

With internal millimetre units:

HI_mm = RL_reference_mm + BS_mm  
RL_point_mm = HI_mm − StaffReading_mm

### Example

Known benchmark RL = 100,000 mm  
Backsight = 1,250 mm

HI = 100000 + 1250 = 101250 mm

Intermediate sight = 1,875 mm

RL = 101250 − 1875 = 99375 mm

Displayed result: **99.375 m**.

### Required validation

- A setup must have a valid reference RL before the HI can be calculated.
- A backsight must be present to calculate HI.
- The staff reading must be valid and non-negative.
- An RL must not be presented as complete if its required inputs are missing.
- Each calculated RL must retain links to the setup and source observation.
- The app must not carry an HI into a new setup unless that setup has been explicitly established.

## 6. Change-point and multiple-setup handling

When an instrument is moved, the next setup must be established from a known reference point, typically a previously observed CP.

For setup 1:

HI_1 = RL_BM + BS_1

For the change point:

RL_CP = HI_1 − FS_CP

For setup 2:

HI_2 = RL_CP + BS_2

A new point observed from setup 2 then has:

RL_point = HI_2 − StaffReading

The application must not use the previous setup's HI to calculate observations made after the instrument has been moved.

A CP should be identifiable as the same physical point across the two setups. The FS from the previous setup and BS from the next setup must refer to that same point.

The app should flag a new setup if the required reference or backsight is missing.

## 7. Rise and Fall method

For consecutive valid staff readings:

Δ = Reading_previous − Reading_current

If Δ > 0, the current point is a rise relative to the previous point.

If Δ < 0, the current point is a fall relative to the previous point.

If Δ = 0, there is no rise or fall.

Define:

Rise = max(Δ, 0)  
Fall = max(−Δ, 0)

Then:

RL_current = RL_previous + Rise − Fall

This formula applies to consecutive readings that are valid for comparison within the same levelling sequence. Change-point and instrument-setup transitions require the appropriate setup handling and must not be treated as ordinary consecutive ground points without validation.

## 8. Levelling arithmetic checks

### 8.1 Height of Instrument check

For a valid levelling run:

ΣBS − ΣFS = RL_last − RL_first

All terms must use the same units.

The app should display:

- Sum of BS readings.
- Sum of FS readings.
- Difference between the sums.
- Difference between the last and first RL.
- Arithmetic discrepancy.
- Check status.

Define the arithmetic discrepancy as:

E_arith = (ΣBS − ΣFS) − (RL_last − RL_first)

The arithmetic check passes when E_arith = 0 for exact integer-millimetre arithmetic, provided all required records are complete and correctly included.

The check should be marked incomplete if required observations or endpoints are missing.

### 8.2 Rise and Fall check

ΣRise − ΣFall = RL_last − RL_first

The app should show this separately where the Rise and Fall method is being used.

### 8.3 Important limitation

A passed arithmetic check confirms an arithmetic relationship. It does not prove that every field observation was correct.

The app must keep arithmetic status separate from independent closure or known-point verification.

## 9. Existing ground versus design level

For a surveyed ground point with a corresponding design level:

D = RL_existing − RL_design

If D > 0: Cut = D.  
If D < 0: Fill = −D.  
If D = 0, the level difference is zero.

The app should display the signed difference and the interpreted cut or fill.

Both RLs must refer to the same chainage, position, offset convention and vertical datum. If they do not, the app must not produce a final comparison without an explicit user resolution of the mismatch.

This calculation is not the same as the thread-to-ground dipping correction.

## 10. Peg-marking calculation

### 10.1 Formula

Let:

- RL_C = centreline design RL in millimetres.
- A = configured peg-marking allowance in millimetres.
- RL_P = individual peg RL in millimetres.

The adjusted design level is:

RL_A = RL_C + A

The signed peg-marking offset is:

M = RL_A − RL_P

### 10.2 Direction convention

Under the user's current site convention:

- M > 0: mark upward from the top of the peg by M mm.
- M < 0: mark downward from the top of the peg by |M| mm.
- M = 0: no offset is required by this calculation.

The application must display the sign, magnitude and direction in words.

The site convention should be stored in project settings so that a different project can use a different convention if required. The current positive-upward and negative-downward rule is the default for this specification.

### 10.3 Confirmed example

Centreline design RL:

RL_C = 1,829,764 mm

Configured allowance:

A = 300 mm

Adjusted level:

RL_A = 1,829,764 + 300 = 1,830,064 mm

Left peg:

RL_L = 1,830,009 mm  
M_L = 1,830,064 − 1,830,009 = +55 mm

Result: **Mark 55 mm upward from the top of the left peg.**

Right peg:

RL_R = 1,830,045 mm  
M_R = 1,830,064 − 1,830,045 = +19 mm

Result: **Mark 19 mm upward from the top of the right peg.**

The app must retain 55 mm and 19 mm as the calculated results. If the user wants to record a rounded ruler mark, that must be a separate field and must not overwrite the exact result.

### 10.4 Required checks

- The centreline design RL must exist.
- The configured allowance must be explicit.
- The peg RL must exist.
- The peg must be associated with the correct project and applicable chainage.
- The app must not substitute a left or right design RL for the centreline design RL unless the selected procedure explicitly requires it.
- If the intended centreline design level cannot be identified unambiguously, the calculation must be blocked pending user selection.

## 11. Dipping correction

Let:

- T = target thread-to-ground distance in millimetres.
- A = actual measured thread-to-ground distance in millimetres.
- D = A − T = signed difference.

Then:

D = A − T

If D > 0: Fill = D.  
If D < 0: Cut = −D.  
If D = 0, the result is zero correction.

### Example A: Fill

Target = 380 mm  
Actual = 420 mm  
D = 420 − 380 = +40 mm

Result: **Fill 40 mm.**

### Example B: Cut

Target = 380 mm  
Actual = 320 mm  
D = 320 − 380 = −60 mm

Result: **Cut 60 mm.**

### Example C: Zero

Target = 300 mm  
Actual = 300 mm  
D = 300 − 300 = 0 mm

Result: **Zero correction.**

The same calculation applies to target distances of 220 mm, 240 mm, 300 mm, 380 mm or any other valid configured target.

### Important distinction

This formula follows the user's confirmed thread-to-ground convention. It must not be replaced with the general existing-ground-versus-design RL formula.

The application should show the actual measurement, target, signed difference, cut/fill interpretation and units.

## 12. Beacon verification

For a known beacon:

E_beacon = RL_calculated − RL_known

The difference should be shown in millimetres and metres as appropriate.

If a project tolerance τ has been explicitly configured:

- Within tolerance, if |E_beacon| ≤ τ
- Outside tolerance, if |E_beacon| > τ

If no tolerance is configured, the app must show the difference but label the tolerance status **Not configured**.

The app must not silently assume ±10 mm.

The tolerance source and any relevant specification reference should be stored with the project settings.

## 13. Crossfall and target-distance calculations

The initial release will allow targets to be entered manually or imported from a design schedule.

The app will not derive targets from crossfall until the project's geometric convention is confirmed.

A future implementation may calculate a vertical difference from a horizontal offset and a specified crossfall, but the following must be explicitly defined first:

- Whether crossfall is expressed as a percentage, ratio or angle.
- Which side is rising or falling.
- The reference position and reference level.
- Whether the target distance is based on a vertical difference, a thread height or another site-specific convention.
- How road camber, superelevation and transition sections are handled.
- Whether the approved design profile or a separately calculated cross-section governs the result.

Until those rules are agreed, manual or imported targets are the authoritative inputs.

---

# PART IV — DATABASE DESIGN

## 14. Storage decision

For the first Android-focused implementation, use an installable offline-first Progressive Web App (PWA) with IndexedDB for local storage.

IndexedDB is selected because it is available in modern browsers, supports structured records and can store images and other binary data locally.

The data model below is relational in concept. It should be designed so it can later be migrated to SQLite or another relational database if a native application becomes preferable.

The application must not require a server for its core calculations.

### Storage rules

- Use stable UUIDs for project and record IDs.
- Store raw observations separately from calculated results.
- Store levels and distances in integer millimetres.
- Store dates as ISO 8601 timestamps.
- Store configuration settings explicitly.
- Record the calculation or schema version used for each saved result where appropriate.
- Preserve original scanned images and extracted text.
- Keep an audit trail for changes to observations and configuration.
- Use database transactions where supported for multi-record updates.
- Provide a versioned backup format.
- Never use a displayed label as the sole identifier for a point.

## 15. Proposed entities and relationships

| Entity | Purpose |
|---|---|
| Project | Main project record and project settings. |
| Alignment | Road alignment or named road section. |
| DesignLevel | Approved design RL at a chainage and position. |
| SurveySession | A distinct field survey or work session. |
| InstrumentSetup | One instrument position and its associated HI calculation. |
| SurveyPoint | A benchmark, CP, beacon, ground point, peg or another physical point. |
| Observation | Raw BS, IS, FS or other staff reading. |
| CalculatedLevel | Derived RL and HI results linked to source records. |
| BeaconCheck | Calculated-versus-known RL comparison. |
| DippingObservation | Target and actual thread-to-ground measurement. |
| PegMarkCalculation | Adjusted level and signed peg-marking offset. |
| FieldBookImage | Original photograph and its metadata. |
| ExtractionRecord | OCR output, uncertainty information and review status. |
| AuditEvent | History of important changes. |
| AppSettings | App-level preferences that do not belong to an individual project. |

Relationships:

- One project can contain several alignments.
- One alignment can contain many design levels and survey points.
- One project can contain many survey sessions.
- One survey session can contain many instrument setups.
- One instrument setup can contain many observations.
- An observation refers to a survey point and an instrument setup.
- A calculated level refers to its source observation and calculation inputs.
- A beacon check refers to a known beacon and a calculated RL.
- A dipping observation refers to a project, chainage and relevant point.
- A peg-mark calculation refers to the selected centreline design level, the configured allowance and the peg RL.
- A field-book image can have one or more extraction revisions.
- Audit events refer to the records they change.

## 16. Detailed logical schema

The following is the proposed logical structure. A PWA implementation will map these entities to IndexedDB object stores with indexes and validated relationships.

### 16.1 Project

Fields:

- `id`: UUID, primary identifier.
- `name`: required string.
- `road_name`: optional string.
- `description`: optional string.
- `default_chainage_interval_mm`: integer, for example 20000.
- `default_peg_allowance_mm`: integer, initially 300 where the current site procedure is selected.
- `default_level_unit`: display preference.
- `peg_mark_convention`: configured enum.
- `beacon_tolerance_mm`: nullable integer.
- `beacon_tolerance_source`: nullable string.
- `created_at`: timestamp.
- `updated_at`: timestamp.
- `schema_version`: integer.
- `archived`: boolean.

The 300 mm allowance is a project setting, not a universal default for all projects. A new project should require the user to confirm or select the applicable setting.

### 16.2 Alignment

Fields:

- `id`: UUID.
- `project_id`: project reference.
- `name`: required string.
- `start_chainage_mm`: integer, where applicable.
- `end_chainage_mm`: integer, where applicable.
- `description`: optional string.
- `created_at`: timestamp.

### 16.3 DesignLevel

Fields:

- `id`: UUID.
- `project_id`: project reference.
- `alignment_id`: alignment reference.
- `chainage_mm`: integer.
- `position_type`: centre, left, right or offset.
- `offset_mm`: nullable integer.
- `design_rl_mm`: integer.
- `revision`: optional string.
- `source_reference`: optional string.
- `created_at`: timestamp.
- `updated_at`: timestamp.

Duplicate design levels at the same chainage, offset and revision should be detected. The app should request a resolution rather than silently replacing an existing design value.

### 16.4 SurveySession

Fields:

- `id`: UUID.
- `project_id`: project reference.
- `alignment_id`: optional alignment reference.
- `name`: string.
- `date_started`: timestamp.
- `date_completed`: nullable timestamp.
- `notes`: optional string.
- `status`: open, completed or archived.

### 16.5 SurveyPoint

Fields:

- `id`: UUID.
- `project_id`: project reference.
- `alignment_id`: optional alignment reference.
- `point_code`: user-visible identifier.
- `point_type`: BM, TBM, CP, beacon, ground point, peg or other.
- `chainage_mm`: nullable integer.
- `offset_mm`: nullable integer.
- `position_type`: nullable centre, left, right or offset.
- `known_rl_mm`: nullable integer.
- `known_rl_source`: nullable string.
- `description`: optional string.
- `created_at`: timestamp.
- `updated_at`: timestamp.

Point codes may repeat across different projects, but the application should warn about ambiguous duplicates within the relevant project or session.

### 16.6 InstrumentSetup

Fields:

- `id`: UUID.
- `session_id`: survey-session reference.
- `setup_number`: integer.
- `reference_point_id`: nullable point reference.
- `reference_rl_mm`: nullable integer snapshot used for the calculation.
- `backsight_observation_id`: nullable observation reference.
- `hi_mm`: nullable integer.
- `status`: draft, complete or invalid.
- `notes`: optional string.
- `created_at`: timestamp.
- `updated_at`: timestamp.

The reference RL snapshot and source reference make it possible to reproduce the calculation. If the underlying known RL changes, the app should flag affected calculations for review rather than silently changing a completed report.

### 16.7 Observation

Fields:

- `id`: UUID.
- `session_id`: survey-session reference.
- `setup_id`: instrument-setup reference.
- `point_id`: survey-point reference.
- `reading_type`: BS, IS or FS.
- `staff_reading_mm`: integer.
- `sequence_number`: integer.
- `source_type`: manual, imported or OCR.
- `review_status`: confirmed, pending review or rejected.
- `remarks`: optional string.
- `created_at`: timestamp.
- `updated_at`: timestamp.

Raw observations must remain separate from derived RLs.

An observation imported through OCR cannot be considered confirmed until the user has reviewed it.

### 16.8 CalculatedLevel

Fields:

- `id`: UUID.
- `session_id`: survey-session reference.
- `setup_id`: instrument-setup reference.
- `point_id`: survey-point reference.
- `source_observation_id`: observation reference, where applicable.
- `method`: HI/HOC or Rise and Fall.
- `rl_mm`: nullable integer.
- `hi_mm`: nullable integer.
- `calculation_status`: complete, incomplete or invalid.
- `calculation_version`: string.
- `input_snapshot`: structured representation of the relevant inputs.
- `calculated_at`: timestamp.

Calculated values should be reproducible from their source inputs. The application may recalculate them after an observation changes, but must retain an audit event and identify affected outputs.

### 16.9 BeaconCheck

Fields:

- `id`: UUID.
- `project_id`: project reference.
- `beacon_point_id`: survey-point reference.
- `calculated_level_id`: calculated-level reference.
- `known_rl_mm`: integer snapshot.
- `calculated_rl_mm`: integer snapshot.
- `difference_mm`: integer.
- `tolerance_mm`: nullable integer snapshot.
- `status`: within tolerance, outside tolerance, not configured or incomplete.
- `checked_at`: timestamp.
- `notes`: optional string.

### 16.10 PegMarkCalculation

Fields:

- `id`: UUID.
- `project_id`: project reference.
- `alignment_id`: alignment reference.
- `chainage_mm`: integer.
- `peg_point_id`: survey-point reference.
- `centre_design_level_id`: design-level reference.
- `centre_design_rl_mm`: integer snapshot.
- `allowance_mm`: integer snapshot.
- `adjusted_design_rl_mm`: integer.
- `peg_rl_mm`: integer snapshot.
- `mark_offset_mm`: integer.
- `mark_direction`: upward, downward or zero.
- `calculation_version`: string.
- `calculated_at`: timestamp.

The snapshot fields preserve the inputs used for the calculation. A changed design RL or allowance must trigger a recalculation review.

### 16.11 DippingObservation

Fields:

- `id`: UUID.
- `project_id`: project reference.
- `alignment_id`: alignment reference.
- `session_id`: optional survey-session reference.
- `chainage_mm`: integer.
- `point_id`: survey-point reference, where applicable.
- `position_type`: centre, left, right or offset.
- `offset_mm`: nullable integer.
- `target_mm`: integer.
- `actual_mm`: integer.
- `difference_mm`: integer.
- `result_type`: cut, fill or zero.
- `correction_mm`: integer magnitude.
- `target_source`: manual, imported or approved calculation.
- `calculation_version`: string.
- `measured_at`: timestamp.
- `remarks`: optional string.

The target and actual measurement must always be stored separately. The difference and result type are derived fields and must be recalculable.

### 16.12 FieldBookImage

Fields:

- `id`: UUID.
- `project_id`: project reference.
- `session_id`: optional survey-session reference.
- `image_blob`: local image data or reference to stored binary data.
- `original_filename`: optional string.
- `captured_at`: timestamp.
- `notes`: optional string.
- `review_status`: unprocessed, pending review or reviewed.

### 16.13 ExtractionRecord

Fields:

- `id`: UUID.
- `image_id`: field-book-image reference.
- `extraction_engine`: identifier for the local or optional online extraction method.
- `extracted_data`: structured extracted rows.
- `uncertainty_data`: structured list of uncertain fields.
- `review_status`: pending, partially reviewed, confirmed or rejected.
- `reviewed_at`: nullable timestamp.
- `created_at`: timestamp.

Extraction revisions must not overwrite the original image or silently erase previous review decisions.

### 16.14 AuditEvent

Fields:

- `id`: UUID.
- `project_id`: project reference.
- `entity_type`: record type.
- `entity_id`: affected record identifier.
- `action`: created, edited, confirmed, recalculated, imported or deleted.
- `previous_value`: optional structured snapshot.
- `new_value`: optional structured snapshot.
- `reason`: optional string.
- `occurred_at`: timestamp.

Where a record is deleted, the application should preserve an appropriate audit event. Important survey records should use archival or soft deletion where practical rather than immediate irreversible deletion.

### 16.15 AppSettings

Fields:

- `id`: stable settings key.
- `value`: validated structured value.
- `updated_at`: timestamp.

Use app settings for general display and interface preferences. Project-specific calculations must use the relevant project's settings instead.

---

# PART V — SCREEN-BY-SCREEN BEHAVIOUR

## 17. Screen 1: Project dashboard

### Purpose

Give the user a quick view of available projects and outstanding work.

### Interface

- Create project.
- Open recent project.
- Search projects.
- Archive project.
- Import project backup.
- Export project backup.
- Display recent activity and unresolved warnings.

### Behaviour

When a project is opened, the application loads its local records and configuration.

The dashboard should display useful status information, such as:

- Number of survey points.
- Number of completed instrument setups.
- Number of pending OCR reviews.
- Number of unresolved calculation warnings.
- Number of beacon checks without a configured tolerance.

### Validation

A project cannot be created with an empty name.

If the app has unsaved edits, navigation must not silently discard them.

## 18. Screen 2: Project setup and settings

### Purpose

Configure the values and conventions that affect calculations.

### Inputs

- Project name and road section.
- Default chainage interval.
- Peg-marking allowance.
- Peg-mark direction convention.
- Display units.
- Beacon tolerance, if confirmed.
- Tolerance source.
- Default cross-section positions and targets, where known.

### Behaviour

Settings that affect calculations must be visible and clearly labelled.

Changing a setting must not silently rewrite historical calculations. The application should identify which results need to be recalculated and allow the user to review the impact.

If the beacon tolerance is blank, beacon differences can still be calculated, but the tolerance-based status remains unconfigured.

## 19. Screen 3: Digital field book

### Purpose

Enter and review raw surveying observations.

### Inputs

- Session.
- Instrument setup.
- Point ID and type.
- Chainage and offset.
- BS, IS or FS.
- Staff reading.
- Remarks.

### Behaviour

The user selects a point type and reading type. The interface should show the relevant fields without overwhelming the screen.

The app should allow rapid sequential entry and suggest likely next chainages or point labels.

Suggestions must not copy staff readings or other measured values.

The app should show the raw reading before any calculated value and provide access to the associated HI and RL calculations.

### Validation

- Reading type must be valid.
- Staff reading must be non-negative.
- Required references must exist.
- Duplicate or ambiguous point references should be flagged.
- Missing values must not be interpreted as zero.
- Unconfirmed OCR entries cannot be treated as confirmed observations.

## 20. Screen 4: Instrument setup and RL calculator

### Purpose

Calculate HI, RLs and levelling checks.

### Behaviour

The user selects the HI/HOC method or Rise and Fall method.

For HI/HOC, the app displays:

- Reference point.
- Reference RL.
- BS.
- Calculated HI.
- Subsequent staff readings.
- Calculated RLs.

For Rise and Fall, it displays:

- Previous reading.
- Current reading.
- Rise or fall.
- Previous RL.
- Current RL.

The screen should provide a clear transition when a new instrument setup is created.

### Validation

A setup cannot be marked complete without its required reference and backsight.

The app must distinguish between an arithmetic check and independent closure verification.

## 21. Screen 5: Benchmarks and beacons

### Purpose

Manage known reference levels and compare computed RLs with them.

### Behaviour

The user creates or selects a BM, TBM or beacon and enters the known RL and its source.

When a calculated RL is associated with a known beacon, the app calculates the signed difference and displays the configured tolerance status.

The app should make the following statuses visually distinct:

- Within configured tolerance.
- Outside configured tolerance.
- Tolerance not configured.
- Comparison incomplete.
- Reference data requires review.

The app must never claim a point has passed an independent survey check when only an arithmetic check has been completed.

## 22. Screen 6: Design levels

### Purpose

Enter, import and inspect the approved road design profile.

### Behaviour

The user can:

- Enter a design level manually.
- Import a CSV or Excel file.
- Select a chainage interval.
- Generate suggested chainages.
- Assign centreline, left, right or offset positions.
- Review design revisions.
- Compare design values with existing ground levels.

The import process must display a preview and require the user to map columns and resolve ambiguous units before saving.

Duplicate chainage-position-revision combinations should be flagged rather than silently overwritten.

## 23. Screen 7: Peg setting-out

### Purpose

Calculate the adjusted design level and signed marking offset for each peg.

### Inputs

- Chainage.
- Centreline design RL.
- Configured allowance.
- Peg ID.
- Peg RL.
- Optional side or offset.
- Optional field-marking note.

### Behaviour

The app calculates the adjusted design level once for the selected centreline design level and allowance, then calculates each selected peg's marking offset.

Results should be displayed in a table:

| Peg | Peg RL | Adjusted design level | Offset | Instruction |
|---|---:|---:|---:|---|
| Left peg | 1,830,009 mm | 1,830,064 mm | +55 mm | Mark 55 mm upward |
| Right peg | 1,830,045 mm | 1,830,064 mm | +19 mm | Mark 19 mm upward |

The app should show exact values first. Any optional rounded field-marking value must be separate and clearly labelled.

## 24. Screen 8: Dipping

### Purpose

Record target and actual thread-to-ground measurements and calculate corrections.

### Inputs

- Chainage.
- Point or peg ID.
- Centre, left, right or offset position.
- Target distance.
- Actual measurement.
- Unit.
- Remarks.

### Behaviour

The target may be selected from a configured position-specific value or entered manually.

The app calculates the difference and displays:

- Target.
- Actual measurement.
- Signed difference.
- Cut, fill or zero.
- Correction magnitude.

The app must not infer that the target is 30 cm at the centre or 38 cm at the sides unless the applicable project configuration says so.

A missing target blocks the calculation.

## 25. Screen 9: Scan field book

### Purpose

Convert paper field-book pages into reviewable digital records.

### Behaviour

The user takes a photograph or imports an image.

The application may crop or rotate the image and run available extraction.

The review screen must display:

- Original image.
- Extracted rows and columns.
- Uncertain values.
- Editable values.
- Confirmation status.

The user must confirm readings before they are used in calculations.

The app must not guess unclear digits to complete a sequence or make arithmetic checks pass.

The original image must remain linked to the resulting records.

## 26. Screen 10: Reports and exports

### Purpose

Generate useful records for checking, sharing and archiving.

### Report types

- Field book.
- Instrument setup and HI report.
- Reduced-level report.
- Design versus existing-ground comparison.
- Beacon verification report.
- Peg setting-out report.
- Dipping correction report.
- Project summary and audit report.

### Behaviour

The user selects the project, session, alignment and chainage range.

The app previews the report and identifies unresolved issues before export.

Exports should preserve units, signs, source values and calculation statuses.

CSV and Excel exports must not imply that incomplete or unverified records are approved.

## 27. Screen 11: Backup and restore

### Purpose

Protect project data against device loss, browser-data clearing or accidental deletion.

### Behaviour

The user can export a versioned project backup containing the records, settings, audit information and associated images.

The user can restore a backup after a preview and validation step.

The app must detect invalid or incompatible backup versions and explain the problem.

A restore must not silently overwrite an existing project with the same name. The user should be able to restore as a new project or explicitly replace an existing one after confirmation.

---

# PART VI — TECHNICAL ARCHITECTURE

## 28. Recommended first implementation

Use an installable PWA for the initial Android-focused release.

### Front end

Use a lightweight TypeScript-based web interface with a component structure that supports responsive layouts and offline use.

A framework such as React is a reasonable implementation choice, but the specific framework should be selected by the developer before coding and recorded in the project journal.

### Local storage

Use IndexedDB for projects, observations, calculated records, settings, audit events and images.

Create a versioned data-access layer so the UI does not access IndexedDB directly throughout the codebase.

### Offline application shell

Use a service worker to cache the application shell and required static assets.

The app must clearly distinguish between:

- Available offline.
- Data saved locally.
- Export completed.
- A feature requiring optional online access.

The core calculators must not require a network request.

### Calculation engine

Keep calculations in a dedicated, deterministic module that is independent of the UI.

The calculation module should accept validated inputs and return structured outputs containing:

- Calculated values.
- Units.
- Calculation method and version.
- Validation messages.
- Status.

It should not write directly to the database or manipulate UI state.

### Import and export

Use a separate module for CSV parsing, spreadsheet processing, backup serialization and validation.

Excel support must be tested with the intended library and real sample workbooks.

### Image processing

The first release may support image capture and local storage before implementing advanced handwriting recognition.

The OCR component must be replaceable and must not be tightly coupled to the calculation engine.

### Architecture diagram

```
Android phone / laptop browser
          |
          v
Responsive PWA interface
          |
          +---- Field book and project workflows
          |
          +---- Calculation engine
          |       +---- HI/HOC
          |       +---- Rise and Fall
          |       +---- Beacon checks
          |       +---- Peg setting-out
          |       +---- Dipping corrections
          |
          +---- Import/export module
          |
          +---- Scan and review module
          |
          v
Local data-access layer
          |
          v
IndexedDB
          +---- Projects and settings
          +---- Observations and calculated levels
          +---- Images and extraction records
          +---- Audit events
```

## 29. Implementation decisions

| Area | Decision |
|---|---|
| Primary platform | Installable PWA |
| Initial target | Android smartphone |
| Secondary access | Laptop/desktop browser |
| Core calculations | Local deterministic calculation module |
| Local database | IndexedDB |
| Internal level units | Integer millimetres |
| Internal dipping units | Integer millimetres |
| Identifiers | UUIDs |
| Core network dependency | None |
| Main import/export | CSV, then Excel workbook support |
| Backups | Versioned local export and restore |
| OCR | Separate replaceable module; test before promising accuracy |
| Cloud synchronisation | Deferred |
| Crossfall derivation | Deferred pending confirmed formula |
| Beacon tolerance | Configurable; no unconfirmed fixed tolerance |
| Calculation history | Input snapshots and audit events |
| User confirmation | Required for uncertain OCR data |

These are proposed implementation decisions. If a prototype reveals that the PWA cannot reliably meet offline storage or local scanning requirements on the target phone, the architecture should be reassessed before investing in advanced features.

## 30. Data integrity and recalculation rules

When an input changes, the app must identify its dependent calculations.

Examples:

- Changing a staff reading may affect the HI/RL results and subsequent calculations in that setup.
- Changing a CP-related observation may affect later setups that use that CP.
- Changing a design RL may affect its associated peg-marking calculation and design comparison.
- Changing the peg allowance may affect peg-marking results.
- Changing a dipping target or actual measurement affects the dipping correction.
- Changing a beacon tolerance affects the status classification but not the calculated RL difference.

The application must not overwrite source observations when recalculating.

Each recalculation should use the current validated inputs and retain an audit event. The UI should indicate that dependent results have been recalculated.

If an edit makes an observation sequence invalid, the app should mark affected results incomplete or invalid rather than continuing to display stale results as current.

---

# PART VII — TESTING SPECIFICATION

## 31. Testing strategy

Testing must happen at three levels:

1. **Unit tests:** Individual formulas and validation rules.
2. **Workflow tests:** Multiple related records and screen behaviour.
3. **Device acceptance tests:** Offline operation, persistence, import/export and usability on the intended Android phone and laptop.

The calculation engine must be tested independently of the UI.

Expected results must be specified before the tests run. The application must not be validated merely by comparing its output against its own calculation code.

## 32. Core calculation test cases

### Test 1: Height of Instrument

Inputs: Known RL = 100,000 mm; BS = 1,250 mm; IS = 1,875 mm.
Expected: HI = 101,250 mm; Point RL = 99,375 mm. Result must match exactly.

### Test 2: Foresight to change point

Inputs: HI = 101,250 mm; FS = 2,000 mm.
Expected: CP RL = 99,250 mm.

### Test 3: New instrument setup

Inputs: CP RL = 99,250 mm; New BS = 1,500 mm.
Expected: New HI = 100,750 mm. The app must not reuse the old HI of 101,250 mm.

### Test 4: Rise

Inputs: Previous reading = 1,800 mm; Current reading = 1,500 mm; Previous RL = 100,000 mm.
Expected: Rise = 300 mm; Fall = 0 mm; Current RL = 100,300 mm.

### Test 5: Fall

Inputs: Previous reading = 1,500 mm; Current reading = 1,900 mm; Previous RL = 100,300 mm.
Expected: Rise = 0 mm; Fall = 400 mm; Current RL = 99,900 mm.

### Test 6: Arithmetic check passes

Inputs: First RL = 100,000 mm; Sum BS = 3,500 mm; Sum FS = 2,000 mm; Last RL = 101,500 mm.
Expected: Sum BS − sum FS = 1,500 mm; Last RL − first RL = 1,500 mm; Arithmetic discrepancy = 0 mm; Status = Passed, provided all required observations are complete.

### Test 7: Arithmetic check fails

Use the same values as Test 6 but set the last RL to 101,400 mm.
Expected: Discrepancy = 100 mm; Status = Failed. The app must not silently adjust an RL to make the check pass.

### Test 8: Incomplete levelling run

Inputs: Missing required foresight or endpoint.
Expected: Arithmetic check = Incomplete. No claim of independent verification. Missing input clearly identified.

### Test 9: Peg-marking left peg

Inputs: Centre design RL = 1,829,764 mm; Allowance = 300 mm; Peg RL = 1,830,009 mm.
Expected: Adjusted level = 1,830,064 mm; Offset = +55 mm; Direction = Upward.

### Test 10: Peg-marking right peg

Inputs: Centre design RL = 1,829,764 mm; Allowance = 300 mm; Peg RL = 1,830,045 mm.
Expected: Adjusted level = 1,830,064 mm; Offset = +19 mm; Direction = Upward.

### Test 11: Negative peg-marking offset

Inputs: Adjusted design level = 1,830,000 mm; Peg RL = 1,830,060 mm.
Expected: Offset = −60 mm; Direction = Downward; Magnitude = 60 mm.

### Test 12: Zero peg-marking offset

Inputs: Adjusted design level = 1,830,000 mm; Peg RL = 1,830,000 mm.
Expected: Offset = 0 mm; Direction = Zero. No rounding or invented offset.

### Test 13: Dipping fill

Inputs: Target = 380 mm; Actual = 420 mm.
Expected: Difference = +40 mm; Result = Fill; Correction magnitude = 40 mm.

### Test 14: Dipping cut

Inputs: Target = 380 mm; Actual = 320 mm.
Expected: Difference = −60 mm; Result = Cut; Correction magnitude = 60 mm.

### Test 15: Dipping zero

Inputs: Target = 300 mm; Actual = 300 mm.
Expected: Difference = 0 mm; Result = Zero; Correction magnitude = 0 mm.

### Test 16: Different dipping target

Inputs: Target = 220 mm; Actual = 240 mm.
Expected: Difference = +20 mm; Result = Fill; Correction magnitude = 20 mm. This confirms that the same rule works for different targets.

### Test 17: Existing ground above design

Inputs: Existing ground RL = 1,830,050 mm; Design RL = 1,830,000 mm.
Expected: Difference = +50 mm; Result = Cut 50 mm.

### Test 18: Existing ground below design

Inputs: Existing ground RL = 1,829,950 mm; Design RL = 1,830,000 mm.
Expected: Difference = −50 mm; Result = Fill 50 mm.

### Test 19: Beacon within configured tolerance

Inputs: Known RL = 1,830,000 mm; Calculated RL = 1,830,008 mm; Explicitly configured tolerance = 10 mm.
Expected: Difference = +8 mm; Status = Within tolerance. This is a software test of the configured comparison rule, not a recommendation that the project should use a 10 mm tolerance.

### Test 20: Beacon outside configured tolerance

Inputs: Known RL = 1,830,000 mm; Calculated RL = 1,830,012 mm; Configured tolerance = 10 mm.
Expected: Difference = +12 mm; Status = Outside tolerance.

### Test 21: Beacon tolerance not configured

Inputs: Known RL = 1,830,000 mm; Calculated RL = 1,830,008 mm; No tolerance configured.
Expected: Difference = +8 mm; Status = Not configured. No automatic pass/fail classification based on an assumed tolerance.

## 33. Data integrity and workflow tests

### Test 22: Missing observation

Attempt to calculate an RL with no required staff reading.
Expected: Calculation is incomplete, and the missing field is identified.

### Test 23: Unreviewed OCR value

Import a field-book image with an uncertain staff reading.
Expected: The value is flagged and cannot be used as a confirmed observation until reviewed.

### Test 24: OCR correction

Change an extracted reading in the review screen.
Expected: The corrected value is saved, the original image is retained, and the edit appears in the audit trail.

### Test 25: Design level mismatch

Attempt to compare a ground point against a design level at a different chainage or incompatible offset.
Expected: The app blocks the comparison or requires explicit resolution of the mismatch.

### Test 26: Change-point mismatch

Use different point IDs for the FS and next setup's BS when the user intends them to refer to the same CP.
Expected: The app warns that the setup reference does not match. It must not silently assume that the points are identical.

### Test 27: Setting change

Change the peg allowance after peg-marking calculations exist.
Expected: Affected results are identified and recalculated only under the documented recalculation workflow. The previous results and change are traceable.

### Test 28: Duplicate design row

Import a second design level with the same chainage, position and revision.
Expected: Duplicate is flagged and the user is asked how to resolve it.

### Test 29: Backup and restore

Export a project, restore it and compare records.
Expected: Project settings, observations, calculations, images, IDs and audit information are preserved according to the backup specification.

### Test 30: Offline operation

Install the PWA, load a project, disable network access, then create and calculate new observations.
Expected: The core workflows continue to operate and save locally.

### Test 31: Browser restart

Save observations, close the browser, reopen the app and load the project.
Expected: Previously saved data remains available.

### Test 32: CSV round trip

Export valid project records to CSV, import them into a new test project and compare the values.
Expected: Values, signs, chainages and units are preserved without accidental metre/millimetre conversion.

### Test 33: Stale calculated result

Change a source observation after an RL has been calculated.
Expected: The dependent result is recalculated or visibly marked stale/incomplete. The app must not present the old result as current.

### Test 34: Missing target

Attempt a dipping calculation without a target.
Expected: No correction is calculated. The app requests the missing target.

### Test 35: Image preservation

Import a field-book image and create extracted observations.
Expected: The image remains linked to the records and can be reopened after the app restarts.

## 34. Acceptance criteria

The first release is acceptable only when:

- The specified calculation tests pass.
- The calculation engine does not depend on internet access.
- Multiple instrument setups are handled correctly.
- Raw observations remain distinct from calculated results.
- Peg-marking offsets follow the confirmed signed convention.
- Dipping corrections follow the confirmed target-versus-actual rule.
- Missing data cannot silently become zero.
- An unconfigured beacon tolerance is never treated as confirmed.
- OCR uncertainty is visible and requires human review.
- Data survives application restart.
- Backup and restore work on the target device.
- CSV import/export preserves values and units.
- The app distinguishes arithmetic checks from independent verification.
- The interface has been tested on the intended Android phone.
- Known limitations are documented before the app is used for construction decisions.

---

# PART VIII — IMPLEMENTATION PLAN

## 35. Recommended build order

### Milestone 1: Calculation engine

Build and test the pure calculation functions before designing the full application.

Deliverables: HI/HOC calculator; Rise and Fall calculator; Arithmetic checks; Peg-marking calculator; Dipping correction calculator; Existing-ground versus design comparison; Beacon difference and tolerance logic; Automated unit tests.

### Milestone 2: Local project and field-book interface

Deliverables: Project creation; IndexedDB persistence; Survey points; Instrument setups; Raw observation entry; Calculated RL display; Basic edit and audit behaviour.

### Milestone 3: Design levels and setting-out

Deliverables: Design-level records; Chainage management; Peg-marking screen; Dipping screen; Configurable project settings; Basic field reports.

### Milestone 4: Import, export and backup

Deliverables: CSV import/export; Excel workbook support; Project backup; Restore preview; Data validation and error reporting.

### Milestone 5: Beacons and verification

Deliverables: Known-point register; Beacon checks; Configurable tolerance; Closing-level status; Verification reports.

### Milestone 6: Field-book photography

Deliverables: Camera or image import; Image retention; Extraction preview; Manual review and correction; Audit trail for extracted values.

Basic image capture and manual transcription can be implemented before advanced handwriting recognition.

### Milestone 7: Field testing

Test the app with real field-book pages, actual chainage sequences and independently checked survey calculations.

Resolve usability issues before expanding the feature set.

## 36. Development governance

The developer should maintain a build journal documenting:

- Architecture decisions.
- Formula definitions.
- Data model changes.
- Test results.
- Bugs and fixes.
- Offline behaviour.
- Device compatibility.
- Features postponed or rejected.
- Known limitations.
- The reason behind significant changes.

Every milestone should have explicit acceptance criteria and should not be marked complete merely because the interface renders.

The app should be tested incrementally on the intended Android device rather than waiting until the entire product is built.

---

# PART IX — OPEN DECISIONS AND RISKS

## 37. Decisions that remain open

### 37.1 Beacon tolerance

The project's required tolerance remains unconfirmed. Implementation decision: store a nullable project tolerance. Display differences without declaring a tolerance-based pass/fail status until a valid tolerance is configured.

### 37.2 Crossfall-target derivation

The exact formula and reference convention are not yet confirmed. Implementation decision: allow manually entered or imported targets in the initial release. Do not invent a formula.

### 37.3 Peg-marking allowance

The current procedure uses +300 mm. Implementation decision: make the allowance configurable per project and record the value used for every calculation.

### 37.4 Rounding for field marking

The exact peg-marking offset must be preserved. Implementation decision: do not round automatically. If rounded field marks are useful, implement them as a separate optional display value with a clearly stated rounding rule.

### 37.5 Offline handwriting recognition

Recognition accuracy on the user's actual handwriting is unknown. Implementation decision: keep scanning and extraction modular, require review, and test before promising reliable offline recognition.

### 37.6 PWA versus native Android

A PWA is the recommended starting point, but its offline storage and image-processing behaviour must be validated on the target device. Implementation decision: reassess native Android only if the PWA fails a documented requirement.

## 38. Main risks and mitigation

| Risk | Mitigation |
|---|---|
| Incorrect survey formula | Independent test cases and documented calculation rules. |
| Mixed units | Integer internal units and explicit import validation. |
| Wrong CP linkage | Point identifiers and setup validation. |
| Incorrect OCR readings | Human review and original-image retention. |
| Stale calculated values | Dependency tracking and recalculation status. |
| Data loss | Local persistence, versioned backups and restore tests. |
| Unconfirmed tolerance | Nullable configuration and explicit status. |
| Incorrect crossfall assumptions | Defer automatic target derivation. |
| Browser storage cleared | Frequent user-controlled backups and clear warnings. |
| False confidence from arithmetic checks | Separate arithmetic status from independent verification. |

---

# 39. Final development directive

Build RoadLevel as a practical, offline-first road surveying assistant with a transparent calculation engine and a traceable local data model.

The first priority is to make the existing field workflow reliable:

1. Record raw dumpy-level observations.
2. Calculate HI and reduced levels across instrument setups.
3. Check arithmetic and reference points.
4. Import and compare approved design levels.
5. Calculate peg-marking offsets using the configured allowance.
6. Calculate dipping corrections from actual and target thread-to-ground measurements.
7. Save, review, export and back up the records.

Advanced handwriting recognition, automatic crossfall calculations, volume calculations and cloud features should follow only after the core workflow is tested.

The governing rule is:

**RoadLevel may automate arithmetic, validation and record-keeping, but it must never silently invent an observation, hide a failed check or turn an unconfirmed site convention into an authoritative surveying rule.**
