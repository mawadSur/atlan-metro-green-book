import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { Location } from './types';

const FAVORITES_KEY = 'gb_favorites';

interface FavoritesContextValue {
  favorites: string[];
  isSaved: (id: string) => boolean;
  toggle: (id: string) => Promise<void>;
  savedLocations: () => Promise<Location[]>;
  isLoading: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

/**
 * Shared favorites state provider. Wraps the app to ensure all screens read
 * from a single source of truth — when a location is favorited on the detail
 * screen, the Saved tab automatically reflects the change (no manual re-fetch).
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
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

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isSaved,
        toggle,
        savedLocations,
        isLoading,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

/**
 * Hook to access shared favorites state. Must be used within FavoritesProvider.
 * Return shape is identical to the old per-component hook for backward
 * compatibility.
 */
export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return context;
}
