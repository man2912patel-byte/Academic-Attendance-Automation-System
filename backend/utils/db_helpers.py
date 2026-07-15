import sqlite3
import os
from flask import current_app

def get_db_connection():
    # Resolves SQLite path relative to app context database configuration URI
    db_uri = current_app.config['SQLALCHEMY_DATABASE_URI']
    db_path = db_uri.replace('sqlite:///', '')
    # Resolve relative to PROJECT_ROOT
    abs_path = os.path.join(current_app.config['PROJECT_ROOT'], db_path)
    conn = sqlite3.connect(abs_path)
    conn.row_factory = sqlite3.Row
    return conn
