import os
import datetime
import logging
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import ttkbootstrap as tb
from ttkbootstrap.constants import *
from tkcalendar import DateEntry

# Import other views and modules
from dashboard import DashboardView
from settings import SettingsView
from google_sheet import GoogleSheetClient
from attendance import AttendanceManager
from history import HistoryManager
from report import ReportGenerator
from utils import is_internet_connected, run_in_background, parse_date_string
from auth import AuthManager
from local_session import LocalSessionManager

logger = logging.getLogger("gui")

class MainGUI(tb.Window):
    def __init__(self, config):
        self.config = config
        
        # Initialize ttkbootstrap with theme
        super().__init__(
            title="MFT Academic Attendance Automation System",
            themename=self.config.theme,
            size=(1050, 680),
            resizable=(True, True)
        )
        
        self.auth_mgr = AuthManager(self.config)
        self.session_mgr = LocalSessionManager(self.config)
        self.current_user = None

        self.history_mgr = HistoryManager(self.config)
        self.attendance_mgr = AttendanceManager(self.config)
        self.report_gen = ReportGenerator(self.config, self.history_mgr)
        
        # Internal Cache of synced sheet data
        self.cached_mft_raw = None
        self.cached_marquee_raw = None
        self.cached_dates = {}
        self.cached_mft_students = []
        self.cached_marquee_students = []

        self._build_ui()
        
        # Hide main GUI initially until authentication is resolved
        self.withdraw()

    def _build_ui(self):
        # Master Layout: Sidebar + Content Frame
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=1)

        # ----------------- SIDEBAR -----------------
        sidebar = tb.Frame(self, bootstyle=DARK, width=200, padding=10)
        sidebar.grid(row=0, column=0, sticky="nsw")
        sidebar.grid_propagate(False)

        # User Info Profile Area
        self.user_info_frame = tb.Frame(sidebar, bootstyle=DARK)
        self.user_info_frame.pack(fill=X, pady=(10, 5))

        self.welcome_lbl = tb.Label(
            self.user_info_frame, 
            text="Welcome, Guest", 
            font=("Segoe UI", 10, "bold"), 
            bootstyle=INVERSE,
            anchor=W
        )
        self.welcome_lbl.pack(fill=X, padx=10, pady=(5, 2))

        self.role_lbl = tb.Label(
            self.user_info_frame, 
            text="Guest Account", 
            font=("Segoe UI", 8), 
            bootstyle=SECONDARY,
            anchor=W
        )
        self.role_lbl.pack(fill=X, padx=10, pady=(0, 10))

        # Title/Logo area
        brand_lbl = tb.Label(
            sidebar, 
            text="MFT System", 
            font=("Helvetica", 14, "bold"), 
            bootstyle=INVERSE
        )
        brand_lbl.pack(pady=(5, 10), anchor=W, padx=10)

        # Dynamic Navigation container
        self.nav_container = tb.Frame(sidebar, bootstyle=DARK)
        self.nav_container.pack(fill=BOTH, expand=True, pady=10)
        self.nav_buttons = {}

        # Theme Switcher in Sidebar
        theme_bar = tb.Frame(sidebar, bootstyle=DARK)
        theme_bar.pack(side=BOTTOM, fill=X, pady=10)

        theme_lbl = tb.Label(theme_bar, text="Dark Mode:", font=("Segoe UI", 9), bootstyle=INVERSE)
        theme_lbl.pack(side=LEFT, padx=10)

        self.dark_mode_var = tk.BooleanVar(value="dark" in self.config.theme)
        theme_switch = tb.Checkbutton(
            theme_bar, 
            variable=self.dark_mode_var,
            bootstyle="success-round-toggle",
            command=self._toggle_dark_mode
        )
        theme_switch.pack(side=RIGHT, padx=10)

        # Logout Button in Sidebar
        self.logout_btn = tb.Button(
            sidebar, 
            text="Logout Portal", 
            bootstyle="danger-link", 
            padding=(10, 8),
            command=self.logout
        )
        self.logout_btn.pack(side=BOTTOM, fill=X, pady=(0, 5))

        # ----------------- CONTENT CONTAINER -----------------
        self.content_frame = tb.Frame(self, padding=10)
        self.content_frame.grid(row=0, column=1, sticky="nsew")

        # ----------------- STATUS BAR -----------------
        self.status_frame = tb.Frame(self, bootstyle=SECONDARY, height=25, padding=(10, 2))
        self.status_frame.grid(row=1, column=0, columnspan=2, sticky="ew")

        self.status_lbl = tb.Label(self.status_frame, text="Ready", font=("Segoe UI", 9), bootstyle=INVERSE)
        self.status_lbl.pack(side=LEFT)

        self.progress_bar = tb.Progressbar(
            self.status_frame, 
            bootstyle=SUCCESS, 
            mode=INDETERMINATE, 
            length=120
        )

    def _populate_sidebar_navigation(self):
        """Redraws the sidebar links."""
        for child in self.nav_container.winfo_children():
            child.destroy()
        self.nav_buttons = {}

        nav_items = [
            ("Dashboard", "house"),
            ("Generate Attendance", "play"),
            ("History Logs", "clock"),
            ("Report Center", "file-text"),
        ]

        nav_items += [
            ("Settings Setup", "sliders"),
            ("Help Guide", "question-circle"),
            ("About App", "info-circle")
        ]

        for text, icon in nav_items:
            page_name = text.split(" ")[0] if " " in text else text
            if text == "History Logs": page_name = "History"
            if text == "Report Center": page_name = "Reports"
            if text == "Settings Setup": page_name = "Settings"
            if text == "Help Guide": page_name = "Help"
            if text == "About App": page_name = "About"
            
            btn = tb.Button(
                self.nav_container, 
                text=text, 
                bootstyle="light-link", 
                padding=(10, 8),
                command=lambda p=page_name: self.change_page(p)
            )
            btn.pack(fill=X, pady=2)
            self.nav_buttons[page_name] = btn

    def _update_sidebar_profile(self):
        """Updates user header values based on the authenticated session."""
        if not self.current_user:
            self.welcome_lbl.config(text="Welcome, Guest")
            self.role_lbl.config(text="Guest Account", bootstyle=SECONDARY)
            return

        name = self.current_user.get("full_name", "System Administrator")
        role = self.current_user.get("role", "Admin")

        disp_name = name if len(name) <= 16 else name[:13] + "..."
        self.welcome_lbl.config(text=f"Welcome, {disp_name}")
        self.role_lbl.config(
            text=f"{role} User", 
            bootstyle=INFO if role == "Admin" else SECONDARY
        )

    def _check_authentication(self):
        """Startup hook: checks persistent session or shows login portal."""
        logger.info("Executing Local Session check...")
        if self.session_mgr.is_active and self.session_mgr.username:
            username = self.session_mgr.username
            logger.info(f"Persistent session found for: {username}")
            try:
                with self.auth_mgr._get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT id, full_name, username FROM users WHERE username = ?", (username,))
                    row = cursor.fetchone()
                    if row:
                        user_id, full_name, db_user = row
                        user_dict = {
                            "id": user_id,
                            "full_name": full_name,
                            "username": db_user,
                            "role": "Admin" if db_user == "admin" else "Faculty"
                        }
                        self.initialize_user_session(user_dict)
                        return
            except Exception as e:
                logger.error(f"Failed to auto-login user: {e}")
        
        logger.info("No active local session. Showing login portal...")
        self._show_login_portal()

    def _show_login_portal(self):
        """Displays the Local Login Window."""
        from login import LoginWindow
        LoginWindow(
            self, 
            self.config, 
            self.auth_mgr,
            self.session_mgr,
            on_login_success=self.initialize_user_session
        )

    def initialize_user_session(self, user_dict):
        """Saves user session and draws the layout."""
        self.current_user = user_dict
        
        # Configure user session in config
        self.config.set_user_session(user_dict["username"])
        
        # Reopen SQLite database connection for the logged-in user
        self.history_mgr.reopen_database()
        
        # Apply theme immediately
        tb.Style().theme_use(self.config.theme)

        self._update_sidebar_profile()
        self._populate_sidebar_navigation()
        
        # Maximize Main Window (Full Screen)
        self.state('zoomed')
        self.deiconify() 
        self.change_page("Dashboard")

        # Async fetch sheets cache
        self.set_status("Loading student roster database...", loading=True)
        self._load_local_data()

    def logout(self):
        """Clears local tokens and returns back to the login portal."""
        if messagebox.askyesno("Confirm Logout", "Are you sure you want to log out?"):
            logger.info("Logging out user.")
            self.session_mgr.clear()
            self.config.clear_user_session()
            self.current_user = None
            
            # Clear caches in memory
            self.cached_mft_raw = None
            self.cached_marquee_raw = None
            self.cached_dates = {}
            self.cached_mft_students = []
            self.cached_marquee_students = []
            self.compiled_records = []
            self.compiled_date_obj = None
            
            # Reset history manager DB to fallback
            self.history_mgr.reopen_database()
            
            self.withdraw()
            self._show_login_portal()

    def set_status(self, text, loading=False):
        """Sets the text in the status bar and manages the spinner."""
        self.status_lbl.config(text=text)
        if loading:
            self.progress_bar.pack(side=RIGHT, padx=10)
            self.progress_bar.start()
        else:
            self.progress_bar.stop()
            self.progress_bar.pack_forget()
        self.update_idletasks()

    def change_page(self, page_name):
        """Swaps the content frame page view."""
        for name, btn in self.nav_buttons.items():
            if name == page_name:
                btn.config(bootstyle="primary")
            else:
                btn.config(bootstyle="light-link")

        for child in self.content_frame.winfo_children():
            child.pack_forget()
            child.destroy()

        if page_name == "Dashboard":
            view = DashboardView(
                self.content_frame, 
                self.config, 
                self.history_mgr, 
                self.set_status,
                nav_to_generate=lambda: self.change_page("Generate")
            )
            view.pack(fill=BOTH, expand=True)
            
        elif page_name == "Generate":
            self._render_generate_page()
            
        elif page_name == "History":
            self._render_history_page()
            
        elif page_name == "Reports":
            self._render_reports_page()
            
        elif page_name == "Settings":
            view = SettingsView(
                self.content_frame, 
                self.config, 
                self.set_status
            )
            view.pack(fill=BOTH, expand=True)
            
        elif page_name == "Help":
            self._render_help_page()
            
        elif page_name == "About":
            self._render_about_page()

    def _toggle_dark_mode(self):
        """Switches between default light and dark themes."""
        is_dark = self.dark_mode_var.get()
        new_theme = "darkly" if is_dark else "flatly"
        self.config.theme = new_theme
        tb.Style().theme_use(new_theme)
        self.set_status(f"Theme switched to {new_theme}.")

    def _load_local_data(self):
        """Asynchronously loads offline cached sheets to build date combos."""
        def load():
            gs_client = GoogleSheetClient(self.config)
            try:
                mft_raw = gs_client.fetch_mft_students()
                marquee_raw = gs_client.fetch_marquee_attendance()
                return mft_raw, marquee_raw
            except Exception as e:
                return e

        def load_done(result):
            self.set_status("Ready")
            if isinstance(result, Exception):
                logger.error(f"Failed to bootstrap cache data: {result}")
                return
            
            mft_raw, marquee_raw = result
            self.cached_mft_raw = mft_raw
            self.cached_marquee_raw = marquee_raw
            try:
                mft_students, marquee_students, date_map = self.attendance_mgr.parse_sheets_data(mft_raw, marquee_raw)
                self.cached_mft_students = mft_students
                self.cached_marquee_students = marquee_students
                self.cached_dates = date_map
            except Exception as e:
                logger.error(f"Error parsing bootstrapped sheets data: {e}")

        run_in_background(load, load_done, lambda err: self.set_status(f"Offline Mode. Ready."))

    def _load_cache_from_files(self):
        """Synchronously loads cached CSV files from disk to refresh cache without network calls."""
        mft_cache = Path(self.config.backup_dir) / "mft_student_cache.csv"
        marquee_cache = Path(self.config.backup_dir) / "marquee_attendance_cache.csv"
        
        if not mft_cache.exists() or not marquee_cache.exists():
            return False
            
        try:
            import csv
            with open(mft_cache, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                mft_raw = [dict(row) for row in reader]
                
            with open(marquee_cache, "r", encoding="utf-8") as f:
                reader = csv.reader(f)
                marquee_raw = list(reader)
                
            self.cached_mft_raw = mft_raw
            self.cached_marquee_raw = marquee_raw
            
            mft_students, marquee_students, date_map = self.attendance_mgr.parse_sheets_data(mft_raw, marquee_raw)
            self.cached_mft_students = mft_students
            self.cached_marquee_students = marquee_students
            self.cached_dates = date_map
            return True
        except Exception as e:
            logger.error(f"Failed to load cache from files: {e}")
            return False

    # ----------------- PAGE RENDERING METHODS -----------------

    def _render_generate_page(self):
        self._load_cache_from_files()

        frame = tb.Frame(self.content_frame, padding=10)
        frame.pack(fill=BOTH, expand=True)

        header_lbl = tb.Label(frame, text="Generate Academic Attendance", font=("Helvetica", 18, "bold"), bootstyle=PRIMARY)
        header_lbl.pack(anchor=W, pady=(0, 20))

        split_frame = tb.Frame(frame)
        split_frame.pack(fill=BOTH, expand=True)

        # Left Column - Selections
        left_panel = tb.Labelframe(split_frame, text="Parameters", padding=15, bootstyle=PRIMARY, width=280)
        left_panel.pack(side=LEFT, fill=BOTH, padx=(0, 10))

        # 1. Date Selector
        tb.Label(left_panel, text="Choose Class Date:", font=("Segoe UI", 10, "bold")).pack(anchor=W, pady=(5, 2))
        
        date_strs = []
        if self.cached_dates:
            date_strs = [d.strftime("%Y-%m-%d") for d in sorted(self.cached_dates.keys(), reverse=True)]
        
        self.date_combobox = tb.Combobox(left_panel, values=date_strs, state="readonly", bootstyle=PRIMARY)
        self.date_combobox.pack(fill=X, pady=(0, 15))
        if date_strs:
            self.date_combobox.set(date_strs[0])
            self.date_combobox.bind("<<ComboboxSelected>>", self._on_date_changed)

        # 2. Session Selector
        tb.Label(left_panel, text="Choose Class Session:", font=("Segoe UI", 10, "bold")).pack(anchor=W, pady=(5, 2))
        self.session_combobox = tb.Combobox(left_panel, values=["Combined (Any)", "Combined (All)"], state="readonly", bootstyle=PRIMARY)
        self.session_combobox.pack(fill=X, pady=(0, 20))
        self.session_combobox.set("Combined (Any)")

        self._on_date_changed(None)

        compile_btn = tb.Button(left_panel, text="Process Attendance Preview", bootstyle=PRIMARY, command=self._compile_attendance)
        compile_btn.pack(fill=X, pady=(5, 10))

        self.gen_stats_lbl = tb.Label(left_panel, text="SUMMARY STATISTICS\n-\n-\n-\n-", font=("Segoe UI", 9), justify=LEFT, bootstyle=SECONDARY)
        self.gen_stats_lbl.pack(fill=X, pady=(15, 0))

        # Right Column - Preview Treeview
        right_panel = tb.Labelframe(split_frame, text="Roster Attendance Preview", padding=15, bootstyle=PRIMARY)
        right_panel.pack(side=RIGHT, fill=BOTH, expand=True, padx=(10, 0))

        scroll_y = tb.Scrollbar(right_panel, orient=VERTICAL)
        scroll_y.pack(side=RIGHT, fill=Y)

        self.gen_tree = tb.Treeview(
            right_panel, 
            columns=("roll", "enroll", "name", "status"), 
            show="headings", 
            yscrollcommand=scroll_y.set,
            bootstyle=PRIMARY
        )
        self.gen_tree.pack(fill=BOTH, expand=True)
        scroll_y.config(command=self.gen_tree.yview)

        self.gen_tree.heading("roll", text="Roll No")
        self.gen_tree.heading("enroll", text="Enrollment No")
        self.gen_tree.heading("name", text="Student Name")
        self.gen_tree.heading("status", text="Status")

        self.gen_tree.column("roll", anchor=CENTER, width=80)
        self.gen_tree.column("enroll", anchor=CENTER, width=120)
        self.gen_tree.column("name", anchor=W, width=180)
        self.gen_tree.column("status", anchor=CENTER, width=80)

        # Style colors
        self.gen_tree.tag_configure("present", background="#E2F0D9", foreground="#385723")
        self.gen_tree.tag_configure("absent", background="#FCE4D6", foreground="#C00000")

        # Action Buttons Row
        actions_bar = tb.Frame(frame)
        actions_bar.pack(fill=X, side=BOTTOM, pady=(15, 0))

        self.save_excel_btn = tb.Button(actions_bar, text="Export Excel", bootstyle=SUCCESS, width=15, state=DISABLED, command=self._export_excel_current)
        self.save_excel_btn.pack(side=RIGHT, padx=(5, 0))

        self.save_pdf_btn = tb.Button(actions_bar, text="Export PDF", bootstyle=INFO, width=15, state=DISABLED, command=self._export_pdf_current)
        self.save_pdf_btn.pack(side=RIGHT, padx=(0, 5))

        # Set default selection values
        self.compiled_records = []
        self.compiled_date_obj = None

    def _on_date_changed(self, event):
        """Updates available sessions when the selected date changes."""
        selected_date_str = self.date_combobox.get()
        if not selected_date_str:
            return
            
        date_obj = datetime.datetime.strptime(selected_date_str, "%Y-%m-%d").date()
        sessions = ["Combined (Any)", "Combined (All)"]
        
        if date_obj in self.cached_dates:
            session_cols = self.cached_dates[date_obj]
            seen_sessions = set()
            for col_idx, sess_name in session_cols:
                if sess_name not in seen_sessions:
                    sessions.append(sess_name)
                    seen_sessions.add(sess_name)
                
        self.session_combobox.config(values=sessions)
        self.session_combobox.set("Combined (Any)")

    def _compile_attendance(self):
        """Calculates attendance preview based on selected parameters."""
        selected_date_str = self.date_combobox.get()
        session_mode = self.session_combobox.get()
        
        if not selected_date_str:
            messagebox.showerror("Error", "Please select a class date. Sync Google Sheets first if list is empty.")
            return

        date_obj = datetime.datetime.strptime(selected_date_str, "%Y-%m-%d").date()
        self.compiled_date_obj = date_obj

        if not self.cached_mft_students or not self.cached_marquee_students:
            messagebox.showerror("Error", "No student roster loaded. Please sync data first.")
            return

        # 1. Match
        matched, mismatched = self.attendance_mgr.match_students(self.cached_mft_students, self.cached_marquee_students)
        
        # 2. Get session columns
        session_cols = self.cached_dates.get(date_obj)
        
        # 3. Compute
        records = self.attendance_mgr.compute_attendance(
            matched, mismatched, date_obj, session_cols, self.cached_dates, session_mode
        )
        self.compiled_records = records

        # 4. Populate Treeview
        for item in self.gen_tree.get_children():
            self.gen_tree.delete(item)

        total = len(records)
        present = 0
        
        for r in sorted(records, key=lambda x: x["roll_number"]):
            status = r["attendance"]
            tag = "present" if status == "Present" else "absent"
            self.gen_tree.insert("", END, values=(
                r["roll_number"],
                r["enrollment_number"],
                r["student_name"],
                status
            ), tags=(tag,))
            
            if status == "Present":
                present += 1

        absent = total - present
        pct = (present / total * 100) if total > 0 else 0

        stats_text = (
            f"SUMMARY STATISTICS\n"
            f"Total Roster: {total}\n"
            f"Present: {present}\n"
            f"Absent: {absent}\n"
            f"Attendance Rate: {pct:.1f}%"
        )
        self.gen_stats_lbl.config(text=stats_text)
        
        self.save_excel_btn.config(state=NORMAL)
        self.save_pdf_btn.config(state=NORMAL)
        
        # Save compiled attendance to the user's history database immediately
        excel_name = Path(self.config.output_dir) / f"Academic_Attendance_{selected_date_str}.xlsx"
        saved = self.history_mgr.save_run(self.compiled_date_obj, self.compiled_records, str(excel_name))
        
        # 1. Debug logs for History saving
        history_records = self.history_mgr.get_all_runs()
        records_count = len(history_records)
        
        print("\n--- DEBUG HISTORY LOGGER ---")
        print(f"Current User: {self.current_user.get('username') if self.current_user else 'None'}")
        print(f"Database Path: {self.history_mgr.db_path.absolute()}")
        print(f"Attendance Saved: {'YES' if saved else 'NO'}")
        print(f"History Records Found: {records_count}")
        print("History Loaded Successfully\n")
        
        if records_count == 0:
            print("No records found in database.")
            print(f"Exact SQL Query Used: SELECT * FROM attendance_runs ORDER BY attendance_date DESC")
            print(f"Database Path Used: {self.history_mgr.db_path.absolute()}")
            
        # 2. Debug logs for Preview Table
        print("\n--- DEBUG PREVIEW LOGGER ---")
        print(f"Selected Date: {selected_date_str}")
        print(f"Google Sheet Loaded: {'YES' if self.cached_mft_students and self.cached_marquee_students else 'NO'}")
        print(f"Attendance Records Found: {total}")
        print(f"Students Loaded: {len(self.cached_mft_students)}")
        print(f"Preview Rows Inserted: {total}\n")
        
        if total == 0:
            print("Preview Table is empty.")
            reason = "No student records matched or compiled for the selected date."
            if not self.cached_mft_students:
                reason = "MFT student list is empty in cache. Please sync."
            elif not self.cached_marquee_students:
                reason = "Marquee attendance records are empty in cache. Please sync."
            print(f"Exact Reason: {reason}")
            
        self.set_status("Attendance compiled successfully.")

    def _export_excel_current(self):
        if not self.compiled_records or not self.compiled_date_obj:
            return
        try:
            filename = self.attendance_mgr.save_to_excel(self.compiled_records, self.compiled_date_obj)
            self.history_mgr.save_run(self.compiled_date_obj, self.compiled_records, filename)
            messagebox.showinfo("Export Successful", f"Excel report generated successfully!\n\nFile saved to:\n{filename}")
        except Exception as e:
            logger.exception("Excel export error")
            messagebox.showerror("Export Failed", f"Failed to export Excel spreadsheet:\n{e}")

    def _export_pdf_current(self):
        if not self.compiled_records or not self.compiled_date_obj:
            return
        try:
            date_str = self.compiled_date_obj.strftime("%Y-%m-%d")
            excel_name = Path(self.config.output_dir) / f"Academic_Attendance_{date_str}.xlsx"
            self.history_mgr.save_run(self.compiled_date_obj, self.compiled_records, excel_name)
            
            pdf_path = self.report_gen.generate_daily_pdf(date_str)
            messagebox.showinfo("Export Successful", f"PDF report generated successfully!\n\nFile saved to:\n{pdf_path}")
        except Exception as e:
            logger.exception("PDF export error")
            messagebox.showerror("Export Failed", f"Failed to export PDF document:\n{e}")

    def _render_history_page(self):
        frame = tb.Frame(self.content_frame, padding=10)
        frame.pack(fill=BOTH, expand=True)

        header_lbl = tb.Label(frame, text="Attendance History logs", font=("Helvetica", 18, "bold"), bootstyle=PRIMARY)
        header_lbl.pack(anchor=W, pady=(0, 20))

        # Search box panel
        search_bar = tb.Frame(frame)
        search_bar.pack(fill=X, pady=(0, 15))

        tb.Label(search_bar, text="Search Student:", font=("Segoe UI", 10, "bold")).pack(side=LEFT, padx=(0, 5))
        self.search_entry = tb.Entry(search_bar, width=25, bootstyle=PRIMARY)
        self.search_entry.pack(side=LEFT, padx=(0, 10))
        self.search_entry.bind("<Return>", lambda e: self._search_history())

        search_btn = tb.Button(search_bar, text="Search Logs", bootstyle=PRIMARY, command=self._search_history)
        search_btn.pack(side=LEFT, padx=(0, 5))

        clear_btn = tb.Button(search_bar, text="Reset View", bootstyle=SECONDARY, command=self._clear_search_history)
        clear_btn.pack(side=LEFT)

        split = tb.Frame(frame)
        split.pack(fill=BOTH, expand=True)

        # Left: Runs Treeview
        runs_panel = tb.Labelframe(split, text="Attendance Runs", padding=10, bootstyle=PRIMARY)
        runs_panel.pack(side=LEFT, fill=BOTH, expand=True, padx=(0, 5))

        scroll_runs_y = tb.Scrollbar(runs_panel, orient=VERTICAL)
        scroll_runs_y.pack(side=RIGHT, fill=Y)

        self.runs_tree = tb.Treeview(
            runs_panel, 
            columns=("date", "total", "pct"), 
            show="headings", 
            yscrollcommand=scroll_runs_y.set, 
            bootstyle=PRIMARY
        )
        self.runs_tree.pack(fill=BOTH, expand=True)
        scroll_runs_y.config(command=self.runs_tree.yview)

        self.runs_tree.heading("date", text="Date")
        self.runs_tree.heading("total", text="Total Students")
        self.runs_tree.heading("pct", text="Present Rate")

        self.runs_tree.column("date", anchor=CENTER, width=100)
        self.runs_tree.column("total", anchor=CENTER, width=90)
        self.runs_tree.column("pct", anchor=CENTER, width=90)
        
        self.runs_tree.bind("<<TreeviewSelect>>", self._on_run_selected)

        # Right: Details Treeview
        details_panel = tb.Labelframe(split, text="Detailed Run Records", padding=10, bootstyle=PRIMARY)
        details_panel.pack(side=RIGHT, fill=BOTH, expand=True, padx=(5, 0))

        scroll_det_y = tb.Scrollbar(details_panel, orient=VERTICAL)
        scroll_det_y.pack(side=RIGHT, fill=Y)

        self.det_tree = tb.Treeview(
            details_panel, 
            columns=("roll", "name", "status"), 
            show="headings", 
            yscrollcommand=scroll_det_y.set, 
            bootstyle=PRIMARY
        )
        self.det_tree.pack(fill=BOTH, expand=True)
        scroll_det_y.config(command=self.det_tree.yview)

        self.det_tree.heading("roll", text="Roll No")
        self.det_tree.heading("name", text="Student Name")
        self.det_tree.heading("status", text="Status")

        self.det_tree.column("roll", anchor=CENTER, width=100)
        self.det_tree.column("name", anchor=W, width=180)
        self.det_tree.column("status", anchor=CENTER, width=80)

        self.det_tree.tag_configure("present", background="#E2F0D9", foreground="#385723")
        self.det_tree.tag_configure("absent", background="#FCE4D6", foreground="#C00000")

        self._refresh_history_runs()

    def _refresh_history_runs(self):
        for item in self.runs_tree.get_children():
            self.runs_tree.delete(item)

        runs = self.history_mgr.get_all_runs()
        records_count = len(runs)
        
        print("\n--- DEBUG HISTORY LOGGER ---")
        print(f"Current User: {self.current_user.get('username') if self.current_user else 'None'}")
        print(f"Database Path: {self.history_mgr.db_path.absolute()}")
        print(f"Attendance Saved: YES")
        print(f"History Records Found: {records_count}")
        print("History Loaded Successfully\n")
        
        if records_count == 0:
            print("No records found in database.")
            print(f"Exact SQL Query Used: SELECT * FROM attendance_runs ORDER BY attendance_date DESC")
            print(f"Database Path Used: {self.history_mgr.db_path.absolute()}")

        for run in runs:
            pct = (run["present_count"] / run["total_students"] * 100) if run["total_students"] > 0 else 0
            self.runs_tree.insert("", END, values=(
                run["attendance_date"],
                run["total_students"],
                f"{pct:.1f}%"
            ))

    def _on_run_selected(self, event):
        selected = self.runs_tree.selection()
        if not selected:
            return
            
        values = self.runs_tree.item(selected[0], "values")
        date_str = values[0]
        
        for item in self.det_tree.get_children():
            self.det_tree.delete(item)

        details = self.history_mgr.get_details_by_date(date_str)
        for d in details:
            status = d["attendance"]
            tag = "present" if status == "Present" else "absent"
            self.det_tree.insert("", END, values=(
                d["roll_number"],
                d["student_name"],
                status
            ), tags=(tag,))

    def _search_history(self):
        query = self.search_entry.get().strip()
        if not query:
            return
            
        for item in self.det_tree.get_children():
            self.det_tree.delete(item)
            
        results = self.history_mgr.search_student_records(query)
        if not results:
            messagebox.showinfo("No Results", f"No records matching '{query}' found.")
            return

        for r in results:
            status = r["attendance"]
            tag = "present" if status == "Present" else "absent"
            self.det_tree.insert("", END, values=(
                f"{r['attendance_date']} ({r['roll_number']})",
                r["student_name"],
                status
            ), tags=(tag,))

    def _clear_search_history(self):
        self.search_entry.delete(0, END)
        self._refresh_history_runs()
        for item in self.det_tree.get_children():
            self.det_tree.delete(item)

    def _render_reports_page(self):
        frame = tb.Frame(self.content_frame, padding=10)
        frame.pack(fill=BOTH, expand=True)

        header_lbl = tb.Label(frame, text="Report Center", font=("Helvetica", 18, "bold"), bootstyle=PRIMARY)
        header_lbl.pack(anchor=W, pady=(0, 20))

        split = tb.Frame(frame)
        split.pack(fill=BOTH, expand=True)

        # Monthly report panel
        left_panel = tb.Labelframe(split, text="Monthly Attendance Matrix Generator", padding=20, bootstyle=PRIMARY)
        left_panel.pack(side=LEFT, fill=BOTH, expand=True, padx=(0, 10))

        tb.Label(left_panel, text="Select Month:", font=("Segoe UI", 10, "bold")).pack(anchor=W, pady=(5, 2))
        months = [
            ("January", 1), ("February", 2), ("March", 3), ("April", 4),
            ("May", 5), ("June", 6), ("July", 7), ("August", 8),
            ("September", 9), ("October", 10), ("November", 11), ("December", 12)
        ]
        
        self.month_combo = tb.Combobox(
            left_panel, 
            values=[m[0] for m in months], 
            state="readonly", 
            bootstyle=PRIMARY
        )
        self.month_combo.pack(fill=X, pady=(0, 15))
        
        curr_month = datetime.date.today().month
        self.month_combo.set(months[curr_month - 1][0])

        tb.Label(left_panel, text="Select Year:", font=("Segoe UI", 10, "bold")).pack(anchor=W, pady=(5, 2))
        self.year_spin = tb.Spinbox(left_panel, from_=2020, to=2035, bootstyle=PRIMARY)
        self.year_spin.set(datetime.date.today().year)
        self.year_spin.pack(fill=X, pady=(0, 20))

        tb.Label(left_panel, text="Export Format:", font=("Segoe UI", 10, "bold")).pack(anchor=W, pady=(5, 2))
        self.format_var = tk.StringVar(value="xlsx")
        
        excel_radio = tb.Radiobutton(
            left_panel, 
            text="Excel Sheet (.xlsx Grid)", 
            variable=self.format_var, 
            value="xlsx", 
            bootstyle=PRIMARY
        )
        excel_radio.pack(anchor=W, pady=2)
        
        pdf_radio = tb.Radiobutton(
            left_panel, 
            text="PDF Report (Landscape Print)", 
            variable=self.format_var, 
            value="pdf", 
            bootstyle=PRIMARY
        )
        pdf_radio.pack(anchor=W, pady=2)

        gen_report_btn = tb.Button(
            left_panel, 
            text="Compile Monthly Report", 
            bootstyle=SUCCESS, 
            command=self._generate_monthly_report_action
        )
        gen_report_btn.pack(fill=X, pady=(25, 0))

        # Right: Info panel
        right_panel = tb.Labelframe(split, text="Academic Report Guidelines", padding=20, bootstyle=PRIMARY)
        right_panel.pack(side=RIGHT, fill=BOTH, expand=True, padx=(10, 0))

        info_lbl = tb.Label(
            right_panel, 
            text=(
                "ABOUT MONTHLY REPORTS:\n\n"
                "1. The report lists all MFT batch students alongside all synced class dates within the selected month.\n\n"
                "2. Attendance is displayed as:\n"
                "   - 'P' (Present)\n"
                "   - 'A' (Absent)\n"
                "   - '-' (No Session Scheduled on that date)\n\n"
                "3. Present % is calculated dynamically for each student.\n\n"
                "4. Students below the 75% attendance threshold are highlighted in red for simple tracking."
            ),
            font=("Segoe UI", 10),
            justify=LEFT,
            wraplength=350,
            bootstyle=SECONDARY
        )
        info_lbl.pack(anchor=NW)

    def _generate_monthly_report_action(self):
        month_name = self.month_combo.get()
        year = int(self.year_spin.get())
        fmt = self.format_var.get()
        
        months_dict = {
            "January": 1, "February": 2, "March": 3, "April": 4,
            "May": 5, "June": 6, "July": 7, "August": 8,
            "September": 9, "October": 10, "November": 11, "December": 12
        }
        month = months_dict[month_name]

        self.set_status("Generating monthly report...", loading=True)
        
        def run():
            return self.report_gen.generate_monthly_report(year, month, fmt)

        def run_done(filepath):
            self.set_status("Ready")
            messagebox.showinfo("Report Compiled", f"Monthly report saved successfully!\n\nFile:\n{filepath}")

        def run_error(err):
            self.set_status("Ready")
            messagebox.showerror("Error", f"Failed to generate monthly report:\n{err}\n\nMake sure attendance records exist for the chosen month.")

        run_in_background(run, run_done, run_error)

    def _render_help_page(self):
        frame = tb.Frame(self.content_frame, padding=10)
        frame.pack(fill=BOTH, expand=True)

        header_lbl = tb.Label(frame, text="Help & Documentation Guide", font=("Helvetica", 18, "bold"), bootstyle=PRIMARY)
        header_lbl.pack(anchor=W, pady=(0, 20))

        help_box = tb.Labelframe(frame, text="System Setup Guide", padding=15)
        help_box.pack(fill=BOTH, expand=True)
        
        text_area = tk.Text(help_box, wrap=WORD, font=("Segoe UI", 10), bg=self.cget("background"), fg="black", bd=0, highlightthickness=0)
        text_area.pack(fill=BOTH, expand=True)
        
        doc_text = (
            "MFT ACADEMIC ATTENDANCE AUTOMATION SYSTEM HELP DIRECTORY\n"
            "==========================================================\n\n"
            "1. HOW THE AUTOMATION WORKS:\n"
            "   The system links two separate Google Sheets dynamically:\n"
            "   - 'MFT Student List' sheet: Contains the roster of students in the MFT batch.\n"
            "   - 'Marquee Training' sheet: The master sheet holding daily attendance for 300+ students.\n"
            "   Whenever you generate reports, the app fetches both sheets, matches MFT students in the "
            "master list, filters out non-MFT students, and outputs a formatted daily attendance report.\n\n"
            "2. CREDENTIALS SETUP (GOOGLE DEVELOPER CONSOLE):\n"
            "   - Go to Google Cloud Console (https://console.cloud.google.com/).\n"
            "   - Create a new project and enable the 'Google Sheets API' and 'Google Drive API'.\n"
            "   - Go to Credentials -> Create Credentials -> Service Account.\n"
            "   - Generate and download the JSON key. Rename this file to 'credentials.json' and place it "
            "in the application folder (or browse it via the Settings view).\n"
            "   - Open the downloaded credentials JSON and copy the service account 'client_email'.\n"
            "   - Share both of your Google Sheets with this client email as a 'Viewer'.\n\n"
            "3. MATCHING LOGIC AND FLEXIBLE COLUMNS:\n"
            "   - The app dynamically identifies columns (e.g. Enrollment, Email, Name) based on header names. "
            "The columns can be rearranged without breaking the app.\n"
            "   - Match priority: Primary Key (Enrollment No), Secondary Key (Roll No / RHN_ID), Tertiary Key (Name).\n\n"
            "4. OFFLINE CACHE AND RESILIENCE:\n"
            "   - If internet connection fails, the application automatically uses local files in the "
            "'backup' directory to let you compile attendance offline."
        )
        
        text_area.insert(END, doc_text)
        text_area.config(state=DISABLED)

    def _render_about_page(self):
        frame = tb.Frame(self.content_frame, padding=10)
        frame.pack(fill=BOTH, expand=True)

        card = tb.Labelframe(frame, text="About the Application", padding=30, bootstyle=PRIMARY)
        card.pack(pady=40, padx=80, fill=BOTH, expand=True)

        tb.Label(card, text="MFT Academic Attendance Automation", font=("Helvetica", 16, "bold"), bootstyle=PRIMARY).pack(pady=10)
        tb.Label(card, text="Version 1.0.0 (Production Release)", font=("Segoe UI", 10, "bold"), bootstyle=SECONDARY).pack()
        
        desc = (
            "This application was built specifically for college faculty members to automate "
            "the daily academic attendance mapping for the MFT batch.\n\n"
            "It automatically filters, matches, and compiles formatted academic attendance sheets, "
            "eliminating human errors and saving valuable time."
        )
        tb.Label(card, text=desc, font=("Segoe UI", 10), wraplength=400, justify=CENTER).pack(pady=20)
        
        tb.Label(card, text="Designed & Engineered for MFT Faculty", font=("Segoe UI", 9, "italic"), bootstyle=INFO).pack(pady=20)
