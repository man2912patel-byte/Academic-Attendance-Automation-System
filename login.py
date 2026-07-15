import sys
import logging
import tkinter as tk
from tkinter import messagebox
import ttkbootstrap as tb
from ttkbootstrap.constants import *

logger = logging.getLogger("login")

class RegisterWindow(tb.Toplevel):
    def __init__(self, parent, auth_mgr):
        super().__init__(parent)
        self.auth_mgr = auth_mgr
        
        self.title("Create Account")
        self.geometry("520x450")
        
        # Center
        self.update_idletasks()
        w = 520
        h = 450
        x = (self.winfo_screenwidth() // 2) - (w // 2)
        y = (self.winfo_screenheight() // 2) - (h // 2)
        self.geometry(f"{w}x{h}+{x}+{y}")
        
        self.state('zoomed')
        
        screen_w = self.winfo_screenwidth()
        screen_h = self.winfo_screenheight()
        self.minsize(screen_w, screen_h)
        
        self.transient(parent)
        self.grab_set()
        
        self._init_ui()

    def _init_ui(self):
        container = tb.Frame(self, padding=25)
        container.pack(fill=BOTH, expand=True)
        
        center_frame = tb.Frame(container)
        center_frame.place(relx=0.5, rely=0.5, anchor=CENTER)
        
        tb.Label(center_frame, text="Create Account", font=("Helvetica", 16, "bold"), bootstyle=PRIMARY).pack(pady=(0, 15))
        
        # Full Name
        tb.Label(center_frame, text="Full Name:", font=("Segoe UI", 10, "bold")).pack(anchor=W, pady=(5, 2))
        self.name_entry = tb.Entry(center_frame, bootstyle=PRIMARY, width=40)
        self.name_entry.pack(fill=X, pady=(0, 10))
        self.name_entry.focus()
        
        # Username
        tb.Label(center_frame, text="Username:", font=("Segoe UI", 10, "bold")).pack(anchor=W, pady=(5, 2))
        self.user_entry = tb.Entry(center_frame, bootstyle=PRIMARY, width=40)
        self.user_entry.pack(fill=X, pady=(0, 10))
        
        # Password
        tb.Label(center_frame, text="Password (Min 6 characters):", font=("Segoe UI", 10, "bold")).pack(anchor=W, pady=(5, 2))
        self.pass_entry = tb.Entry(center_frame, show="*", bootstyle=PRIMARY, width=40)
        self.pass_entry.pack(fill=X, pady=(0, 10))

        # Confirm Password
        tb.Label(center_frame, text="Confirm Password:", font=("Segoe UI", 10, "bold")).pack(anchor=W, pady=(5, 2))
        self.confirm_entry = tb.Entry(center_frame, show="*", bootstyle=PRIMARY, width=40)
        self.confirm_entry.pack(fill=X, pady=(0, 20))
        
        # Action Buttons
        btn_frame = tb.Frame(center_frame)
        btn_frame.pack(fill=X)
        
        reg_btn = tb.Button(btn_frame, text="Register Account", bootstyle=SUCCESS, command=self._handle_register)
        reg_btn.pack(side=LEFT, fill=X, expand=True, padx=(0, 5))
        
        cancel_btn = tb.Button(btn_frame, text="Cancel", bootstyle=SECONDARY, command=self.destroy)
        cancel_btn.pack(side=RIGHT, fill=X, expand=True, padx=(5, 0))

    def _handle_register(self):
        full_name = self.name_entry.get().strip()
        username = self.user_entry.get().strip()
        password = self.pass_entry.get()
        confirm = self.confirm_entry.get()
        
        if not username:
            messagebox.showerror("Validation Error", "Username cannot be empty.")
            return

        if len(password) < 6:
            messagebox.showerror("Validation Error", "Password must contain at least 6 characters.")
            return
            
        if password != confirm:
            messagebox.showerror("Validation Error", "Passwords do not match.")
            return
            
        success, msg = self.auth_mgr.register_user(username, password, full_name)
        if success:
            messagebox.showinfo("Success", "Account created successfully.")
            self.destroy()
        else:
            messagebox.showerror("Registration Failed", msg)


class LoginWindow(tb.Toplevel):
    def __init__(self, parent, config, auth_mgr, session_mgr, on_login_success):
        logger.info("Initializing SQLite LoginWindow...")
        super().__init__(parent)
        self.config = config
        self.auth_mgr = auth_mgr
        self.session_mgr = session_mgr
        self.on_login_success = on_login_success

        self.title("MFT Attendance - Local Authentication Portal")
        
        self.center_window()
        self.state('zoomed')
        
        screen_w = self.winfo_screenwidth()
        screen_h = self.winfo_screenheight()
        self.minsize(screen_w, screen_h)
        
        if parent and parent.winfo_exists() and parent.winfo_viewable():
            self.transient(parent)
            self.grab_set()
        
        self.protocol("WM_DELETE_WINDOW", self._on_exit)

        self._init_ui()

    def center_window(self):
        self.update_idletasks()
        w = 520
        h = 480
        x = (self.winfo_screenwidth() // 2) - (w // 2)
        y = (self.winfo_screenheight() // 2) - (h // 2)
        self.geometry(f"{w}x{h}+{x}+{y}")

    def _init_ui(self):
        outer_container = tb.Frame(self, padding=25)
        outer_container.pack(fill=BOTH, expand=True)

        container = tb.Frame(outer_container)
        container.place(relx=0.5, rely=0.5, anchor=CENTER)

        # ----------------- HEADER & LOGO -----------------
        header_frame = tb.Frame(container)
        header_frame.pack(fill=X, pady=(0, 10))

        logo_canvas = tk.Canvas(header_frame, width=90, height=90, bg=self.cget("background"), bd=0, highlightthickness=0)
        logo_canvas.pack(pady=(0, 10))
        logo_canvas.create_oval(5, 5, 85, 85, fill="#1E3D59", outline="")
        logo_canvas.create_polygon(45, 18, 65, 33, 65, 60, 45, 72, 25, 60, 25, 33, fill="#FFFFFF", outline="")
        logo_canvas.create_text(45, 45, text="MFT", font=("Helvetica", 11, "bold"), fill="#1E3D59")

        title_lbl = tb.Label(
            header_frame, 
            text="Academic Attendance Automation System", 
            font=("Helvetica", 18, "bold"), 
            bootstyle=PRIMARY,
            anchor=CENTER
        )
        title_lbl.pack()

        subtitle_lbl = tb.Label(
            header_frame, 
            text="Faculty Attendance Management System", 
            font=("Segoe UI", 10, "italic"), 
            bootstyle=SECONDARY,
            anchor=CENTER
        )
        subtitle_lbl.pack()

        # ----------------- INPUT FIELDS -----------------
        fields_frame = tb.Frame(container)
        fields_frame.pack(fill=X, pady=5)

        tb.Label(fields_frame, text="Username:", font=("Segoe UI", 10, "bold")).pack(anchor=W, pady=(5, 2))
        self.user_entry = tb.Entry(fields_frame, bootstyle=PRIMARY, width=40)
        self.user_entry.pack(fill=X, pady=(0, 5))
        self.user_entry.focus()

        tb.Label(fields_frame, text="Password:", font=("Segoe UI", 10, "bold")).pack(anchor=W, pady=(5, 2))
        self.pass_entry = tb.Entry(fields_frame, show="*", bootstyle=PRIMARY, width=40)
        self.pass_entry.pack(fill=X, pady=(0, 2))
        self.pass_entry.bind("<Key>", self._check_caps_lock)
        self.pass_entry.bind("<Return>", lambda e: self._handle_login())

        self.caps_lbl = tb.Label(fields_frame, text="", font=("Segoe UI", 9, "bold"), bootstyle=DANGER)
        self.caps_lbl.pack(anchor=W, pady=(2, 5))

        # Checkboxes Row (Remember & Show Password)
        chk_frame = tb.Frame(fields_frame)
        chk_frame.pack(fill=X, pady=5)

        self.remember_var = tk.BooleanVar(value=False)
        self.remember_chk = tb.Checkbutton(
            chk_frame, 
            text="Remember Login", 
            variable=self.remember_var, 
            bootstyle="primary-round-toggle"
        )
        self.remember_chk.pack(side=LEFT)

        self.show_pass_var = tk.BooleanVar(value=False)
        self.show_pass_chk = tb.Checkbutton(
            chk_frame, 
            text="Show Password", 
            variable=self.show_pass_var, 
            bootstyle="primary",
            command=self._toggle_password_visibility
        )
        self.show_pass_chk.pack(side=RIGHT)

        # ----------------- ACTION BUTTONS -----------------
        btn_frame = tb.Frame(container)
        btn_frame.pack(fill=X, pady=(15, 0))

        # Create Account link button
        create_acc_btn = tb.Button(
            btn_frame, 
            text="Create Account", 
            bootstyle="primary-link", 
            command=self._open_register_window
        )
        create_acc_btn.pack(side=RIGHT, padx=(10, 0))

        # Spacer/separator
        sep = tb.Separator(btn_frame, bootstyle=SECONDARY)
        sep.pack(fill=X, pady=10)

        # Action button row
        act_row = tb.Frame(btn_frame)
        act_row.pack(fill=X, pady=(0, 5))
        act_row.columnconfigure(0, weight=1)
        act_row.columnconfigure(1, weight=1)

        login_btn = tb.Button(
            act_row, 
            text="Login Account", 
            bootstyle=SUCCESS, 
            command=self._handle_login
        )
        login_btn.grid(row=0, column=0, sticky="ew", padx=(0, 5))

        exit_btn = tb.Button(
            act_row, 
            text="Exit Portal", 
            bootstyle=SECONDARY, 
            command=self._on_exit
        )
        exit_btn.grid(row=0, column=1, sticky="ew", padx=(5, 0))

    def _toggle_password_visibility(self):
        if self.show_pass_var.get():
            self.pass_entry.config(show="")
        else:
            self.pass_entry.config(show="*")

    def _check_caps_lock(self, event):
        caps_on = (event.state & 2) != 0
        if caps_on:
            self.caps_lbl.config(text="⚠️ Caps Lock is active")
        else:
            self.caps_lbl.config(text="")

    def _open_register_window(self):
        RegisterWindow(self, self.auth_mgr)

    def _handle_login(self):
        username = self.user_entry.get().strip()
        password = self.pass_entry.get()

        if not username or not password:
            messagebox.showerror("Validation Error", "Please fill in both Username and Password fields.")
            return

        result = self.auth_mgr.authenticate(username, password)
        if result:
            logger.info(f"User '{username}' successfully authenticated.")
            if self.remember_var.get():
                self.session_mgr.save(username)
            else:
                self.session_mgr.clear()

            self.on_login_success(result)
            self.destroy()
        else:
            logger.warning(f"Login failed for username '{username}'")
            messagebox.showerror("Login Failed", "Invalid username or password.")

    def _on_exit(self):
        logger.info("LoginWindow exited by user. Terminating process.")
        self.grab_release()
        self.master.destroy()
        sys.exit(0)
