"use client";

interface SendControlsProps {
  mode: "once" | "interval" | "schedule";
  onModeChange: (mode: "once" | "interval" | "schedule") => void;
  interval: number;
  onIntervalChange: (n: number) => void;
  scheduleHour: number;
  scheduleMinute: number;
  onScheduleChange: (h: number, m: number) => void;
  delay: number;
  onDelayChange: (n: number) => void;
  isSending: boolean;
  onStart: () => void;
  onStop: () => void;
  status: string;
}

export default function SendControls({
  mode,
  onModeChange,
  interval,
  onIntervalChange,
  scheduleHour,
  scheduleMinute,
  onScheduleChange,
  delay,
  onDelayChange,
  isSending,
  onStart,
  onStop,
  status,
}: SendControlsProps) {
  return (
    <div className="space-y-4">
      {/* 모드 선택 */}
      <div className="flex items-center gap-6">
        <span className="text-sm font-bold">발송 모드</span>
        {(["once", "interval", "schedule"] as const).map((m) => (
          <label key={m} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="mode"
              checked={mode === m}
              onChange={() => onModeChange(m)}
              className="accent-blue-500"
            />
            <span className="text-sm">
              {m === "once" ? "즉시 1회" : m === "interval" ? "반복 발송" : "예약 발송"}
            </span>
          </label>
        ))}
      </div>

      {/* 설정값 */}
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">반복 간격</span>
          <input
            type="number"
            min={1}
            value={interval}
            onChange={(e) => onIntervalChange(Number(e.target.value) || 1)}
            className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-center"
          />
          <span className="text-sm text-gray-400">분</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">예약 시간</span>
          <input
            type="number"
            min={0}
            max={23}
            value={scheduleHour}
            onChange={(e) => onScheduleChange(Number(e.target.value), scheduleMinute)}
            className="w-14 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-center"
          />
          <span className="text-gray-500">:</span>
          <input
            type="number"
            min={0}
            max={59}
            value={scheduleMinute}
            onChange={(e) => onScheduleChange(scheduleHour, Number(e.target.value))}
            className="w-14 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-center"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">발송 간 딜레이</span>
          <input
            type="number"
            min={0.5}
            step={0.5}
            value={delay}
            onChange={(e) => onDelayChange(Number(e.target.value) || 2)}
            className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-center"
          />
          <span className="text-sm text-gray-400">초</span>
        </div>
      </div>

      {/* 시작/중지 */}
      <div className="flex items-center gap-4">
        <button
          onClick={onStart}
          disabled={isSending}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold text-sm"
        >
          ▶ 발송 시작
        </button>
        <button
          onClick={onStop}
          disabled={!isSending}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold text-sm"
        >
          ■ 중지
        </button>
        <span className="text-sm text-gray-400">{status}</span>
      </div>
    </div>
  );
}
