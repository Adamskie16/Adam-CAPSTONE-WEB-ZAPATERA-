// Admin/src/features/logs/LogsView.jsx
import React, { useState, useEffect } from 'react';
import Badge from '../../components/Badge';
import { History, Search, RefreshCw, Terminal, Filter, Calendar } from 'lucide-react';
import { formatDate } from '../../core/security';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import { TableSkeleton } from '../../components/SkeletonLoader';

export default function LogsView() {
  const [logsList, setLogsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');

  // Date Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datePreset, setDatePreset] = useState('all');

  const fetchLiveLogs = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          setLogsList(data);
          setLoading(false);
          return;
        } else if (error) {
          console.warn('Supabase activity_logs query error:', error.message);
        }
      }
    } catch (err) {
      console.warn('Error fetching live admin activity logs from Supabase:', err);
    } finally {
      setLoading(false);
    }
    setLogsList([]);
  };

  useEffect(() => {
    fetchLiveLogs();
  }, []);

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      setStartDate(startOfWeek.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(startOfMonth.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    }
  };

  const filteredLogs = logsList.filter((log) => {
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    const matchesSearch =
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.details?.toLowerCase().includes(search.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      log.feature?.toLowerCase().includes(search.toLowerCase());

    let matchesDate = true;
    if (log.created_at) {
      const logDate = new Date(log.created_at);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (logDate < start) matchesDate = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (logDate > end) matchesDate = false;
      }
    }

    return matchesLevel && matchesSearch && matchesDate;
  });

  const getActionBadgeStyle = (action) => {
    const act = (action || '').toLowerCase();
    if (act.includes('created') || act.includes('posted') || act.includes('add')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (act.includes('edit') || act.includes('update') || act.includes('processed')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (act.includes('delete') || act.includes('remove')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (act.includes('lock') || act.includes('unlock') || act.includes('security')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Admin Operational Activity Logs</h2>
          <p className="text-xs text-slate-500 mt-1">
            Track document verifications, status changes, event announcements, and administrative actions.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchLiveLogs}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Refresh Activity Logs"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-900 text-blue-400">
            <Terminal className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
            {isSupabaseConfigured() ? 'Live Audit Trail Active' : 'System Audit Engine'}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Level Filter */}
          <div className="flex items-center space-x-2 overflow-x-auto">
            <Filter className="w-4 h-4 text-slate-400 mr-1 shrink-0" />
            {['all', 'info', 'warning', 'danger', 'security'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                  levelFilter === lvl
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              id="admin_logs_search_query"
              name="admin_logs_search_query"
              autoComplete="off"
              placeholder="Search by user, action, or module..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
        </div>

        {/* Date Filter Toolbar */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-700">Date Range:</span>
            <div className="flex items-center space-x-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setDatePreset('custom'); }}
                className="px-2.5 py-1 border border-slate-300 rounded-lg text-slate-700 font-mono focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setDatePreset('custom'); }}
                className="px-2.5 py-1 border border-slate-300 rounded-lg text-slate-700 font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Date Presets */}
          <div className="flex items-center space-x-1.5">
            {[
              { id: 'all', label: 'All Dates' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  datePreset === p.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}

            {(startDate || endDate) && (
              <button
                onClick={() => handlePresetChange('all')}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-600/20 text-rose-700 border border-rose-300 hover:bg-rose-600/30 transition-colors cursor-pointer"
                title="Reset Date Range"
              >
                Clear Date Filter ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Format matching Super Admin */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900 text-slate-300 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3.5">Date & Time</th>
                <th className="p-3.5">Performed By</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Module / Target</th>
                <th className="p-3.5">Activity Details</th>
                <th className="p-3.5">Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <TableSkeleton rows={8} cols={6} isDarkMode={false} />
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-sans text-xs">
                    No operational activity logs matching criteria found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => {
                  const userEmail = log.user_email || log.user || 'admin@zapatera.gov.ph';
                  const initial = userEmail.charAt(0).toUpperCase();
                  return (
                    <tr key={log.id || index} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 text-slate-500 text-[11px] whitespace-nowrap">{formatDate(log.created_at)}</td>
                      <td className="p-3.5">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-blue-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                            {initial}
                          </div>
                          <span className="font-semibold text-slate-900 font-sans text-xs">{userEmail}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border ${getActionBadgeStyle(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {log.feature || 'General'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-700 font-sans text-xs max-w-sm leading-relaxed">
                        {log.details}
                      </td>
                      <td className="p-3.5">
                        <Badge variant={log.level || 'info'}>{log.level || 'info'}</Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
