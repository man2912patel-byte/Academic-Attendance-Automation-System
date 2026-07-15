# REST API Endpoints Reference

All request and response payloads use `application/json` format unless specified otherwise. Private endpoints require authorization token headers:
`Authorization: Bearer <JWT_TOKEN>`

---

## 🔒 Authentication API

### 1. `POST /api/auth/register` (Public)
Registers a new faculty account.
* **Payload:**
  ```json
  {
    "full_name": "John Doe",
    "username": "johndoe",
    "password": "securepassword123"
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "message": "User registered successfully",
    "user": {
      "id": 1,
      "username": "johndoe",
      "full_name": "John Doe"
    }
  }
  ```

### 2. `POST /api/auth/login` (Public)
Authenticates a user and returns a token.
* **Payload:**
  ```json
  {
    "username": "johndoe",
    "password": "securepassword123"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "johndoe",
      "full_name": "John Doe",
      "role": "Faculty"
    }
  }
  ```

---

## 📅 Attendance Runs API (Private)

### 1. `GET /api/attendance/runs`
Fetches attendance runs history for the logged-in user.
* **Response (200 OK):**
  ```json
  [
    {
      "id": 4,
      "attendance_date": "2026-07-15",
      "sync_time": "2026-07-15 08:30:00",
      "total_students": 23,
      "present_count": 17,
      "absent_count": 6
    }
  ]
  ```

### 2. `POST /api/attendance/generate`
Compiles student attendance sheet match results from Google Sheets for the selected date.
* **Payload:**
  ```json
  {
    "date": "2026-07-15",
    "session_mode": "Combined (Any)"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "message": "Attendance run successfully compiled and saved.",
    "run": {
      "id": 4,
      "attendance_date": "2026-07-15",
      "present_count": 17,
      "absent_count": 6
    }
  }
  ```
