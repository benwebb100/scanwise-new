import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Download, X, Check } from 'lucide-react'
import { api } from '@/services/api'
import { TreatmentService } from '@/lib/treatment-service'
import { useToast } from '@/hooks/use-toast'

interface ExtractedTreatment {
  name: string
  price: number
  duration?: number
  insurance_code?: string
  category?: string
}

interface MatchedTreatment {
  clinic_name: string
  clinic_price: number
  clinic_duration?: number
  matched_code: string
  matched_name?: string
  confidence: number
  reasoning?: string
  requires_review: boolean
}

enum ImportStep {
  UPLOAD = 'upload',
  EXTRACTED = 'extracted',
  MATCHED = 'matched',
  REVIEW = 'review',
  COMPLETE = 'complete'
}

export function PriceListImport() {
  const { toast } = useToast()
  
  // State
  const [currentStep, setCurrentStep] = useState<ImportStep>(ImportStep.UPLOAD)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedTreatments, setExtractedTreatments] = useState<ExtractedTreatment[]>([])
  const [matchedTreatments, setMatchedTreatments] = useState<MatchedTreatment[]>([])
  const [statistics, setStatistics] = useState<any>(null)
  
  // File upload handler
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'image/jpeg',
        'image/png',
        'image/jpg'
      ]
      
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF, Excel, CSV, or Image file.",
          variant: "destructive"
        })
        return
      }
      
      setSelectedFile(file)
    }
  }
  
  // Step 1: Upload and extract
  const handleUpload = async () => {
    if (!selectedFile) return
    
    setIsProcessing(true)
    try {
      console.log('📤 Uploading price list...')
      
      const result = await api.importPricelist(selectedFile)
      setExtractedTreatments(result.data.extracted_treatments)
      setCurrentStep(ImportStep.EXTRACTED)
      
      toast({
        title: "Extraction Complete",
        description: `Found ${result.data.total_count} treatments in your price list.`,
      })
    } catch (error: any) {
      console.error('❌ Upload error:', error)
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to process price list. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }
  
  // Step 2: Match to master database
  const handleMatch = async () => {
    setIsProcessing(true)
    try {
      console.log('🔍 Matching treatments...')
      
      const result = await api.matchToMasterDatabase(extractedTreatments)
      setMatchedTreatments(result.matches)
      setStatistics(result.statistics)
      setCurrentStep(ImportStep.MATCHED)
      
      toast({
        title: "Matching Complete",
        description: `${result.statistics.auto_matched} auto-matched, ${result.statistics.needs_review} need review.`,
      })
    } catch (error: any) {
      console.error('❌ Match error:', error)
      toast({
        title: "Matching Failed",
        description: error.message || "Failed to match treatments. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }
  
  // Step 3: Review and confirm
  const handleReview = () => {
    setCurrentStep(ImportStep.REVIEW)
  }
  
  // Update a single match
  const updateMatch = (index: number, field: string, value: any) => {
    const updated = [...matchedTreatments]
    updated[index] = { ...updated[index], [field]: value }
    setMatchedTreatments(updated)
  }
  
  // Step 4: Bulk update
  const handleBulkUpdate = async () => {
    setIsProcessing(true)
    try {
      console.log('💾 Bulk updating treatments...')
      
      // Prepare mappings
      const mappings = matchedTreatments.map(match => ({
        clinic_name: match.clinic_name,
        clinic_price: match.clinic_price,
        clinic_duration: match.clinic_duration || null,
        matched_code: match.matched_code,
        action: match.matched_code === 'CUSTOM' ? 'create_custom' : 'update'
      }))
      
      const result = await api.bulkUpdateTreatmentPrices(mappings)
      setCurrentStep(ImportStep.COMPLETE)
      
      toast({
        title: "Import Complete!",
        description: `Updated ${result.updated_count} treatments, created ${result.custom_count} custom treatments.`,
      })
    } catch (error: any) {
      console.error('❌ Bulk update error:', error)
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update treatments. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }
  
  // Reset wizard
  const handleReset = () => {
    setCurrentStep(ImportStep.UPLOAD)
    setSelectedFile(null)
    setExtractedTreatments([])
    setMatchedTreatments([])
    setStatistics(null)
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import Price List
        </CardTitle>
        <p className="text-sm text-gray-600">
          Upload your clinic's price list (PDF, Excel, CSV, or Image) and we'll automatically match treatments to your database.
        </p>
      </CardHeader>
      
      <CardContent>
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {[
            { step: ImportStep.UPLOAD, label: '1. Upload', icon: Upload },
            { step: ImportStep.EXTRACTED, label: '2. Extract', icon: FileText },
            { step: ImportStep.MATCHED, label: '3. Match', icon: CheckCircle2 },
            { step: ImportStep.REVIEW, label: '4. Review', icon: AlertCircle },
            { step: ImportStep.COMPLETE, label: '5. Complete', icon: Check }
          ].map(({ step, label, icon: Icon }, index) => {
            const isActive = currentStep === step
            const isComplete = Object.values(ImportStep).indexOf(currentStep) > index
            
            return (
              <div key={step} className="flex flex-col items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2
                  ${isComplete ? 'bg-green-500 border-green-500 text-white' : 
                    isActive ? 'bg-blue-500 border-blue-500 text-white' : 
                    'bg-gray-100 border-gray-300 text-gray-400'}
                `}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs mt-1">{label}</span>
              </div>
            )
          })}
        </div>
        
        {/* Step Content */}
        {currentStep === ImportStep.UPLOAD && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">Upload Your Price List</h3>
              <p className="text-sm text-gray-600 mb-4">
                Supports PDF, Excel (.xlsx), CSV, or Image (JPG, PNG)
              </p>
              <input
                type="file"
                accept=".pdf,.xlsx,.xls,.csv,image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="price-list-upload"
              />
              <label htmlFor="price-list-upload">
                <Button type="button" asChild>
                  <span className="cursor-pointer">Choose File</span>
                </Button>
              </label>
              
              {selectedFile && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            
            {selectedFile && (
              <Button 
                onClick={handleUpload} 
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting Treatments...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Extract Treatments
                  </>
                )}
              </Button>
            )}
          </div>
        )}
        
        {currentStep === ImportStep.EXTRACTED && (
          <div className="space-y-4">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Found <strong>{extractedTreatments.length} treatments</strong> in your price list.
              </AlertDescription>
            </Alert>
            
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium">Treatment</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Price</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedTreatments.map((treatment, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2 text-sm">{treatment.name}</td>
                      <td className="px-4 py-2 text-sm">${treatment.price}</td>
                      <td className="px-4 py-2 text-sm">{treatment.duration || '—'} mins</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <Button onClick={handleMatch} disabled={isProcessing} className="w-full">
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Matching to Database...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Match to Master Database
                </>
              )}
            </Button>
          </div>
        )}
        
        {currentStep === ImportStep.MATCHED && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{statistics?.auto_matched || 0}</div>
                    <div className="text-xs text-gray-600">Auto-Matched</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{statistics?.needs_review || 0}</div>
                    <div className="text-xs text-gray-600">Needs Review</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <FileText className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{statistics?.custom || 0}</div>
                    <div className="text-xs text-gray-600">Custom</div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Button onClick={handleReview} className="w-full">
              <AlertCircle className="mr-2 h-4 w-4" />
              Review Matches
            </Button>
          </div>
        )}
        
        {currentStep === ImportStep.REVIEW && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Review all matches below. Yellow rows need your attention.
              </AlertDescription>
            </Alert>
            
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium">Clinic Name</th>
                    <th className="px-2 py-2 text-left text-xs font-medium">Price</th>
                    <th className="px-2 py-2 text-left text-xs font-medium">Matched To</th>
                    <th className="px-2 py-2 text-left text-xs font-medium">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {matchedTreatments.map((match, idx) => (
                    <tr key={idx} className={`border-t ${match.requires_review ? 'bg-yellow-50' : 'bg-white'}`}>
                      <td className="px-2 py-2 text-xs">{match.clinic_name}</td>
                      <td className="px-2 py-2 text-xs">${match.clinic_price}</td>
                      <td className="px-2 py-2 text-xs">
                        {match.matched_code === 'CUSTOM' ? (
                          <Badge variant="outline" className="bg-blue-50">Custom Treatment</Badge>
                        ) : (
                          <span>{TreatmentService.getFriendlyName(match.matched_code)}</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-xs">
                        <Badge variant={match.confidence >= 0.9 ? 'default' : match.confidence >= 0.7 ? 'secondary' : 'destructive'}>
                          {(match.confidence * 100).toFixed(0)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleReset} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleBulkUpdate} disabled={isProcessing} className="flex-1">
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Import {matchedTreatments.length} Treatments
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
        
        {currentStep === ImportStep.COMPLETE && (
          <div className="text-center space-y-4 py-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h3 className="text-xl font-bold">Import Complete!</h3>
            <p className="text-gray-600">
              Your price list has been successfully imported. All treatment prices have been updated.
            </p>
            <Button onClick={handleReset}>
              Import Another Price List
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

