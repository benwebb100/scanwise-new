/**
 * Treatment urgency classification for staging
 * 
 * HIGH = Stage 1: Emergency/Infection Control - needs immediate attention
 * MEDIUM = Stage 2: Major Restorative/Surgical - important but can wait
 * LOW = Stage 3: Preventive/Cosmetic - elective treatments
 */

export type UrgencyLevel = 'high' | 'medium' | 'low';

// Condition urgency mapping
export const CONDITION_URGENCY: Record<string, UrgencyLevel> = {
  // HIGH URGENCY - Emergency/Infection Control (Stage 1)
  'caries': 'high',                    // Active decay needs immediate treatment
  'pulpitis': 'high',                  // Inflamed pulp, causes pain
  'abscess': 'high',                   // Infection, urgent
  'periapical-lesion': 'high',         // Root infection
  'root-fracture': 'high',             // Structural emergency
  'crown-fracture': 'high',            // Exposed tooth structure
  'fracture': 'high',                  // General fracture
  'tooth-mobility': 'high',            // Risk of tooth loss
  'mobility': 'high',                  // Risk of tooth loss
  'cyst': 'high',                      // Pathology requiring surgery
  'resorption': 'high',                // Progressive tooth destruction
  
  // MEDIUM URGENCY - Major Restorative (Stage 2)
  'missing-tooth': 'medium',           // Affects function but not emergency
  'impacted-tooth': 'medium',          // Surgical but not urgent
  'root-piece': 'medium',              // Surgical extraction needed
  'existing-large-filling': 'medium',  // May need crown but not urgent
  'tooth-wear': 'medium',              // Progressive but not emergency
  'attrition': 'medium',               // Wear from grinding
  'abrasion': 'medium',                // Mechanical wear
  'erosion': 'medium',                 // Chemical wear
  'periodontal-pocket': 'medium',      // Significant gum disease
  'malocclusion': 'medium',            // Bite issues, affects function
  'tmj-disorder': 'medium',            // Joint problems
  'hypoplasia': 'medium',              // Developmental defect
  
  // LOW URGENCY - Preventive/Cosmetic (Stage 3)
  'gingivitis': 'low',                 // Early gum disease
  'calculus': 'low',                   // Tartar buildup
  'plaque': 'low',                     // Bacterial buildup
  'staining': 'low',                   // Cosmetic concern
  'fluorosis': 'low',                  // Cosmetic fluoride staining
  'crowding': 'low',                   // Orthodontic, elective
  'spacing': 'low',                    // Orthodontic, elective
  'overjet': 'low',                    // Orthodontic, elective
  'overbite': 'low',                   // Orthodontic, elective
  'crossbite': 'low',                  // Orthodontic, elective
  'open-bite': 'low',                  // Orthodontic, elective
};

// Treatment urgency mapping
export const TREATMENT_URGENCY: Record<string, UrgencyLevel> = {
  // HIGH URGENCY - Emergency/Infection Control (Stage 1)
  'root-canal-treatment': 'high',      // Treats infected/inflamed pulp
  'apicoectomy': 'high',               // Root-end surgery
  'extraction': 'high',                // Tooth removal (usually urgent)
  
  'surgical-extraction': 'medium',     // Complex but planned surgical procedure
  'filling': 'medium',                 // Restores decay but not always urgent
  'crown': 'medium',                   // Major restoration
  'bridge': 'medium',                  // Major restoration
  'implant-placement': 'medium',       // Surgical but planned
  'composite-build-up': 'medium',      // Significant restoration
  'inlay': 'medium',                   // Indirect restoration
  'onlay': 'medium',                   // Indirect restoration
  'partial-denture': 'medium',         // Major prosthetic
  'complete-denture': 'medium',        // Major prosthetic
  'deep-cleaning': 'medium',           // Scaling & root planing
  'periodontal-treatment': 'medium',   // Gum disease treatment
  'bone-graft': 'medium',              // Surgical procedure
  'sinus-lift': 'medium',              // Surgical procedure
  'gum-graft': 'medium',               // Surgical procedure
  'orthodontic-treatment': 'medium',   // Long-term treatment
  'braces': 'medium',                  // Long-term treatment
  'invisalign': 'medium',              // Long-term treatment
  
  // LOW URGENCY - Preventive/Cosmetic (Stage 3)
  'scale-and-clean': 'low',            // Routine cleaning
  'fluoride-treatment': 'low',         // Preventive
  'sealant': 'low',                    // Preventive
  'whitening': 'low',                  // Cosmetic
  'veneer': 'low',                     // Cosmetic
  'bonding': 'low',                    // Minor cosmetic
  'night-guard': 'low',                // Protective appliance
  'retainer': 'low',                   // Orthodontic maintenance
  'space-maintainer': 'low',           // Preventive appliance
};

// Keyword-based fallback for unmapped items
export const URGENCY_KEYWORDS: Record<string, UrgencyLevel> = {
  // High urgency keywords
  'emergency': 'high',
  'urgent': 'high',
  'pain': 'high',
  'infection': 'high',
  'abscess': 'high',
  'fracture': 'high',
  'trauma': 'high',
  'swelling': 'high',
  
  // Medium urgency keywords
  'surgical': 'medium',
  'extraction': 'medium',
  'restoration': 'medium',
  'crown': 'medium',
  'root': 'medium',
  
  // Low urgency keywords
  'cleaning': 'low',
  'preventive': 'low',
  'cosmetic': 'low',
  'whitening': 'low',
  'maintenance': 'low',
  'routine': 'low',
};

/**
 * Get urgency level for a condition or treatment
 */
export function getUrgencyLevel(item: string, type: 'condition' | 'treatment'): UrgencyLevel {
  const normalizedItem = item.toLowerCase().trim();
  
  // Check direct mappings first
  if (type === 'condition' && CONDITION_URGENCY[normalizedItem]) {
    return CONDITION_URGENCY[normalizedItem];
  }
  
  if (type === 'treatment' && TREATMENT_URGENCY[normalizedItem]) {
    return TREATMENT_URGENCY[normalizedItem];
  }
  
  // Fallback to keyword matching
  for (const [keyword, urgency] of Object.entries(URGENCY_KEYWORDS)) {
    if (normalizedItem.includes(keyword)) {
      return urgency;
    }
  }
  
  // Default to medium urgency if no match found
  return 'medium';
}

/**
 * Get urgency level for a finding (considers both condition and treatment)
 */
export function getFindingUrgency(condition: string, treatment: string): UrgencyLevel {
  const conditionUrgency = getUrgencyLevel(condition, 'condition');
  const treatmentUrgency = getUrgencyLevel(treatment, 'treatment');
  
  // Return the higher urgency level (high > medium > low)
  if (conditionUrgency === 'high' || treatmentUrgency === 'high') {
    return 'high';
  }
  if (conditionUrgency === 'medium' || treatmentUrgency === 'medium') {
    return 'medium';
  }
  return 'low';
}

/**
 * Create dynamic stages based on available urgency levels
 */
export function createDynamicStages(findings: Array<{ condition: string; treatment: string; [key: string]: any }>): Array<{
  name: string;
  focus: string;
  urgencyLevel: UrgencyLevel;
  items: any[];
}> {
  console.log('🎯 createDynamicStages called with findings:', findings);
  console.log('🎯 Sample finding for urgency test:', findings[0]);
  
  // Categorize findings by urgency
  const highUrgencyFindings = findings.filter(f => {
    const urgency = getFindingUrgency(f.condition, f.treatment);
    console.log(`🎯 Finding: ${f.condition} + ${f.treatment} = ${urgency} urgency`);
    return urgency === 'high';
  });
  const mediumUrgencyFindings = findings.filter(f => getFindingUrgency(f.condition, f.treatment) === 'medium');
  const lowUrgencyFindings = findings.filter(f => getFindingUrgency(f.condition, f.treatment) === 'low');
  
  console.log('🎯 Urgency distribution:', {
    high: highUrgencyFindings.length,
    medium: mediumUrgencyFindings.length, 
    low: lowUrgencyFindings.length
  });
  
  const stages = [];
  
  // Dynamic stage assignment based on what exists
  let stageCounter = 1;
  
  if (highUrgencyFindings.length > 0) {
    stages.push({
      name: `Stage ${stageCounter}`,
      focus: 'Immediate treatment of urgent conditions',
      urgencyLevel: 'high' as UrgencyLevel,
      items: highUrgencyFindings
    });
    stageCounter++;
    
    if (mediumUrgencyFindings.length > 0) {
      stages.push({
        name: `Stage ${stageCounter}`,
        focus: 'Major restorative and surgical procedures',
        urgencyLevel: 'medium' as UrgencyLevel,
        items: mediumUrgencyFindings
      });
      stageCounter++;
    }
    
    if (lowUrgencyFindings.length > 0) {
      stages.push({
        name: `Stage ${stageCounter}`,
        focus: 'Maintenance and preventive treatments',
        urgencyLevel: 'low' as UrgencyLevel,
        items: lowUrgencyFindings
      });
    }
  } else if (mediumUrgencyFindings.length > 0) {
    // No high urgency items, start with medium
    stages.push({
      name: `Stage ${stageCounter}`,
      focus: 'Main treatment phase',
      urgencyLevel: 'medium' as UrgencyLevel,
      items: mediumUrgencyFindings
    });
    stageCounter++;
    
    if (lowUrgencyFindings.length > 0) {
      stages.push({
        name: `Stage ${stageCounter}`,
        focus: 'Preventive and maintenance treatments',
        urgencyLevel: 'low' as UrgencyLevel,
        items: lowUrgencyFindings
      });
    }
  } else if (lowUrgencyFindings.length > 0) {
    // Only low urgency items
    stages.push({
      name: `Stage ${stageCounter}`,
      focus: 'Preventive and cosmetic treatments',
      urgencyLevel: 'low' as UrgencyLevel,
      items: lowUrgencyFindings
    });
  }
  
  return stages;
}
