from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from models.user import User
from models.run import AttendanceRun
from models.attendance import StudentAttendance
