export interface TreatmentSetting {
  value: string;
  label: string;
  category: TreatmentCategory;
  defaultDuration: number; // in minutes
  defaultPrice: number; // in dollars
  customDuration?: number; // user's custom duration
  customPrice?: number; // user's custom price
}

export type TreatmentCategory = 
  | 'general'
  | 'preventive' 
  | 'restorative'
  | 'endodontics'
  | 'periodontics'
  | 'oral-surgery'
  | 'prosthodontics'
  | 'orthodontics'
  | 'emergency'
  | 'functional';

export interface TreatmentSettings {
  [treatmentValue: string]: {
    duration: number;
    price: number;
  };
}

export interface TreatmentCategoryGroup {
  id: TreatmentCategory;
  name: string;
  description: string;
  treatments: TreatmentSetting[];
}

export interface TreatmentSettingsState {
  settings: TreatmentSettings;
  hasUnsavedChanges: boolean;
  isLoading: boolean;
}

// Validation limits
export const TREATMENT_LIMITS = {
  DURATION: {
    MIN: 5, // 5 minutes
    MAX: 300, // 5 hours
    STEP: 5 // 5-minute increments
  },
  PRICE: {
    MIN: 10, // $10
    MAX: 5000, // $5000
    STEP: 5 // $5 increments
  }
} as const;
