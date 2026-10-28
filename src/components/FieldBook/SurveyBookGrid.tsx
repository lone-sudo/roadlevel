import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Plus,
  Trash2,
  Download,
  Clipboard,
  CheckCircle2,
  RotateCw,
  X,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { FieldBookObservation, ProjectSettings, ArithmeticCheckResult } from '../../types/survey';
import {
  formatMeters,
  formatIntegerMm,
  reduceSurveyLevelBook,
} from '../../utils/surveyCalculations';
import { scanFieldBookImage, preprocessCanvas, ExtractedFieldBookRow } from '../../utils/ocrScanner';

interface SurveyBookGridProps {
  project: ProjectSettings;
  observations: FieldBookObservation[];
  arithmeticCheck: ArithmeticCheckResult;
  onSaveObservations: (obs: FieldBookObservation[]) => Promise<void>;
  onExportExcel: () => void;
  theme: 'light' | 'dark' | 'sunlight';
  onOpenFieldGuide: () => void;
}

export const SurveyBookGrid: React.FC<SurveyBookGridProps> = ({
  project,
  observations,
  arithmeticCheck: _arithmeticCheck,
  onSaveObservations,
  onExportExcel,
  theme,
  onOpenFieldGuide,
}) => {
  const isDark = theme === 'dark';
  const isSunlight = theme === 'sunlight';
  const isIntegerMm = project.unitConvention === 'mm_integer';

  // Benchmark Reference Elevation (Default: 1830.000 m or project default)
  const [benchmarkRL, setBenchmarkRL] = useState<string>('1830.000');
  const [readingUnit, setReadingUnit] = useState<'m' | 'mm'>('m'); // Allows typing 2.033 or 2033

  // Local grid rows state (for instant zero-lag typing)
  const [gridRows, setGridRows] = useState<FieldBookObservation[]>([]);

  // Focus target after new row insertion
  const [pendingFocus, setPendingFocus] = useState<{ row: number; col: number } | null>(null);

  // Camera / Scan Modal state
  const [showScanModal, setShowScanModal] = useState<boolean>(false);
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [processedPhotoSrc, setProcessedPhotoSrc] = useState<string | null>(null);
  const [rotationDeg, setRotationDeg] = useState<number>(0);
  const [isOcrRunning, setIsOcrRunning] = useState<boolean>(false);
  const [ocrProgressMsg, setOcrProgressMsg] = useState<string>('');
  const [ocrRows, setOcrRows] = useState<ExtractedFieldBookRow[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Sync incoming observations into gridRows
  useEffect(() => {
    if (observations && observations.length > 0) {
      setGridRows(observations);
      // If row 1 has a known RL, adopt it
      if (observations[0]?.knownRLM) {
        setBenchmarkRL(observations[0].knownRLM.toFixed(3));
      }
    } else {
      // Default 6 rows matching user's chainage setup
      const initialRows: FieldBookObservation[] = [
        {
          id: `row-init-1`,
          projectId: project.id,
          setupId: 'setup-1',
          setupNumber: 1,
          pointId: 'BM-01',
          pointType: 'BM',
          chainage: '1+340',
          chainageMeters: 1340,
          position: 'CL',
          offsetMeters: 0,
          backsightM: 0.323,
          intermediateSightM: null,
          foresightM: null,
          knownRLM: 1830.0,
          calculatedRL_HI: 1830.0,
          riseM: null,
          fallM: null,
          calculatedRL_RF: 1830.0,
          designRLM: null,
          remarks: 'Road Beacon Reference',
          source: 'manual',
          isReviewed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: `row-init-2`,
          projectId: project.id,
          setupId: 'setup-1',
          setupNumber: 1,
          pointId: '1+360 -4.5',
          pointType: 'GROUND',
          chainage: '1+360',
          chainageMeters: 1360,
          position: 'L',
          offsetMeters: -4.5,
          backsightM: null,
          intermediateSightM: 2.033,
          foresightM: null,
          knownRLM: null,
          calculatedRL_HI: null,
          riseM: null,
          fallM: null,
          calculatedRL_RF: null,
          designRLM: null,
          remarks: 'Left Edge (-4.5m)',
          source: 'manual',
          isReviewed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: `row-init-3`,
          projectId: project.id,
          setupId: 'setup-1',
          setupNumber: 1,
          pointId: '1+360 -3.0',
          pointType: 'GROUND',
          chainage: '1+360',
          chainageMeters: 1360,
          position: 'L',
          offsetMeters: -3.0,
          backsightM: null,
          intermediateSightM: 2.007,
          foresightM: null,
          knownRLM: null,
          calculatedRL_HI: null,
          riseM: null,
          fallM: null,
          calculatedRL_RF: null,
          designRLM: null,
          remarks: 'Left Lane (-3.0m)',
          source: 'manual',
          isReviewed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: `row-init-4`,
          projectId: project.id,
          setupId: 'setup-1',
          setupNumber: 1,
          pointId: '1+360 CL',
          pointType: 'GROUND',
          chainage: '1+360',
          chainageMeters: 1360,
          position: 'CL',
          offsetMeters: 0.0,
          backsightM: null,
          intermediateSightM: 2.008,
          foresightM: null,
          knownRLM: null,
          calculatedRL_HI: null,
          riseM: null,
          fallM: null,
          calculatedRL_RF: null,
          designRLM: null,
          remarks: 'Centreline (0.0)',
          source: 'manual',
          isReviewed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: `row-init-5`,
          projectId: project.id,
          setupId: 'setup-1',
          setupNumber: 1,
          pointId: '1+360 +3.0',
          pointType: 'GROUND',
          chainage: '1+360',
          chainageMeters: 1360,
          position: 'R',
          offsetMeters: 3.0,
          backsightM: null,
          intermediateSightM: 2.043,
          foresightM: null,
          knownRLM: null,
          calculatedRL_HI: null,
          riseM: null,
          fallM: null,
          calculatedRL_RF: null,
          designRLM: null,
          remarks: 'Right Lane (+3.0m)',
          source: 'manual',
          isReviewed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: `row-init-6`,
          projectId: project.id,
          setupId: 'setup-1',
          setupNumber: 1,
          pointId: '1+360 +4.5',
          pointType: 'GROUND',
          chainage: '1+360',
          chainageMeters: 1360,
          position: 'R',
          offsetMeters: 4.5,
          backsightM: null,
          intermediateSightM: 2.083,
          foresightM: null,
          knownRLM: null,
          calculatedRL_HI: null,
          riseM: null,
          fallM: null,
          calculatedRL_RF: null,
          designRLM: null,
          remarks: 'Right Edge (+4.5m)',
          source: 'manual',
          isReviewed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      setGridRows(initialRows);
    }
  }, [observations, project.id]);

  // Handle focus when row count changes
  useEffect(() => {
    if (pendingFocus) {
      const key = `${pendingFocus.row}-${pendingFocus.col}`;
      const input = inputRefs.current[key];
      if (input) {
        input.focus();
        input.select();
        setPendingFocus(null);
      }
    }
  }, [gridRows.length, pendingFocus]);

  // Calculate HI, Rise, Fall, RL in real time
  const { calculatedObservations, arithmeticCheck: liveCheck } = React.useMemo(() => {
    // Inject known benchmark elevation into row 0 if row 0 has BS and no known RL
    const rowsWithBM = gridRows.map((r, i) => {
      if (i === 0 && (r.backsightM !== null || r.pointType === 'BM')) {
        const bmVal = parseFloat(benchmarkRL);
        return {
          ...r,
          knownRLM: isNaN(bmVal) ? 1830.0 : bmVal,
        };
      }
      return r;
    });

    return reduceSurveyLevelBook(rowsWithBM);
  }, [gridRows, benchmarkRL]);

  // Debounced auto-save
  const debouncedSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerSave = (updatedRows: FieldBookObservation[]) => {
    if (debouncedSaveRef.current) clearTimeout(debouncedSaveRef.current);
    debouncedSaveRef.current = setTimeout(() => {
      onSaveObservations(updatedRows);
    }, 600);
  };

  // Helper to parse staff reading (handles e.g. 2033 -> 2.033 m or 2.033)
  const parseStaffInput = (val: string): number | null => {
    const clean = val.replace(/,/g, '').trim();
    if (clean === '') return null;
    const num = parseFloat(clean);
    if (isNaN(num)) return null;

    // If reading is typed as integer > 50 (like 2033 or 323), convert mm to m
    if (readingUnit === 'mm' || (!clean.includes('.') && num >= 50)) {
      return Number((num / 1000).toFixed(4));
    }
    return num;
  };

  // Cell change handler
  const handleCellChange = (
    index: number,
    field: keyof FieldBookObservation,
    value: string
  ) => {
    const updated = [...gridRows];
    const row = { ...updated[index] };

    if (field === 'backsightM' || field === 'intermediateSightM' || field === 'foresightM') {
      row[field] = parseStaffInput(value);
    } else if (field === 'offsetMeters') {
      const num = parseFloat(value.trim());
      row.offsetMeters = isNaN(num) ? null : num;
    } else {
      (row[field] as any) = value;
    }

    row.updatedAt = new Date().toISOString();
    updated[index] = row;
    setGridRows(updated);
    triggerSave(updated);
  };

  // Rock-Solid Keyboard Navigation: Enter moves down without mouse!
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number
  ) => {
    // ENTER or DOWN ARROW: Move to the same column on the next row
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();

      if (rowIndex === gridRows.length - 1) {
        // Last row: Create a new row and focus the same column!
        handleAddRow(colIndex);
      } else {
        // Move focus down to next row, same column
        const nextKey = `${rowIndex + 1}-${colIndex}`;
        const nextInput = inputRefs.current[nextKey];
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    }

    // UP ARROW: Move to the same column on the row above
    if (e.key === 'ArrowUp') {
      if (rowIndex > 0) {
        e.preventDefault();
        const prevKey = `${rowIndex - 1}-${colIndex}`;
        const prevInput = inputRefs.current[prevKey];
        if (prevInput) {
          prevInput.focus();
          prevInput.select();
        }
      }
    }

    // TAB: Default browser tab navigation moves across columns
  };

  // Add Row (with smart offset auto-advance)
  const handleAddRow = (focusCol = 3) => {
    const lastRow = gridRows[gridRows.length - 1];
    let nextChainage = lastRow?.chainage || '1+360';
    let nextOffset = 0.0;
    const offsetsSeq = [-4.5, -3.0, 0.0, 3.0, 4.5];

    if (lastRow?.offsetMeters !== null && lastRow?.offsetMeters !== undefined) {
      const curIdx = offsetsSeq.findIndex((o) => Math.abs(o - lastRow.offsetMeters!) < 0.1);
      if (curIdx >= 0 && curIdx < offsetsSeq.length - 1) {
        nextOffset = offsetsSeq[curIdx + 1];
        nextChainage = lastRow.chainage || '1+360';
      } else {
        // Advance chainage +20m and reset to -4.5
        nextOffset = -4.5;
        if (lastRow.chainage && lastRow.chainage.includes('+')) {
          const parts = lastRow.chainage.split('+');
          const km = parseFloat(parts[0]) || 0;
          const m = parseFloat(parts[1]) || 0;
          const nextM = m + (project.chainageIntervalDefault || 20);
          nextChainage = `${km}+${nextM < 100 ? (nextM < 10 ? '00' + nextM : '0' + nextM) : nextM}`;
        }
      }
    }

    const posTag = nextOffset < 0 ? 'L' : nextOffset > 0 ? 'R' : 'CL';
    const pointLabel = `${nextChainage} ${nextOffset !== 0 ? (nextOffset > 0 ? '+' + nextOffset : nextOffset) : 'CL'}`;

    const newRow: FieldBookObservation = {
      id: `row-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      projectId: project.id,
      setupId: 'setup-1',
      setupNumber: 1,
      pointId: pointLabel,
      pointType: 'GROUND',
      chainage: nextChainage,
      chainageMeters: null,
      position: posTag as any,
      offsetMeters: nextOffset,
      backsightM: null,
      intermediateSightM: null,
      foresightM: null,
      knownRLM: null,
      calculatedRL_HI: null,
      riseM: null,
      fallM: null,
      calculatedRL_RF: null,
      designRLM: null,
      remarks: nextOffset !== 0 ? `${nextOffset > 0 ? 'Right' : 'Left'} (${nextOffset}m)` : 'Centreline',
      source: 'manual',
      isReviewed: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setPendingFocus({ row: gridRows.length, col: focusCol });
    const updated = [...gridRows, newRow];
    setGridRows(updated);
    triggerSave(updated);
  };

  // Quick Cross-Section Generator (-4.5, -3, 0, 3, 4.5)
  const handleAddCrossSection = () => {
    const lastRow = gridRows[gridRows.length - 1];
    let ch = '1+360';

    if (lastRow?.chainage && lastRow.chainage.includes('+')) {
      const parts = lastRow.chainage.split('+');
      const km = parseFloat(parts[0]) || 0;
      const m = parseFloat(parts[1]) || 0;
      const nextM = m + (project.chainageIntervalDefault || 20);
      ch = `${km}+${nextM < 100 ? (nextM < 10 ? '00' + nextM : '0' + nextM) : nextM}`;
    }

    const offsets = [-4.5, -3.0, 0.0, 3.0, 4.5];
    const newRows: FieldBookObservation[] = offsets.map((off, idx) => ({
      id: `cs-row-${Date.now()}-${idx}`,
      projectId: project.id,
      setupId: 'setup-1',
      setupNumber: 1,
      pointId: `${ch} ${off !== 0 ? (off > 0 ? '+' + off : off) : 'CL'}`,
      pointType: 'GROUND',
      chainage: ch,
      chainageMeters: null,
      position: off < 0 ? 'L' : off > 0 ? 'R' : 'CL',
      offsetMeters: off,
      backsightM: null,
      intermediateSightM: null,
      foresightM: null,
      knownRLM: null,
      calculatedRL_HI: null,
      riseM: null,
      fallM: null,
      calculatedRL_RF: null,
      designRLM: null,
      remarks: off === 0 ? 'Centreline' : off < 0 ? `Left Offset (${off}m)` : `Right Offset (+${off}m)`,
      source: 'manual',
      isReviewed: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    setPendingFocus({ row: gridRows.length, col: 4 }); // Focus IS column of the first new row
    const updated = [...gridRows, ...newRows];
    setGridRows(updated);
    triggerSave(updated);
  };

  // Add 5 blank rows
  const handleAdd5Rows = () => {
    const updated = [...gridRows];
    for (let i = 0; i < 5; i++) {
      updated.push({
        id: `row-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
        projectId: project.id,
        setupId: 'setup-1',
        setupNumber: 1,
        pointId: '',
        pointType: 'GROUND',
        chainage: '',
        chainageMeters: null,
        position: 'CL',
        offsetMeters: 0,
        backsightM: null,
        intermediateSightM: null,
        foresightM: null,
        knownRLM: null,
        calculatedRL_HI: null,
        riseM: null,
        fallM: null,
        calculatedRL_RF: null,
        designRLM: null,
        remarks: '',
        source: 'manual',
        isReviewed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setGridRows(updated);
    triggerSave(updated);
  };

  const handleDeleteRow = (index: number) => {
    if (gridRows.length <= 1) return;
    const updated = gridRows.filter((_, idx) => idx !== index);
    setGridRows(updated);
    triggerSave(updated);
  };

  const handleClearSheet = () => {
    if (confirm('Clear all observations on this sheet?')) {
      const resetRow: FieldBookObservation = {
        id: `row-${Date.now()}`,
        projectId: project.id,
        setupId: 'setup-1',
        setupNumber: 1,
        pointId: 'BM-01',
        pointType: 'BM',
        chainage: '1+340',
        chainageMeters: 1340,
        position: 'CL',
        offsetMeters: 0,
        backsightM: null,
        intermediateSightM: null,
        foresightM: null,
        knownRLM: 1830.0,
        calculatedRL_HI: 1830.0,
        riseM: null,
        fallM: null,
        calculatedRL_RF: 1830.0,
        designRLM: null,
        remarks: 'Benchmark',
        source: 'manual',
        isReviewed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setGridRows([resetRow]);
      triggerSave([resetRow]);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || text.trim() === '') {
        alert('Clipboard is empty. Copy table from Excel first.');
        return;
      }

      const lines = text.trim().split(/\r?\n/);
      const newRows: FieldBookObservation[] = [];

      for (let i = 0; i < lines.length; i++) {
        const cols = lines[i].split('\t');
        if (cols.length < 2) continue;
        if (/STATION|POINT|BS|IS|FS|RL|CHAINAGE/i.test(cols[0])) continue;

        const stn = cols[0]?.trim() || `Pt-${i + 1}`;
        const ch = cols[1]?.trim() || '';
        const off = cols[2] && !isNaN(parseFloat(cols[2])) ? parseFloat(cols[2]) : 0;
        const bs = cols[3] ? parseStaffInput(cols[3]) : null;
        const isReading = cols[4] ? parseStaffInput(cols[4]) : null;
        const fs = cols[5] ? parseStaffInput(cols[5]) : null;
        const remarks = cols[6]?.trim() || '';

        newRows.push({
          id: `paste-row-${Date.now()}-${i}`,
          projectId: project.id,
          setupId: 'setup-1',
          setupNumber: 1,
          pointId: stn,
          pointType: bs !== null && i === 0 ? 'BM' : fs !== null ? 'CP' : 'GROUND',
          chainage: ch,
          chainageMeters: null,
          position: off < 0 ? 'L' : off > 0 ? 'R' : 'CL',
          offsetMeters: off,
          backsightM: bs,
          intermediateSightM: isReading,
          foresightM: fs,
          knownRLM: i === 0 && bs !== null ? parseFloat(benchmarkRL) || 1830.0 : null,
          calculatedRL_HI: null,
          riseM: null,
          fallM: null,
          calculatedRL_RF: null,
          designRLM: null,
          remarks,
          source: 'manual',
          isReviewed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      if (newRows.length > 0) {
        setGridRows(newRows);
        triggerSave(newRows);
        alert(`Pasted ${newRows.length} rows directly from Excel!`);
      }
    } catch (err: any) {
      alert('Could not read clipboard: ' + err.message);
    }
  };

  // Photo Scanning
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      setPhotoSrc(src);
      setProcessedPhotoSrc(src);
    };
    reader.readAsDataURL(file);
  };

  const handleRotatePhoto = () => {
    if (!photoSrc) return;
    const nextRot = (rotationDeg + 90) % 360;
    setRotationDeg(nextRot);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const p = preprocessCanvas(img, nextRot, 1.25, 10);
      setProcessedPhotoSrc(p);
    };
    img.src = photoSrc;
  };

  const handleRunOcr = async () => {
    if (!processedPhotoSrc) return;
    setIsOcrRunning(true);
    setOcrProgressMsg('Reading handwriting on device...');

    try {
      const res = await scanFieldBookImage(processedPhotoSrc, (pct, status) => {
        setOcrProgressMsg(`${status} (${pct}%)`);
      });
      setOcrRows(res.rows);
    } catch (err: any) {
      alert('OCR error: ' + (err?.message || 'Failed to scan'));
    } finally {
      setIsOcrRunning(false);
    }
  };

  const handleApplyOcrRowsToGrid = () => {
    if (ocrRows.length === 0) return;

    const converted: FieldBookObservation[] = ocrRows.map((r, i) => {
      const bs = r.backsight ? parseStaffInput(r.backsight) : null;
      const isReading = r.intermediateSight ? parseStaffInput(r.intermediateSight) : null;
      const fs = r.foresight ? parseStaffInput(r.foresight) : null;

      return {
        id: `ocr-row-${Date.now()}-${i}`,
        projectId: project.id,
        setupId: 'setup-1',
        setupNumber: 1,
        pointId: r.pointId || `Pt-${i + 1}`,
        pointType: r.pointType,
        chainage: r.chainage || '',
        chainageMeters: null,
        position: r.position,
        offsetMeters: r.position === 'L' ? -3.0 : r.position === 'R' ? 3.0 : 0.0,
        backsightM: bs,
        intermediateSightM: isReading,
        foresightM: fs,
        knownRLM: i === 0 && bs !== null ? parseFloat(benchmarkRL) || 1830.0 : null,
        calculatedRL_HI: null,
        riseM: null,
        fallM: null,
        calculatedRL_RF: null,
        designRLM: null,
        remarks: r.remarks || '',
        source: 'ocr_scan',
        isReviewed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    const updated = [...gridRows.filter((r) => r.backsightM !== null || r.intermediateSightM !== null), ...converted];
    setGridRows(updated);
    triggerSave(updated);
    setShowScanModal(false);
    setPhotoSrc(null);
    setOcrRows([]);
    alert(`Transferred ${converted.length} scanned rows into your Survey Book!`);
  };

  return (
    <div className={`space-y-4 ${isDark ? 'text-slate-100' : isSunlight ? 'text-slate-950' : 'text-slate-900'}`}>
      {/* Top Banner: Benchmark Setup & Quick Tools */}
      <div
        className={`border rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 ${
          isDark
            ? 'bg-slate-800/90 border-slate-700'
            : isSunlight
            ? 'bg-amber-50 border-amber-300'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-black tracking-tight flex items-center gap-2">
              <span>Road Levelling Field Book</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold border border-slate-300 dark:border-slate-600">
                {calculatedObservations.length} Readings
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Type directly into cells. Press <strong>Enter</strong> to move down.
            </p>
          </div>

          {/* Benchmark Elevation Input Box */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs">
            <span className="font-black text-slate-700 dark:text-slate-200">
              Benchmark (BM) RL:
            </span>
            <input
              type="text"
              value={benchmarkRL}
              onChange={(e) => setBenchmarkRL(e.target.value)}
              placeholder="1830.000"
              className="w-24 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg font-bold font-mono text-slate-900 dark:text-white text-xs"
              title="Reference level of initial benchmark"
            />
            <span className="text-slate-400 font-bold">m</span>
          </div>

          {/* Reading Unit Toggle (Metres vs mm) */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold">
            <button
              onClick={() => setReadingUnit('m')}
              className={`px-2 py-1 rounded-lg transition ${
                readingUnit === 'm'
                  ? 'bg-blue-600 text-white font-black'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              m (e.g. 2.033)
            </button>
            <button
              onClick={() => setReadingUnit('mm')}
              className={`px-2 py-1 rounded-lg transition ${
                readingUnit === 'mm'
                  ? 'bg-blue-600 text-white font-black'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              mm (e.g. 2033)
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Scan Photo Button */}
          <button
            onClick={() => setShowScanModal(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Field Book Photo</span>
          </button>

          {/* Quick Cross-Section Interval Button */}
          <button
            onClick={handleAddCrossSection}
            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
            title="Adds 5 cross-section rows (-4.5, -3, 0, 3, 4.5) for next chainage"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Cross-Section (-4.5 to +4.5)</span>
          </button>

          {/* Add Row */}
          <button
            onClick={() => handleAddRow(4)}
            className="px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            <span>+ 1 Row</span>
          </button>

          {/* Field Guide Modal Button */}
          <button
            onClick={onOpenFieldGuide}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-300 dark:border-slate-700 flex items-center gap-1"
            title="Open simple user guide for surveyors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Field Guide</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Field Book Table */}
      <div
        className={`border rounded-2xl shadow-sm overflow-hidden ${
          isDark
            ? 'bg-slate-900 border-slate-700'
            : isSunlight
            ? 'bg-white border-amber-300'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="overflow-x-auto max-h-[70vh] relative">
          <table className="w-full text-left border-collapse text-xs">
            <thead
              className={`font-black text-[11px] uppercase tracking-wider sticky top-0 z-10 border-b shadow-sm ${
                isDark
                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              <tr>
                <th className="py-2 px-2 text-center w-8 border-r border-slate-200 dark:border-slate-700">#</th>
                <th className="py-2 px-2.5 min-w-[110px] border-r border-slate-200 dark:border-slate-700">Type / Feature</th>
                <th className="py-2 px-2.5 min-w-[120px] border-r border-slate-200 dark:border-slate-700">Station / Point</th>
                <th className="py-2 px-2.5 min-w-[90px] border-r border-slate-200 dark:border-slate-700">Chainage</th>
                <th className="py-2 px-2 text-center min-w-[85px] border-r border-slate-200 dark:border-slate-700 bg-amber-500/10">
                  Offset (m)
                </th>
                <th className="py-2 px-2.5 text-right text-blue-600 dark:text-blue-400 min-w-[85px] border-r border-slate-200 dark:border-slate-700 bg-blue-50/40 dark:bg-blue-950/20">
                  BS (m)
                </th>
                <th className="py-2 px-2.5 text-right text-emerald-600 dark:text-emerald-400 min-w-[85px] border-r border-slate-200 dark:border-slate-700 bg-emerald-50/40 dark:bg-emerald-950/20">
                  IS (m)
                </th>
                <th className="py-2 px-2.5 text-right text-amber-600 dark:text-amber-400 min-w-[85px] border-r border-slate-200 dark:border-slate-700 bg-amber-50/40 dark:bg-amber-950/20">
                  FS (m)
                </th>
                <th className="py-2 px-2.5 text-right font-bold text-slate-500 dark:text-slate-400 min-w-[90px] border-r border-slate-200 dark:border-slate-700">
                  HI (m)
                </th>
                <th className="py-2 px-2 text-right text-teal-600 dark:text-teal-400 min-w-[75px] border-r border-slate-200 dark:border-slate-700">
                  Rise
                </th>
                <th className="py-2 px-2 text-right text-rose-600 dark:text-rose-400 min-w-[75px] border-r border-slate-200 dark:border-slate-700">
                  Fall
                </th>
                <th className="py-2 px-3 text-right font-black min-w-[115px] border-r border-slate-200 dark:border-slate-700 bg-amber-50/50 dark:bg-amber-950/20 text-slate-900 dark:text-white">
                  RL ({isIntegerMm ? 'mm' : 'm'})
                </th>
                <th className="py-2 px-3 min-w-[130px] border-r border-slate-200 dark:border-slate-700">Remarks</th>
                <th className="py-2 px-2 text-center w-8"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
              {calculatedObservations.map((obs, idx) => {
                const isBM = obs.pointType === 'BM' || (obs.backsightM !== null && idx === 0);
                const isPeg = obs.pointType === 'PEG';
                const isCP = obs.foresightM !== null;

                return (
                  <tr
                    key={obs.id}
                    className={`transition-colors ${
                      isCP
                        ? 'bg-amber-50/30 dark:bg-amber-950/20'
                        : isPeg
                        ? 'bg-purple-50/30 dark:bg-purple-950/20'
                        : isBM
                        ? 'bg-blue-50/30 dark:bg-blue-950/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* 0: Line # */}
                    <td className="py-1 px-2 text-center text-slate-400 font-sans text-[11px] font-bold border-r border-slate-200 dark:border-slate-700 select-none">
                      {idx + 1}
                    </td>

                    {/* 1: Type / Feature (Dropdown) */}
                    <td className="p-0 border-r border-slate-200 dark:border-slate-700">
                      <select
                        value={obs.pointType}
                        onChange={(e) => handleCellChange(idx, 'pointType', e.target.value)}
                        className="w-full h-full px-2 py-1.5 bg-transparent text-[11px] font-sans font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                      >
                        <option value="GROUND">Ground</option>
                        <option value="BM">Benchmark</option>
                        <option value="PEG">Peg Top</option>
                        <option value="CP">Change Point</option>
                        <option value="BEACON">Road Beacon</option>
                      </select>
                    </td>

                    {/* 2: Station / Point ID (Editable) */}
                    <td className="p-0 border-r border-slate-200 dark:border-slate-700">
                      <input
                        ref={(el) => { inputRefs.current[`${idx}-1`] = el; }}
                        type="text"
                        value={obs.pointId || ''}
                        onChange={(e) => handleCellChange(idx, 'pointId', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 1)}
                        placeholder="Pt"
                        className="w-full h-full px-2.5 py-1.5 bg-transparent font-sans font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </td>

                    {/* 3: Chainage (Editable) */}
                    <td className="p-0 border-r border-slate-200 dark:border-slate-700">
                      <input
                        ref={(el) => { inputRefs.current[`${idx}-2`] = el; }}
                        type="text"
                        value={obs.chainage || ''}
                        onChange={(e) => handleCellChange(idx, 'chainage', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 2)}
                        placeholder="1+360"
                        className="w-full h-full px-2.5 py-1.5 bg-transparent text-slate-700 dark:text-slate-300 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </td>

                    {/* 4: Offset / Interval (m) (Editable: e.g. -4.5, -3, 0, 3, 4.5) */}
                    <td className="p-0 border-r border-slate-200 dark:border-slate-700 bg-amber-500/5">
                      <input
                        ref={(el) => { inputRefs.current[`${idx}-3`] = el; }}
                        type="number"
                        step="0.5"
                        value={obs.offsetMeters !== null && obs.offsetMeters !== undefined ? obs.offsetMeters : ''}
                        onChange={(e) => handleCellChange(idx, 'offsetMeters', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 3)}
                        placeholder="0"
                        className="w-full h-full px-2 py-1.5 text-center font-bold text-amber-700 dark:text-amber-400 bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </td>

                    {/* 5: Backsight (BS) (Editable) */}
                    <td className="p-0 border-r border-slate-200 dark:border-slate-700 bg-blue-50/30 dark:bg-blue-950/10">
                      <input
                        ref={(el) => { inputRefs.current[`${idx}-4`] = el; }}
                        type="text"
                        value={obs.backsightM !== null && obs.backsightM !== undefined ? (readingUnit === 'mm' ? Math.round(obs.backsightM * 1000) : obs.backsightM.toFixed(3)) : ''}
                        onChange={(e) => handleCellChange(idx, 'backsightM', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 4)}
                        placeholder=""
                        className="w-full h-full px-2.5 py-1.5 text-right font-bold text-blue-700 dark:text-blue-400 bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>

                    {/* 6: Intermediate Sight (IS) (Editable) */}
                    <td className="p-0 border-r border-slate-200 dark:border-slate-700 bg-emerald-50/30 dark:bg-emerald-950/10">
                      <input
                        ref={(el) => { inputRefs.current[`${idx}-5`] = el; }}
                        type="text"
                        value={obs.intermediateSightM !== null && obs.intermediateSightM !== undefined ? (readingUnit === 'mm' ? Math.round(obs.intermediateSightM * 1000) : obs.intermediateSightM.toFixed(3)) : ''}
                        onChange={(e) => handleCellChange(idx, 'intermediateSightM', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 5)}
                        placeholder=""
                        className="w-full h-full px-2.5 py-1.5 text-right font-bold text-emerald-700 dark:text-emerald-400 bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>

                    {/* 7: Foresight (FS) (Editable) */}
                    <td className="p-0 border-r border-slate-200 dark:border-slate-700 bg-amber-50/30 dark:bg-amber-950/10">
                      <input
                        ref={(el) => { inputRefs.current[`${idx}-6`] = el; }}
                        type="text"
                        value={obs.foresightM !== null && obs.foresightM !== undefined ? (readingUnit === 'mm' ? Math.round(obs.foresightM * 1000) : obs.foresightM.toFixed(3)) : ''}
                        onChange={(e) => handleCellChange(idx, 'foresightM', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 6)}
                        placeholder=""
                        className="w-full h-full px-2.5 py-1.5 text-right font-bold text-amber-700 dark:text-amber-400 bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </td>

                    {/* 8: HI (Collimation) */}
                    <td className="py-1.5 px-2.5 text-right font-bold text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 select-none">
                      {obs.backsightM !== null && obs.knownRLM !== null
                        ? (obs.knownRLM + obs.backsightM).toFixed(3)
                        : ''}
                    </td>

                    {/* 9: Rise */}
                    <td className="py-1.5 px-2 text-right text-teal-700 dark:text-teal-400 border-r border-slate-200 dark:border-slate-700 select-none">
                      {obs.riseM !== null ? obs.riseM.toFixed(3) : ''}
                    </td>

                    {/* 10: Fall */}
                    <td className="py-1.5 px-2 text-right text-rose-700 dark:text-rose-400 border-r border-slate-200 dark:border-slate-700 select-none">
                      {obs.fallM !== null ? obs.fallM.toFixed(3) : ''}
                    </td>

                    {/* 11: Reduced Level (RL) */}
                    <td className="py-1.5 px-3 text-right font-black border-r border-slate-200 dark:border-slate-700 bg-amber-500/10 select-none text-slate-900 dark:text-white">
                      {obs.calculatedRL_HI !== null ? (
                        isIntegerMm ? (
                          <div title={`${obs.calculatedRL_HI.toFixed(3)} m`}>
                            <span>{formatIntegerMm(obs.calculatedRL_HI)}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal block">
                              {obs.calculatedRL_HI.toFixed(3)} m
                            </span>
                          </div>
                        ) : (
                          `${obs.calculatedRL_HI.toFixed(3)} m`
                        )
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>

                    {/* 12: Remarks */}
                    <td className="p-0 border-r border-slate-200 dark:border-slate-700">
                      <input
                        ref={(el) => { inputRefs.current[`${idx}-7`] = el; }}
                        type="text"
                        value={obs.remarks || ''}
                        onChange={(e) => handleCellChange(idx, 'remarks', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 7)}
                        placeholder="Notes..."
                        className="w-full h-full px-2 py-1.5 font-sans text-[11px] text-slate-600 dark:text-slate-300 bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
                      />
                    </td>

                    {/* 13: Delete action */}
                    <td className="py-1 px-1.5 text-center">
                      <button
                        onClick={() => handleDeleteRow(idx)}
                        className="p-1 text-slate-300 hover:text-rose-600 dark:text-slate-600 dark:hover:text-rose-400 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Quiet, Professional Bottom Status Bar (No Loud Error Banners!) */}
        <div
          className={`px-4 py-2.5 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-medium ${
            isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>
              Lines: <strong>{gridRows.length}</strong>
            </span>
            <span>|</span>
            <span>
              ΣBS: <strong>{liveCheck.sumBS.toFixed(3)} m</strong>
            </span>
            <span>|</span>
            <span>
              ΣFS: <strong>{liveCheck.sumFS.toFixed(3)} m</strong>
            </span>
            <span>|</span>
            {liveCheck.isPassed ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Run Closed (Check: {liveCheck.diffBS_FS.toFixed(3)} m)</span>
              </span>
            ) : (
              <span className="text-slate-400 italic">
                Active run in progress
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handleClearSheet}
              className="text-xs text-slate-400 hover:text-rose-500 underline px-2 py-1"
            >
              Clear Sheet
            </button>
            <button
              onClick={() => handleAddRow(4)}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Next Line</span>
            </button>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 📸 Survey Book Photo Scanner Modal with Amber Correction             */}
      {/* --------------------------------------------------------------------- */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-6 backdrop-blur-sm">
          <div
            className={`max-w-5xl w-full max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-base">
                  Scan Field Book Page Photo
                </h3>
              </div>
              <button
                onClick={() => setShowScanModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Screen */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Photo Upload/Rotate on Left */}
              <div className="md:col-span-5 space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                  accept="image/*"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  onChange={handlePhotoSelect}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Take Photo</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-1.5"
                  >
                    <span>Upload Image</span>
                  </button>
                </div>

                {photoSrc ? (
                  <div className="space-y-3">
                    <div className="relative rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-950 max-h-[300px] flex items-center justify-center">
                      <img
                        src={processedPhotoSrc || photoSrc}
                        alt="Survey Book"
                        className="max-h-[300px] w-auto object-contain"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={handleRotatePhoto}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 border border-slate-300 dark:border-slate-700"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Rotate 90°</span>
                      </button>

                      <button
                        onClick={handleRunOcr}
                        disabled={isOcrRunning}
                        className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs shadow flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{isOcrRunning ? 'Reading photo...' : 'Extract Readings'}</span>
                      </button>
                    </div>

                    {isOcrRunning && (
                      <p className="text-xs text-blue-600 font-semibold text-center animate-pulse">
                        {ocrProgressMsg}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center text-slate-400 text-xs space-y-2">
                    <Camera className="w-8 h-8 mx-auto text-slate-400" />
                    <p>Take a picture of your survey book or upload an image.</p>
                  </div>
                )}
              </div>

              {/* Extracted table with amber highlighting on right */}
              <div className="md:col-span-7 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Extracted Readings ({ocrRows.length} lines)
                    </h4>
                    <span className="text-[11px] text-amber-800 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700">
                      Amber cells = Unclear digit, tap to fix
                    </span>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto max-h-[320px]">
                    <table className="w-full text-left text-xs border-collapse font-mono">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase font-black text-[10px] sticky top-0 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-2">Station</th>
                          <th className="p-2">Chainage</th>
                          <th className="p-2 text-blue-600">BS</th>
                          <th className="p-2 text-emerald-600">IS</th>
                          <th className="p-2 text-amber-600">FS</th>
                          <th className="p-2">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {ocrRows.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400 font-sans">
                              {photoSrc ? 'Click "Extract Readings" to read.' : 'No photo uploaded.'}
                            </td>
                          </tr>
                        ) : (
                          ocrRows.map((r, i) => (
                            <tr key={r.tempId}>
                              <td className="p-1">
                                <input
                                  type="text"
                                  value={r.pointId}
                                  onChange={(e) => {
                                    const up = [...ocrRows];
                                    up[i].pointId = e.target.value;
                                    setOcrRows(up);
                                  }}
                                  className="w-20 px-1.5 py-1 border border-slate-300 dark:border-slate-700 rounded font-bold bg-transparent"
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="text"
                                  value={r.chainage}
                                  onChange={(e) => {
                                    const up = [...ocrRows];
                                    up[i].chainage = e.target.value;
                                    setOcrRows(up);
                                  }}
                                  className="w-16 px-1.5 py-1 border border-slate-300 dark:border-slate-700 rounded bg-transparent"
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="text"
                                  value={r.backsight}
                                  onChange={(e) => {
                                    const up = [...ocrRows];
                                    up[i].backsight = e.target.value;
                                    setOcrRows(up);
                                  }}
                                  className={`w-16 px-1.5 py-1 rounded text-right font-bold ${
                                    r.uncertainFields.includes('backsight')
                                      ? 'bg-amber-100 dark:bg-amber-900 border-2 border-amber-500 text-amber-950 dark:text-amber-100 font-black'
                                      : 'border border-slate-300 dark:border-slate-700 text-blue-600'
                                  }`}
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="text"
                                  value={r.intermediateSight}
                                  onChange={(e) => {
                                    const up = [...ocrRows];
                                    up[i].intermediateSight = e.target.value;
                                    setOcrRows(up);
                                  }}
                                  className={`w-16 px-1.5 py-1 rounded text-right font-bold ${
                                    r.uncertainFields.includes('intermediateSight')
                                      ? 'bg-amber-100 dark:bg-amber-900 border-2 border-amber-500 text-amber-950 dark:text-amber-100 font-black'
                                      : 'border border-slate-300 dark:border-slate-700 text-emerald-600'
                                  }`}
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="text"
                                  value={r.foresight}
                                  onChange={(e) => {
                                    const up = [...ocrRows];
                                    up[i].foresight = e.target.value;
                                    setOcrRows(up);
                                  }}
                                  className={`w-16 px-1.5 py-1 rounded text-right font-bold ${
                                    r.uncertainFields.includes('foresight')
                                      ? 'bg-amber-100 dark:bg-amber-900 border-2 border-amber-500 text-amber-950 dark:text-amber-100 font-black'
                                      : 'border border-slate-300 dark:border-slate-700 text-amber-600'
                                  }`}
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="text"
                                  value={r.remarks}
                                  onChange={(e) => {
                                    const up = [...ocrRows];
                                    up[i].remarks = e.target.value;
                                    setOcrRows(up);
                                  }}
                                  className="w-24 px-1.5 py-1 border border-slate-300 dark:border-slate-700 rounded font-sans text-[11px] bg-transparent"
                                />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {ocrRows.length > 0 && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Compare amber numbers with photo on left.
                    </span>
                    <button
                      onClick={handleApplyOcrRowsToGrid}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Transfer into Survey Book</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
