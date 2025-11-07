import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Upload, Camera, FileImage, Loader2, Brain } from 'lucide-react';
import { api } from '@/services/api';

interface FileUploadSectionProps {
  onFileUploaded: (file: File, analysisData: any) => void;
  onAnalysisComplete: (data: any) => void;
  isProcessing?: boolean;
}

export const FileUploadSection = ({
  onFileUploaded,
  onAnalysisComplete,
  isProcessing = false
}: FileUploadSectionProps) => {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const processUploadedFile = async (file: File) => {
    setUploadedImage(file);
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    const startTime = Date.now();
    const duration = 15000;
    
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 95);
      setAnalysisProgress(progress);
    }, 100);
    
    try {
      const uploadResult = await api.uploadImage(file);
      const analysisResult = await api.analyzeXrayImmediate(uploadResult.url);
      
      setAnalysisProgress(100);
      clearInterval(progressInterval);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onFileUploaded(file, analysisResult);
      onAnalysisComplete(analysisResult);
    } catch (error) {
      clearInterval(progressInterval);
      setAnalysisProgress(0);
      console.error('Error during analysis:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processUploadedFile(file);
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      await processUploadedFile(files[0]);
    }
  };

  return (
    <>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileImage className="mr-2 h-5 w-5" />
            Upload Panoramic X-Ray
          </CardTitle>
          <CardDescription>
            Upload the patient's panoramic X-ray for AI analysis and treatment planning
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!uploadedImage ? (
            <div 
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 ${
                isDragOver ? 'border-blue-500 bg-blue-50 scale-105' : 'border-gray-300 hover:border-blue-400'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
            >
              <Upload className={`mx-auto h-16 w-16 mb-6 transition-colors ${
                isDragOver ? 'text-blue-500' : 'text-gray-400'
              }`} />
              <div className="space-y-4">
                <div>
                  <label htmlFor="opg-upload" className="cursor-pointer">
                    <span className="text-xl font-medium text-blue-600 hover:text-blue-700">
                      Click to upload OPG image
                    </span>
                  </label>
                  <p className="text-gray-500 mt-2">
                    or drag and drop your panoramic X-ray file here
                  </p>
                </div>
                <input 
                  id="opg-upload"
                  type="file"
                  onChange={handleImageUpload}
                  accept=".dcm,.jpg,.jpeg,.png,.tiff,.tif"
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative">
                <div className={`flex items-center justify-between p-4 ${isProcessing ? 'opacity-50' : ''} bg-green-50 border border-green-200 rounded-lg`}>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Camera className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-green-900">{uploadedImage.name}</p>
                      <p className="text-sm text-green-700">
                        {(uploadedImage.size / (1024 * 1024)).toFixed(2)} MB • Ready for analysis
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    ✓ Uploaded
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Loading Modal */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
            <div className="text-center">
              <div className="relative inline-flex">
                <Brain className="w-16 h-16 text-blue-600" />
                <div className="absolute inset-0 w-16 h-16 bg-blue-600/20 rounded-full animate-ping" />
              </div>
              <h3 className="text-xl font-semibold mt-4 mb-2">AI Analyzing X-ray</h3>
              <p className="text-gray-600 mb-6">Processing your X-ray with advanced AI...</p>
              
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div 
                  className="h-3 bg-blue-600 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
              
              <div className="flex items-center justify-center text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                This will take a few moments...
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};