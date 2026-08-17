// Resident/src/components/Navbar.tsx
import React from 'react';
import {
  FileText,
  Clock,
  Calendar,
  LogOut,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { ResidentUser } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: ResidentUser | null;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onLogout: () => void;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenLogin,
  onOpenRegister,
  onLogout,
}: NavbarProps) {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-lg pt-safe">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('request')}>
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-blue-500/30 bg-white flex items-center justify-center shrink-0">
            <img
              src="/logo.jpg"
              alt="Zapatera Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="font-bold text-base text-white tracking-tight leading-tight">Barangay Zapatera</h1>
            <p className="text-[10px] sm:text-[11px] text-blue-400 font-semibold uppercase tracking-wider">Resident Mobile Portal</p>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('request')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'request'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Request Document</span>
          </button>

          <button
            onClick={() => setActiveTab('status')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'status'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>View Status & History</span>
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'events'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Barangay Events</span>
          </button>
        </nav>

        {/* Auth Buttons / User Info */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {currentUser ? (
            <div className="flex items-center space-x-2 sm:space-x-3 sm:pl-3 sm:border-l sm:border-slate-800">
              <div className="text-right max-w-[140px] sm:max-w-none truncate">
                <p className="text-xs font-bold text-white leading-tight truncate">{currentUser.full_name}</p>
                <p className="text-[10px] text-blue-400 font-mono hidden sm:block truncate">{currentUser.email}</p>
              </div>
              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={onOpenLogin}
                className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center space-x-1"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
              <button
                onClick={onOpenRegister}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center space-x-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Register Account</span>
                <span className="sm:hidden">Register</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
