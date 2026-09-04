import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const variants = {
  default: { bg: '#F1F5F9', text: '#475569', border: 'transparent' },
  success: { bg: '#D1FAE5', text: '#065F46', border: 'transparent' },
  warning: { bg: '#FEF3C7', text: '#92400E', border: 'transparent' },
  danger: { bg: '#FEE2E2', text: '#991B1B', border: 'transparent' },
  info: { bg: '#DBEAFE', text: '#1E40AF', border: 'transparent' },
  outline: { bg: 'transparent', text: '#2563EB', border: '#2563EB' },
};

const sizes = {
  sm: { px: 8, py: 2, fontSize: 11, borderRadius: 6, dotSize: 6, gap: 4 },
  md: { px: 10, py: 4, fontSize: 12, borderRadius: 8, dotSize: 8, gap: 6 },
  lg: { px: 12, py: 6, fontSize: 13, borderRadius: 10, dotSize: 10, gap: 6 },
};

export const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  style,
  textStyle,
}: BadgeProps) => {
  const variantStyles = variants[variant];
  const sizeStyles = sizes[size];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: variantStyles.bg,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: variantStyles.border,
          borderRadius: sizeStyles.borderRadius,
          paddingHorizontal: sizeStyles.px,
          paddingVertical: sizeStyles.py,
          gap: sizeStyles.gap,
        },
        style,
      ]}
    >
      {dot && (
        <View
          style={[
            styles.dot,
            {
              width: sizeStyles.dotSize,
              height: sizeStyles.dotSize,
              borderRadius: sizeStyles.dotSize / 2,
              backgroundColor: variantStyles.text,
            },
          ]}
        />
      )}
      <Text
        style={[
          styles.text,
          { color: variantStyles.text, fontSize: sizeStyles.fontSize },
          textStyle,
        ]}
      >
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {},
  text: {
    fontWeight: '600',
    lineHeight: 16,
  },
});