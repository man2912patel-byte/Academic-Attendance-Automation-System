import os
import tkinter as tk
from tkinter import filedialog, messagebox
import ttkbootstrap as tb
from ttkbootstrap.constants import *
from pathlib import Path
import logging

from google_sheet import GoogleSheetClient
from utils import is_internet_connected, run_in_background

logger = logging.getLogger("settings")

class SettingsView(tb.Frame):
    def __init__(self, parent, config, status_callback=None):
        super().__init__(parent, padding=15)
        self.config = config
        self.status_callback = status_callback
        self._init_ui()

    def _init_ui(self):
        # Header
        header_lbl = tb.Label(self, text="Application Settings & Control", font=("Helvetica", 18, "bold"), bootstyle=PRIMARY)
        header_lbl.pack(anchor=W, pady=(0, 15))

        # Main Layout Frame
        main_frame = tb.Frame(self)
        main_frame.pack(fill=BOTH, expand=True)

        # Left Column - Google Sheets Config
        left_col = tb.Labelframe(main_frame, text="Google Sheets API Setup", padding=15, bootstyle=PRIMARY)
        left_col.pack(side=LEFT, fill=BOTH, expand=True, padx=(0, 10))

        # Sheet IDs
        tb.Label(left_col, text="MFT Student List Google Sheet ID:", font=("Segoe UI", 10, "bold")).pack(anchor=W, pady=(5, 2))
        self.mft_id_entry = tb.Entry(left_col, bootstyle=PRIMARY)
        self.mft_id_entry.insert(0, self.config.mft_sheet_id)
        self.mft_id_entry.pack(fill=X, pady=(0, 10))
        
        tb.Label(left_col, text="Marquee Training Attendance Google Sheet ID:", font=("Segoe UI", 10, "bold")).pack(anchor=W, pady=(5, 2))
        self.marquee_id_entry = tb.Entry(left_col, bootstyle=PRIMARY)
        self.marquee_id_entry.insert(0, self.config.marquee_sheet_id)
        self.marquee_id_entry.pack(fill=X, pady=(0, 10))

        # Credentials File selector
        tb.Label(left_col, text="Google Service Account Credentials (JSON):", font=("Segoe UI", 10, "bold")).pack(anchor=W, pady=(5, 2))
        cred_frame = tb.Frame(left_col)
        cred_frame.pack(fill=X, pady=(0, 10))

        self.cred_entry = tb.Entry(cred_frame, bootstyle=PRIMARY)
        self.cred_entry.insert(0, self.config.credentials_path)
        self.cred_entry.pack(side=LEFT, fill=X, expand=True, padx=(0, 5))

        browse_btn = tb.Button(cred_frame, text="Browse...", bootstyle=SECONDARY, command=self._browse_credentials)
        browse_btn.pack(side=RIGHT)

        # Connection Tester
        btn_frame = tb.Frame(left_col)
        btn_frame.pack(fill=X, pady=(15, 0))
        
        test_conn_btn = tb.Button(btn_frame, text="Test API Connection", bootstyle=INFO, command=self._test_connection)
        test_conn_btn.pack(side=LEFT, padx=(0, 5))

        # Right Column - General System Config
        right_col = tb.Labelframe(main_frame, text="System Configuration", padding=15, bootstyle=PRIMARY)
        right_col.pack(side=RIGHT, fill=BOTH, expand=True, padx=(10, 0))

        # UI Theme
        tb.Label(right_col, text="Interface Theme style:", font=("Segoe UI", 10, "bold")).pack(anchor=W, pady=(5, 2))
        themes = ["flatly", "cosmo", "sandstone", "lumen", "yeti", "darkly", "cyborg", "superhero", "solar"]
        self.theme_combo = tb.Combobox(right_col, values=themes, state="readonly", bootstyle=PRIMARY)
        self.theme_combo.set(self.config.theme)
        self.theme_combo.pack(fill=X, pady=(0, 15))

        # Paths
        tb.Label(right_col, text="Output Directory (Excel Exports):", font=("Segoe UI", 10, "bold")).pack(anchor=W, pady=(5, 2))
        self.output_entry = tb.Entry(right_col, bootstyle=PRIMARY)
        self.output_entry.insert(0, self.config.output_dir)
        self.output_entry.pack(fill=X, pady=(0, 10))

        tb.Label(right_col, text="Backup Directory:", font=("Segoe UI", 10, "bold")).pack(anchor=W, pady=(5, 2))
        self.backup_entry = tb.Entry(right_col, bootstyle=PRIMARY)
        self.backup_entry.insert(0, self.config.backup_dir)
        self.backup_entry.pack(fill=X, pady=(0, 10))

        # Backup checkbox
        self.auto_backup_var = tk.BooleanVar(value=self.config.auto_backup)
        self.backup_chk = tb.Checkbutton(
            right_col, 
            text="Enable Automatic Local Cache Backups", 
            variable=self.auto_backup_var, 
            bootstyle="primary-round-toggle"
        )
        self.backup_chk.pack(anchor=W, pady=(15, 10))

        # Action Buttons Bottom
        bottom_bar = tb.Frame(self)
        bottom_bar.pack(fill=X, side=BOTTOM, pady=(20, 0))

        save_btn = tb.Button(bottom_bar, text="Save Settings", bootstyle=SUCCESS, width=15, command=self._save_settings)
        save_btn.pack(side=RIGHT, padx=(5, 0))

        reset_btn = tb.Button(bottom_bar, text="Reset Defaults", bootstyle=DANGER, width=15, command=self._reset_defaults)
        reset_btn.pack(side=RIGHT, padx=(0, 5))

    def _browse_credentials(self):
        filename = filedialog.askopenfilename(
            title="Select Credentials JSON File",
            filetypes=[("JSON Files", "*.json"), ("All Files", "*.*")]
        )
        if filename:
            self.cred_entry.delete(0, END)
            self.cred_entry.insert(0, filename)

    def _test_connection(self):
        mft_id = self.mft_id_entry.get().strip()
        marquee_id = self.marquee_id_entry.get().strip()
        cred_path = self.cred_entry.get().strip()

        if not mft_id or not marquee_id:
            messagebox.showerror("Error", "Please configure both Sheet IDs before testing.")
            return

        if not is_internet_connected():
            messagebox.showerror("No Internet", "An active internet connection is required to test API credentials.")
            return

        if self.status_callback:
            self.status_callback("Testing connection to Google Sheets API...", loading=True)

        def test_runner():
            client = GoogleSheetClient(cred_path)
            # Test connecting to MFT Student List
            client.get_sheet_raw_data(mft_id, "Sheet1!A1:B2")
            return True

        def on_done(success):
            if self.status_callback:
                self.status_callback("Status: Ready")
            messagebox.showinfo("Success", "Successfully connected to Google Sheets API!")

        def on_fail(err):
            if self.status_callback:
                self.status_callback("Status: Connection Test Failed")
            logger.error(f"API Connection Test Failed: {err}")
            messagebox.showerror("Connection Failed", f"Failed to connect to Google Sheets API:\n\n{err}")

        run_in_background(test_runner, on_done, on_fail)

    def _save_settings(self):
        mft_id = self.mft_id_entry.get().strip()
        marquee_id = self.marquee_id_entry.get().strip()
        cred_path = self.cred_entry.get().strip()
        theme = self.theme_combo.get()
        output_d = self.output_entry.get().strip()
        backup_d = self.backup_entry.get().strip()
        auto_b = self.auto_backup_var.get()

        if not mft_id or not marquee_id or not output_d or not backup_d:
            messagebox.showerror("Error", "All configuration fields must be populated.")
            return

        # Apply & Save
        old_theme = self.config.theme
        self.config.mft_sheet_id = mft_id
        self.config.marquee_sheet_id = marquee_id
        self.config.credentials_path = cred_path
        self.config.theme = theme
        self.config.data["output_dir"] = output_d
        self.config.data["backup_dir"] = backup_d
        self.config.auto_backup = auto_b
        self.config.save()

        # Update styling theme immediately
        if theme != old_theme:
            logger.info(f"Switching style theme to '{theme}'...")
            tb.Style().theme_use(theme)

        messagebox.showinfo("Settings Saved", "Application settings have been saved successfully.")

    def _reset_defaults(self):
        if messagebox.askyesno("Reset Configuration", "Are you sure you want to revert all settings to factory defaults?"):
            self.config.data = self.config.DEFAULT_CONFIG.copy()
            self.config.save()
            
            # Refresh fields
            self.mft_id_entry.delete(0, END)
            self.mft_id_entry.insert(0, self.config.mft_sheet_id)
            
            self.marquee_id_entry.delete(0, END)
            self.marquee_id_entry.insert(0, self.config.marquee_sheet_id)
            
            self.cred_entry.delete(0, END)
            self.cred_entry.insert(0, self.config.credentials_path)
            
            self.theme_combo.set(self.config.theme)
            
            self.output_entry.delete(0, END)
            self.output_entry.insert(0, self.config.output_dir)
            
            self.backup_entry.delete(0, END)
            self.backup_entry.insert(0, self.config.backup_dir)
            
            self.auto_backup_var.set(self.config.auto_backup)
            
            tb.Style().theme_use(self.config.theme)
            messagebox.showinfo("Reset Complete", "Reverted settings back to standard defaults.")
