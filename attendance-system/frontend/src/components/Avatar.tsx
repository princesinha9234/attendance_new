import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle, ImageStyle } from 'react-native';

interface AvatarProps {
  source?: ImageStyle['source'];
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'square';
  status?: 'online' | 'offline' | 'busy' | 'away';
  statusPosition?: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left';
  style?: ViewStyle;
}

const sizes = {
  xs: { width: 24, height: 24, fontSize: 10, statusSize: 8 },
  sm: { width: 32, height: 32, fontSize: 12, statusSize: 10 },
  md: { width: 40, height: 40, fontSize: 15, statusSize: 12 },
  lg: { width: 56, height: 56, fontSize: 20, statusSize: 14 },
  xl: { width: 80, height: 80, fontSize: 28, statusSize: 16 },
};

const statusColors = {
  online: '#10B981',
  offline: '#94A3B8',
  busy: '#EF4444',
  away: '#F59E0B',
};

export const Avatar = ({
  source,
  name,
  size = 'md',
  shape = 'circle',
  status,
  statusPosition = 'bottom-right',
  style,
}: AvatarProps) => {
  const sizeConfig = sizes[size];
  const borderRadius = shape === 'circle' ? sizeConfig.width / 2 : 8;

  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getColorFromName = (fullName: string) => {
    const colors = [
      '#2563EB', '#7C3AED', '#DB2777', '#059669',
      '#DC2626', '#EA580C', '#0891B2', '#65A30D',
    ];
    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
      hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const backgroundColor = name ? getColorFromName(name) : '#E2E8F0';

  return (
    <View style={[styles.container, { width: sizeConfig.width, height: sizeConfig.height }, style]}>
      {source ? (
        <Image
          source={source}
          style={[
            styles.image,
            { width: sizeConfig.width, height: sizeConfig.height, borderRadius },
          ]}
        />
      ) : name ? (
        <View style={[styles.initials, { width: sizeConfig.width, height: sizeConfig.height, borderRadius, backgroundColor }]}>
          <Text style={[styles.initialsText, { fontSize: sizeConfig.fontSize }]}>{getInitials(name)}</Text>
        </View>
      ) : (
        <View style={[styles.placeholder, { width: sizeConfig.width, height: sizeConfig.height, borderRadius }]}>
          <Text style={[styles.placeholderText, { fontSize: sizeConfig.fontSize }]}>?</Text>
        </View>
      )}
      
      {status && (
        <View
          style={[
            styles.statusDot,
            {
              width: sizeConfig.statusSize,
              height: sizeConfig.statusSize,
              backgroundColor: statusColors[status],
              borderColor: '#FFFFFF',
            },
            styles[statusPosition],
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  initials: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
  },
  placeholderText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  statusDot: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 2,
  },
  'bottom-right': { bottom: 0, right: 0 },
  'top-right': { top: 0, right: 0 },
  'bottom-left': { bottom: 0, left: 0 },
  'top-left': { top: 0, left: 0 },
});