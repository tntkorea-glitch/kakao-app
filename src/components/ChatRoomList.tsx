"use client";

import { useState } from "react";

interface ChatRoomListProps {
  rooms: string[];
  onRoomsChange: (rooms: string[]) => void;
}

export default function ChatRoomList({ rooms, onRoomsChange }: ChatRoomListProps) {
  const [input, setInput] = useState("");

  const addRoom = () => {
    const name = input.trim();
    if (!name || rooms.includes(name)) return;
    onRoomsChange([...rooms, name]);
    setInput("");
  };

  const removeRoom = (index: number) => {
    onRoomsChange(rooms.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    if (confirm("모든 대화방을 삭제하시겠습니까?")) {
      onRoomsChange([]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg font-bold mb-3">대화방 목록</h2>

      {/* 입력 */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addRoom()}
          placeholder="대화방 이름 입력..."
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={addRoom}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"
        >
          추가
        </button>
      </div>

      {/* 리스트 */}
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {rooms.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-8">
            대화방을 추가해주세요
          </div>
        ) : (
          rooms.map((room, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-3 py-2 bg-gray-800/50 rounded-lg group"
            >
              <span className="text-sm">{room}</span>
              <button
                onClick={() => removeRoom(i)}
                className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
              >
                삭제
              </button>
            </div>
          ))
        )}
      </div>

      {/* 하단 */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800">
        <span className="text-xs text-gray-500">총 {rooms.length}개</span>
        {rooms.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-red-400 hover:text-red-300"
          >
            전체 삭제
          </button>
        )}
      </div>
    </div>
  );
}
