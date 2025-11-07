import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Clock, DollarSign, ChevronLeft, ChevronRight, RotateCcw, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TreatmentItem } from '../types/stage-editor.types';
import { formatDuration, formatCurrency } from '../utils/stage-calculations';
import { getCanalCountFromRctTreatment, getRctTreatmentByCanals } from '@/utils/tooth-canal-mapping';
import { useTreatmentSettings } from '@/hooks/useTreatmentSettings';

interface RctOverrideSettings {
  canals: number;
  retreatment: boolean;
  calcifiedCanals: number;
  postPresent: boolean;
  removeRootFilling: number;
  additionalIrrigation: number;
  apicectomyRoots: number;
  emergencyExtirpation: boolean;
}

interface RctTreatmentCardProps {
  item: TreatmentItem;
  onRemove?: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onUpdate?: (updatedItem: TreatmentItem) => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
  toothNumberingSystem?: 'FDI' | 'Universal';
  autoMapping?: {
    treatment: string;
    canalMapping: any;
    isAutoSelected: boolean;
    requiresConfirmation: boolean;
  } | null;
}

export function RctTreatmentCard({ 
  item, 
  onRemove, 
  onMoveLeft, 
  onMoveRight, 
  onUpdate,
  canMoveLeft = false, 
  canMoveRight = false,
  toothNumberingSystem = 'FDI',
  autoMapping
}: RctTreatmentCardProps) {
  const { getTreatmentSetting } = useTreatmentSettings();
  
  // Initialize override settings
  const [overrides, setOverrides] = useState<RctOverrideSettings>(() => {
    const canalCount = getCanalCountFromRctTreatment(item.treatment);
    return {
      canals: canalCount,
      retreatment: false,
      calcifiedCanals: 0,
      postPresent: false,
      removeRootFilling: 0,
      additionalIrrigation: 0,
      apicectomyRoots: 0,
      emergencyExtirpation: false
    };
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [userOverride, setUserOverride] = useState(false);

  // Calculate total price and time
  const calculateTotals = () => {
    const baseSetting = getTreatmentSetting(getRctTreatmentByCanals(overrides.canals));
    let totalPrice = baseSetting.price;
    let totalTime = baseSetting.duration;

    // Add loads
    if (overrides.retreatment) {
      const retxSetting = getTreatmentSetting('endo_retx_load');
      totalPrice += retxSetting.price;
      totalTime += retxSetting.duration;
    }

    if (overrides.calcifiedCanals > 0) {
      const calcSetting = getTreatmentSetting('endo_calcified_per_canal');
      totalPrice += calcSetting.price * overrides.calcifiedCanals;
      totalTime += calcSetting.duration * overrides.calcifiedCanals;
    }

    if (overrides.postPresent) {
      const postSetting = getTreatmentSetting('endo_remove_post');
      totalPrice += postSetting.price;
      totalTime += postSetting.duration;
    }

    if (overrides.removeRootFilling > 0) {
      const removeSetting = getTreatmentSetting('endo_remove_root_filling_per_canal');
      totalPrice += removeSetting.price * overrides.removeRootFilling;
      totalTime += removeSetting.duration * overrides.removeRootFilling;
    }

    if (overrides.additionalIrrigation > 0) {
      const irrigationSetting = getTreatmentSetting('endo_additional_irrigation_visit');
      totalPrice += irrigationSetting.price * overrides.additionalIrrigation;
      totalTime += irrigationSetting.duration * overrides.additionalIrrigation;
    }

    if (overrides.apicectomyRoots > 0) {
      const apicSetting = getTreatmentSetting('endo_apicectomy_per_root');
      totalPrice += apicSetting.price * overrides.apicectomyRoots;
      totalTime += apicSetting.duration * overrides.apicectomyRoots;
    }

    if (overrides.emergencyExtirpation) {
      const emergencySetting = getTreatmentSetting('endo_extirpation_emergency');
      totalPrice += emergencySetting.price;
      totalTime += emergencySetting.duration;
    }

    return { totalPrice, totalTime };
  };

  const { totalPrice, totalTime } = calculateTotals();

  // Update treatment when overrides change
  useEffect(() => {
    if (onUpdate) {
      const newTreatment = getRctTreatmentByCanals(overrides.canals);
      onUpdate({
        ...item,
        treatment: newTreatment,
        price: totalPrice,
        estimatedTime: totalTime
      });
    }
  }, [overrides, totalPrice, totalTime, onUpdate, item]);

  const handleResetToAuto = () => {
    if (autoMapping) {
      const canalCount = getCanalCountFromRctTreatment(autoMapping.treatment);
      setOverrides(prev => ({ ...prev, canals: canalCount }));
      setUserOverride(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isRctTreatment = item.treatment.includes('endo_rct_');

  if (!isRctTreatment) {
    // Fallback to regular treatment card for non-RCT treatments
    return (
      <Card className="transition-all duration-200 hover:shadow-md relative group">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs font-mono">
                  #{item.tooth}
                </Badge>
                {item.urgency && (
                  <Badge variant="outline" className={`text-xs ${getUrgencyColor(item.urgency)}`}>
                    {item.urgency}
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-600 capitalize">
                  {item.condition.replace(/-/g, ' ')}
                </p>
                <p className="text-sm font-medium capitalize">
                  {item.treatment.replace(/-/g, ' ')}
                </p>
              </div>
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

  return (
    <Card className="transition-all duration-200 hover:shadow-md relative group border-blue-200">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Tooth and urgency */}
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs font-mono">
                #{item.tooth}
              </Badge>
              {item.urgency && (
                <Badge variant="outline" className={`text-xs ${getUrgencyColor(item.urgency)}`}>
                  {item.urgency}
                </Badge>
              )}
              {autoMapping?.isAutoSelected && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                      Auto
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Tooth {item.tooth} → default {overrides.canals} canals</p>
                    {autoMapping.canalMapping.note && <p>{autoMapping.canalMapping.note}</p>}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            
            {/* Condition and treatment */}
            <div className="space-y-1">
              <p className="text-sm text-gray-600 capitalize">
                {item.condition.replace(/-/g, ' ')}
              </p>
              <p className="text-sm font-medium capitalize">
                Root Canal Treatment – {overrides.canals} Canal{overrides.canals > 1 ? 's' : ''}
              </p>
            </div>
            
            {/* Time and cost */}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatDuration(totalTime)}</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <span>{formatCurrency(totalPrice)}</span>
              </div>
            </div>

            {/* Expand button */}
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-6 px-2 text-xs"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Hide Details' : 'Show Details'}
            </Button>
          </div>
          
          {/* Action buttons */}
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

        {/* Expanded RCT controls */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
            {/* Canal count */}
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium">Canals:</Label>
              <Select
                value={overrides.canals.toString()}
                onValueChange={(value) => {
                  setOverrides(prev => ({ ...prev, canals: parseInt(value) }));
                  setUserOverride(true);
                }}
              >
                <SelectTrigger className="w-20 h-6 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                </SelectContent>
              </Select>
              {autoMapping && userOverride && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={handleResetToAuto}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset to Auto
                </Button>
              )}
            </div>

            {/* Loads/Add-ons */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={overrides.retreatment}
                  onChange={(e) => setOverrides(prev => ({ ...prev, retreatment: e.target.checked }))}
                  className="h-3 w-3"
                />
                <Label className="text-xs">Retreatment</Label>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={overrides.postPresent}
                  onChange={(e) => setOverrides(prev => ({ ...prev, postPresent: e.target.checked }))}
                  className="h-3 w-3"
                />
                <Label className="text-xs">Post Present</Label>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={overrides.emergencyExtirpation}
                  onChange={(e) => setOverrides(prev => ({ ...prev, emergencyExtirpation: e.target.checked }))}
                  className="h-3 w-3"
                />
                <Label className="text-xs">Emergency Extirpation</Label>
              </div>
            </div>

            {/* Quantity inputs */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Calcified:</Label>
                <Input
                  type="number"
                  min="0"
                  max="4"
                  value={overrides.calcifiedCanals}
                  onChange={(e) => setOverrides(prev => ({ ...prev, calcifiedCanals: parseInt(e.target.value) || 0 }))}
                  className="h-6 w-12 text-xs"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Label className="text-xs">Remove Root Filling:</Label>
                <Input
                  type="number"
                  min="0"
                  max="4"
                  value={overrides.removeRootFilling}
                  onChange={(e) => setOverrides(prev => ({ ...prev, removeRootFilling: parseInt(e.target.value) || 0 }))}
                  className="h-6 w-12 text-xs"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Label className="text-xs">Additional Irrigation:</Label>
                <Input
                  type="number"
                  min="0"
                  max="4"
                  value={overrides.additionalIrrigation}
                  onChange={(e) => setOverrides(prev => ({ ...prev, additionalIrrigation: parseInt(e.target.value) || 0 }))}
                  className="h-6 w-12 text-xs"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Label className="text-xs">Apicectomy Roots:</Label>
                <Input
                  type="number"
                  min="0"
                  max="2"
                  value={overrides.apicectomyRoots}
                  onChange={(e) => setOverrides(prev => ({ ...prev, apicectomyRoots: parseInt(e.target.value) || 0 }))}
                  className="h-6 w-12 text-xs"
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Arrow buttons */}
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
