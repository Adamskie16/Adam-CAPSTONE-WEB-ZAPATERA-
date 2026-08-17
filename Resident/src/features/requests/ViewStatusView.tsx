import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { DocumentRequest, ResidentUser, BarangayConfig } from '../../types';
import Badge from '../../components/Badge';
import CertificateModal from '../../components/CertificateModal';
import { formatDate } from '../../core/security';

interface ViewStatusViewProps {
  requests: DocumentRequest[];
  currentUser: ResidentUser;
  config: BarangayConfig;
}

export default function ViewStatusView({ requests, config }: ViewStatusViewProps) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewingRequest, setViewingRequest] = useState<DocumentRequest | null>(null);

  const filteredRequests = requests.filter((req) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') return req.status === 'pending' || req.status === 'under_review';
    if (filterStatus === 'issued') return req.status === 'approved' || req.status === 'issued';
    if (filterStatus === 'declined') return req.status === 'declined';
    return true;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerBox}>
        <Text style={styles.title}>Track Request Status</Text>
        <Text style={styles.subtitle}>
          Real-time tracking of document clearances and digital certificates.
        </Text>
      </View>

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {[
          { id: 'all', label: 'All Requests' },
          { id: 'pending', label: 'Pending Review' },
          { id: 'issued', label: 'Approved / Issued' },
          { id: 'declined', label: 'Declined' },
        ].map((chip) => (
          <TouchableOpacity
            key={chip.id}
            style={[styles.chip, filterStatus === chip.id && styles.chipActive]}
            onPress={() => setFilterStatus(chip.id)}
          >
            <Text style={[styles.chipText, filterStatus === chip.id && styles.chipTextActive]}>
              {chip.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Requests List */}
      <View style={styles.listContainer}>
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Document Requests Found</Text>
            <Text style={styles.emptySubtitle}>
              You have not filed any requests matching the selected status.
            </Text>
          </View>
        ) : (
          filteredRequests.map((req) => (
            <View key={req.id} style={styles.reqCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.trackingText}>{req.tracking_number}</Text>
                  <Text style={styles.docTitleText}>{req.document_title}</Text>
                </View>
                <Badge variant={req.status}>{req.status.replace('_', ' ')}</Badge>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.purposeText}>Purpose: {req.purpose}</Text>
                <Text style={styles.dateText}>Requested: {formatDate(req.created_at)}</Text>
                {req.pickup_time_slot ? (
                  <Text style={styles.slotText}>Slot: {req.pickup_time_slot}</Text>
                ) : null}
              </View>

              {(req.status === 'issued' || req.status === 'approved') && (
                <TouchableOpacity
                  style={styles.viewCertBtn}
                  onPress={() => setViewingRequest(req)}
                >
                  <Text style={styles.viewCertBtnText}>View Digital Certificate</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>

      <CertificateModal
        visible={Boolean(viewingRequest)}
        onClose={() => setViewingRequest(null)}
        request={viewingRequest}
        config={config}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerBox: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  filterScroll: {
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#2563eb',
  },
  chipText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  listContainer: {
    gap: 12,
  },
  emptyCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#cbd5e1',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  reqCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  trackingText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#60a5fa',
  },
  docTitleText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginTop: 2,
  },
  cardBody: {
    backgroundColor: '#020617',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  purposeText: {
    fontSize: 12,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  slotText: {
    fontSize: 11,
    color: '#38bdf8',
  },
  viewCertBtn: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  viewCertBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
