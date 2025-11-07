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

  const isOverThreshold = isStageOverThreshold(stage, timeThreshold);

  const handleFocusSave = () => {
    if (editedFocus.trim() !== stage.focus) {
      onUpdateStage({ focus: editedFocus.trim() });
    }
    setIsEditingFocus(false);
    setEditedFocus(editedFocus.trim());
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
      className="w-80 min-h-[400px] flex flex-col transition-all duration-200 border-2 hover:shadow-xl bg-white"
    >
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-t-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl font-bold">
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
                className="text-sm text-white/90 mt-1 cursor-pointer hover:text-white font-medium"
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
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-md px-3 py-1.5">
            <Clock className="h-4 w-4 text-white" />
            <span className={`text-sm font-semibold ${isOverThreshold ? 'text-yellow-300' : 'text-white'}`}>
              {formatDuration(stage.totalTime)}
            </span>
            {isOverThreshold && (
              <AlertTriangle className="h-4 w-4 text-yellow-300 ml-1" />
            )}
          </div>
          
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-md px-3 py-1.5">
            <DollarSign className="h-4 w-4 text-white" />
            <span className="text-sm font-semibold text-white">{formatCurrency(stage.totalCost)}</span>
          </div>
          
          <Badge className="bg-white/20 text-white border-white/30 text-xs">
            {stage.items.length} {stage.items.length === 1 ? 'treatment' : 'treatments'}
          </Badge>
        </div>
        
        {isOverThreshold && (
          <div className="mt-2 p-2 bg-yellow-400/90 border border-yellow-500 rounded text-xs text-yellow-900 font-medium">
            ⚠️ This stage exceeds the {formatDuration(timeThreshold)} time threshold
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 pt-4 bg-gray-50">
        <div className="min-h-[200px] space-y-3 p-3">
          {stage.items.map((item) => (
            <TreatmentCard
              key={item.id}
              item={item}
              onRemove={() => onRemoveItem(item.id)}
              onMoveLeft={stageIndex > 0 ? () => onMoveItem(item.id, 'left') : undefined}
              onMoveRight={stageIndex < totalStages - 1 ? () => onMoveItem(item.id, 'right') : undefined}
              canMoveLeft={stageIndex > 0}
              canMoveRight={stageIndex < totalStages - 1}
            />
          ))}
          
          {stage.items.length === 0 && (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm border-2 border-dashed border-gray-300 rounded-lg bg-white">
              <div className="text-center">
                <div className="text-4xl mb-2">📋</div>
                <div>No treatments in this stage</div>
                <div className="text-xs mt-1">Move treatments here using arrow buttons</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}