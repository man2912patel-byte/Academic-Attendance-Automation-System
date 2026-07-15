import React, { useState, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    )},
    { name: 'Generate Attendance', path: '/generate', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    )},
    { name: 'History Logs', path: '/history', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    )},
    { name: 'Report Center', path: '/reports', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v16.5A2.25 2.25 0 0 0 6 21.75h12a2.25 2.25 0 0 0 2.25-2.25V3.75a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 3.75V3Z" />
      </svg>
    )},
    { name: 'Settings', path: '/settings', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    )},
    { name: 'Profile Settings', path: '/profile', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    )}
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-bg-main text-text-primary flex flex-col md:flex-row relative font-sans animate-fade-in">
      
      {/* 1. Mobile Top Navigation Bar */}
      <header className="md:hidden bg-white border-b border-border-main py-4 px-6 flex justify-between items-center z-30 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent-blue rounded-xl flex items-center justify-center font-bold text-white shadow-md">
            A
          </div>
          <span className="font-extrabold text-sm tracking-tight text-text-primary">
            Academic Roster
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-text-secondary hover:text-text-primary focus:outline-none"
        >
          {mobileOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </header>

      {/* 2. Responsive Sidebar Wrapper */}
      <aside 
        className={`fixed inset-y-0 left-0 transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-all duration-300 ease-in-out bg-white border-r border-border-main flex flex-col justify-between z-40 p-4 md:h-screen md:sticky md:top-0 ${
          collapsed ? 'md:w-20' : 'md:w-64'
        }`}
      >
        
        <div className="space-y-6">
          {/* Brand Logo & Name */}
          <div className="hidden md:flex items-center justify-between px-2 pt-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 bg-accent-blue rounded-xl flex items-center justify-center font-bold text-white shadow-md flex-shrink-0">
                A
              </div>
              {!collapsed && (
                <div className="animate-fade-in">
                  <h2 className="font-extrabold tracking-tight text-text-primary leading-none text-sm">Academic</h2>
                  <span className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">Attendance System</span>
                </div>
              )}
            </div>
            
            {/* Collapse Toggle Button */}
            <button 
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg border border-border-main text-text-secondary hover:text-text-primary hover:bg-bg-main transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
          </div>

          {/* User Brief Panel */}
          {user && (
            <div className={`flex items-center gap-3 bg-bg-main border border-border-main p-3 rounded-xl ${collapsed ? 'justify-center p-2' : ''}`}>
              <div className="w-10 h-10 rounded-xl bg-accent-blue flex items-center justify-center font-bold text-white overflow-hidden flex-shrink-0">
                {user.profile_photo ? (
                  <img src={user.profile_photo} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              {!collapsed && (
                <div className="min-w-0 animate-fade-in">
                  <p className="text-sm font-bold truncate text-text-primary">{user.name}</p>
                  <p className="text-[10px] text-text-secondary truncate">@{user.username}</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation Items */}
          <nav className="space-y-1">
            {menuItems.map((item, idx) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={idx}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 relative group ${
                    active 
                      ? 'bg-accent-blue text-white shadow-sm font-bold' 
                      : 'text-text-primary hover:bg-bg-main hover:text-accent-blue'
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  <span className={`transition-transform duration-200 group-hover:scale-110 ${active ? 'text-white' : 'text-text-secondary'}`}>
                    {item.icon}
                  </span>
                  {!collapsed && <span className="animate-fade-in">{item.name}</span>}
                  
                  {/* Collapsed Tooltip */}
                  {collapsed && (
                    <div className="absolute left-16 bg-white border border-border-main text-text-primary text-xs font-semibold px-3 py-1.5 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-md">
                      {item.name}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="space-y-3 pt-4 border-t border-border-main">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-text-secondary hover:text-rose-600 hover:bg-rose-50/5 transition-all duration-200 ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
            </svg>
            {!collapsed && <span className="animate-fade-in">Sign Out</span>}
            
            {/* Collapsed Tooltip */}
            {collapsed && (
              <div className="absolute left-16 bg-white border border-border-main text-rose-500 text-xs font-semibold px-3 py-1.5 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-md">
                Sign Out
              </div>
            )}
          </button>
          
          {!collapsed && (
            <div className="text-[10px] text-text-secondary opacity-60 text-center animate-fade-in">
              &copy; {new Date().getFullYear()} MFT Attendance
            </div>
          )}
        </div>

      </aside>

      {/* Mobile background overlay */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 md:hidden animate-fade-in"
        ></div>
      )}

      {/* 3. Main Contents Container */}
      <main className="flex-grow flex flex-col min-h-0 relative z-10 w-full overflow-x-hidden bg-bg-main">
        {children}
      </main>

    </div>
  );
}
