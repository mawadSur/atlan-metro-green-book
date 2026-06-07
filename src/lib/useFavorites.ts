import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { Location } from './types';

const FAVORITES_KEY = 'gb_favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setFavorites(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveFavorites = async (newFavorites: string[]) => {
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
      setFavorites(newFavorites);
    } catch (error) {
      console.error('Failed to save favorites:', error);
    }
  };

  const isSaved = useCallback(
    (id: string) => favorites.includes(id),
    [favorites]
  );

  const toggle = useCallback(
    async (id: string) => {
      const newFavorites = isSaved(id)
        ? favorites.filter(fid => fid !== id)
        : [...favorites, id];
      await saveFavorites(newFavorites);
    },
    [favorites, isSaved]
  );

  const savedLocations = useCallback(async (): Promise<Location[]> => {
    if (favorites.length === 0) return [];

    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .in('id', favorites);

      if (error) throw error;
      return (data ?? []) as Location[];
    } catch (error) {
      console.error('Failed to fetch saved locations:', error);
      return [];
    }
  }, [favorites]);

  return {
    favorites,
    isSaved,
    toggle,
    savedLocations,
    isLoading,
  };
}
