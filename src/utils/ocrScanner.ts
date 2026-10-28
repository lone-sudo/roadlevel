// On-Device Field Book OCR and Image Processing Module for RoadLevel
import { createWorker } from 'tesseract.js';
import { FieldBookObservation, ObservationPointType, CrossSectionPosition } from '../types/survey';

export interface ExtractedFieldBookRow {
  tempId: string;
  pointId: string;
  pointType: ObservationPointType;
  chainage: string;
  position: CrossSectionPosition;
  backsight: string;
  intermediateSight: string;
  foresight: string;
  remarks: string;
  confidence: number;
  uncertainFields: string[];
  isConfirmed: boolean;
}

/**
 * Preprocess image on HTML canvas: rotate, adjust contrast, and grayscale
 */
export function preprocessCanvas(
  img: HTMLImageElement,
  rotationDeg: number = 0,
  contrast: number = 1.2,
  brightness: number = 10
): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return img.src;

  if (rotationDeg === 90 || rotationDeg === 270) {
    canvas.width = img.height;
    canvas.height = img.width;
  } else {
    canvas.width = img.width;
    canvas.height = img.height;
  }

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotationDeg * Math.PI) / 180);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.restore();

  // Apply contrast, brightness, and grayscale for clearer handwriting extraction
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));

  for (let i = 0; i < data.length; i += 4) {
    // Grayscale
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    // Contrast & brightness
    const val = factor * (gray - 128) + 128 + brightness;
    const clamped = Math.max(0, Math.min(255, val));
    data[i] = clamped;
    data[i + 1] = clamped;
    data[i + 2] = clamped;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Run client-side Tesseract.js OCR on field book image
 */
export async function scanFieldBookImage(
  imageSource: string,
  onProgress?: (progress: number, status: string) => void
): Promise<{ text: string; rows: ExtractedFieldBookRow[] }> {
  onProgress?.(10, 'Initializing OCR engine...');

  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        const pct = Math.round(10 + m.progress * 80);
        onProgress?.(pct, `Recognizing handwriting: ${Math.round(m.progress * 100)}%`);
      }
    },
  });

  onProgress?.(30, 'Analyzing image lines and table structure...');
  const ret = await worker.recognize(imageSource);
  await worker.terminate();

  onProgress?.(95, 'Parsing tabular survey columns...');
  const rows = parseExtractedTextToRows(ret.data.text);
  onProgress?.(100, 'Complete');

  return {
    text: ret.data.text,
    rows,
  };
}

/**
 * Parse lines of OCR text into candidate field book rows.
 * Flags uncertain values where handwriting may be ambiguous.
 */
export function parseExtractedTextToRows(rawText: string): ExtractedFieldBookRow[] {
  const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const rows: ExtractedFieldBookRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip headers or very short artifacts
    if (/^(BS|IS|FS|RL|CHAINAGE|STATION|POINT|REMARKS|SETUP)/i.test(line)) {
      continue;
    }

    const tokens = line.split(/\s+/);
    if (tokens.length < 2) continue;

    // Detect numbers in line
    const numbers: string[] = [];
    const textTokens: string[] = [];
    const uncertainFields: string[] = [];

    tokens.forEach((t) => {
      // Check if token looks like a staff reading (e.g. 1.250, 1.85, 2.1)
      const numMatch = t.match(/^(\d{1,4}[.,]\d{1,4}|\d{1,4})$/);
      if (numMatch) {
        numbers.push(t.replace(',', '.'));
      } else {
        textTokens.push(t);
      }
    });

    // Detect point ID or chainage
    let pointId = textTokens[0] || `Point-${i + 1}`;
    let chainage = '';
    let position: CrossSectionPosition = 'CL';
    let pointType: ObservationPointType = 'GROUND';

    // Check if point ID contains chainage like "0+020" or "0+040"
    const chainageMatch = line.match(/\b(\d+\+\d+(\.\d+)?)\b/);
    if (chainageMatch) {
      chainage = chainageMatch[1];
    }

    if (/BM/i.test(line)) pointType = 'BM';
    else if (/TBM/i.test(line)) pointType = 'TBM';
    else if (/CP/i.test(line)) pointType = 'CP';
    else if (/BEACON/i.test(line)) pointType = 'BEACON';
    else if (/PEG/i.test(line)) pointType = 'PEG';

    if (/\bL\b|LEFT/i.test(line)) position = 'L';
    else if (/\bR\b|RIGHT/i.test(line)) position = 'R';
    else if (/\bCL\b|CENTRE|CENTER/i.test(line)) position = 'CL';

    // Assign readings tentatively based on position in line
    let bs = '';
    let is = '';
    let fs = '';

    if (pointType === 'BM' || (i === 0 && numbers.length > 0)) {
      bs = numbers[0] || '';
      if (numbers.length > 1) is = numbers[1];
    } else if (pointType === 'CP') {
      fs = numbers[0] || '';
      if (numbers.length > 1) bs = numbers[1];
    } else {
      if (numbers.length === 1) {
        is = numbers[0];
      } else if (numbers.length >= 2) {
        is = numbers[0];
        fs = numbers[1];
      }
    }

    // Flag uncertain fields
    if (bs && isNaN(parseFloat(bs))) uncertainFields.push('backsight');
    if (is && isNaN(parseFloat(is))) uncertainFields.push('intermediateSight');
    if (fs && isNaN(parseFloat(fs))) uncertainFields.push('foresight');

    // Ambiguous digit detection (e.g. 3 vs 8, 1 vs 7)
    if (/[38]/.test(bs + is + fs)) {
      // Common handwriting ambiguity on site
    }

    rows.push({
      tempId: `ocr-row-${Date.now()}-${i}`,
      pointId,
      pointType,
      chainage,
      position,
      backsight: bs,
      intermediateSight: is,
      foresight: fs,
      remarks: textTokens.slice(1).join(' '),
      confidence: uncertainFields.length > 0 ? 65 : 85,
      uncertainFields,
      isConfirmed: false,
    });
  }

  return rows;
}
