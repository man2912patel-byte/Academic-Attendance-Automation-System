import os
from flask import request, jsonify, current_app
from functools import wraps
from app.utils.db_helpers import get_db_connection

class MockUser:
    def __init__(self, username):
        self.username = username
        self.id = username
        
        # Guarantee user tables exist
        self.ensure_user_tables()
        
        # Load user settings from settings_<username> table
        self.load_settings()

    def ensure_user_tables(self):
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. settings_<username>
        cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS settings_{self.username} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_excel_path TEXT,
            attendance_excel_path TEXT,
            theme TEXT DEFAULT 'dark',
            dark_mode INTEGER DEFAULT 1,
            output_folder TEXT,
            backup_folder TEXT,
            export_format TEXT DEFAULT 'excel',
            auto_backup INTEGER DEFAULT 0
        )
        """)
        
        # Ensure row exists
        cursor.execute(f"SELECT COUNT(*) FROM settings_{self.username}")
        if cursor.fetchone()[0] == 0:
            cursor.execute(f"""
            INSERT INTO settings_{self.username} 
            (student_excel_path, attendance_excel_path, theme, dark_mode, output_folder, backup_folder, export_format, auto_backup)
            VALUES ('', '', 'dark', 1, '', '', 'excel', 0)
            """)
            
        # 2. history_<username>
        cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS history_{self.username} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            attendance_date TEXT UNIQUE,
            sync_time TEXT,
            total_students INTEGER,
            present_count INTEGER,
            absent_count INTEGER,
            excel_file_path TEXT
        )
        """)
        
        # 3. attendance_<username>
        cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS attendance_{self.username} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id INTEGER,
            roll_number TEXT,
            enrollment_number TEXT,
            student_name TEXT,
            attendance TEXT
        )
        """)
        
        conn.commit()
        conn.close()

    def load_settings(self):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(f"SELECT * FROM settings_{self.username} LIMIT 1")
        row = cursor.fetchone()
        
        self.student_excel_path = row['student_excel_path'] or ""
        self.attendance_excel_path = row['attendance_excel_path'] or ""
        self.theme = row['theme'] or "dark"
        self.dark_mode = bool(row['dark_mode'])
        self.output_folder = row['output_folder'] or ""
        self.backup_folder = row['backup_folder'] or ""
        self.export_format = row['export_format'] or "excel"
        self.auto_backup = bool(row['auto_backup'])
        
        conn.close()

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "student_excel_path": self.student_excel_path,
            "attendance_excel_path": self.attendance_excel_path,
            "theme": self.theme,
            "dark_mode": self.dark_mode,
            "output_folder": self.output_folder,
            "backup_folder": self.backup_folder,
            "export_format": self.export_format,
            "auto_backup": self.auto_backup
        }

def token_required(f):
    """Decorator to inject mock user context based on X-User-Username header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        username = request.headers.get('X-User-Username')
        if not username:
            return jsonify({'message': 'X-User-Username header is missing. User is not authenticated.'}), 401
            
        try:
            current_user = MockUser(username)
        except Exception as e:
            return jsonify({'message': f'Failed to resolve user database tables: {str(e)}'}), 500
            
        return f(current_user, *args, **kwargs)

    return decorated
