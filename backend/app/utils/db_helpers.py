import sqlite3
from flask import current_app
from pathlib import Path

def get_db_connection():
    """Returns a row-factory connection to the SQLite database."""
    import os
    db_path = current_app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')
    db_abs_path = os.path.abspath(os.path.join(current_app.root_path, '..', db_path))
    
    # Ensure database folder exists
    os.makedirs(os.path.dirname(db_abs_path), exist_ok=True)
    
    conn = sqlite3.connect(db_abs_path)
    conn.row_factory = sqlite3.Row
    return conn
