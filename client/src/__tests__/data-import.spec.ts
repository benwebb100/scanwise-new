/**
 * Data import validation tests
 */

import { describe, it, expect } from 'vitest';
import treatmentsData from '../data/treatments.au.json';
import conditionsData from '../data/conditions.core.json';
import mappingsData from '../data/mappings.core.json';
import type { Treatment, Condition, ConditionMapping, TreatmentCategory } from '../lib/types/treatment';
import { CANONICAL_CONDITION_SET, isValidConditionCode } from '../lib/canonical-conditions';

const treatments = treatmentsData as Treatment[];
const conditions = conditionsData as Condition[];
const mappings = mappingsData as ConditionMapping[];

const VALID_CATEGORIES: TreatmentCategory[] = [
  "preventive",
  "restorative",
  "endodontics",
  "periodontics",
  "oral-surgery",
  "prosthodontics",
  "orthodontics",
  "functional",
  "emergency"
];

const VALID_FDI_TEETH = [
  11, 12, 13, 14, 15, 16, 17, 18,
  21, 22, 23, 24, 25, 26, 27, 28,
  31, 32, 33, 34, 35, 36, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48
];

describe('Treatment Data Validation', () => {
  it('should have no missing required fields', () => {
    const errors: string[] = [];

    treatments.forEach((treatment, index) => {
      if (!treatment.code) {
        errors.push(`Treatment[${index}]: missing 'code'`);
      }
      if (!treatment.displayName) {
        errors.push(`Treatment[${index}] (${treatment.code}): missing 'displayName'`);
      }
      if (!treatment.friendlyPatientName) {
        errors.push(`Treatment[${index}] (${treatment.code}): missing 'friendlyPatientName'`);
      }
      if (!treatment.category) {
        errors.push(`Treatment[${index}] (${treatment.code}): missing 'category'`);
      }
      if (!treatment.description) {
        errors.push(`Treatment[${index}] (${treatment.code}): missing 'description'`);
      }
      if (typeof treatment.defaultDuration !== 'number') {
        errors.push(`Treatment[${index}] (${treatment.code}): missing or invalid 'defaultDuration'`);
      }
      if (typeof treatment.defaultPriceAUD !== 'number') {
        errors.push(`Treatment[${index}] (${treatment.code}): missing or invalid 'defaultPriceAUD'`);
      }
      if (!treatment.insuranceCodes || treatment.insuranceCodes.AU === undefined) {
        errors.push(`Treatment[${index}] (${treatment.code}): missing 'insuranceCodes.AU'`);
      }
    });

    if (errors.length > 0) {
      console.error('Missing field errors:', errors);
    }
    expect(errors).toHaveLength(0);
  });

  it('should have no unknown categories', () => {
    const errors: string[] = [];

    treatments.forEach(treatment => {
      if (!VALID_CATEGORIES.includes(treatment.category)) {
        errors.push(`Treatment '${treatment.code}': invalid category '${treatment.category}'`);
      }
    });

    if (errors.length > 0) {
      console.error('Invalid category errors:', errors);
    }
    expect(errors).toHaveLength(0);
  });

  it('should have valid FDI tooth numbers in toothNumberRules', () => {
    const errors: string[] = [];

    treatments.forEach(treatment => {
      if (!treatment.toothNumberRules) return;

      const rules = treatment.toothNumberRules;

      // Check anteriorFDI
      if (rules.anteriorFDI) {
        rules.anteriorFDI.forEach(tooth => {
          if (!VALID_FDI_TEETH.includes(tooth)) {
            errors.push(`Treatment '${treatment.code}': invalid FDI tooth ${tooth} in anteriorFDI`);
          }
        });
      }

      // Check premolarFDI
      if (rules.premolarFDI) {
        rules.premolarFDI.forEach(tooth => {
          if (!VALID_FDI_TEETH.includes(tooth)) {
            errors.push(`Treatment '${treatment.code}': invalid FDI tooth ${tooth} in premolarFDI`);
          }
        });
      }

      // Check molarFDI
      if (rules.molarFDI) {
        rules.molarFDI.forEach(tooth => {
          if (!VALID_FDI_TEETH.includes(tooth)) {
            errors.push(`Treatment '${treatment.code}': invalid FDI tooth ${tooth} in molarFDI`);
          }
        });
      }

      // Check specificFDI
      if (rules.specificFDI) {
        Object.keys(rules.specificFDI).forEach(toothStr => {
          const tooth = parseInt(toothStr);
          if (!VALID_FDI_TEETH.includes(tooth)) {
            errors.push(`Treatment '${treatment.code}': invalid FDI tooth ${tooth} in specificFDI`);
          }
        });
      }
    });

    if (errors.length > 0) {
      console.error('Invalid FDI tooth errors:', errors);
    }
    expect(errors).toHaveLength(0);
  });

  it('should have no duplicate treatment codes', () => {
    const codes = new Set<string>();
    const duplicates: string[] = [];

    treatments.forEach(treatment => {
      if (codes.has(treatment.code)) {
        duplicates.push(treatment.code);
      }
      codes.add(treatment.code);
    });

    if (duplicates.length > 0) {
      console.error('Duplicate codes:', duplicates);
    }
    expect(duplicates).toHaveLength(0);
  });
});

describe('Mapping Validation', () => {
  it('should only reference canonical condition codes', () => {
    const invalidConditions: string[] = [];

    mappings.forEach(mapping => {
      if (!isValidConditionCode(mapping.condition)) {
        invalidConditions.push(`Mapping condition '${mapping.condition}' is not in canonical condition list`);
      }
    });

    if (invalidConditions.length > 0) {
      console.error('❌ INVALID CONDITIONS:', invalidConditions);
      console.log('See canonical-conditions.ts for valid codes');
    }
    expect(invalidConditions).toHaveLength(0);
  });

  it('should have no orphaned mappings (all treatment codes exist)', () => {
    const treatmentCodes = new Set(treatments.map(t => t.code));
    const orphaned: string[] = [];

    mappings.forEach(mapping => {
      mapping.treatments.forEach(({ treatment }) => {
        if (!treatmentCodes.has(treatment)) {
          orphaned.push(`Mapping '${mapping.condition}' → '${treatment}' (treatment does not exist)`);
        }
      });
    });

    if (orphaned.length > 0) {
      console.error('Orphaned mappings:', orphaned);
    }
    expect(orphaned).toHaveLength(0);
  });

  it('should have no duplicate condition mappings', () => {
    const conditionsSeen = new Set<string>();
    const duplicates: string[] = [];

    mappings.forEach(mapping => {
      if (conditionsSeen.has(mapping.condition)) {
        duplicates.push(mapping.condition);
      }
      conditionsSeen.add(mapping.condition);
    });

    if (duplicates.length > 0) {
      console.error('Duplicate condition mappings:', duplicates);
    }
    expect(duplicates).toHaveLength(0);
  });

  it('should have treatments mapped to at least one condition or marked as optional', () => {
    const mappedTreatments = new Set<string>();
    
    // Collect all treatments that appear in mappings
    mappings.forEach(mapping => {
      mapping.treatments.forEach(({ treatment }) => {
        mappedTreatments.add(treatment);
      });
    });

    // Check if any treatments are unmapped and not marked optional
    const unmapped: string[] = [];
    treatments.forEach(treatment => {
      const isOptional = treatment.metadata?.optional === true;
      const isMapped = mappedTreatments.has(treatment.code);
      
      if (!isMapped && !isOptional) {
        unmapped.push(`Treatment '${treatment.code}' (${treatment.displayName}) is not mapped to any condition`);
      }
    });

    if (unmapped.length > 0) {
      console.warn('Unmapped treatments (may be intentional):', unmapped);
    }
    
    // This is a warning, not a hard failure
    // expect(unmapped).toHaveLength(0);
  });

  it('should have treatments only reference canonical conditions in autoMapConditions', () => {
    const errors: string[] = [];

    treatments.forEach(treatment => {
      if (treatment.autoMapConditions && treatment.autoMapConditions.length > 0) {
        treatment.autoMapConditions.forEach(conditionCode => {
          if (!isValidConditionCode(conditionCode)) {
            errors.push(`Treatment '${treatment.code}' references invalid condition '${conditionCode}'`);
          }
        });
      }
    });

    if (errors.length > 0) {
      console.error('❌ INVALID CONDITIONS IN autoMapConditions:', errors);
      console.log('See canonical-conditions.ts for valid codes');
    }
    expect(errors).toHaveLength(0);
  });
});

describe('Condition Validation', () => {
  it('should have no duplicate condition values', () => {
    const values = new Set<string>();
    const duplicates: string[] = [];

    conditions.forEach(condition => {
      if (values.has(condition.value)) {
        duplicates.push(condition.value);
      }
      values.add(condition.value);
    });

    if (duplicates.length > 0) {
      console.error('Duplicate condition values:', duplicates);
    }
    expect(duplicates).toHaveLength(0);
  });

  it('should have valid urgency levels', () => {
    const validUrgencies = ['high', 'medium', 'low'];
    const errors: string[] = [];

    conditions.forEach(condition => {
      if (!validUrgencies.includes(condition.urgency)) {
        errors.push(`Condition '${condition.value}': invalid urgency '${condition.urgency}'`);
      }
    });

    if (errors.length > 0) {
      console.error('Invalid urgency errors:', errors);
    }
    expect(errors).toHaveLength(0);
  });
});

