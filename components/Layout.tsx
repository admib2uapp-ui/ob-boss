import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, Map, Moon, Sun } from 'lucide-react';

export const Layout: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center w-full h-full text-xs font-medium transition-colors ${
      isActive 
        ? 'text-blue-600 dark:text-blue-400' 
        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
    }`;

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-200 overflow-hidden">
      {/* Top Bar for Theme Toggle */}
      <div className="fixed top-0 right-0 p-4 z-50">
        <button 
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-full bg-white dark:bg-slate-800 shadow-md text-gray-800 dark:text-gray-200"
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
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
      </nav>
    </div>
  );
};