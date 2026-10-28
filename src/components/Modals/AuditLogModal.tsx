import React from 'react';
import { History, X } from 'lucide-react';
import { AuditLogEntry } from '../../types/survey';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: string | null;
  auditLogs: AuditLogEntry[];
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  recordId,
  auditLogs,
}) => {
  if (!isOpen) return null;

  const filteredLogs = recordId
    ? auditLogs.filter((l) => l.recordId === recordId)
    : auditLogs;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-xl w-full p-5 space-y-4 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 pb-2">
          <h3 className="font-extrabold text-base flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            <span>Audit Trail {recordId ? `for Record ${recordId}` : 'All Events'}</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[350px] divide-y divide-slate-700/60 text-xs">
          {filteredLogs.length === 0 ? (
            <p className="text-slate-500 py-6 text-center">
              No previous corrections or modifications recorded for this entry.
            </p>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="py-2.5 space-y-1">
                <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                  <span className="font-bold text-amber-400">{log.fieldChanged}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 line-through">{String(log.oldValue)}</span>
                  <span className="text-slate-500">→</span>
                  <span className="font-bold text-emerald-400">{String(log.newValue)}</span>
                </div>
                {log.reason && (
                  <p className="text-slate-300 italic text-[11px]">Reason: {log.reason}</p>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
