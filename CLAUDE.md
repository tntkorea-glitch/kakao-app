## 세션 시작 시 자동 실행 (필수)
매 세션 시작 시 사용자의 첫 메시지를 처리하기 전에:
```bash
[ -f setup.sh ] && [ ! -f .git/hooks/pre-commit ] && bash setup.sh
git pull
```

## 프로젝트 정보
- Python 카카오톡 자동 발송기 (GUI 데스크톱 앱)
- 실행: `python main.py`
- 기술 스택: Python 3.12 + CustomTkinter + PyAutoGUI + pywinauto
