import { useEffect } from 'react';

export function useDocumentLang(lang: 'en' | 'bg') {
  useEffect(() => {
    // Update the HTML lang attribute
    document.documentElement.setAttribute('lang', lang);
    
    // Update the Content-Language meta tag
    let contentLangMeta = document.querySelector('meta[http-equiv="Content-Language"]');
    if (contentLangMeta) {
      contentLangMeta.setAttribute('content', lang);
    } else {
      // Create the meta tag if it doesn't exist
      contentLangMeta = document.createElement('meta');
      contentLangMeta.setAttribute('http-equiv', 'Content-Language');
      contentLangMeta.setAttribute('content', lang);
      document.head.appendChild(contentLangMeta);
    }
  }, [lang]);
}
