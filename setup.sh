#!/bin/sh
# 새 PC 최초 셋업 스크립트 - 한 번만 실행하면 됨
# 사용법: bash setup.sh
set -e

echo "프로젝트 셋업 시작..."

# 1. gitleaks 설치 (Windows: winget)
if ! command -v gitleaks >/dev/null 2>&1 && [ ! -x "/c/Users/$USER/AppData/Local/Microsoft/WinGet/Packages/Gitleaks.Gitleaks_Microsoft.Winget.Source_8wekyb3d8bbwe/gitleaks.exe" ]; then
  echo "gitleaks 설치 중..."
  if command -v winget >/dev/null 2>&1; then
    winget install -e --id Gitleaks.Gitleaks --accept-source-agreements --accept-package-agreements || echo "gitleaks 설치 실패 - 수동 설치 필요"
  else
    echo "winget 없음 - gitleaks 수동 설치 필요: https://github.com/gitleaks/gitleaks"
  fi
else
  echo "gitleaks 이미 설치됨"
fi

# 2. pre-commit hook 설치 (시크릿 차단)
echo "gitleaks pre-commit hook 설치 중..."
mkdir -p .git/hooks
cat > .git/hooks/pre-commit << 'HOOK_EOF'
#!/bin/sh
GITLEAKS=""
if command -v gitleaks >/dev/null 2>&1; then
  GITLEAKS=gitleaks
else
  for p in "/c/Users/$USER/AppData/Local/Microsoft/WinGet/Packages/Gitleaks.Gitleaks_Microsoft.Winget.Source_8wekyb3d8bbwe/gitleaks.exe" "/usr/local/bin/gitleaks" "/opt/homebrew/bin/gitleaks"; do
    [ -x "$p" ] && GITLEAKS="$p" && break
  done
fi
if [ -z "$GITLEAKS" ]; then
  echo "gitleaks 없음 - 시크릿 검사 스킵"
  exit 0
fi
"$GITLEAKS" git --pre-commit --staged --redact -v
if [ $? -ne 0 ]; then
  echo "커밋 차단됨: 시크릿이 감지되었습니다"
  exit 1
fi
exit 0
HOOK_EOF
chmod +x .git/hooks/pre-commit
echo "pre-commit hook 설치 완료"

# 3. Python 의존성 설치
if [ -f requirements.txt ]; then
  echo "pip install..."
  python -m pip install -r requirements.txt
fi

echo ""
echo "셋업 완료! 실행: python main.py"
