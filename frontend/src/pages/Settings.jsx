import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { getSourceUrls, saveSourceUrls } from '../utils/config';

export default function Settings() {
  const { user } = useContext(AuthContext);
  
  // General System preferences
  const [theme, setTheme] = useState('dark');
  const [darkMode, setDarkMode] = useState(true);
  const [outputFolder, setOutputFolder] = useState('');
  const [backupFolder, setBackupFolder] = useState('');
  const [exportFormat, setExportFormat] = useState('excel');
  const [autoBackup, setAutoBackup] = useState(false);

  // URL States
  const [studentUrl, setStudentUrl] = useState('');
  const [attendanceUrl, setAttendanceUrl] = useState('');

  // States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [saveSourcesLoading, setSaveSourcesLoading] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testResult, setTestResult] = useState(null);

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

        // Load URLs on startup
        const urls = getSourceUrls();
        setStudentUrl(urls.studentUrl);
        setAttendanceUrl(urls.attendanceUrl);
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

    if (!studentUrl.trim() || !attendanceUrl.trim()) {
      setError('Both source URLs are required.');
      return;
    }

    setSaveSourcesLoading(true);
    try {
      // 1. Save the URLs in localStorage
      saveSourceUrls(studentUrl.trim(), attendanceUrl.trim());

      // 2. Reload the data source automatically
      const [resStudent, resAttendance] = await Promise.all([
        fetch(studentUrl.trim()).then(r => {
          if (!r.ok) throw new Error("Failed to download Student List CSV.");
          return r.text();
        }),
        fetch(attendanceUrl.trim()).then(r => {
          if (!r.ok) throw new Error("Failed to download Attendance Sheet CSV.");
          return r.text();
        })
      ]);

      // Parse metadata to ensure it's valid
      const { parseCSVMetadata } = await import('../utils/attendanceProcessor');
      parseCSVMetadata(resStudent, resAttendance);

      // Cache raw text in localStorage per user so the Generate page immediately reflects it
      if (user && user.username) {
        const lowerUser = user.username.toLowerCase();
        localStorage.setItem(`csv_student_${lowerUser}`, resStudent);
        localStorage.setItem(`csv_attendance_${lowerUser}`, resAttendance);
      }

      setSuccess('Data source updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to download and parse Google Sheets CSV sources.');
    } finally {
      setSaveSourcesLoading(false);
    }
  };

  const handleVerifyFiles = async () => {
    setError('');
    setSuccess('');
    setTestResult(null);
    setTestLoading(true);

    // Verify currently saved URLs
    const urls = getSourceUrls();

    try {
      const [resStudent, resAttendance] = await Promise.all([
        fetch(urls.studentUrl).then(r => {
          if (!r.ok) throw new Error("Failed to reach Student List Google Sheet.");
          return r.text();
        }),
        fetch(urls.attendanceUrl).then(r => {
          if (!r.ok) throw new Error("Failed to reach Attendance Google Sheet.");
          return r.text();
        })
      ]);

      const { parseCSVMetadata } = await import('../utils/attendanceProcessor');
      parseCSVMetadata(resStudent, resAttendance);

      setTestResult({
        success: true,
        message: 'Both Google Sheets CSV export links verified and parsed successfully in browser. Sources are active.'
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: `Verification failed: ${err.message}`
      });
    } finally {
      setTestLoading(false);
    }
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
          
          {/* Section 1: Offline Data Sources */}
          <section className="card-premium p-8 shadow-sm space-y-6 bg-white">
            <h3 className="text-xl font-bold border-b border-border-main pb-3 flex items-center gap-2 text-text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-accent-blue">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.884 2.012l-.847 7.63c-.16 1.439.962 2.684 2.417 2.684h16.828c1.455 0 2.578-1.245 2.417-2.684l-.847-7.63a2.25 2.25 0 0 0-1.884-2.012m-16.5 0V6.75A2.25 2.25 0 0 1 4.5 4.5h15a2.25 2.25 0 0 1 2.25 2.25v3m-18 0A2.25 2.25 0 0 0 5.25 12h13.5A2.25 2.25 0 0 0 21 9.776" />
              </svg>
              <span>Offline Data Source Settings</span>
            </h3>

            <div className="space-y-6 bg-white">
              {/* Student List Google Sheet CSV Source */}
              <div className="space-y-2">
                <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider">Student List Google Sheet CSV Source</label>
                <input
                  type="text"
                  className="w-full input-premium text-xs"
                  value={studentUrl}
                  onChange={(e) => setStudentUrl(e.target.value)}
                  placeholder="Paste student list export URL..."
                />
              </div>

              {/* Attendance Sheet Google Sheet CSV Source */}
              <div className="space-y-2">
                <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider">Attendance Sheet Google Sheet CSV Source</label>
                <input
                  type="text"
                  className="w-full input-premium text-xs"
                  value={attendanceUrl}
                  onChange={(e) => setAttendanceUrl(e.target.value)}
                  placeholder="Paste attendance sheet export URL..."
                />
              </div>
              <p className="text-xs text-text-secondary opacity-75">Google Sheets data sources are fetched directly via client-side HTTPS. Local file picker uploads are disabled.</p>

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
