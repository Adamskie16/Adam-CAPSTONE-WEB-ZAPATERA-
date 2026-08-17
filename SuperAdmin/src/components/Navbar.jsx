// SuperAdmin/src/components/Navbar.jsx
import React from 'react';
import { Bell, ShieldCheck, Sun, Moon } from 'lucide-react';

export default function Navbar({
  activeTitle,
  notificationsCount = 0,
  isDarkMode = false,
  onToggleDarkMode,
}) {
  return (
    <header className={`h-16 border-b px-6 flex items-center justify-between sticky top-0 z-10 shadow-xs transition-colors duration-200 ${
      isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
    }`}>
      {/* Title */}
      <div className="flex items-center space-x-3">
        <h2 className="text-xl font-bold tracking-tight">{activeTitle}</h2>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20">
          <ShieldCheck className="w-3 h-3 mr-1 text-blue-500" />
          System Operational
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-3">

        {/* Theme Toggle Button (Light Mode / Dark Mode) */}
        <button
          onClick={onToggleDarkMode}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`p-2 rounded-xl transition-all flex items-center space-x-1.5 border text-xs font-bold ${
            isDarkMode
              ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
              : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {isDarkMode ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-slate-600" />
              <span className="hidden md:inline">Dark Mode</span>
            </>
          )}
        </button>

        {/* Notifications Icon */}
        <div className="relative">
          <button className={`p-2 rounded-xl transition-colors relative ${
            isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'
          }`}>
            <Bell className="w-5 h-5" />
            {notificationsCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                {notificationsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
