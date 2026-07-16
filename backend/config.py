import os
from pathlib import Path

class Config:
    PROJECT_ROOT = Path(__file__).parent.absolute()
    
    SECRET_KEY = os.getenv("SECRET_KEY", "fallback_default_secret_key_change_in_production")
    
    # DB Configuration: SQLite absolute path fallback or PostgreSQL url
    default_db_path = Path(PROJECT_ROOT.parent / "database" / "development.db").as_posix()
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", f"sqlite:///{default_db_path}")
    if SQLALCHEMY_DATABASE_URI.startswith("postgres://"):
        # Fix Render postgres connection strings compatibility with SQLAlchemy >= 1.4
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace("postgres://", "postgresql://", 1)
        
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Google Sheets workbook default CSV URLs
    DEFAULT_STUDENT_URL = os.getenv(
        "DEFAULT_STUDENT_URL", 
        "https://docs.google.com/spreadsheets/d/1kC28acUnDMLhoCqw48GY_8IcDo82p2L0hU2TSSf0lsI/export?format=csv"
    )
    DEFAULT_ATTENDANCE_URL = os.getenv(
        "DEFAULT_ATTENDANCE_URL", 
        "https://docs.google.com/spreadsheets/d/1ivOiTJy7utDXgZO4vGesfMCyQBc9nvA6/export?format=csv&gid=1806013456"
    )
    
    # File save directories
    UPLOADS_DIR = PROJECT_ROOT.parent / "uploads"
    REPORTS_DIR = PROJECT_ROOT.parent / "reports"
    EXPORTS_DIR = PROJECT_ROOT.parent / "exports"
    BACKUP_DIR = PROJECT_ROOT.parent / "backup"
