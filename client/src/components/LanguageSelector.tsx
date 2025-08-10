import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { ViewInBulgarian } from './ViewInBulgarian';
import { GoogleTranslateWidget } from './GoogleTranslateWidget';

interface LanguageSelectorProps {
  showGoogleOptions?: boolean;
  variant?: 'full' | 'compact';
}

export function LanguageSelector({ showGoogleOptions = true, variant = 'compact' }: LanguageSelectorProps) {
  const { language, setLanguage, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = (newLanguage: 'en' | 'bg') => {
    setLanguage(newLanguage);
    setIsOpen(false);
  };

  if (variant === 'full') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Language / Език
          </CardTitle>
          <CardDescription>
            Choose your preferred language or use Google Translate
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Native Language Toggle */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Native Translation</h4>
            <div className="flex gap-2">
              <Button
                variant={language === 'en' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleLanguageChange('en')}
                className="flex-1"
              >
                {language === 'en' && <Check className="h-4 w-4 mr-1" />}
                English
              </Button>
              <Button
                variant={language === 'bg' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleLanguageChange('bg')}
                className="flex-1"
              >
                {language === 'bg' && <Check className="h-4 w-4 mr-1" />}
                Български
              </Button>
            </div>
          </div>

          {showGoogleOptions && (
            <>
              {/* Google Translate Widget */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Google Translate</h4>
                <GoogleTranslateWidget className="w-full" />
              </div>

              {/* Google Translate Link */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">External Translation</h4>
                <ViewInBulgarian variant="outline" className="w-full" />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <span className="font-medium">
            {language === 'en' ? 'EN' : 'БГ'}
          </span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <div className="p-4 space-y-4">
          {/* Native Language Options */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Native Translation</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={language === 'en' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleLanguageChange('en')}
                className="justify-start"
              >
                {language === 'en' && <Check className="h-4 w-4 mr-1" />}
                English
              </Button>
              <Button
                variant={language === 'bg' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleLanguageChange('bg')}
                className="justify-start"
              >
                {language === 'bg' && <Check className="h-4 w-4 mr-1" />}
                Български
              </Button>
            </div>
          </div>

          {showGoogleOptions && (
            <>
              <div className="border-t pt-4 space-y-2">
                <h4 className="text-sm font-medium">Google Translate</h4>
                <GoogleTranslateWidget />
              </div>
              
              <div className="border-t pt-4">
                <ViewInBulgarian variant="ghost" size="sm" className="w-full justify-start" />
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
