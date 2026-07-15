// Robust CSV parser following RFC 4180
export function parseCSV(text) {
  const lines = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"';
          i++; // Skip double quote escape
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(cell);
        cell = '';
      } else if (char === '\n' || char === '\r') {
        row.push(cell);
        if (row.length > 0 && row.some(c => c !== '')) {
          lines.push(row);
        }
        row = [];
        cell = '';
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n after \r
        }
      } else {
        cell += char;
      }
    }
  }
  if (cell || row.length > 0) {
    row.push(cell);
    lines.push(row);
  }
  return lines;
}

// Clean and normalize date string parses
export function interpretDateString(s) {
  if (!s) return [];
  const sNorm = s.trim().replace(/\//g, "-").replace(/\./g, "-").replace(/ /g, "-");
  
  // Format: YYYY-MM-DD
  const ymdMatch = sNorm.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1]);
    const m = parseInt(ymdMatch[2]);
    const d = parseInt(ymdMatch[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return [`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`];
    }
  }

  // Format: DD-MM-YYYY or MM-DD-YYYY
  const dmyMatch = sNorm.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1]);
    const p2 = parseInt(dmyMatch[2]);
    const y = parseInt(dmyMatch[3]);

    const results = [];
    
    // Case 1: MM-DD-YYYY
    if (p1 >= 1 && p1 <= 12 && p2 >= 1 && p2 <= 31) {
      results.push(`${y}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`);
    }
    
    // Case 2: DD-MM-YYYY
    if (p1 >= 1 && p1 <= 31 && p2 >= 1 && p2 <= 12) {
      const formatted = `${y}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
      if (!results.includes(formatted)) {
        results.push(formatted);
      }
    }
    
    return results;
  }

  // Standard JS parser
  try {
    const dt = new Date(sNorm);
    if (!isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const m = dt.getMonth() + 1;
      const d = dt.getDate();
      if (y >= 2000 && y <= 2100) {
        return [`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`];
      }
    }
  } catch (e) {}

  return [];
}

// Greedy chronological date sequence resolver
function resolveChronologicalDates(rawHeadersList) {
  let lastDate = null;
  const resolved = [];

  for (const item of rawHeadersList) {
    const candidates = interpretDateString(item.rawDate);
    if (candidates.length === 0) {
      resolved.push(null);
      continue;
    }

    if (lastDate === null) {
      const chosen = candidates[0];
      resolved.push(chosen);
      lastDate = chosen;
    } else {
      const validCandidates = candidates.filter(c => c >= lastDate);
      if (validCandidates.length > 0) {
        let best = validCandidates[0];
        let minDiff = null;
        for (const cand of validCandidates) {
          const diff = new Date(cand) - new Date(lastDate);
          if (minDiff === null || diff < minDiff) {
            minDiff = diff;
            best = cand;
          }
        }
        resolved.push(best);
        lastDate = best;
      } else {
        const chosen = candidates[0];
        resolved.push(chosen);
        lastDate = chosen;
      }
    }
  }
  return resolved;
}

export function parseCSVMetadata(studentCSV, attendanceCSV) {
  // 1. Parse Student List CSV
  const studentRows = parseCSV(studentCSV);
  if (studentRows.length === 0) {
    throw new Error("Student List CSV is empty.");
  }

  const headers = studentRows[0].map(h => String(h).trim());
  let emailKeyIdx = null;
  let rollKeyIdx = null;

  headers.forEach((h, idx) => {
    const hLow = h.toLowerCase();
    if (hLow.includes("email") || hLow.includes("mail")) {
      emailKeyIdx = idx;
    } else if (hLow.includes("rhn") || hLow.includes("roll") || hLow.includes("id")) {
      rollKeyIdx = idx;
    }
  });

  if (emailKeyIdx === null && headers.length > 0) emailKeyIdx = Math.min(1, headers.length - 1);
  if (rollKeyIdx === null && headers.length > 0) rollKeyIdx = 0;

  const mftStudents = studentRows.slice(1).map(row => {
    const email = emailKeyIdx !== null ? String(row[emailKeyIdx] || "").trim() : "";
    const roll = rollKeyIdx !== null ? String(row[rollKeyIdx] || "").trim() : "";
    
    let enrollment = "";
    if (email && email.includes("@")) {
      const uname = email.split("@")[0];
      if (/^\d+$/.test(uname)) {
        enrollment = uname;
      }
    }
    return {
      raw_email: email,
      roll_no: roll,
      extracted_enrollment: enrollment
    };
  }).filter(s => s.raw_email || s.roll_no); // Ignore blank rows

  // 2. Parse Attendance Log CSV
  const marqueeRaw = parseCSV(attendanceCSV);
  if (marqueeRaw.length < 1) {
    throw new Error("Attendance log CSV is empty.");
  }

  let row0 = (marqueeRaw[0] || []).map(cell => String(cell === null || cell === undefined ? "" : cell).trim());
  let row1 = marqueeRaw.length > 1 
    ? (marqueeRaw[1] || []).map(cell => String(cell === null || cell === undefined ? "" : cell).trim()) 
    : [];
  let dataRows = marqueeRaw.slice(2);

  // Auto-detect Student Info columns
  let enrollColIdx = null;
  let nameColIdx = null;
  let emailColIdx = null;

  for (let i = 0; i < row0.length; i++) {
    const colNameLow = row0[i].toLowerCase();
    if (colNameLow.includes("enrollment") || colNameLow.includes("enroll")) {
      enrollColIdx = i;
    } else if (colNameLow.includes("name") || colNameLow.includes("student")) {
      nameColIdx = i;
    } else if (colNameLow.includes("mail") || colNameLow.includes("email")) {
      emailColIdx = i;
    }
  }

  if (enrollColIdx === null) enrollColIdx = 6;
  if (nameColIdx === null) nameColIdx = 7;
  if (emailColIdx === null) emailColIdx = 14;

  // Auto-detect transactional vs. cross-tab date columns
  let transactionalDateColIdx = -1;
  for (let i = 0; i < row0.length; i++) {
    const colNameLow = row0[i].toLowerCase();
    if ((colNameLow === "date" || colNameLow === "attendance date" || colNameLow === "class date" || colNameLow === "attendance_date" || colNameLow === "class_date") && !colNameLow.includes("birth") && !colNameLow.includes("dob")) {
      transactionalDateColIdx = i;
      break;
    }
  }

  // Pivot transactional structure to cross-tab if detected
  if (transactionalDateColIdx !== -1) {
    let transactionalSessionColIdx = -1;
    let transactionalStatusColIdx = -1;
    for (let i = 0; i < row0.length; i++) {
      const colNameLow = row0[i].toLowerCase();
      if (colNameLow.includes("session") || colNameLow.includes("column") || colNameLow.includes("period")) {
        transactionalSessionColIdx = i;
      } else if (colNameLow.includes("status") || colNameLow.includes("attendance") || colNameLow.includes("present") || colNameLow.includes("mark")) {
        transactionalStatusColIdx = i;
      }
    }

    const studentsMap = {};
    const uniqueDates = new Set();
    const uniqueSessions = new Set();

    const rawRows = marqueeRaw.slice(1);
    rawRows.forEach(row => {
      if (row.length <= Math.max(enrollColIdx, nameColIdx, emailColIdx)) return;
      const enroll = String(row[enrollColIdx] || "").trim();
      const name = String(row[nameColIdx] || "").trim();
      const email = String(row[emailColIdx] || "").trim();
      const rawDate = String(row[transactionalDateColIdx] || "").trim();
      
      const resolvedDateCands = interpretDateString(rawDate);
      if (resolvedDateCands.length === 0) return;
      const dateVal = resolvedDateCands[0];

      const sessionVal = transactionalSessionColIdx !== -1 && row[transactionalSessionColIdx]
        ? String(row[transactionalSessionColIdx]).trim()
        : "Session 01";

      const statusVal = transactionalStatusColIdx !== -1 && row[transactionalStatusColIdx]
        ? String(row[transactionalStatusColIdx]).trim()
        : "Present";

      if (!enroll && !name) return;

      const studentKey = enroll || email || name;
      if (!studentsMap[studentKey]) {
        studentsMap[studentKey] = {
          enrollment: enroll,
          name,
          email,
          attendance: {}
        };
      }
      studentsMap[studentKey].attendance[`${dateVal}|${sessionVal}`] = statusVal;
      uniqueDates.add(dateVal);
      uniqueSessions.add(sessionVal);
    });

    const datesList = Array.from(uniqueDates).sort();
    const sessionsList = Array.from(uniqueSessions).sort();

    const pivotedRow0 = [...row0.slice(0, 15)];
    const pivotedRow1 = [...row1.slice(0, 15)];
    while (pivotedRow0.length < 15) pivotedRow0.push("");
    while (pivotedRow1.length < 15) pivotedRow1.push("");

    const colMapping = [];
    let colIdx = 15;
    datesList.forEach(d => {
      sessionsList.forEach(s => {
        pivotedRow0.push(d);
        pivotedRow1.push(s);
        colMapping.push({ date: d, session: s, colIdx });
        colIdx++;
      });
    });

    const pivotedDataRows = Object.values(studentsMap).map(student => {
      const row = new Array(colIdx).fill("");
      row[enrollColIdx] = student.enrollment;
      row[nameColIdx] = student.name;
      row[emailColIdx] = student.email;
      colMapping.forEach(mapItem => {
        row[mapItem.colIdx] = student.attendance[`${mapItem.date}|${mapItem.session}`] || "Absent";
      });
      return row;
    });

    row0 = pivotedRow0;
    row1 = pivotedRow1;
    dataRows = pivotedDataRows;
  }

  // Cross-tab parsing
  const rawHeadersList = [];
  let lastRawDate = "";

  for (let idx = 0; idx < Math.min(row0.length, row1.length); idx++) {
    if (idx < 15) continue;
    const cell0 = row0[idx].trim();
    const cell1 = row1[idx].trim();

    if (cell0) {
      const cands = interpretDateString(cell0);
      if (cands.length > 0) {
        lastRawDate = cell0;
      } else {
        lastRawDate = "";
      }
    }

    if (lastRawDate) {
      rawHeadersList.push({ colIdx: idx, rawDate: lastRawDate, sessionName: cell1 });
    }
  }

  const resolvedDates = resolveChronologicalDates(rawHeadersList);

  const dateMap = {};
  rawHeadersList.forEach((item, index) => {
    if (index < resolvedDates.length) {
      const dateObj = resolvedDates[index];
      if (dateObj) {
        const sessionName = item.sessionName ? item.sessionName : `Session ${item.colIdx}`;
        if (!dateMap[dateObj]) {
          dateMap[dateObj] = [];
        }
        dateMap[dateObj].push({ colIdx: item.colIdx, sessionName });
      }
    }
  });

  const marqueeStudents = [];
  dataRows.forEach((row, rIdx) => {
    if (row.length <= Math.max(enrollColIdx, nameColIdx, emailColIdx)) return;
    
    const enroll = String(row[enrollColIdx] === null || row[enrollColIdx] === undefined ? "" : row[enrollColIdx]).trim();
    const name = String(row[nameColIdx] === null || row[nameColIdx] === undefined ? "" : row[nameColIdx]).trim();
    const email = String(row[emailColIdx] === null || row[emailColIdx] === undefined ? "" : row[emailColIdx]).trim();

    if (!enroll && !name) return; // Ignore blank rows

    marqueeStudents.push({
      row_idx: rIdx,
      enrollment: enroll,
      name,
      email,
      raw_row: row
    });
  });

  const dates = Object.keys(dateMap).sort((a, b) => b.localeCompare(a));
  const dateSessions = {};
  dates.forEach(d => {
    const sessions = dateMap[d].map(item => item.sessionName);
    dateSessions[d] = ["Combined (Any)", "Combined (All)"].concat(sessions);
  });

  // Print required debugging logs
  console.log("=== CSV Parsing Debug Logs ===");
  console.log("CSV downloaded successfully");
  console.log("Number of rows loaded in Student List:", studentRows.length);
  console.log("Number of rows loaded in Attendance Logs:", marqueeRaw.length);
  console.log("Detected column names (Student):", headers);
  console.log("Detected column names (Attendance):", row0.slice(0, 15));
  
  if (transactionalDateColIdx !== -1) {
    console.log("Detected date column: Transactional column named '" + row0[transactionalDateColIdx] + "' at index " + transactionalDateColIdx);
  } else {
    console.log("Detected date column: Cross-tab date columns starting from index 15");
  }
  
  console.log("Available dates:", dates);
  console.log("Available session columns:", dateSessions);
  console.log("===============================");

  return {
    dates,
    dateSessions,
    mftStudents,
    marqueeStudents,
    dateMap
  };
}

export function compileAttendancePreview(mftStudents, marqueeStudents, dateMap, selectedDate, selectedSession) {
  const marqueeByEnroll = {};
  const marqueeByEmail = {};
  const marqueeByName = {};

  marqueeStudents.forEach(m => {
    const enrollClean = m.enrollment.replace(/ /g, "").trim();
    const emailClean = m.email.toLowerCase().trim();
    const nameClean = m.name.toLowerCase().trim();

    if (enrollClean) marqueeByEnroll[enrollClean] = m;
    if (emailClean) marqueeByEmail[emailClean] = m;
    if (nameClean) marqueeByName[nameClean] = m;
  });

  const matchedRecords = [];
  const mismatchedMft = [];

  mftStudents.forEach(mft => {
    const mftEnroll = mft.extracted_enrollment.trim();
    const mftRoll = mft.roll_no.trim();
    const mftEmail = mft.raw_email.toLowerCase().trim();

    let matchedMarquee = null;

    if (mftEnroll && marqueeByEnroll[mftEnroll]) {
      matchedMarquee = marqueeByEnroll[mftEnroll];
    } else if (mftRoll && marqueeByEnroll[mftRoll]) {
      matchedMarquee = marqueeByEnroll[mftRoll];
    }

    if (!matchedMarquee && mftEmail) {
      if (marqueeByEmail[mftEmail]) {
        matchedMarquee = marqueeByEmail[mftEmail];
      }
    }

    if (!matchedMarquee) {
      const rollDigits = mftRoll.replace(/\D/g, "");
      if (rollDigits && rollDigits.length >= 4) {
        const keys = Object.keys(marqueeByEnroll);
        for (const enrollKey of keys) {
          if (enrollKey.endsWith(rollDigits)) {
            matchedMarquee = marqueeByEnroll[enrollKey];
            break;
          }
        }
      }
    }

    if (matchedMarquee) {
      matchedRecords.push({ mft_student: mft, marquee_student: matchedMarquee });
    } else {
      mismatchedMft.push(mft);
    }
  });

  const allSessions = dateMap[selectedDate] || [];
  let sessionCols = [];

  if (selectedSession === "Combined (Any)" || selectedSession === "Combined (All)") {
    sessionCols = allSessions;
  } else {
    sessionCols = allSessions.filter(s => s.sessionName === selectedSession);
  }

  const records = [];

  matchedRecords.forEach(record => {
    const mft = record.mft_student;
    const marquee = record.marquee_student;
    const rawRow = marquee.raw_row;

    const statuses = sessionCols.map(col => {
      if (col.colIdx < rawRow.length) {
        const val = String(rawRow[col.colIdx] === null || rawRow[col.colIdx] === undefined ? "" : rawRow[col.colIdx]).trim().toLowerCase();
        return { session: col.sessionName, status: val };
      }
      return { session: col.sessionName, status: "absent" };
    });

    let finalStatus = "Absent";
    if (selectedSession === "Combined (Any)") {
      const isPresent = statuses.some(s => s.status.includes("present"));
      finalStatus = isPresent ? "Present" : "Absent";
    } else if (selectedSession === "Combined (All)") {
      const isPresent = statuses.every(s => s.status.includes("present"));
      finalStatus = isPresent ? "Present" : "Absent";
    } else {
      const targetVal = statuses[0]?.status || "absent";
      finalStatus = targetVal.includes("present") ? "Present" : "Absent";
    }

    records.push({
      roll_number: mft.roll_no,
      enrollment_number: marquee.enrollment,
      student_name: marquee.name,
      attendance: finalStatus
    });
  });

  mismatchedMft.forEach(mft => {
    records.push({
      roll_number: mft.roll_no,
      enrollment_number: mft.extracted_enrollment || "N/A",
      student_name: "Unknown Student (New/Not Synced)",
      attendance: "Absent"
    });
  });

  const total = records.length;
  const present = records.filter(r => r.attendance === "Present").length;
  const absent = total - present;
  const rate = total > 0 ? parseFloat(((present / total) * 100).toFixed(1)) : 0;

  return {
    records,
    summary: {
      total,
      present,
      absent,
      rate
    }
  };
}
