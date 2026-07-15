from flask import Blueprint, request, jsonify
from services.auth_service import register_user, authenticate_user, verify_and_reset_password
from utils.auth import token_required
from models import db, User
import bcrypt

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    name = data.get('name')
    email = data.get('email')
    username = data.get('username')
    password = data.get('password')
    security_question = data.get('securityQuestion') or data.get('security_question')
    security_answer = data.get('securityAnswer') or data.get('security_answer')
    
    if not name or not email or not username or not password:
        return jsonify({'message': 'Missing required registration parameters.'}), 400
        
    try:
        user = register_user(
            name=name,
            email=email,
            username=username,
            password=password,
            security_question=security_question,
            security_answer=security_answer
        )
        return jsonify({
            'message': 'Account created successfully.',
            'user': user.to_dict()
        }), 201
    except ValueError as e:
        return jsonify({'message': str(e)}), 400
    except Exception as e:
        return jsonify({'message': f'Registration failed: {str(e)}'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'message': 'Username and password are required.'}), 400
        
    try:
        user, token = authenticate_user(username, password)
        return jsonify({
            'message': 'Login successful.',
            'token': token,
            'user': user.to_dict()
        }), 200
    except ValueError as e:
        return jsonify({'message': str(e)}), 400
    except Exception as e:
        return jsonify({'message': f'Authentication failed: {str(e)}'}), 500

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json() or {}
    username = data.get('username')
    security_question = data.get('securityQuestion') or data.get('security_question')
    security_answer = data.get('securityAnswer') or data.get('security_answer')
    new_password = data.get('newPassword') or data.get('new_password')
    
    if not username or not security_question or not security_answer or not new_password:
        return jsonify({'message': 'All parameters are required for recovery.'}), 400
        
    try:
        user = verify_and_reset_password(
            username=username,
            security_question=security_question,
            security_answer=security_answer,
            new_password=new_password
        )
        return jsonify({
            'message': 'Password recovery successful.',
            'user': user.to_dict()
        }), 200
    except ValueError as e:
        return jsonify({'message': str(e)}), 400
    except Exception as e:
        return jsonify({'message': f'Recovery failed: {str(e)}'}), 500

@auth_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    data = request.get_json() or {}
    name = data.get('name')
    email = data.get('email')
    profile_photo = data.get('profile_photo')
    
    if not name or not email:
        return jsonify({'message': 'Name and Email are required fields.'}), 400
        
    try:
        current_user.name = name.strip()
        current_user.email = email.lower().strip()
        if profile_photo is not None:
            current_user.profile_photo = profile_photo.strip()
            
        db.session.commit()
        return jsonify({
            'message': 'Profile settings saved.',
            'user': current_user.to_dict()
        }), 200
    except Exception as e:
        return jsonify({'message': f'Failed to update profile: {str(e)}'}), 500

@auth_bp.route('/change-password', methods=['PUT'])
@token_required
def change_password(current_user):
    data = request.get_json() or {}
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not current_password or not new_password:
        return jsonify({'message': 'Current and new password fields are required.'}), 400
        
    try:
        if not bcrypt.checkpw(current_password.encode('utf-8'), current_user.password.encode('utf-8')):
            return jsonify({'message': 'Incorrect current password.'}), 400
            
        hashed_pwd = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        current_user.password = hashed_pwd
        db.session.commit()
        
        return jsonify({'message': 'Password updated successfully.'}), 200
    except Exception as e:
        return jsonify({'message': f'Failed to change password: {str(e)}'}), 500

@auth_bp.route('/account', methods=['DELETE'])
@token_required
def delete_account(current_user):
    try:
        db.session.delete(current_user)
        db.session.commit()
        return jsonify({'message': 'Account and database configurations deleted successfully.'}), 200
    except Exception as e:
        return jsonify({'message': f'Failed to delete user account: {str(e)}'}), 500
