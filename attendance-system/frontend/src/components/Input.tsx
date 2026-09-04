import React from 'react';
import { TextInput, View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends React.TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: string;
  rightIcon?: string;
  rightIconOnPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      rightIconOnPress,
      containerStyle,
      inputStyle,
      labelStyle,
      style,
      secureTextEntry,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = secureTextEntry && !showPassword;

    return (
      <View style={[styles.container, containerStyle]}>
        {label && <Text style={[styles.label, labelStyle]}>{label}</Text>}
        <View style={styles.inputWrapper}>
          {leftIcon && (
            <Ionicons
              name={leftIcon}
              size={22}
              color="#94A3B8"
              style={styles.icon}
            />
          )}
          <TextInput
            ref={ref}
            style={[styles.input, inputStyle, style]}
            secureTextEntry={isPassword}
            {...props}
          />
          {rightIcon && (
            <Ionicons
              name={rightIcon}
              size={22}
              color={isPassword ? '#2563EB' : '#94A3B8'}
              style={styles.icon}
              onPress={rightIconOnPress || (() => setShowPassword(!showPassword))}
            />
          )}
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
        {helperText && !error && <Text style={styles.helperText}>{helperText}</Text>}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    gap: 6,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    paddingVertical: 12,
  },
  icon: {
    marginHorizontal: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 2,
  },
  helperText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
});