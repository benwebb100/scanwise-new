export interface TreatmentItem {
  id: string;
  toothNumber: string;  // Changed from 'tooth' to 'toothNumber' for consistency
  condition: string;
  treatment: string;
  estimatedTime: number; // in minutes
  price: number;
  urgency?: 'high' | 'medium' | 'low';
}

export interface TreatmentStage {
  id: string;
  name: string;
  focus: string;
  items: TreatmentItem[];
  totalTime: number; // computed
  totalCost: number; // computed
  order: number;
}

export interface StageEditorState {
  stages: TreatmentStage[];
  originalStages: TreatmentStage[]; // for reset functionality
  isDirty: boolean;
  timeThreshold: number; // minutes, default 90
}

export interface StageEditorProps {
  initialStages: TreatmentStage[];
  onSave: (stages: TreatmentStage[]) => void;
  onCancel: () => void;
  timeThreshold?: number;
}

export interface DragEndEvent {
  active: {
    id: string;
    data: {
      current: {
        type: 'treatment' | 'stage';
        item?: TreatmentItem;
        stageId?: string;
      };
    };
  };
  over: {
    id: string;
    data: {
      current: {
        type: 'stage' | 'stage-drop-zone';
        stageId: string;
      };
    };
  } | null;
}

// Feature flag type
export interface FeatureFlags {
  stageEditorV2: boolean;
}
