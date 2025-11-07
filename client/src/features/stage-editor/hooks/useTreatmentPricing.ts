// hooks/useTreatmentPricing.ts (was embedded in main component)
export const useTreatmentPricing = (treatmentSettings: any) => {
  const getPrice = (treatment: string): number => {
    return treatmentSettings?.[treatment]?.price || 0;
  };
  
  const getDuration = (treatment: string): number => {
    return treatmentSettings?.[treatment]?.duration || 60;
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