import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../api/client';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await apiClient.get('/dashboard/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
        setError('Failed to fetch dashboard metrics. Please reload.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center bg-bg-main text-text-primary min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <span className="w-12 h-12 border-4 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin"></span>
          <span className="text-text-secondary font-medium">Fetching dashboard metrics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-grow flex items-center justify-center bg-bg-main text-text-primary min-h-screen px-4 animate-fade-in">
        <div className="card-premium p-8 max-w-md w-full text-center shadow-lg bg-white">
          <div className="w-14 h-14 bg-btn-absent/10 rounded-full flex items-center justify-center text-btn-absent mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-text-primary">Error Loading Dashboard</h3>
          <p className="text-text-secondary text-sm mt-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 w-full btn-base btn-primary"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { overall, recent_runs } = stats || {
    overall: { total_runs: 0, average_rate: 0, total_present: 0, total_absent: 0, total_students: 0 },
    recent_runs: []
  };

  const latestRun = recent_runs.length > 0 ? recent_runs[recent_runs.length - 1] : null;
  const cardData = [
    {
      name: 'Total Students',
      value: latestRun ? latestRun.total : 0,
      detail: 'Latest roster size',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A9.342 9.342 0 0 0 12 18.75c-.78 0-1.534.095-2.253.276m0 0a9.38 9.38 0 0 0-2.625.372 9.337 9.337 0 0 1-4.121-.952 4.125 4.125 0 0 1 7.533-2.493M9 19.128v-.003c0-1.113.285-2.16.786-3.07M9 19.128v.109A9.342 9.342 0 0 1 12 18.75M12 12.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" />
        </svg>
      ),
      color: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20'
    },
    {
      name: 'Present',
      value: latestRun ? latestRun.present : 0,
      detail: latestRun ? `${((latestRun.present/latestRun.total)*100).toFixed(0)}% present rate` : 'N/A',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      color: 'bg-btn-present/10 text-btn-present border-btn-present/20'
    },
    {
      name: 'Absent',
      value: latestRun ? latestRun.absent : 0,
      detail: latestRun ? `${((latestRun.absent/latestRun.total)*100).toFixed(0)}% absent rate` : 'N/A',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      color: 'bg-btn-absent/10 text-btn-absent border-btn-absent/20'
    },
    {
      name: 'Average Attendance',
      value: `${overall.average_rate}%`,
      detail: `Aggregated across ${overall.total_runs} runs`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
        </svg>
      ),
      color: 'bg-btn-warning/10 text-btn-warning border-btn-warning/20'
    }
  ];

  // Helper values to draw custom SVG line graph of recent runs
  const width = 500;
  const height = 150;
  const padding = 25;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = recent_runs.map((run, index) => {
    const x = padding + (index / Math.max(recent_runs.length - 1, 1)) * chartWidth;
    const y = padding + (1 - run.rate / 100) * chartHeight;
    return { x, y, run };
  });

  const pathD = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : '';

  return (
    <div className="flex-grow p-6 md:p-12 overflow-y-auto relative w-full flex flex-col gap-8 bg-bg-main text-text-primary animate-fade-in">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 relative z-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
            Dashboard
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            Workspace session statistics for {user?.name}.
          </p>
        </div>
        <div className="text-xs bg-white border border-border-main px-4 py-2.5 rounded-xl text-text-secondary font-semibold shadow-sm self-start sm:self-auto flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-btn-present animate-ping"></span>
          <span className="text-text-primary">Online Session Active</span>
        </div>
      </header>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        {cardData.map((card, idx) => (
          <div
            key={idx}
            className="card-premium p-6 relative overflow-hidden flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-xs text-text-secondary font-bold uppercase tracking-wider">{card.name}</h4>
                <p className="text-3xl font-extrabold mt-3 tracking-tight text-text-primary">{card.value}</p>
              </div>
              <div className={`p-2.5 rounded-xl border ${card.color}`}>
                {card.icon}
              </div>
            </div>
            <div className="mt-5 text-xs text-text-secondary opacity-80 font-medium border-t border-border-main pt-3">{card.detail}</div>
          </div>
        ))}
      </div>

      {/* Charts & Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        {/* SVG Line Chart Card */}
        <div className="lg:col-span-2 card-premium p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-text-primary">Attendance Analytics (Recent Runs)</h3>
            <span className="text-xs px-2.5 py-1 bg-accent-blue/10 text-accent-blue rounded-full font-semibold border border-accent-blue/20">
              Rate (%)
            </span>
          </div>
          
          {recent_runs.length > 0 ? (
            <div className="w-full flex-grow flex items-center">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
                {/* Grid Lines */}
                {[0, 25, 50, 75, 100].map((level, i) => {
                  const y = padding + (1 - level / 100) * chartHeight;
                  return (
                    <g key={i}>
                      <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#E5E7EB" strokeWidth="1" strokeDasharray="3,3" />
                      <text x={padding - 5} y={y + 3} fill="#6B7280" fontSize="9" textAnchor="end">{level}%</text>
                    </g>
                  );
                })}
                
                {/* Area gradient */}
                <defs>
                  <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {areaD && <path d={areaD} fill="url(#chart-grad)" />}
                
                {/* Primary Line */}
                {pathD && <path d={pathD} fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />}
                
                {/* Interactive Points */}
                {points.map((p, idx) => (
                  <g key={idx} className="group cursor-pointer">
                    <circle cx={p.x} cy={p.y} r="4" fill="#2563EB" stroke="#ffffff" strokeWidth="1.5" />
                    <text
                      x={p.x}
                      y={p.y - 10}
                      fill="#111827"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="opacity-0 group-hover:opacity-100 transition duration-150"
                    >
                      {p.run.rate}%
                    </text>
                    <text
                      x={p.x}
                      y={height - padding + 12}
                      fill="#6B7280"
                      fontSize="8"
                      textAnchor="middle"
                    >
                      {p.run.date.slice(5)}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-sm text-text-secondary border border-dashed border-border-main rounded-xl flex-grow">
              No attendance runs synchronized yet.
            </div>
          )}
        </div>

        {/* Quick Actions Panel */}
        <div className="card-premium p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-text-primary mb-2">Quick Actions</h3>
            <p className="text-xs text-text-secondary mb-6">Common automated attendance workflows</p>
          </div>
          
          <div className="space-y-3">
            <Link
              to="/generate"
              className="w-full btn-base btn-primary text-center justify-center"
            >
              Compile Attendance Run
            </Link>
            
            <Link
              to="/reports"
              className="w-full btn-base btn-cancel text-center justify-center"
            >
              Generate Monthly PDF
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Attendance Runs logs list */}
      <section className="card-premium p-6 relative z-10">
        <h3 className="text-base font-bold text-text-primary mb-6">Recent Synchronized Logs</h3>
        
        {recent_runs.length > 0 ? (
          <div className="table-container-premium">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Total Roster</th>
                  <th className="text-btn-present">Present</th>
                  <th className="text-btn-absent">Absent</th>
                  <th>Rate (%)</th>
                </tr>
              </thead>
              <tbody>
                {recent_runs.slice(0, 5).reverse().map((run, i) => (
                  <tr key={i}>
                    <td className="text-text-primary font-medium">{run.date}</td>
                    <td>{run.total}</td>
                    <td className="text-btn-present font-semibold">{run.present}</td>
                    <td className="text-btn-absent font-semibold">{run.absent}</td>
                    <td className="font-semibold text-accent-blue">{run.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-text-secondary border border-dashed border-border-main rounded-xl">
            No historical records found for this workspace. Use the quick action button to compile sheet rosters.
          </div>
        )}
      </section>
    </div>
  );
}
