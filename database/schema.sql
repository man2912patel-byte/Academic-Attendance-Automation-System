-- ==============================================================================
-- DATABASE SCHEMA STRUCTURE (PostgreSQL & SQLite compatible)
-- ==============================================================================

-- 1. Table for faculty user accounts
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    username VARCHAR(80) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    security_question VARCHAR(255) NOT NULL,
    security_answer VARCHAR(255) NOT NULL,
    profile_photo TEXT,
    
    -- Local Excel data source settings
    student_excel_path VARCHAR(255),
    attendance_excel_path VARCHAR(255),
    
    -- General system settings
    theme VARCHAR(50) DEFAULT 'dark',
    dark_mode BOOLEAN DEFAULT TRUE,
    output_folder VARCHAR(255),
    backup_folder VARCHAR(255),
    export_format VARCHAR(50) DEFAULT 'excel',
    auto_backup BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table for attendance runs summary
CREATE TABLE IF NOT EXISTS attendance_runs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    sync_time TIMESTAMP NOT NULL,
    total_students INTEGER NOT NULL,
    present_count INTEGER NOT NULL,
    absent_count INTEGER NOT NULL,
    excel_file_path VARCHAR(255),
    UNIQUE(user_id, attendance_date)
);

-- 3. Table for detailed student attendance mapping
CREATE TABLE IF NOT EXISTS student_attendance (
    id SERIAL PRIMARY KEY,
    run_id INTEGER REFERENCES attendance_runs(id) ON DELETE CASCADE,
    roll_number VARCHAR(50) NOT NULL,
    enrollment_number VARCHAR(100),
    student_name VARCHAR(150),
    attendance VARCHAR(50) NOT NULL
);

-- Indexes for performance optimizing
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_runs_date ON attendance_runs(attendance_date);
CREATE INDEX IF NOT EXISTS idx_student_run ON student_attendance(run_id);
CREATE INDEX IF NOT EXISTS idx_student_roll ON student_attendance(roll_number);
