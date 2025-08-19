import React, { useEffect } from 'react';

interface GoogleTranslateWidgetProps {
  className?: string;
}

export function GoogleTranslateWidget({ className }: GoogleTranslateWidgetProps) {
  useEffect(() => {
    // Ensure the Google Translate element is initialized
    const checkGoogleTranslate = () => {
      if (window.google && window.google.translate) {
        // Re-initialize if needed
        try {
          new window.google.translate.TranslateElement({
            pageLanguage: 'en',
            includedLanguages: 'bg',
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
          }, 'google_translate_element');
        } catch (error) {
          console.log('Google Translate already initialized');
        }
      } else {
        // Wait for Google Translate to load
        setTimeout(checkGoogleTranslate, 100);
      }
    };

    checkGoogleTranslate();
  }, []);

  return (
    <div className={className}>
      <div id="google_translate_element"></div>
    </div>
  );
}

// Declare global types for Google Translate
declare global {
  interface Window {
    google: {
      translate: {
        TranslateElement: any;
      };
    };
    googleTranslateElementInit: () => void;
  }
}
