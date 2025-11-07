// import { useTreatmentSettings } from '@/hooks/useTreatmentSettings';
// import { TREATMENT_DURATIONS } from '@/features/stage-editor/utils/treatment-urgency';
// import { DEFAULT_TREATMENT_PRICES } from '@/data/dental-data';

// /**
//  * Get treatment duration from custom settings or fallback to default
//  */
// export const getTreatmentDuration = (treatmentValue: string, customSettings?: { [key: string]: { duration: number; price: number } }): number => {
//   // First check custom settings
//   if (customSettings && customSettings[treatmentValue]) {
//     return customSettings[treatmentValue].duration;
//   }
  
//   // Fallback to default durations
//   return TREATMENT_DURATIONS[treatmentValue] || 30; // Default to 30 minutes
// };

// /**
//  * Get treatment price from custom settings or fallback to default
//  */
// export const getTreatmentPrice = (treatmentValue: string, customSettings?: { [key: string]: { duration: number; price: number } }): number => {
//   // First check custom settings
//   if (customSettings && customSettings[treatmentValue]) {
//     return customSettings[treatmentValue].price;
//   }
  
//   // Fallback to default prices
//   return DEFAULT_TREATMENT_PRICES[treatmentValue] || 0;
// };

// /**
//  * Hook to get treatment settings for use in components
//  */
// export const useTreatmentSettingsUtils = () => {
//   const { settings } = useTreatmentSettings();
  
//   return {
//     getDuration: (treatmentValue: string) => getTreatmentDuration(treatmentValue, settings),
//     getPrice: (treatmentValue: string) => getTreatmentPrice(treatmentValue, settings),
//     settings
//   };
// };
