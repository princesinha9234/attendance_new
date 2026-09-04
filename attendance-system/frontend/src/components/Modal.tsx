import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, Pressable, Animated, BackHandler } from 'react-native';
import { Modal as RNModal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal = ({
  visible,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdrop = true,
  showCloseButton = true,
  header,
  footer,
}: ModalProps) => {
  const [fadeAnim] = React.useState(new Animated.Value(0));
  const [slideAnim] = React.useState(new Animated.Value(50));

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 50, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleBackPress = React.useCallback(() => {
    if (visible) {
      onClose();
      return true;
    }
    return false;
  }, [visible, onClose]);

  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [handleBackPress]);

  const sizes = {
    sm: { width: '85%', maxHeight: '70%' },
    md: { width: '90%', maxHeight: '80%' },
    lg: { width: '95%', maxHeight: '85%' },
    full: { width: '100%', maxHeight: '100%' },
  };

  const sizeStyle = sizes[size];

  if (!visible) return null;

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeOnBackdrop ? onClose : undefined}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable
          onPress={closeOnBackdrop ? onClose : undefined}
          style={styles.backdrop}
          accessibilityRole="button"
        />
        <Animated.View
          style={[
            styles.modalContainer,
            { width: sizeStyle.width, maxHeight: sizeStyle.maxHeight, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {(header || title || showCloseButton) && (
            <View style={styles.header}>
              {header || (
                <>
                  <Text style={styles.title}>{title}</Text>
                  {showCloseButton && (
                    <Pressable onPress={onClose} style={styles.closeButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close" size={24} color="#64748B" />
                    </Pressable>
                  )}
                </>
              )}
            </View>
          )}
          <View style={styles.content}>{children}</View>
          {footer && <View style={styles.footer}>{footer}</View>}
        </Animated.View>
      </Animated.View>
    </RNModal>
  );
};

interface AlertModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  variant?: 'default' | 'danger';
  loading?: boolean;
}

export const AlertModal = ({
  visible,
  onClose,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  variant = 'default',
  loading = false,
}: AlertModalProps) => (
  <Modal visible={visible} onClose={onClose} size="sm" showCloseButton={false}>
    <View style={styles.alertContainer}>
      <View style={[styles.iconContainer, { backgroundColor: variant === 'danger' ? '#FEE2E2' : '#DBEAFE' }]}>
        <Ionicons name={variant === 'danger' ? 'alert-circle' : 'information-circle'} size={32} color={variant === 'danger' ? '#EF4444' : '#2563EB'} />
      </View>
      <Text style={styles.alertTitle}>{title}</Text>
      <Text style={styles.alertMessage}>{message}</Text>
      <View style={styles.alertActions}>
        <Pressable onPress={onClose} style={[styles.alertButton, styles.cancelButton]} disabled={loading}>
          <Text style={styles.cancelButtonText}>{cancelText}</Text>
        </Pressable>
        <Pressable onPress={onConfirm} style={[styles.alertButton, styles.confirmButton, { backgroundColor: variant === 'danger' ? '#EF4444' : '#2563EB' }]} disabled={loading}>
          <Text style={styles.confirmButtonText}>{loading ? '...' : confirmText}</Text>
        </Pressable>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: { flex: 1 },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  closeButton: { padding: 4 },
  content: { padding: 16, maxHeight: '70%' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  alertContainer: { padding: 24, gap: 16, alignItems: 'center' },
  iconContainer: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  alertTitle: { fontSize: 18, fontWeight: '600', color: '#1E293B', textAlign: 'center' },
  alertMessage: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  alertActions: { flexDirection: 'row', gap: 12, width: '100%' },
  alertButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cancelButton: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#475569' },
  confirmButton: {},
  confirmButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});