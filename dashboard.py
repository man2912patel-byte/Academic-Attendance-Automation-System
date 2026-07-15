import datetime
import tkinter as tk
from tkinter import messagebox
import ttkbootstrap as tb
from ttkbootstrap.constants import *

from google_sheet import GoogleSheetClient
from attendance import AttendanceManager
from history import HistoryManager
from utils import run_in_background, is_internet_connected

class DashboardView(tb.Frame):
    def __init__(self, parent, config, history_mgr, status_callback=None, nav_to_generate=None):
        super().__init__(parent, padding=20)
        self.config = config
        self.history_mgr = history_mgr
        self.status_callback = status_callback
        self.nav_to_generate = nav_to_generate
        self._init_ui()
        self.refresh_stats()

    def _init_ui(self):
        # Top banner with Date and Sync Info
        top_bar = tb.Frame(self)
        top_bar.pack(fill=X, pady=(0, 20))

        title_lbl = tb.Label(top_bar, text="Academic Dashboard", font=("Helvetica", 18, "bold"), bootstyle=PRIMARY)
        title_lbl.pack(side=LEFT)

        today_str = datetime.date.today().strftime("%A, %d %B %Y")
        date_lbl = tb.Label(top_bar, text=today_str, font=("Segoe UI", 11, "bold"), bootstyle=SECONDARY)
        date_lbl.pack(side=RIGHT)

        # ----------------- Stats Cards Frame -----------------
        cards_frame = tb.Frame(self)
        cards_frame.pack(fill=X, pady=(0, 20))

        # Card 1: Total MFT Students
        self.card_total = self._create_card(cards_frame, "Total Students", "0", INFO, 0)
        
        # Card 2: Present Today (or last sync)
        self.card_present = self._create_card(cards_frame, "Present", "0", SUCCESS, 1)

        # Card 3: Absent Today (or last sync)
        self.card_absent = self._create_card(cards_frame, "Absent", "0", DANGER, 2)

        # Card 4: Attendance Rate
        self.card_rate = self._create_card(cards_frame, "Attendance Rate", "0%", WARNING, 3)

        # ----------------- Main Section -----------------
        main_sec = tb.Frame(self)
        main_sec.pack(fill=BOTH, expand=True)

        # Left Column - Quick Actions
        left_panel = tb.Labelframe(main_sec, text="Quick Sync Actions", padding=15, bootstyle=PRIMARY, width=280)
        left_panel.pack(side=LEFT, fill=BOTH, padx=(0, 10))

        tb.Label(
            left_panel, 
            text="Faculty Sync Utility", 
            font=("Segoe UI", 12, "bold"), 
            bootstyle=PRIMARY
        ).pack(anchor=W, pady=(0, 10))
        
        desc_text = (
            "Click Sync to fetch the latest student rosters and training sheets directly from Google Sheets.\n\n"
            "This will download new student registrations, update attendance states, and rebuild offline backups."
        )
        tb.Label(
            left_panel, 
            text=desc_text, 
            font=("Segoe UI", 9), 
            wraplength=250, 
            bootstyle=SECONDARY
        ).pack(anchor=W, pady=(0, 20))

        self.sync_btn = tb.Button(
            left_panel, 
            text="Sync Google Sheets", 
            bootstyle=SUCCESS, 
            command=self._trigger_sync
        )
        self.sync_btn.pack(fill=X, pady=5)

        self.gen_btn = tb.Button(
            left_panel, 
            text="Generate Today's Report", 
            bootstyle="primary-outline", 
            command=self._go_to_generate
        )
        self.gen_btn.pack(fill=X, pady=5)

        # Right Column - Recent History Records
        right_panel = tb.Labelframe(main_sec, text="Recent Attendance Synchronizations", padding=15, bootstyle=PRIMARY)
        right_panel.pack(side=RIGHT, fill=BOTH, expand=True, padx=(10, 0))

        # Treeview Scrollbar
        scroll_y = tb.Scrollbar(right_panel, orient=VERTICAL)
        scroll_y.pack(side=RIGHT, fill=Y)

        columns = ("date", "sync_time", "total", "present", "absent", "percentage")
        self.tree = tb.Treeview(
            right_panel, 
            columns=columns, 
            show="headings", 
            yscrollcommand=scroll_y.set, 
            bootstyle=PRIMARY,
            height=8
        )
        self.tree.pack(fill=BOTH, expand=True)
        scroll_y.config(command=self.tree.yview)

        # Headings
        self.tree.heading("date", text="Date")
        self.tree.heading("sync_time", text="Sync Time")
        self.tree.heading("total", text="Total")
        self.tree.heading("present", text="Present")
        self.tree.heading("absent", text="Absent")
        self.tree.heading("percentage", text="Rate (%)")

        # Column settings
        self.tree.column("date", anchor=CENTER, width=90)
        self.tree.column("sync_time", anchor=CENTER, width=130)
        self.tree.column("total", anchor=CENTER, width=60)
        self.tree.column("present", anchor=CENTER, width=60)
        self.tree.column("absent", anchor=CENTER, width=60)
        self.tree.column("percentage", anchor=CENTER, width=80)

        # Status Bar info
        self.sync_time_lbl = tb.Label(
            self, 
            text=f"Last Sheets Sync: {self.config.last_sync_time}", 
            font=("Segoe UI", 9, "italic"),
            bootstyle=SECONDARY
        )
        self.sync_time_lbl.pack(anchor=W, pady=(15, 0))

    def _create_card(self, parent, title, value, boot_style, col_index):
        # Card container
        card = tb.Frame(parent, bootstyle=boot_style, padding=1, width=170)
        card.grid(row=0, column=col_index, sticky="nsew", padx=10)
        parent.grid_columnconfigure(col_index, weight=1)

        # Inner frame for background color
        inner = tb.Frame(card, padding=15)
        inner.pack(fill=BOTH, expand=True)

        title_lbl = tb.Label(inner, text=title.upper(), font=("Segoe UI", 9, "bold"), bootstyle=boot_style)
        title_lbl.pack(anchor=NW)

        val_lbl = tb.Label(inner, text=value, font=("Helvetica", 22, "bold"), bootstyle=boot_style)
        val_lbl.pack(anchor=NW, pady=(10, 0))

        return val_lbl

    def refresh_stats(self):
        """Loads data from the history database and updates the cards and treeview."""
        runs = self.history_mgr.get_all_runs()
        
        # Update Treeview
        for item in self.tree.get_children():
            self.tree.delete(item)

        for run in runs[:10]:
            pct = (run["present_count"] / run["total_students"] * 100) if run["total_students"] > 0 else 0
            self.tree.insert("", END, values=(
                run["attendance_date"],
                run["sync_time"],
                run["total_students"],
                run["present_count"],
                run["absent_count"],
                f"{pct:.2f}%"
            ))

        # Update Stats Cards with the latest run values
        if runs:
            latest_run = runs[0]
            self.card_total.config(text=str(latest_run["total_students"]))
            self.card_present.config(text=str(latest_run["present_count"]))
            self.card_absent.config(text=str(latest_run["absent_count"]))
            
            pct = (latest_run["present_count"] / latest_run["total_students"] * 100) if latest_run["total_students"] > 0 else 0
            self.card_rate.config(text=f"{pct:.1f}%")
        else:
            self.card_total.config(text="0")
            self.card_present.config(text="0")
            self.card_absent.config(text="0")
            self.card_rate.config(text="0%")

        self.sync_time_lbl.config(text=f"Last Sheets Sync: {self.config.last_sync_time}")

    def _trigger_sync(self):
        """
        Connects to Google Sheets and performs a full synchronization check in the background.
        """
        if not is_internet_connected():
            messagebox.showwarning("Sync Warning", "Internet is offline. Synchronization from Google Sheets requires network access. Loaded from local cache if available.")
            
        if self.status_callback:
            self.status_callback("Syncing student lists from Google Sheets...", loading=True)
        self.sync_btn.config(state=DISABLED)

        def bg_sync():
            gs_client = GoogleSheetClient(self.config)
            mft_raw = gs_client.fetch_mft_students()
            marquee_raw = gs_client.fetch_marquee_attendance()
            return mft_raw, marquee_raw

        def sync_done(result):
            mft_raw, marquee_raw = result
            # Quick validation
            att_mgr = AttendanceManager(self.config)
            mft_students, marquee_students, date_map = att_mgr.parse_sheets_data(mft_raw, marquee_raw)
            
            # Save sync timestamp
            now_str = datetime.datetime.now().strftime("%Y-%m-%d %I:%M %p")
            self.config.last_sync_time = now_str
            
            if self.status_callback:
                self.status_callback("Ready")
                
            self.sync_btn.config(state=NORMAL)
            self.refresh_stats()
            messagebox.showinfo("Sync Complete", f"Successfully synced roster from Google Sheets!\n- {len(mft_students)} MFT Students identified.\n- {len(date_map)} Calendar dates available.")

        def sync_error(err):
            if self.status_callback:
                self.status_callback("Ready")
            self.sync_btn.config(state=NORMAL)
            messagebox.showerror("Sync Failed", f"An error occurred while syncing:\n{err}\n\nPlease check Sheet IDs and credentials.")

        run_in_background(bg_sync, sync_done, sync_error)

    def _go_to_generate(self):
        if self.nav_to_generate:
            self.nav_to_generate()
