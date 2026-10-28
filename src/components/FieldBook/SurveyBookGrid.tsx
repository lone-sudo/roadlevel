import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Plus,
  Trash2,
  Download,
  Clipboard,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  X,
  Sparkles,
  ArrowDown,
  Info,
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
  sunlightMode: boolean;
}

export const SurveyBookGrid: React.FC<SurveyBookGridProps> = ({
  project,
  observations,
  arithmeticCheck,
  onSaveObservations,
  onExportExcel,
  sunlightMode,
}) => {
  const isIntegerMm = project.unitConvention === 'mm_integer';

  // Local grid rows state (for instant zero-lag typing)
  const [gridRows, setGridRows] = useState<FieldBookObservation[]>([]);

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
  const tableRef = useRef<HTMLTableElement>(null);

  // Sync incoming observations into gridRows
  useEffect(() => {
    if (observations && observations.length > 0) {
      setGridRows(observations);
    } else {
      // Initialize with 5 clean blank rows if empty
      const initialBlankRows: FieldBookObservation[] = Array.from({ length: 5 }, (_, i) => ({
        id: `row-init-${Date.now()}-${i}`,
        projectId: project.id,
        setupId: 'setup-1',
        setupNumber: 1,
        pointId: i === 0 ? 'BM-01' : '',
        pointType: i === 0 ? 'BM' : 'GROUND',
        chainage: i === 0 ? '0+000' : '',
        chainageMeters: null,
        position: 'CL',
        offsetMeters: 0,
        backsightM: i === 0 ? 1.25 : null,
        intermediateSightM: null,
        foresightM: null,
        knownRLM: i === 0 ? 100.0 : null,
        calculatedRL_HI: i === 0 ? 100.0 : null,
        riseM: null,
        fallM: null,
        calculatedRL_RF: i === 0 ? 100.0 : null,
        designRLM: null,
        remarks: i === 0 ? 'Benchmark' : '',
        source: 'manual',
        isReviewed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      setGridRows(initialBlankRows);
    }
  }, [observations, project.id]);

  // Compute reductions live on gridRows
  const { calculatedObservations, arithmeticCheck: liveCheck } = React.useMemo(() => {
    return reduceSurveyLevelBook(gridRows);
  }, [gridRows]);

  // Save changes with debounce
  const debouncedSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerSave = (updatedRows: FieldBookObservation[]) => {
    if (debouncedSaveRef.current) clearTimeout(debouncedSaveRef.current);
    debouncedSaveRef.current = setTimeout(() => {
      onSaveObservations(updatedRows);
    }, 600);
  };

  // Cell change handler
  const handleCellChange = (
    index: number,
    field: keyof FieldBookObservation,
    value: string
  ) => {
    const updated = [...gridRows];
    const row = { ...updated[index] };

    if (field === 'backsightM' || field === 'intermediateSightM' || field === 'foresightM' || field === 'knownRLM') {
      const clean = value.replace(/,/g, '').trim();
      const num = clean === '' ? null : parseFloat(clean);
      (row[field] as any) = isNaN(num as number) ? null : num;
    } else {
      (row[field] as any) = value;
    }

    row.updatedAt = new Date().toISOString();
    updated[index] = row;
    setGridRows(updated);
    triggerSave(updated);
  };

  // Add a single blank row
  const handleAddRow = () => {
    const lastRow = gridRows[gridRows.length - 1];
    let nextChainage = '';

    // Smart chainage suggestion if last row had e.g. 0+020
    if (lastRow?.chainage && lastRow.chainage.includes('+')) {
      const parts = lastRow.chainage.split('+');
      const km = parseFloat(parts[0]) || 0;
      const m = parseFloat(parts[1]) || 0;
      const nextM = m + (project.chainageIntervalDefault || 20);
      nextChainage = `${km}+${nextM < 100 ? (nextM < 10 ? '00' + nextM : '0' + nextM) : nextM}`;
    }

    const newRow: FieldBookObservation = {
      id: `row-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      projectId: project.id,
      setupId: 'setup-1',
      setupNumber: 1,
      pointId: nextChainage ? `${nextChainage} CL` : '',
      pointType: 'GROUND',
      chainage: nextChainage,
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
    };

    const updated = [...gridRows, newRow];
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

  // Delete row
  const handleDeleteRow = (index: number) => {
    if (gridRows.length <= 1) {
      alert('Cannot delete all rows. Clear the readings instead.');
      return;
    }
    const updated = gridRows.filter((_, idx) => idx !== index);
    setGridRows(updated);
    triggerSave(updated);
  };

  // Clear sheet
  const handleClearSheet = () => {
    if (confirm('Clear all observations on this sheet? This cannot be undone.')) {
      const resetRow: FieldBookObservation = {
        id: `row-${Date.now()}`,
        projectId: project.id,
        setupId: 'setup-1',
        setupNumber: 1,
        pointId: 'BM-01',
        pointType: 'BM',
        chainage: '0+000',
        chainageMeters: 0,
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
      };
      setGridRows([resetRow]);
      triggerSave([resetRow]);
    }
  };

  // Paste from Excel / Google Sheets
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || text.trim() === '') {
        alert('Clipboard is empty. Copy a table from Excel first!');
        return;
      }

      const lines = text.trim().split(/\r?\n/);
      const newRows: FieldBookObservation[] = [];

      for (let i = 0; i < lines.length; i++) {
        const cols = lines[i].split('\t');
        if (cols.length < 2) continue;

        // Skip headers if user copied header line
        if (/STATION|POINT|BS|IS|FS|RL|CHAINAGE/i.test(cols[0])) continue;

        const stn = cols[0]?.trim() || `Pt-${i + 1}`;
        const ch = cols[1]?.trim() || '';
        const bs = cols[2] && !isNaN(parseFloat(cols[2])) ? parseFloat(cols[2]) : null;
        const isReading = cols[3] && !isNaN(parseFloat(cols[3])) ? parseFloat(cols[3]) : null;
        const fs = cols[4] && !isNaN(parseFloat(cols[4])) ? parseFloat(cols[4]) : null;
        const remarks = cols[5]?.trim() || '';

        newRows.push({
          id: `paste-row-${Date.now()}-${i}`,
          projectId: project.id,
          setupId: 'setup-1',
          setupNumber: 1,
          pointId: stn,
          pointType: bs !== null && i === 0 ? 'BM' : fs !== null ? 'CP' : 'GROUND',
          chainage: ch,
          chainageMeters: null,
          position: 'CL',
          offsetMeters: 0,
          backsightM: bs,
          intermediateSightM: isReading,
          foresightM: fs,
          knownRLM: i === 0 && bs !== null ? 100.0 : null,
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
        const updated = [...gridRows.filter((r) => r.pointId !== 'BM-01' || r.backsightM !== null), ...newRows];
        setGridRows(updated);
        triggerSave(updated);
        alert(`Successfully imported ${newRows.length} rows from Excel clipboard!`);
      } else {
        alert('Could not detect tabular columns from clipboard. Ensure you copied columns from Excel or Sheets.');
      }
    } catch (err: any) {
      alert('Could not read clipboard. Please check browser permissions: ' + err.message);
    }
  };

  // Keyboard navigation for spreadsheet (Enter adds row or moves down)
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (rowIndex === gridRows.length - 1) {
        handleAddRow();
      } else {
        // Focus the same column on next row
        setTimeout(() => {
          const inputs = tableRef.current?.querySelectorAll(`tr[data-row="${rowIndex + 1}"] input`);
          if (inputs && inputs[colIndex]) {
            (inputs[colIndex] as HTMLInputElement).focus();
          }
        }, 50);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Camera & Field Book Photo Scanning Workflow
  // ---------------------------------------------------------------------------
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
    setOcrProgressMsg('Initializing OCR on device...');

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

  // Apply scanned rows to the main spreadsheet
  const handleApplyOcrRowsToGrid = () => {
    if (ocrRows.length === 0) return;

    const converted: FieldBookObservation[] = ocrRows.map((r, i) => {
      const bs = r.backsight ? parseFloat(r.backsight) : null;
      const isReading = r.intermediateSight ? parseFloat(r.intermediateSight) : null;
      const fs = r.foresight ? parseFloat(r.foresight) : null;

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
        offsetMeters: 0,
        backsightM: isNaN(bs as number) ? null : bs,
        intermediateSightM: isNaN(isReading as number) ? null : isReading,
        foresightM: isNaN(fs as number) ? null : fs,
        knownRLM: i === 0 && bs !== null ? 100.0 : null,
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

    const updated = [...gridRows.filter((r) => r.pointId !== 'BM-01' || r.backsightM !== null), ...converted];
    setGridRows(updated);
    triggerSave(updated);
    setShowScanModal(false);
    setPhotoSrc(null);
    setOcrRows([]);
    alert(`Transferred ${converted.length} scanned rows into your Survey Book! All calculations computed.`);
  };

  return (
    <div className={`space-y-4 ${sunlightMode ? 'text-slate-950' : 'text-slate-900'}`}>
      {/* Action Header: Field Book Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 font-extrabold">
            📘
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
              <span>Survey Level Book</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200">
                {calculatedObservations.length} Rows
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Type directly into cells like Excel, or snap a photo of your paper level book.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Snap Photo Button (Primary) */}
          <button
            onClick={() => setShowScanModal(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-md hover:shadow transition"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Survey Book Photo</span>
          </button>

          {/* Add Row Button */}
          <button
            onClick={handleAddRow}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ 1 Row</span>
          </button>

          {/* Add 5 Rows */}
          <button
            onClick={handleAdd5Rows}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition"
          >
            <span>+ 5 Rows</span>
          </button>

          {/* Paste from Excel */}
          <button
            onClick={handlePasteFromClipboard}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 flex items-center gap-1.5 transition"
            title="Paste tab-separated columns directly from Excel or Google Sheets"
          >
            <Clipboard className="w-3.5 h-3.5 text-slate-500" />
            <span>Paste Excel</span>
          </button>

          {/* Export Excel */}
          <button
            onClick={onExportExcel}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Main Excel-Style Interactive Spreadsheet */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Table Header Notes */}
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              <strong>BS</strong>: Backsight (Sets HI)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <strong>IS</strong>: Intermediate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <strong>FS</strong>: Foresight (Change Point)
            </span>
          </div>
          <span className="hidden sm:inline text-slate-400">
            Tip: Press <strong>Enter</strong> to move down. Last row auto-adds.
          </span>
        </div>

        {/* Scrollable Spreadsheet Table */}
        <div className="overflow-x-auto max-h-[68vh] relative">
          <table ref={tableRef} className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100/90 text-slate-700 font-black text-[11px] uppercase tracking-wider sticky top-0 z-10 border-b border-slate-300 shadow-sm backdrop-blur-sm">
              <tr>
                <th className="py-2.5 px-2 text-center w-10 border-r border-slate-200">#</th>
                <th className="py-2.5 px-3 min-w-[130px] border-r border-slate-200">Station / Point</th>
                <th className="py-2.5 px-3 min-w-[100px] border-r border-slate-200">Chainage</th>
                <th className="py-2.5 px-3 text-right text-blue-700 min-w-[90px] border-r border-slate-200 bg-blue-50/50">
                  BS (m)
                </th>
                <th className="py-2.5 px-3 text-right text-emerald-700 min-w-[90px] border-r border-slate-200 bg-emerald-50/50">
                  IS (m)
                </th>
                <th className="py-2.5 px-3 text-right text-amber-700 min-w-[90px] border-r border-slate-200 bg-amber-50/50">
                  FS (m)
                </th>
                <th className="py-2.5 px-3 text-right font-bold text-slate-600 min-w-[100px] border-r border-slate-200">
                  HI (m)
                </th>
                <th className="py-2.5 px-3 text-right text-teal-700 min-w-[80px] border-r border-slate-200">
                  Rise (m)
                </th>
                <th className="py-2.5 px-3 text-right text-rose-700 min-w-[80px] border-r border-slate-200">
                  Fall (m)
                </th>
                <th className="py-2.5 px-3 text-right font-black text-slate-900 min-w-[120px] border-r border-slate-200 bg-amber-50/30">
                  RL ({isIntegerMm ? 'mm' : 'm'})
                </th>
                <th className="py-2.5 px-3 min-w-[150px] border-r border-slate-200">Remarks</th>
                <th className="py-2.5 px-2 text-center w-10"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 font-mono">
              {calculatedObservations.map((obs, idx) => {
                const isBM = obs.pointType === 'BM' || (obs.backsightM !== null && idx === 0);
                const isCP = obs.foresightM !== null;

                return (
                  <tr
                    key={obs.id}
                    data-row={idx}
                    className={`hover:bg-amber-50/40 transition-colors ${
                      isCP ? 'bg-amber-50/20' : isBM ? 'bg-blue-50/20' : ''
                    }`}
                  >
                    {/* Row Index */}
                    <td className="py-1.5 px-2 text-center text-slate-400 font-sans text-[11px] font-bold border-r border-slate-200 bg-slate-50/50 select-none">
                      {idx + 1}
                    </td>

                    {/* Station / Point ID (Editable) */}
                    <td className="p-0 border-r border-slate-200">
                      <input
                        type="text"
                        value={obs.pointId || ''}
                        onChange={(e) => handleCellChange(idx, 'pointId', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 0)}
                        placeholder="e.g. BM-01"
                        className="w-full h-full px-3 py-2 bg-transparent text-slate-900 font-bold font-sans text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </td>

                    {/* Chainage (Editable) */}
                    <td className="p-0 border-r border-slate-200">
                      <input
                        type="text"
                        value={obs.chainage || ''}
                        onChange={(e) => handleCellChange(idx, 'chainage', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 1)}
                        placeholder="0+000"
                        className="w-full h-full px-3 py-2 bg-transparent text-slate-700 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </td>

                    {/* Backsight (BS) (Editable) */}
                    <td className="p-0 border-r border-slate-200 bg-blue-50/30">
                      <input
                        type="number"
                        step="0.001"
                        value={obs.backsightM !== null ? obs.backsightM : ''}
                        onChange={(e) => handleCellChange(idx, 'backsightM', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 2)}
                        placeholder=""
                        className="w-full h-full px-3 py-2 bg-transparent text-right text-blue-800 font-black text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>

                    {/* Intermediate Sight (IS) (Editable) */}
                    <td className="p-0 border-r border-slate-200 bg-emerald-50/30">
                      <input
                        type="number"
                        step="0.001"
                        value={obs.intermediateSightM !== null ? obs.intermediateSightM : ''}
                        onChange={(e) => handleCellChange(idx, 'intermediateSightM', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 3)}
                        placeholder=""
                        className="w-full h-full px-3 py-2 bg-transparent text-right text-emerald-800 font-bold text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </td>

                    {/* Foresight (FS) (Editable) */}
                    <td className="p-0 border-r border-slate-200 bg-amber-50/30">
                      <input
                        type="number"
                        step="0.001"
                        value={obs.foresightM !== null ? obs.foresightM : ''}
                        onChange={(e) => handleCellChange(idx, 'foresightM', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 4)}
                        placeholder=""
                        className="w-full h-full px-3 py-2 bg-transparent text-right text-amber-800 font-black text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </td>

                    {/* HI (Collimation) (Auto-Computed) */}
                    <td className="py-2 px-3 text-right font-bold text-slate-600 border-r border-slate-200 bg-slate-50/50 select-none">
                      {obs.backsightM !== null && obs.knownRLM !== null
                        ? (obs.knownRLM + obs.backsightM).toFixed(3)
                        : ''}
                    </td>

                    {/* Rise (Auto-Computed) */}
                    <td className="py-2 px-3 text-right text-teal-700 font-semibold border-r border-slate-200 bg-slate-50/50 select-none">
                      {obs.riseM !== null ? obs.riseM.toFixed(3) : ''}
                    </td>

                    {/* Fall (Auto-Computed) */}
                    <td className="py-2 px-3 text-right text-rose-700 font-semibold border-r border-slate-200 bg-slate-50/50 select-none">
                      {obs.fallM !== null ? obs.fallM.toFixed(3) : ''}
                    </td>

                    {/* Reduced Level (RL) (Auto-Computed & Formatted) */}
                    <td className="py-2 px-3 text-right font-black text-slate-900 border-r border-slate-200 bg-amber-50/30 select-none">
                      {obs.calculatedRL_HI !== null ? (
                        isIntegerMm ? (
                          <div title={`${obs.calculatedRL_HI.toFixed(3)} m`}>
                            <span>{formatIntegerMm(obs.calculatedRL_HI)}</span>
                            <span className="text-[10px] text-slate-500 font-normal block">
                              {obs.calculatedRL_HI.toFixed(3)} m
                            </span>
                          </div>
                        ) : (
                          `${obs.calculatedRL_HI.toFixed(3)} m`
                        )
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Remarks (Editable) */}
                    <td className="p-0 border-r border-slate-200">
                      <input
                        type="text"
                        value={obs.remarks || ''}
                        onChange={(e) => handleCellChange(idx, 'remarks', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 5)}
                        placeholder="Notes..."
                        className="w-full h-full px-3 py-2 bg-transparent text-slate-600 font-sans text-xs focus:bg-white focus:outline-none"
                      />
                    </td>

                    {/* Delete row action */}
                    <td className="py-1 px-2 text-center">
                      <button
                        onClick={() => handleDeleteRow(idx)}
                        className="p-1 hover:bg-rose-50 text-slate-300 hover:text-rose-600 rounded transition"
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

        {/* Live Arithmetic Check Sticky Footer */}
        <div className="bg-slate-900 text-white p-3.5 sm:px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-t border-slate-800">
          <div className="flex items-center gap-3">
            {liveCheck.isPassed ? (
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
            )}
            <div>
              <span className="font-black text-xs sm:text-sm tracking-tight text-white block">
                {liveCheck.statusMessage}
              </span>
              <span className="text-[11px] text-slate-400 block font-mono">
                ΣBS: <strong>{liveCheck.sumBS.toFixed(3)} m</strong> | ΣFS:{' '}
                <strong>{liveCheck.sumFS.toFixed(3)} m</strong> | ΣBS−ΣFS:{' '}
                <strong>{liveCheck.diffBS_FS.toFixed(3)} m</strong> | ΔRL:{' '}
                <strong>{liveCheck.diffRL !== null ? `${liveCheck.diffRL.toFixed(3)} m` : '-'}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={handleClearSheet}
              className="text-xs text-slate-400 hover:text-rose-400 underline font-medium px-2 py-1"
            >
              Clear Sheet
            </button>
            <button
              onClick={handleAddRow}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Next Row</span>
            </button>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 📸 Survey Book Photo Scanner Modal with Immediate Correction         */}
      {/* --------------------------------------------------------------------- */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-6 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-900">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Camera className="w-5 h-5 text-amber-600" />
                <h3 className="font-black text-base text-slate-900">
                  Scan Paper Survey Book Page
                </h3>
              </div>
              <button
                onClick={() => setShowScanModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Split Photo View & Interactive Extracted Table */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Photo View & Controls */}
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
                    className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 flex items-center justify-center gap-1.5"
                  >
                    <span>Upload Image</span>
                  </button>
                </div>

                {photoSrc ? (
                  <div className="space-y-3">
                    <div className="relative rounded-2xl overflow-hidden border border-slate-300 bg-slate-950 max-h-[300px] flex items-center justify-center shadow-inner">
                      <img
                        src={processedPhotoSrc || photoSrc}
                        alt="Survey Book"
                        className="max-h-[300px] w-auto object-contain"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={handleRotatePhoto}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 border border-slate-300"
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
                      <p className="text-xs text-blue-600 font-semibold animate-pulse text-center">
                        {ocrProgressMsg}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center text-slate-400 text-xs space-y-2">
                    <Camera className="w-10 h-10 mx-auto text-slate-300" />
                    <p>Snap a photo of your handwritten survey book page or upload an image.</p>
                  </div>
                )}
              </div>

              {/* Right Column: Editable Preview with Amber Uncertainty Highlighting */}
              <div className="md:col-span-7 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-black text-xs uppercase tracking-wider text-slate-700">
                      Extracted Readings for Verification ({ocrRows.length} rows)
                    </h4>
                    <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Amber cells = Check against photo
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[320px]">
                    <table className="w-full text-left text-xs border-collapse font-mono">
                      <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-2">Station</th>
                          <th className="p-2">Chainage</th>
                          <th className="p-2 text-blue-700">BS</th>
                          <th className="p-2 text-emerald-700">IS</th>
                          <th className="p-2 text-amber-700">FS</th>
                          <th className="p-2 font-sans">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {ocrRows.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400 font-sans">
                              {photoSrc
                                ? 'Click "Extract Readings" to read handwriting from the photo.'
                                : 'No photo uploaded yet.'}
                            </td>
                          </tr>
                        ) : (
                          ocrRows.map((r, i) => (
                            <tr key={r.tempId} className="hover:bg-slate-50">
                              <td className="p-1">
                                <input
                                  type="text"
                                  value={r.pointId}
                                  onChange={(e) => {
                                    const up = [...ocrRows];
                                    up[i].pointId = e.target.value;
                                    setOcrRows(up);
                                  }}
                                  className="w-20 px-1.5 py-1 border border-slate-300 rounded font-bold text-slate-900"
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
                                  className="w-16 px-1.5 py-1 border border-slate-300 rounded text-slate-700"
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
                                      ? 'bg-amber-100 border-2 border-amber-500 text-amber-950 font-black'
                                      : 'border border-slate-300 text-blue-800'
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
                                      ? 'bg-amber-100 border-2 border-amber-500 text-amber-950 font-black'
                                      : 'border border-slate-300 text-emerald-800'
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
                                      ? 'bg-amber-100 border-2 border-amber-500 text-amber-950 font-black'
                                      : 'border border-slate-300 text-amber-800'
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
                                  className="w-24 px-1.5 py-1 border border-slate-300 rounded font-sans text-slate-700 text-[11px]"
                                />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Confirm & Drop Into Spreadsheet */}
                {ocrRows.length > 0 && (
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Check any amber numbers against your photo on the left.
                    </span>
                    <button
                      onClick={handleApplyOcrRowsToGrid}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg transition flex items-center gap-1.5"
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
