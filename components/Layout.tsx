import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Map, Moon, Sun, LogOut, Settings, User as UserIcon } from 'lucide-react';
import { authService } from '../services/authService';
import { UserProfile } from '../types.ts';

export const Layout: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    return authService.subscribe((u, p) => {
      setProfile(p);
    });
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center w-full h-full text-xs font-medium transition-colors ${isActive
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
    }`;

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-200 overflow-hidden">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 p-4 z-50 flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm border dark:border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <UserIcon size={16} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 leading-none">Logged in as</p>
            <p className="text-xs font-bold dark:text-white leading-tight mt-0.5">{profile?.name || 'User'}</p>
          </div>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2.5 rounded-full bg-white dark:bg-slate-800 shadow-md text-gray-800 dark:text-gray-200 border dark:border-slate-700 transition-all active:scale-95"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={handleLogout}
            className="p-2.5 rounded-full bg-white dark:bg-slate-800 shadow-md text-red-600 dark:text-red-400 border dark:border-slate-700 transition-all active:scale-95"
            title="Sign Out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-20 pt-2">
        <Outlet />
      </main>

      {/* Bottom Navigation (Mobile First) */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 flex justify-around items-center z-50 pb-safe">
        <NavLink to="/" className={navClass}>
          <LayoutDashboard size={24} className="mb-1" />
          Dashboard
        </NavLink>
        <NavLink to="/leads" className={navClass}>
          <Users size={24} className="mb-1" />
          Leads
        </NavLink>
        <NavLink to="/route" className={navClass}>
          <Map size={24} className="mb-1" />
          Routes
        </NavLink>
        {profile?.role === 'admin' && (
          <NavLink to="/users" className={navClass}>
            <Settings size={24} className="mb-1" />
            Users
          </NavLink>
        )}
      </nav>
    </div>
  );
};