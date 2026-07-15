import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_migrate import Migrate
from app.config import Config
from app.models import db

migrate = Migrate()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Configure CORS
    allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}})
    
    # Initialize DB and Migrations
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Ensure database path directory exists for SQLite
    if app.config['SQLALCHEMY_DATABASE_URI'].startswith('sqlite:///'):
        db_path = app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')
        db_dir = os.path.dirname(os.path.join(app.root_path, '..', db_path))
        os.makedirs(db_dir, exist_ok=True)
        
    # Ensure system folders exist
    os.makedirs(app.config['UPLOADS_DIR'], exist_ok=True)
    os.makedirs(app.config['REPORTS_DIR'], exist_ok=True)
    os.makedirs(app.config['EXPORTS_DIR'], exist_ok=True)
    os.makedirs(app.config['BACKUP_DIR'], exist_ok=True)
        
    # Register blueprints
    from app.routes.attendance_routes import attendance_bp
    from app.routes.dashboard_routes import dashboard_bp
    from app.routes.settings_routes import settings_bp
    
    app.register_blueprint(attendance_bp, url_prefix='/api/attendance')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(settings_bp, url_prefix='/api/settings')
    
    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'healthy', 'service': 'attendance-automation-api'}), 200
        
    # Auto-create tables (Only for dev/SQLite, in prod migrations are preferred)
    with app.app_context():
        if app.config['SQLALCHEMY_DATABASE_URI'].startswith('sqlite:///'):
            db.create_app_context = True
            db.create_all()
            
    return app
