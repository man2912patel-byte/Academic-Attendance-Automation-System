import os
import sys
import sqlite3
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from models import db
from routes import auth_bp, attendance_bp, dashboard_bp, settings_bp
from sqlalchemy import text


def check_and_update_schema(app):
    """Automatically alter SQLite tables to add missing columns without deleting existing data."""
    try:
        with app.app_context():
            engine = db.engine
            with engine.connect() as connection:
                raw_conn = connection.connection
                cursor = raw_conn.cursor()

                cursor.execute("PRAGMA table_info(attendance_runs);")
                columns = [col[1] for col in cursor.fetchall()]

                if not columns:
                    return

                modified = False

                if "session_name" not in columns:
                    cursor.execute(
                        "ALTER TABLE attendance_runs ADD COLUMN session_name VARCHAR(100);"
                    )
                    modified = True

                if "attendance_rate" not in columns:
                    cursor.execute(
                        "ALTER TABLE attendance_runs ADD COLUMN attendance_rate REAL;"
                    )
                    modified = True

                if "pdf_file_path" not in columns:
                    cursor.execute(
                        "ALTER TABLE attendance_runs ADD COLUMN pdf_file_path VARCHAR(255);"
                    )
                    modified = True

                if modified:
                    raw_conn.commit()

                cursor.execute("""
                    UPDATE attendance_runs
                    SET attendance_rate =
                        (CAST(present_count AS REAL) / total_students * 100)
                    WHERE attendance_rate IS NULL
                    AND total_students > 0;
                """)
                raw_conn.commit()

    except Exception as e:
        print(f"Database schema migration error: {str(e)}", file=sys.stderr)


def create_app():
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))

    app = Flask(__name__)
    app.config.from_object(Config)

    # ==========================
    # CORS CONFIGURATION
    # ==========================
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://academic-attendance-automation-syst.vercel.app",
    ]

    CORS(
        app,
        resources={r"/*": {"origins": allowed_origins}},
        supports_credentials=True,
    )

    # ==========================
    # DATABASE
    # ==========================
    db.init_app(app)

    if app.config["SQLALCHEMY_DATABASE_URI"].startswith("sqlite:///"):
        db_path = app.config["SQLALCHEMY_DATABASE_URI"].replace(
            "sqlite:///", ""
        )

        if ":" in db_path:
            db_dir = os.path.dirname(db_path)
        else:
            db_dir = os.path.dirname(
                os.path.join(app.root_path, db_path)
            )

        os.makedirs(db_dir, exist_ok=True)

    os.makedirs(app.config["UPLOADS_DIR"], exist_ok=True)
    os.makedirs(app.config["REPORTS_DIR"], exist_ok=True)
    os.makedirs(app.config["EXPORTS_DIR"], exist_ok=True)
    os.makedirs(app.config["BACKUP_DIR"], exist_ok=True)

    if os.environ.get("WERKZEUG_RUN_MAIN") == "true" or not app.debug:
        with app.app_context():
            if app.config["SQLALCHEMY_DATABASE_URI"].startswith("sqlite:///"):
                db.create_all()
                check_and_update_schema(app)

    app.register_blueprint(auth_bp, url_prefix="")
    app.register_blueprint(dashboard_bp, url_prefix="")
    app.register_blueprint(settings_bp, url_prefix="")
    app.register_blueprint(attendance_bp, url_prefix="")

    @app.route("/health")
    def health():
        return jsonify(
            {
                "status": "healthy",
                "service": "attendance-automation-api",
            }
        )

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)