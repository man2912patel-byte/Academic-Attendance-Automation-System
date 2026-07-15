import os
import logging
import datetime
from pathlib import Path

logger = logging.getLogger("backend_attendance")

def get_date_candidates(s):
    if not s or not isinstance(s, str):
        return []
        
    s = s.strip()
    s_norm = s.replace("/", "-").replace(".", "-").replace(" ", "-")
    
    fmts = [
        "%d-%m-%Y", "%m-%d-%Y", "%Y-%m-%d",
        "%d-%b-%Y", "%b-%d-%Y",
        "%d-%B-%Y", "%B-%d-%Y",
        "%d-%m-%y", "%m-%d-%y", "%y-%m-%d",
        "%d-%b-%y", "%b-%d-%y",
    ]
    
    candidates = []
    for fmt in fmts:
        try:
            dt = datetime.datetime.strptime(s_norm, fmt)
            if 2000 <= dt.year <= 2100:
                d = dt.date()
                if d not in candidates:
                    candidates.append(d)
        except ValueError:
            pass

    for fmt in fmts:
        try:
            dt = datetime.datetime.strptime(s, fmt)
            if 2000 <= dt.year <= 2100:
                d = dt.date()
                if d not in candidates:
                    candidates.append(d)
        except ValueError:
            pass

    return candidates

def resolve_date_sequence(raw_date_strings):
    if not raw_date_strings:
        return []

    candidates_list = []
    for s in raw_date_strings:
        cands = get_date_candidates(s)
        if not cands:
            cands = [datetime.date.today()]
        candidates_list.append(cands)

    n = len(candidates_list)
    valid_sequences = []

    def backtrack(idx, current_seq):
        if len(valid_sequences) >= 1000:
            return
            
        if idx == n:
            valid_sequences.append(list(current_seq))
            return
        
        last_date = current_seq[-1] if current_seq else None
        
        for cand in sorted(candidates_list[idx]):
            if last_date is None or cand >= last_date:
                current_seq.append(cand)
                backtrack(idx + 1, current_seq)
                current_seq.pop()

    backtrack(0, [])
    
    if not valid_sequences:
        return [cands[0] for cands in candidates_list]

    best_seq = valid_sequences[0]
    min_span = None

    for seq in valid_sequences:
        span = (seq[-1] - seq[0]).days
        if min_span is None or span < min_span:
            min_span = span
            best_seq = seq

    return best_seq

def parse_sheets_data(mft_raw, marquee_raw):
    # 1. Parse MFT List
    if not mft_raw or len(mft_raw) < 1:
        raise ValueError("MFT Student list is empty.")
        
    email_key = None
    roll_key = None
    
    for k in mft_raw[0].keys():
        k_low = k.strip().lower()
        if "email" in k_low or "mail" in k_low:
            email_key = k
        elif "rhn" in k_low or "roll" in k_low or "id" in k_low:
            roll_key = k

    if not email_key and mft_raw[0]:
        email_key = list(mft_raw[0].keys())[min(1, len(mft_raw[0])-1)]
    if not roll_key and mft_raw[0]:
        roll_key = list(mft_raw[0].keys())[0]

    mft_students = []
    for row in mft_raw:
        email = str(row.get(email_key, "")).strip()
        roll = str(row.get(roll_key, "")).strip()
        
        enrollment = ""
        if email and "@" in email:
            username = email.split("@")[0]
            if username.isdigit():
                enrollment = username
        
        mft_students.append({
            "raw_email": email,
            "roll_no": roll,
            "extracted_enrollment": enrollment
        })

    # 2. Parse Marquee Sheet
    if not marquee_raw or len(marquee_raw) < 2:
        raise ValueError("Marquee attendance must have at least 2 header rows.")

    row_0 = [str(cell).strip() for cell in marquee_raw[0]]
    row_1 = [str(cell).strip() for cell in marquee_raw[1]]
    data_rows = marquee_raw[2:]

    enroll_col_idx = None
    name_col_idx = None
    email_col_idx = None
    
    for idx, col_name in enumerate(row_0):
        col_name_low = col_name.lower()
        if "enrollment" in col_name_low or "enroll" in col_name_low:
            enroll_col_idx = idx
        elif "name" in col_name_low or "student" in col_name_low:
            name_col_idx = idx
        elif "mail" in col_name_low or "email" in col_name_low:
            email_col_idx = idx

    if enroll_col_idx is None:
        enroll_col_idx = 6
    if name_col_idx is None:
        name_col_idx = 7
    if email_col_idx is None:
        email_col_idx = 14

    raw_headers_list = []
    last_raw_date = ""

    for idx in range(min(len(row_0), len(row_1))):
        if idx < 15:
            continue
            
        cell_0 = row_0[idx].strip()
        cell_1 = row_1[idx].strip()
        
        if cell_0:
            if get_date_candidates(cell_0):
                last_raw_date = cell_0
            else:
                last_raw_date = ""
        
        if last_raw_date:
            raw_headers_list.append((idx, last_raw_date, cell_1))

    raw_date_strings = [item[1] for item in raw_headers_list]
    resolved_dates = resolve_date_sequence(raw_date_strings)

    date_map = {}
    for i, (col_idx, _, session_name) in enumerate(raw_headers_list):
        if i < len(resolved_dates):
            date_obj = resolved_dates[i]
            session_name = session_name if session_name else f"Session {col_idx}"
            if date_obj not in date_map:
                date_map[date_obj] = []
            date_map[date_obj].append((col_idx, session_name))

    marquee_students = []
    for r_idx, row in enumerate(data_rows):
        if len(row) <= max(enroll_col_idx, name_col_idx, email_col_idx):
            continue
            
        enroll = str(row[enroll_col_idx]).strip()
        name = str(row[name_col_idx]).strip()
        email = str(row[email_col_idx]).strip()
        
        if not enroll and not name:
            continue
            
        marquee_students.append({
            "row_idx": r_idx,
            "enrollment": enroll,
            "name": name,
            "email": email,
            "raw_row": row
        })

    return mft_students, marquee_students, date_map

def match_students(mft_students, marquee_students):
    matched_records = []
    mismatched_mft = []

    marquee_by_enroll = {}
    marquee_by_email = {}
    marquee_by_name = {}

    for m_student in marquee_students:
        enroll_clean = m_student["enrollment"].replace(" ", "").strip()
        email_clean = m_student["email"].lower().strip()
        name_clean = m_student["name"].lower().strip()

        if enroll_clean:
            marquee_by_enroll[enroll_clean] = m_student
        if email_clean:
            marquee_by_email[email_clean] = m_student
        if name_clean:
            marquee_by_name[name_clean] = m_student

    for mft in mft_students:
        mft_enroll = mft["extracted_enrollment"].strip()
        mft_roll = mft["roll_no"].strip()
        mft_email = mft["raw_email"].lower().strip()

        matched_marquee = None

        if mft_enroll and mft_enroll in marquee_by_enroll:
            matched_marquee = marquee_by_enroll[mft_enroll]
        elif mft_roll and mft_roll in marquee_by_enroll:
            matched_marquee = marquee_by_enroll[mft_roll]

        if not matched_marquee and mft_email:
            if mft_email in marquee_by_email:
                matched_marquee = marquee_by_email[mft_email]

        if not matched_marquee:
            roll_digits = "".join(filter(str.isdigit, mft_roll))
            if roll_digits and len(roll_digits) >= 4:
                for enroll_key, m_student in marquee_by_enroll.items():
                    if enroll_key.endswith(roll_digits):
                        matched_marquee = m_student
                        break
        
        if matched_marquee:
            matched_records.append({
                "mft_student": mft,
                "marquee_student": matched_marquee
            })
        else:
            mismatched_mft.append(mft)

    return matched_records, mismatched_mft

def compute_attendance(matched_records, mismatched_mft, date_obj, session_cols, mode="Combined (Any)"):
    results = []
    
    if not session_cols:
        raise ValueError(f"No session columns found for date {date_obj}")

    for record in matched_records:
        mft = record["mft_student"]
        marquee = record["marquee_student"]
        raw_row = marquee["raw_row"]

        statuses = []
        for col_idx, sess_name in session_cols:
            if col_idx < len(raw_row):
                val = str(raw_row[col_idx]).strip().lower()
                statuses.append((sess_name, val))
            else:
                statuses.append((sess_name, "absent"))

        final_status = "Absent"
        if mode == "Combined (Any)":
            is_present = any("present" in s[1] for s in statuses)
            final_status = "Present" if is_present else "Absent"
        elif mode == "Combined (All)":
            is_present = all("present" in s[1] for s in statuses)
            final_status = "Present" if is_present else "Absent"
        else:
            val = "absent"
            for sess_name, s_val in statuses:
                if sess_name == mode:
                    val = s_val
                    break
            final_status = "Present" if "present" in val else "Absent"

        results.append({
            "roll_number": mft["roll_no"],
            "enrollment_number": marquee["enrollment"],
            "student_name": marquee["name"],
            "attendance": final_status
        })

    for mft in mismatched_mft:
        results.append({
            "roll_number": mft["roll_no"],
            "enrollment_number": mft["extracted_enrollment"] or "N/A",
            "student_name": "Unknown Student (New/Not Synced)",
            "attendance": "Absent"
        })

    return results

import openpyxl

def load_student_list_excel(file_path):
    if not file_path or not os.path.exists(file_path):
        raise FileNotFoundError(f"Student list Excel file not found or path is empty: {file_path}")
    wb = openpyxl.load_workbook(file_path, data_only=True)
    sheet = wb.active
    rows = list(sheet.rows)
    if len(rows) < 1:
        return []
    headers = [cell.value for cell in rows[0]]
    mft_raw = []
    for row in rows[1:]:
        row_dict = {}
        for col_idx, cell in enumerate(row):
            if col_idx < len(headers):
                header = headers[col_idx]
                if header is not None:
                    row_dict[str(header)] = cell.value
        if row_dict:
            mft_raw.append(row_dict)
    return mft_raw

def load_attendance_logs_excel(file_path):
    if not file_path or not os.path.exists(file_path):
        raise FileNotFoundError(f"Attendance logs Excel file not found or path is empty: {file_path}")
    wb = openpyxl.load_workbook(file_path, data_only=True)
    sheet = wb.active
    marquee_raw = []
    for row in sheet.rows:
        marquee_raw.append([cell.value for cell in row])
    return marquee_raw

