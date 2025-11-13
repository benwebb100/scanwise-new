import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TreatmentStage } from '../types/stage-editor.types';
import { StageEditor } from './StageEditor';

interface StageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStages: TreatmentStage[];
  onSave: (stages: TreatmentStage[]) => void;
  onGenerateReport?: (stages: TreatmentStage[]) => void;
  timeThreshold?: number;
}

export function StageEditorModal({
  isOpen,
  onClose,
  initialStages,
  onSave,
  onGenerateReport,
  timeThreshold
}: StageEditorModalProps) {
  const handleSave = (stages: TreatmentStage[]) => {
    onSave(stages);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Treatment Stage Editor</DialogTitle>
          <DialogDescription>
            Organize your treatment plan by dragging treatments between stages
          </DialogDescription>
        </DialogHeader>
        
        <StageEditor
          initialStages={initialStages}
          onSave={handleSave}
          onCancel={onClose}
          onGenerateReport={onGenerateReport}
          timeThreshold={timeThreshold}
        />
      </DialogContent>
    </Dialog>
  );
}
