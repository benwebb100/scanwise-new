import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, Translations, getTranslation } from '@/lib/translations';

interface TranslationContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translations;
  // Helper function to translate condition/treatment names
  translateCondition: (condition: string) => string;
  translateTreatment: (treatment: string) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });

  const [t, setTranslations] = useState<Translations>(() => getTranslation(language));

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem('language', newLanguage);
    setTranslations(getTranslation(newLanguage));
  };

  // Update translations when language changes
  useEffect(() => {
    setTranslations(getTranslation(language));
  }, [language]);

  // Helper function to translate condition names
  const translateCondition = (condition: string): string => {
    const normalizedCondition = condition.toLowerCase().replace(/\s+/g, '-') as keyof typeof t.conditions;
    return t.conditions[normalizedCondition] || condition;
  };

  // Helper function to translate treatment names
  const translateTreatment = (treatment: string): string => {
    const normalizedTreatment = treatment.toLowerCase().replace(/\s+/g, '-') as keyof typeof t.treatments;
    return t.treatments[normalizedTreatment] || treatment;
  };

  const value = {
    language,
    setLanguage,
    t,
    translateCondition,
    translateTreatment,
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}
