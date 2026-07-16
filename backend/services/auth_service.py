import bcrypt
from models import db, User
from utils.auth import generate_token

def register_user(name, email, username, password, security_question=None, security_answer=None):
    # Check duplicate
    if User.query.filter_by(username=username.lower().strip()).first():
        raise ValueError("Username already exists")
    if User.query.filter_by(email=email.lower().strip()).first():
        raise ValueError("Email already registered")
        
    hashed_pwd = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    hashed_sec_ans = None
    if security_answer:
        hashed_sec_ans = bcrypt.hashpw(security_answer.lower().strip().encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
    from flask import current_app
    student_url = current_app.config.get('DEFAULT_STUDENT_URL')
    attendance_url = current_app.config.get('DEFAULT_ATTENDANCE_URL')

    new_user = User(
        name=name.strip(),
        username=username.lower().strip(),
        email=email.lower().strip(),
        password=hashed_pwd,
        security_question=security_question,
        security_answer=hashed_sec_ans,
        theme="light",
        dark_mode=False,
        student_excel_path=student_url,
        attendance_excel_path=attendance_url
    )
    
    db.session.add(new_user)
    db.session.commit()
    return new_user

def authenticate_user(username, password):
    user = User.query.filter_by(username=username.lower().strip()).first()
    if not user:
        raise ValueError("Invalid Username or Password")
        
    if not bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8')):
        raise ValueError("Invalid Username or Password")
        
    token = generate_token(user.id, user.username)
    return user, token

def verify_and_reset_password(username, security_question, security_answer, new_password):
    user = User.query.filter_by(username=username.lower().strip()).first()
    if not user:
        raise ValueError("Username not found")
        
    if not user.security_question or not user.security_answer:
        raise ValueError("No security verification set for this user")
        
    if user.security_question != security_question:
        raise ValueError("Incorrect security credentials")
        
    if not bcrypt.checkpw(security_answer.lower().strip().encode('utf-8'), user.security_answer.encode('utf-8')):
        raise ValueError("Incorrect security credentials")
        
    hashed_pwd = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    user.password = hashed_pwd
    db.session.commit()
    return user
