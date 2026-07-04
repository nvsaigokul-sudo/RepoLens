import React, { useState } from 'react';

interface DebugErrorDetailsProps {
  error: any;
}

export const DebugErrorDetails: React.FC<DebugErrorDetailsProps> = ({ error }) => {
  const [showStackTrace, setShowStackTrace] = useState(false);

  if (!error) return null;

  const responseData = error.response?.data;
  const isDebugMode = responseData && (responseData.errorType || responseData.stackTrace);

  if (!isDebugMode) {
    const standardMessage = typeof error === 'string' ? error : (responseData?.error?.message || responseData?.message || error.message || 'An unexpected error occurred.');
    return (
      <div className="text-xs text-red-300">
        {standardMessage}
      </div>
    );
  }

  const { errorType, message, path, stackTrace } = responseData;

  return (
    <div className="bg-red-950/40 border border-red-900/60 p-5 rounded-2xl text-left space-y-4 shadow-inner font-sans w-full">
      <div className="flex items-center space-x-2 border-b border-red-900/30 pb-2">
        <span className="bg-red-900 text-red-100 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-mono font-bold">
          Debug Active
        </span>
        <h4 className="text-sm font-bold text-red-200">Execution Exception</h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-red-400/80 block uppercase text-[10px] tracking-wide font-mono">Error Type</span>
          <span className="text-red-200 font-mono break-all font-bold">{errorType}</span>
        </div>
        <div>
          <span className="text-red-400/80 block uppercase text-[10px] tracking-wide font-mono">Request Path</span>
          <span className="text-red-200 font-mono break-all">{path}</span>
        </div>
        <div className="md:col-span-2">
          <span className="text-red-400/80 block uppercase text-[10px] tracking-wide font-mono">Exception Message</span>
          <span className="text-red-100 break-words">{message}</span>
        </div>
      </div>

      {stackTrace && (
        <div className="border-t border-red-900/20 pt-3">
          <button
            type="button"
            onClick={() => setShowStackTrace(!showStackTrace)}
            className="flex items-center justify-between w-full text-[10px] text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider font-mono font-bold"
          >
            <span>{showStackTrace ? '▼ Hide Stack Trace' : '▶ Show Stack Trace'}</span>
          </button>
          
          {showStackTrace && (
            <div className="mt-2 relative">
              <pre className="bg-black/60 text-red-300/90 text-[10px] font-mono p-4 rounded-xl overflow-x-auto max-h-60 border border-red-950/80 leading-relaxed scrollbar-thin scrollbar-thumb-red-900/50">
                {stackTrace}
              </pre>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(stackTrace);
                }}
                className="absolute top-2 right-2 bg-red-900/40 hover:bg-red-900/60 text-red-200 text-[9px] px-2 py-1 rounded border border-red-900/30 transition-all font-mono active:scale-95"
              >
                Copy
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
