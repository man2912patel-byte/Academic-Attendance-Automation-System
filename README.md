# Academic Attendance Automation System (Full Stack)

A production-ready Full Stack web application designed to replace the Tkinter desktop client for faculty attendance tracking and Google Sheets automation.

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
* **Production:** PostgreSQL

### Deployment
* **Frontend:** Vercel (`frontend/vercel.json`)
* **Backend:** Render (`backend/gunicorn`)

---

## 📂 Project Architecture

```
Academic-Attendance-Automation-System/
├── backend/                  # Flask REST API Backend
│   ├── app/                  # Application package
│   │   ├── __init__.py       # App factory & route registering
│   │   ├── auth.py           # JWT generation & decorators
│   │   ├── config.py         # Config environments (SQLite/Postgres)
│   │   ├── models.py         # SQLAlchemy Database models (User, AttendanceRuns, etc)
│   │   ├── routes/           # API Endpoint controllers (sync, exports)
│   │   └── utils/            # Google Sheets API helper routines
│   ├── run.py                # WSGI entry point
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React 19 + Vite + Tailwind Frontend
│   ├── public/               # Public assets
│   ├── src/                  # React components & UI views
│   │   ├── api/              # Axios instance & request endpoints
│   │   ├── components/       # Reusable layout widgets
│   │   ├── context/          # Auth Context states (login, logout, token)
│   │   ├── hooks/            # Global custom hooks
│   │   ├── pages/            # View pages (Login, Dashboard, Generate, Settings)
│   │   ├── App.jsx           # App routes & structure
│   │   ├── main.jsx          # Entry point
│   │   └── index.css         # Styling system
│   ├── index.html            # HTML layout
│   ├── package.json          # Node dependencies
│   ├── tailwind.config.js    # Styling configurations
│   ├── postcss.config.js     # CSS compilation config
│   └── vite.config.js        # Vite config server definitions
├── database/                 # Migration files & schema seeds
└── docs/                     # Design patterns & API guides
```

---

## 🚀 Getting Started

### 1. Database Setup
SQLite is used for local development automatically. For production:
* Install PostgreSQL on your server or use a hosted solution (e.g. Neon, Supabase).
* Update `DATABASE_URL` in `.env`.

### 2. Backend Installation (Flask)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

### 3. Frontend Installation (React)
```bash
cd frontend
npm install
npm run dev
```
The React frontend dev server launches on `http://localhost:5173`.
