import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import DashboardView from './features/dashboard/DashboardView';
import DocumentsView from './features/documents/DocumentsView';
import EventsView from './features/events/EventsView';
import UsersView from './features/users/UsersView';
import ConfigView from './features/config/ConfigView';
import NotificationsView from './features/notifications/NotificationsView';
import ReportsView from './features/reports/ReportsView';
import LogsView from './features/logs/LogsView';
import AccountView from './features/account/AccountView';
import SuperAdminLoginPage from './features/auth/SuperAdminLoginPage';
import { StorageService } from './core/storage';
import './index.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('zapatera_dark_mode') === 'true';
  });

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('zapatera_dark_mode', String(next));
      return next;
    });
  };

  // Local State synchronized with Storage Engine & Supabase
  const [currentUser, setCurrentUser] = useState(StorageService.getCurrentUser());
  const [users, setUsers] = useState(StorageService.getUsers());
  const [docTypes, setDocTypes] = useState(StorageService.getDocTypes());
  const [requests, setRequests] = useState(StorageService.getRequests());
  const [events, setEvents] = useState(StorageService.getEvents());
  const [config, setConfig] = useState(StorageService.getConfig());
  const [logs, setLogs] = useState(StorageService.getLogs());
  const [notifications, setNotifications] = useState(StorageService.getNotifications());

  const refreshState = async () => {
    setUsers(StorageService.getUsers());
    const docs = await StorageService.getDocTypesAsync();
    setDocTypes(docs);
    const evts = await StorageService.getEventsAsync();
    setEvents(evts);
    setRequests(StorageService.getRequests());
    setConfig(StorageService.getConfig());
    setLogs(StorageService.getLogs());
    setNotifications(StorageService.getNotifications());
    setCurrentUser(StorageService.getCurrentUser());
  };

  useEffect(() => {
    refreshState();
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    refreshState();
  };

  const handleLogout = () => {
    StorageService.setCurrentUser(null);
    setCurrentUser(null);
    refreshState();
  };

  // Handlers for Data Mutations
  const handleSaveDocType = async (docTypePayload) => {
    await StorageService.saveDocType(docTypePayload);
    await refreshState();
  };

  const handleDeleteDocType = async (docTypeId) => {
    await StorageService.deleteDocType(docTypeId);
    await refreshState();
  };

  const handleSaveEvent = async (eventPayload) => {
    await StorageService.saveEvent(eventPayload);
    await refreshState();
  };

  const handleDeleteEvent = async (eventId) => {
    await StorageService.deleteEvent(eventId);
    await refreshState();
  };

  const handleSaveUser = (userPayload) => {
    StorageService.saveUser(userPayload);
    refreshState();
  };

  const handleDeleteUser = (userId) => {
    StorageService.deleteUser(userId);
    refreshState();
  };

  const handleSaveConfig = (newConfig) => {
    const updated = StorageService.saveConfig(newConfig);
    setConfig(updated);
    refreshState();
  };

  const handleSendNotification = (notifPayload) => {
    StorageService.addNotification(notifPayload);
    refreshState();
  };

  // Auth Guard
  if (!currentUser || currentUser.role !== 'super_admin') {
    return <SuperAdminLoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Tab Titles Map
  const tabTitles = {
    dashboard: 'Super Admin System Dashboard',
    documents: 'Document Templates & Information Management',
    events: 'Community Events & Announcements',
    users: 'User Account Provisioning & Roles',
    config: 'Global System Configurations',
    notifications: 'Notifications & Broadcast Center',
    reports: 'Document Issuance Reports & Analytics',
    logs: 'System Security Audit Trail',
    account: 'My Account Profile & Security Settings',
  };

  return (
    <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-200 ${
      isDarkMode ? 'bg-slate-950 text-slate-100 dark' : 'bg-slate-100 text-slate-800'
    }`}>
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          activeTitle={tabTitles[activeTab]}
          notificationsCount={notifications.length}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
        />

        <main className={`flex-1 overflow-y-auto p-6 transition-colors duration-200 ${
          isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
        }`}>
          {activeTab === 'dashboard' && (
            <DashboardView
              users={users}
              docTypes={docTypes}
              requests={requests}
              events={events}
              logs={logs}
              config={config}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentsView
              docTypes={docTypes}
              onSaveDocType={handleSaveDocType}
              onDeleteDocType={handleDeleteDocType}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'events' && (
            <EventsView
              events={events}
              onSaveEvent={handleSaveEvent}
              onDeleteEvent={handleDeleteEvent}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'users' && (
            <UsersView
              users={users}
              onSaveUser={handleSaveUser}
              onDeleteUser={handleDeleteUser}
              isDarkMode={isDarkMode}
            />
          )}

          {activeTab === 'config' && (
            <ConfigView config={config} onSaveConfig={handleSaveConfig} />
          )}

          {activeTab === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              onSendNotification={handleSendNotification}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView requests={requests} docTypes={docTypes} users={users} />
          )}

          {activeTab === 'logs' && <LogsView logs={logs} />}

          {activeTab === 'account' && (
            <AccountView
              currentUser={currentUser}
              onUserUpdated={(updated) => {
                setCurrentUser(updated);
                refreshState();
              }}
              onLogout={handleLogout}
              isDarkMode={isDarkMode}
            />
          )}
        </main>
      </div>
    </div>
  );
}
