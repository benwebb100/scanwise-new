import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, AlertTriangle, CheckCircle, Clock, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DetailedFinding {
  condition: string;
  description: string;
  affected_areas: string;
  clinical_significance: string;
  recommended_action: string;
  confidence_note: string;
  urgency: 'low' | 'medium' | 'high';
}

interface AIFindingsSummaryProps {
  findingsSummary: {
    overall_summary: string;
    detailed_findings: DetailedFinding[];
    total_detections: number;
    high_confidence_count: number;
    areas_needing_attention: string[];
  };
  detections: Array<{
    class: string;
    confidence: number;
  }>;
  annotatedImageUrl: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export const AIFindingsSummary: React.FC<AIFindingsSummaryProps> = ({
  findingsSummary,
  detections,
  annotatedImageUrl,
  isVisible,
  onToggleVisibility
}) => {
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

  if (!isVisible) return null;

  // Safety check for findingsSummary
  if (!findingsSummary || !findingsSummary.detailed_findings || !Array.isArray(findingsSummary.detailed_findings)) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-900">
            <Brain className="mr-2 h-5 w-5" />
            AI Analysis Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Clinical analysis data is not available for this image.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-blue-900">
              <Brain className="mr-2 h-5 w-5" />
              AI Analysis Summary
            </CardTitle>
            <Badge variant="outline" className="bg-white">
              {findingsSummary.total_detections || 0} detections found
            </Badge>
          </div>
          <CardDescription>
            Review these AI-detected findings to help complete your dental assessment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Summary */}
          {findingsSummary.overall_summary && (
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold text-gray-900 mb-2">Overall Assessment</h4>
              <p className="text-gray-700">{findingsSummary.overall_summary}</p>
            </div>
          )}

          {/* Key Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded-lg border text-center">
              <div className="text-2xl font-bold text-blue-600">{findingsSummary.total_detections || 0}</div>
              <div className="text-sm text-gray-600">Total Detections</div>
            </div>
            <div className="bg-white p-3 rounded-lg border text-center">
              <div className="text-2xl font-bold text-green-600">{findingsSummary.high_confidence_count || 0}</div>
              <div className="text-sm text-gray-600">High Confidence</div>
            </div>
            <div className="bg-white p-3 rounded-lg border text-center">
              <div className="text-2xl font-bold text-orange-600">{findingsSummary.areas_needing_attention?.length || 0}</div>
              <div className="text-sm text-gray-600">Areas of Concern</div>
            </div>
          </div>

          {/* Detailed Findings */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Detailed Findings</h4>
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
                    
                    {/* Confidence Score Tooltip */}
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center space-x-1 cursor-help">
                          <Info className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-500">Confidence</span>
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

          {/* Confidence Scores for Raw Detections */}
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-semibold text-gray-900 mb-3">Detection Confidence Scores</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {detections.map((detection, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium text-gray-700">
                    {detection.class}
                  </span>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge 
                        style={{ 
                          backgroundColor: getConfidenceColor(detection.confidence),
                          color: 'white'
                        }}
                      >
                        {Math.round(detection.confidence * 100)}%
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>AI confidence: {(detection.confidence * 100).toFixed(1)}%</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </div>
          </div>

          {/* Annotated Image */}
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-semibold text-gray-900 mb-3">Annotated X-ray</h4>
            <img 
              src={annotatedImageUrl} 
              alt="AI Annotated X-ray" 
              className="w-full max-w-2xl mx-auto rounded-lg shadow-sm"
            />
            <p className="text-sm text-gray-600 text-center mt-2">
              Colored annotations indicate AI-detected conditions
            </p>
          </div>

          {/* Areas Needing Attention */}
          {findingsSummary.areas_needing_attention && findingsSummary.areas_needing_attention.length > 0 && (
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h4 className="font-semibold text-orange-900 mb-2 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Areas Requiring Special Attention
              </h4>
              <ul className="list-disc list-inside space-y-1">
                {findingsSummary.areas_needing_attention.map((area, index) => (
                  <li key={index} className="text-orange-800 text-sm">{area}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};