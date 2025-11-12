/**
 * CLI script to process a batch import
 * Usage: node process-batch-cli.ts <batch.json>
 */

import * as fs from 'fs';
import * as path from 'path';
import { importBatch } from './data-import';
import type { Treatment, Condition, ConditionMapping, BatchImport } from './types/treatment';

// Demo batch from user
const DEMO_BATCH = {
  "batch": 1,
  "notes": "any short context",
  "treatments": [
    {
      "code": "endo_rct_prep_1",
      "displayName": "Chemo-mechanical Preparation — 1 Canal",
      "friendlyPatientName": "Root canal cleaning (1 canal)",
      "category": "endodontics",
      "description": "Preparation and disinfection of a single canal prior to obturation.",
      "defaultDuration": 40,
      "defaultPrice": { "AU": { "amount": 500, "currency": "AUD" }, "US": null, "UK": null, "CA": null, "NZ": null },
      "insuranceCodes": { "AU": "415", "US": null, "UK": null, "CA": null, "NZ": null },
      "autoMapConditions": ["irreversible_pulpitis","periapical_lesion","necrotic_pulp"],
      "toothNumberRules": { "anteriorFDI": [11,12,13,21,22,23] },
      "replacementOptions": [],
      "metadata": { "perUnit": "canal" }
    }
  ],
  "conditions": [
    { "value": "irreversible_pulpitis", "label": "Irreversible Pulpitis", "urgency": "high", "category": "infection-control" }
  ],
  "mappings": [
    { "condition": "irreversible_pulpitis", "treatments": [
      { "treatment": "endo_rct_prep_1", "priority": 1 }
    ] }
  ],
  "done": false
};

async function processDemoBatch() {
  console.log('🚀 Processing Demo Batch 1...\n');

  // Read existing data
  const dataDir = path.join(__dirname, '../data');
  const treatmentsPath = path.join(dataDir, 'treatments.au.json');
  const conditionsPath = path.join(dataDir, 'conditions.core.json');
  const mappingsPath = path.join(dataDir, 'mappings.core.json');

  let existingTreatments: Treatment[] = [];
  let existingConditions: Condition[] = [];
  let existingMappings: ConditionMapping[] = [];

  try {
    existingTreatments = JSON.parse(fs.readFileSync(treatmentsPath, 'utf-8'));
  } catch (e) {
    console.log('No existing treatments found, starting fresh');
  }

  try {
    existingConditions = JSON.parse(fs.readFileSync(conditionsPath, 'utf-8'));
  } catch (e) {
    console.log('No existing conditions found, starting fresh');
  }

  try {
    existingMappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf-8'));
  } catch (e) {
    console.log('No existing mappings found, starting fresh');
  }

  // Import batch
  const result = await importBatch(
    DEMO_BATCH as BatchImport,
    existingTreatments,
    existingConditions,
    existingMappings
  );

  // Print summary
  console.log('📦 BATCH 1 SUMMARY');
  console.log('─────────────────────────────────────────');
  console.log(`✅ Treatments:  ${result.treatmentsAdded} added, ${result.treatmentsUpdated} updated`);
  console.log(`✅ Conditions:  ${result.conditionsAdded} added, ${result.conditionsUpdated} updated`);
  console.log(`✅ Mappings:    ${result.mappingsAdded} added, ${result.mappingsUpdated} updated`);
  console.log('');

  if (result.conflicts.length > 0) {
    console.log(`⚠️  Conflicts: ${result.conflicts.length}`);
    result.conflicts.forEach(c => console.log(`   - ${c}`));
  } else {
    console.log('⚠️  Conflicts: None');
  }

  if (result.missingFields.length > 0) {
    console.log(`⚠️  Missing Fields: ${result.missingFields.length}`);
    result.missingFields.forEach(m => console.log(`   - ${m}`));
  } else {
    console.log('⚠️  Missing Fields: None');
  }

  if (result.orphanedMappings.length > 0) {
    console.log(`⚠️  Orphaned Mappings: ${result.orphanedMappings.length}`);
    result.orphanedMappings.forEach(o => console.log(`   - ${o}`));
  } else {
    console.log('⚠️  Orphaned Mappings: None (all codes exist)');
  }

  if (result.errors.length > 0) {
    console.log('');
    console.log(`❌ ERRORS: ${result.errors.length}`);
    result.errors.forEach(e => console.log(`   ${e}`));
    process.exit(1);
  }

  console.log('');
  console.log('📋 Next: Ready for Batch 2');

  // Note: Actual file writing would happen here in production
  console.log('\n✅ Import successful! (Data validated but not written to disk in demo mode)');
}

processDemoBatch().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

