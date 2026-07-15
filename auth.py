import sqlite3
import bcrypt
import logging
import datetime
from pathlib import Path

logger = logging.getLogger("auth")

class AuthManager:
    def __init__(self, config):
        self.config = config
        self.db_path = self.config.PROJECT_ROOT / "data" / "auth.db"
        self._init_db()

    def _get_connection(self):
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        return sqlite3.connect(str(self.db_path))

    def _init_db(self):
        """Creates the users table and default admin account if not exists."""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                # Check if table exists and drop if columns are outdated
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
                if cursor.fetchone():
                    cursor.execute("PRAGMA table_info(users)")
                    columns = [c[1] for c in cursor.fetchall()]
                    if "created_at" not in columns:
                        logger.info("Outdated users table detected. Re-creating schema...")
                        cursor.execute("DROP TABLE users")
                
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        full_name TEXT NOT NULL,
                        username TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        created_at TEXT NOT NULL
                    )
                """)
                conn.commit()
            logger.info("Auth SQLite database table 'users' initialized successfully.")
            self._ensure_default_admin()
        except Exception as e:
            logger.error(f"Failed to initialize users table: {e}")

    def _ensure_default_admin(self):
        """Creates the default admin/admin123 account if it doesn't exist."""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM users WHERE username = ?", ("admin",))
                row = cursor.fetchone()
                if not row:
                    pwd = "admin123"
                    pw_hash = bcrypt.hashpw(pwd.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    cursor.execute("""
                        INSERT INTO users (full_name, username, password_hash, created_at)
                        VALUES (?, ?, ?, ?)
                    """, ("System Administrator", "admin", pw_hash, now_str))
                    conn.commit()
                    logger.info("Default administrator account created successfully.")
                else:
                    logger.info("Default administrator account already exists.")
        except Exception as e:
            logger.error(f"Failed to verify/create default admin: {e}")

    def register_user(self, username, password, full_name):
        """Registers a new user inside SQLite."""
        if not username.strip():
            return False, "Username cannot be empty."
        if len(password) < 6:
            return False, "Password must be at least 6 characters."

        try:
            pw_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO users (full_name, username, password_hash, created_at)
                    VALUES (?, ?, ?, ?)
                """, (full_name, username, pw_hash, now_str))
                conn.commit()
            
            logger.info(f"User registered: {username}")
            return True, "Account created successfully."
        except sqlite3.IntegrityError:
            return False, "Username already exists."
        except Exception as e:
            logger.error(f"Registration error for user '{username}': {e}")
            return False, f"Database error: {e}"

    def authenticate(self, username, password):
        """Authenticates user against SQLite database. Returns user dict or None."""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT id, full_name, username, password_hash FROM users WHERE username = ?", (username,))
                row = cursor.fetchone()
                if row:
                    logger.info(f"User found: {username}")
                    user_id, full_name, db_user, db_hash = row
                    if bcrypt.checkpw(password.encode('utf-8'), db_hash.encode('utf-8')):
                        logger.info(f"Password matched: {username}")
                        logger.info(f"Login successful: {username}")
                        return {
                            "id": user_id,
                            "full_name": full_name,
                            "username": db_user,
                            "role": "Admin" if db_user == "admin" else "Faculty"
                        }
            return None
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return None
