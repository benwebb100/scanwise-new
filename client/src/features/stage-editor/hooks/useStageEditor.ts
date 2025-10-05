import { useState, useCallback, useMemo } from 'react';
import { TreatmentStage, TreatmentItem, StageEditorState } from '../types/stage-editor.types';
import { 
  updateStageMetrics, 
  calculateGlobalTotals, 
  generateId 
} from '../utils/stage-calculations';
import { validateStages } from '../utils/stage-validation';
import { createDefaultStages } from '../utils/stage-serialization';

interface UseStageEditorOptions {
  initialStages: TreatmentStage[];
  timeThreshold?: number;
}

export function useStageEditor({ initialStages, timeThreshold = 90 }: UseStageEditorOptions) {
  // Initialize state
  const [state, setState] = useState<StageEditorState>(() => {
    const stages = initialStages.length > 0 
      ? initialStages.map(updateStageMetrics)
      : createDefaultStages([]);
    
    return {
      stages,
      originalStages: structuredClone(stages),
      isDirty: false,
      timeThreshold
    };
  });

  // Computed values
  const globalTotals = useMemo(() => 
    calculateGlobalTotals(state.stages), 
    [state.stages]
  );

  const validation = useMemo(() => 
    validateStages(state.stages), 
    [state.stages]
  );

  const canSave = validation.isValid && state.isDirty;

  // Actions
  const updateStages = useCallback((updater: (stages: TreatmentStage[]) => TreatmentStage[]) => {
    setState(prev => {
      const newStages = updater(prev.stages).map(updateStageMetrics);
      return {
        ...prev,
        stages: newStages,
        isDirty: true
      };
    });
  }, []);

  const moveItemBetweenStages = useCallback((
    itemId: string, 
    fromStageId: string, 
    toStageId: string,
    newIndex?: number
  ) => {
    updateStages(stages => {
      const fromStageIndex = stages.findIndex(s => s.id === fromStageId);
      const toStageIndex = stages.findIndex(s => s.id === toStageId);
      
      if (fromStageIndex === -1 || toStageIndex === -1) return stages;

      const fromStage = stages[fromStageIndex];
      const toStage = stages[toStageIndex];
      
      const itemIndex = fromStage.items.findIndex(item => item.id === itemId);
      if (itemIndex === -1) return stages;

      const item = fromStage.items[itemIndex];
      const newStages = [...stages];

      // Remove from source stage
      newStages[fromStageIndex] = {
        ...fromStage,
        items: fromStage.items.filter((_, i) => i !== itemIndex)
      };

      // Add to target stage
      const targetItems = [...toStage.items];
      const insertIndex = newIndex !== undefined ? newIndex : 0; // Default to top of stage
      targetItems.splice(insertIndex, 0, item);

      newStages[toStageIndex] = {
        ...toStage,
        items: targetItems
      };

      return newStages;
    });
  }, [updateStages]);

  const reorderItemsInStage = useCallback((
    stageId: string, 
    activeIndex: number, 
    overIndex: number
  ) => {
    updateStages(stages => {
      const stageIndex = stages.findIndex(s => s.id === stageId);
      if (stageIndex === -1) return stages;

      const stage = stages[stageIndex];
      const newItems = [...stage.items];
      const [movedItem] = newItems.splice(activeIndex, 1);
      newItems.splice(overIndex, 0, movedItem);

      const newStages = [...stages];
      newStages[stageIndex] = {
        ...stage,
        items: newItems
      };

      return newStages;
    });
  }, [updateStages]);

  const addStage = useCallback((name?: string, focus?: string) => {
    updateStages(stages => [
      ...stages,
      {
        id: generateId(),
        name: name || `Stage ${stages.length + 1}`,
        focus: focus || '',
        order: stages.length,
        items: [],
        totalTime: 0,
        totalCost: 0
      }
    ]);
  }, [updateStages]);

  const deleteStage = useCallback((stageId: string) => {
    updateStages(stages => {
      const stageIndex = stages.findIndex(s => s.id === stageId);
      if (stageIndex === -1) return stages;

      const stage = stages[stageIndex];
      
      // Don't delete if stage has items
      if (stage.items.length > 0) {
        throw new Error('Cannot delete stage with treatments');
      }

      // Don't delete if it's the last stage
      if (stages.length === 1) {
        throw new Error('Cannot delete the last stage');
      }

      return stages.filter(s => s.id !== stageId);
    });
  }, [updateStages]);

  const updateStage = useCallback((stageId: string, updates: Partial<TreatmentStage>) => {
    updateStages(stages => {
      const stageIndex = stages.findIndex(s => s.id === stageId);
      if (stageIndex === -1) return stages;

      const newStages = [...stages];
      newStages[stageIndex] = {
        ...stages[stageIndex],
        ...updates
      };

      return newStages;
    });
  }, [updateStages]);

  const addTreatmentItem = useCallback((stageId: string, item: Omit<TreatmentItem, 'id'>) => {
    updateStages(stages => {
      const stageIndex = stages.findIndex(s => s.id === stageId);
      if (stageIndex === -1) return stages;

      const newStages = [...stages];
      newStages[stageIndex] = {
        ...stages[stageIndex],
        items: [
          ...stages[stageIndex].items,
          {
            ...item,
            id: generateId()
          }
        ]
      };

      return newStages;
    });
  }, [updateStages]);

  const removeTreatmentItem = useCallback((stageId: string, itemId: string) => {
    updateStages(stages => {
      const stageIndex = stages.findIndex(s => s.id === stageId);
      if (stageIndex === -1) return stages;

      const newStages = [...stages];
      newStages[stageIndex] = {
        ...stages[stageIndex],
        items: stages[stageIndex].items.filter(item => item.id !== itemId)
      };

      return newStages;
    });
  }, [updateStages]);

  const updateTreatmentItem = useCallback((stageId: string, updatedItem: any) => {
    updateStages(stages => {
      const stageIndex = stages.findIndex(s => s.id === stageId);
      if (stageIndex === -1) return stages;

      const newStages = [...stages];
      newStages[stageIndex] = {
        ...stages[stageIndex],
        items: stages[stageIndex].items.map(item => 
          item.id === updatedItem.id ? updatedItem : item
        )
      };

      return newStages;
    });
  }, [updateStages]);

  const resetToOriginal = useCallback(() => {
    setState(prev => ({
      ...prev,
      stages: structuredClone(prev.originalStages),
      isDirty: false
    }));
  }, []);

  const resetToAISuggestion = useCallback((aiStages: TreatmentStage[]) => {
    const processedStages = aiStages.length > 0 
      ? aiStages.map(updateStageMetrics)
      : createDefaultStages([]);

    setState(prev => ({
      ...prev,
      stages: processedStages,
      isDirty: true
    }));
  }, []);

  return {
    // State
    stages: state.stages,
    originalStages: state.originalStages,
    isDirty: state.isDirty,
    timeThreshold: state.timeThreshold,
    
    // Computed values
    globalTotals,
    validation,
    canSave,
    
    // Actions
    moveItemBetweenStages,
    reorderItemsInStage,
    addStage,
    deleteStage,
    updateStage,
    addTreatmentItem,
    removeTreatmentItem,
    updateTreatmentItem,
    resetToOriginal,
    resetToAISuggestion
  };
}
