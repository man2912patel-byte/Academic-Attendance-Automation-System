# Academic Attendance Automation System (Full Stack)

A production-ready Full Stack web application designed for faculty attendance tracking and Google Sheets automation.

---

## 🛠️ Tech Stack

### Frontend
* **Core:** React 19, Vite
* **Routing & Requests:** React Router v7, Axios
* **Styling:** Tailwind CSS

### Backend
* **Core:** Flask, Flask REST API
* **Database Mapping:** SQLAlchemy ORM, Flask-SQLAlchemy
* **Authentication:** JWT (JSON Web Tokens) with `bcrypt` password hashing
* **CORS Middleware:** Flask-CORS

### Database
* **Development:** SQLite
* **Production:** PostgreSQL (Render) or SQLite (Persistent Disk)

---

## 📂 Project Architecture

```
Academic-Attendance-Automation-System/
├── backend/                  # Flask REST API Backend
│   ├── models/               # SQLAlchemy Database models (User, AttendanceRun, etc.)
│   ├── routes/               # API blueprints (auth, attendance, settings, dashboard)
│   ├── services/             # Business logic service layers
│   ├── utils/                # Token validation & ReportLab PDF generators
│   ├── config.py             # Config environments (SQLite/Postgres)
│   ├── app.py                # App initialization WSGI entry point
│   ├── render.yaml           # Render deployment blueprint spec
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React 19 + Vite + Tailwind Frontend
│   ├── src/                  # React components & UI views
│   │   ├── api/              # Axios instance & request endpoints
│   │   ├── components/       # Reusable layout components
│   │   ├── context/          # Auth Context states (login, register, token)
│   │   └── pages/            # View pages (Login, Dashboard, Generate, Settings)
│   ├── package.json          # Node dependencies
│   ├── vercel.json           # Vercel routing configuration
│   └── vite.config.js        # Vite config server definitions
├── database/                 # Migration files & schema seeds
├── docs/                     # Design patterns & API guides
└── .env.example              # Development/Production env variables template
```

---

## 🚀 Getting Started

### 1. Backend Installation (Flask)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
The Flask backend API launches on `http://localhost:5000`.

### 2. Frontend Installation (React)
```bash
cd frontend
npm install
npm run dev
```
The React frontend dev server launches on `http://localhost:5173`.

---

## ☁️ Production Deployment

### Frontend (Vercel)
* Deploy the `frontend/` directory on Vercel.
* Add Environment Variable:
  - `VITE_API_URL`: The deployed URL of your Flask backend on Render.

### Backend (Render)
* Deploy the `backend/` directory on Render (Web Service type).
* Add Environment Variables:
  - `FLASK_ENV`: `production`
  - `SECRET_KEY`: A secure random JWT signing key.
  - `DATABASE_URL`: Connection URL of your production database.
