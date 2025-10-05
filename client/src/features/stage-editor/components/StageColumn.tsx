import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  Clock, 
  DollarSign,
  AlertTriangle,
  Check,
  X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TreatmentStage } from '../types/stage-editor.types';
import { TreatmentCard } from './TreatmentCard';
import { RctTreatmentCard } from './RctTreatmentCard';
import { formatDuration, formatCurrency, isStageOverThreshold } from '../utils/stage-calculations';

interface StageColumnProps {
  stage: TreatmentStage;
  timeThreshold: number;
  onUpdateStage: (updates: Partial<TreatmentStage>) => void;
  onDeleteStage: () => void;
  onRemoveItem: (itemId: string) => void;
  onMoveItem: (itemId: string, direction: 'left' | 'right') => void;
  onUpdateItem: (updatedItem: any) => void;
  canDelete: boolean;
  stageIndex: number;
  totalStages: number;
}

export function StageColumn({ 
  stage, 
  timeThreshold,
  onUpdateStage, 
  onDeleteStage, 
  onRemoveItem, 
  onMoveItem, 
  onUpdateItem,
  canDelete, 
  stageIndex, 
  totalStages 
}: StageColumnProps) {
  const [isEditingFocus, setIsEditingFocus] = useState(false);
  const [editedFocus, setEditedFocus] = useState(stage.focus || '');
  
  // Sync editedFocus with stage.focus when it changes
  useEffect(() => {
    setEditedFocus(stage.focus || '');
  }, [stage.focus]);
  
  // No longer need drag and drop functionality

  const isOverThreshold = isStageOverThreshold(stage, timeThreshold);

  const handleFocusSave = () => {
    if (editedFocus.trim() !== stage.focus) {
      onUpdateStage({ focus: editedFocus.trim() });
    }
    setIsEditingFocus(false);
    setEditedFocus(editedFocus.trim()); // Use the new value, not the old stage.focus
  };

  const handleFocusCancel = () => {
    setIsEditingFocus(false);
    setEditedFocus(stage.focus || '');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFocusSave();
    } else if (e.key === 'Escape') {
      handleFocusCancel();
    }
  };

  return (
    <Card 
      className="w-80 min-h-[400px] flex flex-col transition-all duration-200"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">
              {stage.name}
            </CardTitle>
            
            {isEditingFocus ? (
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={editedFocus}
                  onChange={(e) => setEditedFocus(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="text-sm text-gray-600"
                  placeholder="Enter stage description..."
                  autoFocus
                />
                <Button size="sm" variant="ghost" onClick={handleFocusSave}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleFocusCancel}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p 
                className="text-sm text-gray-600 mt-1 cursor-pointer hover:text-blue-600"
                onClick={() => setIsEditingFocus(true)}
              >
                {stage.focus || 'Click to add description...'}
              </p>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditingFocus(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Focus
              </DropdownMenuItem>
              {canDelete && (
                <DropdownMenuItem 
                  onClick={onDeleteStage}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Stage
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Stage metrics */}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1 text-sm">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className={isOverThreshold ? 'text-orange-600 font-medium' : ''}>
              {formatDuration(stage.totalTime)}
            </span>
            {isOverThreshold && (
              <AlertTriangle className="h-4 w-4 text-orange-500 ml-1" />
            )}
          </div>
          
          <div className="flex items-center gap-1 text-sm">
            <DollarSign className="h-4 w-4 text-gray-500" />
            <span>{formatCurrency(stage.totalCost)}</span>
          </div>
          
          <Badge variant="secondary" className="text-xs">
            {stage.items.length} {stage.items.length === 1 ? 'treatment' : 'treatments'}
          </Badge>
        </div>
        
        {isOverThreshold && (
          <div className="mt-2 p-2 bg-orange-100 border border-orange-200 rounded text-xs text-orange-700">
            ⚠️ This stage exceeds the {formatDuration(timeThreshold)} time threshold
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 pt-0">
        <div className="min-h-[200px] space-y-2 p-2">
          {stage.items.map((item, index) => {
            const isRctTreatment = item.treatment.includes('endo_rct_');
            
            if (isRctTreatment) {
              return (
                <RctTreatmentCard
                  key={item.id}
                  item={item}
                  onRemove={() => onRemoveItem(item.id)}
                  onMoveLeft={stageIndex > 0 ? () => onMoveItem(item.id, 'left') : undefined}
                  onMoveRight={stageIndex < totalStages - 1 ? () => onMoveItem(item.id, 'right') : undefined}
                  onUpdate={(updatedItem) => onUpdateItem(updatedItem)}
                  canMoveLeft={stageIndex > 0}
                  canMoveRight={stageIndex < totalStages - 1}
                />
              );
            }
            
            return (
              <TreatmentCard
                key={item.id}
                item={item}
                onRemove={() => onRemoveItem(item.id)}
                onMoveLeft={stageIndex > 0 ? () => onMoveItem(item.id, 'left') : undefined}
                onMoveRight={stageIndex < totalStages - 1 ? () => onMoveItem(item.id, 'right') : undefined}
                canMoveLeft={stageIndex > 0}
                canMoveRight={stageIndex < totalStages - 1}
              />
            );
          })}
          
          {stage.items.length === 0 && (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
              No treatments in this stage
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
