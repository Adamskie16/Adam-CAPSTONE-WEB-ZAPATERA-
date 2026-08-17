import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { BarangayEvent } from '../../types';
import Badge from '../../components/Badge';
import { formatDate } from '../../core/security';

interface ViewEventsViewProps {
  events: BarangayEvent[];
}

const DEFAULT_EVENTS: BarangayEvent[] = [
  {
    id: 'ev-1',
    title: 'Barangay Zapatera General Assembly',
    description: 'Annual community update on barangay projects, document issuance guidelines, and public safety programs.',
    event_date: new Date('2026-08-20T09:00:00').toISOString(),
    location: 'Barangay Zapatera Multipurpose Complex',
    target_audience: 'all',
    status: 'upcoming',
    image_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=500&q=80',
  },
  {
    id: 'ev-2',
    title: 'Free Community Health & Dental Mission',
    description: 'Free medical consultations, dental checkups, and medicine distribution for registered Zapatera residents.',
    event_date: new Date('2026-08-25T08:00:00').toISOString(),
    location: 'Zapatera Health Center',
    target_audience: 'residents',
    status: 'upcoming',
    image_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=500&q=80',
  },
];

export default function ViewEventsView({ events }: ViewEventsViewProps) {
  const displayEvents = events && events.length > 0 ? events : DEFAULT_EVENTS;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerBox}>
        <Text style={styles.title}>Barangay Announcements & Events</Text>
        <Text style={styles.subtitle}>
          Stay updated with community meetings, health missions, and official programs.
        </Text>
      </View>

      <View style={styles.listContainer}>
        {displayEvents.map((item) => (
          <View key={item.id} style={styles.eventCard}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.eventImage} />
            ) : null}

            <View style={styles.cardContent}>
              <View style={styles.badgeRow}>
                <Badge variant={item.status}>{item.status}</Badge>
                <Text style={styles.audienceText}>Target: {item.target_audience.toUpperCase()}</Text>
              </View>

              <Text style={styles.eventTitle}>{item.title}</Text>
              <Text style={styles.eventDesc}>{item.description}</Text>

              <View style={styles.detailsBox}>
                <Text style={styles.detailText}>📅 Date: {formatDate(item.event_date)}</Text>
                <Text style={styles.detailText}>📍 Location: {item.location}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
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
  listContainer: {
    gap: 16,
  },
  eventCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 140,
  },
  cardContent: {
    padding: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  audienceText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#60a5fa',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 6,
  },
  eventDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 12,
  },
  detailsBox: {
    backgroundColor: '#020617',
    padding: 10,
    borderRadius: 10,
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '500',
  },
});
