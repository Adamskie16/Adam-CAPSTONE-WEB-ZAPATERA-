// Resident/src/components/Modal.tsx
import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  darkMode?: boolean;
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl', darkMode = false }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`rounded-2xl shadow-2xl border w-full ${maxWidth} overflow-hidden transform transition-all ${
        darkMode
          ? 'bg-slate-900/95 border-slate-800 text-slate-100 backdrop-blur-xl'
          : 'bg-white border-slate-200 text-slate-800'
      }`}>
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          darkMode ? 'bg-gradient-to-r from-slate-900 to-slate-950 border-slate-800' : 'bg-slate-50/50 border-slate-100'
        }`}>
          <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{title}</h3>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
