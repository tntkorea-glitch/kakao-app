"use client";

import { useState } from "react";
import type { Schedule } from "@/lib/types";
import { DAYS } from "@/lib/types";
import { getElectronAPI } from "@/lib/electron";

interface ScheduleFormProps {
  initial: Schedule | null;
  onClose: () => void;
}

export default function ScheduleForm({ initial, onClose }: ScheduleFormProps) {
  const [days, setDays] = useState<string[]>(initial?.days || ["월", "화", "수", "목", "금"]);
  const [timesStr, setTimesStr] = useState(initial?.times.join(", ") || "09:00");
  const [roomsStr, setRoomsStr] = useState(initial?.rooms.join("\n") || "");
  const [message, setMessage] = useState(initial?.message || "");
  const [filePath, setFilePath] = useState(initial?.filePath || "");
  const [fileFirst, setFileFirst] = useState(initial?.fileFirst || false);
  const [repeat, setRepeat] = useState(initial?.repeat ?? true);
  const [saving, setSaving] = useState(false);

  const toggleDay = (d: string) => {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const selectFile = async () => {
    const api = getElectronAPI();
    if (!api) { alert("Electron 환경에서만 파일 선택 가능"); return; }
    const path = await api.openFileDialog();
    if (path) setFilePath(path);
  };

  const handleSave = async () => {
    const times = timesStr
      .split(",")
      .map((t) => t.trim())
      .filter((t) => /^\d{1,2}:\d{2}$/.test(t));
    const rooms = roomsStr
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean);

    if (days.length === 0) { alert("발송 요일을 선택해주세요."); return; }
    if (times.length === 0) { alert("발송 시간을 입력해주세요. (예: 09:00, 12:00)"); return; }
    if (rooms.length === 0) { alert("채팅방 이름을 입력해주세요."); return; }
    if (!message.trim() && !filePath) { alert("메시지 또는 파일을 입력해주세요."); return; }

    setSaving(true);
    const payload = initial
      ? { action: "update", id: initial.id, data: { days, times, rooms, message, filePath, fileFirst, repeat } }
      : { action: "create", days, times, rooms, message, filePath, fileFirst, repeat };

    await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-gray-900 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-4">
          {initial ? "스케줄 수정" : "스케줄 등록"}
        </h3>

        {/* 요일 선택 */}
        <div className="mb-4">
          <label className="text-sm text-gray-300 mb-2 block">발송 요일</label>
          <div className="flex gap-2">
            {DAYS.map((d) => (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                className={`w-10 h-10 rounded-lg text-sm font-medium ${
                  days.includes(d)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-500 hover:bg-gray-700"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* 발송 시간 */}
        <div className="mb-4">
          <label className="text-sm text-gray-300 mb-2 block">
            발송 시간 <span className="text-gray-500">(콤마로 구분, 예: 09:00, 12:00, 18:00)</span>
          </label>
          <input
            type="text"
            value={timesStr}
            onChange={(e) => setTimesStr(e.target.value)}
            placeholder="09:00, 13:00"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 채팅방 */}
        <div className="mb-4">
          <label className="text-sm text-gray-300 mb-2 block">
            채팅방 이름 <span className="text-gray-500">(줄바꿈으로 구분, 여러 채팅방 가능)</span>
          </label>
          <textarea
            value={roomsStr}
            onChange={(e) => setRoomsStr(e.target.value)}
            placeholder={"채팅방1\n채팅방2"}
            rows={3}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm resize-none focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 메시지 */}
        <div className="mb-4">
          <label className="text-sm text-gray-300 mb-2 block">메시지</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="발송할 메시지를 입력하세요"
            rows={4}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm resize-none focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 파일 */}
        <div className="mb-4">
          <label className="text-sm text-gray-300 mb-2 block">파일 첨부</label>
          <div className="flex items-center gap-2">
            <button
              onClick={selectFile}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs"
            >
              파일 선택
            </button>
            {filePath ? (
              <>
                <span className="text-xs text-blue-400 truncate flex-1">{filePath.split(/[/\\]/).pop()}</span>
                <button onClick={() => setFilePath("")} className="text-xs text-red-400">제거</button>
              </>
            ) : (
              <span className="text-xs text-gray-500">선택된 파일 없음</span>
            )}
          </div>
          {filePath && (
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={fileFirst}
                onChange={(e) => setFileFirst(e.target.checked)}
                className="accent-blue-500"
              />
              <span className="text-xs text-gray-400">파일을 먼저 보내고 텍스트를 전송</span>
            </label>
          )}
        </div>

        {/* 반복 */}
        <div className="mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={repeat}
              onChange={(e) => setRepeat(e.target.checked)}
              className="accent-blue-500"
            />
            <span className="text-sm text-gray-300">매주 반복</span>
          </label>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium"
          >
            {saving ? "저장 중..." : initial ? "수정" : "등록"}
          </button>
        </div>
      </div>
    </div>
  );
}
