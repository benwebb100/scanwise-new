import { useState, useEffect, useCallback } from 'react';
import { TreatmentSettings, TreatmentSettingsState, TreatmentSetting } from '@/types/treatment-settings.types';
import { ALL_TREATMENT_SETTINGS } from '@/data/treatment-settings-data';

const STORAGE_KEY = 'treatmentSettings';

// Initialize default settings from treatment data
const getDefaultSettings = (): TreatmentSettings => {
  const defaultSettings: TreatmentSettings = {};
  
  ALL_TREATMENT_SETTINGS.forEach(treatment => {
    defaultSettings[treatment.value] = {
      duration: treatment.defaultDuration,
      price: treatment.defaultPrice
    };
  });
  
  return defaultSettings;
};

// Load settings from localStorage
const loadSettings = (): TreatmentSettings => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to ensure all treatments are included
      const defaults = getDefaultSettings();
      return { ...defaults, ...parsed };
    }
  } catch (error) {
    console.error('Error loading treatment settings:', error);
  }
  
  return getDefaultSettings();
};

// Save settings to localStorage
const saveSettings = (settings: TreatmentSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving treatment settings:', error);
  }
};

export const useTreatmentSettings = () => {
  const [state, setState] = useState<TreatmentSettingsState>({
    settings: getDefaultSettings(),
    hasUnsavedChanges: false,
    isLoading: false
  });

  // Load settings on mount
  useEffect(() => {
    setState(prev => ({
      ...prev,
      settings: loadSettings()
    }));
  }, []);

  // Update a single treatment setting
  const updateTreatmentSetting = useCallback((
    treatmentValue: string, 
    updates: { duration?: number; price?: number }
  ) => {
    setState(prev => {
      const newSettings = {
        ...prev.settings,
        [treatmentValue]: {
          ...prev.settings[treatmentValue],
          ...updates
        }
      };
      
      return {
        ...prev,
        settings: newSettings,
        hasUnsavedChanges: true
      };
    });
  }, []);

  // Update multiple treatment settings
  const updateMultipleSettings = useCallback((updates: TreatmentSettings) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...updates },
      hasUnsavedChanges: true
    }));
  }, []);

  // Save all changes to localStorage
  const saveChanges = useCallback(() => {
    setState(prev => {
      saveSettings(prev.settings);
      return {
        ...prev,
        hasUnsavedChanges: false
      };
    });
  }, []);

  // Reset to default settings
  const resetToDefaults = useCallback(() => {
    const defaults = getDefaultSettings();
    setState(prev => ({
      ...prev,
      settings: defaults,
      hasUnsavedChanges: true
    }));
  }, []);

  // Reset specific category to defaults
  const resetCategoryToDefaults = useCallback((category: string) => {
    setState(prev => {
      const defaults = getDefaultSettings();
      const categoryDefaults: TreatmentSettings = {};
      
      // Get treatments in this category
      const categoryTreatments = ALL_TREATMENT_SETTINGS.filter(t => t.category === category);
      
      categoryTreatments.forEach(treatment => {
        categoryDefaults[treatment.value] = defaults[treatment.value];
      });
      
      return {
        ...prev,
        settings: { ...prev.settings, ...categoryDefaults },
        hasUnsavedChanges: true
      };
    });
  }, []);

  // Get treatment setting with fallback to defaults
  const getTreatmentSetting = useCallback((treatmentValue: string) => {
    const custom = state.settings[treatmentValue];
    const defaultSetting = ALL_TREATMENT_SETTINGS.find(t => t.value === treatmentValue);
    
    if (!defaultSetting) {
      return { duration: 30, price: 0 }; // Fallback
    }
    
    return {
      duration: custom?.duration ?? defaultSetting.defaultDuration,
      price: custom?.price ?? defaultSetting.defaultPrice
    };
  }, [state.settings]);

  // Export settings as JSON
  const exportSettings = useCallback(() => {
    const dataStr = JSON.stringify(state.settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'treatment-settings.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [state.settings]);

  // Import settings from JSON
  const importSettings = useCallback((file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          const defaults = getDefaultSettings();
          const mergedSettings = { ...defaults, ...imported };
          
          setState(prev => ({
            ...prev,
            settings: mergedSettings,
            hasUnsavedChanges: true
          }));
          
          resolve(true);
        } catch (error) {
          console.error('Error importing settings:', error);
          resolve(false);
        }
      };
      reader.readAsText(file);
    });
  }, []);

  return {
    settings: state.settings,
    hasUnsavedChanges: state.hasUnsavedChanges,
    isLoading: state.isLoading,
    updateTreatmentSetting,
    updateMultipleSettings,
    saveChanges,
    resetToDefaults,
    resetCategoryToDefaults,
    getTreatmentSetting,
    exportSettings,
    importSettings
  };
};
