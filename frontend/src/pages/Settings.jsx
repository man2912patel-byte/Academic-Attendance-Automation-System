import React, { useState, useEffect, useContext, useRef } from 'react';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';

export default function Settings() {
  const { user } = useContext(AuthContext);
  
  // General System preferences
  const [theme, setTheme] = useState('dark');
  const [darkMode, setDarkMode] = useState(true);
  const [outputFolder, setOutputFolder] = useState('');
  const [backupFolder, setBackupFolder] = useState('');
  const [exportFormat, setExportFormat] = useState('excel');
  const [autoBackup, setAutoBackup] = useState(false);

  // Source configurations
  const [studentSourceType, setStudentSourceType] = useState('google_sheet');
  const [attendanceSourceType, setAttendanceSourceType] = useState('google_sheet');
  const [studentUrl, setStudentUrl] = useState('');
  const [attendanceUrl, setAttendanceUrl] = useState('');

  // Uploaded files details
  const [studentUploadedFile, setStudentUploadedFile] = useState('');
  const [studentMetadata, setStudentMetadata] = useState(null);
  const [studentProgress, setStudentProgress] = useState(0);
  const [studentUploadStatus, setStudentUploadStatus] = useState('idle'); // idle, uploading, success, error
  const [studentDragActive, setStudentDragActive] = useState(false);

  const [attendanceUploadedFile, setAttendanceUploadedFile] = useState('');
  const [attendanceMetadata, setAttendanceMetadata] = useState(null);
  const [attendanceProgress, setAttendanceProgress] = useState(0);
  const [attendanceUploadStatus, setAttendanceUploadStatus] = useState('idle'); // idle, uploading, success, error
  const [attendanceDragActive, setAttendanceDragActive] = useState(false);

  // Loaders & feedback
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [saveSourcesLoading, setSaveSourcesLoading] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testResult, setTestResult] = useState(null);

  const studentFileRef = useRef(null);
  const attendanceFileRef = useRef(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiClient.get('/settings');
        setTheme(res.data.theme || 'dark');
        setDarkMode(res.data.dark_mode ?? true);
        setOutputFolder(res.data.output_folder || '');
        setBackupFolder(res.data.backup_folder || '');
        setExportFormat(res.data.export_format || 'excel');
        setAutoBackup(res.data.auto_backup ?? false);

        // Load Sources
        setStudentUrl(res.data.student_excel_path || '');
        setAttendanceUrl(res.data.attendance_excel_path || '');
        setStudentSourceType(res.data.student_source_type || 'google_sheet');
        setAttendanceSourceType(res.data.attendance_source_type || 'google_sheet');
        setStudentUploadedFile(res.data.student_uploaded_file || '');
        setAttendanceUploadedFile(res.data.attendance_uploaded_file || '');

        if (res.data.student_uploaded_file) {
          setStudentMetadata({
            file_size: res.data.student_file_size,
            upload_time: res.data.student_upload_time,
            rows_detected: res.data.student_rows_detected,
            columns_detected: res.data.student_columns_detected,
            file_type: res.data.student_file_type
          });
          setStudentUploadStatus('success');
        }
        if (res.data.attendance_uploaded_file) {
          setAttendanceMetadata({
            file_size: res.data.attendance_file_size,
            upload_time: res.data.attendance_upload_time,
            rows_detected: res.data.attendance_rows_detected,
            columns_detected: res.data.attendance_columns_detected,
            file_type: res.data.attendance_file_type
          });
          setAttendanceUploadStatus('success');
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
        setError('Failed to load system preferences from server.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setTestResult(null);

    setActionLoading(true);
    try {
      await apiClient.put('/settings', {
        theme: theme,
        dark_mode: darkMode,
        output_folder: outputFolder.trim(),
        backup_folder: backupFolder.trim(),
        export_format: exportFormat,
        auto_backup: autoBackup
      });
      setSuccess('All system preferences and configurations saved successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSources = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setTestResult(null);

    const hasStudent = (studentSourceType === 'upload' && studentUploadedFile) || (studentSourceType === 'google_sheet' && studentUrl.trim());
    const hasAttendance = (attendanceSourceType === 'upload' && attendanceUploadedFile) || (attendanceSourceType === 'google_sheet' && attendanceUrl.trim());

    if (!hasStudent || !hasAttendance) {
      setError('Please configure your Student List and Attendance source first.');
      return;
    }

    setSaveSourcesLoading(true);
    try {
      await apiClient.put('/settings', {
        student_excel_path: studentSourceType === 'google_sheet' ? studentUrl.trim() : null,
        attendance_excel_path: attendanceSourceType === 'google_sheet' ? attendanceUrl.trim() : null
      });

      const verifyRes = await apiClient.post('/settings/verify-files');
      if (!verifyRes.data.success) {
        throw new Error(verifyRes.data.message);
      }

      setSuccess('Data sources saved and verified successfully.');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save and verify sources.');
    } finally {
      setSaveSourcesLoading(false);
    }
  };

  const handleVerifyFiles = async () => {
    setError('');
    setSuccess('');
    setTestResult(null);

    const hasStudent = (studentSourceType === 'upload' && studentUploadedFile) || (studentSourceType === 'google_sheet' && studentUrl.trim());
    const hasAttendance = (attendanceSourceType === 'upload' && attendanceUploadedFile) || (attendanceSourceType === 'google_sheet' && attendanceUrl.trim());

    if (!hasStudent || !hasAttendance) {
      setTestResult({
        success: false,
        message: 'Please configure your Student List and Attendance source first.'
      });
      return;
    }

    setTestLoading(true);
    try {
      const res = await apiClient.post('/settings/verify-files');
      setTestResult({
        success: res.data.success,
        message: res.data.message
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || err.message || 'Verification failed.'
      });
    } finally {
      setTestLoading(false);
    }
  };

  // Upload Logic
  const uploadStudentFile = async (file) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      setError('Unsupported file format. Please upload .xlsx, .xls, or .csv.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setStudentUploadStatus('uploading');
    setStudentProgress(0);
    setError('');
    setSuccess('');

    try {
      const res = await apiClient.post('/settings/upload/student', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / e.total);
          setStudentProgress(percent);
        }
      });

      setStudentUploadedFile(res.data.path);
      setStudentMetadata(res.data.metadata);
      setStudentUploadStatus('success');
      setStudentSourceType('upload');
      setStudentUrl('');
      setSuccess('Student list file uploaded and verified successfully.');
    } catch (err) {
      setStudentUploadStatus('error');
      setError(err.response?.data?.message || 'Failed to upload student list file.');
    }
  };

  const uploadAttendanceFile = async (file) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      setError('Unsupported file format. Please upload .xlsx, .xls, or .csv.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setAttendanceUploadStatus('uploading');
    setAttendanceProgress(0);
    setError('');
    setSuccess('');

    try {
      const res = await apiClient.post('/settings/upload/attendance', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / e.total);
          setAttendanceProgress(percent);
        }
      });

      setAttendanceUploadedFile(res.data.path);
      setAttendanceMetadata(res.data.metadata);
      setAttendanceUploadStatus('success');
      setAttendanceSourceType('upload');
      setAttendanceUrl('');
      setSuccess('Attendance logs file uploaded and verified successfully.');
    } catch (err) {
      setAttendanceUploadStatus('error');
      setError(err.response?.data?.message || 'Failed to upload attendance file.');
    }
  };

  // Delete Uploads
  const handleDeleteStudentFile = async () => {
    setError('');
    setSuccess('');
    try {
      await apiClient.put('/settings', { student_uploaded_file: null });
      setStudentUploadedFile('');
      setStudentMetadata(null);
      setStudentUploadStatus('idle');
      setStudentSourceType('google_sheet');
      setSuccess('Student list file removed successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove student file.');
    }
  };

  const handleDeleteAttendanceFile = async () => {
    setError('');
    setSuccess('');
    try {
      await apiClient.put('/settings', { attendance_uploaded_file: null });
      setAttendanceUploadedFile('');
      setAttendanceMetadata(null);
      setAttendanceUploadStatus('idle');
      setAttendanceSourceType('google_sheet');
      setSuccess('Attendance file removed successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove attendance file.');
    }
  };

  // Student Drag handlers
  const handleStudentDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setStudentDragActive(true);
    } else if (e.type === "dragleave") {
      setStudentDragActive(false);
    }
  };

  const handleStudentDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setStudentDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadStudentFile(e.dataTransfer.files[0]);
    }
  };

  // Attendance Drag handlers
  const handleAttendanceDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setAttendanceDragActive(true);
    } else if (e.type === "dragleave") {
      setAttendanceDragActive(false);
    }
  };

  const handleAttendanceDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAttendanceDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadAttendanceFile(e.dataTransfer.files[0]);
    }
  };

  // Helpers
  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center bg-bg-main text-text-primary min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <span className="w-12 h-12 border-4 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin"></span>
          <span className="text-text-secondary font-medium">Fetching settings preferences...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow bg-bg-main text-text-primary p-6 md:p-12 relative overflow-hidden flex flex-col min-h-0 animate-fade-in">
      <div className="max-w-5xl mx-auto w-full relative z-10 space-y-8 flex flex-col flex-grow min-h-0 animate-slide-up">
        
        {/* Header Block */}
        <header className="border-b border-border-main pb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
              System Settings
            </h1>
            <p className="text-text-secondary mt-1 text-sm">Configure workbook spreadsheet integrations, themes, and directories privately</p>
          </div>
          <button
            type="button"
            disabled={testLoading}
            onClick={handleVerifyFiles}
            className="btn-base btn-info h-[42px] cursor-pointer"
          >
            {testLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            )}
            <span>Verify Sources</span>
          </button>
        </header>

        {/* Status Messages */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm animate-fade-in">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm animate-fade-in">
            {success}
          </div>
        )}

        {/* Verification Result */}
        {testResult && (
          <div className={`p-4 rounded-xl border text-sm flex items-start gap-3 animate-fade-in ${
            testResult.success 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}>
            <div className="mt-0.5 flex-shrink-0">
              {testResult.success ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-btn-present">
                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.74-5.24Z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-btn-absent">
                  <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="flex-grow">
              <h4 className="font-bold text-text-primary">{testResult.success ? 'Verification Successful' : 'Verification Failed'}</h4>
              <p className="mt-1 text-xs opacity-90">{testResult.message}</p>
            </div>
          </div>
        )}

        <div className="space-y-8">
          
          {/* Section 1: Data Sources */}
          <section className="card-premium p-8 shadow-sm space-y-8 bg-white">
            <h3 className="text-xl font-bold border-b border-border-main pb-3 flex items-center gap-2 text-text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-accent-blue">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.884 2.012l-.847 7.63c-.16 1.439.962 2.684 2.417 2.684h16.828c1.455 0 2.578-1.245 2.417-2.684l-.847-7.63a2.25 2.25 0 0 0-1.884-2.012m-16.5 0V6.75A2.25 2.25 0 0 1 4.5 4.5h15a2.25 2.25 0 0 1 2.25 2.25v3m-18 0A2.25 2.25 0 0 0 5.25 12h13.5A2.25 2.25 0 0 0 21 9.776" />
              </svg>
              <span>Data Source Settings</span>
            </h3>

            <div className="space-y-8 bg-white">
              
              {/* STUDENT LIST SOURCE SECTION */}
              <div className="space-y-4 p-5 border border-border-main rounded-2xl bg-bg-main/30 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border-main/50 pb-3">
                  <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider">Student Source</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary">Active Source:</span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                      studentSourceType === 'upload' 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200/50' 
                        : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-200/50'
                    }`}>
                      {studentSourceType === 'upload' ? 'Uploaded File' : 'Google Sheet'}
                    </span>
                  </div>
                </div>

                {/* Option 1: URL input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold text-text-secondary uppercase">Option 1: Google Sheet URL</label>
                  </div>
                  <input
                    type="text"
                    disabled={studentSourceType === 'upload'}
                    className="w-full input-premium text-xs"
                    value={studentUrl}
                    onChange={(e) => setStudentUrl(e.target.value)}
                    placeholder="Paste your Google Sheet URL here"
                  />
                </div>

                {/* OR Separator */}
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-border-main/60"></div>
                  <span className="flex-shrink mx-4 text-[10px] font-extrabold uppercase tracking-widest text-text-secondary bg-white px-3 py-1 rounded-full border border-border-main/60 shadow-sm">OR</span>
                  <div className="flex-grow border-t border-border-main/60"></div>
                </div>

                {/* Option 2: Drag and Drop Upload */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-text-secondary uppercase block">Option 2: Drag & Drop Excel / CSV</label>
                  
                  {studentUploadStatus === 'success' && studentUploadedFile ? (
                    /* Metadata Preview Card */
                    <div className="p-4 border border-emerald-200/70 bg-emerald-50/20 rounded-xl flex flex-col gap-3 animate-fade-in">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 border border-emerald-200">
                            <span className="text-xs font-bold text-emerald-800">
                              {studentMetadata?.file_type === 'CSV' ? 'CSV' : 'XLS'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <span className="block text-sm font-semibold text-text-primary truncate">
                              {studentUploadedFile.split('/').pop()}
                            </span>
                            <span className="block text-xs text-text-secondary">
                              {formatBytes(studentMetadata?.file_size)} • {studentMetadata?.upload_time}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleDeleteStudentFile}
                          className="p-1 text-text-secondary hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove File"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border-main/50 text-xs">
                        <div className="bg-white p-2 rounded-lg border border-border-main/50">
                          <span className="block text-text-secondary font-medium">Rows Detected</span>
                          <span className="text-sm font-bold text-text-primary mt-0.5 block">{studentMetadata?.rows_detected}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-border-main/50">
                          <span className="block text-text-secondary font-medium">Columns Detected</span>
                          <span className="text-sm font-bold text-text-primary mt-0.5 block">{studentMetadata?.columns_detected}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Dnd Upload Drop Box */
                    <div
                      onDragEnter={handleStudentDrag}
                      onDragOver={handleStudentDrag}
                      onDragLeave={handleStudentDrag}
                      onDrop={handleStudentDrop}
                      onClick={() => studentFileRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all bg-white relative cursor-pointer min-h-[140px] ${
                        studentDragActive 
                          ? 'border-accent-blue bg-accent-blue/5' 
                          : 'border-border-main hover:border-accent-blue/50'
                      }`}
                    >
                      <input
                        type="file"
                        ref={studentFileRef}
                        accept=".xlsx,.xls,.csv"
                        onChange={(e) => e.target.files?.[0] && uploadStudentFile(e.target.files[0])}
                        className="hidden"
                      />
                      
                      {studentUploadStatus === 'uploading' ? (
                        <div className="flex flex-col items-center w-full">
                          <span className="text-sm font-semibold text-text-primary mb-1">Uploading student file...</span>
                          <div className="w-full max-w-xs bg-bg-main rounded-full h-2.5 dark:bg-gray-700 mt-2 overflow-hidden border border-border-main">
                            <div className="bg-accent-blue h-2.5 rounded-full transition-all duration-300" style={{ width: `${studentProgress}%` }}></div>
                          </div>
                          <span className="text-xs text-text-secondary mt-1">{studentProgress}% complete</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-center">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-accent-blue mb-2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                          </svg>
                          <span className="text-sm font-semibold text-text-primary">Drag & drop your file here, or <span className="text-accent-blue underline">Browse Files</span></span>
                          <span className="text-xs text-text-secondary mt-1">Supported formats: .xlsx, .xls, .csv (Max 20MB)</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ATTENDANCE SHEET SOURCE SECTION */}
              <div className="space-y-4 p-5 border border-border-main rounded-2xl bg-bg-main/30 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border-main/50 pb-3">
                  <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider">Attendance Source</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary">Active Source:</span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                      attendanceSourceType === 'upload' 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200/50' 
                        : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-200/50'
                    }`}>
                      {attendanceSourceType === 'upload' ? 'Uploaded File' : 'Google Sheet'}
                    </span>
                  </div>
                </div>

                {/* Option 1: URL input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold text-text-secondary uppercase">Option 1: Google Sheet URL</label>
                  </div>
                  <input
                    type="text"
                    disabled={attendanceSourceType === 'upload'}
                    className="w-full input-premium text-xs"
                    value={attendanceUrl}
                    onChange={(e) => setAttendanceUrl(e.target.value)}
                    placeholder="Paste your Google Sheet URL here"
                  />
                </div>

                {/* OR Separator */}
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-border-main/60"></div>
                  <span className="flex-shrink mx-4 text-[10px] font-extrabold uppercase tracking-widest text-text-secondary bg-white px-3 py-1 rounded-full border border-border-main/60 shadow-sm">OR</span>
                  <div className="flex-grow border-t border-border-main/60"></div>
                </div>

                {/* Option 2: Drag and Drop Upload */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-text-secondary uppercase block">Option 2: Drag & Drop Excel / CSV</label>
                  
                  {attendanceUploadStatus === 'success' && attendanceUploadedFile ? (
                    /* Metadata Preview Card */
                    <div className="p-4 border border-emerald-200/70 bg-emerald-50/20 rounded-xl flex flex-col gap-3 animate-fade-in">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 border border-emerald-200">
                            <span className="text-xs font-bold text-emerald-800">
                              {attendanceMetadata?.file_type === 'CSV' ? 'CSV' : 'XLS'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <span className="block text-sm font-semibold text-text-primary truncate">
                              {attendanceUploadedFile.split('/').pop()}
                            </span>
                            <span className="block text-xs text-text-secondary">
                              {formatBytes(attendanceMetadata?.file_size)} • {attendanceMetadata?.upload_time}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleDeleteAttendanceFile}
                          className="p-1 text-text-secondary hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove File"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border-main/50 text-xs">
                        <div className="bg-white p-2 rounded-lg border border-border-main/50">
                          <span className="block text-text-secondary font-medium">Rows Detected</span>
                          <span className="text-sm font-bold text-text-primary mt-0.5 block">{attendanceMetadata?.rows_detected}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-border-main/50">
                          <span className="block text-text-secondary font-medium">Columns Detected</span>
                          <span className="text-sm font-bold text-text-primary mt-0.5 block">{attendanceMetadata?.columns_detected}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Dnd Upload Drop Box */
                    <div
                      onDragEnter={handleAttendanceDrag}
                      onDragOver={handleAttendanceDrag}
                      onDragLeave={handleAttendanceDrag}
                      onDrop={handleAttendanceDrop}
                      onClick={() => attendanceFileRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all bg-white relative cursor-pointer min-h-[140px] ${
                        attendanceDragActive 
                          ? 'border-accent-blue bg-accent-blue/5' 
                          : 'border-border-main hover:border-accent-blue/50'
                      }`}
                    >
                      <input
                        type="file"
                        ref={attendanceFileRef}
                        accept=".xlsx,.xls,.csv"
                        onChange={(e) => e.target.files?.[0] && uploadAttendanceFile(e.target.files[0])}
                        className="hidden"
                      />
                      
                      {attendanceUploadStatus === 'uploading' ? (
                        <div className="flex flex-col items-center w-full">
                          <span className="text-sm font-semibold text-text-primary mb-1">Uploading attendance logs...</span>
                          <div className="w-full max-w-xs bg-bg-main rounded-full h-2.5 dark:bg-gray-700 mt-2 overflow-hidden border border-border-main">
                            <div className="bg-accent-blue h-2.5 rounded-full transition-all duration-300" style={{ width: `${attendanceProgress}%` }}></div>
                          </div>
                          <span className="text-xs text-text-secondary mt-1">{attendanceProgress}% complete</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-center">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-accent-blue mb-2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                          </svg>
                          <span className="text-sm font-semibold text-text-primary">Drag & drop your file here, or <span className="text-accent-blue underline">Browse Files</span></span>
                          <span className="text-xs text-text-secondary mt-1">Supported formats: .xlsx, .xls, .csv (Max 20MB)</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action save trigger */}
              <button
                type="button"
                disabled={saveSourcesLoading}
                onClick={handleSaveSources}
                className="btn-base btn-primary h-[40px] px-6 text-xs cursor-pointer flex items-center justify-center gap-2 mt-4"
              >
                {saveSourcesLoading && (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                )}
                <span>Save Sources</span>
              </button>
            </div>
          </section>

          {/* Section 2: General Preferences */}
          <form onSubmit={handleSave} className="space-y-8">
            <section className="card-premium p-8 shadow-sm space-y-6 bg-white">
              <h3 className="text-xl font-bold border-b border-border-main pb-3 flex items-center gap-2 text-text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-accent-blue">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                <span>General System Preferences</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider">Display Theme</label>
                  <select
                    className="w-full input-premium bg-white cursor-pointer"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                  >
                    <option value="dark">Indigo Glow (Dark)</option>
                    <option value="teal">Teal Forest (Dark)</option>
                    <option value="purple">Midnight Purple (Dark)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider">Default Export Format</label>
                  <select
                    className="w-full input-premium bg-white cursor-pointer"
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                  >
                    <option value="excel">Excel Sheets (.xlsx)</option>
                    <option value="pdf">Acrobat PDF Document (.pdf)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider">Output Target Folder</label>
                  <input
                    type="text"
                    placeholder="e.g. C:/User/Reports/Output"
                    className="w-full input-premium"
                    value={outputFolder}
                    onChange={(e) => setOutputFolder(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider">Backup Target Folder</label>
                  <input
                    type="text"
                    placeholder="e.g. C:/User/Reports/Backup"
                    className="w-full input-premium"
                    value={backupFolder}
                    onChange={(e) => setBackupFolder(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border-main">
                <div className="flex items-center justify-between p-4 bg-bg-main border border-border-main rounded-xl">
                  <div>
                    <span className="block text-sm font-medium">Dark Mode Default</span>
                    <span className="text-xs text-text-secondary opacity-70">Enable premium dark interface components</span>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-accent-blue cursor-pointer"
                    checked={darkMode}
                    onChange={(e) => setDarkMode(e.target.checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-bg-main border border-border-main rounded-xl">
                  <div>
                    <span className="block text-sm font-medium">Automated Runs Backup</span>
                    <span className="text-xs text-text-secondary opacity-70">Auto copy runs to backup directory on save</span>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-accent-blue cursor-pointer"
                    checked={autoBackup}
                    onChange={(e) => setAutoBackup(e.target.checked)}
                  />
                </div>
              </div>
            </section>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full btn-base btn-primary h-[44px] cursor-pointer"
            >
              {actionLoading && (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              )}
              <span>Save All Configurations</span>
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}
