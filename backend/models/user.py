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
            "theme": self.theme or 'light',
            "dark_mode": self.dark_mode if self.dark_mode is not None else False,
            "output_folder": self.output_folder or '',
            "backup_folder": self.backup_folder or '',
            "export_format": self.export_format or 'excel',
            "auto_backup": self.auto_backup if self.auto_backup is not None else False,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
