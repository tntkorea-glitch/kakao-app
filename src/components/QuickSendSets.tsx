"use client";

import { useState, useEffect, useCallback } from "react";
import type { QuickSendSet } from "@/lib/types";
import { getElectronAPI } from "@/lib/electron";

interface QuickSendSetsProps {
  onSendPreset: (preset: QuickSendSet) => void;
}

export default function QuickSendSets({ onSendPreset }: QuickSendSetsProps) {
  const [presets, setPresets] = useState<QuickSendSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<QuickSendSet | null>(null);

  // 폼 상태
  const [name, setName] = useState("");
  const [roomsStr, setRoomsStr] = useState("");
  const [message, setMessage] = useState("");
  const [filePath, setFilePath] = useState("");
  const [fileFirst, setFileFirst] = useState(false);

  const fetchPresets = useCallback(async () => {
    try {
      const res = await fetch("/api/presets");
      const data = await res.json();
      setPresets(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPresets(); }, [fetchPresets]);

  const openForm = (preset?: QuickSendSet) => {
    if (preset) {
      setEditTarget(preset);
      setName(preset.name);
      setRoomsStr(preset.rooms.join("\n"));
      setMessage(preset.message);
      setFilePath(preset.filePath || "");
      setFileFirst(preset.fileFirst);
    } else {
      setEditTarget(null);
      setName("");
      setRoomsStr("");
      setMessage("");
      setFilePath("");
      setFileFirst(false);
    }
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditTarget(null);
  };

  const selectFile = async () => {
    const api = getElectronAPI();
    if (!api) { alert("Electron 환경에서만 파일 선택 가능"); return; }
    const path = await api.openFileDialog();
    if (path) setFilePath(path);
  };

  const handleSave = async () => {
    const rooms = roomsStr.split("\n").map((r) => r.trim()).filter(Boolean);
    if (!name.trim()) { alert("세트 이름을 입력해주세요."); return; }
    if (rooms.length === 0) { alert("채팅방을 입력해주세요."); return; }
    if (!message.trim() && !filePath) { alert("메시지 또는 파일을 입력해주세요."); return; }

    const payload = editTarget
      ? { action: "update", id: editTarget.id, data: { name, rooms, message, filePath, fileFirst } }
      : { action: "create", name, rooms, message, filePath, fileFirst };

    await fetch("/api/presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    closeForm();
    fetchPresets();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 세트를 삭제하시겠습니까?")) return;
    await fetch("/api/presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    fetchPresets();
  };

  if (loading) return <div className="text-gray-500 text-sm p-4">로딩 중...</div>;

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-300">즉시 발송 세트</h3>
        <button
          onClick={() => openForm()}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-medium"
        >
          + 추가
        </button>
      </div>

      {/* 테이블 */}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 border-b border-gray-700 text-left">
            <th className="py-2 px-2">세트 이름</th>
            <th className="py-2 px-2">채팅방</th>
            <th className="py-2 px-2">메시지</th>
            <th className="py-2 px-2">파일</th>
            <th className="py-2 px-2 w-36">액션</th>
          </tr>
        </thead>
        <tbody>
          {presets.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center text-gray-500 py-12">
                등록한 즉시 발송 세트가 없습니다.
              </td>
            </tr>
          ) : (
            presets.map((p) => (
              <tr key={p.id} className="border-b border-gray-800">
                <td className="py-2 px-2 text-xs font-medium">{p.name}</td>
                <td className="py-2 px-2 text-xs max-w-[120px] truncate" title={p.rooms.join(", ")}>
                  {p.rooms.join(", ")}
                </td>
                <td className="py-2 px-2 text-xs max-w-[200px] truncate" title={p.message}>
                  {p.message || "(없음)"}
                </td>
                <td className="py-2 px-2 text-xs">
                  {p.filePath ? (
                    <span className="text-blue-400">{p.filePath.split(/[/\\]/).pop()}</span>
                  ) : "-"}
                  {p.fileFirst && <span className="text-yellow-400 ml-1">F</span>}
                </td>
                <td className="py-2 px-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => onSendPreset(p)}
                      className="px-2 py-1 bg-green-700 hover:bg-green-600 rounded text-xs"
                    >
                      발송
                    </button>
                    <button
                      onClick={() => openForm(p)}
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
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

      {/* 추가/수정 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={closeForm}>
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{editTarget ? "세트 수정" : "세트 등록"}</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 mb-1 block">세트 이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 오전 인사"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-1 block">채팅방 (줄바꿈 구분)</label>
                <textarea
                  value={roomsStr}
                  onChange={(e) => setRoomsStr(e.target.value)}
                  rows={3}
                  placeholder={"채팅방1\n채팅방2"}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm resize-none focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-1 block">메시지</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="발송할 메시지"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm resize-none focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-1 block">파일</label>
                <div className="flex items-center gap-2">
                  <button onClick={selectFile} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs">
                    파일 선택
                  </button>
                  {filePath ? (
                    <>
                      <span className="text-xs text-blue-400 truncate flex-1">{filePath.split(/[/\\]/).pop()}</span>
                      <button onClick={() => setFilePath("")} className="text-xs text-red-400">제거</button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-500">없음</span>
                  )}
                </div>
                {filePath && (
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={fileFirst} onChange={(e) => setFileFirst(e.target.checked)} className="accent-blue-500" />
                    <span className="text-xs text-gray-400">파일을 먼저 보내고 텍스트를 전송</span>
                  </label>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={closeForm} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">취소</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium">
                {editTarget ? "수정" : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
