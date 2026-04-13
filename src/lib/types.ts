/** 공통 타입 정의 */

// 예약 발송 스케줄
export interface Schedule {
  id: string;
  days: string[];        // ['월','화','수','목','금']
  times: string[];       // ['09:00','12:00','18:00']
  rooms: string[];       // 채팅방 이름 배열
  message: string;
  filePath?: string;
  fileFirst: boolean;    // 파일 먼저 보내기
  repeat: boolean;       // 매주 반복
  enabled: boolean;
  createdAt: string;
}

// 발송 이력
export interface SendRecord {
  id: string;
  type: "immediate" | "scheduled";
  timestamp: string;
  room: string;
  message: string;
  filePath?: string;
  result: "success" | "failure";
  error?: string;
  scheduleName?: string;
}

// 즉시 발송 세트
export interface QuickSendSet {
  id: string;
  name: string;
  rooms: string[];
  message: string;
  filePath?: string;
  fileFirst: boolean;
  createdAt: string;
}

// 요일 상수
export const DAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;
export type DayOfWeek = (typeof DAYS)[number];

// 요일 → JS getDay 매핑 (일=0, 월=1, ...)
export const DAY_INDEX: Record<string, number> = {
  일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6,
};
