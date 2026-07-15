import os
import io
import csv
import logging
import urllib.request
from pathlib import Path
import gspread
from google.oauth2 import service_account

logger = logging.getLogger("google_sheet")

class GoogleSheetClient:
    def __init__(self, config):
        self.config = config
        self.client = None
        self._init_client()

    def _init_client(self):
        """Initializes the gspread client if a valid credentials file is present."""
        cred_path = Path(self.config.credentials_path)
        if cred_path.exists() and cred_path.is_file():
            try:
                scopes = [
                    'https://www.googleapis.com/auth/spreadsheets.readonly',
                    'https://www.googleapis.com/auth/drive.readonly'
                ]
                creds = service_account.Credentials.from_service_account_file(
                    str(cred_path), scopes=scopes
                )
                self.client = gspread.authorize(creds)
                logger.info("Google Sheets API client initialized successfully.")
            except Exception as e:
                logger.exception("Failed to initialize Google Sheets API client with credentials.")
                self.client = None
        else:
            logger.info("No credentials file found. Will use public URL export fallback.")
            self.client = None

    def fetch_mft_students(self):
        """
        Fetches the MFT Student List. Tries the official API first, 
        then falls back to public URL export, and finally local cache.
        """
        sheet_id = self.config.mft_sheet_id
        cache_path = Path(self.config.backup_dir) / "mft_student_cache.csv"
        
        # 1. Try Google Sheets API
        if self.client and sheet_id:
            try:
                logger.info(f"Fetching MFT Student List via API (ID: {sheet_id})...")
                sh = self.client.open_by_key(sheet_id)
                worksheet = sh.get_worksheet(0)
                records = worksheet.get_all_records()
                # Save to cache
                if records:
                    self._save_records_to_cache(records, cache_path)
                    return records
            except Exception as e:
                logger.error(f"API fetch for MFT Student List failed: {e}. Trying fallback...")

        # 2. Try Public URL Export
        if sheet_id:
            try:
                logger.info(f"Fetching MFT Student List via Public Export URL...")
                url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv"
                req = urllib.request.Request(
                    url, 
                    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
                )
                with urllib.request.urlopen(req, timeout=8) as response:
                    csv_text = response.read().decode('utf-8')
                
                # Parse CSV to records (list of dicts)
                reader = csv.DictReader(io.StringIO(csv_text))
                records = [dict(row) for row in reader]
                if records:
                    # Clean dictionary keys and values
                    cleaned_records = []
                    for rec in records:
                        cleaned = {k.strip(): str(v).strip() for k, v in rec.items() if k}
                        cleaned_records.append(cleaned)
                    
                    self._save_records_to_cache(cleaned_records, cache_path)
                    return cleaned_records
            except Exception as e:
                logger.error(f"Public URL fetch for MFT Student List failed: {e}")

        # 3. Try Local Cache
        if cache_path.exists():
            logger.info("Loading MFT Student List from local cache...")
            try:
                with open(cache_path, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    records = [dict(row) for row in reader]
                    return records
            except Exception as e:
                logger.error(f"Failed to read MFT local cache: {e}")

        raise RuntimeError("Could not retrieve MFT Student List from API, URL, or local cache.")

    def fetch_marquee_attendance(self):
        """
        Fetches the Marquee Training Student list with attendance history.
        Tries the official API first, then falls back to public URL export, 
        and finally local cache.
        """
        sheet_id = self.config.marquee_sheet_id
        cache_path = Path(self.config.backup_dir) / "marquee_attendance_cache.csv"
        
        # 1. Try Google Sheets API
        if self.client and sheet_id:
            try:
                logger.info(f"Fetching Marquee attendance via API (ID: {sheet_id})...")
                sh = self.client.open_by_key(sheet_id)
                # Check for gid 1806013456 or default sheet
                worksheet = None
                try:
                    # Find worksheet by id 1806013456
                    for ws in sh.worksheets():
                        if str(ws.id) == "1806013456":
                            worksheet = ws
                            break
                except Exception:
                    pass
                if not worksheet:
                    worksheet = sh.get_worksheet(0)
                
                raw_values = worksheet.get_all_values()
                if raw_values:
                    self._save_rows_to_cache(raw_values, cache_path)
                    return raw_values
            except Exception as e:
                logger.error(f"API fetch for Marquee attendance failed: {e}. Trying fallback...")

        # 2. Try Public URL Export
        if sheet_id:
            try:
                logger.info("Fetching Marquee attendance via Public Export URL...")
                # Export with specific GID if possible
                url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid=1806013456"
                req = urllib.request.Request(
                    url, 
                    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
                )
                with urllib.request.urlopen(req, timeout=10) as response:
                    csv_text = response.read().decode('utf-8')
                
                reader = csv.reader(io.StringIO(csv_text))
                raw_values = list(reader)
                if raw_values:
                    self._save_rows_to_cache(raw_values, cache_path)
                    return raw_values
            except Exception as e:
                logger.error(f"Public URL fetch for Marquee attendance failed: {e}")

        # 3. Try Local Cache
        if cache_path.exists():
            logger.info("Loading Marquee attendance from local cache...")
            try:
                with open(cache_path, "r", encoding="utf-8") as f:
                    reader = csv.reader(f)
                    raw_values = list(reader)
                    return raw_values
            except Exception as e:
                logger.error(f"Failed to read Marquee local cache: {e}")

        raise RuntimeError("Could not retrieve Marquee attendance data from API, URL, or local cache.")

    def _save_records_to_cache(self, records, file_path):
        """Helper to save a list of dicts to CSV cache."""
        try:
            if not records:
                return
            file_path.parent.mkdir(parents=True, exist_ok=True)
            keys = records[0].keys()
            with open(file_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=keys)
                writer.writeheader()
                writer.writerows(records)
            logger.info(f"Cached data to {file_path}")
        except Exception as e:
            logger.error(f"Failed to save cache to {file_path}: {e}")

    def _save_rows_to_cache(self, rows, file_path):
        """Helper to save a list of lists to CSV cache."""
        try:
            if not rows:
                return
            file_path.parent.mkdir(parents=True, exist_ok=True)
            with open(file_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerows(rows)
            logger.info(f"Cached rows to {file_path}")
        except Exception as e:
            logger.error(f"Failed to save rows cache to {file_path}: {e}")
