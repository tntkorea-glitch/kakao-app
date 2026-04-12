"use client";

import { useState, useCallback, useRef } from "react";
import ChatRoomList from "@/components/ChatRoomList";
import MessageEditor from "@/components/MessageEditor";
import SendControls from "@/components/SendControls";
import LogViewer from "@/components/LogViewer";
import { isElectron, getElectronAPI } from "@/lib/electron";

export default function Dashboard() {
  // 상태
  const [rooms, setRooms] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [mode, setMode] = useState<"once" | "interval" | "schedule">("once");
  const [interval, setInterval_] = useState(5);
  const [scheduleHour, setScheduleHour] = useState(9);
  const [scheduleMinute, setScheduleMinute] = useState(0);
  const [delay, setDelay] = useState(2);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState("대기 중");
  const [logs, setLogs] = useState<string[]>([]);

  const stopRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString("ko-KR", { hour12: false });
    setLogs((prev) => [...prev, `[${time}] ${msg}`]);
  }, []);

  // ─── 발송 로직 ───
  const doSend = useCallback(async () => {
    const api = getElectronAPI();
    if (!api) {
      addLog("Electron 환경이 아닙니다. 데스크톱 앱에서 실행해주세요.");
      return;
    }

    // 카카오톡 확인
    const win = await api.kakao.findWindow();
    if (!win.found) {
      addLog("카카오톡이 실행되지 않았습니다. PC 카카오톡을 먼저 실행해주세요.");
      return;
    }

    addLog(`--- 발송 시작: ${rooms.length}개 대화방 ---`);

    let success = 0;
    let fail = 0;

    for (const room of rooms) {
      if (stopRef.current) {
        addLog("사용자가 중지를 요청했습니다.");
        break;
      }

      const result = await api.kakao.sendToRoom({
        roomName: room,
        message,
        imagePath: imagePath || undefined,
      });

      if (result.success) {
        success++;
        addLog(`[${room}] 발송 완료`);
      } else {
        fail++;
        addLog(`[${room}] 발송 실패: ${result.error || "알 수 없는 오류"}`);
      }

      // 대화방 간 딜레이
      if (!stopRef.current) {
        await new Promise((r) => setTimeout(r, delay * 1000));
      }
    }

    addLog(`--- 발송 완료: 성공 ${success}, 실패 ${fail} ---`);
  }, [rooms, message, imagePath, delay, addLog]);

  // ─── 시작 ───
  const handleStart = useCallback(async () => {
    if (rooms.length === 0) {
      alert("대화방을 1개 이상 추가해주세요.");
      return;
    }
    if (!message.trim() && !imagePath) {
      alert("메시지 또는 이미지를 입력해주세요.");
      return;
    }
    if (!isElectron()) {
      alert(
        "이 기능은 데스크톱 앱(Electron)에서만 사용할 수 있습니다.\n\n브라우저에서는 카카오톡을 제어할 수 없습니다."
      );
      return;
    }

    stopRef.current = false;
    setIsSending(true);

    if (mode === "once") {
      setStatus("발송 중...");
      await doSend();
      setIsSending(false);
      setStatus("대기 중");
    } else if (mode === "interval") {
      setStatus(`반복 발송 중 (${interval}분 간격)`);
      const run = async () => {
        if (stopRef.current) return;
        await doSend();
        if (!stopRef.current) {
          const nextTime = new Date(Date.now() + interval * 60000);
          addLog(`다음 발송: ${nextTime.toLocaleTimeString("ko-KR", { hour12: false })}`);
          timerRef.current = setTimeout(run, interval * 60000);
        }
      };
      run();
    } else if (mode === "schedule") {
      const now = new Date();
      const target = new Date();
      target.setHours(scheduleHour, scheduleMinute, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);

      const delayMs = target.getTime() - now.getTime();
      const mins = Math.floor(delayMs / 60000);
      addLog(
        `예약 발송 설정: ${target.toLocaleString("ko-KR")} (${mins}분 후)`
      );
      setStatus(`예약 대기 중 (${scheduleHour}:${String(scheduleMinute).padStart(2, "0")})`);

      timerRef.current = setTimeout(async () => {
        if (stopRef.current) return;
        setStatus("예약 발송 중...");
        addLog("예약 시간 도달 - 발송 시작");
        await doSend();
        setIsSending(false);
        setStatus("대기 중");
      }, delayMs);
    }
  }, [rooms, message, imagePath, mode, interval, scheduleHour, scheduleMinute, doSend, addLog]);

  // ─── 중지 ───
  const handleStop = useCallback(() => {
    stopRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsSending(false);
    setStatus("대기 중");
    addLog("발송 중지됨");
  }, [addLog]);

  return (
    <div className="flex flex-col h-screen p-4 gap-4 max-w-7xl mx-auto w-full">
      {/* 헤더 */}
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">카카오톡 자동 발송기</h1>
        <div className="flex items-center gap-3">
          {isElectron() ? (
            <span className="text-xs px-2 py-1 bg-green-900/50 text-green-400 rounded">
              데스크톱 연결됨
            </span>
          ) : (
            <span className="text-xs px-2 py-1 bg-yellow-900/50 text-yellow-400 rounded">
              브라우저 모드 (발송 불가)
            </span>
          )}
        </div>
      </header>

      {/* 메인: 대화방 + 메시지 */}
      <div className="flex-1 flex gap-4 min-h-0">
        <div className="w-80 flex-shrink-0 bg-gray-900 rounded-xl p-4">
          <ChatRoomList rooms={rooms} onRoomsChange={setRooms} />
        </div>
        <div className="flex-1 bg-gray-900 rounded-xl p-4">
          <MessageEditor
            message={message}
            onMessageChange={setMessage}
            imagePath={imagePath}
            onImagePathChange={setImagePath}
          />
        </div>
      </div>

      {/* 발송 설정 */}
      <div className="bg-gray-900 rounded-xl p-4">
        <SendControls
          mode={mode}
          onModeChange={setMode}
          interval={interval}
          onIntervalChange={setInterval_}
          scheduleHour={scheduleHour}
          scheduleMinute={scheduleMinute}
          onScheduleChange={(h, m) => {
            setScheduleHour(h);
            setScheduleMinute(m);
          }}
          delay={delay}
          onDelayChange={setDelay}
          isSending={isSending}
          onStart={handleStart}
          onStop={handleStop}
          status={status}
        />
      </div>

      {/* 로그 */}
      <div className="h-48 bg-gray-900 rounded-xl p-4">
        <LogViewer logs={logs} onClear={() => setLogs([])} />
      </div>
    </div>
  );
}
