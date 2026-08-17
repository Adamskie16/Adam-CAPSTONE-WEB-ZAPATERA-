// SuperAdmin/src/features/notifications/NotificationsView.jsx
import React, { useState } from 'react';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { Bell, Send, Megaphone, CheckCircle2, ShieldAlert } from 'lucide-react';
import { formatDate, sanitizeInput } from '../../core/security';

export default function NotificationsView({ notifications, onSendNotification }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    role_target: 'residents',
    title: '',
    message: '',
    type: 'info',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSendNotification({
      role_target: formData.role_target,
      title: sanitizeInput(formData.title),
      message: sanitizeInput(formData.message),
      type: formData.type,
    });
    setIsModalOpen(false);
    setFormData({ role_target: 'residents', title: '', message: '', type: 'info' });
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">System Notifications & Broadcast Engine</h2>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch urgent public alerts, administrative updates, or targeted system announcements to residents and staff.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-900/20 transition-colors"
        >
          <Megaphone className="w-4 h-4" />
          <span>Broadcast New Announcement</span>
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Sent Broadcast History</h3>
          <span className="text-xs text-slate-500">{notifications.length} Total Alerts</span>
        </div>

        <div className="divide-y divide-slate-100">
          {notifications.map((notif) => (
            <div key={notif.id} className="p-5 flex items-start space-x-4 hover:bg-slate-50/80 transition-colors">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                notif.type === 'success' ? 'bg-emerald-100 text-emerald-700' :
                notif.type === 'warning' ? 'bg-amber-100 text-amber-700' :
                notif.type === 'alert' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
              }`}>
                <Bell className="w-5 h-5" />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">{notif.title}</h4>
                  <span className="text-[11px] text-slate-400">{formatDate(notif.created_at)}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                <div className="flex items-center space-x-3 pt-2">
                  <Badge variant="info">
                    Audience: {notif.role_target ? notif.role_target : 'Direct User'}
                  </Badge>
                  <Badge variant={notif.type}>{notif.type}</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Broadcast Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Broadcast System Notification"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience</label>
              <select
                value={formData.role_target}
                onChange={(e) => setFormData({ ...formData, role_target: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                <option value="residents">All Residents</option>
                <option value="admins">All Barangay Admins</option>
                <option value="super_admin">Super Admins</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Notification Priority Level</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="info">Information (Blue)</option>
                <option value="success">Success / Event (Green)</option>
                <option value="warning">Warning / Notice (Amber)</option>
                <option value="alert">Urgent Security Alert (Red)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Alert Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Scheduled Power Interruption Notice"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Message Body</label>
            <textarea
              rows={4}
              required
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Type notification text..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch Alert Broadcast</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
