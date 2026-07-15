import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';

export default function History() {
  const { showToast } = useToast();
  const [runs, setRuns] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Detailed Modal view state
  const [selectedRun, setSelectedRun] = useState(null);
  const [details, setDetails] = useState([]);
  const [detailsSearch, setDetailsSearch] = useState('');
  const [detailsStatusFilter, setDetailsStatusFilter] = useState('');
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/attendance/history', {
        params: {
          page,
          limit: 10,
          search: searchQuery
        }
      });
      setRuns(res.data.runs);
      setTotalPages(res.data.total_pages);
    } catch (err) {
      console.error('Failed to load history runs:', err);
      setError('Failed to fetch attendance history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchHistory();
  };

  const handleDeleteRun = async (runId) => {
    if (!window.confirm('Are you sure you want to permanently delete this attendance record?')) {
      return;
    }
    
    try {
      await apiClient.delete(`/attendance/history/${runId}`);
      showToast('Attendance record deleted successfully.', 'success');
      fetchHistory();
      if (selectedRun && selectedRun.id === runId) {
        setSelectedRun(null);
      }
    } catch (err) {
      showToast('Failed to delete history run.', 'error');
    }
  };

  const handleViewDetails = async (run) => {
    setSelectedRun(run);
    setDetailsSearch('');
    setDetailsStatusFilter('');
    setDetailsLoading(true);
    
    try {
      const res = await apiClient.get(`/attendance/history/${run.id}`);
      setDetails(res.data.details);
    } catch (err) {
      showToast('Failed to fetch detailed records.', 'error');
      setSelectedRun(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const fetchFilteredDetails = async () => {
    if (!selectedRun) return;
    setDetailsLoading(true);
    try {
      const res = await apiClient.get(`/attendance/history/${selectedRun.id}`, {
        params: {
          search: detailsSearch,
          status: detailsStatusFilter
        }
      });
      setDetails(res.data.details);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredDetails();
  }, [detailsSearch, detailsStatusFilter]);

  return (
    <div className="flex-grow bg-bg-main text-text-primary p-6 md:p-12 relative overflow-hidden flex flex-col min-h-0 animate-fade-in">
      <div className="max-w-6xl mx-auto w-full relative z-10 space-y-6 flex flex-col flex-grow min-h-0 animate-slide-up">
        
        {/* Header block */}
        <header className="border-b border-border-main pb-6 flex-shrink-0">
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">Attendance History Logs</h1>
          <p className="text-text-secondary mt-1 text-sm">Review, filter, search and manage your historical attendance runs</p>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex-shrink-0 animate-fade-in">
            {error}
          </div>
        )}

        {/* Search & Actions Panel */}
        <section className="card-premium p-6 shadow-sm flex-shrink-0 bg-white">
          <form onSubmit={handleSearchSubmit} className="flex gap-4">
            <input
              type="text"
              placeholder="Search by date (YYYY-MM-DD)..."
              className="flex-grow input-premium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="submit"
              className="btn-base btn-primary px-8 h-[42px] cursor-pointer"
            >
              Search
            </button>
          </form>
        </section>

        {/* History Runs Grid/Table */}
        <section className="flex-grow card-premium p-6 shadow-sm flex flex-col min-h-0 bg-white">
          {loading ? (
            <div className="flex-grow flex items-center justify-center">
              <span className="w-10 h-10 border-4 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin"></span>
            </div>
          ) : runs.length > 0 ? (
            <div className="flex-grow flex flex-col justify-between min-h-0">
              
              {/* Runs Table */}
              <div className="overflow-y-auto table-container-premium mb-4">
                <table className="table-premium relative">
                  <thead>
                    <tr>
                      <th>Attendance Date</th>
                      <th>Total Students</th>
                      <th className="text-btn-present">Present</th>
                      <th className="text-btn-absent">Absent</th>
                      <th>Rate (%)</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => (
                      <tr key={run.id}>
                        <td className="text-text-primary font-medium">{run.attendance_date}</td>
                        <td>{run.total_students}</td>
                        <td className="text-btn-present font-semibold">{run.present_count}</td>
                        <td className="text-btn-absent font-semibold">{run.absent_count}</td>
                        <td className="font-semibold text-accent-blue">{run.rate}%</td>
                        <td className="text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleViewDetails(run)}
                              className="btn-base btn-cancel h-[32px] px-3 text-xs cursor-pointer"
                            >
                              Details
                            </button>
                            <button
                              onClick={() => handleDeleteRun(run.id)}
                              className="btn-base btn-absent h-[32px] px-3 text-xs cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="flex items-center justify-between pt-4 border-t border-border-main flex-shrink-0">
                <span className="text-xs text-text-secondary">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                    className="btn-base btn-cancel h-[36px] px-4 text-xs cursor-pointer disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                    className="btn-base btn-cancel h-[36px] px-4 text-xs cursor-pointer disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-grow flex items-center justify-center text-sm text-text-secondary border border-dashed border-border-main rounded-2xl py-12">
              No historical runs found for this user.
            </div>
          )}
        </section>

        {/* Modal: Detailed student list under run */}
        {selectedRun && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white border border-border-main rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col p-6 shadow-xl overflow-hidden animate-slide-up">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b border-border-main pb-4 mb-4 flex-shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-text-primary">Attendance Details: {selectedRun.attendance_date}</h3>
                  <p className="text-xs text-text-secondary mt-1">
                    Present: {selectedRun.present_count} | Absent: {selectedRun.absent_count} | Rate: {selectedRun.rate}%
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRun(null)}
                  className="text-text-secondary hover:text-text-primary transition cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Filters Inside Modal */}
              <div className="flex flex-col sm:flex-row gap-4 mb-4 flex-shrink-0">
                <input
                  type="text"
                  placeholder="Search students by name or roll..."
                  className="flex-grow input-premium"
                  value={detailsSearch}
                  onChange={(e) => setDetailsSearch(e.target.value)}
                />
                
                <select
                  className="input-premium bg-white cursor-pointer"
                  value={detailsStatusFilter}
                  onChange={(e) => setDetailsStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="Present">Present Only</option>
                  <option value="Absent">Absent Only</option>
                </select>
              </div>

              {/* Data Table */}
              <div className="flex-grow overflow-y-auto table-container-premium">
                {detailsLoading ? (
                  <div className="h-48 flex items-center justify-center">
                    <span className="w-8 h-8 border-2 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin"></span>
                  </div>
                ) : details.length > 0 ? (
                  <table className="table-premium relative">
                    <thead>
                      <tr>
                        <th>Roll No</th>
                        <th>Enrollment No</th>
                        <th>Student Name</th>
                        <th className="text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.map((d, idx) => (
                        <tr key={idx}>
                          <td className="text-text-primary font-medium">{d.roll_number}</td>
                          <td>{d.enrollment_number}</td>
                          <td>{d.student_name}</td>
                          <td className="text-center">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              d.attendance === 'Present' 
                                ? 'bg-btn-present/10 text-btn-present border border-btn-present/20' 
                                : 'bg-btn-absent/10 text-btn-absent border border-btn-absent/20'
                            }`}>
                              {d.attendance}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="h-48 flex items-center justify-center text-text-secondary">
                    No matching student records found.
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
