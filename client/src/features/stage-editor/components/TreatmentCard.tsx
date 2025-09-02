import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GripVertical, X, Clock, DollarSign } from 'lucide-react';
import { TreatmentItem } from '../types/stage-editor.types';
import { formatDuration, formatCurrency } from '../utils/stage-calculations';

interface TreatmentCardProps {
  item: TreatmentItem;
  onRemove?: () => void;
  isDragging?: boolean;
}

export function TreatmentCard({ item, onRemove, isDragging }: TreatmentCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: item.id,
    data: {
      type: 'treatment',
      item,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCurrentlyDragging = isDragging || isSortableDragging;

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`
        cursor-move transition-all duration-200 hover:shadow-md
        ${isCurrentlyDragging ? 'opacity-50 shadow-lg scale-105 rotate-2' : ''}
      `}
      {...attributes}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          {/* Drag handle and main content */}
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div
              {...listeners}
              className="mt-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              {/* Tooth and urgency */}
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs font-mono">
                  #{item.tooth}
                </Badge>
                {item.urgency && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getUrgencyColor(item.urgency)}`}
                  >
                    {item.urgency}
                  </Badge>
                )}
              </div>
              
              {/* Condition and treatment */}
              <div className="space-y-1">
                <p className="text-sm text-gray-600 capitalize">
                  {item.condition.replace(/-/g, ' ')}
                </p>
                <p className="text-sm font-medium capitalize">
                  {item.treatment.replace(/-/g, ' ')}
                </p>
              </div>
              
              {/* Time and cost */}
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatDuration(item.estimatedTime)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <span>{formatCurrency(item.price)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Remove button */}
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
