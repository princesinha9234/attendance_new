import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { User, AuthTokens } from '@/types';

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  refreshToken: () => Promise<boolean>;
}

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  role: 'STUDENT' | 'TEACHER' | 'PLATFORM_OWNER';
  phone?: string;
  studentId?: string;
  branch?: string;
  classId?: string;
  semester?: number;
  enrollmentYear?: number;
  section?: string;
  employeeId?: string;
  department?: string;
  designation?: string;
  institutionId?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStoredAuth = async () => {
    try {
      const [storedTokens, storedUser] = await Promise.all([
        SecureStore.getItemAsync('auth_tokens'),
        SecureStore.getItemAsync('auth_user'),
      ]);
      
      if (storedTokens && storedUser) {
        const parsedTokens = JSON.parse(storedTokens);
        const parsedUser = JSON.parse(storedUser);
        
        const isValid = await validateToken(parsedTokens.accessToken);
        if (isValid) {
          setTokens(parsedTokens);
          setUser(parsedUser);
        } else {
          const refreshed = await refreshAccessToken(parsedTokens.refreshToken);
          if (!refreshed) {
            await clearAuth();
          }
        }
      }
    } catch (error) {
      console.error('Load auth error:', error);
      await clearAuth();
    } finally {
      setLoading(false);
    }
  };

  const validateToken = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  const refreshAccessToken = async (refreshToken: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const newTokens = { accessToken: data.accessToken, refreshToken: data.refreshToken };
        await SecureStore.setItemAsync('auth_tokens', JSON.stringify(newTokens));
        setTokens(newTokens);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const clearAuth = async () => {
    await Promise.all([
      SecureStore.deleteItemAsync('auth_tokens'),
      SecureStore.deleteItemAsync('auth_user'),
    ]);
    setTokens(null);
    setUser(null);
  };

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    
    const newTokens = { accessToken: data.accessToken, refreshToken: data.refreshToken };
    await Promise.all([
      SecureStore.setItemAsync('auth_tokens', JSON.stringify(newTokens)),
      SecureStore.setItemAsync('auth_user', JSON.stringify(data.user)),
    ]);
    
    setTokens(newTokens);
    setUser(data.user);
  };

  const register = async (data: RegisterData) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Registration failed');
    }
    
    const newTokens = { accessToken: result.accessToken, refreshToken: result.refreshToken };
    await Promise.all([
      SecureStore.setItemAsync('auth_tokens', JSON.stringify(newTokens)),
      SecureStore.setItemAsync('auth_user', JSON.stringify(result.user)),
    ]);
    
    setTokens(newTokens);
    setUser(result.user);
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens?.accessToken}`,
        },
      });
    } catch {}
    await clearAuth();
  };

  const updateUser = (userData: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...userData } : null);
  };

  const refreshToken = async () => {
    if (!tokens?.refreshToken) return false;
    return refreshAccessToken(tokens.refreshToken);
  };

  useEffect(() => {
    loadStoredAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, tokens, loading, login, register, logout, updateUser, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}