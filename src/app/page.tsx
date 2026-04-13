"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import ScheduleList from "@/components/ScheduleList";
import SendHistory from "@/components/SendHistory";
import QuickSendSets from "@/components/QuickSendSets";
import LogViewer from "@/components/LogViewer";
import { isElectron, getElectronAPI } from "@/lib/electron";
import { useScheduler } from "@/hooks/useScheduler";
import type { Schedule, QuickSendSet } from "@/lib/types";

type Tab = "schedules" | "history" | "presets";

export default function Dashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // 인증 상태
  const [serialInput, setSerialInput] = useState("");
  const [serialStatus, setSerialStatus] = useState<{
    valid: boolean;
    daysLeft?: number;
    reason?: string;
  } | null>(null);
  const [serialLoading, setSerialLoading] = useState(true);
  const [serialError, setSerialError] = useState("");

  const authChecked = status !== "loading";
  const user = session?.user
    ? { id: (session.user as { id?: string }).id || "", email: session.user.email || "", name: session.user.name || "" }
    : null;

  useEffect(() => {
    if (authChecked && !user) router.push("/login");
  }, [authChecked, user, router]);

  useEffect(() => {
    if (!user?.id) return;
    setSerialLoading(true);
    fetch("/api/serial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check", userId: user.id }),
    })
      .then((res) => res.json())
      .then((data) => setSerialStatus(data))
      .catch(() => setSerialStatus({ valid: false, reason: "시리얼 확인 중 오류 발생" }))
      .finally(() => setSerialLoading(false));
  }, [user?.id]);

  const handleActivateSerial = async () => {
    if (!serialInput.trim() || !user) return;
    setSerialError("");
    const res = await fetch("/api/serial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "activate", userId: user.id, serialKey: serialInput.trim() }),
    });
    const data = await res.json();
    if (data.error) { setSerialError(data.error); return; }
    setSerialStatus({ valid: true, daysLeft: data.durationDays });
    setSerialInput("");
  };

  const handleLogout = () => signOut({ callbackUrl: "/login" });

  // 탭 상태
  const [activeTab, setActiveTab] = useState<Tab>("schedules");
  const [logs, setLogs] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const stopRef = useRef(false);

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString("ko-KR", { hour12: false });
    setLogs((prev) => [...prev, `[${time}] ${msg}`]);
  }, []);

  // 발송 이력 저장 헬퍼
  const saveHistory = useCallback(async (record: {
    type: "immediate" | "scheduled";
    room: string;
    message: string;
    filePath?: string;
    result: "success" | "failure";
    error?: string;
  }) => {
    try {
      await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", ...record, timestamp: new Date().toISOString() }),
      });
    } catch { /* ignore */ }
  }, []);

  // 스케줄러 훅
  useScheduler({
    enabled: !!(serialStatus?.valid),
    onLog: addLog,
    onHistoryAdd: saveHistory,
  });

  // 공통 발송 로직
  const doSendRooms = useCallback(async (
    rooms: string[],
    message: string,
    filePath?: string,
    fileFirst?: boolean,
    type: "immediate" | "scheduled" = "immediate",
    delay = 2,
  ) => {
    const api = getElectronAPI();
    if (!api) {
      addLog("Electron 환경이 아닙니다. 데스크톱 앱에서 실행해주세요.");
      return;
    }

    const win = await api.kakao.findWindow();
    if (!win.found) {
      addLog("카카오톡이 실행되지 않았습니다. PC 카카오톡을 먼저 실행해주세요.");
      return;
    }

    addLog(`--- 발송 시작: ${rooms.length}개 대화방 ---`);
    setIsSending(true);
    stopRef.current = false;

    let success = 0, fail = 0;

    for (const room of rooms) {
      if (stopRef.current) { addLog("사용자가 중지를 요청했습니다."); break; }

      const result = await api.kakao.sendToRoom({
        roomName: room,
        message,
        imagePath: filePath || undefined,
        fileFirst: fileFirst || false,
      });

      await saveHistory({
        type,
        room,
        message,
        filePath,
        result: result.success ? "success" : "failure",
        error: result.error,
      });

      if (result.success) { success++; addLog(`[${room}] 발송 완료`); }
      else { fail++; addLog(`[${room}] 발송 실패: ${result.error || "알 수 없는 오류"}`); }

      if (!stopRef.current) await new Promise((r) => setTimeout(r, delay * 1000));
    }

    addLog(`--- 발송 완료: 성공 ${success}, 실패 ${fail} ---`);
    setIsSending(false);
  }, [addLog, saveHistory]);

  // 스케줄에서 "지금 발송" 클릭
  const handleSendScheduleNow = useCallback((schedule: Schedule) => {
    if (!isElectron()) { alert("데스크톱 앱에서만 발송할 수 있습니다."); return; }
    if (isSending) { alert("이미 발송 중입니다."); return; }
    doSendRooms(schedule.rooms, schedule.message, schedule.filePath, schedule.fileFirst, "scheduled");
  }, [doSendRooms, isSending]);

  // 프리셋에서 "발송" 클릭
  const handleSendPreset = useCallback((preset: QuickSendSet) => {
    if (!isElectron()) { alert("데스크톱 앱에서만 발송할 수 있습니다."); return; }
    if (isSending) { alert("이미 발송 중입니다."); return; }
    doSendRooms(preset.rooms, preset.message, preset.filePath, preset.fileFirst, "immediate");
  }, [doSendRooms, isSending]);

  // 중지
  const handleStop = useCallback(() => {
    stopRef.current = true;
    setIsSending(false);
    addLog("발송 중지됨");
  }, [addLog]);

  // ── 로딩/미인증 화면 ──
  if (!authChecked || !user || serialLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="text-gray-400">로딩 중...</span>
      </div>
    );
  }

  if (!serialStatus || !serialStatus.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-gray-900 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-center mb-2">시리얼 키 등록</h1>
          <p className="text-gray-400 text-center text-sm mb-6">
            {serialStatus?.reason || "프로그램을 사용하려면 시리얼 키를 등록해주세요"}
          </p>
          <p className="text-gray-500 text-xs text-center mb-4">{user?.name}님 ({user?.email})</p>
          <div className="space-y-4">
            <input
              type="text"
              value={serialInput}
              onChange={(e) => setSerialInput(e.target.value)}
              placeholder="KS-XXXXXXXX-XXXXXXXX"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-sm text-center tracking-wider focus:outline-none focus:border-blue-500"
            />
            {serialError && (
              <div className="text-red-400 text-sm bg-red-900/20 px-3 py-2 rounded-lg">{serialError}</div>
            )}
            <button
              onClick={handleActivateSerial}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-sm"
            >
              시리얼 키 등록
            </button>
            <button onClick={handleLogout} className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm">
              로그아웃
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 메인 대시보드 ──
  const tabs: { key: Tab; label: string }[] = [
    { key: "schedules", label: "발송 목록" },
    { key: "history", label: "발송 이력" },
    { key: "presets", label: "즉시 발송 세트" },
  ];

  return (
    <div className="flex flex-col h-screen p-4 gap-4 max-w-7xl mx-auto w-full">
      {/* 헤더 */}
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">카카오톡 자동 발송기</h1>
        <div className="flex items-center gap-3">
          {serialStatus?.valid && (
            <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-400 rounded">
              D-{serialStatus.daysLeft}
            </span>
          )}
          {isElectron() ? (
            <span className="text-xs px-2 py-1 bg-green-900/50 text-green-400 rounded">
              데스크톱 연결됨
            </span>
          ) : (
            <span className="text-xs px-2 py-1 bg-yellow-900/50 text-yellow-400 rounded">
              브라우저 모드
            </span>
          )}
          <span className="text-xs text-gray-500">{user?.name}</span>
          <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-gray-300">
            로그아웃
          </button>
        </div>
      </header>

      {/* 탭 네비게이션 */}
      <div className="flex items-center gap-1 border-b border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}

        {/* 발송 중 표시 + 중지 버튼 */}
        {isSending && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-yellow-400 animate-pulse">발송 중...</span>
            <button
              onClick={handleStop}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs font-medium"
            >
              중지
            </button>
          </div>
        )}
      </div>

      {/* 탭 컨텐츠 */}
      <div className="flex-1 bg-gray-900 rounded-xl p-4 min-h-0 overflow-y-auto">
        {activeTab === "schedules" && (
          <ScheduleList onSendNow={handleSendScheduleNow} />
        )}
        {activeTab === "history" && <SendHistory />}
        {activeTab === "presets" && (
          <QuickSendSets onSendPreset={handleSendPreset} />
        )}
      </div>

      {/* 로그 */}
      <div className="h-44 bg-gray-900 rounded-xl p-4 flex-shrink-0">
        <LogViewer logs={logs} onClear={() => setLogs([])} />
      </div>
    </div>
  );
}
