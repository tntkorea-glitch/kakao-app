"""
발송 스케줄러 모듈
- 반복 발송 (N분 간격)
- 예약 발송 (특정 시간)
"""

import threading
from datetime import datetime, timedelta


class SendScheduler:
    """메시지 발송 스케줄링 관리"""

    def __init__(self, send_callback, log_callback=None):
        """
        send_callback: 실제 발송을 수행하는 함수 (인자 없음)
        log_callback: 로그 출력 함수
        """
        self.send_callback = send_callback
        self.log = log_callback or print
        self._timer = None
        self._running = False
        self._interval_minutes = 0

    @property
    def is_running(self):
        return self._running

    # ------------------------------------------------------------------
    # 즉시 1회 발송
    # ------------------------------------------------------------------
    def send_once(self):
        """즉시 1회 발송"""
        self.log("즉시 발송 시작...")
        try:
            self.send_callback()
        except StopIteration:
            self.log("발송이 중지되었습니다.")
        except Exception as e:
            self.log(f"발송 중 오류: {e}")

    # ------------------------------------------------------------------
    # 반복 발송 (N분 간격)
    # ------------------------------------------------------------------
    def start_interval(self, interval_minutes: int):
        """N분 간격 반복 발송 시작"""
        if self._running:
            self.log("이미 발송 중입니다.")
            return

        self._interval_minutes = interval_minutes
        self._running = True
        self.log(f"반복 발송 시작: {interval_minutes}분 간격")

        # 첫 발송은 즉시 실행
        self._run_interval()

    def _run_interval(self):
        """반복 발송 1회 실행 후 다음 타이머 설정"""
        if not self._running:
            return

        try:
            self.send_callback()
        except StopIteration:
            self.log("발송이 중지되었습니다.")
            self._running = False
            return
        except Exception as e:
            self.log(f"발송 중 오류: {e}")

        # 다음 발송 예약
        if self._running:
            next_time = datetime.now() + timedelta(minutes=self._interval_minutes)
            self.log(f"다음 발송 예정: {next_time.strftime('%H:%M:%S')}")
            self._timer = threading.Timer(
                self._interval_minutes * 60,
                self._run_interval
            )
            self._timer.daemon = True
            self._timer.start()

    # ------------------------------------------------------------------
    # 예약 발송 (특정 시간)
    # ------------------------------------------------------------------
    def schedule_at(self, hour: int, minute: int):
        """특정 시간에 1회 발송 예약"""
        now = datetime.now()
        target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)

        # 이미 지난 시간이면 다음 날로
        if target <= now:
            target += timedelta(days=1)

        delay = (target - now).total_seconds()
        self.log(f"예약 발송 설정: {target.strftime('%Y-%m-%d %H:%M')} ({int(delay // 60)}분 후)")

        self._running = True
        self._timer = threading.Timer(delay, self._run_scheduled)
        self._timer.daemon = True
        self._timer.start()

    def _run_scheduled(self):
        """예약 시간에 발송 실행"""
        if not self._running:
            return
        self.log(f"예약 발송 실행: {datetime.now().strftime('%H:%M:%S')}")
        try:
            self.send_callback()
        except StopIteration:
            self.log("발송이 중지되었습니다.")
        except Exception as e:
            self.log(f"발송 중 오류: {e}")
        finally:
            self._running = False

    # ------------------------------------------------------------------
    # 중지
    # ------------------------------------------------------------------
    def stop(self):
        """발송 중지"""
        self._running = False
        if self._timer:
            self._timer.cancel()
            self._timer = None
        self.log("발송이 중지되었습니다.")
