import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Modal,
  Image,
} from 'react-native';
import { MobileStorage } from './core/storage';
import { ResidentUser, DocumentRequest, DocumentType, BarangayEvent, BarangayConfig } from './types';
import { supabase, isSupabaseConfigured } from './core/supabase';
import ResidentAuthPage from './features/auth/ResidentAuthPage';
import RequestDocumentView from './features/requests/RequestDocumentView';
import ViewStatusView from './features/requests/ViewStatusView';
import ViewEventsView from './features/events/ViewEventsView';

const DEFAULT_DOC_TYPES: DocumentType[] = [
  {
    id: 'dt-001',
    code: 'BC-01',
    title: 'Barangay Clearance',
    description: 'Official certification for employment, legal transactions, or identification purposes.',
    fee: 50.0,
    processing_days: 1,
    requirements: ['Valid Government ID', 'Proof of Address / Utility Bill'],
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'dt-002',
    code: 'CI-02',
    title: 'Certificate of Indigency',
    description: 'Free certificate issued for medical aid, scholarship, or financial assistance.',
    fee: 0.0,
    processing_days: 1,
    requirements: ['Affidavit of Low Income', 'Voter ID or Barangay ID'],
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'dt-003',
    code: 'CR-03',
    title: 'Certificate of Residency',
    description: 'Proof of continuous residence within Barangay Zapatera jurisdiction.',
    fee: 30.0,
    processing_days: 1,
    requirements: ['Valid Photo ID', 'Landlord Statement / Billing Statement'],
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

const DEFAULT_CONFIG: BarangayConfig = {
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

export default function App() {
  const [activeTab, setActiveTab] = useState<'request' | 'status' | 'events'>('request');
  const [currentUser, setCurrentUser] = useState<ResidentUser | null>(null);
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [events] = useState<BarangayEvent[]>([]);
  const [docTypes] = useState<DocumentType[]>(DEFAULT_DOC_TYPES);
  const [config] = useState<BarangayConfig>(DEFAULT_CONFIG);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchRequests();
    }
  }, [currentUser]);

  const loadSession = async () => {
    try {
      const stored = await MobileStorage.getItem('zapatera_resident_session');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (err) {
      console.warn('Load session notice:', err);
    }
  };

  const fetchRequests = async () => {
    if (!currentUser) return;
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('requests')
          .select('*')
          .eq('resident_email', currentUser.email)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setRequests(data as DocumentRequest[]);
          return;
        }
      }
    } catch (err) {
      console.warn('Supabase fetch requests notice:', err);
    }

    try {
      const stored = await MobileStorage.getItem('zapatera_requests_db');
      setRequests(stored ? JSON.parse(stored) : []);
    } catch {
      setRequests([]);
    }
  };

  const handleLoginSuccess = async (user: ResidentUser) => {
    try {
      await MobileStorage.setItem('zapatera_resident_session', JSON.stringify(user));
    } catch (err) {
      console.warn('Save session notice:', err);
    }
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    try {
      await MobileStorage.removeItem('zapatera_resident_session');
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Logout notice:', err);
    }
    setCurrentUser(null);
    setRequests([]);
    setIsProfileModalOpen(false);
  };

  const handleRequestSubmitted = async (newReqPayload: Partial<DocumentRequest> & { tracking_number: string }) => {
    const fullReq: DocumentRequest = {
      id: `req-${Date.now()}`,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resident_id: currentUser?.id || '',
      resident_name: currentUser?.full_name || '',
      resident_email: currentUser?.email || '',
      document_type_id: newReqPayload.document_type_id || '',
      document_title: newReqPayload.document_title || '',
      fee: newReqPayload.fee || 0,
      purpose: newReqPayload.purpose || '',
      requirements_attached: newReqPayload.requirements_attached || [],
      pickup_time_slot: newReqPayload.pickup_time_slot || '',
      ...newReqPayload,
    } as DocumentRequest;

    try {
      if (isSupabaseConfigured()) {
        await supabase.from('requests').insert([fullReq]);
      }
    } catch (err) {
      console.warn('Supabase insert notice:', err);
    }

    try {
      const stored = await MobileStorage.getItem('zapatera_requests_db');
      const existing: DocumentRequest[] = stored ? JSON.parse(stored) : [];
      const updated = [fullReq, ...existing];
      await MobileStorage.setItem('zapatera_requests_db', JSON.stringify(updated));
    } catch (err) {
      console.warn('AsyncStorage req save notice:', err);
    }

    setRequests((prev) => [fullReq, ...prev]);
    setActiveTab('status');
  };

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#090d16" />
        <ResidentAuthPage onLoginSuccess={handleLoginSuccess} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={{ uri: config.seal_url || 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=300&q=80' }}
            style={styles.headerSeal}
          />
          <View>
            <Text style={styles.headerTitle}>{config.barangay_name.toUpperCase()}</Text>
            <Text style={styles.headerSubtitle}>Resident Mobile Service Portal</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.profileBtn} onPress={() => setIsProfileModalOpen(true)}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{currentUser.full_name?.charAt(0) || 'R'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Main Screen Content */}
      <View style={styles.mainContent}>
        {activeTab === 'request' && (
          <RequestDocumentView
            docTypes={docTypes}
            currentUser={currentUser}
            onRequestSubmitted={handleRequestSubmitted}
            config={config}
          />
        )}
        {activeTab === 'status' && (
          <ViewStatusView requests={requests} currentUser={currentUser} config={config} />
        )}
        {activeTab === 'events' && <ViewEventsView events={events} />}
      </View>

      {/* iOS & Android Bottom Navigation Bar */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'request' && styles.tabItemActive]}
          onPress={() => setActiveTab('request')}
        >
          <Text style={[styles.tabIconText, activeTab === 'request' && styles.tabIconActive]}>📝</Text>
          <Text style={[styles.tabLabel, activeTab === 'request' && styles.tabLabelActive]}>Request</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'status' && styles.tabItemActive]}
          onPress={() => setActiveTab('status')}
        >
          <Text style={[styles.tabIconText, activeTab === 'status' && styles.tabIconActive]}>⏱️</Text>
          <Text style={[styles.tabLabel, activeTab === 'status' && styles.tabLabelActive]}>Status ({requests.length})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'events' && styles.tabItemActive]}
          onPress={() => setActiveTab('events')}
        >
          <Text style={[styles.tabIconText, activeTab === 'events' && styles.tabIconActive]}>📢</Text>
          <Text style={[styles.tabLabel, activeTab === 'events' && styles.tabLabelActive]}>Events</Text>
        </TouchableOpacity>
      </View>

      {/* Resident Profile & Logout Modal */}
      <Modal visible={isProfileModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Resident Profile</Text>
              <TouchableOpacity onPress={() => setIsProfileModalOpen(false)}>
                <Text style={styles.modalCloseX}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.profileBody}>
              <View style={styles.profileAvatarLarge}>
                <Text style={styles.profileAvatarLargeText}>{currentUser.full_name?.charAt(0) || 'R'}</Text>
              </View>
              <Text style={styles.profileName}>{currentUser.full_name}</Text>
              <Text style={styles.profileEmail}>{currentUser.email}</Text>

              <View style={styles.infoGroup}>
                <Text style={styles.infoLabel}>Location / Sitio:</Text>
                <Text style={styles.infoValue}>{currentUser.sitio || currentUser.address || 'Barangay Zapatera'}</Text>
              </View>

              <View style={styles.infoGroup}>
                <Text style={styles.infoLabel}>ID Reference:</Text>
                <Text style={styles.infoValue}>{currentUser.id_number || 'BZ-RESIDENT'}</Text>
              </View>

              <View style={styles.infoGroup}>
                <Text style={styles.infoLabel}>Voter Status:</Text>
                <Text style={styles.infoValue}>{currentUser.voter_status || 'Registered Voter'}</Text>
              </View>

              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutBtnText}>Log Out Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  authContainer: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerSeal: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#94a3b8',
  },
  profileBtn: {
    padding: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    height: 60,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {},
  tabIconText: {
    fontSize: 18,
  },
  tabIconActive: {},
  tabLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  modalCloseX: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileBody: {
    alignItems: 'center',
  },
  profileAvatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileAvatarLargeText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileEmail: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 16,
  },
  infoGroup: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  logoutBtn: {
    width: '100%',
    backgroundColor: '#e11d48',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
