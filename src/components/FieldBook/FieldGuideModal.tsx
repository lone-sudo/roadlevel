import React from 'react';
import { X, BookOpen, Check, ArrowRight, Camera, Layers, Ruler } from 'lucide-react';

interface FieldGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark' | 'sunlight';
}

export const FieldGuideModal: React.FC<FieldGuideModalProps> = ({
  isOpen,
  onClose,
  theme,
}) => {
  if (!isOpen) return null;

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-6 backdrop-blur-sm">
      <div
        className={`max-w-3xl w-full max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-black text-base tracking-tight">
                Road Surveyor's Quick Field Guide
              </h3>
              <p className="text-xs text-slate-500">
                Simple step-by-step instructions for road levelling, peg setting, and dipping
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 text-xs leading-relaxed">
          {/* Step 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-xs">
                1
              </span>
              <h4 className="font-black text-sm text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                Starting Your Levelling Run (Benchmark & Backsight)
              </h4>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Set up your dumpy level on a firm tripod. Hold the levelling staff on your known Benchmark (e.g. <strong>BM-01</strong>, known RL = <strong>100.000 m</strong> or <strong>1830.000 m</strong>).
            </p>
            <div className={`p-3 rounded-2xl border font-mono ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-blue-50/60 border-blue-200'}`}>
              <p className="font-bold text-slate-800 dark:text-slate-100">
                • Row 1: Station = <strong>BM-01</strong> | BS = <strong>1.250</strong> (or <strong>1250 mm</strong>)
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                The app automatically adds BS to your Benchmark RL to establish the <strong>Height of Instrument (HI)</strong>:
                <br />
                HI = 100.000 + 1.250 = <strong>101.250 m</strong>.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-xs">
                2
              </span>
              <h4 className="font-black text-sm text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                Reading Ground Levels Across the Road (-4.5, -3, 0, 3, 4.5)
              </h4>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              At each road chainage (e.g. <strong>1+360</strong>), the staff person walks across the road from left to right:
            </p>
            <div className="grid grid-cols-5 gap-1.5 text-center font-bold text-[11px] py-1">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                <span className="block text-slate-500">Left Edge</span>
                -4.5 m
              </div>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                <span className="block text-slate-500">Left Lane</span>
                -3.0 m
              </div>
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 text-amber-900 dark:text-amber-200">
                <span className="block text-amber-600">Centreline</span>
                0.0 (CL)
              </div>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                <span className="block text-slate-500">Right Lane</span>
                +3.0 m
              </div>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                <span className="block text-slate-500">Right Edge</span>
                +4.5 m
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Type the staff reading in the <strong>IS (Intermediate Sight)</strong> column. Press <strong>Enter</strong> on your keyboard to instantly jump down to the next offset without using your mouse!
            </p>
          </div>

          {/* Step 3 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-black flex items-center justify-center text-xs">
                3
              </span>
              <h4 className="font-black text-sm text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                Moving the Instrument (Change Points / CP)
              </h4>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              When your view is blocked or too far:
            </p>
            <ul className="list-disc ml-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li>Take a <strong>Foresight (FS)</strong> on a solid point (e.g. peg or rock marked <strong>CP-1</strong>).</li>
              <li>Move the tripod to your new instrument position.</li>
              <li>Turn around and take a <strong>Backsight (BS)</strong> onto that same <strong>CP-1</strong>.</li>
              <li>The app automatically calculates the new HI using the CP elevation.</li>
            </ul>
          </div>

          {/* Step 4 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-black flex items-center justify-center text-xs">
                4
              </span>
              <h4 className="font-black text-sm text-purple-700 dark:text-purple-400 uppercase tracking-wide">
                Peg Setting & Preparing Dipping Values (Beacon & Peg Top)
              </h4>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              To give peg marks to the road construction team:
            </p>
            <div className={`p-3.5 rounded-2xl border space-y-2 ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-purple-50/60 border-purple-200'}`}>
              <p>
                <strong>1. Read the Beacon:</strong> Hold staff on the known road beacon $\rightarrow$ Enter reading as <strong>BS</strong> (establishes your HI).
              </p>
              <p>
                <strong>2. Read the Peg Top:</strong> Hold staff on TOP of the wooden peg $\rightarrow$ Enter reading as <strong>Peg Top</strong> (calculates Peg RL).
              </p>
              <p>
                <strong>3. The App Calculates:</strong>
                <br />
                Adjusted Level = <strong>Centreline Design RL + 300 mm Allowance</strong>
                <br />
                Marking Offset = <strong>Adjusted Level − Peg RL</strong>
              </p>
              <p className="font-bold text-slate-800 dark:text-slate-100">
                • If Positive (+55 mm): Mark <strong>55 mm UPWARD</strong> from top of peg.
                <br />
                • If Negative (-20 mm): Mark <strong>20 mm DOWNWARD</strong> from top of peg.
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-black flex items-center justify-center text-xs">
                5
              </span>
              <h4 className="font-black text-sm text-rose-700 dark:text-rose-400 uppercase tracking-wide">
                Road Dipping (Thread-to-Ground Check: Cut or Fill)
              </h4>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              A string thread is stretched across the marked pegs. Measure vertically from thread down to ground:
            </p>
            <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-rose-50/50 border-rose-200'}`}>
              <p className="font-bold text-slate-800 dark:text-slate-100">
                Rule: Correction = Measured Distance − Target Distance
              </p>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                • Target = 38 cm, Measured = 42 cm $\rightarrow$ <strong>FILL 4 cm (40 mm)</strong> (Ground is too low).
                <br />
                • Target = 38 cm, Measured = 32 cm $\rightarrow$ <strong>CUT 6 cm (60 mm)</strong> (Ground is too high).
              </p>
            </div>
          </div>

          {/* Step 6 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">
                6
              </span>
              <h4 className="font-black text-sm text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                Photographing Your Paper Survey Book (Camera OCR)
              </h4>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Tap <strong>"📸 Scan Survey Book Photo"</strong> at the top of the table. Point your phone camera at your field book.
              The app reads the columns automatically. Any handwriting digit that was faint or uncertain is highlighted in <strong>soft amber</strong> so you can tap and verify it in seconds before transferring it into your sheet!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-6 py-3 border-t flex justify-end ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow"
          >
            Got It! Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
