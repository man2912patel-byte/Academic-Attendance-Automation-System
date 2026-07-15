import os
import sys
import time
import logging
import tkinter as tk
import ttkbootstrap as tb
from ttkbootstrap.constants import *
from pathlib import Path

# Setup logging
from utils import setup_logging
logger = setup_logging()

# Import Config and GUI
from config import Config
from gui import MainGUI

class SplashScreen(tb.Toplevel):
    def __init__(self, parent, on_close_callback):
        super().__init__(parent)
        self.on_close_callback = on_close_callback
        
        # Make it borderless
        self.overrideredirect(True)
        
        # Center the window
        width = 500
        height = 300
        screen_width = self.winfo_screenwidth()
        screen_height = self.winfo_screenheight()
        x = (screen_width - width) // 2
        y = (screen_height - height) // 2
        self.geometry(f"{width}x{height}+{x}+{y}")
        
        self._build_ui()
        
        # Simulate loading process
        self.loading_step = 0
        self.after(50, self._process_loading)

    def _build_ui(self):
        # Outer frame for professional border
        outer = tb.Frame(self, bootstyle=PRIMARY, padding=2)
        outer.pack(fill=BOTH, expand=True)
        
        inner = tb.Frame(outer, padding=25)
        inner.pack(fill=BOTH, expand=True)
        
        # Title
        tb.Label(
            inner, 
            text="MFT Academic Attendance", 
            font=("Helvetica", 20, "bold"), 
            bootstyle=PRIMARY
        ).pack(pady=(20, 5))
        
        tb.Label(
            inner, 
            text="Automation & Reporting System", 
            font=("Segoe UI", 11), 
            bootstyle=SECONDARY
        ).pack(pady=(0, 20))
        
        # Spinner/Progress bar
        self.progress = tb.Progressbar(
            inner, 
            mode=DETERMINATE, 
            bootstyle=SUCCESS, 
            length=350
        )
        self.progress.pack(pady=10)
        
        self.status_lbl = tb.Label(
            inner, 
            text="Initializing modules...", 
            font=("Segoe UI", 9, "italic"), 
            bootstyle=SECONDARY
        )
        self.status_lbl.pack(pady=5)
        
        # Footer
        tb.Label(
            inner, 
            text="© 2026 Marquee Training Automation", 
            font=("Segoe UI", 8), 
            bootstyle=SECONDARY
        ).pack(side=BOTTOM)

    def _process_loading(self):
        self.loading_step += 5
        self.progress.configure(value=self.loading_step)
        
        if self.loading_step == 20:
            self.status_lbl.configure(text="Reading config.json parameters...")
        elif self.loading_step == 45:
            self.status_lbl.configure(text="Validating system folders and database...")
        elif self.loading_step == 70:
            self.status_lbl.configure(text="Initializing attendance runs database...")
        elif self.loading_step == 90:
            self.status_lbl.configure(text="Preparing user interface views...")
            
        if self.loading_step < 100:
            self.after(50, self._process_loading)
        else:
            self.destroy()
            self.on_close_callback()

def run_application():
    try:
        logger.info("Starting MFT Attendance Automation system boot sequence...")
        
        # Initialize configuration and directories
        config = Config()
        
        # Create the main window but withdraw/hide it immediately
        app = MainGUI(config)
        app.withdraw()
        
        # Define callback when splash screen completes
        def on_splash_complete():
            logger.info("Splash screen completed. Initiating authentication check...")
            app._check_authentication()
            
        # Create and display the splash screen as a Toplevel overlay
        splash = SplashScreen(app, on_splash_complete)
        
        # Keep splash on top
        splash.attributes('-topmost', True)
        
        # Start Tkinter main loop on the root app window
        app.mainloop()
        
    except Exception as e:
        logger.critical("Critical error during application boot sequence", exc_info=True)
        # Show fallback Tkinter error message if main GUI failed to launch
        fallback_root = tk.Tk()
        fallback_root.withdraw()
        tk.messagebox.showerror(
            "Application Crash", 
            f"A critical error occurred while starting the application:\n\n{e}\n\nCheck logs/app.log for details."
        )
        sys.exit(1)

if __name__ == "__main__":
    run_application()
