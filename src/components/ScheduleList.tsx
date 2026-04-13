"use client";

import { useState, useEffect, useCallback } from "react";
import type { Schedule } from "@/lib/types";
import { DAYS } from "@/lib/types";
import ScheduleForm from "./ScheduleForm";
import ExcelImport from "./ExcelImport";

interface ScheduleListProps {
  onSendNow: (schedule: Schedule) => void;
}

export default function ScheduleList({ onSendNow }: ScheduleListProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Schedule | null>(null);
  const [showImport, setShowImport] = useState(false);

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch("/api/schedules");
      const data = await res.json();
      setSchedules(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  const handleToggle = async (id: string) => {
    await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", id }),
    });
    fetchSchedules();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 스케줄을 삭제하시겠습니까?")) return;
    await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    fetchSchedules();
  };

  const handleEdit = (s: Schedule) => {
    setEditTarget(s);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditTarget(null);
    fetchSchedules();
  };

  if (loading) return <div className="text-gray-500 text-sm p-4">로딩 중...</div>;

  return (
    <div>
      {/* 상단 안내 + 버튼 */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-yellow-400 bg-yellow-900/20 px-3 py-2 rounded flex-1 mr-4">
          발송 설정 시간이 되면 자동으로 발송됩니다. 앱이 실행 중이어야 하며, PC 카카오톡이 켜져 있어야 합니다.
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs"
          >
            엑셀 일괄 등록
          </button>
          <button
            onClick={() => { setEditTarget(null); setShowForm(true); }}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-medium"
          >
            + 추가
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700 text-left">
              <th className="py-2 px-2 w-8">ON</th>
              <th className="py-2 px-2">요일</th>
              <th className="py-2 px-2">발송시간</th>
              <th className="py-2 px-2">채팅방</th>
              <th className="py-2 px-2">메시지 내용</th>
              <th className="py-2 px-2">파일</th>
              <th className="py-2 px-2 w-12">반복</th>
              <th className="py-2 px-2 w-32">액션</th>
            </tr>
          </thead>
          <tbody>
            {schedules.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-gray-500 py-12">
                  등록된 예약 발송이 없습니다. [+ 추가] 버튼으로 등록하세요.
                </td>
              </tr>
            ) : (
              schedules.map((s) => (
                <tr key={s.id} className={`border-b border-gray-800 ${!s.enabled ? "opacity-40" : ""}`}>
                  <td className="py-2 px-2">
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      onChange={() => handleToggle(s.id)}
                      className="accent-blue-500"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex gap-0.5">
                      {DAYS.map((d) => (
                        <span
                          key={d}
                          className={`text-xs w-5 h-5 flex items-center justify-center rounded ${
                            s.days.includes(d)
                              ? "bg-blue-600 text-white"
                              : "bg-gray-800 text-gray-600"
                          }`}
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-xs">{s.times.join(", ")}</td>
                  <td className="py-2 px-2 text-xs max-w-[120px] truncate" title={s.rooms.join(", ")}>
                    {s.rooms.join(", ")}
                  </td>
                  <td className="py-2 px-2 text-xs max-w-[200px] truncate" title={s.message}>
                    {s.message || "(텍스트 없음)"}
                  </td>
                  <td className="py-2 px-2 text-xs">
                    {s.filePath ? (
                      <span className="text-blue-400" title={s.filePath}>
                        {s.filePath.split(/[/\\]/).pop()}
                      </span>
                    ) : "-"}
                    {s.fileFirst && <span className="text-yellow-400 ml-1" title="파일 먼저 전송">F</span>}
                  </td>
                  <td className="py-2 px-2 text-xs text-center">
                    {s.repeat ? (
                      <span className="text-green-400">매주</span>
                    ) : (
                      <span className="text-gray-500">1회</span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => onSendNow(s)}
                        className="px-2 py-1 bg-green-700 hover:bg-green-600 rounded text-xs"
                        title="지금 발송"
                      >
                        발송
                      </button>
                      <button
                        onClick={() => handleEdit(s)}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="px-2 py-1 bg-red-900 hover:bg-red-800 rounded text-xs"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 스케줄 추가/수정 모달 */}
      {showForm && (
        <ScheduleForm
          initial={editTarget}
          onClose={handleFormClose}
        />
      )}

      {/* 엑셀 일괄 등록 모달 */}
      {showImport && (
        <ExcelImport
          onClose={() => { setShowImport(false); fetchSchedules(); }}
        />
      )}
    </div>
  );
}
