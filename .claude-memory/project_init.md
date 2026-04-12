---
name: Project Init
description: kakao-app - Electron + Next.js 카카오톡 자동 발송기 (B안 구조)
type: project
originSessionId: c4fc722d-c1bb-4f4e-a8e0-66666985dc5e
---
kakao-app: 카카오톡 자동 발송기 (2026-04-12 시작)

**구조:** B안 - Electron 클라이언트 + Next.js 웹 서버 (윤자동 원클릭 방식)
- 웹 서버(루트): Next.js, UI/인증/API 담당, Vercel 배포 예정
- Electron(electron/): 서버 URL 로드 + preload.js로 네이티브 API 브릿지 + PowerShell로 카카오톡 제어
- 포트: dev 시 3100 사용 (3000은 다른 프로젝트와 충돌)

**Why:** 윤자동 1년 이용권 만료 대비 + 추후 다중 사용자 배포(회원가입/시리얼) 고려
**How to apply:** 웹 서버 수정 = 모든 사용자 즉시 반영. Electron은 네이티브 브릿지만 담당.
