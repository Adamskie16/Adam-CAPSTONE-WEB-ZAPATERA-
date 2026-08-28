// Admin/src/features/users/UserManagementView.jsx
import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  Shield,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  IdCard,
  Calendar,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import { unlockUserAccount, lockUserAccount, formatDate } from '../../core/security';
import { StorageService } from '../../core/storage';
import { TableSkeleton } from '../../components/SkeletonLoader';

export default function UserManagementView({ currentUser }) {
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'locked'
  const [search, setSearch] = useState('');

  // Credentials Detail Modal State
  const [viewingUser, setViewingUser] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Security Verification Modal State (Lock / Unlock Action)
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [actionType, setActionType] = useState('unlock'); // 'unlock' or 'lock'
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [securityError, setSecurityError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchUsers = async (showLoading = false) => {
    if (showLoading) setLoadingUsers(true);
    try {
      if (isSupabaseConfigured()) {
        const { data: supaProfiles, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        // Also fetch pending unlock requests to guarantee real-time locked status across all origins
        const { data: unlockRequests } = await supabase
          .from('account_unlock_requests')
          .select('*')
          .eq('status', 'pending');

        const lockedEmailMap = new Map();
        if (unlockRequests) {
          unlockRequests.forEach((req) => {
            if (req.email) {
              lockedEmailMap.set(req.email.toLowerCase(), req);
            }
          });
        }

        if (!error && supaProfiles) {
          const seenEmails = new Set();
          const uniqueProfiles = [];

          for (const p of supaProfiles) {
            const cleanEmail = (p.email || '').toLowerCase().trim();
            if (!cleanEmail || seenEmails.has(cleanEmail)) continue;
            seenEmails.add(cleanEmail);

            const hasPendingUnlock = lockedEmailMap.has(cleanEmail);
            const isLocked = p.is_locked || (p.failed_attempts || 0) >= 3 || p.is_active === false || hasPendingUnlock;

            uniqueProfiles.push({
              ...p,
              email: cleanEmail,
              is_locked: isLocked,
              is_active: !isLocked,
              failed_attempts: isLocked ? Math.max(p.failed_attempts || 0, 3) : (p.failed_attempts || 0),
              locked_at: p.locked_at || (hasPendingUnlock ? lockedEmailMap.get(cleanEmail)?.locked_at : null),
            });
          }

          setUsersList(uniqueProfiles);
          setLoadingUsers(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Notice: Supabase profiles fetch error:', err);
    }
    setUsersList([]);
    setLoadingUsers(false);
  };

  useEffect(() => {
    fetchUsers(true);

    // Auto-refresh every 3 seconds to catch lockout events live
    const interval = setInterval(() => {
      fetchUsers(false);
    }, 3000);

    const handleFocus = () => fetchUsers(false);
    window.addEventListener('focus', handleFocus);

    let channel = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('zapatera_security_channel');
      channel.onmessage = (event) => {
        if (event.data?.type === 'ACCOUNT_LOCKED' || event.data?.type === 'ACCOUNT_UNLOCKED') {
          fetchUsers(false);
        }
      };
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      if (channel) channel.close();
    };
  }, []);

  // Verify Admin Password
  async function verifyAdminPassword(inputPassword) {
    if (!inputPassword) return false;

    const loggedInUser =
      currentUser ||
      StorageService.getCurrentUser() ||
      JSON.parse(localStorage.getItem('zapatera_admin_session') || 'null');

    const loggedInEmail = (loggedInUser?.email || '').trim().toLowerCase();
    if (!loggedInEmail) return false;

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loggedInEmail,
          password: inputPassword,
        });
        if (!error && data?.user) return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  // Open Security Modal for Lock / Unlock Action
  const initiateAction = (user, type) => {
    setTargetUser(user);
    setActionType(type);
    setAdminPassword('');
    setSecurityError('');
    setShowAdminPassword(false);
    setIsSecurityModalOpen(true);
  };

  // Execute Lock or Unlock Action after Password Authorization
  const handleExecuteSecurityAction = async () => {
    if (!adminPassword.trim() || !targetUser) return;
    setSecurityError('');

    const isValid = await verifyAdminPassword(adminPassword);
    if (!isValid) {
      setSecurityError('Security Authorization Failed: Incorrect admin password.');
      return;
    }

    setIsProcessing(true);
    const adminEmail = currentUser?.email || 'admin@zapatera.gov.ph';

    try {
      if (actionType === 'unlock') {
        await unlockUserAccount(targetUser.email, adminEmail);
      } else {
        await lockUserAccount(targetUser.email, adminEmail, 'Manual Admin Lockout');
      }

      await fetchUsers();
    } catch (err) {
      console.warn('Security action error:', err);
    } finally {
      setIsProcessing(false);
      setIsSecurityModalOpen(false);
      setTargetUser(null);
      setAdminPassword('');
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const isLocked = u.is_locked || (u.failed_attempts || 0) >= 3 || u.is_active === false || (typeof localStorage !== 'undefined' && localStorage.getItem(`zapatera_locked_${u.email}`) === 'true');
    const matchesStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'locked'
        ? isLocked
        : !isLocked;

    const searchLower = search.toLowerCase();
    const matchesSearch =
      (u.full_name || '').toLowerCase().includes(searchLower) ||
      (u.email || '').toLowerCase().includes(searchLower) ||
      (u.phone || '').toLowerCase().includes(searchLower) ||
      (u.id_number || '').toLowerCase().includes(searchLower);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <Shield className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900">User Account Management & Security</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            View user credentials safely, monitor 3-attempt lockouts, and manage account lock/unlock access controls.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loadingUsers}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-semibold border border-blue-200 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : ''}`} />
          <span>Sync Accounts</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200">
        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All Accounts' },
            { id: 'active', label: 'Active Accounts' },
            { id: 'locked', label: 'Locked Out (3 Failures)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterStatus === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            id="admin_user_mgmt_search"
            name="admin_user_mgmt_search"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, or ID..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="px-6 py-3.5">Account Identity</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Contact & Location</th>
                <th className="px-6 py-3.5">Security & Lock Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loadingUsers ? (
                <TableSkeleton rows={6} cols={5} isDarkMode={false} />
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No matching user accounts found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isLocked = u.is_locked || (u.failed_attempts || 0) >= 3;
                  return (
                    <tr key={u.id || u.email} className="hover:bg-slate-50/80 transition-colors text-slate-700">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                              u.role === 'super_admin'
                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                : u.role === 'admin'
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {(u.full_name || u.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{u.full_name || 'Resident Account'}</p>
                            <p className="text-[11px] text-slate-500 font-mono">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <Badge variant={u.role === 'super_admin' ? 'purple' : u.role === 'admin' ? 'blue' : 'active'}>
                          {u.role === 'super_admin' ? 'Super Admin' : u.role === 'admin' ? 'Barangay Admin' : 'Resident'}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 space-y-0.5 text-[11px]">
                        <p className="text-slate-600">{u.phone || 'No phone registered'}</p>
                        <p className="text-slate-400 truncate max-w-xs">{u.address || 'Barangay Zapatera, Cebu City'}</p>
                      </td>

                      <td className="px-6 py-4">
                        {isLocked ? (
                          <div className="inline-flex flex-col space-y-1">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <Lock className="w-3 h-3 mr-1" />
                              <span>Locked ({Math.max(u.failed_attempts || 0, 3)}/3 Failed)</span>
                            </span>
                            {u.locked_at && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Locked: {formatDate(u.locked_at)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            <span>Active (Secure)</span>
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* View Credentials */}
                          <button
                            onClick={() => {
                              setViewingUser(u);
                              setIsViewModalOpen(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="View Account Credentials Safely"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Lock / Unlock Toggle Action */}
                          {isLocked ? (
                            <button
                              onClick={() => initiateAction(u, 'unlock')}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                              title="Unlock Resident Account"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Unlock</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => initiateAction(u, 'lock')}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                              title="Lock Account"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Lock Account</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safe Credentials View Modal */}
      {isViewModalOpen && viewingUser && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewingUser(null);
          }}
          title="Account Credential Profile"
        >
          <div className="space-y-6">
            <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-base flex items-center justify-center">
                {(viewingUser.full_name || viewingUser.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">{viewingUser.full_name || 'Resident'}</h4>
                <p className="text-xs text-slate-500 font-mono">{viewingUser.email}</p>
                <Badge variant={viewingUser.role === 'admin' ? 'blue' : 'active'} className="mt-1">
                  {viewingUser.role === 'admin' ? 'Barangay Admin' : 'Resident'}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Mail className="w-3 h-3 text-blue-600" /> Gmail / Email
                </span>
                <p className="font-semibold text-slate-800 font-mono">{viewingUser.email}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Phone className="w-3 h-3 text-blue-600" /> Phone Number
                </span>
                <p className="font-semibold text-slate-800">{viewingUser.phone || 'Not registered'}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <IdCard className="w-3 h-3 text-blue-600" /> Verification ID
                </span>
                <p className="font-semibold text-slate-800">
                  {viewingUser.id_type || 'Government ID'}: {viewingUser.id_number || 'N/A'}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-600" /> Barangay Address
                </span>
                <p className="font-semibold text-slate-800">{viewingUser.address || 'Barangay Zapatera, Cebu City'}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Security & Lock Status
              </span>
              <div className="flex items-center justify-between text-xs">
                <span>Failed Attempt Count:</span>
                <span className="font-bold text-slate-900">{viewingUser.failed_attempts || 0} / 3</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Account Lock Status:</span>
                <span className={`font-bold ${viewingUser.is_locked || (viewingUser.failed_attempts || 0) >= 3 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {viewingUser.is_locked || (viewingUser.failed_attempts || 0) >= 3 ? 'Locked Out' : 'Active & Verified'}
                </span>
              </div>
              {viewingUser.locked_at && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                  <span>Timestamp Locked:</span>
                  <span className="font-mono text-slate-600">{formatDate(viewingUser.locked_at)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setViewingUser(null);
                }}
                className="px-5 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-300 transition-colors cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Security Password Authorization Modal */}
      {isSecurityModalOpen && targetUser && (
        <Modal
          isOpen={isSecurityModalOpen}
          onClose={() => {
            setIsSecurityModalOpen(false);
            setTargetUser(null);
            setAdminPassword('');
            setSecurityError('');
          }}
          title={actionType === 'unlock' ? 'Authorize Account Unlock' : 'Authorize Account Lockout'}
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3 text-amber-800">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Security Verification Required</p>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  You are about to {actionType === 'unlock' ? 'unlock' : 'lock'} account access for{' '}
                  <span className="font-bold text-amber-950">{targetUser.full_name || targetUser.email}</span>.
                  Please confirm your logged-in Admin Password to proceed.
                </p>
              </div>
            </div>

            {securityError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {securityError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Logged-in Admin Password</label>
              <div className="relative">
                <input
                  type={showAdminPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter admin password to authorize..."
                  className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsSecurityModalOpen(false);
                  setTargetUser(null);
                  setAdminPassword('');
                  setSecurityError('');
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl transition-colors cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteSecurityAction}
                disabled={isProcessing || !adminPassword.trim()}
                className={`px-6 py-2 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer text-xs flex items-center space-x-1.5 ${
                  actionType === 'unlock'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                }`}
              >
                {isProcessing && <Loader2 size={14} className="animate-spin" />}
                <span>{actionType === 'unlock' ? 'Authorize Unlock' : 'Authorize Lock'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
