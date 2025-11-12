/**
 * Data import and validation for treatment database batches
 * Handles idempotent merging of JSON batches while preserving clinic overrides
 */

import type { Treatment, Condition, ConditionMapping, BatchImport, TreatmentCategory } from './types/treatment';

// Valid categories
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

// Valid FDI tooth numbers (11-18, 21-28, 31-38, 41-48)
const VALID_FDI_TEETH = [
  11, 12, 13, 14, 15, 16, 17, 18,
  21, 22, 23, 24, 25, 26, 27, 28,
  31, 32, 33, 34, 35, 36, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48
];

export interface ImportResult {
  treatmentsAdded: number;
  treatmentsUpdated: number;
  conditionsAdded: number;
  conditionsUpdated: number;
  mappingsAdded: number;
  mappingsUpdated: number;
  conflicts: string[];
  missingFields: string[];
  orphanedMappings: string[];
  errors: string[];
}

/**
 * Validate a single treatment
 */
function validateTreatment(treatment: any, index: number): string[] {
  const errors: string[] = [];
  const prefix = `Treatment[${index}]`;

  // Required fields
  if (!treatment.code || typeof treatment.code !== 'string') {
    errors.push(`${prefix}: missing or invalid 'code'`);
  }
  if (!treatment.displayName || typeof treatment.displayName !== 'string') {
    errors.push(`${prefix}: missing or invalid 'displayName'`);
  }
  if (!treatment.friendlyPatientName || typeof treatment.friendlyPatientName !== 'string') {
    errors.push(`${prefix}: missing or invalid 'friendlyPatientName'`);
  }
  if (!treatment.category || !VALID_CATEGORIES.includes(treatment.category)) {
    errors.push(`${prefix} (${treatment.code}): invalid category '${treatment.category}'. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
  if (!treatment.description || typeof treatment.description !== 'string') {
    errors.push(`${prefix} (${treatment.code}): missing or invalid 'description'`);
  }
  if (typeof treatment.defaultDuration !== 'number' || treatment.defaultDuration <= 0) {
    errors.push(`${prefix} (${treatment.code}): missing or invalid 'defaultDuration' (must be positive number)`);
  }

  // Handle both old format (defaultPrice object) and new format (defaultPriceAUD number)
  if (treatment.defaultPrice) {
    if (!treatment.defaultPrice.AU || typeof treatment.defaultPrice.AU.amount !== 'number') {
      errors.push(`${prefix} (${treatment.code}): missing or invalid 'defaultPrice.AU.amount'`);
    }
  } else if (typeof treatment.defaultPriceAUD !== 'number' || treatment.defaultPriceAUD < 0) {
    errors.push(`${prefix} (${treatment.code}): missing or invalid 'defaultPriceAUD'`);
  }

  if (!treatment.insuranceCodes || treatment.insuranceCodes.AU === undefined) {
    errors.push(`${prefix} (${treatment.code}): missing 'insuranceCodes.AU'`);
  }

  // Validate tooth number rules if present
  if (treatment.toothNumberRules) {
    const rules = treatment.toothNumberRules;
    const validateFDI = (teeth: number[], fieldName: string) => {
      teeth.forEach(tooth => {
        if (!VALID_FDI_TEETH.includes(tooth)) {
          errors.push(`${prefix} (${treatment.code}): invalid FDI tooth ${tooth} in ${fieldName}`);
        }
      });
    };

    if (rules.anteriorFDI) validateFDI(rules.anteriorFDI, 'anteriorFDI');
    if (rules.premolarFDI) validateFDI(rules.premolarFDI, 'premolarFDI');
    if (rules.molarFDI) validateFDI(rules.molarFDI, 'molarFDI');

    if (rules.specificFDI) {
      Object.keys(rules.specificFDI).forEach(toothStr => {
        const tooth = parseInt(toothStr);
        if (!VALID_FDI_TEETH.includes(tooth)) {
          errors.push(`${prefix} (${treatment.code}): invalid FDI tooth ${tooth} in specificFDI`);
        }
      });
    }
  }

  return errors;
}

/**
 * Normalize treatment from batch format to storage format
 */
function normalizeTreatment(treatment: any): Treatment {
  // Handle defaultPrice object format -> convert to defaultPriceAUD
  let defaultPriceAUD: number;
  if (treatment.defaultPrice && treatment.defaultPrice.AU) {
    defaultPriceAUD = treatment.defaultPrice.AU.amount;
  } else {
    defaultPriceAUD = treatment.defaultPriceAUD;
  }

  return {
    code: treatment.code,
    displayName: treatment.displayName,
    friendlyPatientName: treatment.friendlyPatientName,
    category: treatment.category,
    description: treatment.description,
    defaultDuration: treatment.defaultDuration,
    defaultPriceAUD,
    insuranceCodes: treatment.insuranceCodes,
    autoMapConditions: treatment.autoMapConditions || [],
    toothNumberRules: treatment.toothNumberRules,
    replacementOptions: treatment.replacementOptions || [],
    metadata: treatment.metadata || {}
  };
}

/**
 * Merge treatments into existing array (idempotent by code)
 */
export function mergeTreatments(
  existing: Treatment[],
  incoming: any[]
): { merged: Treatment[]; added: number; updated: number; errors: string[] } {
  const errors: string[] = [];
  let added = 0;
  let updated = 0;

  // Validate all incoming treatments first
  incoming.forEach((treatment, index) => {
    const validationErrors = validateTreatment(treatment, index);
    errors.push(...validationErrors);
  });

  if (errors.length > 0) {
    return { merged: existing, added: 0, updated: 0, errors };
  }

  // Create a map of existing treatments by code
  const existingMap = new Map(existing.map(t => [t.code, t]));
  const duplicateCodes = new Set<string>();

  // Process incoming treatments
  incoming.forEach(treatment => {
    const normalized = normalizeTreatment(treatment);

    // Check for duplicates in incoming batch
    if (duplicateCodes.has(normalized.code)) {
      errors.push(`Duplicate code '${normalized.code}' in incoming batch`);
      return;
    }
    duplicateCodes.add(normalized.code);

    if (existingMap.has(normalized.code)) {
      // Update existing (merge fields)
      const existing = existingMap.get(normalized.code)!;
      existingMap.set(normalized.code, { ...existing, ...normalized });
      updated++;
    } else {
      // Add new
      existingMap.set(normalized.code, normalized);
      added++;
    }
  });

  // Convert back to array and sort
  const merged = Array.from(existingMap.values()).sort((a, b) => {
    const nameCompare = a.displayName.localeCompare(b.displayName);
    return nameCompare !== 0 ? nameCompare : a.code.localeCompare(b.code);
  });

  return { merged, added, updated, errors };
}

/**
 * Merge conditions into existing array (idempotent by value)
 */
export function mergeConditions(
  existing: Condition[],
  incoming: Condition[]
): { merged: Condition[]; added: number; updated: number } {
  const existingMap = new Map(existing.map(c => [c.value, c]));
  let added = 0;
  let updated = 0;

  incoming.forEach(condition => {
    if (existingMap.has(condition.value)) {
      existingMap.set(condition.value, condition);
      updated++;
    } else {
      existingMap.set(condition.value, condition);
      added++;
    }
  });

  const merged = Array.from(existingMap.values()).sort((a, b) =>
    a.label.localeCompare(b.label)
  );

  return { merged, added, updated };
}

/**
 * Merge mappings into existing array (idempotent by condition)
 */
export function mergeMappings(
  existing: ConditionMapping[],
  incoming: ConditionMapping[]
): { merged: ConditionMapping[]; added: number; updated: number } {
  const existingMap = new Map(existing.map(m => [m.condition, m]));
  let added = 0;
  let updated = 0;

  incoming.forEach(mapping => {
    if (existingMap.has(mapping.condition)) {
      existingMap.set(mapping.condition, mapping);
      updated++;
    } else {
      existingMap.set(mapping.condition, mapping);
      added++;
    }
  });

  const merged = Array.from(existingMap.values()).sort((a, b) =>
    a.condition.localeCompare(b.condition)
  );

  return { merged, added, updated };
}

/**
 * Validate mappings reference existing treatments
 */
export function validateMappings(
  mappings: ConditionMapping[],
  treatments: Treatment[]
): string[] {
  const treatmentCodes = new Set(treatments.map(t => t.code));
  const orphaned: string[] = [];

  mappings.forEach(mapping => {
    mapping.treatments.forEach(({ treatment }) => {
      if (!treatmentCodes.has(treatment)) {
        orphaned.push(`Mapping '${mapping.condition}' → '${treatment}' (treatment does not exist)`);
      }
    });
  });

  return orphaned;
}

/**
 * Import a batch of data
 */
export async function importBatch(
  batch: BatchImport,
  existingTreatments: Treatment[],
  existingConditions: Condition[],
  existingMappings: ConditionMapping[]
): Promise<ImportResult> {
  const result: ImportResult = {
    treatmentsAdded: 0,
    treatmentsUpdated: 0,
    conditionsAdded: 0,
    conditionsUpdated: 0,
    mappingsAdded: 0,
    mappingsUpdated: 0,
    conflicts: [],
    missingFields: [],
    orphanedMappings: [],
    errors: []
  };

  // Merge treatments
  const treatmentResult = mergeTreatments(existingTreatments, batch.treatments || []);
  result.treatmentsAdded = treatmentResult.added;
  result.treatmentsUpdated = treatmentResult.updated;
  result.errors.push(...treatmentResult.errors);

  const mergedTreatments = treatmentResult.merged;

  // Merge conditions
  if (batch.conditions && batch.conditions.length > 0) {
    const conditionResult = mergeConditions(existingConditions, batch.conditions);
    result.conditionsAdded = conditionResult.added;
    result.conditionsUpdated = conditionResult.updated;
  }

  // Merge mappings
  if (batch.mappings && batch.mappings.length > 0) {
    const mappingResult = mergeMappings(existingMappings, batch.mappings);
    result.mappingsAdded = mappingResult.added;
    result.mappingsUpdated = mappingResult.updated;

    // Validate mappings
    result.orphanedMappings = validateMappings(mappingResult.merged, mergedTreatments);
  }

  return result;
}

