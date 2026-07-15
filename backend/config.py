import os
from pathlib import Path

class Config:
    PROJECT_ROOT = Path(__file__).parent.absolute()
    
    SECRET_KEY = os.getenv("SECRET_KEY", "fallback_default_secret_key_change_in_production")
    
    # DB Configuration: SQLite development fallback or PostgreSQL url
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///database/development.db")
    if SQLALCHEMY_DATABASE_URI.startswith("postgres://"):
        # Fix Render postgres connection strings compatibility with SQLAlchemy >= 1.4
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace("postgres://", "postgresql://", 1)
        
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # File save directories
    UPLOADS_DIR = PROJECT_ROOT.parent / "uploads"
    REPORTS_DIR = PROJECT_ROOT.parent / "reports"
    EXPORTS_DIR = PROJECT_ROOT.parent / "exports"
    BACKUP_DIR = PROJECT_ROOT.parent / "backup"
