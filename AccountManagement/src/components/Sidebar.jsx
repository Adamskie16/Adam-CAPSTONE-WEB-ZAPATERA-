import React from 'react';
import { Users, History, LogOut, Moon, Sun, UserCheck } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout, isDarkMode, onToggleDarkMode }) {
  const menuItems = [
    { id: 'accounts', label: 'Account Management', icon: Users },
    { id: 'logs', label: 'Activity Logs', icon: History },
  ];

  return (
    <aside className={`w-64 border-r flex flex-col justify-between p-5 shrink-0 transition-colors ${
      isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-900 border-slate-800 text-white'
    }`}>
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white tracking-wide">Barangay Zapatera</h1>
            <p className="text-[11px] text-blue-400 font-medium">Account Provisioning Portal</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40 font-bold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Profile & Logout */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
            {currentUser?.full_name?.charAt(0) || 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{currentUser?.full_name || 'Admin User'}</p>
            <p className="text-[10px] text-slate-400 truncate">{currentUser?.email || 'admin@zapatera.gov.ph'}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onToggleDarkMode}
            className="flex-1 py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-blue-400" />}
            <span>{isDarkMode ? 'Light' : 'Dark'} Mode</span>
          </button>

          <button
            onClick={onLogout}
            title="Log Out"
            className="py-2 px-3 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/80 rounded-xl text-rose-300 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
