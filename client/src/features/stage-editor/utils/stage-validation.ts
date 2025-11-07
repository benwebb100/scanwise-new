import { TreatmentStage } from '../types/stage-editor.types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate treatment stages
 */
export function validateStages(stages: TreatmentStage[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if we have at least one stage
  if (stages.length === 0) {
    errors.push('At least one treatment stage is required');
  }

  // Check each stage
  stages.forEach((stage, index) => {
    const stageNum = index + 1;

    // Check stage has a name
    if (!stage.name?.trim()) {
      errors.push(`Stage ${stageNum} must have a name`);
    }

    // Check stage has items
    if (stage.items.length === 0) {
      warnings.push(`Stage ${stageNum} (${stage.name}) is empty`);
    }

    // Check for very long stages
    if (stage.totalTime > 180) { // 3 hours
      warnings.push(`Stage ${stageNum} (${stage.name}) is very long (${stage.totalTime} minutes). Consider splitting into multiple visits.`);
    }

    // Check for duplicate treatments on same tooth in same stage
    const toothTreatments = new Map<string, string[]>();
    stage.items.forEach(item => {
      if (!toothTreatments.has(item.tooth)) {
        toothTreatments.set(item.tooth, []);
      }
      toothTreatments.get(item.tooth)!.push(item.treatment);
    });

    toothTreatments.forEach((treatments, tooth) => {
      if (treatments.length > 1) {
        const uniqueTreatments = [...new Set(treatments)];
        if (uniqueTreatments.length < treatments.length) {
          warnings.push(`Stage ${stageNum}: Duplicate treatments for tooth ${tooth}`);
        }
      }
    });
  });

  // Check for treatment ordering issues
  checkTreatmentOrdering(stages, warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Check for logical treatment ordering issues
 */
function checkTreatmentOrdering(stages: TreatmentStage[], warnings: string[]): void {
  // Build a map of all treatments by tooth across stages
  const toothTreatmentsByStage = new Map<string, Map<number, string[]>>();

  stages.forEach((stage, stageIndex) => {
    stage.items.forEach(item => {
      if (!toothTreatmentsByStage.has(item.tooth)) {
        toothTreatmentsByStage.set(item.tooth, new Map());
      }
      
      const stageMap = toothTreatmentsByStage.get(item.tooth)!;
      if (!stageMap.has(stageIndex)) {
        stageMap.set(stageIndex, []);
      }
      stageMap.get(stageIndex)!.push(item.treatment);
    });
  });

  // Check for ordering issues
  toothTreatmentsByStage.forEach((stageMap, tooth) => {
    const stageNumbers = Array.from(stageMap.keys()).sort((a, b) => a - b);
    
    for (let i = 0; i < stageNumbers.length; i++) {
      const currentStage = stageNumbers[i];
      const treatments = stageMap.get(currentStage)!;
      
      // Check if crown/bridge comes before root canal
      if (treatments.includes('crown') || treatments.includes('bridge')) {
        // Look for root canal in later stages
        for (let j = i + 1; j < stageNumbers.length; j++) {
          const laterStage = stageNumbers[j];
          const laterTreatments = stageMap.get(laterStage)!;
          
          if (laterTreatments.includes('root-canal-treatment')) {
            warnings.push(`Tooth ${tooth}: Crown/bridge scheduled before root canal treatment. Consider reordering.`);
          }
        }
      }
      
      // Check if extraction comes after other treatments
      if (treatments.includes('extraction') || treatments.includes('surgical-extraction')) {
        // Look for other treatments in earlier stages
        for (let j = 0; j < i; j++) {
          const earlierStage = stageNumbers[j];
          const earlierTreatments = stageMap.get(earlierStage)!;
          
          const nonExtractionTreatments = earlierTreatments.filter(t => 
            !t.includes('extraction') && !t.includes('cleaning') && !t.includes('scaling')
          );
          
          if (nonExtractionTreatments.length > 0) {
            warnings.push(`Tooth ${tooth}: Extraction scheduled after other treatments. This may not be optimal.`);
          }
        }
      }
    }
  });
}

/**
 * Check if stages can be safely deleted
 */
export function canDeleteStage(stage: TreatmentStage): { canDelete: boolean; reason?: string } {
  if (stage.items.length > 0) {
    return {
      canDelete: false,
      reason: 'Cannot delete stage with treatments. Move treatments to another stage first.'
    };
  }

  return { canDelete: true };
}

/**
 * Suggest stage names based on treatments
 */
export function suggestStageName(items: any[]): string {
  if (items.length === 0) return 'New Stage';

  const treatmentTypes = items.map(item => item.treatment);
  const uniqueTypes = [...new Set(treatmentTypes)];

  // Common groupings
  if (uniqueTypes.every(t => ['filling', 'composite-build-up', 'bonding'].includes(t))) {
    return 'Restorative Care';
  }
  
  if (uniqueTypes.every(t => ['crown', 'bridge', 'veneer', 'inlay', 'onlay'].includes(t))) {
    return 'Prosthetic Work';
  }
  
  if (uniqueTypes.every(t => ['root-canal-treatment', 'apicoectomy'].includes(t))) {
    return 'Endodontic Treatment';
  }
  
  if (uniqueTypes.every(t => ['extraction', 'surgical-extraction'].includes(t))) {
    return 'Extractions';
  }
  
  if (uniqueTypes.every(t => ['scaling', 'scale-and-clean', 'deep-cleaning'].includes(t))) {
    return 'Periodontal Care';
  }
  
  if (uniqueTypes.every(t => ['implant', 'implant-placement', 'bone-graft', 'sinus-lift'].includes(t))) {
    return 'Implant Surgery';
  }

  // Default based on urgency or first treatment
  if (items.some(item => item.urgency === 'high')) {
    return 'Emergency Care';
  }

  return `Treatment Stage`;
}
