// Main exports
export { StageEditor } from './components/StageEditor';
export { StageEditorModal } from './components/StageEditorModal';
export { TreatmentCard } from './components/TreatmentCard';
export { StageColumn } from './components/StageColumn';

// Hooks
export { useStageEditor } from './hooks/useStageEditor';
export { useFeatureFlag, useFeatureFlagToggle } from './hooks/useFeatureFlag';

// Types
export type { 
  TreatmentItem, 
  TreatmentStage, 
  StageEditorState, 
  StageEditorProps,
  FeatureFlags
} from './types/stage-editor.types';

// Utils
export {
  getTreatmentDuration,
  calculateStageMetrics,
  updateStageMetrics,
  calculateGlobalTotals,
  isStageOverThreshold,
  formatDuration,
  formatCurrency,
  generateId
} from './utils/stage-calculations';

export {
  validateStages,
  canDeleteStage,
  suggestStageName
} from './utils/stage-validation';

export {
  deserializeStages,
  serializeStages,
  findingsToTreatmentItems,
  createDefaultStages
} from './utils/stage-serialization';

export {
  getUrgencyLevel,
  getFindingUrgency,
  createDynamicStages,
  getTreatmentDuration as getTreatmentDurationFromMapping
} from './utils/treatment-urgency';
