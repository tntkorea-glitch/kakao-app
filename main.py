"""
카카오톡 자동 발송기 - 메인 엔트리포인트
실행: python main.py
"""

from src.gui import KakaoSenderApp


def main():
    app = KakaoSenderApp()
    app.mainloop()


if __name__ == "__main__":
    main()
