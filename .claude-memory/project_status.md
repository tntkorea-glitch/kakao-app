---
name: Project Status
description: kakao-app 현재 진행 상태 및 다음 작업
type: project
originSessionId: 3c0c5cde-8426-4a2b-b824-1ed7fcce1abc
---
## 현재 상태 (2026-04-13, 세션2)
- Electron + Next.js(B안) 구조 전환 완료
- 인증 플로우 완성: 로그인 → 시리얼 체크(useEffect) → 대시보드
- 데이터 저장 하이브리드: 로컬=파일(.data/), Vercel=Upstash Redis (storage.ts)
- Vercel 배포 완료: https://kakao-app.vercel.app (GitHub 연동)
- Electron 설치파일 빌드 완료: KakaoSender-Setup-1.0.0.exe (109MB)
- UI 개선: SendControls 모드별 조건부 표시, 라벨 가시성 향상
- 카카오톡 발송 로직 안정화 (딜레이 보강, 검색창 초기화)

## Next up when resuming
1. **Google OAuth 자격 증명 등록** — Google Cloud Console에서 발급 후 Vercel 환경변수에 GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET 추가. 리디렉션 URI: `https://kakao-app.vercel.app/api/auth/callback/google`
2. **Upstash Redis 연동** — https://console.upstash.com/ 에서 DB 생성 → UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN을 Vercel에 등록
3. **카카오톡 실제 발송 테스트** — Electron 앱 + PC 카카오톡으로 실물 테스트
4. **Electron 배포** — GitHub Releases에 exe 업로드 또는 다운로드 페이지 구성

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
- 테스트 시리얼 키: KS-683ED801-3CA163CB (365일)
- Vercel 프로젝트: tntkorea-4169s-projects/kakao-app
