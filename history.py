import sqlite3
import logging
import datetime
from pathlib import Path

logger = logging.getLogger("history")

class HistoryManager:
    def __init__(self, config):
        self.config = config
        self.reopen_database()

    def reopen_database(self):
        """Reopens the connection using the logged-in user's database path."""
        if self.config.current_user:
            self.db_path = Path(self.config.user_db_path)
        else:
            db_dir = Path(self.config.history_dir)
            if not db_dir.is_absolute():
                db_dir = self.config.PROJECT_ROOT / db_dir
            self.db_path = db_dir / "attendance_history.db"
        self._init_db()

    def _get_connection(self):
        """Returns a connection to the SQLite database."""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        return sqlite3.connect(str(self.db_path))

    def _init_db(self):
        """Initializes SQLite database and creates tables if they don't exist."""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # Table for generation runs
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS attendance_runs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        attendance_date TEXT NOT NULL,
                        sync_time TEXT NOT NULL,
                        total_students INTEGER NOT NULL,
                        present_count INTEGER NOT NULL,
                        absent_count INTEGER NOT NULL,
                        file_path TEXT NOT NULL,
                        UNIQUE(attendance_date) ON CONFLICT REPLACE
                    )
                """)
                
                # Table for student records
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS student_attendance (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        run_id INTEGER,
                        roll_number TEXT,
                        enrollment_number TEXT,
                        student_name TEXT,
                        attendance TEXT NOT NULL,
                        attendance_date TEXT NOT NULL,
                        FOREIGN KEY(run_id) REFERENCES attendance_runs(id) ON DELETE CASCADE
                    )
                """)
                
                # Indexes for faster searching
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_date ON student_attendance (attendance_date)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_roll ON student_attendance (roll_number)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_enroll ON student_attendance (enrollment_number)")
                
                conn.commit()
            logger.info("SQLite Database initialized successfully.")
        except Exception as e:
            logger.exception("Failed to initialize database.")

    def save_run(self, date_obj, records, file_path):
        """
        Saves a generation run and all its detailed student attendance rows to the database.
        Overwrites if a run for the same date already exists (to reflect manual updates).
        """
        try:
            date_str = date_obj.strftime("%Y-%m-%d")
            sync_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            total = len(records)
            present = sum(1 for r in records if r["attendance"] == "Present")
            absent = total - present
            
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 1. Check if run exists and delete associated details first (due to UNIQUE constraint REPLACE)
                cursor.execute("SELECT id FROM attendance_runs WHERE attendance_date = ?", (date_str,))
                existing_run = cursor.fetchone()
                if existing_run:
                    cursor.execute("DELETE FROM student_attendance WHERE run_id = ?", (existing_run[0],))
                
                # 2. Insert run summary
                cursor.execute("""
                    INSERT INTO attendance_runs (attendance_date, sync_time, total_students, present_count, absent_count, file_path)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (date_str, sync_time, total, present, absent, str(file_path)))
                
                run_id = cursor.lastrowid
                
                # 3. Insert detailed records
                details = []
                for rec in records:
                    details.append((
                        run_id,
                        rec["roll_number"],
                        rec["enrollment_number"],
                        rec["student_name"],
                        rec["attendance"],
                        date_str
                    ))
                
                cursor.executemany("""
                    INSERT INTO student_attendance (run_id, roll_number, enrollment_number, student_name, attendance, attendance_date)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, details)
                
                conn.commit()
                
            logger.info(f"Saved run locally for {date_str} (Total: {total}, Present: {present}, Absent: {absent})")
            return True
        except Exception as e:
            logger.exception(f"Failed to save run to history database: {e}")
            return False

    def get_all_runs(self):
        """Returns all generation runs sorted by date descending."""
        try:
            with self._get_connection() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM attendance_runs ORDER BY attendance_date DESC")
                return [dict(r) for r in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Failed to fetch runs: {e}")
            return []

    def get_run_by_date(self, date_str):
        """Returns a single run summary for a specific date (YYYY-MM-DD)."""
        try:
            with self._get_connection() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM attendance_runs WHERE attendance_date = ?", (date_str,))
                row = cursor.fetchone()
                return dict(row) if row else None
        except Exception as e:
            logger.error(f"Failed to fetch run by date {date_str}: {e}")
            return None

    def get_details_by_date(self, date_str):
        """Returns all student records for a specific date (YYYY-MM-DD)."""
        try:
            with self._get_connection() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT roll_number, enrollment_number, student_name, attendance, attendance_date 
                    FROM student_attendance 
                    WHERE attendance_date = ? 
                    ORDER BY roll_number
                """, (date_str,))
                return [dict(r) for r in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Failed to fetch student details for date {date_str}: {e}")
            return []

    def search_student_records(self, query):
        """
        Searches historical student records by Roll Number, Enrollment Number, or Student Name.
        """
        try:
            with self._get_connection() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                search_val = f"%{query}%"
                cursor.execute("""
                    SELECT roll_number, enrollment_number, student_name, attendance, attendance_date
                    FROM student_attendance
                    WHERE roll_number LIKE ? OR enrollment_number LIKE ? OR student_name LIKE ?
                    ORDER BY attendance_date DESC, roll_number ASC
                """, (search_val, search_val, search_val))
                return [dict(r) for r in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Failed to search student records for query '{query}': {e}")
            return []

    def get_student_list(self):
        """Returns unique student list based on historical data."""
        try:
            with self._get_connection() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT DISTINCT roll_number, enrollment_number, student_name
                    FROM student_attendance
                    ORDER BY roll_number
                """)
                return [dict(r) for r in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Failed to get student list: {e}")
            return []

    def delete_run(self, date_str):
        """Deletes a run and all associated details by date (YYYY-MM-DD)."""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM attendance_runs WHERE attendance_date = ?", (date_str,))
                run = cursor.fetchone()
                if run:
                    cursor.execute("DELETE FROM student_attendance WHERE run_id = ?", (run[0],))
                    cursor.execute("DELETE FROM attendance_runs WHERE id = ?", (run[0],))
                    conn.commit()
                    logger.info(f"Deleted run locally for {date_str}")
                    return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete run for date {date_str}: {e}")
            return False
