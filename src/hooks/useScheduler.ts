"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Schedule } from "@/lib/types";
import { DAY_INDEX } from "@/lib/types";
import { isElectron, getElectronAPI } from "@/lib/electron";

interface UseSchedulerOptions {
  enabled: boolean;
  onLog: (msg: string) => void;
  onHistoryAdd: (record: {
    type: "scheduled";
    room: string;
    message: string;
    filePath?: string;
    result: "success" | "failure";
    error?: string;
  }) => void;
}

export function useScheduler({ enabled, onLog, onHistoryAdd }: UseSchedulerOptions) {
  // 이미 실행한 스케줄 추적: "scheduleId:YYYY-MM-DD:HH:MM"
  const executedRef = useRef<Set<string>>(new Set());
  const runningRef = useRef(false);

  const executeSchedule = useCallback(
    async (schedule: Schedule) => {
      const api = getElectronAPI();
      if (!api) return;

      const win = await api.kakao.findWindow();
      if (!win.found) {
        onLog(`[스케줄] 카카오톡이 실행되지 않아 발송 스킵: ${schedule.rooms.join(", ")}`);
        return;
      }

      onLog(`[스케줄] 발송 시작 → ${schedule.rooms.join(", ")}`);

      for (const room of schedule.rooms) {
        const result = await api.kakao.sendToRoom({
          roomName: room,
          message: schedule.message,
          imagePath: schedule.filePath || undefined,
          fileFirst: schedule.fileFirst,
        });

        const record = {
          type: "scheduled" as const,
          room,
          message: schedule.message,
          filePath: schedule.filePath,
          result: result.success ? ("success" as const) : ("failure" as const),
          error: result.error,
        };
        onHistoryAdd(record);

        if (result.success) {
          onLog(`[스케줄] [${room}] 발송 완료`);
        } else {
          onLog(`[스케줄] [${room}] 발송 실패: ${result.error}`);
        }

        // 대화방 간 2초 딜레이
        await new Promise((r) => setTimeout(r, 2000));
      }
    },
    [onLog, onHistoryAdd]
  );

  useEffect(() => {
    if (!enabled || !isElectron()) return;

    const check = async () => {
      if (runningRef.current) return;
      runningRef.current = true;

      try {
        const now = new Date();
        const dayStr = Object.keys(DAY_INDEX).find(
          (k) => DAY_INDEX[k] === now.getDay()
        );
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const dateStr = now.toISOString().slice(0, 10);

        const res = await fetch("/api/schedules");
        const schedules: Schedule[] = await res.json();

        for (const s of schedules) {
          if (!s.enabled) continue;
          if (!dayStr || !s.days.includes(dayStr)) continue;

          for (const t of s.times) {
            if (t !== timeStr) continue;

            const key = `${s.id}:${dateStr}:${t}`;
            if (executedRef.current.has(key)) continue;

            executedRef.current.add(key);
            await executeSchedule(s);
          }
        }
      } catch { /* ignore */ }

      runningRef.current = false;
    };

    // 30초마다 체크
    const intervalId = window.setInterval(check, 30000);
    // 시작 시 즉시 1회 체크
    check();

    // 자정에 실행 기록 초기화
    const midnightReset = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 5, 0);
      const ms = tomorrow.getTime() - now.getTime();
      return window.setTimeout(() => {
        executedRef.current.clear();
      }, ms);
    };
    const resetTimer = midnightReset();

    return () => {
      clearInterval(intervalId);
      clearTimeout(resetTimer);
    };
  }, [enabled, executeSchedule]);
}
