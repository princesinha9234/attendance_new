import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: false,
    error: null,
  });

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Location Permission Required',
        'This app needs location access for geofencing attendance verification.',
        [{ text: 'Settings', onPress: () => Location.requestForegroundPermissionsAsync() }]
      );
      return false;
    }
    return true;
  }, []);

  const getCurrentLocation = useCallback(async (): Promise<{ latitude: number; longitude: number } | null> => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return null;

    setLocation(prev => ({ ...prev, loading: true, error: null }));

    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 10000,
        timeout: 15000,
      });

      const { latitude, longitude, accuracy } = currentLocation.coords;
      setLocation({ latitude, longitude, accuracy, loading: false, error: null });
      return { latitude, longitude };
    } catch (error) {
      const errorMessage = 'Failed to get location';
      setLocation(prev => ({ ...prev, loading: false, error: errorMessage }));
      return null;
    }
  }, [requestPermission]);

  const watchLocation = useCallback((callback: (loc: { latitude: number; longitude: number }) => void) => {
    let subscription: Location.LocationSubscription | null = null;

    const startWatching = async () => {
      const hasPermission = await requestPermission();
      if (!hasPermission) return;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (loc) => {
          const { latitude, longitude } = loc.coords;
          setLocation(prev => ({ ...prev, latitude, longitude }));
          callback({ latitude, longitude });
        }
      );
    };

    startWatching();

    return () => {
      subscription?.remove();
    };
  }, [requestPermission]);

  return {
    ...location,
    getCurrentLocation,
    watchLocation,
    requestPermission,
  };
}