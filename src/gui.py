"""
카카오톡 자동 발송기 GUI
CustomTkinter 기반 메인 윈도우
"""

import threading
from datetime import datetime
from tkinter import filedialog, messagebox
import customtkinter as ctk

from src.kakao import KakaoController
from src.scheduler import SendScheduler
from src.config import load_config, save_config


ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")


class KakaoSenderApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("카카오톡 자동 발송기")
        self.geometry("800x700")
        self.minsize(700, 600)

        # 상태
        self.config = load_config()
        self.image_path = self.config.get("last_image_path", "")
        self.kakao = KakaoController(log_callback=self._log)
        self.scheduler = SendScheduler(
            send_callback=self._do_send,
            log_callback=self._log
        )

        self._build_ui()
        self._load_saved_state()

        self.protocol("WM_DELETE_WINDOW", self._on_close)

    # ==================================================================
    # UI 구성
    # ==================================================================
    def _build_ui(self):
        # 상단 제목
        header = ctk.CTkLabel(
            self, text="카카오톡 자동 발송기",
            font=ctk.CTkFont(size=22, weight="bold")
        )
        header.pack(pady=(15, 5))

        # 메인 컨테이너 (좌: 대화방, 우: 메시지)
        main_frame = ctk.CTkFrame(self, fg_color="transparent")
        main_frame.pack(fill="both", expand=True, padx=15, pady=5)
        main_frame.columnconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=2)
        main_frame.rowconfigure(0, weight=1)

        self._build_chatroom_panel(main_frame)
        self._build_message_panel(main_frame)

        # 하단: 발송 설정 + 로그
        self._build_control_panel()
        self._build_log_panel()

    # ------------------------------------------------------------------
    # 좌측: 대화방 목록
    # ------------------------------------------------------------------
    def _build_chatroom_panel(self, parent):
        frame = ctk.CTkFrame(parent)
        frame.grid(row=0, column=0, sticky="nsew", padx=(0, 5))

        ctk.CTkLabel(
            frame, text="대화방 목록",
            font=ctk.CTkFont(size=14, weight="bold")
        ).pack(pady=(10, 5))

        # 입력 + 추가 버튼
        input_frame = ctk.CTkFrame(frame, fg_color="transparent")
        input_frame.pack(fill="x", padx=10)

        self.room_entry = ctk.CTkEntry(
            input_frame, placeholder_text="대화방 이름 입력..."
        )
        self.room_entry.pack(side="left", fill="x", expand=True, padx=(0, 5))
        self.room_entry.bind("<Return>", lambda e: self._add_room())

        ctk.CTkButton(
            input_frame, text="추가", width=60, command=self._add_room
        ).pack(side="right")

        # 대화방 리스트 (스크롤)
        self.room_listbox = ctk.CTkTextbox(frame, height=200, state="normal")
        self.room_listbox.pack(fill="both", expand=True, padx=10, pady=5)
        self.room_listbox.configure(state="disabled")

        # 버튼 행
        btn_frame = ctk.CTkFrame(frame, fg_color="transparent")
        btn_frame.pack(fill="x", padx=10, pady=(0, 10))

        ctk.CTkButton(
            btn_frame, text="선택 삭제", width=80,
            fg_color="#e74c3c", hover_color="#c0392b",
            command=self._delete_selected_room
        ).pack(side="left", padx=(0, 5))

        ctk.CTkButton(
            btn_frame, text="전체 삭제", width=80,
            fg_color="#e74c3c", hover_color="#c0392b",
            command=self._clear_rooms
        ).pack(side="left")

        # 대화방 수 표시
        self.room_count_label = ctk.CTkLabel(
            frame, text="총 0개 대화방",
            font=ctk.CTkFont(size=11)
        )
        self.room_count_label.pack(pady=(0, 5))

    # ------------------------------------------------------------------
    # 우측: 메시지 작성
    # ------------------------------------------------------------------
    def _build_message_panel(self, parent):
        frame = ctk.CTkFrame(parent)
        frame.grid(row=0, column=1, sticky="nsew", padx=(5, 0))

        ctk.CTkLabel(
            frame, text="발송 메시지",
            font=ctk.CTkFont(size=14, weight="bold")
        ).pack(pady=(10, 5))

        # 메시지 입력
        self.message_text = ctk.CTkTextbox(frame, height=180)
        self.message_text.pack(fill="both", expand=True, padx=10, pady=(0, 5))

        # 이미지 첨부
        img_frame = ctk.CTkFrame(frame, fg_color="transparent")
        img_frame.pack(fill="x", padx=10, pady=(0, 10))

        ctk.CTkButton(
            img_frame, text="이미지 첨부", width=100,
            command=self._select_image
        ).pack(side="left", padx=(0, 5))

        ctk.CTkButton(
            img_frame, text="이미지 제거", width=100,
            fg_color="#e74c3c", hover_color="#c0392b",
            command=self._remove_image
        ).pack(side="left", padx=(0, 5))

        self.image_label = ctk.CTkLabel(
            img_frame, text="첨부 이미지 없음",
            font=ctk.CTkFont(size=11), text_color="gray"
        )
        self.image_label.pack(side="left", padx=5)

    # ------------------------------------------------------------------
    # 발송 설정 패널
    # ------------------------------------------------------------------
    def _build_control_panel(self):
        frame = ctk.CTkFrame(self)
        frame.pack(fill="x", padx=15, pady=5)

        # 1행: 발송 모드 선택
        row1 = ctk.CTkFrame(frame, fg_color="transparent")
        row1.pack(fill="x", padx=10, pady=(10, 5))

        ctk.CTkLabel(row1, text="발송 모드:", font=ctk.CTkFont(weight="bold")).pack(side="left")

        self.mode_var = ctk.StringVar(value="once")
        ctk.CTkRadioButton(
            row1, text="즉시 1회", variable=self.mode_var, value="once"
        ).pack(side="left", padx=(10, 5))
        ctk.CTkRadioButton(
            row1, text="반복 발송", variable=self.mode_var, value="interval"
        ).pack(side="left", padx=5)
        ctk.CTkRadioButton(
            row1, text="예약 발송", variable=self.mode_var, value="schedule"
        ).pack(side="left", padx=5)

        # 2행: 반복 간격 / 예약 시간
        row2 = ctk.CTkFrame(frame, fg_color="transparent")
        row2.pack(fill="x", padx=10, pady=5)

        ctk.CTkLabel(row2, text="반복 간격:").pack(side="left")
        self.interval_entry = ctk.CTkEntry(row2, width=60, placeholder_text="5")
        self.interval_entry.pack(side="left", padx=(5, 0))
        ctk.CTkLabel(row2, text="분").pack(side="left", padx=(3, 15))

        ctk.CTkLabel(row2, text="예약 시간:").pack(side="left")
        self.hour_entry = ctk.CTkEntry(row2, width=45, placeholder_text="09")
        self.hour_entry.pack(side="left", padx=(5, 0))
        ctk.CTkLabel(row2, text=":").pack(side="left")
        self.minute_entry = ctk.CTkEntry(row2, width=45, placeholder_text="00")
        self.minute_entry.pack(side="left")

        ctk.CTkLabel(row2, text="발송 간 딜레이:").pack(side="left", padx=(15, 0))
        self.delay_entry = ctk.CTkEntry(row2, width=45, placeholder_text="2")
        self.delay_entry.pack(side="left", padx=(5, 0))
        ctk.CTkLabel(row2, text="초").pack(side="left", padx=(3, 0))

        # 3행: 시작 / 중지 버튼
        row3 = ctk.CTkFrame(frame, fg_color="transparent")
        row3.pack(fill="x", padx=10, pady=(5, 10))

        self.start_btn = ctk.CTkButton(
            row3, text="▶  발송 시작", width=160, height=40,
            font=ctk.CTkFont(size=14, weight="bold"),
            fg_color="#27ae60", hover_color="#219a52",
            command=self._start_send
        )
        self.start_btn.pack(side="left", padx=(0, 10))

        self.stop_btn = ctk.CTkButton(
            row3, text="■  중지", width=120, height=40,
            font=ctk.CTkFont(size=14, weight="bold"),
            fg_color="#e74c3c", hover_color="#c0392b",
            command=self._stop_send, state="disabled"
        )
        self.stop_btn.pack(side="left")

        # 상태 표시
        self.status_label = ctk.CTkLabel(
            row3, text="대기 중",
            font=ctk.CTkFont(size=12), text_color="#aaa"
        )
        self.status_label.pack(side="left", padx=15)

    # ------------------------------------------------------------------
    # 로그 패널
    # ------------------------------------------------------------------
    def _build_log_panel(self):
        frame = ctk.CTkFrame(self)
        frame.pack(fill="both", expand=False, padx=15, pady=(5, 15))

        header = ctk.CTkFrame(frame, fg_color="transparent")
        header.pack(fill="x", padx=10, pady=(5, 0))
        ctk.CTkLabel(
            header, text="발송 로그",
            font=ctk.CTkFont(size=13, weight="bold")
        ).pack(side="left")
        ctk.CTkButton(
            header, text="로그 지우기", width=80, height=25,
            font=ctk.CTkFont(size=11),
            command=self._clear_log
        ).pack(side="right")

        self.log_text = ctk.CTkTextbox(frame, height=120, state="disabled")
        self.log_text.pack(fill="both", expand=True, padx=10, pady=(5, 10))

    # ==================================================================
    # 대화방 관리
    # ==================================================================
    def _get_rooms(self) -> list:
        """현재 대화방 목록 반환"""
        return list(self.config.get("chatrooms", []))

    def _refresh_room_list(self):
        """대화방 리스트 UI 갱신"""
        rooms = self._get_rooms()
        self.room_listbox.configure(state="normal")
        self.room_listbox.delete("1.0", "end")
        for i, room in enumerate(rooms, 1):
            self.room_listbox.insert("end", f"{i}. {room}\n")
        self.room_listbox.configure(state="disabled")
        self.room_count_label.configure(text=f"총 {len(rooms)}개 대화방")

    def _add_room(self):
        name = self.room_entry.get().strip()
        if not name:
            return
        rooms = self._get_rooms()
        if name in rooms:
            self._log(f"이미 등록된 대화방: {name}")
            return
        rooms.append(name)
        self.config["chatrooms"] = rooms
        self.room_entry.delete(0, "end")
        self._refresh_room_list()
        self._save_state()
        self._log(f"대화방 추가: {name}")

    def _delete_selected_room(self):
        """마지막 대화방 삭제 (간단 구현)"""
        rooms = self._get_rooms()
        if not rooms:
            return
        removed = rooms.pop()
        self.config["chatrooms"] = rooms
        self._refresh_room_list()
        self._save_state()
        self._log(f"대화방 삭제: {removed}")

    def _clear_rooms(self):
        if messagebox.askyesno("확인", "모든 대화방을 삭제하시겠습니까?"):
            self.config["chatrooms"] = []
            self._refresh_room_list()
            self._save_state()
            self._log("모든 대화방 삭제됨")

    # ==================================================================
    # 이미지 관리
    # ==================================================================
    def _select_image(self):
        path = filedialog.askopenfilename(
            title="이미지 선택",
            filetypes=[
                ("이미지 파일", "*.png *.jpg *.jpeg *.gif *.bmp *.webp"),
                ("모든 파일", "*.*")
            ]
        )
        if path:
            self.image_path = path
            filename = path.split("/")[-1].split("\\")[-1]
            self.image_label.configure(text=filename, text_color="#3498db")
            self._log(f"이미지 첨부: {filename}")

    def _remove_image(self):
        self.image_path = ""
        self.image_label.configure(text="첨부 이미지 없음", text_color="gray")

    # ==================================================================
    # 발송 제어
    # ==================================================================
    def _start_send(self):
        rooms = self._get_rooms()
        if not rooms:
            messagebox.showwarning("경고", "대화방을 1개 이상 추가해주세요.")
            return

        message = self.message_text.get("1.0", "end").strip()
        if not message and not self.image_path:
            messagebox.showwarning("경고", "메시지 또는 이미지를 입력해주세요.")
            return

        mode = self.mode_var.get()

        # UI 상태 변경
        self.start_btn.configure(state="disabled")
        self.stop_btn.configure(state="normal")
        self.status_label.configure(text="발송 중...", text_color="#f39c12")

        self.kakao.reset_stop()
        self._save_state()

        if mode == "once":
            threading.Thread(target=self._send_once_thread, daemon=True).start()
        elif mode == "interval":
            try:
                interval = int(self.interval_entry.get() or "5")
            except ValueError:
                interval = 5
            self.scheduler.start_interval(interval)
        elif mode == "schedule":
            try:
                hour = int(self.hour_entry.get() or "9")
                minute = int(self.minute_entry.get() or "0")
            except ValueError:
                hour, minute = 9, 0
            self.scheduler.schedule_at(hour, minute)

    def _stop_send(self):
        self.kakao.request_stop()
        self.scheduler.stop()
        self.start_btn.configure(state="normal")
        self.stop_btn.configure(state="disabled")
        self.status_label.configure(text="대기 중", text_color="#aaa")

    def _send_once_thread(self):
        """1회 발송 (별도 스레드)"""
        try:
            self._do_send()
        except StopIteration:
            self._log("발송이 중지되었습니다.")
        except Exception as e:
            self._log(f"오류: {e}")
        finally:
            self.after(0, self._send_finished)

    def _do_send(self):
        """실제 발송 로직 (scheduler에서도 호출)"""
        rooms = self._get_rooms()
        message = self.message_text.get("1.0", "end").strip()
        image = self.image_path if self.image_path else None

        try:
            delay = float(self.delay_entry.get() or "2")
        except ValueError:
            delay = 2.0

        self._log(f"--- 발송 시작: {len(rooms)}개 대화방 ---")
        results = self.kakao.send_to_rooms(rooms, message, image, delay)

        success = sum(1 for v in results.values() if v)
        fail = len(results) - success
        self._log(f"--- 발송 완료: 성공 {success}, 실패 {fail} ---")

    def _send_finished(self):
        """발송 완료 후 UI 복원"""
        if not self.scheduler.is_running:
            self.start_btn.configure(state="normal")
            self.stop_btn.configure(state="disabled")
            self.status_label.configure(text="대기 중", text_color="#aaa")

    # ==================================================================
    # 로그
    # ==================================================================
    def _log(self, msg: str):
        """로그 메시지 추가 (스레드 안전)"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        line = f"[{timestamp}] {msg}\n"

        def _append():
            self.log_text.configure(state="normal")
            self.log_text.insert("end", line)
            self.log_text.see("end")
            self.log_text.configure(state="disabled")

        self.after(0, _append)

    def _clear_log(self):
        self.log_text.configure(state="normal")
        self.log_text.delete("1.0", "end")
        self.log_text.configure(state="disabled")

    # ==================================================================
    # 설정 저장/로드
    # ==================================================================
    def _save_state(self):
        self.config["last_message"] = self.message_text.get("1.0", "end").strip()
        self.config["last_image_path"] = self.image_path
        try:
            self.config["interval_minutes"] = int(self.interval_entry.get() or "5")
        except ValueError:
            pass
        try:
            self.config["schedule_hour"] = int(self.hour_entry.get() or "9")
            self.config["schedule_minute"] = int(self.minute_entry.get() or "0")
        except ValueError:
            pass
        try:
            self.config["delay_between_rooms"] = float(self.delay_entry.get() or "2")
        except ValueError:
            pass
        save_config(self.config)

    def _load_saved_state(self):
        """저장된 설정 복원"""
        # 대화방 목록
        self._refresh_room_list()

        # 메시지
        msg = self.config.get("last_message", "")
        if msg:
            self.message_text.insert("1.0", msg)

        # 이미지
        img = self.config.get("last_image_path", "")
        if img:
            self.image_path = img
            filename = img.split("/")[-1].split("\\")[-1]
            self.image_label.configure(text=filename, text_color="#3498db")

        # 반복 간격
        interval = self.config.get("interval_minutes", 5)
        self.interval_entry.insert(0, str(interval))

        # 예약 시간
        hour = self.config.get("schedule_hour", 9)
        minute = self.config.get("schedule_minute", 0)
        self.hour_entry.insert(0, str(hour).zfill(2))
        self.minute_entry.insert(0, str(minute).zfill(2))

        # 딜레이
        delay = self.config.get("delay_between_rooms", 2.0)
        self.delay_entry.insert(0, str(delay))

    def _on_close(self):
        """앱 종료 시 설정 저장"""
        self._save_state()
        self.scheduler.stop()
        self.destroy()
