import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, AlertTriangle, CheckCircle, Clock, Info, ChevronDown, ChevronUp, Check, Eye, EyeOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface DetailedFinding {
  condition: string;
  description: string;
  affected_areas: string;
  clinical_significance: string;
  recommended_action: string;
  confidence_note: string;
  urgency: 'low' | 'medium' | 'high';
}

interface Detection {
  class: string;
  class_name?: string;
  confidence: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rejected?: boolean;
}

interface AIAnalysisSectionProps {
  findingsSummary: {
    overall_summary: string;
    detailed_findings: DetailedFinding[];
    total_detections: number;
    high_confidence_count: number;
    areas_needing_attention: string[];
  };
  detections: Detection[];
  annotatedImageUrl: string;
  onAcceptFinding?: (detection: Detection) => void;
  onRejectFinding?: (detection: Detection) => void;
}

// Define active conditions vs existing dental work
const ACTIVE_CONDITIONS = [
  'bone-level', 'caries', 'fracture', 'impacted-tooth', 
  'missing-teeth-no-distal', 'missing-tooth-between', 
  'periapical-lesion', 'root-piece', 'tissue-level',
  'root-fracture', 'crown-fracture', 'tooth-wear', 'attrition',
  'missing-tooth', 'abrasion', 'hypoplasia'
];

const EXISTING_DENTAL_WORK = [
  'filling', 'crown', 'bridge', 'root-canal', 'post', 'implant',
  'existing-large-filling', 'implant-placement', 'composite-build-up',
  'partial-denture', 'complete-denture', 'inlay', 'onlay', 'whitening',
  'bonding', 'sealant'
];

export const AIAnalysisSection: React.FC<AIAnalysisSectionProps> = ({
  findingsSummary,
  detections,
  annotatedImageUrl,
  onAcceptFinding,
  onRejectFinding
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [showExistingWork, setShowExistingWork] = useState(false);
  const [showClinicalAssessment, setShowClinicalAssessment] = useState(false);
  const [rejectedDetections, setRejectedDetections] = useState<Set<number>>(new Set());

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Clock className="w-4 h-4" />;
      case 'low': return <CheckCircle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.75) return '#4CAF50';
    if (confidence >= 0.50) return '#FFC107';
    return '#F44336';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.75) return 'High';
    if (confidence >= 0.50) return 'Medium';
    return 'Low';
  };

  // Color mapping for conditions
  const getConditionColor = (condition: string) => {
    const colorMap: { [key: string]: string } = {
      'bone-level': '#6C4A35',
      'caries': '#58eec3',
      'crown': '#FF00D4',
      'filling': '#FF004D',
      'fracture': '#FF69F8',
      'impacted-tooth': '#FFD700',
      'implant': '#00FF5A',
      'missing-teeth-no-distal': '#4FE2E2',
      'missing-tooth-between': '#8c28fe',
      'periapical-lesion': '#007BFF',
      'post': '#00FFD5',
      'root-piece': '#fe4eed',
      'root-canal-treatment': '#FF004D',
      'tissue-level': '#A2925D'
    };
    
    // Normalize condition name to handle different formats
    const normalizedCondition = condition
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/s$/, '')  // Remove plural 's'
      .replace(/^carie$/, 'caries'); // Special case: restore 'caries' from 'carie'
    
    return colorMap[normalizedCondition] || '#666666';
  };

  // Format condition name for display
  const formatConditionName = (condition: string) => {
    return condition
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const [addedDetections, setAddedDetections] = useState<Set<number>>(new Set());

  const handleAddFinding = (detection: Detection, index: number) => {
    // Add to findings
    onAcceptFinding?.(detection);
    
    // Mark as added
    setAddedDetections(prev => new Set([...prev, index]));
  };

  // Normalize condition name for comparison
  const normalizeConditionName = (condition: string) => {
    return condition
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/s$/, '')  // Remove plural 's'
      .replace(/^carie$/, 'caries'); // Special case: restore 'caries' from 'carie'
  };

  // Filter out rejected detections and separate by type
  const visibleDetections = detections.filter((_, index) => !rejectedDetections.has(index));
  
  const activeConditions = visibleDetections.filter(detection => 
    ACTIVE_CONDITIONS.includes(normalizeConditionName(detection.class))
  );
  
  const existingWork = visibleDetections.filter(detection => 
    EXISTING_DENTAL_WORK.includes(normalizeConditionName(detection.class))
  );

  const activeCount = activeConditions.length;
  const existingCount = existingWork.length;

  return (
    <TooltipProvider>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border-gray-200 bg-white">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-blue-100 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-blue-900">
                  <Brain className="mr-2 h-5 w-5" />
                  AI Analysis Results
                  <Badge variant="outline" className="ml-3 bg-white">
                    {activeCount} active, {existingCount} existing
                  </Badge>
                </CardTitle>
                <div className="flex items-center space-x-4">
                  <Badge className="bg-green-600 text-white">
                    {findingsSummary.high_confidence_count} high confidence
                  </Badge>
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
              <CardDescription>
                Review AI-detected findings to assist with your clinical assessment
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="space-y-6">

              {/* Annotated X-Ray - Moved to top */}
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-center mb-4">
                  <h4 className="font-bold text-gray-900 text-xl mb-2">Annotated X-Ray Image</h4>
                  <p className="text-gray-600 mb-3">Below is your panoramic X-ray with AI-generated highlights of all detected conditions.</p>
                  <div className="w-1/3 h-0.5 bg-blue-500 mx-auto"></div>
                </div>
                <div className="text-center">
                  <img 
                    src={annotatedImageUrl} 
                    alt="AI Annotated X-ray" 
                    className="w-full max-w-3xl mx-auto rounded-lg shadow-sm border"
                  />
                  
                  {/* Dynamic Legend */}
                  {(() => {
                    // Get unique conditions from all detections (active + existing)
                    const allDetections = [...activeConditions, ...existingWork];
                    const uniqueConditions = Array.from(
                      new Set(allDetections.map(d => normalizeConditionName(d.class)))
                    );

                    if (uniqueConditions.length > 0) {
                      return (
                        <div className="mt-4">
                          <div className="flex flex-wrap gap-3 justify-center">
                            {uniqueConditions.map((condition, index) => (
                              <div key={index} className="flex items-center space-x-3">
                                <div 
                                  className="w-6 h-6 rounded border border-gray-300"
                                  style={{ backgroundColor: getConditionColor(condition) }}
                                />
                                <span className="text-base text-gray-700 font-medium">
                                  {formatConditionName(condition)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* Active Conditions Section */}
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
                    Active Conditions
                  </h4>
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    {activeCount} detected
                  </Badge>
                </div>
                
                {activeConditions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeConditions.map((detection, index) => {
                      const originalIndex = detections.indexOf(detection);
                      const confidence = detection.confidence || 0;
                      const confidencePercent = Math.round(confidence * 100);
                      const color = getConfidenceColor(confidence);
                      const label = getConfidenceLabel(confidence);
                      
                      return (
                        <div key={originalIndex} className={`bg-white rounded-lg border shadow-sm ${
                          confidence >= 0.75 
                            ? 'border-l-4 border-l-green-500' 
                            : confidence >= 0.50 
                            ? 'border-l-4 border-l-yellow-500' 
                            : 'border-l-4 border-l-red-500'
                        }`}>
                          <div className="px-4 py-3">
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900 text-lg">
                                  {detection.class || detection.class_name || 'Unknown'}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  <span>Confidence: </span>
                                  <span className={`font-medium ${
                                    confidence >= 0.75 
                                      ? 'text-green-600' 
                                      : confidence >= 0.50 
                                      ? 'text-yellow-600' 
                                      : 'text-red-600'
                                  }`}>{label}</span>
                                </div>
                              </div>
                              
                              {/* Right side: Confidence badge and Add Finding button */}
                              <div className="flex flex-col items-end space-y-2">
                                <div className={`px-3 py-1 rounded-full text-sm font-medium text-white ${
                                  confidence >= 0.75 
                                    ? 'bg-green-500' 
                                    : confidence >= 0.50 
                                    ? 'bg-yellow-500' 
                                    : 'bg-red-500'
                                }`}>
                                  {confidencePercent}%
                                </div>
                                
                                {/* Add Finding Button */}
                                {addedDetections.has(originalIndex) ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled
                                    className="bg-blue-100 border-blue-300 text-blue-700"
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    Added
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-700 hover:text-gray-800"
                                    onClick={() => handleAddFinding(detection, originalIndex)}
                                  >
                                    Add Finding
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No active conditions detected
                  </div>
                )}
              </div>

              {/* Toggle Controls - Moved below Active Conditions */}
              <div className="space-y-3 mt-6">
                {/* Toggle for Existing Work */}
                <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="show-existing" className="text-sm font-medium">
                      Show existing dental work
                    </Label>
                    <Switch
                      id="show-existing"
                      checked={showExistingWork}
                      onCheckedChange={setShowExistingWork}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    {showExistingWork ? (
                      <>
                        <Eye className="h-4 w-4" />
                        <span>Showing existing work</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4" />
                        <span>Hidden</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Toggle for Clinical Assessment */}
                <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="show-clinical" className="text-sm font-medium">
                      Show AI clinical assessment
                    </Label>
                    <Switch
                      id="show-clinical"
                      checked={showClinicalAssessment}
                      onCheckedChange={setShowClinicalAssessment}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    {showClinicalAssessment ? (
                      <>
                        <Eye className="h-4 w-4" />
                        <span>Showing clinical assessment</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4" />
                        <span>Hidden</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Existing Dental Work Section */}
              {showExistingWork && (
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                      Existing Dental Work
                    </h4>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {existingCount} detected
                    </Badge>
                  </div>
                  
                  {existingWork.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {existingWork.map((detection, index) => {
                        const originalIndex = detections.indexOf(detection);
                        const confidence = detection.confidence || 0;
                        const confidencePercent = Math.round(confidence * 100);
                        const color = getConfidenceColor(confidence);
                        const label = getConfidenceLabel(confidence);
                        
                        return (
                          <div key={originalIndex} className={`bg-white rounded-lg border shadow-sm ${
                            confidence >= 0.75 
                              ? 'border-l-4 border-l-green-500' 
                              : confidence >= 0.50 
                              ? 'border-l-4 border-l-yellow-500' 
                              : 'border-l-4 border-l-red-500'
                          }`}>
                            <div className="px-4 py-3">
                              <div className="flex items-start justify-between mb-1">
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900 text-lg">
                                    {detection.class || detection.class_name || 'Unknown'}
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    <span>Confidence: </span>
                                    <span className={`font-medium ${
                                      confidence >= 0.75 
                                        ? 'text-green-600' 
                                        : confidence >= 0.50 
                                        ? 'text-yellow-600' 
                                        : 'text-red-600'
                                    }`}>{label}</span>
                                  </div>
                                </div>
                                
                                {/* Right side: Confidence badge and Add Finding button */}
                                <div className="flex flex-col items-end space-y-2">
                                  <div className={`px-3 py-1 rounded-full text-sm font-medium text-white ${
                                    confidence >= 0.75 
                                      ? 'bg-green-500' 
                                      : confidence >= 0.50 
                                      ? 'bg-yellow-500' 
                                      : 'bg-red-500'
                                  }`}>
                                    {confidencePercent}%
                                  </div>
                                  
                                  {/* Add Finding Button */}
                                  {addedDetections.has(originalIndex) ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled
                                      className="bg-green-100 border-green-300 text-green-700"
                                    >
                                      <Check className="h-3 w-3 mr-1" />
                                      Added
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="bg-green-50 hover:bg-green-100 border-green-300 text-green-700"
                                      onClick={() => handleAddFinding(detection, originalIndex)}
                                    >
                                      Add Finding
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      No existing dental work detected
                    </div>
                  )}
                </div>
              )}
                


              {/* Detailed Clinical Findings - Only for Active Conditions */}
              {showClinicalAssessment && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Clinical Assessment (Active Conditions Only)</h4>
                  {findingsSummary.detailed_findings
                    .filter(finding => {
                      // Only show clinical assessment for active conditions
                      const conditionLower = finding.condition.toLowerCase();
                      return ACTIVE_CONDITIONS.some(activeCondition => 
                        conditionLower.includes(activeCondition.replace('-', ' ')) ||
                        conditionLower.includes(activeCondition)
                      );
                    })
                    .map((finding, index) => (
                      <Card key={index} className="bg-white">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <h5 className="font-semibold text-gray-900">{finding.condition}</h5>
                              <Badge className={getUrgencyColor(finding.urgency)}>
                                {getUrgencyIcon(finding.urgency)}
                                <span className="ml-1 capitalize">{finding.urgency} Priority</span>
                              </Badge>
                            </div>
                            
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="flex items-center space-x-1 cursor-help">
                                  <Info className="w-4 h-4 text-gray-500" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-medium">{finding.confidence_note}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Description:</span>
                              <p className="text-gray-600 mt-1">{finding.description}</p>
                            </div>
                            
                            <div>
                              <span className="font-medium text-gray-700">Affected Areas:</span>
                              <p className="text-gray-600 mt-1">{finding.affected_areas}</p>
                            </div>
                            
                            <div>
                              <span className="font-medium text-gray-700">Clinical Significance:</span>
                              <p className="text-gray-600 mt-1">{finding.clinical_significance}</p>
                            </div>
                            
                            <div>
                              <span className="font-medium text-gray-700">Recommended Action:</span>
                              <p className="text-gray-600 mt-1">{finding.recommended_action}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}




            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </TooltipProvider>
  );
};