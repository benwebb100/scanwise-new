import { ToothNumberingSystem } from '@/data/dental-data';

export type ToothGroup = 
  | 'MxIncCan'      // Maxillary incisors/canines
  | 'MxPrem'        // Maxillary premolars  
  | 'MxMol'         // Maxillary molars
  | 'MdIncCan'      // Mandibular incisors/canines
  | 'MdPrem'        // Mandibular premolars
  | 'MdMol'         // Mandibular molars
  | 'ThirdMolar'    // Third molars
  | 'Unknown';      // Unknown/unrecognized

export interface CanalMapping {
  canals: 1 | 2 | 3 | 4;
  confidence: 'high' | 'medium' | 'low';
  note?: string;
}

/**
 * Convert tooth number to tooth group based on numbering system
 */
export function toToothGroup(toothNumber: string, numberingSystem: ToothNumberingSystem): ToothGroup {
  try {
    const tooth = parseInt(toothNumber);
    
    if (numberingSystem === 'FDI') {
      return fdiToToothGroup(tooth);
    } else {
      return universalToToothGroup(tooth);
    }
  } catch (error) {
    return 'Unknown';
  }
}

/**
 * Get default canal count for tooth group
 */
export function defaultCanalsForGroup(group: ToothGroup): CanalMapping {
  switch (group) {
    case 'MxIncCan':
      return { canals: 1, confidence: 'high', note: 'Maxillary incisors/canines typically have 1 canal' };
    
    case 'MxPrem':
      return { canals: 2, confidence: 'medium', note: 'Maxillary premolars typically have 2 canals (2nd premolar can be 1)' };
    
    case 'MxMol':
      return { canals: 3, confidence: 'medium', note: 'Maxillary molars typically have 3 canals (MB2 common → can be 4)' };
    
    case 'MdIncCan':
      return { canals: 1, confidence: 'medium', note: 'Mandibular incisors/canines typically have 1 canal (lower incisors sometimes 2)' };
    
    case 'MdPrem':
      return { canals: 1, confidence: 'medium', note: 'Mandibular premolars typically have 1 canal (first sometimes 2)' };
    
    case 'MdMol':
      return { canals: 3, confidence: 'medium', note: 'Mandibular molars typically have 3 canals (distal may split → can be 4)' };
    
    case 'ThirdMolar':
      return { canals: 3, confidence: 'low', note: 'Third molars are highly variable' };
    
    case 'Unknown':
    default:
      return { canals: 3, confidence: 'low', note: 'Unknown tooth type - defaulting to 3 canals' };
  }
}

/**
 * Convert FDI tooth number to tooth group
 */
function fdiToToothGroup(tooth: number): ToothGroup {
  // Maxillary (upper) teeth: 11-18, 21-28
  if (tooth >= 11 && tooth <= 18) {
    // Upper right: 11-18
    if (tooth >= 11 && tooth <= 13) return 'MxIncCan';  // 11, 12, 13
    if (tooth >= 14 && tooth <= 15) return 'MxPrem';    // 14, 15
    if (tooth >= 16 && tooth <= 18) return 'MxMol';     // 16, 17, 18
  }
  
  if (tooth >= 21 && tooth <= 28) {
    // Upper left: 21-28
    if (tooth >= 21 && tooth <= 23) return 'MxIncCan';  // 21, 22, 23
    if (tooth >= 24 && tooth <= 25) return 'MxPrem';    // 24, 25
    if (tooth >= 26 && tooth <= 28) return 'MxMol';     // 26, 27, 28
  }
  
  // Mandibular (lower) teeth: 31-38, 41-48
  if (tooth >= 31 && tooth <= 38) {
    // Lower left: 31-38
    if (tooth >= 31 && tooth <= 33) return 'MdIncCan';  // 31, 32, 33
    if (tooth >= 34 && tooth <= 35) return 'MdPrem';    // 34, 35
    if (tooth >= 36 && tooth <= 38) return 'MdMol';     // 36, 37, 38
  }
  
  if (tooth >= 41 && tooth <= 48) {
    // Lower right: 41-48
    if (tooth >= 41 && tooth <= 43) return 'MdIncCan';  // 41, 42, 43
    if (tooth >= 44 && tooth <= 45) return 'MdPrem';    // 44, 45
    if (tooth >= 46 && tooth <= 48) return 'MdMol';     // 46, 47, 48
  }
  
  return 'Unknown';
}

/**
 * Convert Universal tooth number to tooth group
 */
function universalToToothGroup(tooth: number): ToothGroup {
  // Upper teeth: 1-16
  if (tooth >= 1 && tooth <= 16) {
    if (tooth >= 6 && tooth <= 11) return 'MxIncCan';   // 6, 7, 8, 9, 10, 11
    if (tooth >= 4 && tooth <= 5) return 'MxPrem';      // 4, 5
    if (tooth >= 12 && tooth <= 13) return 'MxPrem';    // 12, 13
    if (tooth >= 1 && tooth <= 3) return 'MxMol';       // 1, 2, 3
    if (tooth >= 14 && tooth <= 16) return 'MxMol';     // 14, 15, 16
  }
  
  // Lower teeth: 17-32
  if (tooth >= 17 && tooth <= 32) {
    if (tooth >= 22 && tooth <= 27) return 'MdIncCan';  // 22, 23, 24, 25, 26, 27
    if (tooth >= 20 && tooth <= 21) return 'MdPrem';    // 20, 21
    if (tooth >= 28 && tooth <= 29) return 'MdPrem';    // 28, 29
    if (tooth >= 17 && tooth <= 19) return 'MdMol';     // 17, 18, 19
    if (tooth >= 30 && tooth <= 32) return 'MdMol';     // 30, 31, 32
  }
  
  return 'Unknown';
}

/**
 * Get RCT treatment based on canal count
 */
export function getRctTreatmentByCanals(canalCount: number): string {
  switch (canalCount) {
    case 1: return 'endo_rct_1_canal';
    case 2: return 'endo_rct_2_canals';
    case 3: return 'endo_rct_3_canals';
    case 4: return 'endo_rct_4_canals';
    default: return 'endo_rct_3_canals'; // Default fallback
  }
}

/**
 * Get canal count from RCT treatment
 */
export function getCanalCountFromRctTreatment(treatment: string): number {
  if (treatment.includes('_1_canal')) return 1;
  if (treatment.includes('_2_canals')) return 2;
  if (treatment.includes('_3_canals')) return 3;
  if (treatment.includes('_4_canals')) return 4;
  return 3; // Default fallback
}
