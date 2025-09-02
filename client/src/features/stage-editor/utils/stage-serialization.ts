import { TreatmentStage, TreatmentItem } from '../types/stage-editor.types';
import { getTreatmentDuration, generateId } from './stage-calculations';

/**
 * Convert backend treatment stages to editor format
 */
export function deserializeStages(backendStages: any[]): TreatmentStage[] {
  if (!Array.isArray(backendStages)) {
    console.warn('Invalid backend stages data:', backendStages);
    return [];
  }

  return backendStages.map((stage, index) => {
    // Handle both backend format and already-deserialized format
    const isAlreadyDeserialized = stage.id && stage.name && Array.isArray(stage.items);
    
    if (isAlreadyDeserialized) {
      // Already in editor format, just ensure it has required fields
      return {
        ...stage,
        totalTime: stage.totalTime || 0,
        totalCost: stage.totalCost || 0
      };
    }
    
    // Convert from backend format
    return {
      id: generateId(),
      name: stage.stage || `Stage ${index + 1}`,
      focus: stage.focus || '',
      order: index,
      items: (stage.items || []).map((item: any) => ({
        id: generateId(),
        tooth: item.tooth || '',
        condition: item.condition || '',
        treatment: item.recommended_treatment || item.treatment || '',
        estimatedTime: getTreatmentDuration(item.recommended_treatment || item.treatment || ''),
        price: item.price || 0,
        urgency: determineUrgency(item.condition)
      })),
      totalTime: 0, // Will be calculated
      totalCost: 0  // Will be calculated
    };
  });
}

/**
 * Convert editor stages back to backend format
 */
export function serializeStages(editorStages: TreatmentStage[]): any[] {
  return editorStages.map((stage, index) => ({
    stage: stage.name,
    focus: stage.focus,
    items: stage.items.map(item => ({
      tooth: item.tooth,
      condition: item.condition,
      recommended_treatment: item.treatment,
      treatment: item.treatment, // Include both for compatibility
      price: item.price
    }))
  }));
}

/**
 * Convert findings to treatment items
 */
export function findingsToTreatmentItems(findings: any[]): TreatmentItem[] {
  return findings
    .filter(finding => finding.tooth && finding.condition && finding.treatment)
    .map(finding => ({
      id: generateId(),
      tooth: finding.tooth,
      condition: finding.condition,
      treatment: finding.treatment,
      estimatedTime: getTreatmentDuration(finding.treatment),
      price: finding.price || 0,
      urgency: determineUrgency(finding.condition)
    }));
}

/**
 * Determine urgency based on condition
 */
function determineUrgency(condition: string): 'high' | 'medium' | 'low' {
  const highUrgencyConditions = [
    'caries', 'periapical-lesion', 'fracture', 'root-piece', 'abscess', 'infection'
  ];
  
  const mediumUrgencyConditions = [
    'impacted-tooth', 'missing-teeth-no-distal', 'missing-tooth-between', 
    'bone-level', 'tissue-level', 'decay'
  ];

  const normalizedCondition = condition.toLowerCase().replace(/\s+/g, '-');
  
  if (highUrgencyConditions.some(urgent => normalizedCondition.includes(urgent))) {
    return 'high';
  }
  
  if (mediumUrgencyConditions.some(medium => normalizedCondition.includes(medium))) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * Create default stages from treatment items
 */
export function createDefaultStages(items: TreatmentItem[]): TreatmentStage[] {
  if (items.length === 0) {
    return [{
      id: generateId(),
      name: 'Treatment Plan',
      focus: 'Initial treatment phase',
      order: 0,
      items: [],
      totalTime: 0,
      totalCost: 0
    }];
  }

  // Group by urgency
  const urgencyGroups: Record<string, TreatmentItem[]> = {
    high: items.filter(item => item.urgency === 'high'),
    medium: items.filter(item => item.urgency === 'medium'),
    low: items.filter(item => item.urgency === 'low')
  };

  const stages: TreatmentStage[] = [];

  // Create stages for each urgency level that has items
  if (urgencyGroups.high.length > 0) {
    stages.push({
      id: generateId(),
      name: 'Emergency Care',
      focus: 'Immediate treatment of urgent conditions',
      order: stages.length,
      items: urgencyGroups.high,
      totalTime: 0,
      totalCost: 0
    });
  }

  if (urgencyGroups.medium.length > 0) {
    stages.push({
      id: generateId(),
      name: 'Restorative Treatment',
      focus: 'Primary treatment phase',
      order: stages.length,
      items: urgencyGroups.medium,
      totalTime: 0,
      totalCost: 0
    });
  }

  if (urgencyGroups.low.length > 0) {
    stages.push({
      id: generateId(),
      name: 'Preventive Care',
      focus: 'Maintenance and preventive treatments',
      order: stages.length,
      items: urgencyGroups.low,
      totalTime: 0,
      totalCost: 0
    });
  }

  // If no urgency-based grouping worked, create a single stage
  if (stages.length === 0) {
    stages.push({
      id: generateId(),
      name: 'Treatment Plan',
      focus: 'Comprehensive dental treatment',
      order: 0,
      items: items,
      totalTime: 0,
      totalCost: 0
    });
  }

  return stages;
}
