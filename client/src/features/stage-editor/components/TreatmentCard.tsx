import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Clock, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { TreatmentItem } from '../types/stage-editor.types';
import { formatDuration, formatCurrency } from '../utils/stage-calculations';

interface TreatmentCardProps {
  item: TreatmentItem;
  onRemove?: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
}

export function TreatmentCard({ 
  item, 
  onRemove, 
  onMoveLeft, 
  onMoveRight, 
  canMoveLeft = false, 
  canMoveRight = false 
}: TreatmentCardProps) {

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-md relative group">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Tooth and urgency */}
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs font-mono">
                #{item.toothNumber || item.tooth}
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
          
          {/* Action buttons - top right corner */}
          <div className="flex flex-col gap-1">
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
        </div>
        
        {/* Arrow buttons - bottom right corner */}
        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canMoveLeft && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 w-6 p-0 bg-white shadow-sm"
              onClick={onMoveLeft}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
          )}
          {canMoveRight && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 w-6 p-0 bg-white shadow-sm"
              onClick={onMoveRight}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
