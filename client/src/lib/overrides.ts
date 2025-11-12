/**
 * Clinic-specific overrides for treatment settings
 * Overrides are stored separately and never overwritten by batch imports
 */

import type { Treatment } from './types/treatment';

export interface TreatmentOverride {
  priceAUD?: number;
  duration?: number;
  adaCodeAU?: string;
}

export interface OverridesStore {
  [clinicId: string]: {
    [treatmentCode: string]: TreatmentOverride;
  };
}

/**
 * Load overrides from storage
 */
export async function loadOverrides(): Promise<OverridesStore> {
  try {
    // In production, this would load from Supabase or local storage
    // For now, load from JSON file
    const response = await fetch('/src/data/overrides.json');
    const data = await response.json();
    return data.overrides || {};
  } catch (error) {
    console.warn('Failed to load overrides:', error);
    return {};
  }
}

/**
 * Save overrides to storage
 */
export async function saveOverrides(overrides: OverridesStore): Promise<void> {
  try {
    // In production, this would save to Supabase
    // For now, we'll just log it
    console.log('Saving overrides:', overrides);
    
    // Note: In a real implementation, you'd save to Supabase like:
    // await supabase.from('treatment_overrides').upsert(...)
  } catch (error) {
    console.error('Failed to save overrides:', error);
    throw error;
  }
}

/**
 * Get override for a specific clinic and treatment
 */
export function getOverride(
  overrides: OverridesStore,
  clinicId: string,
  treatmentCode: string
): TreatmentOverride | null {
  return overrides[clinicId]?.[treatmentCode] || null;
}

/**
 * Set override for a specific clinic and treatment
 */
export function setOverride(
  overrides: OverridesStore,
  clinicId: string,
  treatmentCode: string,
  override: TreatmentOverride
): OverridesStore {
  return {
    ...overrides,
    [clinicId]: {
      ...overrides[clinicId],
      [treatmentCode]: override
    }
  };
}

/**
 * Apply overrides to a treatment
 */
export function applyOverrides(
  treatment: Treatment,
  override: TreatmentOverride | null
): Treatment & { effectivePriceAUD: number; effectiveDuration: number } {
  return {
    ...treatment,
    effectivePriceAUD: override?.priceAUD ?? treatment.defaultPriceAUD,
    effectiveDuration: override?.duration ?? treatment.defaultDuration
  };
}

/**
 * Get effective treatment with overrides applied
 */
export function getEffectiveTreatment(
  treatment: Treatment,
  overrides: OverridesStore,
  clinicId: string
): Treatment & { effectivePriceAUD: number; effectiveDuration: number } {
  const override = getOverride(overrides, clinicId, treatment.code);
  return applyOverrides(treatment, override);
}

/**
 * Bulk apply overrides to multiple treatments
 */
export function applyOverridesToAll(
  treatments: Treatment[],
  overrides: OverridesStore,
  clinicId: string
): Array<Treatment & { effectivePriceAUD: number; effectiveDuration: number }> {
  return treatments.map(treatment => getEffectiveTreatment(treatment, overrides, clinicId));
}

