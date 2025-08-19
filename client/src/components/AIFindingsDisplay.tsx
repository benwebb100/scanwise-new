import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Brain, Eye, EyeOff, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIDetection {
  class: string
  class_name?: string
  confidence: number
  x?: number
  y?: number
  width?: number
  height?: number
}

interface AIFindingsDisplayProps {
  detections: AIDetection[]
  annotatedImageUrl?: string
  isVisible: boolean
  onToggleVisibility: () => void
  onAcceptFinding?: (detection: AIDetection) => void
  onRejectFinding?: (detection: AIDetection) => void
  className?: string
}

export function AIFindingsDisplay({
  detections,
  annotatedImageUrl,
  isVisible,
  onToggleVisibility,
  onAcceptFinding,
  onRejectFinding,
  className
}: AIFindingsDisplayProps) {
  // Helper functions for confidence levels
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.75) return 'bg-green-500'
    if (confidence >= 0.50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.75) return 'High'
    if (confidence >= 0.50) return 'Medium'
    return 'Low'
  }

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.75) return <CheckCircle className="h-4 w-4" />
    if (confidence >= 0.50) return <AlertTriangle className="h-4 w-4" />
    return <XCircle className="h-4 w-4" />
  }

  if (!detections || detections.length === 0) {
    return null
  }

  return (
    <Card className={cn("mb-6 border-blue-200", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <span>AI Analysis Results</span>
            <Badge variant="secondary" className="ml-2">
              {detections.length} findings
            </Badge>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleVisibility}
            className="flex items-center space-x-2"
          >
            {isVisible ? (
              <>
                <EyeOff className="h-4 w-4" />
                <span>Hide</span>
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                <span>Show</span>
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>

      {isVisible && (
        <CardContent className="space-y-4">
          {/* Annotated Image */}
          {annotatedImageUrl && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Annotated X-Ray</h4>
              <div className="relative">
                <img
                  src={annotatedImageUrl}
                  alt="AI Annotated X-ray"
                  className="w-full max-w-2xl mx-auto rounded-lg border shadow-sm"
                />
                <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                  AI Analysis
                </div>
              </div>
            </div>
          )}

          {/* Detection Results */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Detected Conditions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {detections.map((detection, index) => {
                const confidence = detection.confidence || 0
                const confidencePercent = Math.round(confidence * 100)
                const conditionName = detection.class_name || detection.class || 'Unknown'

                return (
                  <div
                    key={index}
                    className="bg-white border rounded-lg p-3 space-y-2 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-900">
                        {conditionName}
                      </span>
                      <div className="flex items-center space-x-1">
                        {getConfidenceIcon(confidence)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className={cn(
                            "w-3 h-3 rounded-full",
                            getConfidenceColor(confidence)
                          )}
                        />
                        <span className="text-xs text-gray-600">
                          {getConfidenceLabel(confidence)}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          confidence >= 0.75 && "border-green-500 text-green-700",
                          confidence >= 0.50 && confidence < 0.75 && "border-yellow-500 text-yellow-700",
                          confidence < 0.50 && "border-red-500 text-red-700"
                        )}
                      >
                        {confidencePercent}%
                      </Badge>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={cn(
                          "h-2 rounded-full transition-all duration-300",
                          getConfidenceColor(confidence)
                        )}
                        style={{ width: `${confidencePercent}%` }}
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex space-x-2 pt-2">
                      {onAcceptFinding && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onAcceptFinding(detection)}
                          className="flex-1 text-xs hover:bg-green-50 hover:border-green-300 hover:text-green-700"
                        >
                          <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                          Accept & Add
                        </Button>
                      )}
                      {onRejectFinding && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRejectFinding(detection)}
                          className="flex-1 text-xs hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                        >
                          <XCircle className="h-3 w-3 mr-1 text-red-600" />
                          Reject
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Confidence Scale Legend */}
          <div className="border-t pt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Confidence Scale</h5>
            <div className="flex space-x-6 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span>High (75-100%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span>Medium (50-75%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span>Low (Below 50%)</span>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>AI Summary:</strong> {detections.length} condition{detections.length !== 1 ? 's' : ''} detected. 
              Review the findings above and add them to your dental findings table as needed.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}