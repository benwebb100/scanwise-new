import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, AlertTriangle, CheckCircle, Clock, Info, ChevronDown, ChevronUp, X, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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

export const AIAnalysisSection: React.FC<AIAnalysisSectionProps> = ({
  findingsSummary,
  detections,
  annotatedImageUrl,
  onAcceptFinding,
  onRejectFinding
}) => {
  const [isOpen, setIsOpen] = useState(true);
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

  const handleAcceptDetection = (detection: Detection, index: number) => {
    onAcceptFinding?.(detection);
  };

  const handleRejectDetection = (detection: Detection, index: number) => {
    setRejectedDetections(prev => new Set([...prev, index]));
    onRejectFinding?.(detection);
  };

  // Filter out rejected detections
  const visibleDetections = detections.filter((_, index) => !rejectedDetections.has(index));

  return (
    <TooltipProvider>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border-blue-200 bg-blue-50">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-blue-100 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-blue-900">
                  <Brain className="mr-2 h-5 w-5" />
                  AI Analysis Results
                  <Badge variant="outline" className="ml-3 bg-white">
                    {visibleDetections.length} detections
                  </Badge>
                </CardTitle>
                <div className="flex items-center space-x-2">
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
              {/* Overall Summary */}
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-semibold text-gray-900 mb-2">Overall Assessment</h4>
                <p className="text-gray-700">{findingsSummary.overall_summary}</p>
              </div>

              {/* Key Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded-lg border text-center">
                  <div className="text-2xl font-bold text-blue-600">{visibleDetections.length}</div>
                  <div className="text-sm text-gray-600">Active Detections</div>
                </div>
                <div className="bg-white p-3 rounded-lg border text-center">
                  <div className="text-2xl font-bold text-green-600">{findingsSummary.high_confidence_count}</div>
                  <div className="text-sm text-gray-600">High Confidence</div>
                </div>
                <div className="bg-white p-3 rounded-lg border text-center">
                  <div className="text-2xl font-bold text-orange-600">{findingsSummary.areas_needing_attention.length}</div>
                  <div className="text-sm text-gray-600">Areas of Concern</div>
                </div>
              </div>

              {/* Detected Conditions with Accept/Reject */}
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-semibold text-gray-900 mb-3">Detected Conditions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {visibleDetections.map((detection, index) => {
                    const originalIndex = detections.indexOf(detection);
                    const confidence = detection.confidence || 0;
                    const confidencePercent = Math.round(confidence * 100);
                    const color = getConfidenceColor(confidence);
                    const label = getConfidenceLabel(confidence);
                    
                    return (
                      <div key={originalIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-800">
                              {detection.class || detection.class_name || 'Unknown'}
                            </span>
                            <Badge 
                              style={{ 
                                backgroundColor: color,
                                color: 'white'
                              }}
                            >
                              {confidencePercent}%
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-600">
                            Confidence: <span style={{ color }} className="font-medium">{label}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1 ml-3">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0 bg-green-50 hover:bg-green-100 border-green-200"
                                onClick={() => handleAcceptDetection(detection, originalIndex)}
                              >
                                <Check className="h-3 w-3 text-green-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Accept and add to findings</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0 bg-red-50 hover:bg-red-100 border-red-200"
                                onClick={() => handleRejectDetection(detection, originalIndex)}
                              >
                                <X className="h-3 w-3 text-red-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Reject this detection</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Confidence Scale Legend */}
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-2">Confidence Scale:</p>
                  <div className="flex gap-4 justify-center flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: '#4CAF50' }} />
                      <span className="text-xs">High (75-100%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FFC107' }} />
                      <span className="text-xs">Medium (50-75%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F44336' }} />
                      <span className="text-xs">Low (Below 50%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Clinical Findings */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Clinical Assessment</h4>
                {findingsSummary.detailed_findings.map((finding, index) => (
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

              {/* Annotated X-Ray - Single Instance */}
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-semibold text-gray-900 mb-3">Annotated X-ray Analysis</h4>
                <div className="text-center">
                  <img 
                    src={annotatedImageUrl} 
                    alt="AI Annotated X-ray" 
                    className="w-full max-w-3xl mx-auto rounded-lg shadow-sm border"
                  />
                  <p className="text-sm text-gray-600 mt-3">
                    Colored annotations indicate AI-detected conditions with their confidence levels
                  </p>
                </div>
              </div>

              {/* Areas Needing Attention */}
              {findingsSummary.areas_needing_attention.length > 0 && (
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-900 mb-2 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Priority Areas for Review
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    {findingsSummary.areas_needing_attention.map((area, index) => (
                      <li key={index} className="text-orange-800 text-sm">{area}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </TooltipProvider>
  );
};