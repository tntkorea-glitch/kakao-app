---
name: Project Status
description: kakao-app 현재 진행 상태 및 다음 작업
type: project
originSessionId: c4fc722d-c1bb-4f4e-a8e0-66666985dc5e
---
## 현재 상태 (2026-04-13)
- Electron + Next.js(B안) 구조 전환 완료
- Google OAuth 로그인 연동 완료 (NextAuth.js)
- 이메일/비밀번호 로그인도 지원
- 시리얼 키 인증 시스템 구현 완료
- 카카오톡 자동 발송 IPC 브릿지 구현 완료

## Next up when resuming
1. **Google 로그인 후 대시보드 진입 테스트** — NextAuth 세션 기반으로 전환했으나 실제 테스트 필요
2. **시리얼 인증 플로우 테스트** — 로그인 → 시리얼 입력 → 대시보드 진입 확인
3. **카카오톡 실제 발송 테스트** — PC 카카오톡 실행 상태에서 대화방 추가 → 발송
4. **UI 개선** — 발송 모드 라벨이 안 보이는 문제, 섹션 제목 표시 문제
5. **Vercel 배포** — 프로덕션 URL 설정, Google OAuth redirect URI 추가
6. **Electron 빌드** — electron-forge make로 설치파일 생성

## 환경 메모
- dev 서버 포트: 3200 (3000은 다른 프로젝트 SiteShare가 점유)
- Google OAuth: tntkorea@tntkorea.co.kr 계정, redirect URI: http://localhost:3200/api/auth/callback/google
- 테스트 시리얼 키: KS-683ED801-3CA163CB (365일)
