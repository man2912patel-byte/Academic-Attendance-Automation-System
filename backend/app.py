import os
import sys
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from models import db
from routes import auth_bp, attendance_bp, dashboard_bp, settings_bp

def create_app():
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Configure CORS
    allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
    CORS(app, resources={r"/*": {"origins": allowed_origins}})
    
    # Initialize DB
    db.init_app(app)
    
    # Ensure database path directory exists for SQLite
    if app.config['SQLALCHEMY_DATABASE_URI'].startswith('sqlite:///'):
        db_path = app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')
        db_dir = os.path.dirname(os.path.join(app.root_path, db_path))
        os.makedirs(db_dir, exist_ok=True)
        
    # Ensure system folders exist
    os.makedirs(app.config['UPLOADS_DIR'], exist_ok=True)
    os.makedirs(app.config['REPORTS_DIR'], exist_ok=True)
    os.makedirs(app.config['EXPORTS_DIR'], exist_ok=True)
    os.makedirs(app.config['BACKUP_DIR'], exist_ok=True)
    
    # Register blueprints at root to prevent duplicate registration naming conflicts
    app.register_blueprint(auth_bp, url_prefix='')
    app.register_blueprint(dashboard_bp, url_prefix='')
    app.register_blueprint(settings_bp, url_prefix='')
    app.register_blueprint(attendance_bp, url_prefix='')
    
    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'healthy', 'service': 'attendance-automation-api'}), 200
        
    # Auto-create tables (SQLite development mode)
    with app.app_context():
        if app.config['SQLALCHEMY_DATABASE_URI'].startswith('sqlite:///'):
            db.create_all()
            
    return app

app = create_app()

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
