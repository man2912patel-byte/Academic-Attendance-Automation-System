import os
import json
from pathlib import Path
import logging

logger = logging.getLogger("session")

class LocalSessionManager:
    def __init__(self, config):
        self.config = config
        self.session_file = Path(self.config.history_dir) / "session.json"
        self.username = None
        self.is_active = False
        self.load()

    def load(self):
        """Loads session info from session.json."""
        if self.session_file.exists():
            try:
                with open(self.session_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.username = data.get("username")
                    self.is_active = data.get("is_active", False)
            except Exception as e:
                logger.error(f"Failed to load session: {e}")
                self.clear()
        else:
            self.clear()

    def save(self, username):
        """Saves current login username to keep session active."""
        self.username = username
        self.is_active = True
        try:
            self.session_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.session_file, "w", encoding="utf-8") as f:
                json.dump({
                    "username": username,
                    "is_active": True
                }, f, indent=4)
        except Exception as e:
            logger.error(f"Failed to save session: {e}")

    def clear(self):
        """Wipes active session."""
        self.username = None
        self.is_active = False
        if self.session_file.exists():
            try:
                self.session_file.unlink()
            except Exception as e:
                logger.error(f"Failed to delete session file: {e}")
