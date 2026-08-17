import React from 'react';
import { ShieldCheck, UserCheck } from 'lucide-react';

export default function Navbar({ isDarkMode }) {
  return (
    <header className={`h-16 border-b px-6 flex items-center justify-between shrink-0 transition-colors ${
      isDarkMode ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      <div className="flex items-center space-x-3">
        <UserCheck className="w-5 h-5 text-blue-500" />
        <h2 className="font-bold text-sm">Account Creation & Management Center</h2>
      </div>

      <div className="flex items-center space-x-3">
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-950 text-blue-300 border border-blue-800 flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>Manual Account Provisioning Active</span>
        </span>
      </div>
    </header>
  );
}
