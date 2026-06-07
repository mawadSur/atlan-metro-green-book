import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from './types';

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextValue | undefined>(undefined);

const LANG_STORAGE_KEY = '@greenbook:lang';

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LANG_STORAGE_KEY)
      .then(stored => {
        if (stored && (stored === 'en' || stored === 'ar' || stored === 'es')) {
          setLangState(stored);
        }
        setIsHydrated(true);
      })
      .catch(() => {
        setIsHydrated(true);
      });
  }, []);

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    AsyncStorage.setItem(LANG_STORAGE_KEY, newLang).catch(() => {});
  };

  if (!isHydrated) {
    return null;
  }

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const context = useContext(LangContext);
  if (!context) {
    throw new Error('useLang must be used within LangProvider');
  }
  return context;
}
