"""
설정 관리 모듈
- 대화방 목록, 메시지 템플릿 등을 JSON으로 저장/로드
"""

import json
from pathlib import Path

CONFIG_DIR = Path(__file__).parent.parent / "data"
CONFIG_FILE = CONFIG_DIR / "config.json"

DEFAULT_CONFIG = {
    "chatrooms": [],
    "last_message": "",
    "last_image_path": "",
    "interval_minutes": 5,
    "schedule_hour": 9,
    "schedule_minute": 0,
    "delay_between_rooms": 2.0,
}


def load_config() -> dict:
    """설정 파일 로드"""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
            # 누락된 키는 기본값으로 채움
            for key, val in DEFAULT_CONFIG.items():
                if key not in saved:
                    saved[key] = val
            return saved
        except Exception:
            return dict(DEFAULT_CONFIG)
    return dict(DEFAULT_CONFIG)


def save_config(config: dict):
    """설정 파일 저장"""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
