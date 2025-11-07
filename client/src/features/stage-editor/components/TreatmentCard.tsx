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
    <Card className="transition-all duration-200 hover:shadow-lg hover:scale-[1.02] relative group border-l-4 border-l-blue-500 bg-gradient-to-r from-white to-blue-50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Tooth and urgency */}
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="text-sm font-mono font-bold bg-blue-100 text-blue-700 border-blue-300">
                Tooth #{item.tooth}
              </Badge>
              {item.urgency && (
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold ${getUrgencyColor(item.urgency)}`}
                >
                  {item.urgency.toUpperCase()}
                </Badge>
              )}
            </div>
            
            {/* Condition and treatment */}
            <div className="space-y-2 mb-3">
              <div className="bg-gray-100 rounded px-2 py-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Condition</p>
                <p className="text-sm font-medium text-gray-800 capitalize">
                  {item.condition.replace(/-/g, ' ')}
                </p>
              </div>
              <div className="bg-blue-100 rounded px-2 py-1">
                <p className="text-xs text-blue-600 uppercase tracking-wide">Treatment</p>
                <p className="text-sm font-semibold text-blue-900 capitalize">
                  {item.treatment.replace(/-/g, ' ')}
                </p>
              </div>
            </div>
            
            {/* Time and cost */}
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5 bg-green-50 rounded px-2 py-1">
                <Clock className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">{formatDuration(item.estimatedTime)}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-50 rounded px-2 py-1">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-700">{formatCurrency(item.price)}</span>
              </div>
            </div>
          </div>
          
          {/* Action buttons - top right corner */}
          <div className="flex flex-col gap-1">
            {onRemove && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-red-100 hover:bg-red-200 text-red-600"
                onClick={onRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Arrow buttons - bottom right corner */}
        <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
          {canMoveLeft && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600 text-white border-blue-600 shadow-md hover:shadow-lg"
              onClick={onMoveLeft}
              title="Move to previous stage"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {canMoveRight && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600 text-white border-blue-600 shadow-md hover:shadow-lg"
              onClick={onMoveRight}
              title="Move to next stage"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
