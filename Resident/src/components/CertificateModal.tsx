import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { DocumentRequest, BarangayConfig } from '../types';
import { formatDate } from '../core/security';

interface CertificateModalProps {
  visible: boolean;
  onClose: () => void;
  request: DocumentRequest | null;
  config: BarangayConfig;
}

export default function CertificateModal({ visible, onClose, request, config }: CertificateModalProps) {
  if (!request) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Digital Certificate Viewer</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* Official Document Frame */}
            <View style={styles.certCard}>
              {/* Header Seal & Title */}
              <View style={styles.certHeader}>
                <Image
                  source={{ uri: config.seal_url || 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=300&q=80' }}
                  style={styles.sealImage}
                />
                <Text style={styles.republicText}>Republic of the Philippines</Text>
                <Text style={styles.provinceText}>{config.province}, {config.municipality}</Text>
                <Text style={styles.barangayTitle}>{config.barangay_name.toUpperCase()}</Text>
                <Text style={styles.officeTitle}>OFFICE OF THE BARANGAY CAPTAIN</Text>
              </View>

              <View style={styles.divider} />

              <Text style={styles.docTitle}>{request.document_title.toUpperCase()}</Text>

              {/* Certificate Body Text */}
              <Text style={styles.bodyParagraph}>
                TO WHOM IT MAY CONCERN:
              </Text>
              <Text style={styles.bodyParagraph}>
                This is to certify that <Text style={styles.boldText}>{request.resident_name.toUpperCase()}</Text>, of legal age, Filipino citizen, is a bonafide resident of {config.barangay_name}, {config.municipality}, {config.province}.
              </Text>
              <Text style={styles.bodyParagraph}>
                This certification is issued upon request of the above-named person for the purpose of:{' '}
                <Text style={styles.boldText}>{request.purpose}</Text>.
              </Text>

              <View style={styles.metaRow}>
                <View>
                  <Text style={styles.metaLabel}>Tracking No:</Text>
                  <Text style={styles.metaValue}>{request.tracking_number}</Text>
                </View>
                <View>
                  <Text style={styles.metaLabel}>Issued Date:</Text>
                  <Text style={styles.metaValue}>{formatDate(request.approved_at || request.created_at)}</Text>
                </View>
              </View>

              {/* Official Signature */}
              <View style={styles.signatureArea}>
                <View style={styles.signLine} />
                <Text style={styles.captainName}>HON. EXECUTIVE OFFICER</Text>
                <Text style={styles.captainTitle}>Punong Barangay / Executive Officer</Text>
              </View>

              <View style={styles.watermark}>
                <Text style={styles.watermarkText}>OFFICIAL DIGITAL ISSUANCE • BARANGAY ZAPATERA</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.closeFooterBtn} onPress={onClose}>
              <Text style={styles.closeFooterBtnText}>Close Document</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
  },
  certCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    borderWidth: 2,
    borderColor: '#cbd5e1',
  },
  certHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  sealImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
  },
  republicText: {
    fontSize: 11,
    color: '#475569',
  },
  provinceText: {
    fontSize: 11,
    color: '#475569',
  },
  barangayTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 2,
  },
  officeTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1e3a8a',
    marginTop: 2,
    letterSpacing: 1,
  },
  divider: {
    height: 2,
    backgroundColor: '#1e3a8a',
    marginVertical: 12,
  },
  docTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginVertical: 12,
    letterSpacing: 1,
  },
  bodyParagraph: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 12,
    textAlign: 'justify',
  },
  boldText: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  metaLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  signatureArea: {
    alignItems: 'flex-end',
    marginTop: 24,
    marginBottom: 12,
  },
  signLine: {
    width: 140,
    height: 1,
    backgroundColor: '#0f172a',
    marginBottom: 4,
  },
  captainName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  captainTitle: {
    fontSize: 10,
    color: '#64748b',
  },
  watermark: {
    marginTop: 12,
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  watermarkText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  closeFooterBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeFooterBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
