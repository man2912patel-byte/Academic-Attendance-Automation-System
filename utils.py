import os
import socket
import logging
import datetime
import threading
import tkinter as tk
from pathlib import Path

# Setup logging
def setup_logging():
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    log_file = log_dir / "app.log"
    
    # Configure root logger
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    # Avoid duplicate handlers if setup multiple times
    if logger.handlers:
        return logger
        
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    # File Handler
    file_handler = logging.FileHandler(log_file, encoding='utf-8')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    
    # Console Handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    return logger

logger = setup_logging()

def is_internet_connected(host="8.8.8.8", port=53, timeout=3):
    """
    Checks if internet is available by attempting a socket connection to a reliable DNS server.
    """
    try:
        socket.setdefaulttimeout(timeout)
        socket.socket(socket.AF_INET, socket.SOCK_STREAM).connect((host, port))
        return True
    except socket.error as ex:
        logger.warning(f"Internet connection check failed: {ex}")
        return False

def parse_date_string(date_str):
    """
    Intelligently parses date strings in multiple formats (DD-MM-YYYY, MM-DD-YYYY, etc.)
    and returns a datetime.date object. Returns None if parsing fails.
    """
    if not date_str or not isinstance(date_str, str):
        return None
        
    date_str = date_str.strip().replace("/", "-").replace(".", "-")
    
    # Try different date formats
    formats = [
        "%d-%m-%Y",
        "%m-%d-%Y",
        "%Y-%m-%d",
        "%d-%m-%y",
        "%m-%d-%y"
    ]
    
    # Splitting numbers to see if it's clearly DD-MM-YYYY or MM-DD-YYYY
    parts = date_str.split("-")
    if len(parts) == 3:
        try:
            p1, p2, p3 = int(parts[0]), int(parts[1]), int(parts[2])
            # If first part is > 12, it must be day, so DD-MM-YYYY
            if p1 > 12:
                # Prioritize DD-MM-YYYY
                formats = ["%d-%m-%Y", "%d-%m-%y"] + formats
            # If second part is > 12, it must be day, so MM-DD-YYYY
            elif p2 > 12:
                # Prioritize MM-DD-YYYY
                formats = ["%m-%d-%Y", "%m-%d-%y"] + formats
        except ValueError:
            pass
 
    for fmt in formats:
        try:
            dt = datetime.datetime.strptime(date_str, fmt)
            return dt.date()
        except ValueError:
            continue
            
    logger.warning(f"Failed to parse date string: {date_str}")
    return None

def run_in_background(target_func, on_success=None, on_error=None, args=(), kwargs=None):
    """
    Helper function to run long-running functions in background threads
    to keep Tkinter UI responsive. Safely dispatches success/error callbacks 
    on the Tkinter main thread via root.after() to prevent GUI locks and freezes.
    """
    if kwargs is None:
        kwargs = {}
        
    # Safely retrieve the default Tkinter root window
    root = getattr(tk, "_default_root", None)
        
    def thread_target():
        try:
            result = target_func(*args, **kwargs)
            if on_success:
                if root:
                    # Enqueue callback to run on the Tkinter main thread
                    root.after(0, lambda: on_success(result))
                else:
                    on_success(result)
        except Exception as e:
            logger.exception("Error in background thread task")
            if on_error:
                if root:
                    # Enqueue error callback to run on the Tkinter main thread
                    root.after(0, lambda: on_error(e))
                else:
                    on_error(e)
                
    t = threading.Thread(target=thread_target, daemon=True)
    t.start()
    return t

import base64
def encrypt_data(data, key="mft_key_2026"):
    """Encrypts text using a basic XOR cipher base64-encoded."""
    encrypted = "".join(chr(ord(c) ^ ord(key[i % len(key)])) for i, c in enumerate(data))
    return base64.b64encode(encrypted.encode('utf-8')).decode('utf-8')

def decrypt_data(encrypted_data, key="mft_key_2026"):
    """Decrypts base64 XOR encrypted text."""
    try:
        decoded = base64.b64decode(encrypted_data.encode('utf-8')).decode('utf-8')
        decrypted = "".join(chr(ord(c) ^ ord(key[i % len(key)])) for i, c in enumerate(decoded))
        return decrypted
    except Exception:
        return None
