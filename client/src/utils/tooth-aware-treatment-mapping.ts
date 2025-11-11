/**
 * Tooth-Aware Treatment Mapping System
 * 
 * Maps dental conditions to treatments based on:
 * - Condition type
 * - Tooth group (anterior, premolar, molar, third_molar)
 * - Modifiers (impacted, severity, etc.)
 * 
 * Uses a tiered rule system: most specific → fallback
 */

export type ToothGroup = 'anterior' | 'premolar' | 'molar' | 'third_molar';

export interface TreatmentRule {
  condition: string;
  tooth_group?: ToothGroup;
  severity?: 'small' | 'medium' | 'large';
  modifiers?: string[]; // e.g., ['impacted']
  treatment: string;
  priority?: number; // Higher = more specific, checked first
}

export interface Finding {
  tooth: string | number;
  condition: string;
  modifiers?: string[];
  severity?: 'small' | 'medium' | 'large';
}

/**
 * Maps a tooth number to its tooth group
 * Supports Universal, FDI, and Palmer notation
 */
export function getToothGroup(toothNumber: string | number): ToothGroup {
  const tooth = typeof toothNumber === 'string' ? parseInt(toothNumber) : toothNumber;
  
  // Handle Universal notation (1-32)
  if (tooth >= 1 && tooth <= 32) {
    // Anterior: 6-11 (upper), 22-27 (lower)
    if ((tooth >= 6 && tooth <= 11) || (tooth >= 22 && tooth <= 27)) {
      return 'anterior';
    }
    // Premolars: 4-5, 12-13 (upper), 20-21, 28-29 (lower)
    if ((tooth >= 4 && tooth <= 5) || tooth === 12 || tooth === 13 || 
        tooth === 20 || tooth === 21 || tooth === 28 || tooth === 29) {
      return 'premolar';
    }
    // Third molars: 1, 16, 17, 32
    if (tooth === 1 || tooth === 16 || tooth === 17 || tooth === 32) {
      return 'third_molar';
    }
    // Molars: 2-3, 14-15, 18-19, 30-31
    return 'molar';
  }
  
  // Handle FDI notation (11-18, 21-28, 31-38, 41-48)
  if (tooth >= 11 && tooth <= 88) {
    const tens = Math.floor(tooth / 10);
    const ones = tooth % 10;
    
    // Anterior: 11-13, 21-23, 31-33, 41-43
    if (ones >= 1 && ones <= 3) {
      return 'anterior';
    }
    // Premolars: 14-15, 24-25, 34-35, 44-45
    if (ones === 4 || ones === 5) {
      return 'premolar';
    }
    // Third molars: 18, 28, 38, 48
    if (ones === 8) {
      return 'third_molar';
    }
    // Molars: 16-17, 26-27, 36-37, 46-47
    return 'molar';
  }
  
  // Fallback: try to infer from tooth number string
  const toothStr = toothNumber.toString().toLowerCase();
  if (toothStr.includes('wisdom') || toothStr.includes('8')) {
    return 'third_molar';
  }
  if (toothStr.includes('molar') && !toothStr.includes('third')) {
    return 'molar';
  }
  if (toothStr.includes('premolar') || toothStr.includes('bicuspid')) {
    return 'premolar';
  }
  if (toothStr.includes('incisor') || toothStr.includes('canine') || toothStr.includes('cuspid')) {
    return 'anterior';
  }
  
  // Default fallback
  return 'molar';
}

/**
 * Treatment Rules Database
 * Ordered by specificity (most specific first)
 */
const TREATMENT_RULES: TreatmentRule[] = [
  // ===== IMPACTED TEETH (Highest Priority) =====
  {
    condition: 'impacted-tooth',
    modifiers: ['impacted'],
    treatment: 'surg_surgical_extraction',
    priority: 100
  },
  {
    condition: 'impacted-tooth',
    treatment: 'surg_surgical_extraction',
    priority: 95
  },
  
  // ===== ROOT PIECES =====
  {
    condition: 'root-piece',
    tooth_group: 'third_molar',
    treatment: 'surg_surgical_extraction',
    priority: 90
  },
  {
    condition: 'root-piece',
    tooth_group: 'molar',
    modifiers: ['impacted'],
    treatment: 'surg_surgical_extraction',
    priority: 85
  },
  {
    condition: 'root-piece',
    tooth_group: 'molar',
    treatment: 'surg_surgical_extraction',
    priority: 80
  },
  {
    condition: 'root-piece',
    modifiers: ['impacted'],
    treatment: 'surg_surgical_extraction',
    priority: 75
  },
  {
    condition: 'root-piece',
    tooth_group: 'anterior',
    treatment: 'surg_simple_extraction',
    priority: 70
  },
  {
    condition: 'root-piece',
    tooth_group: 'premolar',
    treatment: 'surg_simple_extraction',
    priority: 70
  },
  {
    condition: 'root-piece',
    treatment: 'surg_surgical_extraction',
    priority: 60
  },
  
  // ===== PERIAPICAL LESIONS / ROOT CANAL =====
  {
    condition: 'periapical-lesion',
    tooth_group: 'third_molar',
    treatment: 'surg_surgical_extraction',
    priority: 85
  },
  {
    condition: 'periapical-lesion',
    tooth_group: 'anterior',
    treatment: 'endo_rct_1_canal',
    priority: 80
  },
  {
    condition: 'periapical-lesion',
    tooth_group: 'premolar',
    treatment: 'endo_rct_2_canals',
    priority: 80
  },
  {
    condition: 'periapical-lesion',
    tooth_group: 'molar',
    treatment: 'endo_rct_3_canals',
    priority: 80
  },
  {
    condition: 'periapical-lesion',
    treatment: 'endo_rct_2_canals',
    priority: 70
  },
  
  // Also handle pulpal conditions
  {
    condition: 'pulpitis',
    tooth_group: 'third_molar',
    treatment: 'surg_surgical_extraction',
    priority: 85
  },
  {
    condition: 'pulpitis',
    tooth_group: 'anterior',
    treatment: 'endo_rct_1_canal',
    priority: 80
  },
  {
    condition: 'pulpitis',
    tooth_group: 'premolar',
    treatment: 'endo_rct_2_canals',
    priority: 80
  },
  {
    condition: 'pulpitis',
    tooth_group: 'molar',
    treatment: 'endo_rct_3_canals',
    priority: 80
  },
  {
    condition: 'necrotic-pulp',
    tooth_group: 'third_molar',
    treatment: 'surg_surgical_extraction',
    priority: 85
  },
  {
    condition: 'necrotic-pulp',
    tooth_group: 'anterior',
    treatment: 'endo_rct_1_canal',
    priority: 80
  },
  {
    condition: 'necrotic-pulp',
    tooth_group: 'premolar',
    treatment: 'endo_rct_2_canals',
    priority: 80
  },
  {
    condition: 'necrotic-pulp',
    tooth_group: 'molar',
    treatment: 'endo_rct_3_canals',
    priority: 80
  },
  
  // ===== CARIES / FILLINGS =====
  {
    condition: 'caries',
    tooth_group: 'anterior',
    severity: 'large',
    treatment: 'resto_comp_two_surface_ant',
    priority: 75
  },
  {
    condition: 'caries',
    tooth_group: 'anterior',
    severity: 'medium',
    treatment: 'resto_comp_two_surface_ant',
    priority: 75
  },
  {
    condition: 'caries',
    tooth_group: 'anterior',
    severity: 'small',
    treatment: 'resto_comp_one_surface_ant',
    priority: 75
  },
  {
    condition: 'caries',
    tooth_group: 'anterior',
    treatment: 'resto_comp_one_surface_ant',
    priority: 70
  },
  {
    condition: 'caries',
    tooth_group: 'premolar',
    severity: 'large',
    treatment: 'resto_comp_three_surface_post',
    priority: 75
  },
  {
    condition: 'caries',
    tooth_group: 'premolar',
    severity: 'medium',
    treatment: 'resto_comp_two_surface_post',
    priority: 75
  },
  {
    condition: 'caries',
    tooth_group: 'premolar',
    severity: 'small',
    treatment: 'resto_comp_one_surface_post',
    priority: 75
  },
  {
    condition: 'caries',
    tooth_group: 'premolar',
    treatment: 'resto_comp_two_surface_post',
    priority: 70
  },
  {
    condition: 'caries',
    tooth_group: 'molar',
    severity: 'large',
    treatment: 'resto_comp_three_surface_post',
    priority: 75
  },
  {
    condition: 'caries',
    tooth_group: 'molar',
    severity: 'medium',
    treatment: 'resto_comp_two_surface_post',
    priority: 75
  },
  {
    condition: 'caries',
    tooth_group: 'molar',
    severity: 'small',
    treatment: 'resto_comp_one_surface_post',
    priority: 75
  },
  {
    condition: 'caries',
    tooth_group: 'molar',
    treatment: 'resto_comp_two_surface_post',
    priority: 70
  },
  {
    condition: 'caries',
    treatment: 'resto_comp_one_surface_post',
    priority: 60
  },
  
  // ===== FURCATION INVOLVEMENT =====
  {
    condition: 'furcation-involvement',
    tooth_group: 'molar',
    treatment: 'perio_furcation_debridement',
    priority: 70
  },
  {
    condition: 'furcation-involvement',
    tooth_group: 'premolar',
    treatment: 'perio_furcation_debridement',
    priority: 65
  },
  {
    condition: 'furcation-involvement',
    treatment: 'perio_scale_root_planing',
    priority: 60
  },
  
  // ===== MISSING TEETH =====
  {
    condition: 'missing-tooth',
    tooth_group: 'anterior',
    treatment: 'implant_placement',
    priority: 65
  },
  {
    condition: 'missing-tooth',
    tooth_group: 'premolar',
    treatment: 'implant_placement',
    priority: 65
  },
  {
    condition: 'missing-tooth',
    tooth_group: 'molar',
    treatment: 'implant_placement',
    priority: 65
  },
  {
    condition: 'missing-tooth',
    treatment: 'bridge_pontic',
    priority: 60
  },
  
  // ===== FRACTURES =====
  {
    condition: 'fracture',
    tooth_group: 'anterior',
    treatment: 'crown_full_tooth_coloured',
    priority: 70
  },
  {
    condition: 'fracture',
    tooth_group: 'premolar',
    treatment: 'crown_full_tooth_coloured',
    priority: 70
  },
  {
    condition: 'fracture',
    tooth_group: 'molar',
    treatment: 'crown_full_tooth_coloured',
    priority: 70
  },
  {
    condition: 'fracture',
    treatment: 'crown_full_tooth_coloured',
    priority: 60
  },
  
  // ===== FALLBACK RULES (Lowest Priority) =====
  {
    condition: 'cavity',
    treatment: 'resto_comp_one_surface_post',
    priority: 50
  },
  {
    condition: 'decay',
    treatment: 'resto_comp_one_surface_post',
    priority: 50
  },
  {
    condition: 'abscess',
    treatment: 'endo_rct_2_canals',
    priority: 50
  }
];

/**
 * Matches a finding against treatment rules
 * Returns the most specific matching rule's treatment
 */
export function mapFindingToTreatment(finding: Finding): string | null {
  const toothGroup = getToothGroup(finding.tooth);
  const condition = finding.condition.toLowerCase().replace(/_/g, '-');
  const modifiers = finding.modifiers || [];
  const severity = finding.severity;
  
  // Sort rules by priority (highest first)
  const sortedRules = [...TREATMENT_RULES].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  
  // Try to match most specific rule first
  for (const rule of sortedRules) {
    const ruleCondition = rule.condition.toLowerCase().replace(/_/g, '-');
    
    // Condition must match
    if (ruleCondition !== condition) {
      continue;
    }
    
    // Check modifiers (if rule requires specific modifiers)
    if (rule.modifiers && rule.modifiers.length > 0) {
      const hasAllModifiers = rule.modifiers.every(mod => 
        modifiers.some(m => m.toLowerCase() === mod.toLowerCase())
      );
      if (!hasAllModifiers) {
        continue;
      }
    }
    
    // Check tooth group (if rule specifies one)
    if (rule.tooth_group && rule.tooth_group !== toothGroup) {
      continue;
    }
    
    // Check severity (if rule specifies one)
    if (rule.severity && rule.severity !== severity) {
      continue;
    }
    
    // Match found!
    return rule.treatment;
  }
  
  // No match found
  return null;
}

/**
 * Main function to get treatment suggestion for a finding
 * Falls back to generic condition-based mapping if no tooth-aware rule matches
 */
export function getTreatmentSuggestion(
  finding: Finding,
  fallbackMapping?: (condition: string) => string | null
): string | null {
  // Try tooth-aware mapping first
  const treatment = mapFindingToTreatment(finding);
  if (treatment) {
    return treatment;
  }
  
  // Fall back to generic condition-based mapping if provided
  if (fallbackMapping) {
    return fallbackMapping(finding.condition);
  }
  
  return null;
}

/**
 * Batch process multiple findings
 */
export function getTreatmentSuggestions(
  findings: Finding[],
  fallbackMapping?: (condition: string) => string | null
): Map<string, string> {
  const suggestions = new Map<string, string>();
  
  findings.forEach(finding => {
    const key = `${finding.tooth}-${finding.condition}`;
    const treatment = getTreatmentSuggestion(finding, fallbackMapping);
    if (treatment) {
      suggestions.set(key, treatment);
    }
  });
  
  return suggestions;
}

