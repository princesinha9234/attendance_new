import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

const webStorage = {
  getItemAsync: async (key: string): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  },
  setItemAsync: async (key: string, value: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  },
  deleteItemAsync: async (key: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },
};

let nativeStorage: typeof webStorage | null = null;

async function getNativeStorage() {
  if (nativeStorage) return nativeStorage;
  if (!isWeb) {
    try {
      const SecureStore = await import('expo-secure-store');
      nativeStorage = SecureStore.default || SecureStore;
    } catch {
      nativeStorage = webStorage;
    }
  } else {
    nativeStorage = webStorage;
  }
  return nativeStorage;
}

export const storage = {
  getItemAsync: async (key: string): Promise<string | null> => {
    const store = await getNativeStorage();
    return store.getItemAsync(key);
  },
  setItemAsync: async (key: string, value: string): Promise<void> => {
    const store = await getNativeStorage();
    return store.setItemAsync(key, value);
  },
  deleteItemAsync: async (key: string): Promise<void> => {
    const store = await getNativeStorage();
    return store.deleteItemAsync(key);
  },
};