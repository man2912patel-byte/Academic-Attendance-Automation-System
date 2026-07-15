from models import db

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
