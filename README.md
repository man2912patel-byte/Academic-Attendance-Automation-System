# MFT Academic Attendance Automation System

A production-grade Python desktop application using **Tkinter** and **ttkbootstrap** that automates the mapping, matching, filtering, and reporting of academic attendance for college faculty members.

## Project Overview

College faculty members often manage specialized cohorts (like the **MFT Batch** of ~24 students) nested within a larger training program (like the **Marquee Training** of 300+ students). Daily manual searching and attendance logging can take up to 30 minutes and are prone to human errors.

This application connects directly to Google Sheets to:
1. Fetch the master Marquee Training Student list.
2. Fetch the MFT Student List.
3. Automatically match students across sheets (by Enrollment No, Roll No, or Email) and filter out non-MFT members.
4. Calculate present/absent counts for selected dates/sessions.
5. Export styled Excel sheets (`.xlsx`) and PDF reports (`.pdf`).
6. Maintain history in a local SQLite database for offline analysis.
7. Authenticate users via **Firebase Authentication & Google Sign-In** to isolate history, database logs, and settings per faculty member.

---

## Folder Structure

```
Attendance_Automation/
├── main.py                # Bootloader, splash screen, and exception handling
├── config.py              # Configuration manager (loads/saves config.json)
├── config.json            # Local configuration file (sheet IDs, directory paths, themes)
├── utils.py               # Shared utility functions (logging, internet checks, date parser)
├── google_sheet.py        # Connection manager for Google Sheets API & CSV fallbacks
├── attendance.py          # Core logic (matching, filtering, openpyxl styling)
├── history.py             # SQLite database driver (dynamically split into history_{uid}.db)
├── report.py              # Report generation engine (PDF generation using ReportLab)
├── gui.py                 # Core shell (sidebar, navigation manager, page router)
├── dashboard.py           # Dashboard subview (KPI metrics cards, sync log history)
├── settings.py            # Settings subview (API configuration, credentials selector, themes)
├── login.py               # Authentication portal GUI (Google sign-in and bypass)
├── firebase_auth.py       # REST Authentication client for Google OAuth / Firebase exchange
├── firestore.py           # REST Firestore client for cloud synchronization of settings/runs
├── session.py             # Persistent local JSON session storage manager
├── profile.py             # Account Details subview (avatar image, UID, email, logout)
├── requirements.txt       # Project python dependencies list
├── README.md              # Installation and deployment manual
├── backup/                # Local cache folder for offline access resilience (holds session.json)
├── history/               # Directory containing sqlite database files partitioned by UID
├── logs/                  # System log files
└── output/                # Target folder for generated Excel/PDF files
```

---

## Installation & Setup

### 1. Prerequisites
- **Python 3.8 to 3.11** must be installed.
- Ensure Pip is updated (`python -m pip install --upgrade pip`).

### 2. Local Installation
Clone or copy this folder to your machine, open your terminal/command prompt, and navigate to the directory:
```bash
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Windows (CMD):
.\venv\Scripts\activate.bat
# On macOS/Linux:
source venv/bin/activate

# Install required dependencies
pip install -r requirements.txt
```

---

## Multi-User Setup (Firebase & Google OAuth)

To configure the Firebase database and Google Auth system for isolating user data, follow these steps:

### 1. Configure Google Cloud Console OAuth 2.0 Credentials
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Navigate to **APIs & Services** -> **Credentials**.
4. Click **+ Create Credentials** -> **OAuth client ID**.
5. Set the **Application type** to **Desktop app**, name it `MFT Desktop App`, and click **Create**.
6. Copy the **Client ID** and **Client Secret** generated. You will save these inside the `config.json` file or via the app's Settings page.

### 2. Configure Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and follow the steps.
3. In the left panel, navigate to **Build** -> **Authentication** and click **Get Started**.
4. In the **Sign-in method** tab, click **Google**, enable it, select a support email, and click **Save**.
5. Under project settings (gear icon -> Project settings), copy the **Web API Key** (this is your `firebase_api_key`) and the **Project ID** (this is your `firebase_project_id`).

### 3. Setup Cloud Firestore Database
1. In the Firebase console under **Build**, click **Firestore Database** and then click **Create database**.
2. Select your location and start in **Test mode** or **Production mode**.
3. Under the **Rules** tab, apply the following security rules to prevent faculty data mixing:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
4. Click **Publish**.

### 4. Configure settings in Config File / Settings view
Add these keys to your `config.json` file or configure them via the **Settings Setup** tab inside the app:
```json
{
  "firebase_api_key": "YOUR_FIREBASE_API_KEY",
  "firebase_project_id": "YOUR_FIREBASE_PROJECT_ID",
  "google_client_id": "YOUR_GOOGLE_CLIENT_ID",
  "google_client_secret": "YOUR_GOOGLE_CLIENT_SECRET"
}
```
*Note: If no Firebase API keys are configured, the login screen will show a warning and allow you to bypass login to enter offline/admin mode and modify configuration settings.*

---

## How to Run

To run the application with the Tkinter desktop GUI:
```bash
python main.py
```

---

## Building a Standalone EXE (`MFT_Attendance_System.exe`)

You can package the application into a single executable file that can run on any Windows machine without needing Python installed.

1. Install PyInstaller in your virtual environment:
   ```bash
   pip install pyinstaller
   ```
2. Build the executable using the following optimized command:
   ```bash
   pyinstaller --noconsole --onefile --clean --name="MFT_Attendance_System" --add-data "config.json;." main.py
   ```
3. Once completed, you will find the standalone executable inside the `dist/` directory:
   `dist/MFT_Attendance_System.exe`
