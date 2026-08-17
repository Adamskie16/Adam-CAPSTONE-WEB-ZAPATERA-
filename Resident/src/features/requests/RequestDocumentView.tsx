import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { DocumentType, ResidentUser, BarangayConfig, DocumentRequest } from '../../types';
import { formatCurrency, generateTrackingNumber } from '../../core/security';

interface RequestDocumentViewProps {
  docTypes: DocumentType[];
  currentUser: ResidentUser;
  onRequestSubmitted: (payload: Partial<DocumentRequest> & { tracking_number: string }) => void;
  config: BarangayConfig;
}

export default function RequestDocumentView({
  docTypes,
  currentUser,
  onRequestSubmitted,
  config,
}: RequestDocumentViewProps) {
  const [selectedDocId, setSelectedDocId] = useState<string>(docTypes[0]?.id || 'dt-001');
  const [purpose, setPurpose] = useState<string>('');
  const [timeSlot, setTimeSlot] = useState<string>('Morning Slot (9:00 AM - 11:30 AM)');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedTracking, setSubmittedTracking] = useState<string>('');

  const selectedDoc = docTypes.find((d) => d.id === selectedDocId) || docTypes[0];

  const handleSubmit = () => {
    if (!purpose.trim()) {
      Alert.alert('Purpose Required', 'Please enter the purpose for requesting this document.');
      return;
    }

    setSubmitting(true);
    const trackingNo = generateTrackingNumber(config.doc_prefix || 'BZ-2026');

    onRequestSubmitted({
      tracking_number: trackingNo,
      document_type_id: selectedDoc.id,
      document_title: selectedDoc.title,
      fee: selectedDoc.fee,
      purpose: purpose.trim(),
      requirements_attached: selectedDoc.requirements,
      pickup_time_slot: timeSlot,
      resident_name: currentUser.full_name,
      resident_email: currentUser.email,
    });

    setSubmitting(false);
    setSubmittedTracking(trackingNo);
    setPurpose('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerBox}>
        <Text style={styles.title}>File Document Request</Text>
        <Text style={styles.subtitle}>
          Select official barangay document, review requirements, and submit request.
        </Text>
      </View>

      {submittedTracking ? (
        <View style={styles.successCard}>
          <Text style={styles.successTitle}>Request Submitted Successfully!</Text>
          <Text style={styles.successDesc}>
            Your official request has been filed under tracking reference number:
          </Text>
          <View style={styles.trackingBox}>
            <Text style={styles.trackingText}>{submittedTracking}</Text>
          </View>
          <Text style={styles.successNote}>
            You can track review progress and download digital clearance once issued under the "Status" tab.
          </Text>
          <TouchableOpacity
            style={styles.newReqBtn}
            onPress={() => setSubmittedTracking('')}
          >
            <Text style={styles.newReqBtnText}>File Another Document Request</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>1. Select Document Type</Text>
          <View style={styles.docTypesList}>
            {docTypes.map((doc) => {
              const isSelected = doc.id === selectedDocId;
              return (
                <TouchableOpacity
                  key={doc.id}
                  style={[styles.docItem, isSelected && styles.docItemSelected]}
                  onPress={() => setSelectedDocId(doc.id)}
                >
                  <View style={styles.docItemHeader}>
                    <Text style={[styles.docTitle, isSelected && styles.docTitleSelected]}>
                      {doc.title}
                    </Text>
                    <Text style={[styles.docFee, isSelected && styles.docFeeSelected]}>
                      {doc.fee === 0 ? 'FREE' : formatCurrency(doc.fee)}
                    </Text>
                  </View>
                  <Text style={styles.docDesc}>{doc.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>2. Document Requirements</Text>
          <View style={styles.reqCard}>
            {selectedDoc?.requirements?.map((req, idx) => (
              <Text key={idx} style={styles.reqText}>
                • {req}
              </Text>
            ))}
          </View>

          <Text style={styles.sectionLabel}>3. Purpose of Request *</Text>
          <TextInput
            style={styles.textArea}
            placeholder="e.g. For Local Employment, Bank Requirement, School Clearance..."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={3}
            value={purpose}
            onChangeText={setPurpose}
          />

          <Text style={styles.sectionLabel}>4. Preferred Pickup Time Slot</Text>
          <View style={styles.slotList}>
            {[
              'Morning Slot (9:00 AM - 11:30 AM)',
              'Afternoon Slot (1:30 PM - 4:30 PM)',
            ].map((slot) => (
              <TouchableOpacity
                key={slot}
                style={[styles.slotBtn, timeSlot === slot && styles.slotBtnSelected]}
                onPress={() => setTimeSlot(slot)}
              >
                <Text style={[styles.slotText, timeSlot === slot && styles.slotTextSelected]}>
                  {slot}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitBtnText}>Submit Document Request</Text>
          </TouchableOpacity>
        </View>
      )}
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
    marginBottom: 16,
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
  successCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#10b981',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34d399',
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 12,
    color: '#cbd5e1',
    textAlign: 'center',
  },
  trackingBox: {
    backgroundColor: '#020617',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
    marginVertical: 12,
  },
  trackingText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#60a5fa',
    letterSpacing: 1,
  },
  successNote: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 16,
  },
  newReqBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  newReqBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  formCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginTop: 12,
    marginBottom: 8,
  },
  docTypesList: {
    gap: 10,
  },
  docItem: {
    backgroundColor: '#020617',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  docItemSelected: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  docItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e2e8f0',
  },
  docTitleSelected: {
    color: '#60a5fa',
  },
  docFee: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  docFeeSelected: {
    color: '#60a5fa',
  },
  docDesc: {
    fontSize: 11,
    color: '#94a3b8',
  },
  reqCard: {
    backgroundColor: '#020617',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  reqText: {
    fontSize: 11,
    color: '#cbd5e1',
    marginBottom: 4,
  },
  textArea: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 12,
    color: '#ffffff',
    fontSize: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  slotList: {
    gap: 8,
    marginBottom: 16,
  },
  slotBtn: {
    backgroundColor: '#020617',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  slotBtnSelected: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  slotText: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  slotTextSelected: {
    color: '#60a5fa',
    fontWeight: 'bold',
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
