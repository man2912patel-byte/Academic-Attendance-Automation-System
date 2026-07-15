import jwt
import datetime
from flask import request, jsonify, current_app
from functools import wraps
from models import db, User

def generate_token(user_id, username):
    payload = {
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7),
        'iat': datetime.datetime.utcnow(),
        'sub': user_id,
        'username': username
    }
    return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')

def decode_token(token):
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return 'Signature expired. Please log in again.'
    except jwt.InvalidTokenError:
        return 'Invalid token. Please log in again.'

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # 1. Check Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
        
        if token:
            payload = decode_token(token)
            if isinstance(payload, str):
                return jsonify({'message': payload}), 401
            
            user = User.query.get(payload['sub'])
            if not user:
                return jsonify({'message': 'User session not found.'}), 401
            
            return f(user, *args, **kwargs)
            
        # 2. Fallback to X-User-Username header (for backward compatibility)
        username = request.headers.get('X-User-Username')
        if username:
            user = User.query.filter_by(username=username.lower()).first()
            if not user:
                # Dynamically seed mock user to prevent breaking the flow during transitions
                user = User(
                    name=username.capitalize(),
                    username=username.lower(),
                    email=f"{username.lower()}@example.com",
                    password="mock_password_no_auth",
                    theme="light",
                    dark_mode=False
                )
                db.session.add(user)
                db.session.commit()
            return f(user, *args, **kwargs)
            
        return jsonify({'message': 'Authorization Bearer Token or X-User-Username header is missing.'}), 401
        
    return decorated
