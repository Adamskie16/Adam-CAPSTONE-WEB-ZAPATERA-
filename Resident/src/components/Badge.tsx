import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BadgeProps {
  variant?: 'pending' | 'under_review' | 'approved' | 'declined' | 'issued' | 'active' | 'inactive' | string;
  children: React.ReactNode;
}

export default function Badge({ variant = 'pending', children }: BadgeProps) {
  let bgStyle = styles.pendingBg;
  let textStyle = styles.pendingText;

  switch (variant) {
    case 'approved':
    case 'issued':
    case 'active':
      bgStyle = styles.successBg;
      textStyle = styles.successText;
      break;
    case 'under_review':
      bgStyle = styles.infoBg;
      textStyle = styles.infoText;
      break;
    case 'declined':
    case 'inactive':
      bgStyle = styles.dangerBg;
      textStyle = styles.dangerText;
      break;
    default:
      bgStyle = styles.pendingBg;
      textStyle = styles.pendingText;
  }

  return (
    <View style={[styles.badge, bgStyle]}>
      <Text style={[styles.badgeText, textStyle]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  pendingBg: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#f59e0b',
    borderWidth: 1,
  },
  pendingText: {
    color: '#fbbf24',
  },
  infoBg: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3b82f6',
    borderWidth: 1,
  },
  infoText: {
    color: '#60a5fa',
  },
  successBg: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
    borderWidth: 1,
  },
  successText: {
    color: '#34d399',
  },
  dangerBg: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    borderWidth: 1,
  },
  dangerText: {
    color: '#f87171',
  },
});
