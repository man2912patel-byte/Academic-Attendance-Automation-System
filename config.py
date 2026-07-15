import os
import json
from pathlib import Path

class Config:
    PROJECT_ROOT = Path(__file__).parent.absolute()
    CONFIG_FILE = PROJECT_ROOT / "config.json"
    
    DEFAULT_CONFIG = {
        "mft_sheet_id": "1kC28acUnDMLhoCqw48GY_8IcDo82p2L0hU2TSSf0lsI",
        "marquee_sheet_id": "1ivOiTJy7utDXgZO4vGesfMCyQBc9nvA6",
        "credentials_path": "credentials.json",
        "theme": "flatly",
        "auto_backup": True,
        "backup_dir": "backup",
        "output_dir": "output",
        "history_dir": "history",
        "last_sync_time": "Never"
    }

    def __init__(self):
        self.data = self.DEFAULT_CONFIG.copy()
        self.current_user = None
        self.load()
        self.ensure_directories()

    def load(self):
        """Loads configuration from config.json. Creates it with defaults if missing."""
        if self.CONFIG_FILE.exists():
            try:
                with open(self.CONFIG_FILE, "r", encoding="utf-8") as f:
                    loaded_data = json.load(f)
                    for k, v in self.DEFAULT_CONFIG.items():
                        self.data[k] = loaded_data.get(k, v)
            except Exception as e:
                print(f"Error loading config, using defaults: {e}")
                self.data = self.DEFAULT_CONFIG.copy()
        else:
            self.save()

    def save(self):
        """Saves current configuration to config.json."""
        try:
            with open(self.CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(self.data, f, indent=4)
        except Exception as e:
            print(f"Error saving config: {e}")

    def ensure_directories(self):
        """Creates output, history, backup, and log directories if they don't exist."""
        for key in ["backup_dir", "output_dir", "history_dir"]:
            path = Path(self.data[key])
            if not path.is_absolute():
                path = self.PROJECT_ROOT / path
            path.mkdir(parents=True, exist_ok=True)
        (self.PROJECT_ROOT / "logs").mkdir(parents=True, exist_ok=True)

    def set_user_session(self, username):
        """Configures isolated workspace directories for the logged-in user."""
        self.current_user = username
        self.user_dir = self.PROJECT_ROOT / "data" / "users" / username
        self.user_dir.mkdir(parents=True, exist_ok=True)
        
        self.user_db_path = self.user_dir / "attendance.db"
        self.user_history_dir = self.user_dir / "history"
        self.user_output_dir = self.user_dir / "output"
        self.user_reports_dir = self.user_dir / "reports"
        self.user_settings_file = self.user_dir / "settings.json"
        
        # Ensure directories exist
        self.user_history_dir.mkdir(parents=True, exist_ok=True)
        self.user_output_dir.mkdir(parents=True, exist_ok=True)
        self.user_reports_dir.mkdir(parents=True, exist_ok=True)
        
        # Load or initialize user-specific settings.json
        self.user_settings = self.DEFAULT_CONFIG.copy()
        if self.user_settings_file.exists():
            try:
                with open(self.user_settings_file, "r", encoding="utf-8") as f:
                    loaded = json.load(f)
                    for k, v in self.DEFAULT_CONFIG.items():
                        self.user_settings[k] = loaded.get(k, v)
            except Exception as e:
                print(f"Error loading user settings for {username}: {e}")
        else:
            self.save_user_settings()

    def clear_user_session(self):
        """Clears current active user session and settings cache."""
        self.current_user = None

    def save_user_settings(self):
        """Saves user-specific settings to their personal settings.json."""
        if not self.current_user:
            return
        try:
            with open(self.user_settings_file, "w", encoding="utf-8") as f:
                json.dump(self.user_settings, f, indent=4)
        except Exception as e:
            print(f"Error saving user settings: {e}")

    # Properties redirecting configuration settings to active user settings
    @property
    def mft_sheet_id(self):
        if self.current_user:
            return self.user_settings.get("mft_sheet_id", "")
        return self.data.get("mft_sheet_id", "")

    @mft_sheet_id.setter
    def mft_sheet_id(self, val):
        if self.current_user:
            self.user_settings["mft_sheet_id"] = val
            self.save_user_settings()
        else:
            self.data["mft_sheet_id"] = val
            self.save()

    @property
    def marquee_sheet_id(self):
        if self.current_user:
            return self.user_settings.get("marquee_sheet_id", "")
        return self.data.get("marquee_sheet_id", "")

    @marquee_sheet_id.setter
    def marquee_sheet_id(self, val):
        if self.current_user:
            self.user_settings["marquee_sheet_id"] = val
            self.save_user_settings()
        else:
            self.data["marquee_sheet_id"] = val
            self.save()

    @property
    def credentials_path(self):
        if self.current_user:
            return self.user_settings.get("credentials_path", "credentials.json")
        return self.data.get("credentials_path", "credentials.json")

    @credentials_path.setter
    def credentials_path(self, val):
        if self.current_user:
            self.user_settings["credentials_path"] = val
            self.save_user_settings()
        else:
            self.data["credentials_path"] = val
            self.save()

    @property
    def theme(self):
        if self.current_user:
            return self.user_settings.get("theme", "flatly")
        return self.data.get("theme", "flatly")

    @theme.setter
    def theme(self, val):
        if self.current_user:
            self.user_settings["theme"] = val
            self.save_user_settings()
        else:
            self.data["theme"] = val
            self.save()

    @property
    def auto_backup(self):
        if self.current_user:
            return self.user_settings.get("auto_backup", True)
        return self.data.get("auto_backup", True)

    @auto_backup.setter
    def auto_backup(self, val):
        if self.current_user:
            self.user_settings["auto_backup"] = val
            self.save_user_settings()
        else:
            self.data["auto_backup"] = val
            self.save()

    @property
    def backup_dir(self):
        if self.current_user:
            return str(self.user_history_dir)
        path = Path(self.data.get("backup_dir", "backup"))
        if not path.is_absolute():
            return str(self.PROJECT_ROOT / path)
        return str(path)

    @property
    def output_dir(self):
        if self.current_user:
            return str(self.user_output_dir)
        path = Path(self.data.get("output_dir", "output"))
        if not path.is_absolute():
            return str(self.PROJECT_ROOT / path)
        return str(path)

    @property
    def reports_dir(self):
        if self.current_user:
            return str(self.user_reports_dir)
        return self.output_dir

    @property
    def history_dir(self):
        if self.current_user:
            return str(self.user_dir)
        path = Path(self.data.get("history_dir", "history"))
        if not path.is_absolute():
            return str(self.PROJECT_ROOT / path)
        return str(path)

    @property
    def last_sync_time(self):
        if self.current_user:
            return self.user_settings.get("last_sync_time", "Never")
        return self.data.get("last_sync_time", "Never")

    @last_sync_time.setter
    def last_sync_time(self, val):
        if self.current_user:
            self.user_settings["last_sync_time"] = val
            self.save_user_settings()
        else:
            self.data["last_sync_time"] = val
            self.save()
