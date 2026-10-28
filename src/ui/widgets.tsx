import { useEffect, useState } from "react";
import type { ReactNode } from "react";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {hint ? <small className="hint">{hint}</small> : null}
      </span>
      {children}
    </label>
  );
}

/** Visible, honest status banners. Failures and warnings are never hidden. */
export function Msg({ kind, children }: { kind: "error" | "ok" | "warn" | "info"; children: ReactNode }) {
  return <div className={`msg msg-${kind}`} role={kind === "error" ? "alert" : undefined}>{children}</div>;
}

export function useAsyncEffect(fn: () => Promise<void>, deps: unknown[]) {
  useEffect(() => {
    void fn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Typed, "no silent guessing" read for optional numeric text fields. */
export function useOptText(initial: string = "") {
  const [v, setV] = useState(initial);
  return { value: v, set: setV, isEmpty: v.trim() === "" };
}

export function download(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
