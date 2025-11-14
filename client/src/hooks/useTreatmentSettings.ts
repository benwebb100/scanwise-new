import { useState, useEffect, useCallback } from 'react';
import { TreatmentSettings, TreatmentSettingsState, TreatmentSetting } from '@/types/treatment-settings.types';
import { api } from '@/services/api';

const STORAGE_KEY = 'treatmentSettings';

// Load settings from Supabase - backend already merges clinic_pricing + dental_treatments
const loadSettings = async (): Promise<TreatmentSettings> => {
  try {
    console.log('💾 Loading treatment settings from backend...');
    const response = await api.getTreatmentSettings();
    
    if (response.status === 'success' && response.treatment_data) {
      console.log('✅ Loaded treatment settings from backend:', Object.keys(response.treatment_data).length, 'treatments');
      // Backend already returns merged data (clinic customizations + database defaults)
      // No need to merge again - just use what backend provides
      localStorage.setItem(STORAGE_KEY, JSON.stringify(response.treatment_data));
      return response.treatment_data;
    }
  } catch (error) {
    console.error('❌ Error loading treatment settings from backend:', error);
    // Fallback to localStorage for offline support
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        console.log('⚠️ Using cached settings from localStorage');
        return JSON.parse(saved);
      }
    } catch (localError) {
      console.error('❌ Error loading from localStorage:', localError);
    }
  }
  
  console.log('⚠️ No settings available, returning empty object');
  return {};
};

// Save settings to Supabase (with localStorage fallback)
const saveSettings = async (settings: TreatmentSettings): Promise<boolean> => {
  try {
    await api.saveTreatmentSettings(settings);
    // Also save to localStorage as backup
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving treatment settings to Supabase:', error);
    // Fallback to localStorage only
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      return false; // Indicate that Supabase save failed
    } catch (localError) {
      console.error('Error saving treatment settings to localStorage:', localError);
      return false;
    }
  }
};

export const useTreatmentSettings = () => {
  const [state, setState] = useState<TreatmentSettingsState>({
    settings: {},
    hasUnsavedChanges: false,
    isLoading: true
  });

  // Load settings on mount
  useEffect(() => {
    const loadInitialSettings = async () => {
      setState(prev => ({ ...prev, isLoading: true }));
      try {
        const settings = await loadSettings();
        setState(prev => ({
          ...prev,
          settings,
          isLoading: false
        }));
      } catch (error) {
        console.error('Failed to load initial settings:', error);
        setState(prev => ({
          ...prev,
          isLoading: false
        }));
      }
    };

    loadInitialSettings();
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

  // Save all changes to Supabase
  const saveChanges = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const success = await saveSettings(state.settings);
      setState(prev => ({
        ...prev,
        hasUnsavedChanges: false,
        isLoading: false
      }));
      return success;
    } catch (error) {
      console.error('Failed to save changes:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.settings]);

  // Reset specific category to defaults - reload from backend
  const resetCategoryToDefaults = useCallback(async (category: string) => {
    try {
      // Reload settings from backend to get fresh defaults
      const freshSettings = await loadSettings();
      setState(prev => ({
        ...prev,
        settings: freshSettings,
        hasUnsavedChanges: true
      }));
    } catch (error) {
      console.error('Failed to reset category:', error);
    }
  }, []);

  // Get treatment setting - backend already provides merged data
  const getTreatmentSetting = useCallback((treatmentValue: string): { duration: number; price: number } => {
    // First check if we have a clinic-specific override
    const setting = state.settings[treatmentValue];
    
    if (setting) {
      return setting;
    }
    
    // If no clinic override, get defaults from master database
    console.log(`📋 No clinic override for: ${treatmentValue}, using master database defaults`);
    
    // Try to get from TreatmentService (master database)
    try {
      const { TreatmentService } = require('@/lib/treatment-service');
      const masterTreatment = TreatmentService.getByCode(treatmentValue);
      
      if (masterTreatment) {
        console.log(`✅ Found in master database: ${masterTreatment.displayName}`);
        return {
          duration: masterTreatment.defaultDuration || 30,
          price: masterTreatment.defaultPriceAUD || 0
        };
      }
    } catch (error) {
      console.warn('Could not load TreatmentService:', error);
    }
    
    // Final fallback if treatment not found anywhere
    console.warn(`⚠️ Treatment not found in settings or master database: ${treatmentValue}`);
    return { duration: 30, price: 0 };
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
          
          setState(prev => ({
            ...prev,
            settings: { ...prev.settings, ...imported },
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
    resetCategoryToDefaults,
    getTreatmentSetting,
    exportSettings,
    importSettings
  };
};
