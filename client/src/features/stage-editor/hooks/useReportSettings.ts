// hooks/useReportSettings.ts

import { useState } from 'react';


export const useReportSettings = () => {
  const [toothNumberingSystem, setToothNumberingSystem] = useState<string>(() => {
    const saved = localStorage.getItem('toothNumberingSystem');
    return saved || 'FDI';
  });
  
  const [showTreatmentPricing, setShowTreatmentPricing] = useState(() => {
    const saved = localStorage.getItem('showTreatmentPricing');
    return saved === 'true' || false;
  });
  
  const [showReplacementOptionsTable, setShowReplacementOptionsTable] = useState<boolean>(() => {
    const saved = localStorage.getItem('showReplacementOptionsTable');
    return saved === 'true';
  });
  
  const [showToothNumberOverlay, setShowToothNumberOverlay] = useState<boolean>(() => {
    return false; // Default to false
  });
  
  const [textSizeMultiplier, setTextSizeMultiplier] = useState<number>(() => {
    const saved = localStorage.getItem('toothNumberTextSize');
    return saved ? parseFloat(saved) : 1.2;
  });
  
  const [isUpdatingTextSize, setIsUpdatingTextSize] = useState<boolean>(false);
  
  const updateSetting = (key: string, value: any) => {
    localStorage.setItem(key, value.toString());
    
    switch (key) {
      case 'toothNumberingSystem':
        setToothNumberingSystem(value);
        break;
      case 'showTreatmentPricing':
        setShowTreatmentPricing(value);
        break;
      case 'showReplacementOptionsTable':
        setShowReplacementOptionsTable(value);
        break;
      case 'showToothNumberOverlay':
        setShowToothNumberOverlay(value);
        break;
      case 'toothNumberTextSize':
        setTextSizeMultiplier(value);
        break;
    }
  };
  
  return {
    toothNumberingSystem,
    showTreatmentPricing,
    showReplacementOptionsTable,
    showToothNumberOverlay,
    textSizeMultiplier,
    isUpdatingTextSize,
    setIsUpdatingTextSize,
    updateSetting
  };
};