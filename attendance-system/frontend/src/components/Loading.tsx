import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
  fullScreen?: boolean;
  style?: ViewStyle;
}

export const Loading = ({
  size = 'md',
  color = '#2563EB',
  text,
  fullScreen = false,
  style,
}: LoadingProps) => {
  const sizes = { sm: 20, md: 32, lg: 48 };
  const indicatorSize = sizes[size];

  const content = (
    <View style={[styles.container, { gap: text ? 12 : 0 }, style]}>
      <ActivityIndicator size={size === 'sm' ? 'small' : 'large'} color={color} />
      {text && <Text style={[styles.text, { fontSize: size === 'sm' ? 12 : 14 }]}>{text}</Text>}
    </View>
  );

  if (fullScreen) {
    return (
      <View style={styles.fullScreen}>
        {content}
      </View>
    );
  }

  return content;
};

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton = ({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) => (
  <View style={[styles.skeleton, { width, height, borderRadius }, style]}>
    <LinearGradient
      colors={['#F1F5F9', '#E2E8F0', '#F1F5F9']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={StyleSheet.absoluteFill}
    />
  </View>
);

interface EmptyStateProps {
  icon: string;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
  style?: ViewStyle;
}

export const EmptyState = ({ icon, title, message, action, style }: EmptyStateProps) => (
  <View style={[styles.emptyContainer, style]}>
    <View style={styles.iconContainer}>
      <Text style={styles.iconText}>{icon}</Text>
    </View>
    <Text style={styles.title}>{title}</Text>
    {message && <Text style={styles.message}>{message}</Text>}
    {action && (
      <Text
        style={styles.action}
        onPress={action.onPress}
        accessibilityRole="button"
      >
        {action.label}
      </Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    color: '#64748B',
    textAlign: 'center',
  },
  skeleton: {
    overflow: 'hidden',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 36,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  action: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 8,
  },
});