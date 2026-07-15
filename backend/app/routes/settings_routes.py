import os
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from app.auth import token_required
from app.config import Config
from app.utils.db_helpers import get_db_connection

settings_bp = Blueprint('settings', __name__)

@settings_bp.route('', methods=['GET'])
@token_required
def get_settings(current_user):
    """Retrieves all general and sheet settings for the logged-in user."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(f"SELECT * FROM settings_{current_user.username} LIMIT 1")
        row = cursor.fetchone()
        conn.close()
        
        return jsonify({
            "student_excel_path": row["student_excel_path"] or "",
            "attendance_excel_path": row["attendance_excel_path"] or "",
            "theme": row["theme"] or "dark",
            "dark_mode": bool(row["dark_mode"]),
            "output_folder": row["output_folder"] or "",
            "backup_folder": row["backup_folder"] or "",
            "export_format": row["export_format"] or "excel",
            "auto_backup": bool(row["auto_backup"])
        }), 200
    except Exception as e:
        return jsonify({'message': f'Failed to retrieve settings: {str(e)}'}), 500


@settings_bp.route('', methods=['PUT'])
@token_required
def update_settings(current_user):
    """Updates general and sheet settings for the logged-in user."""
    data = request.get_json() or {}
    
    # 1. Local Excel paths
    student_excel_path = data.get('student_excel_path', '').strip()
    attendance_excel_path = data.get('attendance_excel_path', '').strip()
    
    # 2. General parameters
    theme = data.get('theme', 'dark').strip()
    dark_mode = int(bool(data.get('dark_mode', True)))
    output_folder = data.get('output_folder', '').strip()
    backup_folder = data.get('backup_folder', '').strip()
    export_format = data.get('export_format', 'excel').strip()
    auto_backup = int(bool(data.get('auto_backup', False)))
            
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(f"""
        UPDATE settings_{current_user.username}
        SET student_excel_path = ?,
            attendance_excel_path = ?,
            theme = ?,
            dark_mode = ?,
            output_folder = ?,
            backup_folder = ?,
            export_format = ?,
            auto_backup = ?
        """, (student_excel_path, attendance_excel_path, theme, dark_mode, output_folder, backup_folder, export_format, auto_backup))
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Settings saved successfully.'
        }), 200
    except Exception as e:
        return jsonify({'message': f'Failed to update settings: {str(e)}'}), 500


@settings_bp.route('/upload', methods=['POST'])
@token_required
def upload_file(current_user):
    """Uploads local Excel spreadsheets, saves them inside the user's upload workspace, and sets their path."""
    if 'file' not in request.files or 'type' not in request.form:
        return jsonify({'message': 'Missing file or upload type.'}), 400
        
    file = request.files['file']
    upload_type = request.form['type'] # 'student' or 'attendance'
    
    if file.filename == '':
        return jsonify({'message': 'No selected file.'}), 400
        
    if not file.filename.lower().endswith(('.xlsx', '.xls')):
        return jsonify({'message': 'Invalid file format. Please upload an Excel sheet.'}), 400
        
    # Ensure safe uploads directory structure: uploads/<username>/
    user_dir = os.path.join(str(Config.UPLOADS_DIR), secure_filename(current_user.username))
    os.makedirs(user_dir, exist_ok=True)
    
    filename = secure_filename(file.filename)
    dest_path = os.path.join(user_dir, filename)
    
    try:
        file.save(dest_path)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        if upload_type == 'student':
            cursor.execute(f"UPDATE settings_{current_user.username} SET student_excel_path = ?", (dest_path,))
        elif upload_type == 'attendance':
            cursor.execute(f"UPDATE settings_{current_user.username} SET attendance_excel_path = ?", (dest_path,))
        else:
            conn.close()
            return jsonify({'message': 'Invalid upload type.'}), 400
            
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'File uploaded and configuration updated successfully.',
            'path': dest_path
        }), 200
    except Exception as e:
        return jsonify({'message': f'Failed to save uploaded file: {str(e)}'}), 500


@settings_bp.route('/verify-files', methods=['POST'])
@token_required
def verify_local_files(current_user):
    """Verifies that the configured local Excel files exist and are readable."""
    student_path = current_user.student_excel_path
    attendance_path = current_user.attendance_excel_path
    
    if not student_path or not os.path.exists(student_path):
        return jsonify({
            'success': False, 
            'message': f'Student Roster Excel file does not exist at configured path: {student_path or "Not configured"}'
        }), 400
        
    if not attendance_path or not os.path.exists(attendance_path):
        return jsonify({
            'success': False, 
            'message': f'Attendance logs Excel file does not exist at configured path: {attendance_path or "Not configured"}'
        }), 400
        
    try:
        import openpyxl
        wb1 = openpyxl.load_workbook(student_path, read_only=True)
        wb2 = openpyxl.load_workbook(attendance_path, read_only=True)
        wb1.close()
        wb2.close()
        return jsonify({
            'success': True,
            'message': 'Both Excel files verified and parsed successfully. Connection status: Active.'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to parse Excel files: {str(e)}'
        }), 500


@settings_bp.route('', methods=['DELETE'])
@token_required
def delete_user_tables(current_user):
    """Deletes all SQLite tables associated with the user account."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(f"DROP TABLE IF EXISTS settings_{current_user.username}")
        cursor.execute(f"DROP TABLE IF EXISTS history_{current_user.username}")
        cursor.execute(f"DROP TABLE IF EXISTS attendance_{current_user.username}")
        conn.commit()
        conn.close()
        return jsonify({'message': 'All user data tables dropped successfully.'}), 200
    except Exception as e:
        return jsonify({'message': f'Failed to drop user tables: {str(e)}'}), 500
