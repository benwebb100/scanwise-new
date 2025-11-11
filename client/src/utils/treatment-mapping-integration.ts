/**
 * Integration Helper for Tooth-Aware Treatment Mapping
 * 
 * This file provides easy-to-use functions for integrating the tooth-aware
 * treatment mapping system into existing code that processes dental findings.
 */

import { 
  getTreatmentSuggestion, 
  getTreatmentSuggestions,
  type Finding 
} from './tooth-aware-treatment-mapping';

/**
 * Process a single finding and add suggested treatment
 * Use this when a user selects a condition for a tooth
 */
export function processFindingWithTreatment(finding: {
  tooth: string | number;
  condition: string;
  modifiers?: string[];
  severity?: 'small' | 'medium' | 'large';
}): {
  tooth: string | number;
  condition: string;
  treatment: string | null;
  modifiers?: string[];
  severity?: 'small' | 'medium' | 'large';
} {
  const treatment = getTreatmentSuggestion(finding);
  
  return {
    ...finding,
    treatment: treatment || null
  };
}

/**
 * Process multiple findings (e.g., from "Add All" button)
 * Returns an array of findings with suggested treatments
 */
export function processFindingsWithTreatments(findings: Array<{
  tooth: string | number;
  condition: string;
  modifiers?: string[];
  severity?: 'small' | 'medium' | 'large';
}>): Array<{
  tooth: string | number;
  condition: string;
  treatment: string | null;
  modifiers?: string[];
  severity?: 'small' | 'medium' | 'large';
}> {
  return findings.map(finding => processFindingWithTreatment(finding));
}

/**
 * Convert AI detection format to finding format
 * Handles common detection formats from Roboflow/ML models
 */
export function detectionToFinding(detection: {
  tooth?: string | number;
  class?: string;
  class_name?: string;
  condition?: string;
  impacted?: boolean;
  severity?: 'small' | 'medium' | 'large';
  [key: string]: any;
}): Finding | null {
  const tooth = detection.tooth;
  const condition = detection.class || detection.class_name || detection.condition;
  
  if (!tooth || !condition) {
    return null;
  }
  
  const modifiers: string[] = [];
  if (detection.impacted) {
    modifiers.push('impacted');
  }
  
  return {
    tooth,
    condition: condition.toLowerCase().replace(/_/g, '-'),
    modifiers: modifiers.length > 0 ? modifiers : undefined,
    severity: detection.severity
  };
}

/**
 * Process AI detections and return findings with treatments
 * Use this for "Add All" functionality
 */
export function processDetectionsWithTreatments(detections: Array<{
  tooth?: string | number;
  class?: string;
  class_name?: string;
  condition?: string;
  impacted?: boolean;
  severity?: 'small' | 'medium' | 'large';
  [key: string]: any;
}>): Array<{
  tooth: string | number;
  condition: string;
  treatment: string | null;
  modifiers?: string[];
  severity?: 'small' | 'medium' | 'large';
}> {
  const findings = detections
    .map(detectionToFinding)
    .filter((f): f is Finding => f !== null);
  
  return processFindingsWithTreatments(findings);
}

/**
 * Example usage in a React component:
 * 
 * ```tsx
 * import { processDetectionsWithTreatments } from '@/utils/treatment-mapping-integration';
 * 
 * function handleAddAll() {
 *   const findingsWithTreatments = processDetectionsWithTreatments(detections);
 *   setFindings(findingsWithTreatments);
 * }
 * 
 * function handleAddIndividually(detection: Detection) {
 *   const finding = processFindingWithTreatment({
 *     tooth: detection.tooth,
 *     condition: detection.class,
 *     impacted: detection.impacted
 *   });
 *   setFindings([...findings, finding]);
 * }
 * ```
 */

