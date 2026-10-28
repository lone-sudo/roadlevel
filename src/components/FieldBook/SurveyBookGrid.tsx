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
  Layers,
  ArrowRight,
  TrendingUp,
  TrendingDown,
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

  // Benchmark Reference Elevation (Default from Image 1: 1842.059 m or 1830.000 m)
  const [benchmarkRL, setBenchmarkRL] = useState<string>('1842.059');
  const [readingUnit, setReadingUnit] = useState<'m' | 'mm'>('mm'); // Surveyors in Image 1 write mm integers (e.g. 1155, 1484)

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

  // Sync incoming observations into gridRows or initialize with real site data from User Notebook (Image 1)
  useEffect(() => {
    if (observations && observations.length > 0) {
      setGridRows(observations);
      if (observations[0]?.knownRLM) {
        setBenchmarkRL(observations[0].knownRLM.toFixed(3));
      }
    } else {
      // Seed with exact field observations from User's Field Book (Image 1):
      // Road Beacon 1KR02 (RL = 1842.059), BS = 1155 -> Col = 1843.214
      // Station 0+140 with intervals -4.2, -3, 0, 3, 4.2
      const initialRows: FieldBookObservation[] = [
        {
          id: `row-init-1`,
          projectId: project.id,
          setupId: 'setup-1',
          setupNumber: 1,
          pointId: '1KR02',
          pointType: 'BEACON',
          chainage: '0+140',
          chainageMeters: 140,
          position: 'CL',
          offsetMeters: 0,
          backsightM: 1.155,
          intermediateSightM: null,
          foresightM: null,
          knownRLM: 1842.059,
          calculatedRL_HI: 1842.059,
          riseM: null,
          fallM: null,
          calculatedRL_RF: 1842.059,
          designRLM: null,
          remarks: 'Road Beacon 1KR02',
          source: 'manual',
          isReviewed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        // Station 0+140 (5 offsets: -4.2, -3, 0, 3, 4.2)
        {
          id: `row-init-2`,
          projectId: project.id,
          setupId: 'setup-1',
          setupNumber: 1,
          pointId: '0+140 -4.2',
          pointType: 'GROUND',
          chainage: '0+140',
          chainageMeters: 140,
          position: 'L',
          offsetMeters: -4.2,
          backsightM: null,
          intermediateSightM: 1.484,
          foresightM: null,
          knownRLM: null,
          calculatedRL_HI: null,
          riseM: null,
          fallM: null,
          calculatedRL_RF: null,
          designRLM: 1842.059,
          remarks: 'Left Edge (-4.2m)',
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
          pointId: '0+140 -3.0',
          pointType: 'GROUND',
          chainage: '0+140',
          chainageMeters: 140,
          position: 'L',
          offsetMeters: -3.0,
          backsightM: null,
          intermediateSightM: 1.449,
          foresightM: null,
          knownRLM: null,
          calculatedRL_HI: null,
          riseM: null,
          fallM: null,
          calculatedRL_RF: null,
          designRLM: 1841.958,
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
          pointId: '0+140 CL',
          pointType: 'GROUND',
          chainage: '0+140',
          chainageMeters: 140,
          position: 'CL',
          offsetMeters: 0.0,
          backsightM: null,
          intermediateSightM: 1.468,
          foresightM: null,
          knownRLM: null,
          calculatedRL_HI: null,
          riseM: null,
          fallM: null,
          calculatedRL_RF: null,
          designRLM: 1841.857,
          remarks: 'Centreline (CL)',
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
          pointId: '0+140 +3.0',
          pointType: 'GROUND',
          chainage: '0+140',
          chainageMeters: 140,
          position: 'R',
          offsetMeters: 3.0,
          backsightM: null,
          intermediateSightM: 1.621,
          foresightM: null,
          knownRLM: null,
          calculatedRL_HI: null,
          riseM: null,
          fallM: null,
          calculatedRL_RF: null,
          designRLM: 1841.756,
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
          pointId: '0+140 +4.2',
          pointType: 'GROUND',
          chainage: '0+140',
          chainageMeters: 140,
          position: 'R',
          offsetMeters: 4.2,
          backsightM: null,
          intermediateSightM: 1.769,
          foresightM: null,
          knownRLM: null,
          calculatedRL_HI: null,
          riseM: null,
          fallM: null,
          calculatedRL_RF: null,
          designRLM: 1841.705,
          remarks: 'Right Edge (+4.2m)',
          source: 'manual',
          isReviewed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      setGridRows(initialRows);
      triggerSave(initialRows);
    }
  }, [observations, project.id]);

  // Execute pending focus after state update
  useEffect(() => {
    if (pendingFocus) {
      const key = `${pendingFocus.row}-${pendingFocus.col}`;
      const targetInput = inputRefs.current[key];
      if (targetInput) {
        targetInput.focus();
        targetInput.select();
      }
      setPendingFocus(null);
    }
  }, [pendingFocus, gridRows]);

  // Recalculate reductions with starting benchmark elevation
  const { calculatedObservations } = React.useMemo(() => {
    if (gridRows.length === 0) return { calculatedObservations: [] };
    const rowsWithBM = [...gridRows];
    const parsedBM = parseFloat(benchmarkRL);
    if (!isNaN(parsedBM) && rowsWithBM[0] && rowsWithBM[0].backsightM !== null) {
      rowsWithBM[0] = {
        ...rowsWithBM[0],
        knownRLM: parsedBM,
      };
    }
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

  // Helper to parse staff reading (e.g. 1484 -> 1.484 m or 1.484 -> 1.484 m)
  const parseStaffInput = (val: string): number | null => {
    const clean = val.replace(/,/g, '').trim();
    if (clean === '') return null;
    const num = parseFloat(clean);
    if (isNaN(num)) return null;

    if (readingUnit === 'mm' || (!clean.includes('.') && num >= 50)) {
      return Number((num / 1000).toFixed(4));
    }
    return num;
  };

  // Helper to parse design RL / RL level input (e.g. 1842059 -> 1842.059 m or 1842.059 -> 1842.059 m)
  const parseLevelInput = (val: string): number | null => {
    const clean = val.replace(/,/g, '').trim();
    if (clean === '') return null;
    const num = parseFloat(clean);
    if (isNaN(num)) return null;

    if (readingUnit === 'mm' || (!clean.includes('.') && num >= 1000)) {
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
    } else if (field === 'designRLM') {
      row.designRLM = parseLevelInput(value);
    } else if (field === 'offsetMeters') {
      const num = parseFloat(value.trim());
      row.offsetMeters = isNaN(num) ? null : num;
      if (num < 0) row.position = 'L';
      else if (num > 0) row.position = 'R';
      else row.position = 'CL';
    } else {
      (row[field] as any) = value;
    }

    row.updatedAt = new Date().toISOString();
    updated[index] = row;
    setGridRows(updated);
    triggerSave(updated);
  };

  // Keyboard Navigation: Enter or Down Arrow jumps straight down to the same column!
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number
  ) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();

      if (rowIndex === gridRows.length - 1) {
        handleAddRow(colIndex);
      } else {
        const nextKey = `${rowIndex + 1}-${colIndex}`;
        const nextInput = inputRefs.current[nextKey];
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    }

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
  };

  // Add Row
  const handleAddRow = (focusCol = 4) => {
    const lastRow = gridRows[gridRows.length - 1];
    let nextChainage = lastRow?.chainage || '0+140';
    let nextOffset = 0.0;
    const offsetsSeq = [-4.2, -3.0, 0.0, 3.0, 4.2];

    if (lastRow?.offsetMeters !== null && lastRow?.offsetMeters !== undefined) {
      const curIdx = offsetsSeq.findIndex((o) => Math.abs(o - lastRow.offsetMeters!) < 0.1);
      if (curIdx >= 0 && curIdx < offsetsSeq.length - 1) {
        nextOffset = offsetsSeq[curIdx + 1];
        nextChainage = lastRow.chainage || '0+140';
      } else {
        if (lastRow.chainage && lastRow.chainage.includes('+')) {
          const parts = lastRow.chainage.split('+');
          const km = parseFloat(parts[0]) || 0;
          const m = parseFloat(parts[1]) || 0;
          const nextM = m + (project.chainageIntervalDefault || 20);
          nextChainage = `${km}+${nextM < 100 ? (nextM < 10 ? '00' + nextM : '0' + nextM) : nextM}`;
        }
        nextOffset = -4.2;
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

  // Quick 5-Point Cross-Section Generator (-4.2 to +4.2 m, from User Image 1)
  const handleAdd5PtSection42 = () => {
    const lastRow = gridRows[gridRows.length - 1];
    let ch = '0+160';

    if (lastRow?.chainage && lastRow.chainage.includes('+')) {
      const parts = lastRow.chainage.split('+');
      const km = parseFloat(parts[0]) || 0;
      const m = parseFloat(parts[1]) || 0;
      const nextM = m + (project.chainageIntervalDefault || 20);
      ch = `${km}+${nextM < 100 ? (nextM < 10 ? '00' + nextM : '0' + nextM) : nextM}`;
    }

    const offsets = [-4.2, -3.0, 0.0, 3.0, 4.2];
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
      remarks: off === 0 ? 'Centreline' : off < 0 ? `Left (${off}m)` : `Right (+${off}m)`,
      source: 'manual',
      isReviewed: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    setPendingFocus({ row: gridRows.length, col: 4 });
    const updated = [...gridRows, ...newRows];
    setGridRows(updated);
    triggerSave(updated);
  };

  // Quick 5-Point Cross-Section Generator (-4.5 to +4.5 m)
  const handleAdd5PtSection45 = () => {
    const lastRow = gridRows[gridRows.length - 1];
    let ch = '0+160';

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
      remarks: off === 0 ? 'Centreline' : off < 0 ? `Left (${off}m)` : `Right (+${off}m)`,
      source: 'manual',
      isReviewed: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    setPendingFocus({ row: gridRows.length, col: 4 });
    const updated = [...gridRows, ...newRows];
    setGridRows(updated);
    triggerSave(updated);
  };

  // Quick 3-Point Dipping Set Generator (L, CL, R - from User Image 2)
  const handleAdd3PtDippingSet = () => {
    const lastRow = gridRows[gridRows.length - 1];
    let ch = '0+580';

    if (lastRow?.chainage && lastRow.chainage.includes('+')) {
      const parts = lastRow.chainage.split('+');
      const km = parseFloat(parts[0]) || 0;
      const m = parseFloat(parts[1]) || 0;
      const nextM = m + (project.chainageIntervalDefault || 20);
      ch = `${km}+${nextM < 100 ? (nextM < 10 ? '00' + nextM : '0' + nextM) : nextM}`;
    }

    const dippingPoints: Array<{ pos: 'L' | 'CL' | 'R'; off: number; label: string }> = [
      { pos: 'L', off: -4.2, label: 'Left Peg (L)' },
      { pos: 'CL', off: 0.0, label: 'Centreline (CL)' },
      { pos: 'R', off: 4.2, label: 'Right Peg (R)' },
    ];

    const newRows: FieldBookObservation[] = dippingPoints.map((pt, idx) => ({
      id: `dip-row-${Date.now()}-${idx}`,
      projectId: project.id,
      setupId: 'setup-1',
      setupNumber: 1,
      pointId: `${ch} ${pt.pos}`,
      pointType: 'PEG',
      chainage: ch,
      chainageMeters: null,
      position: pt.pos,
      offsetMeters: pt.off,
      backsightM: null,
      intermediateSightM: null,
      foresightM: null,
      knownRLM: null,
      calculatedRL_HI: null,
      riseM: null,
      fallM: null,
      calculatedRL_RF: null,
      designRLM: null,
      remarks: pt.label,
      source: 'manual',
      isReviewed: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    setPendingFocus({ row: gridRows.length, col: 4 });
    const updated = [...gridRows, ...newRows];
    setGridRows(updated);
    triggerSave(updated);
  };

  // Add Change Point (CP)
  const handleAddChangePoint = () => {
    const lastRow = gridRows[gridRows.length - 1];
    const ch = lastRow?.chainage || '';
    const cpIndex = gridRows.filter((r) => r.pointType === 'CP').length + 1;

    const newRow: FieldBookObservation = {
      id: `cp-row-${Date.now()}`,
      projectId: project.id,
      setupId: 'setup-1',
      setupNumber: 1,
      pointId: `CP-${cpIndex}`,
      pointType: 'CP',
      chainage: ch,
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
      remarks: `Change Point CP-${cpIndex} (FS & BS)`,
      source: 'manual',
      isReviewed: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setPendingFocus({ row: gridRows.length, col: 5 });
    const updated = [...gridRows, newRow];
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
        chainage: '0+140',
        chainageMeters: 140,
        position: 'CL',
        offsetMeters: 0,
        backsightM: null,
        intermediateSightM: null,
        foresightM: null,
        knownRLM: 1842.059,
        calculatedRL_HI: 1842.059,
        riseM: null,
        fallM: null,
        calculatedRL_RF: 1842.059,
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
          knownRLM: i === 0 && bs !== null ? parseFloat(benchmarkRL) || 1842.059 : null,
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
    setOcrProgressMsg('Reading field book handwriting...');

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
        offsetMeters: r.position === 'L' ? -4.2 : r.position === 'R' ? 4.2 : 0.0,
        backsightM: bs,
        intermediateSightM: isReading,
        foresightM: fs,
        knownRLM: i === 0 && bs !== null ? parseFloat(benchmarkRL) || 1842.059 : null,
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
    <div className={`space-y-4 ${isDark ? 'text-white' : isSunlight ? 'text-black font-bold' : 'text-slate-950 font-bold'}`}>
      {/* Top Banner: Benchmark Setup & Units */}
      <div
        className={`border-2 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 ${
          isDark
            ? 'bg-slate-900 border-slate-700'
            : isSunlight
            ? 'bg-amber-100 border-amber-500'
            : 'bg-white border-slate-300'
        }`}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <span>Road Levelling & Dipping Book</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-black dark:text-white font-black border border-slate-400 dark:border-slate-600">
                {calculatedObservations.length} Rows
              </span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
              Type readings directly into cells. Press <strong>Enter</strong> to move down automatically.
            </p>
          </div>

          {/* Benchmark Elevation Input Box */}
          <div
            className={`flex items-center gap-2 p-2 rounded-xl border-2 text-xs font-black ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-white'
                : 'bg-slate-100 border-slate-300 text-slate-950'
            }`}
          >
            <span>Starting Benchmark RL:</span>
            <input
              type="text"
              value={benchmarkRL}
              onChange={(e) => setBenchmarkRL(e.target.value)}
              placeholder="1842.059"
              className={`w-28 px-2 py-1 rounded-lg font-black font-mono text-sm border-2 ${
                isDark
                  ? 'bg-slate-900 border-slate-600 text-amber-300'
                  : 'bg-white border-slate-400 text-black'
              }`}
              title="Reference level of initial benchmark"
            />
            <span className="font-black text-amber-600 dark:text-amber-400">m</span>
          </div>

          {/* Reading Unit Toggle (Metres vs mm) */}
          <div
            className={`flex items-center gap-1 p-1 rounded-xl border-2 text-xs font-black ${
              isDark
                ? 'bg-slate-800 border-slate-700'
                : 'bg-slate-100 border-slate-300'
            }`}
          >
            <button
              onClick={() => setReadingUnit('mm')}
              className={`px-3 py-1 rounded-lg transition ${
                readingUnit === 'mm'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
              }`}
              title="Display & entry in integer millimetres like handwritten book (e.g. 1484, 1842059)"
            >
              mm (Integer)
            </button>
            <button
              onClick={() => setReadingUnit('m')}
              className={`px-3 py-1 rounded-lg transition ${
                readingUnit === 'm'
                  ? 'bg-blue-600 text-white font-black shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
              }`}
              title="Display & entry in decimal metres (e.g. 1.484, 1842.059)"
            >
              m (Metres)
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Clear Sheet */}
          <button
            onClick={handleClearSheet}
            className="px-3 py-1.5 rounded-xl border text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border-slate-300 dark:border-slate-700 transition"
          >
            Clear Sheet
          </button>

          {/* Paste from Excel */}
          <button
            onClick={handlePasteFromClipboard}
            className="px-3 py-1.5 rounded-xl border text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 flex items-center gap-1 transition"
            title="Paste tab-separated rows copied from Excel"
          >
            <Clipboard className="w-3.5 h-3.5 text-blue-500" />
            <span>Paste Excel</span>
          </button>

          {/* OCR Camera Scan */}
          <button
            onClick={() => setShowScanModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow transition"
          >
            <Camera className="w-4 h-4" />
            <span>📸 Scan Survey Book Photo</span>
          </button>
        </div>
      </div>

      {/* Quick Row Generator Bar */}
      <div
        className={`border-2 rounded-2xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-2.5 ${
          isDark
            ? 'bg-slate-900 border-slate-700'
            : isSunlight
            ? 'bg-white border-amber-400'
            : 'bg-slate-50 border-slate-300'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1 mr-1">
            <Layers className="w-4 h-4 text-amber-500" />
            <span>Quick Templates:</span>
          </span>

          {/* Quick Cross-Section Generator (-4.2 to +4.2 m from Image 1) */}
          <button
            onClick={handleAdd5PtSection42}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-sm transition"
            title="Add 5 cross-section points: -4.2m, -3.0m, CL, +3.0m, +4.2m (matches Image 1)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Road Section (-4.2 to +4.2)</span>
          </button>

          {/* Quick Cross-Section Generator (-4.5 to +4.5 m) */}
          <button
            onClick={handleAdd5PtSection45}
            className="px-3 py-1.5 rounded-xl bg-amber-600/90 hover:bg-amber-500 text-white font-black text-xs flex items-center gap-1 shadow-sm transition"
            title="Add 5 cross-section points: -4.5m, -3.0m, CL, +3.0m, +4.5m"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Section (-4.5 to +4.5)</span>
          </button>

          {/* Quick 3-Point Dipping Set Generator (L, CL, R from Image 2) */}
          <button
            onClick={handleAdd3PtDippingSet}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center gap-1 shadow-sm transition"
            title="Add 3 peg points for dipping: Left, Centre, Right (matches Image 2)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ 3-Pt Dipping Set (L, CL, R)</span>
          </button>

          {/* Add Change Point (CP) */}
          <button
            onClick={handleAddChangePoint}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center gap-1 shadow-sm transition"
            title="Add Change Point (CP) for Foresight and next Backsight"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Change Point (CP)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Add 1 Row */}
          <button
            onClick={() => handleAddRow(4)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-black text-xs flex items-center gap-1 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ 1 Row</span>
          </button>

          {/* Field Guide Modal Button */}
          <button
            onClick={onOpenFieldGuide}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 font-black text-xs border border-slate-300 dark:border-slate-700 flex items-center gap-1"
            title="Open simple user guide for surveyors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Field Guide</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Field Book Table */}
      <div
        className={`border-2 rounded-2xl shadow-md overflow-hidden ${
          isDark
            ? 'bg-slate-950 border-slate-700'
            : isSunlight
            ? 'bg-white border-amber-400'
            : 'bg-white border-slate-300'
        }`}
      >
        <div className="overflow-x-auto max-h-[72vh] relative">
          <table className="w-full text-left border-collapse text-xs">
            {/* Header: Exact structure from User Field Book (Images 1 & 2) */}
            <thead
              className={`font-black text-xs uppercase tracking-wide sticky top-0 z-10 border-b-2 shadow-sm ${
                isDark
                  ? 'bg-slate-800 text-white border-slate-600'
                  : isSunlight
                  ? 'bg-amber-300 text-black border-black'
                  : 'bg-slate-200 text-black border-slate-400'
              }`}
            >
              <tr>
                <th className="py-2.5 px-2 text-center w-9 border-r border-slate-300 dark:border-slate-700">#</th>
                <th className="py-2.5 px-2.5 min-w-[95px] border-r border-slate-300 dark:border-slate-700">Type</th>
                <th className="py-2.5 px-2.5 min-w-[95px] border-r border-slate-300 dark:border-slate-700">Chainage</th>
                <th className="py-2.5 px-2 text-center min-w-[85px] border-r border-slate-300 dark:border-slate-700 bg-amber-500/15 text-amber-950 dark:text-amber-300">
                  Interval
                </th>
                <th className="py-2.5 px-2.5 text-right min-w-[85px] border-r border-slate-300 dark:border-slate-700 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-sky-300">
                  BS ({readingUnit})
                </th>
                <th className="py-2.5 px-2.5 text-right min-w-[85px] border-r border-slate-300 dark:border-slate-700 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-300">
                  IS ({readingUnit})
                </th>
                <th className="py-2.5 px-2.5 text-center min-w-[95px] border-r border-slate-300 dark:border-slate-700 bg-amber-100/80 dark:bg-amber-950/60 text-slate-950 dark:text-amber-200">
                  Diff (Cut/Fill)
                </th>
                <th className="py-2.5 px-2.5 text-right min-w-[85px] border-r border-slate-300 dark:border-slate-700 bg-amber-50/70 dark:bg-amber-950/40 text-amber-950 dark:text-amber-300">
                  FS ({readingUnit})
                </th>
                <th className="py-2.5 px-2.5 text-right font-black min-w-[95px] border-r border-slate-300 dark:border-slate-700 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-cyan-300">
                  Col (HI)
                </th>
                <th className="py-2.5 px-3 text-right font-black min-w-[110px] border-r border-slate-300 dark:border-slate-700 bg-amber-100/90 dark:bg-amber-950/70 text-black dark:text-amber-300">
                  Red (RL)
                </th>
                <th className="py-2.5 px-2.5 text-right min-w-[105px] border-r border-slate-300 dark:border-slate-700 bg-purple-50/70 dark:bg-purple-950/40 text-purple-950 dark:text-purple-300">
                  Design RL
                </th>
                <th className="py-2.5 px-3 min-w-[120px] border-r border-slate-300 dark:border-slate-700">Remarks</th>
                <th className="py-2.5 px-1.5 text-center w-8"></th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-slate-300 dark:divide-slate-700 font-mono">
              {calculatedObservations.map((obs, idx) => {
                const isBM = obs.pointType === 'BM' || obs.pointType === 'BEACON' || (obs.backsightM !== null && idx === 0);
                const isPeg = obs.pointType === 'PEG';
                const isCP = obs.pointType === 'CP' || (obs.foresightM !== null && obs.backsightM !== null);

                // Calculate Cut/Fill Difference in mm (Design RL - Reduced Level)
                let diffMm: number | null = null;
                if (obs.calculatedRL_HI !== null && obs.designRLM !== null && obs.designRLM !== undefined) {
                  diffMm = Math.round((obs.designRLM - obs.calculatedRL_HI) * 1000);
                }

                // Format values based on unit toggle
                const formatVal = (valM: number | null) => {
                  if (valM === null || valM === undefined) return '';
                  return readingUnit === 'mm' ? Math.round(valM * 1000).toString() : valM.toFixed(3);
                };

                return (
                  <tr
                    key={obs.id}
                    className={`transition-colors border-b border-slate-300 dark:border-slate-700 ${
                      isCP
                        ? 'bg-amber-100/30 dark:bg-amber-950/30'
                        : isPeg
                        ? 'bg-purple-100/30 dark:bg-purple-950/30'
                        : isBM
                        ? 'bg-blue-100/30 dark:bg-blue-950/30'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-900/60'
                    }`}
                  >
                    {/* 0: Line # */}
                    <td className="py-1 px-2 text-center text-slate-800 dark:text-slate-300 font-sans text-xs font-black border-r border-slate-300 dark:border-slate-700 select-none">
                      {idx + 1}
                    </td>

                    {/* 1: Type / Feature (Dropdown) */}
                    <td className="p-0 border-r border-slate-300 dark:border-slate-700">
                      <select
                        value={obs.pointType}
                        onChange={(e) => handleCellChange(idx, 'pointType', e.target.value)}
                        className="w-full h-full px-2 py-1.5 bg-transparent text-xs font-sans font-black text-black dark:text-white focus:outline-none"
                      >
                        <option value="GROUND">Ground</option>
                        <option value="BM">Benchmark</option>
                        <option value="BEACON">Road Beacon</option>
                        <option value="PEG">Peg Top</option>
                        <option value="CP">Change Point</option>
                      </select>
                    </td>

                    {/* 2: Station / Chainage (Editable) */}
                    <td className="p-0 border-r border-slate-300 dark:border-slate-700">
                      <input
                        ref={(el) => { inputRefs.current[`${idx}-1`] = el; }}
                        type="text"
                        value={obs.chainage || ''}
                        onChange={(e) => handleCellChange(idx, 'chainage', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 1)}
                        placeholder="0+140"
                        className="w-full h-full px-2.5 py-1.5 bg-transparent font-sans font-black text-sm text-black dark:text-white focus:bg-amber-100 dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </td>

                    {/* 3: Interval / Offset (m) (Editable: e.g. -4.2, -3, 0, 3, 4.2) */}
                    <td className="p-0 border-r border-slate-300 dark:border-slate-700 bg-amber-500/10">
                      <input
                        ref={(el) => { inputRefs.current[`${idx}-2`] = el; }}
                        type="text"
                        value={obs.offsetMeters !== null && obs.offsetMeters !== undefined ? obs.offsetMeters : ''}
                        onChange={(e) => handleCellChange(idx, 'offsetMeters', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 2)}
                        placeholder="0"
                        className="w-full h-full px-2 py-1.5 text-center font-black text-sm text-amber-950 dark:text-amber-300 bg-transparent focus:bg-amber-100 dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </td>

                    {/* 4: Backsight (BS) (Editable) */}
                    <td className="p-0 border-r border-slate-300 dark:border-slate-700 bg-blue-50/50 dark:bg-blue-950/20">
                      <input
                        ref={(el) => { inputRefs.current[`${idx}-3`] = el; }}
                        type="text"
                        value={formatVal(obs.backsightM)}
                        onChange={(e) => handleCellChange(idx, 'backsightM', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 3)}
                        placeholder=""
                        className="w-full h-full px-2.5 py-1.5 text-right font-black font-mono text-sm sm:text-base text-blue-950 dark:text-sky-300 bg-transparent focus:bg-amber-100 dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>

                    {/* 5: Intermediate Sight (IS) (Editable) */}
                    <td className="p-0 border-r border-slate-300 dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-950/20">
                      <input
                        ref={(el) => { inputRefs.current[`${idx}-4`] = el; }}
                        type="text"
                        value={formatVal(obs.intermediateSightM)}
                        onChange={(e) => handleCellChange(idx, 'intermediateSightM', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 4)}
                        placeholder=""
                        className="w-full h-full px-2.5 py-1.5 text-right font-black font-mono text-sm sm:text-base text-emerald-950 dark:text-emerald-300 bg-transparent focus:bg-amber-100 dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>

                    {/* 6: Diff (+/- mm) (Automatic Cut / Fill calculation: Design RL - Reduced Level) */}
                    <td className="py-1.5 px-2.5 text-center font-black border-r border-slate-300 dark:border-slate-700 bg-amber-50/60 dark:bg-amber-950/30 select-none">
                      {diffMm !== null ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-black text-xs sm:text-sm font-mono shadow-sm ${
                            diffMm > 0
                              ? 'bg-emerald-100 dark:bg-emerald-950/90 text-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                              : diffMm < 0
                              ? 'bg-rose-100 dark:bg-rose-950/90 text-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-200'
                          }`}
                          title={diffMm > 0 ? `Fill ${diffMm} mm` : diffMm < 0 ? `Cut ${Math.abs(diffMm)} mm` : 'On Grade'}
                        >
                          {diffMm > 0 ? `+${diffMm}` : diffMm}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold">-</span>
                      )}
                    </td>

                    {/* 7: Foresight (FS) (Editable) */}
                    <td className="p-0 border-r border-slate-300 dark:border-slate-700 bg-amber-50/50 dark:bg-amber-950/20">
                      <input
                        ref={(el) => { inputRefs.current[`${idx}-5`] = el; }}
                        type="text"
                        value={formatVal(obs.foresightM)}
                        onChange={(e) => handleCellChange(idx, 'foresightM', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 5)}
                        placeholder=""
                        className="w-full h-full px-2.5 py-1.5 text-right font-black font-mono text-sm sm:text-base text-amber-950 dark:text-amber-300 bg-transparent focus:bg-amber-100 dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </td>

                    {/* 8: Col (HI / Collimation) (High-Contrast Bold) */}
                    <td className="py-1.5 px-2.5 text-right font-black font-mono text-sm border-r border-slate-300 dark:border-slate-700 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-cyan-300 select-none">
                      {obs.backsightM !== null && obs.knownRLM !== null ? (
                        readingUnit === 'mm' ? (
                          Math.round((obs.knownRLM + obs.backsightM) * 1000).toLocaleString()
                        ) : (
                          (obs.knownRLM + obs.backsightM).toFixed(3)
                        )
                      ) : (
                        ''
                      )}
                    </td>

                    {/* 9: Red (RL / Reduced Level) (High-Contrast Bold Amber) */}
                    <td className="py-1.5 px-3 text-right font-black font-mono text-sm sm:text-base border-r border-slate-300 dark:border-slate-700 bg-amber-100/80 dark:bg-amber-950/50 text-black dark:text-amber-300 select-none">
                      {obs.calculatedRL_HI !== null ? (
                        readingUnit === 'mm' ? (
                          Math.round(obs.calculatedRL_HI * 1000).toLocaleString()
                        ) : (
                          `${obs.calculatedRL_HI.toFixed(3)}`
                        )
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* 10: Design RL (Editable!) */}
                    <td className="p-0 border-r border-slate-300 dark:border-slate-700 bg-purple-50/40 dark:bg-purple-950/20">
                      <input
                        ref={(el) => { inputRefs.current[`${idx}-6`] = el; }}
                        type="text"
                        value={formatVal(obs.designRLM || null)}
                        onChange={(e) => handleCellChange(idx, 'designRLM', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 6)}
                        placeholder=""
                        className="w-full h-full px-2.5 py-1.5 text-right font-black font-mono text-sm sm:text-base text-purple-950 dark:text-purple-300 bg-transparent focus:bg-amber-100 dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        title="Enter Design RL to compute Cut/Fill Diff"
                      />
                    </td>

                    {/* 11: Remarks (Editable) */}
                    <td className="p-0 border-r border-slate-300 dark:border-slate-700">
                      <input
                        ref={(el) => { inputRefs.current[`${idx}-7`] = el; }}
                        type="text"
                        value={obs.remarks || ''}
                        onChange={(e) => handleCellChange(idx, 'remarks', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 7)}
                        placeholder="Notes..."
                        className="w-full h-full px-2.5 py-1.5 font-sans font-bold text-xs text-black dark:text-white bg-transparent focus:bg-amber-100 dark:focus:bg-slate-800 focus:outline-none"
                      />
                    </td>

                    {/* 12: Delete action */}
                    <td className="py-1 px-1.5 text-center">
                      <button
                        onClick={() => handleDeleteRow(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 rounded transition"
                        title="Delete line"
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

        {/* Quiet, Professional Bottom Status Bar */}
        <div
          className={`px-4 py-2.5 border-t-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-black ${
            isDark
              ? 'bg-slate-900 border-slate-700 text-slate-200'
              : 'bg-slate-100 border-slate-300 text-slate-900'
          }`}
        >
          <div className="flex items-center gap-4 font-mono text-xs flex-wrap">
            <span>Lines: <strong>{calculatedObservations.length}</strong></span>
            <span>
              Total BS: <strong>
                {calculatedObservations
                  .reduce((acc, o) => acc + (o.backsightM || 0), 0)
                  .toFixed(3)} m
              </strong>
            </span>
            <span>
              Total FS: <strong>
                {calculatedObservations
                  .reduce((acc, o) => acc + (o.foresightM || 0), 0)
                  .toFixed(3)} m
              </strong>
            </span>
            <span>
              Units: <strong>{readingUnit === 'mm' ? 'Millimetres (mm)' : 'Metres (m)'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-sans text-slate-500 dark:text-slate-400">
              Offline autosave active
            </span>
            <button
              onClick={onExportExcel}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1 shadow transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Field Book Photo Scanner Modal */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-6 backdrop-blur-sm">
          <div
            className={`max-w-4xl w-full max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border-2 overflow-hidden ${
              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'
            }`}
          >
            {/* Modal Header */}
            <div
              className={`px-6 py-4 border-b-2 flex items-center justify-between ${
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="font-black text-sm sm:text-base">
                    Field Book Photo Scanner (OCR)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Snap a photo of your handwritten page. Faint digits are highlighted in amber for easy review.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowScanModal(false);
                  setPhotoSrc(null);
                  setOcrRows([]);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-black dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {!photoSrc ? (
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm">Take a photo of your handwritten survey book</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      All scanning runs 100% locally on your device using offline AI. Your photos never leave your device.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Take Photo with Camera</span>
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs flex items-center gap-2"
                    >
                      <span>Choose from Gallery</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Image Preview & Controls */}
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative w-full md:w-1/2 max-h-64 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-black flex items-center justify-center">
                      <img
                        src={processedPhotoSrc || photoSrc}
                        alt="Survey Page"
                        className="max-h-64 object-contain"
                      />
                    </div>

                    <div className="w-full md:w-1/2 space-y-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleRotatePhoto}
                          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5"
                        >
                          <RotateCw className="w-4 h-4" />
                          <span>Rotate 90°</span>
                        </button>

                        <button
                          onClick={() => {
                            setPhotoSrc(null);
                            setProcessedPhotoSrc(null);
                            setOcrRows([]);
                          }}
                          className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-rose-600"
                        >
                          Retake Photo
                        </button>
                      </div>

                      <button
                        onClick={handleRunOcr}
                        disabled={isOcrRunning}
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs shadow flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{isOcrRunning ? ocrProgressMsg : 'Process & Read Handwriting'}</span>
                      </button>
                    </div>
                  </div>

                  {/* OCR Review Table */}
                  {ocrRows.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-xs uppercase tracking-wider">
                          Review Scanned Readings ({ocrRows.length} rows found)
                        </h4>
                        <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                          Amber cells = check carefully against photo
                        </span>
                      </div>

                      <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-x-auto max-h-56">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 font-black text-[10px] uppercase">
                            <tr>
                              <th className="p-2">Station</th>
                              <th className="p-2">Pos</th>
                              <th className="p-2 text-right">BS</th>
                              <th className="p-2 text-right">IS</th>
                              <th className="p-2 text-right">FS</th>
                              <th className="p-2">Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-bold">
                            {ocrRows.map((r, i) => (
                              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="p-1.5">
                                  <input
                                    type="text"
                                    value={r.pointId}
                                    onChange={(e) => {
                                      const copy = [...ocrRows];
                                      copy[i].pointId = e.target.value;
                                      setOcrRows(copy);
                                    }}
                                    className="w-20 px-1 py-0.5 border rounded bg-transparent text-black dark:text-white"
                                  />
                                </td>
                                <td className="p-1.5">
                                  <input
                                    type="text"
                                    value={r.position}
                                    onChange={(e) => {
                                      const copy = [...ocrRows];
                                      copy[i].position = e.target.value as any;
                                      setOcrRows(copy);
                                    }}
                                    className="w-12 px-1 py-0.5 border rounded bg-transparent text-black dark:text-white"
                                  />
                                </td>
                                <td className="p-1.5 text-right">
                                  <input
                                    type="text"
                                    value={r.backsight}
                                    onChange={(e) => {
                                      const copy = [...ocrRows];
                                      copy[i].backsight = e.target.value;
                                      setOcrRows(copy);
                                    }}
                                    className={`w-20 px-1 py-0.5 text-right border rounded font-mono ${
                                      r.uncertainFields?.includes('backsight')
                                        ? 'bg-amber-100 border-amber-400 text-amber-950 font-black'
                                        : 'bg-transparent text-black dark:text-white'
                                    }`}
                                  />
                                </td>
                                <td className="p-1.5 text-right">
                                  <input
                                    type="text"
                                    value={r.intermediateSight}
                                    onChange={(e) => {
                                      const copy = [...ocrRows];
                                      copy[i].intermediateSight = e.target.value;
                                      setOcrRows(copy);
                                    }}
                                    className={`w-20 px-1 py-0.5 text-right border rounded font-mono ${
                                      r.uncertainFields?.includes('intermediateSight')
                                        ? 'bg-amber-100 border-amber-400 text-amber-950 font-black'
                                        : 'bg-transparent text-black dark:text-white'
                                    }`}
                                  />
                                </td>
                                <td className="p-1.5 text-right">
                                  <input
                                    type="text"
                                    value={r.foresight}
                                    onChange={(e) => {
                                      const copy = [...ocrRows];
                                      copy[i].foresight = e.target.value;
                                      setOcrRows(copy);
                                    }}
                                    className={`w-20 px-1 py-0.5 text-right border rounded font-mono ${
                                      r.uncertainFields?.includes('foresight')
                                        ? 'bg-amber-100 border-amber-400 text-amber-950 font-black'
                                        : 'bg-transparent text-black dark:text-white'
                                    }`}
                                  />
                                </td>
                                <td className="p-1.5">
                                  <input
                                    type="text"
                                    value={r.remarks}
                                    onChange={(e) => {
                                      const copy = [...ocrRows];
                                      copy[i].remarks = e.target.value;
                                      setOcrRows(copy);
                                    }}
                                    className="w-full px-1 py-0.5 border rounded bg-transparent text-black dark:text-white font-sans text-xs"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {ocrRows.length > 0 && (
              <div
                className={`px-6 py-3 border-t-2 flex items-center justify-between ${
                  isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'
                }`}
              >
                <span className="text-xs font-bold text-slate-500">
                  Ready to transfer {ocrRows.length} rows
                </span>
                <button
                  onClick={handleApplyOcrRowsToGrid}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Transfer into Survey Book</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
