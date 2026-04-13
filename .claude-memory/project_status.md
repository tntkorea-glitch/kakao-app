---
name: Project Status
description: kakao-app 현재 진행 상태 및 다음 작업
type: project
originSessionId: 9c8ba405-9c56-438c-b1f5-4ced38791002
---
## 현재 상태 (2026-04-14, 세션3)
- Electron + Next.js(B안) 구조 전환 완료
- 인증 플로우 완성: Google OAuth 로그인 → 시리얼 체크 → 대시보드
- Google OAuth 자격 증명 Vercel 환경변수 등록 완료
- Upstash Redis 연동 완료 (active-cow-87780.upstash.io)
- 로컬 .data/ 파일 → Redis 데이터 동기화 완료
- **탭 기반 UI 리팩토링 완료** (발송 목록 / 발송 이력 / 즉시 발송 세트)
- **예약 발송 스케줄러 구현** (요일+다중시간대, 30초 간격 자동 체크)
- **엑셀 일괄 등록** (xlsx 파싱 + 양식 다운로드)
- **발송 이력 관리** (기록 저장 + 엑셀 내보내기 + 선택 삭제)
- **즉시 발송 세트** (프리셋 저장 + 원클릭 발송)
- **파일먼저보내기 옵션** (텍스트/파일 전송 순서 선택)
- **폴더 전송 API** (Electron 폴더 선택 + 이미지 목록)
- Vercel 배포 완료: https://kakao-app.vercel.app

## Next up when resuming
1. **Electron에서 새 UI 통합 테스트** — 탭 전환, 스케줄 등록/삭제, 엑셀 임포트, 프리셋 발송 등 전체 기능 실물 테스트
2. **카카오톡 실제 발송 테스트** — 스케줄 자동 발송 + 즉시 발송 세트 → 카카오톡 실제 전송 확인
3. **폴더 전송 UI 구현** — 현재 API만 있고 UI 미구현. 폴더 선택 → 이미지 순차/랜덤 전송 UI 추가
4. **Electron 배포** — electron-forge make로 새 설치파일 빌드 + GitHub Releases 업로드
5. **공지사항/업데이트 타임라인** (낮은 우선순위) — Home 페이지에 버전 업데이트 내역 표시

## 이번 세션(세션3)에서 추가된 파일
- `src/lib/types.ts` — 공통 타입 (Schedule, SendRecord, QuickSendSet)
- `src/app/api/schedules/route.ts` — 스케줄 CRUD API
- `src/app/api/history/route.ts` — 발송 이력 API
- `src/app/api/presets/route.ts` — 즉시 발송 세트 API
- `src/components/ScheduleList.tsx` — 발송 목록 컴포넌트
- `src/components/ScheduleForm.tsx` — 스케줄 등록/수정 모달
- `src/components/ExcelImport.tsx` — 엑셀 일괄 등록 모달
- `src/components/SendHistory.tsx` — 발송 이력 컴포넌트
- `src/components/QuickSendSets.tsx` — 즉시 발송 세트 컴포넌트
- `src/hooks/useScheduler.ts` — 자동 스케줄러 훅

## 실행 방법
```bash
# 1. Next.js 서버 (포트 3200)
cd /d/dev/kakao-app && npm run dev

# 2. Electron 앱
cd /d/dev/kakao-app/electron && npm run dev
```

## 환경 메모
- dev 서버 포트: 3200 (3000은 다른 프로젝트가 점유)
- Google OAuth: tntkorea@tntkorea.co.kr 계정
- Google Client ID: 181317659276-pc33adgfahl0n3oagnu14bg1972fltug.apps.googleusercontent.com
- Upstash Redis: active-cow-87780.upstash.io
- 테스트 시리얼 키: KS-683ED801-3CA163CB (365일)
- Vercel 프로젝트: tntkorea-4169s-projects/kakao-app
- Vercel 환경변수: NEXTAUTH_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN (6개 모두 등록됨)
