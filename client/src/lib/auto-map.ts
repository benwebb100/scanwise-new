/**
 * Auto-mapping logic for treatments based on conditions and tooth numbers
 * Pure functions for auto-mapping (no side effects)
 */

import type { Treatment, ConditionMapping } from './types/treatment';

/**
 * Auto-map treatments by condition and optional tooth number
 * 
 * @param conditionCode - The condition code (e.g., "irreversible_pulpitis")
 * @param toothFDI - Optional FDI tooth number (e.g., 11, 16, 46)
 * @param treatments - All available treatments
 * @param mappings - Condition to treatment mappings
 * @returns Array of treatment codes sorted by priority
 */
export function autoMapByConditionAndTooth(
  conditionCode: string,
  toothFDI: number | undefined,
  treatments: Treatment[],
  mappings: ConditionMapping[]
): string[] {
  // 1. Find base mappings for this condition
  const mapping = mappings.find(m => m.condition === conditionCode);
  if (!mapping) {
    return [];
  }

  // 2. If no tooth number provided, return base mappings sorted by priority
  if (!toothFDI) {
    return mapping.treatments
      .sort((a, b) => a.priority - b.priority)
      .map(t => t.treatment);
  }

  // 3. Refine based on tooth number rules
  const refinedTreatments: Array<{ code: string; priority: number }> = [];

  mapping.treatments.forEach(({ treatment: treatmentCode, priority }) => {
    const treatment = treatments.find(t => t.code === treatmentCode);
    if (!treatment) {
      // Treatment doesn't exist - skip
      return;
    }

    // Check if tooth number rules override this treatment
    if (treatment.toothNumberRules) {
      const rules = treatment.toothNumberRules;

      // Check specific tooth overrides first
      if (rules.specificFDI && rules.specificFDI[toothFDI]) {
        const override = rules.specificFDI[toothFDI];
        if (override.overrideCode) {
          // Use the override treatment instead
          refinedTreatments.push({ code: override.overrideCode, priority });
          return;
        }
      }

      // Check if this treatment applies to this tooth
      const appliesToTooth =
        (rules.anteriorFDI && rules.anteriorFDI.includes(toothFDI)) ||
        (rules.premolarFDI && rules.premolarFDI.includes(toothFDI)) ||
        (rules.molarFDI && rules.molarFDI.includes(toothFDI)) ||
        (rules.specificFDI && toothFDI in rules.specificFDI);

      if (appliesToTooth) {
        refinedTreatments.push({ code: treatmentCode, priority });
      }
    } else {
      // No tooth rules - always include
      refinedTreatments.push({ code: treatmentCode, priority });
    }
  });

  // 4. Sort by priority and return codes
  return refinedTreatments
    .sort((a, b) => a.priority - b.priority)
    .map(t => t.code);
}

/**
 * Get all treatments that can auto-map to a specific condition
 * (ignoring tooth-specific rules)
 */
export function getTreatmentsForCondition(
  conditionCode: string,
  mappings: ConditionMapping[]
): string[] {
  const mapping = mappings.find(m => m.condition === conditionCode);
  if (!mapping) {
    return [];
  }

  return mapping.treatments
    .sort((a, b) => a.priority - b.priority)
    .map(t => t.treatment);
}

/**
 * Get the primary (highest priority) treatment for a condition
 */
export function getPrimaryTreatment(
  conditionCode: string,
  toothFDI: number | undefined,
  treatments: Treatment[],
  mappings: ConditionMapping[]
): string | null {
  const mapped = autoMapByConditionAndTooth(conditionCode, toothFDI, treatments, mappings);
  return mapped.length > 0 ? mapped[0] : null;
}

/**
 * Check if a treatment is applicable to a specific tooth
 */
export function isTreatmentApplicableToTooth(
  treatment: Treatment,
  toothFDI: number
): boolean {
  if (!treatment.toothNumberRules) {
    // No rules means applicable to all teeth
    return true;
  }

  const rules = treatment.toothNumberRules;

  return (
    (rules.anteriorFDI && rules.anteriorFDI.includes(toothFDI)) ||
    (rules.premolarFDI && rules.premolarFDI.includes(toothFDI)) ||
    (rules.molarFDI && rules.molarFDI.includes(toothFDI)) ||
    (rules.specificFDI && toothFDI in rules.specificFDI)
  );
}

/**
 * Get tooth type from FDI number
 */
export function getToothType(toothFDI: number): 'anterior' | 'premolar' | 'molar' | 'unknown' {
  const toothInQuadrant = toothFDI % 10;

  if (toothInQuadrant >= 1 && toothInQuadrant <= 3) {
    return 'anterior';
  } else if (toothInQuadrant >= 4 && toothInQuadrant <= 5) {
    return 'premolar';
  } else if (toothInQuadrant >= 6 && toothInQuadrant <= 8) {
    return 'molar';
  }

  return 'unknown';
}

/**
 * Filter treatments by tooth type
 */
export function filterTreatmentsByToothType(
  treatments: Treatment[],
  toothFDI: number
): Treatment[] {
  return treatments.filter(t => isTreatmentApplicableToTooth(t, toothFDI));
}

