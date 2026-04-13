"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";

interface ExcelImportProps {
  onClose: () => void;
}

interface ParsedRow {
  days: string[];
  times: string[];
  rooms: string[];
  message: string;
  filePath: string;
  fileFirst: boolean;
}

export default function ExcelImport({ onClose }: ExcelImportProps) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseDays = (val: string): string[] => {
    if (!val) return [];
    const dayChars = ["월", "화", "수", "목", "금", "토", "일"];
    return dayChars.filter((d) => val.includes(d));
  };

  const parseTimes = (val: string): string[] => {
    if (!val) return [];
    return val
      .split(",")
      .map((t) => t.trim())
      .filter((t) => /^\d{1,2}:\d{2}$/.test(t));
  };

  const parseRooms = (val: string): string[] => {
    if (!val) return [];
    return val.split(/[\n\r]+/).map((r) => r.trim()).filter(Boolean);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });

        const parsed: ParsedRow[] = json.map((row) => ({
          days: parseDays(row["발송요일"] || ""),
          times: parseTimes(row["발송시간"] || ""),
          rooms: parseRooms(row["채팅방 이름"] || row["채팅방"] || ""),
          message: row["메세지"] || row["메시지"] || "",
          filePath: row["파일경로"] || row["파일"] || "",
          fileFirst: (row["파일먼저보내기"] || "").toUpperCase() === "Y",
        }));

        // 빈 행 제거
        setRows(parsed.filter((r) => r.days.length > 0 || r.times.length > 0 || r.rooms.length > 0));
      } catch {
        setError("엑셀 파일을 읽을 수 없습니다. 양식을 확인해주세요.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);

    const items = rows.map((r) => ({
      days: r.days,
      times: r.times,
      rooms: r.rooms,
      message: r.message,
      filePath: r.filePath,
      fileFirst: r.fileFirst,
      repeat: true,
    }));

    await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bulk-create", items }),
    });

    setImporting(false);
    onClose();
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const data = [
      {
        발송요일: "월화수목금",
        발송시간: "09:00, 12:00, 18:00",
        "채팅방 이름": "채팅방1",
        메세지: "안녕하세요.\n오늘도 좋은 하루 보내세요",
        파일경로: "C:\\이미지\\사진1.jpg",
        파일먼저보내기: "",
      },
      {
        발송요일: "월화수목금토일",
        발송시간: "09:00, 13:00",
        "채팅방 이름": "채팅방1\n채팅방2",
        메세지: "안녕하세요.\n오늘도 좋은 하루 보내세요",
        파일경로: "C:\\이미지\\사진1.jpg",
        파일먼저보내기: "Y",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "발송양식");
    XLSX.writeFile(wb, "카카오톡 자동 발송 양식.xlsx");
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-gray-900 rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-4">엑셀 일괄 등록</h3>

        <div className="text-xs text-gray-400 mb-4 space-y-1">
          <p>엑셀 파일(.xlsx)로 여러 스케줄을 한번에 등록할 수 있습니다.</p>
          <p>컬럼: 발송요일, 발송시간, 채팅방 이름, 메세지, 파일경로, 파일먼저보내기</p>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFile}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
          >
            엑셀 파일 선택
          </button>
          <button
            onClick={downloadTemplate}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
          >
            양식 다운로드
          </button>
        </div>

        {error && <div className="text-red-400 text-sm mb-4">{error}</div>}

        {rows.length > 0 && (
          <>
            <div className="text-sm text-green-400 mb-3">
              {rows.length}개 스케줄이 파싱되었습니다. 아래 내용을 확인 후 등록하세요.
            </div>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="py-2 px-2 text-left">#</th>
                    <th className="py-2 px-2 text-left">요일</th>
                    <th className="py-2 px-2 text-left">시간</th>
                    <th className="py-2 px-2 text-left">채팅방</th>
                    <th className="py-2 px-2 text-left">메시지</th>
                    <th className="py-2 px-2 text-left">파일</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-gray-800">
                      <td className="py-2 px-2">{i + 1}</td>
                      <td className="py-2 px-2">{r.days.join("")}</td>
                      <td className="py-2 px-2">{r.times.join(", ")}</td>
                      <td className="py-2 px-2 max-w-[120px] truncate">{r.rooms.join(", ")}</td>
                      <td className="py-2 px-2 max-w-[200px] truncate">{r.message}</td>
                      <td className="py-2 px-2">
                        {r.filePath ? r.filePath.split(/[/\\]/).pop() : "-"}
                        {r.fileFirst && " (F)"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">
            취소
          </button>
          {rows.length > 0 && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm font-medium"
            >
              {importing ? "등록 중..." : `${rows.length}개 일괄 등록`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
