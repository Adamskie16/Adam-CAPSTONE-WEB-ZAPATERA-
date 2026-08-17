// SuperAdmin/src/components/Sidebar.jsx
import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Users,
  Settings,
  Bell,
  BarChart3,
  History,
  LogOut,
  User,
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout, isDarkMode }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'documents', label: 'Document Info Mgmt', icon: FileText },
    { id: 'events', label: 'Event Info Mgmt', icon: Calendar },
    { id: 'users', label: 'User Account Mgmt', icon: Users },
    { id: 'config', label: 'System Configurations', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'reports', label: 'System Reports', icon: BarChart3 },
    { id: 'logs', label: 'Activity Logs', icon: History },
    { id: 'account', label: 'My Account Profile', icon: User },
  ];

  return (
    <aside className={`w-64 flex flex-col min-h-screen border-r shadow-xl transition-colors duration-200 ${
      isDarkMode
        ? 'bg-slate-900 text-slate-100 border-slate-800'
        : 'bg-slate-900 text-slate-100 border-slate-800'
    }`}>
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3 bg-slate-950/60">
        <div className="w-12 h-12 rounded-xl overflow-hidden border border-blue-500/30 bg-white flex items-center justify-center">
          <img
            src="/logo.jpg"
            alt="Zapatera Logo"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h1 className="font-bold text-base text-white tracking-wide leading-snug">Zapatera</h1>
          <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Super Admin Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Main Menu
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 font-semibold'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser?.full_name?.charAt(0) || 'S'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{currentUser?.full_name || 'Super Admin'}</p>
              <p className="text-[11px] text-slate-400 truncate">{currentUser?.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Logout"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
