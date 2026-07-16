from datetime import datetime
from models import db

class AttendanceRun(db.Model):
    __tablename__ = 'attendance_runs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    attendance_date = db.Column(db.Date, nullable=False)
    session_name = db.Column(db.String(100), nullable=True)
    sync_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    total_students = db.Column(db.Integer, nullable=False)
    present_count = db.Column(db.Integer, nullable=False)
    absent_count = db.Column(db.Integer, nullable=False)
    attendance_rate = db.Column(db.Float, nullable=True)
    excel_file_path = db.Column(db.String(255), nullable=True)
    pdf_file_path = db.Column(db.String(255), nullable=True)
    
    # Relationship
    records = db.relationship('StudentAttendance', backref='run', lazy=True, cascade="all, delete-orphan")
    
    # Unique constraint per user/date
    __table_args__ = (db.UniqueConstraint('user_id', 'attendance_date', name='_user_date_uc'),)

    def to_dict(self):
        rate = self.attendance_rate
        if rate is None and self.total_students > 0:
            rate = round((self.present_count / self.total_students * 100), 1)
        return {
            "id": self.id,
            "user_id": self.user_id,
            "attendance_date": self.attendance_date.strftime("%Y-%m-%d"),
            "session_name": self.session_name or "Combined (Any)",
            "sync_time": self.sync_time.strftime("%Y-%m-%d %H:%M:%S"),
            "total_students": self.total_students,
            "present_count": self.present_count,
            "absent_count": self.absent_count,
            "attendance_rate": round(rate, 1) if rate is not None else 0.0,
            "excel_file_path": self.excel_file_path,
            "pdf_file_path": self.pdf_file_path
        }
