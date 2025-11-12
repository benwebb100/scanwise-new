// hooks/useTreatmentPricing.ts (was embedded in main component)
import { TreatmentService } from '@/lib/treatment-service';

/**
 * ✅ UPDATED: Now uses master database with clinic override support
 * Priority: Clinic Override > Master DB Default
 */
export const useTreatmentPricing = (treatmentSettings: any) => {
  const getPrice = (treatment: string): number => {
    // 1. Check for clinic override first
    const clinicPrice = treatmentSettings?.[treatment]?.price;
    if (clinicPrice && clinicPrice > 0) {
      return clinicPrice;
    }
    
    // 2. Fall back to master database default
    const defaultPrice = TreatmentService.getDefaultPrice(treatment);
    return defaultPrice || 0;
  };
  
  const getDuration = (treatment: string): number => {
    // 1. Check for clinic override first
    const clinicDuration = treatmentSettings?.[treatment]?.duration;
    if (clinicDuration && clinicDuration > 0) {
      return clinicDuration;
    }
    
    // 2. Fall back to master database default
    const defaultDuration = TreatmentService.getDefaultDuration(treatment);
    return defaultDuration || 30;
  };
  
  const validatePricing = (findings: any[]) => {
    const treatments = findings.map(f => f.treatment).filter(Boolean);
    const missingPrices = treatments.filter(treatment => {
      const price = getPrice(treatment);
      return !price || price === 0;
    });
    
    return {
      valid: missingPrices.length === 0,
      missingPrices
    };
  };

  return { getPrice, getDuration, validatePricing };
};