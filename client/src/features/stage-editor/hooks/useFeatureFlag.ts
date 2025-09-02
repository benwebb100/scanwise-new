import { useMemo } from 'react';

// Simple feature flag system
const FEATURE_FLAGS = {
  stageEditorV2: true, // Enable by default for development
} as const;

type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

/**
 * Hook to check if a feature flag is enabled
 */
export function useFeatureFlag(flag: FeatureFlagKey): boolean {
  return useMemo(() => {
    // Check environment variable first
    const envKey = `VITE_FEATURE_${flag.toUpperCase()}`;
    const envValue = import.meta.env[envKey];
    
    if (envValue !== undefined) {
      return envValue === 'true' || envValue === '1';
    }
    
    // Check localStorage for development overrides
    const storageKey = `feature_${flag}`;
    const storageValue = localStorage.getItem(storageKey);
    
    if (storageValue !== null) {
      return storageValue === 'true';
    }
    
    // Fall back to default
    return FEATURE_FLAGS[flag] ?? false;
  }, [flag]);
}

/**
 * Hook to toggle a feature flag in localStorage (development only)
 */
export function useFeatureFlagToggle(flag: FeatureFlagKey) {
  const isEnabled = useFeatureFlag(flag);
  
  const toggle = () => {
    const storageKey = `feature_${flag}`;
    localStorage.setItem(storageKey, (!isEnabled).toString());
    window.location.reload(); // Simple way to refresh the flag state
  };
  
  return { isEnabled, toggle };
}
