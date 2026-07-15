from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False) # Bcrypt hashed password
    security_question = db.Column(db.String(255), nullable=False)
    security_answer = db.Column(db.String(255), nullable=False) # Bcrypt hashed answer
    profile_photo = db.Column(db.Text, nullable=True) # Profile photo URL or base64 encoded string
    
    # Local Excel settings
    student_excel_path = db.Column(db.String(255), nullable=True)
    attendance_excel_path = db.Column(db.String(255), nullable=True)
    
    # General settings
    theme = db.Column(db.String(50), default='dark', nullable=True)
    dark_mode = db.Column(db.Boolean, default=True, nullable=True)
    output_folder = db.Column(db.String(255), nullable=True)
    backup_folder = db.Column(db.String(255), nullable=True)
    export_format = db.Column(db.String(50), default='excel', nullable=True)
    auto_backup = db.Column(db.Boolean, default=False, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    runs = db.relationship('AttendanceRun', backref='owner', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "username": self.username,
            "profile_photo": self.profile_photo,
            "student_excel_path": self.student_excel_path or "",
            "attendance_excel_path": self.attendance_excel_path or "",
            "theme": self.theme or 'dark',
            "dark_mode": self.dark_mode if self.dark_mode is not None else True,
            "output_folder": self.output_folder or '',
            "backup_folder": self.backup_folder or '',
            "export_format": self.export_format or 'excel',
            "auto_backup": self.auto_backup if self.auto_backup is not None else False,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }


class AttendanceRun(db.Model):
    __tablename__ = 'attendance_runs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    attendance_date = db.Column(db.Date, nullable=False)
    sync_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    total_students = db.Column(db.Integer, nullable=False)
    present_count = db.Column(db.Integer, nullable=False)
    absent_count = db.Column(db.Integer, nullable=False)
    excel_file_path = db.Column(db.String(255), nullable=True)
    
    # Relationship
    records = db.relationship('StudentAttendance', backref='run', lazy=True, cascade="all, delete-orphan")
    
    # Unique constraint per user/date
    __table_args__ = (db.UniqueConstraint('user_id', 'attendance_date', name='_user_date_uc'),)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "attendance_date": self.attendance_date.strftime("%Y-%m-%d"),
            "sync_time": self.sync_time.strftime("%Y-%m-%d %H:%M:%S"),
            "total_students": self.total_students,
            "present_count": self.present_count,
            "absent_count": self.absent_count,
            "excel_file_path": self.excel_file_path
        }


class StudentAttendance(db.Model):
    __tablename__ = 'student_attendance'
    
    id = db.Column(db.Integer, primary_key=True)
    run_id = db.Column(db.Integer, db.ForeignKey('attendance_runs.id', ondelete='CASCADE'), nullable=False)
    roll_number = db.Column(db.String(50), nullable=False)
    enrollment_number = db.Column(db.String(100), nullable=True)
    student_name = db.Column(db.String(150), nullable=True)
    attendance = db.Column(db.String(50), nullable=False) # 'Present' or 'Absent'

    def to_dict(self):
        return {
            "id": self.id,
            "run_id": self.run_id,
            "roll_number": self.roll_number,
            "enrollment_number": self.enrollment_number,
            "student_name": self.student_name,
            "attendance": self.attendance
        }
