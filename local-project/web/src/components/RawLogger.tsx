import React, { useState } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';

interface RawLoggerProps {
  logs: string[];
}

export const RawLogger: React.FC<RawLoggerProps> = ({ logs }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Live Terminal Stream Logger</h2>
            <p className="text-xs text-slate-400">Raw JSON response dari endpoint HTTP SSE / REST</p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" /> Copy Log
            </>
          )}
        </button>
      </div>

      <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 font-mono text-[11px] leading-relaxed text-slate-300 max-h-56 overflow-y-auto space-y-1">
        {logs.length === 0 ? (
          <div className="text-slate-600 italic">No events received yet...</div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="hover:bg-slate-900/50 p-1 rounded transition-colors break-all">
              <span className="text-sky-400 font-semibold">{log}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
