"use client";

import { useState, useEffect, useCallback } from "react";
import type { SendRecord } from "@/lib/types";
import * as XLSX from "xlsx";

export default function SendHistory() {
  const [records, setRecords] = useState<SendRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      setRecords(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === records.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(records.map((r) => r.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`선택한 ${selected.size}개의 이력을 삭제하시겠습니까?`)) return;
    await fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", ids: Array.from(selected) }),
    });
    setSelected(new Set());
    fetchHistory();
  };

  const handleExportExcel = () => {
    if (records.length === 0) { alert("내보낼 이력이 없습니다."); return; }
    const data = records.map((r) => ({
      구분: r.type === "scheduled" ? "예약" : "즉시",
      발송시간: new Date(r.timestamp).toLocaleString("ko-KR"),
      채팅방: r.room,
      메시지: r.message,
      파일: r.filePath || "",
      결과: r.result === "success" ? "성공" : "실패",
      오류: r.error || "",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "발송이력");
    XLSX.writeFile(wb, `발송이력_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading) return <div className="text-gray-500 text-sm p-4">로딩 중...</div>;

  return (
    <div>
      {/* 상단 버튼 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-300">발송 이력</h3>
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-xs"
          >
            엑셀 저장
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={selected.size === 0}
            className="px-3 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-40 rounded-lg text-xs"
          >
            선택 삭제 ({selected.size})
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700 text-left">
              <th className="py-2 px-2 w-8">
                <input
                  type="checkbox"
                  checked={selected.size === records.length && records.length > 0}
                  onChange={toggleAll}
                  className="accent-blue-500"
                />
              </th>
              <th className="py-2 px-2">구분</th>
              <th className="py-2 px-2">발송시간</th>
              <th className="py-2 px-2">채팅방</th>
              <th className="py-2 px-2">메시지</th>
              <th className="py-2 px-2">파일</th>
              <th className="py-2 px-2">결과</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-gray-500 py-12">
                  발송 이력이 없습니다.
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="border-b border-gray-800">
                  <td className="py-2 px-2">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      className="accent-blue-500"
                    />
                  </td>
                  <td className="py-2 px-2 text-xs">
                    <span className={`px-2 py-0.5 rounded ${
                      r.type === "scheduled" ? "bg-blue-900/50 text-blue-400" : "bg-gray-700 text-gray-300"
                    }`}>
                      {r.type === "scheduled" ? "예약" : "즉시"}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-xs text-gray-300">
                    {new Date(r.timestamp).toLocaleString("ko-KR", { hour12: false })}
                  </td>
                  <td className="py-2 px-2 text-xs">{r.room}</td>
                  <td className="py-2 px-2 text-xs max-w-[250px] truncate" title={r.message}>
                    {r.message || "(없음)"}
                  </td>
                  <td className="py-2 px-2 text-xs">
                    {r.filePath ? (
                      <span className="text-blue-400">{r.filePath.split(/[/\\]/).pop()}</span>
                    ) : "-"}
                  </td>
                  <td className="py-2 px-2 text-xs">
                    {r.result === "success" ? (
                      <span className="text-green-400">성공</span>
                    ) : (
                      <span className="text-red-400" title={r.error}>실패</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
