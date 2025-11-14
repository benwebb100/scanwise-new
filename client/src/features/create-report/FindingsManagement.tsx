import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { PricingInput } from '@/components/PricingInput';
import { TreatmentDetailsInput } from '@/components/TreatmentDetailsInput';
import { TreatmentService } from '@/lib/treatment-service';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Edit3, ArrowRight, Loader2, Plus } from 'lucide-react';
import { CreateCustomTreatmentDialog } from '@/components/CreateCustomTreatmentDialog';
import { 
  getToothOptions, 
  getReplacementOptions, 
  getSuggestedTreatments,
  getSmartTreatmentSuggestion, 
  ToothNumberingSystem,
  ALL_CONDITIONS,
  ALL_TREATMENTS
} from '@/data/dental-data';
import { useDentalData } from '@/hooks/useDentalData';
import { useTranslation } from '@/contexts/TranslationContext';

export interface Finding {
  tooth: string;
  condition: string;
  treatment: string;
  replacement: string;
  price: number | undefined;
  duration: number | undefined; // Treatment duration in minutes
}

interface FindingsManagementProps {
  findings: Finding[];
  onFindingsChange: (findings: Finding[]) => void;
  toothNumberingSystem: ToothNumberingSystem; // Changed from string to ToothNumberingSystem
  showTreatmentPricing: boolean; // Renamed to showTreatmentDetails but keeping compatibility
  onShowPricingChange: (show: boolean) => void; // Renamed to onShowDetailsChange but keeping compatibility
  isProcessing?: boolean;
  onPriceSave: (treatment: string, price: number) => void;
  onDurationSave?: (treatment: string, duration: number) => void;
  getPrice: (treatment: string) => number;
  getDuration?: (treatment: string) => number;
//   onNextStep: () => void;
  onNextStep: (e?: React.FormEvent) => void | Promise<void>; // Updated signature
  onContinueEditingStages: () => void;
  onGenerateFromSavedStages: () => void;
  currentTreatmentStages: any[];
  patientName: string;
  onPatientNameChange: (value: string) => void;
  patientNameError: boolean;
  patientNameRef: React.RefObject<HTMLInputElement>;
  findingsErrors?: number[];
}

export const FindingsManagement = ({
  findings,
  onFindingsChange,
  toothNumberingSystem,
  showTreatmentPricing,
  onShowPricingChange,
  isProcessing = false,
  onPriceSave,
  onDurationSave,
  getPrice,
  getDuration,
  onNextStep,
  onContinueEditingStages,
  onGenerateFromSavedStages,
  currentTreatmentStages,
  patientName,
  onPatientNameChange,
  patientNameError,
  patientNameRef,
  findingsErrors = []
}: FindingsManagementProps) => {
  const { t } = useTranslation();
  const { treatments: databaseTreatments, isLoading: treatmentsLoading, reload: reloadDentalData } = useDentalData();
  
  // State for custom treatment dialog
  const [showCustomTreatmentDialog, setShowCustomTreatmentDialog] = useState(false);
  const [pendingCustomTreatmentIndex, setPendingCustomTreatmentIndex] = useState<number | null>(null);
  
  // Provide a default getDuration function if not provided
  const getDurationWithFallback = getDuration || ((treatment: string) => {
    return TreatmentService.getDefaultDuration(treatment) || 30;
  });

  // Handle custom treatment creation
  const handleCustomTreatmentCreated = async (treatmentId: string) => {
    console.log('✅ Custom treatment created:', treatmentId);
    
    // Reload dental data to include the new custom treatment
    await reloadDentalData();
    
    // If we have a pending finding index, update it with the new treatment
    if (pendingCustomTreatmentIndex !== null) {
      const updated = [...findings];
      updated[pendingCustomTreatmentIndex].treatment = treatmentId;
      onFindingsChange(updated);
      setPendingCustomTreatmentIndex(null);
    }
    
    setShowCustomTreatmentDialog(false);
  };

  const handleFindingChange = (idx: number, field: string, value: string | number) => {
    // Special handling for "Add Custom Treatment" option
    if (field === 'treatment' && value === 'ADD_CUSTOM_TREATMENT') {
      setPendingCustomTreatmentIndex(idx);
      setShowCustomTreatmentDialog(true);
      return; // Don't update the finding yet
    }
    
    const updated = [...findings];
    updated[idx] = { ...updated[idx], [field]: value };
    
    // Auto-suggest treatments when condition changes
    if (field === 'condition' && typeof value === 'string' && value !== '') {
      // Always auto-map treatment when condition changes
      // Extract tooth number from finding for tooth-specific mapping
      const toothNumber = updated[idx].tooth ? parseInt(updated[idx].tooth) : undefined;
      const recommendedTreatment = getSmartTreatmentSuggestion(value, toothNumber);
      
      if (recommendedTreatment) {
        updated[idx].treatment = recommendedTreatment;
        
        const price = getPrice(recommendedTreatment);
        if (price) {
          updated[idx].price = price;
        }
        
        const duration = getDurationWithFallback(recommendedTreatment);
        if (duration) {
          updated[idx].duration = duration;
        }
      }
    }
    
    // Also auto-map treatment when tooth changes (if condition is already set)
    if (field === 'tooth' && typeof value === 'string' && value !== '' && updated[idx].condition) {
      const toothNumber = parseInt(value);
      const recommendedTreatment = getSmartTreatmentSuggestion(updated[idx].condition, toothNumber);
      
      if (recommendedTreatment && recommendedTreatment !== updated[idx].treatment) {
        updated[idx].treatment = recommendedTreatment;
        
        const price = getPrice(recommendedTreatment);
        if (price) {
          updated[idx].price = price;
        }
        
        const duration = getDurationWithFallback(recommendedTreatment);
        if (duration) {
          updated[idx].duration = duration;
        }
      }
    }
    
    // Auto-fill price and duration when treatment changes
    if (field === 'treatment' && typeof value === 'string' && value !== '') {
      const price = getPrice(value);
      if (price) {
        updated[idx].price = price;
      }
      
      const duration = getDurationWithFallback(value);
      if (duration) {
        updated[idx].duration = duration;
      }
    }
    
    onFindingsChange(updated);
  };

  const addFinding = () => {
    onFindingsChange([
      { tooth: "", condition: "", treatment: "", replacement: "", price: undefined, duration: undefined },
      ...findings
    ]);
  };

  const removeFinding = (idx: number) => {
    if (findings.length > 1) {
      onFindingsChange(findings.filter((_, i) => i !== idx));
    }
  };

  return (
    <Card className={`${patientNameError ? 'border-2 border-yellow-400 shadow-lg' : ''}`}>
      <CardContent className="pt-6">
        {/* Patient Name Section */}
        <div className="mb-6">
          <Label htmlFor="patient-name" className="block font-medium text-blue-900 mb-2 text-base">
            Patient Name *
          </Label>
          {patientNameError && (
            <div className="mb-3 p-3 bg-yellow-50 border border-yellow-300 rounded-md">
              <p className="text-sm text-yellow-800 font-medium">
                ⚠️ Patient name is required to continue
              </p>
            </div>
          )}
          <Input
            ref={patientNameRef}
            id="patient-name"
            value={patientName}
            onChange={(e) => onPatientNameChange(e.target.value)}
            placeholder="Enter patient name"
            required
            disabled={isProcessing}
            className={patientNameError ? 'border-yellow-400 focus:border-yellow-500 focus:ring-yellow-500' : ''}
          />
        </div>

        {/* Manual Findings Entry Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="font-medium text-blue-900">Manual Findings Entry</span>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="show-details" className="text-sm font-medium text-gray-700">
                Show Treatment Info
              </Label>
              <Switch
                id="show-details"
                checked={showTreatmentPricing}
                onCheckedChange={onShowPricingChange}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
            <Button type="button" variant="outline" onClick={addFinding} size="sm" disabled={isProcessing}>
              + Add Finding
            </Button>
          </div>
        </div>
        
        <div id="findings-list" className="space-y-4">
        {findings.map((f, idx) => {
          const hasError = findingsErrors.includes(idx);
          return (
          <Card 
            key={idx} 
            id={`finding-${idx}`} 
            data-finding-index={idx}
            className={`p-4 finding-card relative ${hasError ? 'border-2 border-yellow-400 bg-yellow-50/30' : ''}`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Tooth Number */}
              <div className="space-y-2">
                <div className="flex items-center space-x-1">
                  <Label className="text-sm font-medium">Tooth ({toothNumberingSystem === 'Universal' ? 'US' : toothNumberingSystem})</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>You can change between FDI or Universal in settings.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <SearchableSelect
                  options={getToothOptions(toothNumberingSystem)}
                  value={f.tooth}
                  onValueChange={(value) => handleFindingChange(idx, "tooth", value)}
                  placeholder="Select tooth"
                  searchPlaceholder="Search tooth number..."
                  disabled={isProcessing}
                />
              </div>

              {/* Condition */}
              <div className="space-y-2 lg:col-span-2">
                <Label className="text-sm font-medium">Condition</Label>
                <SearchableSelect
                  options={ALL_CONDITIONS}
                  value={f.condition}
                  onValueChange={(value) => handleFindingChange(idx, "condition", value)}
                  placeholder="Select condition"
                  searchPlaceholder="Search conditions..."
                  disabled={isProcessing}
                />
              </div>

              {/* Treatment */}
              <div className="space-y-2 lg:col-span-2">
                <Label className="text-sm font-medium">Treatment</Label>
                <SearchableSelect
                  options={(() => {
                    const allOptions = treatmentsLoading ? ALL_TREATMENTS : databaseTreatments;
                    
                    // ✅ ALWAYS add "Add Custom Treatment" option at the very top
                    const customOption = {
                      value: 'ADD_CUSTOM_TREATMENT',
                      label: '+ Add Custom Treatment',
                      category: 'custom',
                      pinned: true,
                      className: 'text-gray-600 font-medium' // Slightly lighter gray
                    };
                    
                    // ✅ If condition is selected, show suggested treatments at the top (after custom option)
                    if (f.condition) {
                      const suggested = getSuggestedTreatments(f.condition);
                      if (suggested.length > 0) {
                        // Mark suggested treatments as pinned (shown at top)
                        const suggestedValues = suggested.map(s => s.value);
                        const optionsWithSuggestions = allOptions.map(option => ({
                          ...option,
                          pinned: suggestedValues.includes(option.value)
                        }));
                        return [customOption, ...optionsWithSuggestions];
                      }
                    }
                    
                    return [customOption, ...allOptions];
                  })()}
                  value={f.treatment}
                  onValueChange={(value) => handleFindingChange(idx, "treatment", value)}
                  placeholder={treatmentsLoading ? "Loading treatments..." : "Select treatment"}
                  searchPlaceholder="Search treatments..."
                  disabled={isProcessing || treatmentsLoading}
                />
              </div>

              {/* Replacement Field - Only show when extraction is selected */}
              {f.treatment === 'extraction' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Replacement</Label>
                  <SearchableSelect
                    options={getReplacementOptions(f.tooth)}
                    value={f.replacement || ''}
                    onValueChange={(value) => handleFindingChange(idx, "replacement", value)}
                    placeholder="Select replacement..."
                    searchPlaceholder="Search replacements..."
                    disabled={isProcessing}
                  />
                </div>
              )}

              {/* Remove Button */}
              <div className="space-y-2">
                <Label className="text-sm font-medium opacity-0">Actions</Label>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeFinding(idx)}
                  disabled={findings.length === 1 || isProcessing}
                  className="w-full"
                >
                  Remove
                </Button>
              </div>
            </div>

            {/* Treatment Details (Price & Duration) */}
            {f.treatment && showTreatmentPricing && (
              <div className="mt-4 pt-4 border-t">
                <Label className="text-sm font-semibold mb-3 block text-gray-900">Treatment Details</Label>
                <TreatmentDetailsInput
                  treatment={f.treatment}
                  priceValue={f.price}
                  durationValue={f.duration}
                  onPriceChange={(price) => handleFindingChange(idx, "price", price)}
                  onDurationChange={(duration) => handleFindingChange(idx, "duration", duration)}
                  onPriceSave={onPriceSave}
                  onDurationSave={onDurationSave}
                  disabled={isProcessing}
                />
              </div>
            )}
          </Card>
          );
        })}
      </div>

      {/* Submit Buttons */}
      <div className="flex flex-col items-center gap-3 mt-8">
        {currentTreatmentStages.length > 0 && !isProcessing && (
          <Button 
            type="button"
            variant="outline"
            size="lg"
            onClick={onContinueEditingStages}
            className="text-lg px-8 py-4"
          >
            <Edit3 className="mr-2 h-5 w-5" />
            Continue Editing Stages
          </Button>
        )}

        <Button 
          size="lg"
          type="button"
          disabled={isProcessing}
          onClick={currentTreatmentStages.length > 0 ? onGenerateFromSavedStages : onNextStep}
          className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-lg px-8 py-4"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <ArrowRight className="mr-2 h-5 w-5" />
              {currentTreatmentStages.length > 0 ? 'Confirm and Generate Report' : 'Next Step'}
            </>
          )}
        </Button>
      </div>
      </CardContent>
      
      {/* Custom Treatment Dialog */}
      <CreateCustomTreatmentDialog
        isOpen={showCustomTreatmentDialog}
        onClose={() => {
          setShowCustomTreatmentDialog(false);
          setPendingCustomTreatmentIndex(null);
        }}
        onTreatmentCreated={handleCustomTreatmentCreated}
      />
    </Card>
  );
};

// Helper function (export if needed elsewhere)
export const getSuggestedTreatments = (condition: string) => {
  const treatmentMap: Record<string, Array<{value: string, label: string}>> = {
    'cavity': [
      {value: 'filling', label: 'Filling'},
      {value: 'root-canal-treatment', label: 'Root Canal Treatment'},
    ],
    'missing-tooth': [
      {value: 'implant-placement', label: 'Implant Placement'},
      {value: 'bridge', label: 'Bridge'},
    ],
    // Add more mappings
  };
  return treatmentMap[condition] || [];
};