/**
 * CANONICAL CONDITIONS LIST
 * 
 * This is the SINGLE SOURCE OF TRUTH for all condition codes in the system.
 * All mappings MUST reference conditions from this list.
 * 
 * SOURCE: Extracted from client/src/data/dental-data.ts (ALL_CONDITIONS)
 * FORMAT: snake_case and kebab-case (mixed - legacy compatibility)
 * KEY: The 'value' field is the canonical key used in mappings
 */

export const CANONICAL_CONDITION_CODES = [
  // COMMON CONDITIONS (kebab-case - legacy format)
  'caries',
  'periapical-lesion',
  'root-fracture',
  'impacted-tooth',
  'missing-tooth',
  'gingivitis',
  'periodontal-pocket',
  'attrition',
  'pulpitis',
  'tooth-mobility',
  
  // ADDITIONAL CONDITIONS (kebab-case)
  'abrasion',
  'erosion',
  'calculus',
  'plaque',
  'crown-fracture',
  'root-piece',
  'abscess',
  'cyst',
  'resorption',
  'hypoplasia',
  'fluorosis',
  'staining',
  'malocclusion',
  'crowding',
  'spacing',
  'overjet',
  'overbite',
  'crossbite',
  'open-bite',
  'tmj-disorder',
  'existing-large-filling',
  'tooth-wear',
  'mobility',
  'fracture',
  
  // CARIES VARIATIONS (snake_case)
  'caries_enamel',
  'caries_dentine',
  'caries_recurrent',
  'caries_root',
  
  // FRACTURES AND STRUCTURAL (snake_case)
  'fractured_cusp_restorable',
  'cracked_tooth_vital',
  'tooth_nonrestorable',
  'failed_restoration',
  
  // TOOTH WEAR (snake_case)
  'tooth_wear_attrition',
  'tooth_wear_erosion',
  'tooth_wear_abfraction',
  'dentine_hypersensitivity',
  
  // PULP AND ENDODONTIC (snake_case)
  'reversible_pulpitis',
  'irreversible_pulpitis',
  'necrotic_pulp',
  'periapical_abscess',
  'symptomatic_apical_periodontitis',
  'asymptomatic_apical_periodontitis',
  'flare_up_post_endo',
  
  // PERIODONTAL (snake_case)
  'gingivitis_plaque',
  'periodontitis_stage_i_ii',
  'periodontitis_stage_iii_iv',
  'periodontal_abscess',
  'pericoronitis',
  'mucositis_denture',
  'halitosis',
  
  // SURGICAL (snake_case)
  'impacted_tooth',
  'retained_root',
  'dry_socket',
  'soft_tissue_lesion_suspect',
  
  // EDENTULISM (snake_case)
  'missing_single_tooth',
  'partial_edentulism',
  'complete_edentulism',
  
  // AESTHETIC (snake_case)
  'aesthetic_discolouration',
  'aesthetic_shape_alignment',
  
  // FUNCTIONAL (snake_case)
  'bruxism',
  'tmj_pain_dysfunction',
  
  // TRAUMA (snake_case)
  'trauma_avulsion',
  'trauma_luxation',
  'trauma_fracture_crown',
] as const;

/**
 * Type for condition codes (for TypeScript type safety)
 */
export type CanonicalConditionCode = typeof CANONICAL_CONDITION_CODES[number];

/**
 * Set for fast lookup
 */
export const CANONICAL_CONDITION_SET = new Set(CANONICAL_CONDITION_CODES);

/**
 * Check if a condition code is valid
 */
export function isValidConditionCode(code: string): boolean {
  return CANONICAL_CONDITION_SET.has(code);
}

/**
 * Get all canonical condition codes as array
 */
export function getAllConditionCodes(): string[] {
  return Array.from(CANONICAL_CONDITION_CODES);
}

/**
 * Validate an array of condition codes
 * @returns Array of invalid codes (empty if all valid)
 */
export function validateConditionCodes(codes: string[]): string[] {
  return codes.filter(code => !isValidConditionCode(code));
}

/**
 * NAMING RULES:
 * - Case-sensitive: YES (must match exactly)
 * - Format: MIXED (kebab-case for legacy, snake_case for new)
 * - Aliases: NO (no synonyms - must use exact canonical key)
 * 
 * KNOWN INCONSISTENCIES (for backward compatibility):
 * - Old format uses kebab-case (e.g., "periapical-lesion")
 * - New format uses snake_case (e.g., "periapical_abscess")
 * - Both are valid and must be supported
 */

