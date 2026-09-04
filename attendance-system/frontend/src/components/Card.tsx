import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient';
  onPress?: () => void;
  padding?: number;
  gradientColors?: string[];
}

export const Card = ({
  children,
  style,
  variant = 'default',
  onPress,
  padding = 16,
  gradientColors = ['#FFFFFF', '#F8FAFC'],
}: CardProps) => {
  const baseStyle: ViewStyle = {
    borderRadius: 14,
    padding,
    ...style,
  };

  const variants = {
    default: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    elevated: {
      backgroundColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 4,
    },
    outlined: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1.5,
      borderColor: '#2563EB',
    },
    gradient: {
      backgroundColor: 'transparent',
    },
  };

  const content = (
    <View style={[baseStyle, variants[variant]]}>{children}</View>
  );

  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={baseStyle}
      >
        {content}
      </LinearGradient>
    );
  }

  if (onPress) {
    return (
      <Pressable onPress={onPress} activeOpacity={0.9} style={baseStyle}>
        <View style={variants[variant]}>{children}</View>
      </Pressable>
    );
  }

  return content;
};

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: ViewStyle;
}

export const CardHeader = ({ title, subtitle, action, style }: CardHeaderProps) => (
  <View style={[styles.header, style]}>
    <View style={styles.headerContent}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
    {action}
  </View>
);

interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
  divided?: boolean;
}

export const CardFooter = ({ children, style, divided = true }: CardFooterProps) => (
  <View
    style={[
      styles.footer,
      style,
      divided && { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 12, marginTop: 4 },
    ]}
  >
    {children}
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
});