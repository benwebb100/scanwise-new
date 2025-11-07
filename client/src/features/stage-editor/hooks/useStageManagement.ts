// hooks/useStageManagement.ts (continued)
import { createDynamicStages, generateId, getFindingUrgency, deserializeStages, serializeStages } from '@/features/stage-editor';
import { useState } from 'react';

export const useStageManagement = (getPrice: Function, getDuration: Function) => {
  const [currentTreatmentStages, setCurrentTreatmentStages] = useState<any[]>([]);
  const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);
  
  const openStageEditorWithFindings = async (data: { 
    validFindings: any[], 
    useXrayMode: boolean, 
    patientName: string, 
    patientObservations: string,
    immediateAnalysisData?: any
  }) => {
    console.log('🎯 Opening stage editor with findings:', data.validFindings);
    
    let findingsForStaging = data.validFindings;
    
    // In X-ray mode, check if we have AI-generated stages
    if (data.useXrayMode && data.immediateAnalysisData?.treatment_stages?.length > 0) {
      console.log('🎯 X-ray mode: Using AI analysis data for staging');
      
      try {
        const aiStages = deserializeStages(data.immediateAnalysisData.treatment_stages);
        const totalItems = aiStages.reduce((sum, stage) => sum + stage.items.length, 0);
        const maxItemsInOneStage = Math.max(...aiStages.map(stage => stage.items.length));
        
        if (aiStages.length > 1 && !(totalItems > 3 && maxItemsInOneStage / totalItems > 0.8)) {
          console.log('🎯 Using well-distributed AI stages');
          setCurrentTreatmentStages(aiStages);
          setPendingSubmitData(data);
          return aiStages;
        } else {
          console.log('🎯 AI stages poorly distributed, using manual findings approach');
        }
      } catch (error) {
        console.warn('🎯 Error processing AI stages, falling back to manual findings:', error);
      }
    }
    
    // Create dynamic stages using the new urgency system
    console.log('🎯 Findings for staging:', findingsForStaging);
    const dynamicStages = createDynamicStages(findingsForStaging);
    console.log('🎯 Created dynamic stages:', dynamicStages);
    
    // Convert to editor format
    const editorStages = dynamicStages.map((stage, index) => ({
      id: generateId(),
      name: stage.name,
      focus: stage.focus,
      order: index,
      items: stage.items.map(finding => ({
        id: generateId(),
        toothNumber: finding.tooth,
        condition: finding.condition,
        treatment: finding.treatment,
        replacement: finding.replacement || null,
        urgency: getFindingUrgency(finding.condition, finding.treatment),
        estimatedTime: getDuration(finding.treatment),
        price: getPrice(finding.treatment)
      })),
      totalTime: 0,
      totalCost: 0
    }));
    
    // Calculate totals for each stage
    editorStages.forEach(stage => {
      stage.totalTime = stage.items.reduce((sum, item) => sum + (item.estimatedTime || 0), 0);
      stage.totalCost = stage.items.reduce((sum, item) => sum + (item.price || 0), 0);
    });
    
    console.log('🎯 Editor stages ready:', editorStages);
    
    setPendingSubmitData(data);
    setCurrentTreatmentStages(editorStages);
    return editorStages;
  };
  
  return {
    currentTreatmentStages,
    setCurrentTreatmentStages,
    pendingSubmitData,
    setPendingSubmitData,
    openStageEditorWithFindings
  };
};