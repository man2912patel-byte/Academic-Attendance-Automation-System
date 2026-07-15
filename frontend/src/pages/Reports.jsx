import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';

export default function Reports() {
  const [dates, setDates] = useState([]);
  const [months, setMonths] = useState([]);
  const [summary, setSummary] = useState({ total_runs: 0, average_rate: 0 });
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form parameters
  const [reportType, setReportType] = useState('daily');
  const [format, setFormat] = useState('excel');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/attendance/reports/stats');
      setDates(res.data.dates);
      setMonths(res.data.months);
      setSummary(res.data.summary);
      
      if (res.data.dates.length > 0) {
        setSelectedDate(res.data.dates[0]);
      }
      if (res.data.months.length > 0) {
        const m = res.data.months[0];
        setSelectedMonth(`${m.year}-${m.month}`);
      }
    } catch (err) {
      console.error('Failed to fetch reports options:', err);
      setError('Failed to fetch available history metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

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

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const payload = {
      report_type: reportType,
      format: format
    };

    if (reportType === 'daily') {
      if (!selectedDate) {
        setError('Please select a date.');
        return;
      }
      payload.date = selectedDate;
    } else if (reportType === 'monthly') {
      if (!selectedMonth) {
        setError('Please select a month.');
        return;
      }
      const [year, month] = selectedMonth.split('-');
      payload.year = year;
      payload.month = month;
    } else if (reportType === 'custom') {
      if (!customStartDate || !customEndDate) {
        setError('Please specify both start and end dates.');
        return;
      }
      payload.start_date = customStartDate;
      payload.end_date = customEndDate;
    }

    setActionLoading(true);
    try {
      const res = await apiClient.post('/attendance/reports/generate', payload, { responseType: 'blob' });
      
      const fileMime = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const fileExt = format === 'pdf' ? 'pdf' : 'xlsx';
      const fileName = `Attendance_Report_${reportType}_${new Date().toISOString().slice(0,10)}.${fileExt}`;
      
      downloadFile(res, fileName, fileMime);
      setSuccess('Report generated and downloaded successfully.');
    } catch (err) {
      if (err.response && err.response.data) {
        const text = await err.response.data.text();
        try {
          const parsed = JSON.parse(text);
          setError(parsed.message || 'Report generation failed.');
        } catch {
          setError('Failed to compile report. Verify data range contains runs.');
        }
      } else {
        setError('Failed to generate report file.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center bg-bg-main text-text-primary min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <span className="w-12 h-12 border-4 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin"></span>
          <span className="text-text-secondary font-medium">Loading report options...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow bg-bg-main text-text-primary p-6 md:p-12 relative overflow-hidden flex flex-col min-h-0 animate-fade-in">
      <div className="max-w-6xl mx-auto w-full relative z-10 space-y-8 flex flex-col flex-grow min-h-0 animate-slide-up">
        
        {/* Header Block */}
        <header className="border-b border-border-main pb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">Report Center</h1>
          <p className="text-text-secondary mt-1 text-sm">Generate monthly matrix spreadsheets, daily files, and date-range logs</p>
        </header>

        {/* Global Success / Errors */}
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

        {/* Top Summary statistics */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-premium p-6 flex items-center justify-between shadow-sm bg-white">
            <div>
              <span className="text-text-secondary text-xs font-bold uppercase tracking-wider">Total Class Runs</span>
              <p className="text-4xl font-extrabold mt-3 text-text-primary">{summary.total_runs}</p>
            </div>
            <div className="p-4 bg-accent-blue/10 border border-accent-blue/20 rounded-2xl text-accent-blue">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.25 2.25 0 0 0 9.24 3.512a48.474 48.474 0 0 0-1.123.08c-1.131.094-1.976 1.057-1.976 2.192V16.5A2.25 2.25 0 0 0 7.5 18.75h1.5m3 0a2.25 2.25 0 0 0-2.25-2.25h-1.5m3 0h3" />
              </svg>
            </div>
          </div>

          <div className="card-premium p-6 flex items-center justify-between shadow-sm bg-white">
            <div>
              <span className="text-text-secondary text-xs font-bold uppercase tracking-wider">Overall Average Rate</span>
              <p className="text-4xl font-extrabold mt-3 text-btn-present">{summary.average_rate}%</p>
            </div>
            <div className="p-4 bg-btn-present/10 border border-btn-present/20 rounded-2xl text-btn-present">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
              </svg>
            </div>
          </div>
        </section>

        {/* Configuration cards & generators */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Controls configuration Form */}
          <section className="lg:col-span-2 card-premium p-8 shadow-sm bg-white">
            <h3 className="text-xl font-bold mb-6 border-b border-border-main pb-3 text-text-primary">Configure Export Report</h3>
            
            <form onSubmit={handleGenerate} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider">Report Summary Type</label>
                  <select
                    className="w-full input-premium bg-white cursor-pointer"
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                  >
                    <option value="daily">Daily Attendance</option>
                    <option value="monthly">Monthly Matrix Summary</option>
                    <option value="custom">Custom Date Range Matrix</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider">Export File Format</label>
                  <select
                    className="w-full input-premium bg-white cursor-pointer"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                  >
                    <option value="excel">Excel Workbook (.xlsx)</option>
                    <option value="pdf">Acrobat Document (.pdf)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Inputs based on type */}
              {reportType === 'daily' && (
                <div className="space-y-2">
                  <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider" htmlFor="daily-date-select">
                    Select Historical Date
                  </label>
                  <select
                    id="daily-date-select"
                    disabled={dates.length === 0}
                    className="w-full input-premium bg-white cursor-pointer disabled:opacity-50"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  >
                    {dates.length === 0 ? (
                      <option>No dates available in history.</option>
                    ) : (
                      dates.map((d, i) => (
                        <option key={i} value={d}>
                          {d}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {reportType === 'monthly' && (
                <div className="space-y-2">
                  <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider" htmlFor="monthly-select">
                    Select Month
                  </label>
                  <select
                    id="monthly-select"
                    disabled={months.length === 0}
                    className="w-full input-premium bg-white cursor-pointer disabled:opacity-50"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  >
                    {months.length === 0 ? (
                      <option>No months available in history.</option>
                    ) : (
                      months.map((m, i) => (
                        <option key={i} value={`${m.year}-${m.month}`}>
                          {m.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {reportType === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider" htmlFor="custom-start-date">
                      Start Date
                    </label>
                    <input
                      id="custom-start-date"
                      type="date"
                      className="w-full input-premium bg-white cursor-pointer"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider" htmlFor="custom-end-date">
                      End Date
                    </label>
                    <input
                      id="custom-end-date"
                      type="date"
                      className="w-full input-premium bg-white cursor-pointer"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={actionLoading || (reportType === 'daily' && dates.length === 0) || (reportType === 'monthly' && months.length === 0)}
                className="w-full btn-base btn-primary h-[42px] cursor-pointer"
              >
                {actionLoading && (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                )}
                <span>Compile & Download Report</span>
              </button>

            </form>
          </section>

          {/* Quick Info & Charts */}
          <section className="card-premium p-6 flex flex-col justify-between shadow-sm bg-white">
            <div>
              <h4 className="text-xs font-bold text-text-secondary mb-4 uppercase tracking-wider">Reports Distribution</h4>
              <p className="text-xs text-text-secondary opacity-85 leading-relaxed">
                Daily reports provide individual session statuses. Monthly and custom matrix reports compile records onto a grid showing class present rates.
              </p>
            </div>

            <div className="py-6 flex justify-center">
              <svg width="140" height="140" viewBox="0 0 36 36">
                <path className="text-border-main stroke-current"
                  strokeWidth="3"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path className="text-accent-blue stroke-current"
                  strokeWidth="3"
                  strokeDasharray={`${summary.average_rate}, 100`}
                  strokeLinecap="round"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <text x="18" y="20.35" className="font-extrabold text-text-primary text-[7px]" fill="currentColor" textAnchor="middle">
                  {summary.average_rate}%
                </text>
              </svg>
            </div>

            <div className="text-center text-xs text-text-secondary opacity-70">
              Average Workspace Attendance Rate
            </div>
          </section>

        </div>

      </div>
    </div>
  );
}
