"""
카카오톡 PC 앱 제어 모듈
- pywinauto로 윈도우 핸들 제어
- pyperclip으로 한글 텍스트 입력
- 이미지 클립보드 전송
"""

import time
import subprocess
import pyautogui
import pyperclip
from pathlib import Path
from PIL import Image
import io
import ctypes
import ctypes.wintypes
import win32clipboard
import win32con

from pywinauto import Desktop

# 안전장치: pyautogui 실패 시 즉시 중단
pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.3


class KakaoController:
    """PC 카카오톡 앱을 제어하는 클래스"""

    KAKAO_EXE = r"C:\Program Files (x86)\Kakao\KakaoTalk\KakaoTalk.exe"
    WINDOW_TITLE = "카카오톡"

    def __init__(self, log_callback=None):
        self.log = log_callback or print
        self._stop_requested = False

    def request_stop(self):
        self._stop_requested = True

    def reset_stop(self):
        self._stop_requested = False

    def _check_stop(self):
        if self._stop_requested:
            raise StopIteration("사용자가 중지를 요청했습니다.")

    # ------------------------------------------------------------------
    # 카카오톡 윈도우 찾기 / 실행
    # ------------------------------------------------------------------
    def find_kakao_window(self):
        """카카오톡 메인 윈도우를 찾아 반환"""
        try:
            desktop = Desktop(backend="uia")
            windows = desktop.windows(title_re=".*카카오톡.*")
            for w in windows:
                if w.is_visible():
                    return w
        except Exception:
            pass
        return None

    def activate_kakao(self):
        """카카오톡 윈도우를 활성화(포커스)"""
        win = self.find_kakao_window()
        if win is None:
            self.log("카카오톡 창을 찾을 수 없습니다. 카카오톡을 실행해주세요.")
            return False
        try:
            win.set_focus()
            time.sleep(0.5)
            return True
        except Exception as e:
            self.log(f"카카오톡 활성화 실패: {e}")
            return False

    # ------------------------------------------------------------------
    # 채팅방 열기
    # ------------------------------------------------------------------
    def open_chatroom(self, room_name: str) -> bool:
        """
        채팅방 검색 후 진입
        1. Ctrl+F로 검색창 열기 (채팅 탭에서)
        2. 채팅방 이름 입력
        3. Enter로 진입
        """
        self._check_stop()

        if not self.activate_kakao():
            return False

        time.sleep(0.3)

        # 채팅 탭으로 이동 (Ctrl+1 = 친구, Ctrl+2 = 채팅, Ctrl+3 = ...)
        # 먼저 채팅 탭 활성화
        pyautogui.hotkey("ctrl", "1")  # 친구 탭
        time.sleep(0.2)
        pyautogui.hotkey("ctrl", "2")  # 채팅 탭
        time.sleep(0.3)

        # 검색 (Ctrl+F)
        pyautogui.hotkey("ctrl", "f")
        time.sleep(0.5)

        # 검색창 비우기
        pyautogui.hotkey("ctrl", "a")
        time.sleep(0.1)

        # 채팅방 이름 입력 (한글이므로 클립보드 사용)
        pyperclip.copy(room_name)
        pyautogui.hotkey("ctrl", "v")
        time.sleep(0.7)

        # Enter로 채팅방 진입
        pyautogui.press("enter")
        time.sleep(0.8)

        self.log(f"채팅방 열기: {room_name}")
        return True

    # ------------------------------------------------------------------
    # 메시지 전송
    # ------------------------------------------------------------------
    def send_text(self, message: str) -> bool:
        """현재 열린 채팅방에 텍스트 메시지 전송"""
        self._check_stop()
        try:
            # 한글 입력을 위해 클립보드 사용
            pyperclip.copy(message)
            time.sleep(0.1)
            pyautogui.hotkey("ctrl", "v")
            time.sleep(0.2)
            pyautogui.press("enter")
            time.sleep(0.3)
            return True
        except Exception as e:
            self.log(f"텍스트 전송 실패: {e}")
            return False

    def send_image(self, image_path: str) -> bool:
        """현재 열린 채팅방에 이미지 전송 (클립보드 복사 → Ctrl+V)"""
        self._check_stop()
        try:
            path = Path(image_path)
            if not path.exists():
                self.log(f"이미지 파일 없음: {image_path}")
                return False

            # 이미지를 클립보드에 복사
            image = Image.open(path)
            self._copy_image_to_clipboard(image)
            time.sleep(0.3)

            # 채팅창에 붙여넣기
            pyautogui.hotkey("ctrl", "v")
            time.sleep(1.0)

            # 전송 (Enter)
            pyautogui.press("enter")
            time.sleep(0.5)
            return True
        except Exception as e:
            self.log(f"이미지 전송 실패: {e}")
            return False

    def _copy_image_to_clipboard(self, image: Image.Image):
        """PIL Image를 윈도우 클립보드에 복사"""
        output = io.BytesIO()
        image.convert("RGB").save(output, "BMP")
        data = output.getvalue()[14:]  # BMP 헤더 제거
        output.close()

        win32clipboard.OpenClipboard()
        win32clipboard.EmptyClipboard()
        win32clipboard.SetClipboardData(win32con.CF_DIB, data)
        win32clipboard.CloseClipboard()

    # ------------------------------------------------------------------
    # 채팅방 닫기 (ESC)
    # ------------------------------------------------------------------
    def close_chatroom(self):
        """현재 열린 채팅방 닫기"""
        pyautogui.press("escape")
        time.sleep(0.3)

    # ------------------------------------------------------------------
    # 통합 발송
    # ------------------------------------------------------------------
    def send_to_room(self, room_name: str, message: str, image_path: str = None) -> bool:
        """
        특정 채팅방에 메시지(+이미지) 발송
        """
        self._check_stop()

        if not self.open_chatroom(room_name):
            return False

        success = True

        # 이미지가 있으면 먼저 전송
        if image_path:
            if not self.send_image(image_path):
                success = False

        # 텍스트 메시지 전송
        if message.strip():
            if not self.send_text(message):
                success = False

        # 채팅방 닫기
        self.close_chatroom()

        return success

    def send_to_rooms(self, room_names: list, message: str, image_path: str = None,
                      delay_between: float = 2.0) -> dict:
        """
        여러 채팅방에 순차 발송
        Returns: {room_name: True/False, ...}
        """
        results = {}
        for room in room_names:
            self._check_stop()
            ok = self.send_to_room(room, message, image_path)
            results[room] = ok
            if ok:
                self.log(f"✅ [{room}] 발송 완료")
            else:
                self.log(f"❌ [{room}] 발송 실패")
            time.sleep(delay_between)
        return results
