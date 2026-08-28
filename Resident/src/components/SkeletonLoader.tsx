// Resident/src/components/SkeletonLoader.tsx
import React from 'react';

export function SkeletonBox({ className = '', isDarkMode = false }: { className?: string; isDarkMode?: boolean }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${
        isDarkMode ? 'bg-slate-800/70' : 'bg-slate-200'
      } ${className}`}
    />
  );
}

export function SkeletonCircle({ size = 'w-10 h-10', isDarkMode = false, className = '' }: { size?: string; isDarkMode?: boolean; className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-full ${size} ${
        isDarkMode ? 'bg-slate-800/70' : 'bg-slate-200'
      } ${className}`}
    />
  );
}

export function TableSkeleton({ rows = 5, isDarkMode = false }: { rows?: number; isDarkMode?: boolean }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="animate-pulse">
          <td className="px-6 py-4">
            <div className="flex items-center space-x-3">
              <SkeletonCircle size="w-9 h-9" isDarkMode={isDarkMode} />
              <div className="space-y-2">
                <SkeletonBox className="w-32 h-3.5" isDarkMode={isDarkMode} />
                <SkeletonBox className="w-48 h-2.5 opacity-60" isDarkMode={isDarkMode} />
              </div>
            </div>
          </td>
          <td className="px-6 py-4">
            <SkeletonBox className="w-24 h-6 rounded-full" isDarkMode={isDarkMode} />
          </td>
          <td className="px-6 py-4 space-y-1.5">
            <SkeletonBox className="w-28 h-3" isDarkMode={isDarkMode} />
            <SkeletonBox className="w-36 h-2.5 opacity-60" isDarkMode={isDarkMode} />
          </td>
          <td className="px-6 py-4">
            <SkeletonBox className="w-28 h-6 rounded-full" isDarkMode={isDarkMode} />
          </td>
          <td className="px-6 py-4 text-right">
            <div className="flex items-center justify-end space-x-2">
              <SkeletonBox className="w-7 h-7 rounded-lg" isDarkMode={isDarkMode} />
              <SkeletonBox className="w-7 h-7 rounded-lg" isDarkMode={isDarkMode} />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

export function StatCardSkeleton({ isDarkMode = false }: { isDarkMode?: boolean }) {
  return (
    <div
      className={`p-6 rounded-2xl border transition-all animate-pulse ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBox className="w-24 h-3.5" isDarkMode={isDarkMode} />
          <SkeletonBox className="w-16 h-7" isDarkMode={isDarkMode} />
        </div>
        <SkeletonCircle size="w-12 h-12" isDarkMode={isDarkMode} />
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <SkeletonBox className="w-32 h-3" isDarkMode={isDarkMode} />
      </div>
    </div>
  );
}

export function DashboardSkeleton({ isDarkMode = false }: { isDarkMode?: boolean }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <SkeletonBox className="w-48 h-6" isDarkMode={isDarkMode} />
          <SkeletonBox className="w-72 h-4 opacity-70" isDarkMode={isDarkMode} />
        </div>
        <SkeletonBox className="w-36 h-10 rounded-xl" isDarkMode={isDarkMode} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} isDarkMode={isDarkMode} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className={`lg:col-span-2 p-6 rounded-2xl border space-y-4 ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex justify-between items-center">
            <SkeletonBox className="w-40 h-5" isDarkMode={isDarkMode} />
            <SkeletonBox className="w-24 h-8 rounded-lg" isDarkMode={isDarkMode} />
          </div>
          <SkeletonBox className="w-full h-64 rounded-xl" isDarkMode={isDarkMode} />
        </div>

        <div
          className={`p-6 rounded-2xl border space-y-4 ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <SkeletonBox className="w-36 h-5" isDarkMode={isDarkMode} />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex items-center space-x-3">
                <SkeletonCircle size="w-8 h-8" isDarkMode={isDarkMode} />
                <div className="space-y-1.5 flex-1">
                  <SkeletonBox className="w-full h-3" isDarkMode={isDarkMode} />
                  <SkeletonBox className="w-24 h-2 opacity-60" isDarkMode={isDarkMode} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6, isDarkMode = false }: { count?: number; isDarkMode?: boolean }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`p-6 rounded-2xl border space-y-4 animate-pulse ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <SkeletonBox className="w-36 h-4" isDarkMode={isDarkMode} />
              <SkeletonBox className="w-20 h-3 opacity-60" isDarkMode={isDarkMode} />
            </div>
            <SkeletonBox className="w-16 h-6 rounded-full" isDarkMode={isDarkMode} />
          </div>
          <SkeletonBox className="w-full h-16 rounded-lg opacity-60" isDarkMode={isDarkMode} />
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between">
            <SkeletonBox className="w-24 h-4" isDarkMode={isDarkMode} />
            <SkeletonBox className="w-20 h-8 rounded-lg" isDarkMode={isDarkMode} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default {
  SkeletonBox,
  SkeletonCircle,
  TableSkeleton,
  StatCardSkeleton,
  DashboardSkeleton,
  CardGridSkeleton,
};
