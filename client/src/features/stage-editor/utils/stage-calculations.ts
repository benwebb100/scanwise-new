import { TreatmentItem, TreatmentStage } from '../types/stage-editor.types';

// Treatment duration estimates (in minutes)
export const TREATMENT_DURATIONS: Record<string, number> = {
  'filling': 30,
  'crown': 90,
  'root-canal-treatment': 120,
  'surgical-extraction': 60,
  'extraction': 45,
  'implant': 180,
  'implant-placement': 180,
  'bridge': 120,
  'scaling': 60,
  'scale-and-clean': 60,
  'deep-cleaning': 90,
  'whitening': 45,
  'veneer': 60,
  'fluoride-treatment': 15,
  'composite-build-up': 45,
  'partial-denture': 120,
  'complete-denture': 150,
  'inlay': 60,
  'onlay': 75,
  'bonding': 30,
  'sealant': 15,
  'night-guard': 30,
  'orthodontic-treatment': 60,
  'braces': 90,
  'invisalign': 45,
  'retainer': 30,
  'space-maintainer': 45,
  'apicoectomy': 90,
  'bone-graft': 120,
  'sinus-lift': 150,
  'gum-graft': 90
};

/**
 * Get estimated time for a treatment
 */
export function getTreatmentDuration(treatment: string): number {
  const normalizedTreatment = treatment.toLowerCase().replace(/\s+/g, '-');
  return TREATMENT_DURATIONS[normalizedTreatment] || 60; // Default 60 minutes
}

/**
 * Calculate totals for a stage
 */
export function calculateStageMetrics(stage: TreatmentStage): { totalTime: number; totalCost: number } {
  const totalTime = stage.items.reduce((sum, item) => sum + item.estimatedTime, 0);
  const totalCost = stage.items.reduce((sum, item) => sum + item.price, 0);
  
  return { totalTime, totalCost };
}

/**
 * Update stage with calculated totals
 */
export function updateStageMetrics(stage: TreatmentStage): TreatmentStage {
  const { totalTime, totalCost } = calculateStageMetrics(stage);
  
  return {
    ...stage,
    totalTime,
    totalCost
  };
}

/**
 * Calculate global totals across all stages
 */
export function calculateGlobalTotals(stages: TreatmentStage[]): { totalTime: number; totalCost: number } {
  const totalTime = stages.reduce((sum, stage) => sum + stage.totalTime, 0);
  const totalCost = stages.reduce((sum, stage) => sum + stage.totalCost, 0);
  
  return { totalTime, totalCost };
}

/**
 * Check if a stage is over the time threshold
 */
export function isStageOverThreshold(stage: TreatmentStage, threshold: number): boolean {
  return stage.totalTime > threshold;
}

/**
 * Format time duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}min`;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Generate a unique ID for new items/stages
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
