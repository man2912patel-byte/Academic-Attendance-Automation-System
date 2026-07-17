from datetime import datetime
from models import db

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False) # Bcrypt hashed password
    security_question = db.Column(db.String(255), nullable=True)
    security_answer = db.Column(db.String(255), nullable=True) # Bcrypt hashed answer
    profile_photo = db.Column(db.Text, nullable=True)
    
    # Custom Google Sheets CSV URLs
    student_excel_path = db.Column(db.String(512), nullable=True)
    attendance_excel_path = db.Column(db.String(512), nullable=True)
    
    # Source type configurations (google_sheet, upload)
    student_source_type = db.Column(db.String(50), default='google_sheet', nullable=True)
    attendance_source_type = db.Column(db.String(50), default='google_sheet', nullable=True)
    
    # Uploaded file paths relative to backend uploads dir
    student_uploaded_file = db.Column(db.String(512), nullable=True)
    attendance_uploaded_file = db.Column(db.String(512), nullable=True)
    
    # Uploaded file detailed metadata
    student_file_size = db.Column(db.Integer, nullable=True)
    student_upload_time = db.Column(db.String(100), nullable=True)
    student_rows_detected = db.Column(db.Integer, nullable=True)
    student_columns_detected = db.Column(db.Integer, nullable=True)
    student_file_type = db.Column(db.String(50), nullable=True)
    
    attendance_file_size = db.Column(db.Integer, nullable=True)
    attendance_upload_time = db.Column(db.String(100), nullable=True)
    attendance_rows_detected = db.Column(db.Integer, nullable=True)
    attendance_columns_detected = db.Column(db.Integer, nullable=True)
    attendance_file_type = db.Column(db.String(50), nullable=True)
    
    # General preferences
    theme = db.Column(db.String(50), default='light', nullable=True)
    dark_mode = db.Column(db.Boolean, default=False, nullable=True)
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
            
            "student_source_type": self.student_source_type or "google_sheet",
            "attendance_source_type": self.attendance_source_type or "google_sheet",
            "student_uploaded_file": self.student_uploaded_file or "",
            "attendance_uploaded_file": self.attendance_uploaded_file or "",
            
            "student_file_size": self.student_file_size,
            "student_upload_time": self.student_upload_time or "",
            "student_rows_detected": self.student_rows_detected,
            "student_columns_detected": self.student_columns_detected,
            "student_file_type": self.student_file_type or "",
            
            "attendance_file_size": self.attendance_file_size,
            "attendance_upload_time": self.attendance_upload_time or "",
            "attendance_rows_detected": self.attendance_rows_detected,
            "attendance_columns_detected": self.attendance_columns_detected,
            "attendance_file_type": self.attendance_file_type or "",
            
            "theme": self.theme or 'light',
            "dark_mode": self.dark_mode if self.dark_mode is not None else False,
            "output_folder": self.output_folder or '',
            "backup_folder": self.backup_folder or '',
            "export_format": self.export_format or 'excel',
            "auto_backup": self.auto_backup if self.auto_backup is not None else False,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
