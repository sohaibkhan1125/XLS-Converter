
'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { translations, type Language } from '@/config/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  getTranslation: (key: string, substitutions?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');

  const getTranslation = useCallback((key: string, substitutions: Record<string, string> = {}): string => {
    let text = translations[key]?.[language] || key;
    for (const subKey in substitutions) {
        text = text.replace(`{${subKey}}`, substitutions[subKey]);
    }
    return text;
  }, [language]);


  return (
    <LanguageContext.Provider value={{ language, setLanguage, getTranslation }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
