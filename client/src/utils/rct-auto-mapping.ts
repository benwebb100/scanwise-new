import { useFeatureFlag } from '@/features/stage-editor/hooks/useFeatureFlag';
import { toToothGroup, defaultCanalsForGroup, getRctTreatmentByCanals, CanalMapping } from './tooth-canal-mapping';
import { ToothNumberingSystem } from '@/data/dental-data';

export interface RctAutoMappingResult {
  treatment: string;
  canalMapping: CanalMapping;
  isAutoSelected: boolean;
  requiresConfirmation: boolean;
}

/**
 * Auto-select RCT treatment based on tooth number and condition
 */
export function getAutoRctTreatment(
  condition: string,
  toothNumber: string,
  numberingSystem: ToothNumberingSystem,
  isFeatureEnabled: boolean = true
): RctAutoMappingResult | null {
  // Check if this is an endodontic condition that requires RCT
  const endodonticConditions = [
    'irreversible_pulpitis',
    'necrotic_pulp', 
    'periapical_abscess',
    'asymptomatic_apical_periodontitis'
  ];

  if (!endodonticConditions.includes(condition) || !isFeatureEnabled) {
    return null;
  }

  // Get tooth group and canal mapping
  const toothGroup = toToothGroup(toothNumber, numberingSystem);
  const canalMapping = defaultCanalsForGroup(toothGroup);
  
  // Determine if confirmation is required
  const requiresConfirmation = canalMapping.confidence === 'low' || toothGroup === 'ThirdMolar';
  
  // Get the appropriate RCT treatment
  const treatment = getRctTreatmentByCanals(canalMapping.canals);
  
  return {
    treatment,
    canalMapping,
    isAutoSelected: true,
    requiresConfirmation
  };
}

/**
 * Get emergency extirpation for acute pain conditions
 */
export function getEmergencyExtirpation(
  condition: string,
  hasAcutePain: boolean = false
): string | null {
  const acuteConditions = ['irreversible_pulpitis', 'periapical_abscess'];
  
  if (acuteConditions.includes(condition) && hasAcutePain) {
    return 'endo_extirpation_emergency';
  }
  
  return null;
}

/**
 * Hook to use RCT auto-mapping with feature flag
 */
export function useRctAutoMapping() {
  const isFeatureEnabled = useFeatureFlag('rootCanalAutoMapping');
  
  return {
    isFeatureEnabled,
    getAutoRctTreatment: (condition: string, toothNumber: string, numberingSystem: ToothNumberingSystem) =>
      getAutoRctTreatment(condition, toothNumber, numberingSystem, isFeatureEnabled),
    getEmergencyExtirpation
  };
}
