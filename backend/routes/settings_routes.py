import urllib.request
import csv
from flask import Blueprint, request, jsonify
from utils.auth import token_required
from models import db, User
from utils.attendance_processor import parse_sheets_data

settings_bp = Blueprint('settings', __name__)

@settings_bp.route('/settings', methods=['GET'])
@token_required
def get_settings(current_user):
    """Retrieves settings preferences for the logged-in user."""
    try:
        return jsonify({
            "student_excel_path": current_user.student_excel_path or "",
            "attendance_excel_path": current_user.attendance_excel_path or "",
            "theme": current_user.theme or "light",
            "dark_mode": bool(current_user.dark_mode),
            "output_folder": current_user.output_folder or "",
            "backup_folder": current_user.backup_folder or "",
            "export_format": current_user.export_format or "excel",
            "auto_backup": bool(current_user.auto_backup)
        }), 200
    except Exception as e:
        return jsonify({'message': f'Failed to retrieve settings: {str(e)}'}), 500

@settings_bp.route('/settings', methods=['PUT'])
@token_required
def update_settings(current_user):
    """Updates settings preferences for the logged-in user."""
    data = request.get_json() or {}
    
    if 'student_excel_path' in data:
        current_user.student_excel_path = data['student_excel_path'].strip()
    if 'attendance_excel_path' in data:
        current_user.attendance_excel_path = data['attendance_excel_path'].strip()
    if 'theme' in data:
        current_user.theme = data['theme'].strip()
    if 'dark_mode' in data:
        current_user.dark_mode = bool(data['dark_mode'])
    if 'output_folder' in data:
        current_user.output_folder = data['output_folder'].strip()
    if 'backup_folder' in data:
        current_user.backup_folder = data['backup_folder'].strip()
    if 'export_format' in data:
        current_user.export_format = data['export_format'].strip()
    if 'auto_backup' in data:
        current_user.auto_backup = bool(data['auto_backup'])
    
    try:
        db.session.commit()
        return jsonify({'message': 'Settings saved successfully.'}), 200
    except Exception as e:
        return jsonify({'message': f'Failed to update settings: {str(e)}'}), 500

@settings_bp.route('/settings/verify-files', methods=['POST'])
@token_required
def verify_sources(current_user):
    """Verifies that the configured Google Sheets URLs exist, are reachable, and parse successfully."""
    student_url = current_user.student_excel_path
    attendance_url = current_user.attendance_excel_path
    
    if not student_url or not attendance_url:
        return jsonify({
            'success': False,
            'message': 'Google Sheets CSV export URLs are not configured in Settings.'
        }), 400
        
    try:
        student_req = urllib.request.Request(
            student_url, 
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        attendance_req = urllib.request.Request(
            attendance_url, 
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        
        with urllib.request.urlopen(student_req, timeout=10) as response:
            student_csv = response.read().decode('utf-8')
        with urllib.request.urlopen(attendance_req, timeout=10) as response:
            attendance_csv = response.read().decode('utf-8')
            
        mft_reader = csv.DictReader(student_csv.splitlines())
        mft_raw = [dict(row) for row in mft_reader]
        
        marquee_reader = csv.reader(attendance_csv.splitlines())
        marquee_raw = [row for row in marquee_reader]
        
        parse_sheets_data(mft_raw, marquee_raw)
        
        return jsonify({
            'success': True,
            'message': 'Both Google Sheets CSV export links verified and parsed successfully. Connection status: Active.'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to download or parse Google Sheet CSVs: {str(e)}'
        }), 500

@settings_bp.route('/settings', methods=['DELETE'])
@token_required
def delete_user_data(current_user):
    """Resets user data by deleting associated attendance runs."""
    try:
        from models import AttendanceRun
        AttendanceRun.query.filter_by(user_id=current_user.id).delete()
        db.session.commit()
        return jsonify({'message': 'All user data history deleted successfully.'}), 200
    except Exception as e:
        return jsonify({'message': f'Failed to reset user history: {str(e)}'}), 500
