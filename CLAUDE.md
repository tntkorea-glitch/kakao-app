## 세션 시작 시 자동 실행 (필수)
매 세션 시작 시 사용자의 첫 메시지를 처리하기 전에:
```bash
[ -f setup.sh ] && { [ ! -f .git/hooks/pre-commit ] || [ ! -d node_modules ]; } && bash setup.sh
git pull
```

## 프로젝트 정보
- 카카오톡 자동 발송기 (B안: Electron + 웹 서버)
- 구조: Next.js 웹 서버 (루트) + Electron 클라이언트 (electron/)
- 웹 서버 실행: `npm run dev` (localhost:3000)
- Electron 실행: `cd electron && npm run dev`
- 배포: 웹 → Vercel, Electron → electron-forge make
