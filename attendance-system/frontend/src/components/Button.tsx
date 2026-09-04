import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ButtonProps extends React.TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const colors = {
  primary: { bg: ['#2563EB', '#1D4ED8'], text: '#FFFFFF', border: '#2563EB' },
  secondary: { bg: ['#64748B', '#475569'], text: '#FFFFFF', border: '#64748B' },
  outline: { bg: 'transparent', text: '#2563EB', border: '#2563EB' },
  danger: { bg: ['#EF4444', '#DC2626'], text: '#FFFFFF', border: '#EF4444' },
  ghost: { bg: 'transparent', text: '#2563EB', border: 'transparent' },
};

const sizes = {
  sm: { px: 12, py: 6, fontSize: 14, borderRadius: 6, gap: 6 },
  md: { px: 16, py: 10, fontSize: 16, borderRadius: 8, gap: 8 },
  lg: { px: 24, py: 14, fontSize: 18, borderRadius: 10, gap: 10 },
};

export const Button = React.forwardRef<TouchableOpacity, ButtonProps>(
  (
    {
      title,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const color = colors[variant];
    const sizeStyles = sizes[size];
    const isDisabled = disabled || loading;

    const containerStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: sizeStyles.px,
      paddingVertical: sizeStyles.py,
      borderRadius: sizeStyles.borderRadius,
      borderWidth: variant === 'outline' || variant === 'ghost' ? 1.5 : 0,
      borderColor: color.border,
      width: fullWidth ? '100%' : undefined,
      opacity: isDisabled ? 0.6 : 1,
      gap: sizeStyles.gap,
    };

    const textStyle: TextStyle = {
      fontSize: sizeStyles.fontSize,
      fontWeight: '600',
      color: variant === 'ghost' || variant === 'outline' ? color.text : color.text,
    };

    const gradientColors = variant === 'outline' || variant === 'ghost' ? undefined : color.bg;

    const renderButton = () => (
      <View style={[containerStyle, style]} {...props}>
        {loading ? (
          <ActivityIndicator size="small" color={variant === 'outline' || variant === 'ghost' ? color.text : '#FFFFFF'} />
        ) : (
          <>
            {leftIcon}
            <Text style={textStyle}>{title}</Text>
            {rightIcon}
          </>
        )}
      </View>
    );

    if (gradientColors) {
      return (
        <LinearGradient
          colors={gradientColors}
          style={[containerStyle, style]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {renderButton()}
        </LinearGradient>
      );
    }

    return (
      <TouchableOpacity
        ref={ref}
        style={[containerStyle, { backgroundColor: color.bg as string }, style]}
        disabled={isDisabled}
        activeOpacity={0.8}
        {...props}
      >
        {renderButton()}
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';