// Admin/src/components/Navbar.jsx
import React from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';

export default function Navbar({ activeTitle, pendingCount = 0 }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10 shadow-xs">
      <div className="flex items-center space-x-3">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">{activeTitle}</h2>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
          <CheckCircle2 className="w-3 h-3 mr-1 text-blue-600" /> Desk Verification Active
        </span>
      </div>

      <div className="flex items-center space-x-4">

        <div className="relative">
          <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors relative">
            <Bell className="w-5 h-5" />
            {pendingCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-amber-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
