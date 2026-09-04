import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';

export function useApi() {
  const { user, tokens, refreshToken, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async <T,>(
    apiCall: () => Promise<{ data?: T; error?: string; code?: string }>,
    options?: { showError?: boolean; retryOnAuthError?: boolean }
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      
      if (result.error) {
        if (result.code === 'UNAUTHORIZED' || result.code === 'INVALID_TOKEN') {
          if (options?.retryOnAuthError !== false) {
            const refreshed = await refreshToken();
            if (refreshed) {
              return request(apiCall, { ...options, retryOnAuthError: false });
            }
          }
          await logout();
        }
        
        if (options?.showError !== false) {
          Alert.alert('Error', result.error);
        }
        setError(result.error);
        return null;
      }

      return result.data as T;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      if (options?.showError !== false) {
        Alert.alert('Error', message);
      }
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [refreshToken, logout]);

  return { request, loading, error, setError };
}