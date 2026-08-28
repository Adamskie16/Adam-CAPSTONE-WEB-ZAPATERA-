// SuperAdmin/src/core/storage.js
// Data Service & Storage Engine with Supabase & Offline Synchronization

import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEYS = {
  SUPER_ADMINS: 'zapatera_super_admins_db',
  DOC_TYPES: 'zapatera_doc_types_db',
  REQUESTS: 'zapatera_requests_db',
  EVENTS: 'zapatera_events_db',
  CONFIG: 'zapatera_config_db',
  LOGS: 'zapatera_logs_db',
  NOTIFICATIONS: 'zapatera_notifications_db',
  SESSION: 'zapatera_superadmin_session',
};

// Seed Initial Super Admin Data
const INITIAL_SUPER_ADMINS = [
  {
    id: 'sa-000',
    email: 'mardee131@gmail.com',
    password: '123456789',
    full_name: 'Mardee (Super Admin)',
    first_name: 'Mardee',
    last_name: 'Admin',
    middle_initial: 'M',
    role: 'super_admin',
    phone: '09171234567',
    address: 'Barangay Hall, Zapatera, Cebu City',
    id_type: 'Government ID',
    id_number: 'SA-00001',
    is_active: true,
    failed_attempts: 0,
    is_locked: false,
    created_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'sa-001',
    email: 'superadmin@zapatera.gov.ph',
    full_name: 'Hon. Executive Officer',
    first_name: 'Executive',
    last_name: 'Officer',
    middle_initial: 'H',
    role: 'super_admin',
    phone: '09171234567',
    address: 'Barangay Hall, Zapatera, Cebu City',
    id_type: 'Government ID',
    id_number: 'SA-99081',
    is_active: true,
    failed_attempts: 0,
    is_locked: false,
    created_at: new Date('2026-01-01').toISOString(),
  }
];

const INITIAL_DOC_TYPES = [];

const INITIAL_REQUESTS = [
  {
    id: 'req-101',
    tracking_number: 'BZ-2026-9041',
    resident_id: 'usr-003',
    resident_name: 'Juan Dela Cruz',
    resident_email: 'resident@gmail.com',
    document_type_id: 'dt-001',
    document_title: 'Barangay Clearance',
    fee: 50.00,
    purpose: 'Local Employment Application',
    requirements_attached: ['Government_ID_Front.jpg', 'Electric_Bill_Jan2026.pdf'],
    pickup_time_slot: '3:00 PM - 3:30 PM',
    status: 'under_review',
    notes: 'Uploaded ID verified against resident record.',
    rejection_reason: '',
    processed_by: 'Maria Santos',
    created_at: new Date('2026-07-20T10:30:00').toISOString(),
    updated_at: new Date('2026-07-21T09:15:00').toISOString(),
  },
  {
    id: 'req-102',
    tracking_number: 'BZ-2026-8812',
    resident_id: 'usr-004',
    resident_name: 'Ana Reyes',
    resident_email: 'ana.reyes@gmail.com',
    document_type_id: 'dt-002',
    document_title: 'Certificate of Indigency',
    fee: 0.00,
    purpose: 'Medical Assistance at Vicente Sotto Hospital',
    requirements_attached: ['Affidavit_Indigency.pdf', 'Barangay_ID.jpg'],
    pickup_time_slot: '1:30 PM - 2:00 PM',
    status: 'approved',
    notes: 'Approved by Barangay Secretary.',
    rejection_reason: '',
    processed_by: 'Maria Santos',
    approved_at: new Date('2026-07-21T14:20:00').toISOString(),
    created_at: new Date('2026-07-19T08:10:00').toISOString(),
    updated_at: new Date('2026-07-21T14:20:00').toISOString(),
  },
  {
    id: 'req-103',
    tracking_number: 'BZ-2026-7734',
    resident_id: 'usr-003',
    resident_name: 'Juan Dela Cruz',
    resident_email: 'resident@gmail.com',
    document_type_id: 'dt-004',
    document_title: 'Barangay Business Permit',
    fee: 250.00,
    purpose: 'Sari-Sari Store Operation',
    requirements_attached: ['DTI_Permit_2026.pdf'],
    pickup_time_slot: '3:30 PM - 4:00 PM',
    status: 'pending',
    notes: '',
    rejection_reason: '',
    processed_by: '',
    created_at: new Date('2026-07-22T08:00:00').toISOString(),
    updated_at: new Date('2026-07-22T08:00:00').toISOString(),
  }
];

const INITIAL_EVENTS = [];

const INITIAL_CONFIG = {
  barangay_name: 'Barangay Zapatera',
  municipality: 'Cebu City',
  province: 'Cebu',
  seal_url: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=300&q=80',
  office_hours: 'Mon - Fri: 8:00 AM - 5:00 PM',
  contact_email: 'info@barangayzapatera.gov.ph',
  contact_phone: '(032) 253-1234',
  doc_prefix: 'BZ-2026',
  auto_notify: true,
  updated_at: new Date().toISOString(),
};

const INITIAL_LOGS = [];

const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-001',
    user_id: 'usr-003',
    role_target: null,
    title: 'Request Under Review',
    message: 'Your request for Barangay Clearance (BZ-2026-9041) is currently being processed by admin.',
    type: 'info',
    is_read: false,
    created_at: new Date('2026-07-21T09:15:00').toISOString(),
  },
  {
    id: 'notif-002',
    user_id: null,
    role_target: 'residents',
    title: 'New Event Announced',
    message: 'Barangay Health & Wellness Medical Mission scheduled for August 5, 2026.',
    type: 'success',
    is_read: false,
    created_at: new Date('2026-07-15').toISOString(),
  }
];

// Helper to initialize local storage
const initializeStorage = () => {
  if (!localStorage.getItem(STORAGE_KEYS.SUPER_ADMINS)) {
    localStorage.setItem(STORAGE_KEYS.SUPER_ADMINS, JSON.stringify(INITIAL_SUPER_ADMINS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.DOC_TYPES)) {
    localStorage.setItem(STORAGE_KEYS.DOC_TYPES, JSON.stringify(INITIAL_DOC_TYPES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.REQUESTS)) {
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(INITIAL_REQUESTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.EVENTS)) {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(INITIAL_EVENTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CONFIG)) {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(INITIAL_CONFIG));
  }
  if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_LOGS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
  }
};

initializeStorage();

// Storage Service Class
export const StorageService = {
  // SUPER ADMINS (Targeting 'super_admins' table in Supabase)
  getUsers: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SUPER_ADMINS) || '[]');
    } catch {
      return INITIAL_SUPER_ADMINS;
    }
  },
  saveUser: (user) => {
    const users = StorageService.getUsers();
    const existingIndex = users.findIndex((u) => u.id === user.id || u.email === user.email);
    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...user };
    } else {
      user.id = user.id || `sa-${Date.now()}`;
      user.created_at = new Date().toISOString();
      users.push(user);
    }
    localStorage.setItem(STORAGE_KEYS.SUPER_ADMINS, JSON.stringify(users));

    // Supabase sync if configured
    try {
      if (isSupabaseConfigured()) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
        const profilePayload = {
          email: user.email,
          full_name: user.full_name,
          role: user.role || 'resident',
          phone: user.phone || '',
          address: user.address || '',
          id_type: user.id_type || '',
          id_number: user.id_number || '',
          is_active: user.is_active !== false,
          updated_at: new Date().toISOString(),
        };

        if (isUuid) {
          profilePayload.id = user.id;
          supabase.from('profiles').upsert(profilePayload);
        } else {
          supabase.from('profiles').upsert(profilePayload, { onConflict: 'email' });
        }
      }
    } catch (err) {
      console.warn('Supabase profiles sync notice:', err);
    }

    StorageService.addLog({
      user_email: 'superadmin@zapatera.gov.ph',
      action: existingIndex >= 0 ? 'Edited User Account' : 'Created User Account',
      feature: 'User Account Management',
      details: `User: ${user.full_name || user.email} (${user.email}), Role: ${user.role || 'resident'}`,
      level: 'info',
    });

    return user;
  },
  deleteUser: (userId) => {
    let users = StorageService.getUsers();
    const target = users.find((u) => u.id === userId);
    users = users.filter((u) => u.id !== userId);
    localStorage.setItem(STORAGE_KEYS.SUPER_ADMINS, JSON.stringify(users));

    try {
      if (isSupabaseConfigured()) {
        if (userId) {
          supabase.from('profiles').delete().eq('id', userId);
        }
        if (target && target.email) {
          supabase.from('profiles').delete().eq('email', target.email);
        }
      }
    } catch (err) {
      console.warn('Supabase delete user notice:', err);
    }

    StorageService.addLog({
      user_email: 'superadmin@zapatera.gov.ph',
      action: 'Deleted User Account',
      feature: 'User Account Management',
      details: `Deleted user account for ${target ? target.email : userId}`,
      level: 'danger',
    });
  },

  // DOCUMENT TYPES
  getDocTypes: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.DOC_TYPES) || '[]');
    } catch {
      return INITIAL_DOC_TYPES;
    }
  },
  getDocTypesAsync: async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('document_types')
          .select('*')
          .order('created_at', { ascending: true });

        if (data && !error) {
          const formatted = data.map((d) => ({
            id: d.id,
            code: d.code,
            title: d.title,
            description: d.description,
            fee: Number(d.fee) || 0,
            processing_days: Number(d.processing_days) || 1,
            requirements: Array.isArray(d.requirements)
              ? d.requirements
              : typeof d.requirements === 'string'
              ? JSON.parse(d.requirements)
              : [],
            is_active: d.is_active !== false,
            created_at: d.created_at,
          }));
          localStorage.setItem(STORAGE_KEYS.DOC_TYPES, JSON.stringify(formatted));
          return formatted;
        }
      }
    } catch (err) {
      console.warn('Supabase fetch doc_types notice:', err);
    }
    return StorageService.getDocTypes();
  },
  saveDocType: async (docType) => {
    const docTypes = StorageService.getDocTypes();
    const existingIndex = docTypes.findIndex((d) => d.id === docType.id || d.code === docType.code);
    let updatedDoc = { ...docType };

    if (existingIndex >= 0) {
      docTypes[existingIndex] = { ...docTypes[existingIndex], ...docType };
      updatedDoc = docTypes[existingIndex];
    } else {
      updatedDoc.id = updatedDoc.id || `dt-${Date.now()}`;
      updatedDoc.created_at = new Date().toISOString();
      docTypes.push(updatedDoc);
    }
    localStorage.setItem(STORAGE_KEYS.DOC_TYPES, JSON.stringify(docTypes));

    // Supabase sync
    try {
      if (isSupabaseConfigured()) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updatedDoc.id);
        const payload = {
          code: updatedDoc.code,
          title: updatedDoc.title,
          description: updatedDoc.description,
          fee: Number(updatedDoc.fee) || 0,
          processing_days: Number(updatedDoc.processing_days) || 1,
          requirements: Array.isArray(updatedDoc.requirements) ? updatedDoc.requirements : [],
          is_active: updatedDoc.is_active !== false,
          updated_at: new Date().toISOString(),
        };

        if (isUuid) {
          payload.id = updatedDoc.id;
          await supabase.from('document_types').upsert(payload);
        } else {
          await supabase.from('document_types').upsert(payload, { onConflict: 'code' });
        }
      }
    } catch (err) {
      console.warn('Supabase save doc_types notice:', err);
    }

    StorageService.addLog({
      user_email: 'superadmin@zapatera.gov.ph',
      action: existingIndex >= 0 ? 'Edited Document Info' : 'Created Document Info',
      feature: 'Document Info Management',
      details: `Title: ${updatedDoc.title}, Code: ${updatedDoc.code}, Fee: ₱${updatedDoc.fee}`,
      level: 'info',
    });

    return updatedDoc;
  },
  deleteDocType: async (docTypeId) => {
    let docTypes = StorageService.getDocTypes();
    const target = docTypes.find((d) => d.id === docTypeId);
    docTypes = docTypes.filter((d) => d.id !== docTypeId);
    localStorage.setItem(STORAGE_KEYS.DOC_TYPES, JSON.stringify(docTypes));

    try {
      if (isSupabaseConfigured()) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(docTypeId);
        if (isUuid) {
          await supabase.from('document_types').delete().eq('id', docTypeId);
        } else if (target && target.code) {
          await supabase.from('document_types').delete().eq('code', target.code);
        }
      }
    } catch (err) {
      console.warn('Supabase delete doc_types notice:', err);
    }

    StorageService.addLog({
      user_email: 'superadmin@zapatera.gov.ph',
      action: 'Deleted Document Info',
      feature: 'Document Info Management',
      details: `Deleted document type "${target ? target.title : docTypeId}"`,
      level: 'danger',
    });
  },

  // REQUESTS
  getRequests: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.REQUESTS) || '[]');
    } catch {
      return INITIAL_REQUESTS;
    }
  },
  saveRequest: (req) => {
    const requests = StorageService.getRequests();
    const existingIndex = requests.findIndex((r) => r.id === req.id);
    req.updated_at = new Date().toISOString();
    if (existingIndex >= 0) {
      requests[existingIndex] = { ...requests[existingIndex], ...req };
    } else {
      req.id = req.id || `req-${Date.now()}`;
      req.created_at = new Date().toISOString();
      requests.unshift(req);
    }
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));

    // Audit log entry
    StorageService.addLog({
      user_email: req.resident_email || 'resident@gmail.com',
      action: existingIndex >= 0 ? `Request Status Updated (${req.status})` : 'New Document Requested',
      feature: 'Document Request',
      details: `Tracking Number: ${req.tracking_number}, Status: ${req.status}`,
      level: 'info',
    });

    return req;
  },

  // EVENTS
  getEvents: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
    } catch {
      return INITIAL_EVENTS;
    }
  },
  getEventsAsync: async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('events')
          .select('*, profiles:created_by(full_name, email)')
          .order('event_date', { ascending: true });

        if (data && !error) {
          const formatted = data.map((evt) => ({
            ...evt,
            created_by_name: evt.profiles?.full_name || evt.profiles?.email || evt.created_by_name || (typeof evt.created_by === 'string' && !/^[0-9a-f-]{36}$/i.test(evt.created_by) && evt.created_by !== 'null' ? evt.created_by : null) || 'Super Admin',
          }));
          localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(formatted));
          return formatted;
        }
      }
    } catch (err) {
      console.warn('Supabase fetch events notice:', err);
    }
    return StorageService.getEvents();
  },
  saveEvent: async (event) => {
    const events = StorageService.getEvents();
    const existingIndex = events.findIndex((e) => e.id === event.id);
    let saved = { ...event };

    if (existingIndex >= 0) {
      events[existingIndex] = { ...events[existingIndex], ...event };
      saved = events[existingIndex];
    } else {
      saved.id = saved.id || `evt-${Date.now()}`;
      saved.created_at = new Date().toISOString();
      events.unshift(saved);
    }
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));

    // Async post to Supabase database if configured
    try {
      if (isSupabaseConfigured()) {
        const isUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
        
        let profileId = isUuid(saved.created_by) ? saved.created_by : null;
        if (!profileId && (saved.created_by_email || saved.created_by_name)) {
          const emailToFind = saved.created_by_email || (saved.created_by_name?.includes('@') ? saved.created_by_name : null);
          if (emailToFind) {
            const { data: p } = await supabase.from('profiles').select('id').eq('email', emailToFind).maybeSingle();
            if (p?.id) profileId = p.id;
          }
        }

        const payload = {
          title: saved.title,
          description: saved.description,
          event_date: saved.event_date,
          location: saved.location,
          target_audience: saved.target_audience || 'all',
          image_url: saved.image_url,
          status: saved.status || 'upcoming',
          created_by: profileId,
          updated_at: new Date().toISOString(),
        };

        if (isUuid(saved.id)) {
          payload.id = saved.id;
          await supabase.from('events').upsert(payload);
        } else {
          const { data } = await supabase.from('events').insert([payload]).select();
          if (data && data[0]) {
            saved.id = data[0].id;
          }
        }
      }
    } catch (err) {
      console.warn('Supabase event sync notice:', err);
    }

    StorageService.addLog({
      user_email: saved.created_by_email || (typeof saved.created_by === 'string' && saved.created_by.includes('@') ? saved.created_by : null) || saved.created_by_name || 'superadmin@zapatera.gov.ph',
      action: existingIndex >= 0 ? 'Updated Barangay Event' : 'Posted New Barangay Event',
      feature: 'Event Information Management',
      details: `Title: ${saved.title}, Date: ${saved.event_date}, Venue: ${saved.location}`,
      level: 'info',
    });

    return saved;
  },
  deleteEvent: async (eventId) => {
    let events = StorageService.getEvents();
    const target = events.find((e) => e.id === eventId);
    events = events.filter((e) => e.id !== eventId);
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));

    try {
      if (isSupabaseConfigured()) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);
        if (isUuid) {
          await supabase.from('events').delete().eq('id', eventId);
        } else if (target) {
          await supabase.from('events').delete().eq('title', target.title);
        }
      }
    } catch (err) {
      console.warn('Supabase event delete notice:', err);
    }

    StorageService.addLog({
      user_email: (target && (target.created_by_email || target.created_by_name)) || 'superadmin@zapatera.gov.ph',
      action: 'Deleted Barangay Event',
      feature: 'Barangay Events',
      details: `Deleted event "${target ? target.title : eventId}"`,
      level: 'danger',
    });
  },

  // SYSTEM CONFIG
  getConfig: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG) || JSON.stringify(INITIAL_CONFIG));
    } catch {
      return INITIAL_CONFIG;
    }
  },
  saveConfig: (config) => {
    const updated = { ...config, updated_at: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(updated));
    StorageService.addLog({
      user_email: 'superadmin@zapatera.gov.ph',
      action: 'System Settings Updated',
      feature: 'System Configuration',
      details: 'Super Admin updated barangay contact and operational parameters.',
      level: 'info',
    });
    return updated;
  },

  // LOGS
  getLogs: () => {
    return [];
  },
  getLogsAsync: async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data;
        }
      }
    } catch (err) {
      console.warn('Supabase getLogs notice:', err);
    }
    return [];
  },
  addLog: async (log) => {
    if (isSupabaseConfigured()) {
      try {
        const payload = {
          user_id: log.user_id || null,
          user_email: log.user_email || 'system@zapatera.gov.ph',
          action: log.action || 'System Action',
          feature: log.feature || 'General',
          details: log.details || '',
          level: log.level || 'info',
          created_at: new Date().toISOString(),
        };
        await supabase.from('activity_logs').insert([payload]);
      } catch (err) {
        console.warn('Supabase audit_logs insert exception:', err);
      }
    }
    return null;
  },

  // NOTIFICATIONS
  getNotifications: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  },
  addNotification: (notif) => {
    const notifs = StorageService.getNotifications();
    const newNotif = {
      id: `notif-${Date.now()}`,
      user_id: notif.user_id || null,
      role_target: notif.role_target || null,
      title: notif.title,
      message: notif.message,
      type: notif.type || 'info',
      is_read: false,
      created_at: new Date().toISOString(),
    };
    notifs.unshift(newNotif);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
    return newNotif;
  },

  // SESSION MANAGEMENT
  getCurrentUser: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return null;
  },
  setCurrentUser: (user) => {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    } else {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
    }
  },

  // SECURITY & MFA LOGIC
  recordFailedAttempt: (email) => {
    const users = StorageService.getUsers();
    const userIndex = users.findIndex((u) => u.email.toLowerCase() === (email || '').toLowerCase());
    if (userIndex >= 0) {
      const user = users[userIndex];
      const failed = (user.failed_attempts || 0) + 1;
      user.failed_attempts = failed;
      if (failed >= 3) {
        user.is_locked = true;
        user.is_active = false;
        StorageService.addLog({
          user_email: user.email,
          action: 'ACCOUNT LOCKED OUT',
          feature: 'Security Lockdown',
          details: `Account locked due to 3 consecutive failed login attempts.`,
          level: 'danger',
        });
      }
      users[userIndex] = user;
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      return user;
    }
    return null;
  },

  resetFailedAttempts: (email) => {
    const users = StorageService.getUsers();
    const userIndex = users.findIndex((u) => u.email.toLowerCase() === (email || '').toLowerCase());
    if (userIndex >= 0) {
      users[userIndex].failed_attempts = 0;
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      return users[userIndex];
    }
    return null;
  },

  unlockUser: (email) => {
    const users = StorageService.getUsers();
    const userIndex = users.findIndex((u) => u.email.toLowerCase() === (email || '').toLowerCase());
    if (userIndex >= 0) {
      users[userIndex].failed_attempts = 0;
      users[userIndex].is_locked = false;
      users[userIndex].is_active = true;
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      StorageService.addLog({
        user_email: email,
        action: 'ACCOUNT UNLOCKED',
        feature: 'User Management',
        details: `Account ${email} was unlocked by administrator.`,
        level: 'info',
      });
      return users[userIndex];
    }
    return null;
  },

  generateOTP: (email) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const payload = {
      email: email.toLowerCase(),
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };
    sessionStorage.setItem(`zapatera_otp_${email.toLowerCase()}`, JSON.stringify(payload));
    return otp;
  },

  verifyOTP: (email, code) => {
    const key = `zapatera_otp_${email.toLowerCase()}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      if (data.otp === String(code).trim() && Date.now() <= data.expiresAt) {
        sessionStorage.removeItem(key);
        return true;
      }
    } catch (err) {
      console.warn('OTP verification error:', err);
    }
    return false;
  }
};
