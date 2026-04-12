"use client";

import { getElectronAPI } from "@/lib/electron";

interface MessageEditorProps {
  message: string;
  onMessageChange: (msg: string) => void;
  imagePath: string;
  onImagePathChange: (path: string) => void;
}

export default function MessageEditor({
  message,
  onMessageChange,
  imagePath,
  onImagePathChange,
}: MessageEditorProps) {
  const selectImage = async () => {
    const api = getElectronAPI();
    if (!api) {
      alert("Electron 환경에서만 이미지를 선택할 수 있습니다.");
      return;
    }
    const path = await api.openFileDialog();
    if (path) onImagePathChange(path);
  };

  const fileName = imagePath ? imagePath.split(/[/\\]/).pop() : null;

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg font-bold mb-3">발송 메시지</h2>

      {/* 텍스트 입력 */}
      <textarea
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        placeholder="발송할 메시지를 입력하세요..."
        className="flex-1 min-h-0 px-3 py-3 bg-gray-800 border border-gray-700 rounded-lg text-sm resize-none focus:outline-none focus:border-blue-500"
      />

      {/* 이미지 첨부 */}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={selectImage}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
        >
          이미지 첨부
        </button>
        {imagePath && (
          <>
            <span className="text-sm text-blue-400 truncate flex-1">{fileName}</span>
            <button
              onClick={() => onImagePathChange("")}
              className="text-xs text-red-400 hover:text-red-300"
            >
              제거
            </button>
          </>
        )}
        {!imagePath && (
          <span className="text-sm text-gray-500">첨부 이미지 없음</span>
        )}
      </div>
    </div>
  );
}
