import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  RotateCcw, 
  Save, 
  X, 
  Clock, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Info,
  Brain
} from 'lucide-react';
import { TreatmentStage, TreatmentItem } from '../types/stage-editor.types';
import { StageColumn } from './StageColumn';
import { TreatmentCard } from './TreatmentCard';
import { useStageEditor } from '../hooks/useStageEditor';
import { formatDuration, formatCurrency } from '../utils/stage-calculations';
import { canDeleteStage } from '../utils/stage-validation';

interface StageEditorProps {
  initialStages: TreatmentStage[];
  onSave: (stages: TreatmentStage[]) => void;
  onCancel: () => void;
  onGenerateReport?: (stages: TreatmentStage[]) => void;
  timeThreshold?: number;
}

export function StageEditor({ 
  initialStages, 
  onSave, 
  onCancel, 
  onGenerateReport,
  timeThreshold = 90 
}: StageEditorProps) {
  const {
    stages,
    isDirty,
    globalTotals,
    validation,
    canSave,
    moveItemBetweenStages,
    reorderItemsInStage,
    addStage,
    deleteStage,
    updateStage,
    removeTreatmentItem,
    resetToOriginal,
    resetToAISuggestion
  } = useStageEditor({ initialStages, timeThreshold });

  const [activeItem, setActiveItem] = React.useState<TreatmentItem | null>(null);
  const [activeStage, setActiveStage] = React.useState<TreatmentStage | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1, // Very low distance for immediate response
        tolerance: 5, // Allow some tolerance for accidental movements
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;

    if (data?.type === 'treatment') {
      setActiveItem(data.item);
    } else if (data?.type === 'stage') {
      setActiveStage(stages.find(s => s.id === active.id) || null);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Only handle treatment item drags
    if (activeData?.type !== 'treatment') return;

    const activeStageId = findItemStageId(active.id as string);
    const overStageId = overData?.stageId;

    if (!activeStageId || !overStageId || activeStageId === overStageId) return;

    // Move item between stages
    moveItemBetweenStages(active.id as string, activeStageId, overStageId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    setActiveStage(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Handle treatment item reordering within the same stage
    if (activeData?.type === 'treatment' && overData?.type === 'treatment') {
      const activeStageId = findItemStageId(active.id as string);
      const overStageId = findItemStageId(over.id as string);

      if (activeStageId === overStageId && activeStageId) {
        const stage = stages.find(s => s.id === activeStageId);
        if (!stage) return;

        const activeIndex = stage.items.findIndex(item => item.id === active.id);
        const overIndex = stage.items.findIndex(item => item.id === over.id);

        if (activeIndex !== overIndex) {
          reorderItemsInStage(activeStageId, activeIndex, overIndex);
        }
      }
    }
  };

  const findItemStageId = (itemId: string): string | null => {
    for (const stage of stages) {
      if (stage.items.some(item => item.id === itemId)) {
        return stage.id;
      }
    }
    return null;
  };

  const handleSave = () => {
    if (canSave) {
      onSave(stages);
    }
  };

  const handleGenerateReport = () => {
    if (onGenerateReport && canSave) {
      onGenerateReport(stages);
    }
  };

  const handleAddStage = () => {
    addStage(`Stage ${stages.length + 1}`, 'Additional treatment phase');
  };

  const handleDeleteStage = (stageId: string) => {
    try {
      deleteStage(stageId);
    } catch (error) {
      // Handle error (could show toast)
      console.error('Cannot delete stage:', error);
    }
  };

  const handleResetToAI = () => {
    resetToAISuggestion(initialStages);
  };

  return (
    <div className="flex flex-col h-full max-h-[90vh]">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Treatment Stage Editor</h2>
            <p className="text-gray-600 mt-1">
              Drag treatments between stages to organize your treatment plan
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleResetToAI}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to AI
            </Button>
            <Button variant="outline" onClick={resetToOriginal}>
              Reset
            </Button>
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!canSave}
              variant="outline"
              className="min-w-[100px]"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            {onGenerateReport && (
              <Button 
                onClick={handleGenerateReport} 
                disabled={!canSave}
                className="min-w-[140px] bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700"
              >
                <Brain className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            )}
          </div>
        </div>
        
        {/* Global totals */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <span className="font-medium">Total Time:</span>
                  <span className="text-lg font-bold">
                    {formatDuration(globalTotals.totalTime)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-gray-500" />
                  <span className="font-medium">Total Cost:</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(globalTotals.totalCost)}
                  </span>
                </div>
                
                <Badge variant="secondary">
                  {stages.length} {stages.length === 1 ? 'stage' : 'stages'}
                </Badge>
              </div>
              
              {isDirty && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  <Info className="h-3 w-3 mr-1" />
                  Unsaved changes
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Validation messages */}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="flex-shrink-0 p-6 space-y-2">
          {validation.errors.map((error, index) => (
            <Alert key={index} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ))}
          
          {validation.warnings.map((warning, index) => (
            <Alert key={index}>
              <Info className="h-4 w-4" />
              <AlertDescription>{warning}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Main editor area */}
      <div className="flex-1 overflow-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 min-h-full">
            {stages.map((stage) => {
              const { canDelete } = canDeleteStage(stage);
              const canDeleteThisStage = canDelete && stages.length > 1;
              
              return (
                <StageColumn
                  key={stage.id}
                  stage={stage}
                  timeThreshold={timeThreshold}
                  onUpdateStage={(updates) => updateStage(stage.id, updates)}
                  onDeleteStage={() => handleDeleteStage(stage.id)}
                  onRemoveItem={(itemId) => removeTreatmentItem(stage.id, itemId)}
                  canDelete={canDeleteThisStage}
                />
              );
            })}
            
            {/* Add stage button */}
            <Card className="w-80 min-h-[400px] border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
              <Button
                variant="ghost"
                size="lg"
                onClick={handleAddStage}
                className="h-auto p-8 flex-col gap-2 text-gray-500 hover:text-gray-700"
              >
                <Plus className="h-8 w-8" />
                <span>Add Stage</span>
              </Button>
            </Card>
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeItem && (
              <TreatmentCard item={activeItem} isDragging />
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
