"use client";

import { useEffect, useRef } from "react";

interface LogViewerProps {
  logs: string[];
  onClear: () => void;
}

export default function LogViewer({ logs, onClear }: LogViewerProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold">발송 로그</h2>
        <button
          onClick={onClear}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          로그 지우기
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto bg-gray-900/50 rounded-lg p-3 font-mono text-xs space-y-0.5">
        {logs.length === 0 ? (
          <span className="text-gray-600">발송 로그가 여기에 표시됩니다</span>
        ) : (
          logs.map((log, i) => (
            <div
              key={i}
              className={
                log.includes("완료")
                  ? "text-green-400"
                  : log.includes("실패") || log.includes("오류")
                  ? "text-red-400"
                  : "text-gray-400"
              }
            >
              {log}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
