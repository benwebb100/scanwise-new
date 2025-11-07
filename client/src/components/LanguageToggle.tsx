import React from 'react';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useToast } from '@/hooks/use-toast';
import { ViewInBulgarian } from './ViewInBulgarian';
import { GoogleTranslateWidget } from './GoogleTranslateWidget';

export function LanguageToggle() {
  const { language, setLanguage, t } = useTranslation();
  const { toast } = useToast();

  const toggleLanguage = () => {
    const newLanguage = language === 'en' ? 'bg' : 'en';
    setLanguage(newLanguage);
    
    toast({
      title: t.toast.success,
      description: t.toast.languageChanged,
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2"
    >
      <Globe className="h-4 w-4" />
      <span className="font-medium">
        {language === 'en' ? 'EN' : 'БГ'}
      </span>
      <span className="text-xs text-gray-500">
        {language === 'en' ? '→ БГ' : '→ EN'}
      </span>
    </Button>
  );
}

export function LanguageToggleSimple() {
  const { language, setLanguage } = useTranslation();

  const toggleLanguage = () => {
    const newLanguage = language === 'en' ? 'bg' : 'en';
    setLanguage(newLanguage);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors bg-gray-100 hover:bg-gray-200 text-gray-700"
    >
      <Globe className="h-3.5 w-3.5" />
      {language === 'en' ? 'EN' : 'БГ'}
    </button>
  );
}
