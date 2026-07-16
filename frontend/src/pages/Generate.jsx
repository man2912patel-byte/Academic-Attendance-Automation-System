import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { parseCSVMetadata, compileAttendancePreview } from '../utils/attendanceProcessor';

export default function Generate() {
  const { user } = useContext(AuthContext);

  const [dates, setDates] = useState([]);
  const [dateSessions, setDateSessions] = useState({});
  const [mftStudents, setMftStudents] = useState([]);
  const [marqueeStudents, setMarqueeStudents] = useState([]);
  const [dateMap, setDateMap] = useState({});

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  
  const [syncLoading, setSyncLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [exportExcelLoading, setExportExcelLoading] = useState(false);
  const [exportPdfLoading, setExportPdfLoading] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);

  // Fetch data source automatically on mount
  useEffect(() => {
    if (user) {
      handleLoadDataSource();
    }
  }, [user]);

  // Fetch CSVs from Google Sheets automatically
  const handleLoadDataSource = async () => {
    setError('');
    setSuccess('');
    setSyncLoading(true);

    try {
      // 1. Load configuration URLs from settings API
      const settingsRes = await apiClient.get('/settings');
      const studentUrl = settingsRes.data.student_excel_path;
      const attendanceUrl = settingsRes.data.attendance_excel_path;

      if (!studentUrl || !attendanceUrl) {
        throw new Error("Google Sheets CSV export URLs are not configured. Please set them in Settings.");
      }

      // 2. Fetch sheet CSV data in browser
      const [studentText, attendanceText] = await Promise.all([
        fetch(studentUrl).then(res => {
          if (!res.ok) throw new Error("Failed to download Student List CSV.");
          return res.text();
        }),
        fetch(attendanceUrl).then(res => {
          if (!res.ok) throw new Error("Failed to download Attendance Sheet CSV.");
          return res.text();
        })
      ]);

      // Log the downloaded CSV data in the browser console
      console.log("Student List CSV Data:\n", studentText);
      console.log("Attendance Logs CSV Data:\n", attendanceText);

      // 3. Parse metadata
      const metadata = parseCSVMetadata(studentText, attendanceText);

      // Update state
      setDates(metadata.dates);
      setDateSessions(metadata.dateSessions);
      setMftStudents(metadata.mftStudents);
      setMarqueeStudents(metadata.marqueeStudents);
      setDateMap(metadata.dateMap);

      if (metadata.dates.length > 0) {
        setSelectedDate(metadata.dates[0]);
        const initialSess = metadata.dateSessions[metadata.dates[0]];
        setSelectedSession(initialSess ? initialSess[0] : '');
      }

      setSuccess('Google Sheets CSV data downloaded and synchronized successfully.');
    } catch (err) {
      setError(err.message || 'Failed to download and parse Google Sheets CSV data.');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleDateChange = (dateVal) => {
    setSelectedDate(dateVal);
    const sessions = dateSessions[dateVal] || [];
    setSelectedSession(sessions.length > 0 ? sessions[0] : '');
  };

  const handleProcessPreview = async (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedSession) {
      setError('Please select a date and session first.');
      return;
    }
    
    setError('');
    setSuccess('');
    setRecords([]);
    setSummary(null);
    setPreviewLoading(true);
    
    try {
      // 1. Process matches using Javascript CSV engine
      const { records: localRecords, summary: localSummary } = compileAttendancePreview(
        mftStudents,
        marqueeStudents,
        dateMap,
        selectedDate,
        selectedSession
      );
      
      setRecords(localRecords);
      setSummary(localSummary);
      
      // 2. Save result run in SQLite
      await apiClient.post('/attendance/save-run', {
        date: selectedDate,
        records: localRecords,
        summary: localSummary
      });
      
      setSuccess('Attendance preview compiled and saved to local history database successfully.');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to compile attendance preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const downloadFile = (res, filename, mimeType) => {
    const blob = new Blob([res.data], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExportExcel = async () => {
    if (records.length === 0) return;
    setExportExcelLoading(true);
    try {
      const res = await apiClient.post('/attendance/export-excel', {
        date: selectedDate,
        records
      }, { responseType: 'blob' });
      downloadFile(res, `Academic_Attendance_${selectedDate}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } catch (err) {
      setError('Excel generation failed.');
    } finally {
      setExportExcelLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (records.length === 0) return;
    setExportPdfLoading(true);
    try {
      const res = await apiClient.post('/attendance/export-pdf', {
        date: selectedDate,
        records
      }, { responseType: 'blob' });
      downloadFile(res, `Academic_Attendance_${selectedDate}.pdf`, 'application/pdf');
    } catch (err) {
      setError('PDF generation failed.');
    } finally {
      setExportPdfLoading(false);
    }
  };

  return (
    <div className="flex-grow bg-bg-main text-text-primary p-6 md:p-12 relative overflow-hidden flex flex-col min-h-0 animate-fade-in">
      <div className="max-w-6xl mx-auto w-full relative z-10 space-y-8 flex flex-col flex-grow min-h-0 animate-slide-up">
        
        {/* Header Options */}
        <header className="border-b border-border-main pb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4 flex-shrink-0">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
              Generate Attendance
            </h1>
            <p className="text-text-secondary mt-1 text-sm">Compile sheet rosters, match students, and export daily reports offline</p>
          </div>
          <button
            type="button"
            disabled={syncLoading}
            onClick={handleLoadDataSource}
            className="btn-base btn-primary px-6 h-[42px] cursor-pointer"
          >
            {syncLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            )}
            <span>Load Data Source</span>
          </button>
        </header>

        {/* Action Form selectors */}
        <section className="card-premium p-6 shadow-sm flex-shrink-0">
          <form onSubmit={handleProcessPreview} className="flex flex-col sm:flex-row items-end gap-6">
            
            <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <div className="space-y-2">
                <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider" htmlFor="select-date">
                  Select Class Date
                </label>
                <select
                  id="select-date"
                  disabled={dates.length === 0}
                  className="w-full input-premium bg-white cursor-pointer disabled:opacity-50"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                >
                  {dates.length === 0 ? (
                    <option>No Excel files uploaded.</option>
                  ) : (
                    dates.map((d, i) => (
                      <option key={i} value={d} className="bg-white">
                        {d}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider" htmlFor="select-session">
                  Select Session/Column
                </label>
                <select
                  id="select-session"
                  disabled={dates.length === 0}
                  className="w-full input-premium bg-white cursor-pointer disabled:opacity-50"
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                >
                  {dates.length === 0 ? (
                    <option>No Excel files uploaded.</option>
                  ) : (
                    (dateSessions[selectedDate] || []).map((s, i) => (
                      <option key={i} value={s} className="bg-white">
                        {s}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={previewLoading || dates.length === 0}
              className="btn-base btn-primary w-full sm:w-auto h-[42px] cursor-pointer"
            >
              {previewLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                'Process Preview'
              )}
            </button>

          </form>
        </section>

        {/* Global Warnings/Errors */}
        {dates.length === 0 && (
          <div className="p-4 bg-btn-warning/10 border border-btn-warning/20 rounded-xl text-amber-800 text-sm flex-shrink-0 animate-fade-in flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-btn-warning">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <span>No Google Sheets data loaded. Click "Load Data Source" above to synchronize.</span>
          </div>
        )}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex-shrink-0 animate-fade-in">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex-shrink-0 animate-fade-in">
            {success}
          </div>
        )}

        {/* Summary stats + Table layout */}
        {summary && (
          <div className="flex-grow flex flex-col gap-6 min-h-0 animate-fade-in">
            
            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 flex-shrink-0">
              <div className="card-premium p-5 text-center bg-white">
                <span className="text-text-secondary text-xs font-bold uppercase tracking-wider">Total Students</span>
                <p className="text-3xl font-extrabold mt-2 text-text-primary">{summary.total}</p>
              </div>
              <div className="card-premium p-5 text-center bg-white">
                <span className="text-btn-present text-xs font-bold uppercase tracking-wider">Present</span>
                <p className="text-3xl font-extrabold mt-2 text-btn-present">{summary.present}</p>
              </div>
              <div className="card-premium p-5 text-center bg-white">
                <span className="text-btn-absent text-xs font-bold uppercase tracking-wider">Absent</span>
                <p className="text-3xl font-extrabold mt-2 text-btn-absent">{summary.absent}</p>
              </div>
              <div className="card-premium p-5 text-center bg-white">
                <span className="text-accent-blue text-xs font-bold uppercase tracking-wider">Present Rate</span>
                <p className="text-3xl font-extrabold mt-2 text-accent-blue">{summary.rate}%</p>
              </div>
            </div>

            {/* Preview Table Header & Data */}
            <div className="flex-grow card-premium p-6 shadow-sm flex flex-col min-h-0 bg-white">
              <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h3 className="text-base font-bold text-text-primary">Attendance Matches</h3>
                
                {/* Export Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleExportExcel}
                    disabled={exportExcelLoading}
                    className="btn-base btn-present h-[36px] px-4 cursor-pointer text-xs"
                  >
                    {exportExcelLoading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                    <span>Excel</span>
                  </button>
                  <button
                    onClick={handleExportPdf}
                    disabled={exportPdfLoading}
                    className="btn-base btn-info h-[36px] px-4 cursor-pointer text-xs"
                  >
                    {exportPdfLoading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                    <span>PDF</span>
                  </button>
                </div>
              </div>

              {/* Responsive Roster Table Scroll Area */}
              <div className="flex-grow overflow-y-auto table-container-premium">
                <table className="table-premium relative">
                  <thead>
                    <tr>
                      <th className="px-6 py-4">Roll No</th>
                      <th className="px-6 py-4">Enrollment No</th>
                      <th className="px-6 py-4">Student Name</th>
                      <th className="px-6 py-4 text-center">Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 text-text-primary font-medium">{r.roll_number}</td>
                        <td className="px-6 py-4">{r.enrollment_number}</td>
                        <td className="px-6 py-4">{r.student_name}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            r.attendance === 'Present' 
                              ? 'bg-btn-present/10 text-btn-present border border-btn-present/20' 
                              : 'bg-btn-absent/10 text-btn-absent border border-btn-absent/20'
                          }`}>
                            {r.attendance}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
