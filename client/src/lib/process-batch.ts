/**
 * Process and import treatment database batches
 */

import type { Treatment, Condition, ConditionMapping, BatchImport } from './types/treatment';
import { importBatch, type ImportResult } from './data-import';
import treatmentsData from '../data/treatments.au.json';
import conditionsData from '../data/conditions.core.json';
import mappingsData from '../data/mappings.core.json';

/**
 * Process a batch import
 */
export async function processBatch(batchJson: string): Promise<ImportResult> {
  try {
    // Parse incoming batch
    const batch: BatchImport = JSON.parse(batchJson);

    // Load existing data
    const existingTreatments = treatmentsData as Treatment[];
    const existingConditions = conditionsData as Condition[];
    const existingMappings = mappingsData as ConditionMapping[];

    // Import batch
    const result = await importBatch(
      batch,
      existingTreatments,
      existingConditions,
      existingMappings
    );

    return result;
  } catch (error) {
    return {
      treatmentsAdded: 0,
      treatmentsUpdated: 0,
      conditionsAdded: 0,
      conditionsUpdated: 0,
      mappingsAdded: 0,
      mappingsUpdated: 0,
      conflicts: [],
      missingFields: [],
      orphanedMappings: [],
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Format import result as a summary
 */
export function formatImportSummary(result: ImportResult, batchNumber: number): string {
  const lines: string[] = [];
  
  lines.push('📦 BATCH ' + batchNumber + ' SUMMARY');
  lines.push('─────────────────────────────────────────');
  
  // Counts
  lines.push(`✅ Treatments:  ${result.treatmentsAdded} added, ${result.treatmentsUpdated} updated`);
  lines.push(`✅ Conditions:  ${result.conditionsAdded} added, ${result.conditionsUpdated} updated`);
  lines.push(`✅ Mappings:    ${result.mappingsAdded} added, ${result.mappingsUpdated} updated`);
  lines.push('');
  
  // Issues
  if (result.conflicts.length > 0) {
    lines.push(`⚠️  Conflicts: ${result.conflicts.length}`);
    result.conflicts.slice(0, 5).forEach(c => lines.push(`   - ${c}`));
    if (result.conflicts.length > 5) {
      lines.push(`   ... and ${result.conflicts.length - 5} more`);
    }
  } else {
    lines.push('⚠️  Conflicts: None');
  }
  
  if (result.missingFields.length > 0) {
    lines.push(`⚠️  Missing Fields: ${result.missingFields.length}`);
    result.missingFields.slice(0, 5).forEach(m => lines.push(`   - ${m}`));
    if (result.missingFields.length > 5) {
      lines.push(`   ... and ${result.missingFields.length - 5} more`);
    }
  } else {
    lines.push('⚠️  Missing Fields: None');
  }
  
  if (result.orphanedMappings.length > 0) {
    lines.push(`⚠️  Orphaned Mappings: ${result.orphanedMappings.length}`);
    result.orphanedMappings.slice(0, 5).forEach(o => lines.push(`   - ${o}`));
    if (result.orphanedMappings.length > 5) {
      lines.push(`   ... and ${result.orphanedMappings.length - 5} more`);
    }
  } else {
    lines.push('⚠️  Orphaned Mappings: None (all codes exist)');
  }
  
  if (result.errors.length > 0) {
    lines.push('');
    lines.push(`❌ ERRORS: ${result.errors.length}`);
    result.errors.forEach(e => lines.push(`   ${e}`));
  }
  
  lines.push('');
  lines.push('📋 Next: Ready for Batch ' + (batchNumber + 1));
  
  return lines.join('\n');
}

/**
 * Save processed data back to files
 * Note: In a real implementation, this would write to the filesystem
 * For now, it just returns the data for manual saving
 */
export function prepareDataForSave(
  treatments: Treatment[],
  conditions: Condition[],
  mappings: ConditionMapping[]
): {
  treatments: string;
  conditions: string;
  mappings: string;
} {
  return {
    treatments: JSON.stringify(treatments, null, 2),
    conditions: JSON.stringify(conditions, null, 2),
    mappings: JSON.stringify(mappings, null, 2)
  };
}

