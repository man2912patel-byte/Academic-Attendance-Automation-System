# Deployment Guide: Vercel & Render hosting

This document outlines instructions to configure and deploy the Full Stack application in production.

---

## 💻 Backend Deployment (Render)

Render hosts the Flask REST API backend alongside a managed PostgreSQL database.

### 1. Database Provisioning
* Go to [Render Dashboard](https://dashboard.render.com/) -> **New** -> **PostgreSQL**.
* Configure Name, Region, and instance plan.
* After creation, copy the **Internal Database URL** or **External Database URL**.

### 2. Web Service Setup
* Go to **New** -> **Web Service**.
* Connect your GitHub repository.
* Configure:
  - **Environment:** `Python`
  - **Build Command:** `pip install -r backend/requirements.txt`
  - **Start Command:** `gunicorn --chdir backend run:app`
* Under **Environment Variables**, add:
  - `FLASK_ENV` = `production`
  - `DATABASE_URL` = `<your-render-postgresql-url>`
  - `SECRET_KEY` = `<secure-jwt-signing-key>`
  - `ALLOWED_ORIGINS` = `https://your-vercel-frontend-domain.vercel.app`

---

## 🎨 Frontend Deployment (Vercel)

Vercel hosts the static React 19 single-page application.

### 1. Vercel Configuration File (`frontend/vercel.json`)
Allows React Router client-side routes to rewrite requests back to `index.html`.
Create a config file inside the `frontend/` directory (see [frontend/vercel.json](file:///c:/Users/Man/Desktop/Attendance%20sheet/frontend/vercel.json)).

### 2. Project Provisioning
* Go to [Vercel Dashboard](https://vercel.com/) -> **Add New Project**.
* Connect your repository.
* Configure:
  - **Root Directory:** `frontend`
  - **Framework Preset:** `Vite`
  - **Build Command:** `npm run build`
  - **Output Directory:** `dist`
* Under **Environment Variables**, add:
  - `VITE_API_BASE_URL` = `https://your-render-backend-url.onrender.com/api`
