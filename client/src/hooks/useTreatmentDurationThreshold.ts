import { useState, useEffect } from 'react';

export function useTreatmentDurationThreshold() {
  const [threshold, setThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('treatmentDurationThreshold');
    return saved ? parseInt(saved, 10) : 90; // Default to 90 minutes
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('treatmentDurationThreshold');
      if (saved) {
        setThreshold(parseInt(saved, 10));
      }
    };

    // Listen for storage changes (when settings are updated in another tab)
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events (when settings are updated in same tab)
    window.addEventListener('treatmentDurationThresholdChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('treatmentDurationThresholdChanged', handleStorageChange);
    };
  }, []);

  return threshold;
}
