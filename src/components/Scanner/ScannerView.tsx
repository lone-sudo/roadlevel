import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  RotateCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Plus,
  ArrowRight,
  Sparkles,
  Info,
} from 'lucide-react';
import { FieldBookObservation, ProjectSettings, InstrumentSetup } from '../../types/survey';
import {
  scanFieldBookImage,
  preprocessCanvas,
  ExtractedFieldBookRow,
} from '../../utils/ocrScanner';

interface ScannerViewProps {
  project: ProjectSettings;
  setups: InstrumentSetup[];
  onImportReviewedObservations: (
    observations: Omit<FieldBookObservation, 'id' | 'createdAt' | 'updatedAt'>[]
  ) => Promise<void>;
  sunlightMode: boolean;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  project,
  setups,
  onImportReviewedObservations,
  sunlightMode,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [processedImageSrc, setProcessedImageSrc] = useState<string | null>(null);
  const [rotationDeg, setRotationDeg] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(1.2);
  const [brightness, setBrightness] = useState<number>(10);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [progressPct, setProgressPct] = useState<number>(0);

  const [extractedRows, setExtractedRows] = useState<ExtractedFieldBookRow[]>([]);
  const [rawText, setRawText] = useState<string>('');
  const [setupNumber, setSetupNumber] = useState<number>(setups[setups.length - 1]?.setupNumber || 1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Handle image upload or capture
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      setImageSrc(src);
      applyProcessing(src, rotationDeg, contrast, brightness);
    };
    reader.readAsDataURL(file);
  };

  // Re-run canvas image preprocessing
  const applyProcessing = (src: string, rot: number, con: number, bri: number) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const processed = preprocessCanvas(img, rot, con, bri);
      setProcessedImageSrc(processed);
    };
    img.src = src;
  };

  const handleRotate = () => {
    const nextRot = (rotationDeg + 90) % 360;
    setRotationDeg(nextRot);
    if (imageSrc) applyProcessing(imageSrc, nextRot, contrast, brightness);
  };

  // Trigger OCR extraction
  const handleStartOCR = async () => {
    if (!processedImageSrc) return;
    setIsProcessing(true);
    setProgressPct(5);
    setProgressMsg('Starting on-device OCR engine...');

    try {
      const res = await scanFieldBookImage(processedImageSrc, (pct, status) => {
        setProgressPct(pct);
        setProgressMsg(status);
      });
      setRawText(res.text);
      setExtractedRows(res.rows);
    } catch (err: any) {
      alert('OCR error: ' + (err?.message || 'Could not process image'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Preload a simulated handwritten fieldbook demo sample
  const handleLoadDemoSample = () => {
    // Generate synthetic field book image via canvas
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d')!;

    // Yellowed field book paper background with grid
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(0, 0, 600, 400);

    // Grid lines
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    for (let y = 40; y < 400; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(600, y);
      ctx.stroke();
    }
    for (let x = 60; x < 600; x += 90) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 400);
      ctx.stroke();
    }

    // Header
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('STN   BS    IS    FS    REMARKS', 20, 25);

    // Handwritten style text rows
    ctx.font = '16px serif';
    ctx.fillStyle = '#1e3a8a';
    ctx.fillText('BM-01 1.250             Known BM', 20, 60);
    ctx.fillText('0+000       1.875       Centre Line', 20, 90);
    ctx.fillText('0+020       1.620       Ground Pt', 20, 120);
    ctx.fillText('TBM-1             1.450 Headwall peg', 20, 150);

    const demoUrl = canvas.toDataURL('image/jpeg');
    setImageSrc(demoUrl);
    setProcessedImageSrc(demoUrl);

    // Provide mock parsed rows for instant test
    setExtractedRows([
      {
        tempId: 'ocr-1',
        pointId: 'BM-01',
        pointType: 'BM',
        chainage: '0+000',
        position: 'CL',
        backsight: '1.250',
        intermediateSight: '',
        foresight: '',
        remarks: 'Known BM',
        confidence: 94,
        uncertainFields: [],
        isConfirmed: false,
      },
      {
        tempId: 'ocr-2',
        pointId: '0+000 CL',
        pointType: 'GROUND',
        chainage: '0+000',
        position: 'CL',
        backsight: '',
        intermediateSight: '1.875',
        foresight: '',
        remarks: 'Centre Line',
        confidence: 88,
        uncertainFields: [],
        isConfirmed: false,
      },
      {
        tempId: 'ocr-3',
        pointId: '0+020 CL',
        pointType: 'GROUND',
        chainage: '0+020',
        position: 'CL',
        backsight: '',
        intermediateSight: '1.620',
        foresight: '',
        remarks: 'Ground Pt',
        confidence: 68,
        uncertainFields: ['intermediateSight'],
        isConfirmed: false,
      },
      {
        tempId: 'ocr-4',
        pointId: 'TBM-1',
        pointType: 'TBM',
        chainage: '0+040',
        position: 'OFFSET',
        backsight: '',
        intermediateSight: '',
        foresight: '1.450',
        remarks: 'Headwall peg',
        confidence: 92,
        uncertainFields: [],
        isConfirmed: false,
      },
    ]);
  };

  // Update a row in the review table
  const handleUpdateRow = (tempId: string, updates: Partial<ExtractedFieldBookRow>) => {
    setExtractedRows((prev) =>
      prev.map((r) => (r.tempId === tempId ? { ...r, ...updates, isConfirmed: true } : r))
    );
  };

  // Confirm and Import to Digital Field Book
  const handleConfirmAndImport = async () => {
    const unconfirmed = extractedRows.filter((r) => !r.isConfirmed);
    if (unconfirmed.length > 0) {
      if (
        !confirm(
          `Section 11.3 Safety Check: You have ${unconfirmed.length} unconfirmed rows. Are you sure you want to import all rows now?`
        )
      ) {
        return;
      }
    }

    const currentSetup = setups.find((s) => s.setupNumber === setupNumber) || setups[0];

    const obsToImport: Omit<FieldBookObservation, 'id' | 'createdAt' | 'updatedAt'>[] = extractedRows.map((r) => ({
      projectId: project.id,
      setupId: currentSetup ? currentSetup.id : 'setup-1',
      setupNumber,
      pointId: r.pointId,
      pointType: r.pointType,
      chainage: r.chainage || null,
      chainageMeters: null,
      position: r.position,
      offsetMeters: null,
      backsightM: r.backsight ? parseFloat(r.backsight) : null,
      intermediateSightM: r.intermediateSight ? parseFloat(r.intermediateSight) : null,
      foresightM: r.foresight ? parseFloat(r.foresight) : null,
      knownRLM: r.pointType === 'BM' && r.backsight ? 100.0 : null,
      calculatedRL_HI: null,
      riseM: null,
      fallM: null,
      calculatedRL_RF: null,
      designRLM: null,
      remarks: r.remarks,
      source: 'ocr_scan',
      isReviewed: true,
      imageUrl: processedImageSrc,
    }));

    await onImportReviewedObservations(obsToImport);
    alert(`Successfully imported ${obsToImport.length} verified observations into Field Book!`);
    setExtractedRows([]);
    setImageSrc(null);
  };

  return (
    <div className={`p-3 sm:p-6 space-y-6 ${sunlightMode ? 'text-slate-950' : 'text-slate-100'}`}>
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold flex items-center gap-2">
            <Camera className="w-5 h-5 text-amber-400" />
            <span>Photograph & Digitize Field Book (OCR & Human Review)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Section 11: Photograph paper field-book pages, extract readings on-device, and verify each digit before calculating.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadDemoSample}
          className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Load Field-Book Demo Sample</span>
        </button>
      </div>

      {/* Upload & Image Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Capture & Preprocessing Controls */}
        <div
          className={`lg:col-span-5 p-4 sm:p-5 rounded-2xl border shadow-sm space-y-4 ${
            sunlightMode ? 'bg-white border-slate-300' : 'bg-slate-800/80 border-slate-700'
          }`}
        >
          <h3 className="font-extrabold text-sm text-white">Capture or Select Field Book Photo</h3>

          {/* Hidden inputs */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleFileChange}
            accept="image/*"
            capture="environment"
            className="hidden"
          />

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow"
            >
              <Camera className="w-4 h-4" />
              <span>Take Photo</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Image</span>
            </button>
          </div>

          {/* Image Preview & Preprocessing Canvas */}
          {processedImageSrc ? (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 max-h-[300px] flex items-center justify-center">
                <img
                  src={processedImageSrc}
                  alt="Field Book"
                  className="max-h-[300px] w-auto object-contain"
                />
              </div>

              {/* Adjustments: Rotate & Contrast */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRotate}
                  className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold flex items-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotate (90°)</span>
                </button>

                <button
                  onClick={handleStartOCR}
                  disabled={isProcessing}
                  className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isProcessing ? 'Processing...' : 'Run On-Device OCR'}</span>
                </button>
              </div>

              {/* Progress bar */}
              {isProcessing && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>{progressMsg}</span>
                    <span>{progressPct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center text-slate-500 text-xs space-y-2">
              <Camera className="w-8 h-8 mx-auto text-slate-600" />
              <p>No photo loaded yet. Take a photograph of your field book or load the demo sample.</p>
            </div>
          )}

          <div className="text-[11px] text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-700/60 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>100% Offline:</strong> Optical Character Recognition runs entirely in your browser using
              client-side Web Workers. No field book photos or survey data leave your device.
            </span>
          </div>
        </div>

        {/* Right Column: Review & Confirmation Table */}
        <div
          className={`lg:col-span-7 p-4 sm:p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
            sunlightMode ? 'bg-white border-slate-300' : 'bg-slate-800/80 border-slate-700'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <span>Extracted Observations for Human Review</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">
                  {extractedRows.length} rows
                </span>
              </h3>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Target Setup:</span>
                <select
                  value={setupNumber}
                  onChange={(e) => setSetupNumber(parseInt(e.target.value) || 1)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold"
                >
                  {setups.map((s) => (
                    <option key={s.id} value={s.setupNumber}>
                      Setup #{s.setupNumber}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Instruction Banner */}
            <div className="mb-3 p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                <strong>Section 11.3 Mandatory Rule:</strong> Review each extracted reading. Amber fields indicate
                uncertain handwriting recognition. Confirm or edit before importing.
              </span>
            </div>

            {/* Extracted table */}
            <div className="border border-slate-700 rounded-xl overflow-x-auto max-h-[350px]">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase font-black text-[10px] sticky top-0 border-b border-slate-700">
                  <tr>
                    <th className="p-2">Point ID</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Pos</th>
                    <th className="p-2 text-blue-400">BS (m)</th>
                    <th className="p-2 text-emerald-400">IS (m)</th>
                    <th className="p-2 text-amber-400">FS (m)</th>
                    <th className="p-2">Remarks</th>
                    <th className="p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {extractedRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        No rows extracted yet. Run OCR on a photo or load the demo sample.
                      </td>
                    </tr>
                  ) : (
                    extractedRows.map((r) => {
                      const isUncertain = r.uncertainFields.length > 0;
                      return (
                        <tr
                          key={r.tempId}
                          className={`hover:bg-slate-800/60 ${
                            !r.isConfirmed && isUncertain ? 'bg-amber-950/20' : ''
                          }`}
                        >
                          <td className="p-2">
                            <input
                              type="text"
                              value={r.pointId}
                              onChange={(e) => handleUpdateRow(r.tempId, { pointId: e.target.value })}
                              className="w-24 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs font-bold text-white"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={r.pointType}
                              onChange={(e) => handleUpdateRow(r.tempId, { pointType: e.target.value as any })}
                              className="bg-slate-900 border border-slate-700 rounded px-1 py-1 text-[11px] font-bold text-white"
                            >
                              <option value="GROUND">Ground</option>
                              <option value="BM">BM</option>
                              <option value="CP">CP</option>
                              <option value="TBM">TBM</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <select
                              value={r.position}
                              onChange={(e) => handleUpdateRow(r.tempId, { position: e.target.value as any })}
                              className="bg-slate-900 border border-slate-700 rounded px-1 py-1 text-[11px] text-white"
                            >
                              <option value="CL">CL</option>
                              <option value="L">L</option>
                              <option value="R">R</option>
                              <option value="OFFSET">Offset</option>
                            </select>
                          </td>

                          {/* BS */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={r.backsight}
                              onChange={(e) => handleUpdateRow(r.tempId, { backsight: e.target.value })}
                              className={`w-16 bg-slate-900 rounded px-1.5 py-1 text-xs font-mono font-bold text-blue-300 border ${
                                r.uncertainFields.includes('backsight')
                                  ? 'border-amber-400 bg-amber-950/30'
                                  : 'border-slate-700'
                              }`}
                            />
                          </td>

                          {/* IS */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={r.intermediateSight}
                              onChange={(e) => handleUpdateRow(r.tempId, { intermediateSight: e.target.value })}
                              className={`w-16 bg-slate-900 rounded px-1.5 py-1 text-xs font-mono font-bold text-emerald-300 border ${
                                r.uncertainFields.includes('intermediateSight')
                                  ? 'border-amber-400 bg-amber-950/30'
                                  : 'border-slate-700'
                              }`}
                            />
                          </td>

                          {/* FS */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={r.foresight}
                              onChange={(e) => handleUpdateRow(r.tempId, { foresight: e.target.value })}
                              className={`w-16 bg-slate-900 rounded px-1.5 py-1 text-xs font-mono font-bold text-amber-300 border ${
                                r.uncertainFields.includes('foresight')
                                  ? 'border-amber-400 bg-amber-950/30'
                                  : 'border-slate-700'
                              }`}
                            />
                          </td>

                          <td className="p-2">
                            <input
                              type="text"
                              value={r.remarks}
                              onChange={(e) => handleUpdateRow(r.tempId, { remarks: e.target.value })}
                              className="w-28 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-slate-300"
                            />
                          </td>

                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleUpdateRow(r.tempId, { isConfirmed: !r.isConfirmed })}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 mx-auto ${
                                r.isConfirmed
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{r.isConfirmed ? 'Confirmed' : 'Verify'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Footer */}
          {extractedRows.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {extractedRows.filter((r) => r.isConfirmed).length} of {extractedRows.length} rows confirmed
              </span>

              <button
                onClick={handleConfirmAndImport}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg transition flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Import into Field Book</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
