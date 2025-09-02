import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Brain, ArrowLeft, Upload, Camera, FileImage, Loader2, Mic, FileText, Video, Play, ToggleLeft, ToggleRight, Settings, Info, RefreshCw, Mail, Send, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PricingInput, useClinicPricing } from "@/components/PricingInput";
import { PriceValidationDialog } from "@/components/PriceValidationDialog";
import { useClinicBranding } from "@/components/ClinicBranding";
import { AIAnalysisSection } from '@/components/AIAnalysisSection';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ViewInBulgarian } from '@/components/ViewInBulgarian';
import { useTranslation } from '@/contexts/TranslationContext';
import { api } from '@/services/api';
import { heygenService } from '@/services/heygen';
import { generateReplacementOptionsTable } from '@/lib/replacementOptionsTemplate';
import {
  ToothNumberingSystem,
  ALL_CONDITIONS,
  ALL_TREATMENTS,
  getToothOptions,
  getSuggestedTreatments,
  getReplacementOptions
} from '@/data/dental-data';
import './CreateReport.css';

const CreateReport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, translateCondition, translateTreatment } = useTranslation();
  const { clinicPrices, savePrice, savePrices, getPrice, validatePricing, loading: pricingLoading } = useClinicPricing();
  const { applyBrandingToReport } = useClinicBranding();
  
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [findings, setFindings] = useState([
    { tooth: "", condition: "", treatment: "", replacement: "", price: undefined as number | undefined },
  ]);
  const [patientName, setPatientName] = useState("");
  const [report, setReport] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [originalReportBackup, setOriginalReportBackup] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [history, setHistory] = useState<{ html: string, timestamp: string, type: string, summary: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [auditTrail, setAuditTrail] = useState<{ action: string, timestamp: string }[]>([]);
  const [activeTab, setActiveTab] = useState("report");
  const [useXrayMode, setUseXrayMode] = useState(true);
  const [patientObservations, setPatientObservations] = useState("");
  const [detections, setDetections] = useState<any[]>([]);
  
  // New state for enhanced functionality
  const [toothNumberingSystem, setToothNumberingSystem] = useState<ToothNumberingSystem>(() => {
    const saved = localStorage.getItem('toothNumberingSystem');
    return (saved as ToothNumberingSystem) || 'FDI';
  });
  const [showTreatmentPricing, setShowTreatmentPricing] = useState(() => {
    const saved = localStorage.getItem('showTreatmentPricing');
    return saved === 'true' || false; // Hidden by default
  });
  

  
  // Report generation progress state
  const [reportProgress, setReportProgress] = useState(0);
  const [reportProgressText, setReportProgressText] = useState('');
  // Global toggle: include replacement options comparison table
  const [showReplacementOptionsTable, setShowReplacementOptionsTable] = useState<boolean>(() => {
    const saved = localStorage.getItem('showReplacementOptionsTable');
    return saved === 'true';
  });
  
  // Global toggle: show tooth numbers on X-ray
  const [showToothNumberOverlay, setShowToothNumberOverlay] = useState<boolean>(() => {
    const saved = localStorage.getItem('showToothNumberOverlay');
    // Default to false - toggle should be OFF by default when AI analysis first appears
    return false;
  });
  
  // Store the original image URL to restore when toggle is turned off
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  
  // Text size multiplier for tooth numbers
  const [textSizeMultiplier, setTextSizeMultiplier] = useState<number>(() => {
    const saved = localStorage.getItem('toothNumberTextSize');
    // Default to 1.2x (38px) when first turned on, otherwise use saved value
    return saved ? parseFloat(saved) : 1.2;
  });
  
  // State to track when text size is being updated
  const [isUpdatingTextSize, setIsUpdatingTextSize] = useState<boolean>(false);
  
  // Function to refresh image with tooth number overlay
  const refreshImageWithOverlay = async (imageUrl: string) => {
    if (!showToothNumberOverlay) {
      return imageUrl; // Return original if toggle is off
    }
    
    try {
      const overlayResult = await api.addToothNumberOverlay(
        imageUrl,
        toothNumberingSystem, // Use user's preferred numbering system
        true,
        textSizeMultiplier, // Include text size multiplier
        immediateAnalysisData?.detections // Use mapped detections with tooth number assignments
      );
      
      if (overlayResult && overlayResult.has_overlay) {
        return overlayResult.image_url;
      }
    } catch (error) {
      console.error('Failed to add tooth number overlay:', error);
    }
    
    return imageUrl; // Return original if overlay fails
  };
  
  // Function to restore original image when toggle is turned off
  const restoreOriginalImage = () => {
    if (originalImageUrl && immediateAnalysisData?.annotated_image_url !== originalImageUrl) {
      setImmediateAnalysisData((prev: any) => ({
        ...prev,
        annotated_image_url: originalImageUrl
      }));
    }
  };
  
  // Progress steps for report generation
  const progressSteps = [
    { progress: 10, text: "Analyzing dental findings..." },
    { progress: 20, text: "Processing AI recommendations..." },
    { progress: 30, text: "Constructing summary table..." },
    { progress: 40, text: "Adding clinic pricing..." },
    { progress: 50, text: "Creating condition explanation boxes..." },
    { progress: 60, text: "Generating treatment descriptions..." },
    { progress: 70, text: "Adding annotated X-ray..." },
    { progress: 80, text: "Applying clinic branding..." },
    { progress: 90, text: "Formatting final report..." },
    { progress: 100, text: "Finalizing document..." }
  ];
  
  // Function to simulate progress updates
  const simulateProgress = () => {
    setReportProgress(0);
    setReportProgressText('');
    
    progressSteps.forEach((step, index) => {
      setTimeout(() => {
        setReportProgress(step.progress);
        setReportProgressText(step.text);
      }, index * 1500); // 1.5 seconds between each step
    });
  };

  const normalizeConditionName = (condition: string) =>
    condition?.toLowerCase().replace(/\s+/g, '-');
  
  // Function to handle fallback progress (smooth load to 100%)
  const fallbackProgress = () => {
    setReportProgress(0);
    setReportProgressText('');
    
    const duration = 15000; // 15 seconds total
    const steps = 100;
    const interval = duration / steps;
    
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress += 1;
      setReportProgress(currentProgress);
      
      if (currentProgress >= 100) {
        clearInterval(progressInterval);
        setReportProgressText('Finalizing document...');
      }
    }, interval);
    
    return progressInterval;
  };
  
  // Price validation dialog state
  const [showPriceValidation, setShowPriceValidation] = useState(false);
  const [missingPrices, setMissingPrices] = useState<string[]>([]);
  const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);

  // State for immediate analysis
  const [immediateAnalysisData, setImmediateAnalysisData] = useState<any>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [showAISummary, setShowAISummary] = useState(true);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isGeneratingConsultation, setIsGeneratingConsultation] = useState(false);
  const [patientEmail, setPatientEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // Effect to refresh image when tooth number overlay toggle changes
  useEffect(() => {
    if (!immediateAnalysisData?.annotated_image_url) return;
    
    const currentImageUrl = immediateAnalysisData.annotated_image_url;
    
    if (showToothNumberOverlay) {
      // Toggle is ON - add overlay
      console.log('🔢 TOOTH OVERLAY: Toggle turned ON, adding overlay...');
      refreshImageWithOverlay(currentImageUrl).then(newImageUrl => {
        if (newImageUrl !== currentImageUrl && 
            immediateAnalysisData?.annotated_image_url === currentImageUrl &&
            showToothNumberOverlay) {
          setImmediateAnalysisData((prev: any) => ({
            ...prev,
            annotated_image_url: newImageUrl
          }));
        }
      });
    } else {
      // Toggle is OFF - restore original image
      console.log('🔢 TOOTH OVERLAY: Toggle turned OFF, restoring original image...');
      restoreOriginalImage();
    }
  }, [showToothNumberOverlay]); // Only depend on toggle, not text size

  // Separate effect for real-time text size updates with debouncing
  useEffect(() => {
    if (!showToothNumberOverlay || !immediateAnalysisData?.annotated_image_url) return;
    
    // Debounce the text size changes to avoid too many API calls
    const timeoutId = setTimeout(() => {
      console.log('🔢 TOOTH OVERLAY: Text size changed to', textSizeMultiplier, 'x, refreshing overlay...');
      setIsUpdatingTextSize(true);
      
      const currentImageUrl = immediateAnalysisData.annotated_image_url;
      refreshImageWithOverlay(currentImageUrl).then(newImageUrl => {
        if (newImageUrl !== currentImageUrl && 
            immediateAnalysisData?.annotated_image_url === currentImageUrl &&
            showToothNumberOverlay) {
          setImmediateAnalysisData((prev: any) => ({
            ...prev,
            annotated_image_url: newImageUrl
          }));
        }
        setIsUpdatingTextSize(false);
      }).catch(() => {
        setIsUpdatingTextSize(false);
      });
    }, 300); // 300ms debounce delay
    
    return () => clearTimeout(timeoutId);
  }, [textSizeMultiplier, showToothNumberOverlay]); // Depend on text size and toggle state

  // Auto-resize textarea when aiSuggestion changes (especially for speech dictation)
  useEffect(() => {
    const textarea = document.querySelector('textarea[placeholder="Type or speak your change request..."]') as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [aiSuggestion]);
  
  let recognition: any = null;

    // Update handleImageUpload function (continued)
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processUploadedFile(file);
    }
  };

  // Handle dropped files
  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      await processUploadedFile(file);
    }
  };

  // Handle drag over
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  // Handle drag leave
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  // Process uploaded file
  const processUploadedFile = async (file: File) => {
    setUploadedImage(file);
    setIsAnalyzingImage(true);
    setAnalysisProgress(0);
    setImmediateAnalysisData(null); // Clear previous data
    
    // Start progress animation
    const startTime = Date.now();
    const duration = 15000; // 15 seconds total
    
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 95); // Cap at 95% until complete
      setAnalysisProgress(progress);
    }, 100);
    
    try {
      // First upload the image
      const uploadResult = await api.uploadImage(file);
      
      toast({
        title: "Image Uploaded",
        description: "Analyzing X-ray with AI...",
      });

      // Immediately analyze the uploaded image
      const analysisResult = await api.analyzeXrayImmediate(uploadResult.url);
      
      // Complete the progress bar
      setAnalysisProgress(100);
      clearInterval(progressInterval);
      
      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setImmediateAnalysisData(analysisResult);
      setDetections(analysisResult.detections || []);
      
      // Store the original image URL for tooth number overlay toggle
      if (analysisResult.annotated_image_url) {
        setOriginalImageUrl(analysisResult.annotated_image_url);
      }
      
      toast({
        title: "AI Analysis Complete",
        description: `Found ${analysisResult.detections?.length || 0} potential conditions. Review the findings below.`,
      });
    } catch (error) {
      clearInterval(progressInterval);
      setAnalysisProgress(0);
      console.error('Error during analysis:', error);
      toast({
        title: "Analysis Failed",
        description: "There was an error analyzing the X-ray. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handleFindingChange = (idx: number, field: string, value: string | number) => {
    setFindings((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      
      // Auto-suggest treatments when condition changes (only if treatment is empty)
      if (field === 'condition' && typeof value === 'string' && value !== '') {
        // Only clear treatment if it was empty or auto-filled
        if (!updated[idx].treatment) {
          // Auto-populate with the most recommended treatment
          const suggestedTreatments = getSuggestedTreatments(value);
          if (suggestedTreatments && suggestedTreatments.length > 0) {
            // Get the first (most recommended) treatment
            const recommendedTreatment = suggestedTreatments[0].value;
            updated[idx].treatment = recommendedTreatment;
            
            // Auto-fill price if available
            const price = getPrice(recommendedTreatment);
            if (price) {
              updated[idx].price = price;
            }
            
            // Show a toast to inform the user (less intrusive)
            console.log(`Auto-selected treatment: ${suggestedTreatments[0].label} for condition: ${value}`);
          }
        }
      }
      
      // Auto-fill price when treatment changes manually
      if (field === 'treatment' && typeof value === 'string') {
        const price = getPrice(value);
        if (price) {
          updated[idx].price = price;
        }
      }
      
      return updated;
    });
  };

  const addFinding = () => {
    setFindings((prev) => [{ tooth: "", condition: "", treatment: "", replacement: "", price: undefined }, ...prev]);
  };

  const handleAcceptAIFinding = (detection: any, toothMapping?: {tooth: string, confidence: number}) => {
    const conditionName = detection.class_name || detection.class || 'Unknown';
    let normalizedCondition = conditionName.toLowerCase().replace(/\s+/g, '-');
    
    // Normalize missing tooth variants to standard "missing-tooth"
    if (normalizedCondition === 'missing-tooth-between' || normalizedCondition === 'missing-teeth-no-distal') {
      normalizedCondition = 'missing-tooth';
    }
    
    // Auto-suggest treatment based on condition
    const suggestedTreatments = getSuggestedTreatments(normalizedCondition);
    const recommendedTreatment = suggestedTreatments && suggestedTreatments.length > 0 ? suggestedTreatments[0].value : '';
    
    // Auto-fill price if available
    const price = recommendedTreatment ? getPrice(recommendedTreatment) : undefined;
    
    // Auto-fill tooth number if mapping is available
    const tooth = toothMapping ? toothMapping.tooth : '';
    
    const newFinding = {
      tooth: tooth, // Auto-filled if mapping available
      condition: normalizedCondition,
      treatment: recommendedTreatment,
      replacement: "", // No replacement for AI-detected findings
      price: price
    };
    
    setFindings(prev => {
      // If the first row is still the initial empty placeholder, remove it
      const isEmptyFinding = (f: { tooth: string; condition: string; treatment: string; price?: number | undefined }) =>
        (!f.tooth || f.tooth.trim() === '') && (!f.condition || f.condition.trim() === '') && (!f.treatment || f.treatment.trim() === '') && (f.price === undefined);
      const next = prev.length > 0 && isEmptyFinding(prev[0]) ? prev.slice(1) : prev;
      return [newFinding, ...next];
    });
    
    const message = toothMapping 
      ? `${conditionName} has been added to your findings table with suggested treatment and tooth #${tooth} (${Math.round(toothMapping.confidence * 100)}% confidence).`
      : `${conditionName} has been added to your findings table with suggested treatment.`;
    
    toast({
      title: "AI Finding Added",
      description: message,
    });
  };

  const handleRejectAIFinding = (detection: any) => {
    // Could implement logic to hide this detection or mark as rejected
    toast({
      title: "AI Finding Rejected",
      description: "This finding has been marked as rejected.",
    });
  };

  const handlePriceSave = (treatment: string, price: number) => {
    savePrice(treatment, price);
    toast({
      title: "Price Saved",
      description: `Price for ${treatment} has been saved to your clinic pricing.`,
    });
  };

  // Handle price validation dialog
  const handlePricesProvided = async (prices: Record<string, number>) => {
    try {
      // Save the provided prices
      await savePrices(prices);
      
      // Close the dialog
      setShowPriceValidation(false);
      
      // Continue with the original submit
      if (pendingSubmitData) {
        await performSubmit(pendingSubmitData);
      }
      
      // Clear pending data
      setPendingSubmitData(null);
      setMissingPrices([]);
      
    } catch (error) {
      console.error('Error saving prices:', error);
      toast({
        title: "Error",
        description: "Failed to save prices. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handlePriceValidationCancel = () => {
    setShowPriceValidation(false);
    setPendingSubmitData(null);
    setMissingPrices([]);
  };

  // Extract the main submit logic into a separate function
  const performSubmit = async (submitData: any) => {
    console.log('🚀 REPORT GENERATION: Starting report generation...');
    console.log('🚀 REPORT GENERATION: Submit data:', submitData);
    
    const { validFindings, useXrayMode, patientName, patientObservations } = submitData;
    
    console.log('🚀 REPORT GENERATION: Valid findings count:', validFindings?.length || 0);
    console.log('🚀 REPORT GENERATION: Use X-ray mode:', useXrayMode);
    console.log('🚀 REPORT GENERATION: Patient name:', patientName);
    console.log('🚀 REPORT GENERATION: Uploaded image exists:', !!uploadedImage);
    
    setIsProcessing(true);
    setReport(null);
    // Clear the backup since we're starting a new report
    setOriginalReportBackup(null);
    // Don't reset videoUrl here - preserve it if it exists
    // setVideoUrl(null);
    setDetections([]);
    
    // Reset video generation status for new report
    
    
    
    // Start progress tracking
    simulateProgress();
    
    try {
      let analysisResult;
      
      if (useXrayMode) {
        console.log('🚀 REPORT GENERATION: Processing X-ray mode...');
        // Original flow with X-ray upload
        try {
          console.log('🚀 REPORT GENERATION: Uploading image to backend...');
          const uploadResult = await api.uploadImage(uploadedImage!);
          console.log('🚀 REPORT GENERATION: Image upload result:', uploadResult);
          
          console.log('🚀 REPORT GENERATION: Calling analyzeXray API...');
          analysisResult = await api.analyzeXray({
            patientName,
            imageUrl: uploadResult.url,
            findings: validFindings,
            generateVideo: true
          });
          console.log('🚀 REPORT GENERATION: Analysis result received:', analysisResult);
        } catch (networkError) {
          console.error('🚀 REPORT GENERATION: Network error during API call:', networkError);
          console.log('🚀 REPORT GENERATION: Using frontend-only generation fallback');
          // Create a mock analysis result for frontend generation
          analysisResult = {
            detections: [],
            treatment_stages: [],
            summary: 'Report generated offline due to network issues'
          };
        }
        
        if (analysisResult.detections) {
          console.log('🚀 REPORT GENERATION: Setting detections:', analysisResult.detections.length);
          setDetections(analysisResult.detections);
          
          if (analysisResult.detections.length > 0) {
            toast({
              title: "Analysis Complete",
              description: "AI analysis completed successfully. Video generation in progress...",
            });
          }
        }
        
        // Store original image URL for tooth number overlay toggle
        if (analysisResult.annotated_image_url) {
          setOriginalImageUrl(analysisResult.annotated_image_url);
        }
        
        // Handle tooth number overlay if toggle is on
        if (showToothNumberOverlay && analysisResult.annotated_image_url) {
          try {
            console.log('🔢 TOOTH OVERLAY: Adding tooth numbers to X-ray...');
            console.log('🔢 TOOTH OVERLAY: Using numbering system:', toothNumberingSystem);
            
            const overlayResult = await api.addToothNumberOverlay(
              analysisResult.annotated_image_url,
              toothNumberingSystem, // Use user's preferred numbering system
              true,
              textSizeMultiplier, // Include text size multiplier
              analysisResult.detections // Use mapped detections with tooth number assignments
            );
            
            if (overlayResult && overlayResult.has_overlay) {
              console.log('🔢 TOOTH OVERLAY: Successfully created numbered image');
              // Replace the annotated image URL with the numbered version
              analysisResult.annotated_image_url = overlayResult.image_url;
            } else {
              console.log('🔢 TOOTH OVERLAY: No overlay applied, using original image');
            }
          } catch (overlayError) {
            console.error('🔢 TOOTH OVERLAY: Failed to add tooth numbers:', overlayError);
            // Continue with original image if overlay fails
            toast({
              title: "Tooth Number Overlay Failed",
              description: "Could not add tooth numbers to X-ray, using original image.",
              variant: "destructive",
            });
          }
        }
        
        // Use the HTML report generated by the backend, fallback to frontend generation
        console.log('🚀 REPORT GENERATION: Analysis result structure:', Object.keys(analysisResult));
        console.log('🚀 REPORT GENERATION: Report HTML from backend exists:', !!analysisResult.report_html);
        console.log('🚀 REPORT GENERATION: Report HTML length:', analysisResult.report_html?.length || 0);
        
        let reportHtml = analysisResult.report_html;
        if (!reportHtml) {
          console.log('🚀 REPORT GENERATION: Backend report_html is empty, using frontend generation');
          console.log('🚀 REPORT GENERATION: Calling generateReportHTML with toggle state:', showReplacementOptionsTable);
          reportHtml = generateReportHTML(analysisResult, showReplacementOptionsTable);
          console.log('🚀 REPORT GENERATION: Frontend generated HTML length:', reportHtml?.length || 0);
        }
        
        console.log('🚀 REPORT GENERATION: Applying branding to report...');
        const brandedReport = applyBrandingToReport(reportHtml);
        console.log('🚀 REPORT GENERATION: Branded report length:', brandedReport?.length || 0);
        console.log('🚀 REPORT GENERATION: First 200 chars of branded report:', brandedReport?.substring(0, 200));
        console.log('🚀 REPORT GENERATION: Setting report state...');
        
        // Always set the report if we have any HTML content
        const finalReport = brandedReport || reportHtml || '';
        if (finalReport && finalReport.trim().length > 0) {
          setReport(finalReport);
          // Clear the backup since this is a new report
          setOriginalReportBackup(null);
          console.log('🚀 REPORT GENERATION: Report state set successfully with length:', finalReport.length);
          
          // Switch to report tab to show the generated report IMMEDIATELY
          setActiveTab('report');
          console.log('🚀 REPORT GENERATION: Switched to report tab - Report is now visible!');
          
          // Show success toast for report generation
          toast({
            title: "Report Ready! 🎉",
            description: "Your dental report has been generated successfully. Video generation is continuing in the background...",
          });
        } else {
          console.error('🚀 REPORT GENERATION: No valid HTML content available');
          console.error('🚀 REPORT GENERATION: brandedReport:', brandedReport);
          console.error('🚀 REPORT GENERATION: reportHtml:', reportHtml);
          throw new Error('Failed to generate report HTML content');
        }
        
        // Handle video generation SEPARATELY from report display
        console.log('🚀 VIDEO GENERATION: Starting video generation process...');
        if (analysisResult.video_url) {
          console.log('🚀 VIDEO GENERATION: Video URL already available:', analysisResult.video_url);
          setVideoUrl(analysisResult.video_url);

          toast({
            title: "Video Ready! 🎥",
            description: "Patient education video has been generated successfully!",
          });
        } else if (analysisResult.diagnosis_id) {
          console.log('🚀 VIDEO GENERATION: Starting video status polling for diagnosis:', analysisResult.diagnosis_id);
          
  
          // Start video polling in background - don't block the UI
          pollForVideoStatus(analysisResult.diagnosis_id);
        } else {
          console.log('🚀 VIDEO GENERATION: No diagnosis ID available for video polling');
  
        }
      } else {
        console.log('🚀 REPORT GENERATION: Processing without X-ray mode...');
        // New flow without X-ray
        try {
          console.log('🚀 REPORT GENERATION: Calling analyzeWithoutXray API...');
          analysisResult = await api.analyzeWithoutXray({
            patientName,
            observations: patientObservations,
            findings: validFindings,
            generateVideo: false
          });
          console.log('🚀 REPORT GENERATION: Analysis result (no xray) received:', analysisResult);
        } catch (networkError) {
          console.error('🚀 REPORT GENERATION: Network error during no-xray API call:', networkError);
          console.log('🚀 REPORT GENERATION: Using frontend-only generation fallback');
          // Create a mock analysis result for frontend generation
          analysisResult = {
            detections: [],
            treatment_stages: [],
            summary: 'Report generated offline due to network issues'
          };
        }
        
        // Use the HTML report generated by the backend, fallback to frontend generation
        console.log('🚀 REPORT GENERATION: Analysis result (no xray) structure:', Object.keys(analysisResult));
        console.log('🚀 REPORT GENERATION: Report HTML from backend (no xray) exists:', !!analysisResult.report_html);
        console.log('🚀 REPORT GENERATION: Report HTML (no xray) length:', analysisResult.report_html?.length || 0);
        
        let reportHtml = analysisResult.report_html;
        if (!reportHtml) {
          console.log('🚀 REPORT GENERATION: Backend report_html is empty (no xray), using frontend generation');
          console.log('🚀 REPORT GENERATION: Calling generateReportHTML with toggle state (no xray):', showReplacementOptionsTable);
          reportHtml = generateReportHTML(analysisResult, showReplacementOptionsTable);
          console.log('🚀 REPORT GENERATION: Frontend generated HTML (no xray) length:', reportHtml?.length || 0);
        }
        
        console.log('🚀 REPORT GENERATION: Applying branding to report (no xray)...');
        const brandedReport = applyBrandingToReport(reportHtml);
        console.log('🚀 REPORT GENERATION: Branded report (no xray) length:', brandedReport?.length || 0);
        console.log('🚀 REPORT GENERATION: First 200 chars of branded report (no xray):', brandedReport?.substring(0, 200));
        console.log('🚀 REPORT GENERATION: Setting report state (no xray)...');
        
        // Always set the report if we have any HTML content
        const finalReport = brandedReport || reportHtml || '';
        if (finalReport && finalReport.trim().length > 0) {
          setReport(finalReport);
          // Clear the backup since this is a new report
          setOriginalReportBackup(null);
          console.log('🚀 REPORT GENERATION: Report state (no xray) set successfully with length:', finalReport.length);
          
          // Switch to report tab to show the generated report IMMEDIATELY
          setActiveTab('report');
          console.log('🚀 REPORT GENERATION: Switched to report tab (no xray) - Report is now visible!');
          
          // Show success toast for report generation
          toast({
            title: "Report Ready! 🎉",
            description: "Your dental report has been generated successfully.",
          });
        } else {
          console.error('🚀 REPORT GENERATION: No valid HTML content available (no xray)');
          console.error('🚀 REPORT GENERATION: brandedReport (no xray):', brandedReport);
          console.error('🚀 REPORT GENERATION: reportHtml (no xray):', reportHtml);
          throw new Error('Failed to generate report HTML content');
        }
        
        // Note: No video generation for non-X-ray mode
        console.log('🚀 REPORT GENERATION: Non-X-ray mode - no video generation needed');
      }
    } catch (err) {
      const error = err as Error;
      console.error('🚀 REPORT GENERATION: ERROR occurred:', error);
      console.error('🚀 REPORT GENERATION: Error message:', error.message);
      console.error('🚀 REPORT GENERATION: Error stack:', error.stack);
      console.error('🚀 REPORT GENERATION: Error name:', error.name);
      
      // Check if it's a network error
      if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
        console.error('🚀 REPORT GENERATION: This appears to be a network/API error');
      }
      
      toast({
        title: "Error",
        description: `Failed to generate report: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      console.log('🚀 REPORT GENERATION: Cleaning up and resetting state...');
      setIsProcessing(false);
      // Reset progress
      setReportProgress(0);
      setReportProgressText('');
      console.log('🚀 REPORT GENERATION: Cleanup completed');
    }
  };

  const removeFinding = (idx: number) => {
    setFindings((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  };

  // Helper function to get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.75) return '#4CAF50'; // Green
    if (confidence >= 0.50) return '#FFC107'; // Yellow
    return '#F44336'; // Red
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.75) return 'High';
    if (confidence >= 0.50) return 'Medium';
    return 'Low';
  };


  // Generate HTML report from doctor's findings (not AI extraction) - DISABLED: Now using backend GPT generation
  const generateReportHTML = (data: any, showReplacementTable: boolean) => {
    // Debug logging to show what toggle values are being passed
    console.log('🔧 generateReportHTML called with toggle values:', {
      showReplacementTable,
      findingsCount: findings.length,
      doctorFindingsCount: findings.filter(f => f.tooth && f.condition && f.treatment).length
    });
    
    // CRITICAL FIX: Always use the original annotated image for reports, never the numbered version
    // This ensures reports always show clean X-rays without tooth numbers
    let reportImageUrl = originalImageUrl || data.annotated_image_url;
    
    // SECURITY FIX: Only use web-accessible URLs, not local file paths
    // If the URL looks like a local file path, don't include the image in the report
    if (reportImageUrl && (reportImageUrl.startsWith('/tmp/') || reportImageUrl.startsWith('file://') || !reportImageUrl.startsWith('http'))) {
      console.warn('🚨 SECURITY: Blocking local file path from report:', reportImageUrl);
      reportImageUrl = null; // Don't include potentially unsafe local paths
    }
    
    console.log('🔧 REPORT IMAGE: Using original image for report:', !!originalImageUrl, 'URL:', reportImageUrl);
    
    // Use doctor's findings as the primary source of truth
    const doctorFindings = findings.filter(f => f.tooth && f.condition && f.treatment);
    
    // CRITICAL FIX: Use the current findings state, not stale data
    // The data parameter might contain stale findings, so we use the current findings state
    console.log('🔧 Current findings state:', findings);
    console.log('🔧 Data parameter:', data);
    
    // Helper functions first
    const generateADACode = (treatment: string) => {
      const adaCodes: Record<string, string> = {
        'filling': 'D2330',
        'extraction': 'D7140',
        'root-canal-treatment': 'D3310',
        'crown': 'D2740',
        'bridge': 'D6240',
        'implant-placement': 'D6010',
        'partial-denture': 'D5213',
        'scale-and-clean': 'D1110',
        'deep-cleaning': 'D4341',
        'veneer': 'D2962',
        'fluoride-treatment': 'D1206'
      };
      
      const key = Object.keys(adaCodes).find(k => treatment.toLowerCase().includes(k.replace('-', ' ')));
      return key ? adaCodes[key] : 'D0000';
    };

    const getTreatmentPrice = (treatment: string, findingPrice?: number) => {
      // Use the price from the finding if available, otherwise use clinic/default pricing
      if (findingPrice) return findingPrice;
      return getPrice(treatment) || 100;
    };

    const groupTreatments = (items: any[]) => {
      const grouped: Record<string, any> = {};
      
      items.forEach(item => {
        const key = `${item.procedure}_${item.adaCode}`;
        if (!grouped[key]) {
          grouped[key] = {
            procedure: item.procedure,
            adaCode: item.adaCode,
            unitPrice: item.unitPrice,
            quantity: 0,
            totalPrice: 0
          };
        }
        grouped[key].quantity += item.quantity;
        grouped[key].totalPrice = grouped[key].quantity * grouped[key].unitPrice;
      });
      
      return Object.values(grouped);
    };

    const calculateTotal = (treatments: any[]) => {
      return treatments.reduce((sum: number, t: any) => sum + t.totalPrice, 0);
    };

    const calculateStageCost = (stage: any, groupedTreatments: any[]) => {
      let cost = 0;
      stage.items.forEach((item: any) => {
        const treatment = groupedTreatments.find(t => 
          t.procedure.toLowerCase().includes(item.recommended_treatment.toLowerCase())
        );
        if (treatment) {
          cost += treatment.unitPrice * (item.quantity || 1);
        }
      });
      return cost;
    };

    const estimateDuration = (stage: any) => {
      const durations: Record<string, number> = {
        'filling': 0.75,
        'extraction': 0.5,
        'root canal': 1.5,
        'crown': 1,
        'bridge': 2,
        'implant': 2,
        'partial denture': 0.5
      };
      
      let totalDuration = 0;
      stage.items.forEach((item: any) => {
        const key = Object.keys(durations).find(k => 
          item.recommended_treatment.toLowerCase().includes(k)
        );
        if (key) {
          totalDuration += durations[key] * (item.quantity || 1);
        } else {
          totalDuration += 1 * (item.quantity || 1);
        }
      });
      
      return totalDuration.toFixed(1);
    };

    const getStageSummary = (stage: any) => {
      const items = stage.items || [];
      const treatments = items.map((item: any) => item.recommended_treatment);
      const summary = treatments.join(', ');
      return summary || 'Various treatments';
    };

    const formatTreatmentTitle = (item: any) => {
      const treatment = item.recommended_treatment;
      const condition = item.condition;
      
      if (treatment.toLowerCase().includes('filling')) {
        return 'Filling for Cavities';
      } else if (treatment.toLowerCase().includes('extraction') && condition.toLowerCase().includes('root')) {
        return 'Extraction for Root Fragments';
      } else if (treatment.toLowerCase().includes('root canal') && condition.toLowerCase().includes('periapical')) {
        return 'Root Canal for Periapical Lesions';
      } else if (treatment.toLowerCase().includes('root canal') && treatment.toLowerCase().includes('crown')) {
        return 'Root Canal and Crown for Fractured Teeth';
      } else if (treatment.toLowerCase().includes('implant')) {
        return 'Implant and Crown for Missing Teeth';
      } else if (treatment.toLowerCase().includes('partial denture')) {
        return 'Partial Denture for Missing Teeth';
      } else if (treatment.toLowerCase().includes('extraction') && treatment.toLowerCase().includes('bridge')) {
        return 'Extraction and Bridge for Fractured Teeth';
      }
      
      return treatment;
    };

    const getDetailedTreatmentDescription = (item: any) => {
      const descriptions: Record<string, string> = {
        'filling': 'A filling procedure will be performed to restore the affected areas. This typically takes about 30 to 60 minutes per tooth, and recovery is immediate, allowing you to eat and drink normally right after. You already have fillings in other areas, which shows your commitment to maintaining oral health.',
        'extraction': 'The extraction procedure will remove the root fragments, typically taking about 30 minutes per tooth. Recovery involves some mild discomfort and swelling, which subsides in a few days. This will help prevent potential infections and improve oral health.',
        'root canal': 'A root canal procedure will clean out the infection and seal the tooth, taking about 1 to 1.5 hours per tooth. Recovery is usually quick, with minor discomfort. This will save the tooth and prevent further issues.',
        'crown': 'The root canal will remove any infection and the crown will restore the tooth\'s function and appearance. This process takes two visits: one for the root canal and another for the crown fitting. Recovery is straightforward, with minimal discomfort.',
                'implant': 'An implant will be placed to act as a root, followed by a crown to restore appearance and function. This process involves several visits over a few months. Recovery is manageable, with minor discomfort after each step.',
        'partial denture': 'A partial denture will be custom-made to fit your mouth, restoring function and aesthetics. This process takes a few weeks and involves multiple fittings. Adjustment to wearing the denture is usually quick.',
        'bridge': 'The tooth will be extracted, and a bridge will be placed to fill the gap. This involves several visits and takes a few weeks to complete. Recovery is smooth, with minor discomfort after the extraction.'
      };
      
      const key = Object.keys(descriptions).find(k => 
        item.recommended_treatment.toLowerCase().includes(k)
      );
      
      return key ? descriptions[key] : 'Treatment will be performed according to standard dental protocols.';
    };

    const getRiskDescription = (item: any) => {
      const risks: Record<string, string> = {
        'filling': 'Ignoring cavities can lead to larger decay, pain, and possible infection. It\'s best to book this soon to avoid further issues.',
        'extraction': 'Leaving root fragments can lead to infection and pain. It\'s important to address this soon to maintain your dental health.',
        'root canal': 'Untreated lesions can lead to severe pain and abscess formation. It\'s crucial to treat this soon to preserve your teeth.',
        'crown': 'A fractured tooth can worsen, leading to pain and possible tooth loss. It\'s advisable to address this promptly to maintain oral health.',
        'implant': 'Missing teeth can lead to shifting of other teeth and affect your bite. It\'s beneficial to proceed with this treatment to maintain a healthy smile.',
        'partial denture': 'Missing teeth can cause other teeth to shift and affect your bite. It\'s wise to consider this option to maintain oral health.',
        'bridge': 'A fractured tooth can lead to pain and further dental issues. It\'s important to address this soon to restore your smile.'
      };
      
      const key = Object.keys(risks).find(k => 
        item.recommended_treatment.toLowerCase().includes(k)
      );
      
      return key ? risks[key] : 'Delaying treatment may lead to complications. Please consult with your dentist.';
    };

    // Process doctor's findings to create treatment items
    const treatmentItems: any[] = [];
    
    // First, deduplicate findings to prevent multiple entries for the same tooth-treatment-condition combination
    const uniqueFindings = doctorFindings.filter((finding, index, self) => {
      const key = `${finding.tooth}-${finding.treatment}-${finding.condition}`;
      return index === self.findIndex(f => `${f.tooth}-${f.treatment}-${f.condition}` === key);
    });
    
    uniqueFindings.forEach((finding) => {
      treatmentItems.push({
        procedure: finding.treatment,
        adaCode: generateADACode(finding.treatment),
        unitPrice: getTreatmentPrice(finding.treatment, finding.price),
        quantity: 1,
        tooth: finding.tooth,
        condition: finding.condition,
        stage: 'Doctor Findings'
      });
    });

    // Group treatments by type
    const groupedTreatments = groupTreatments(treatmentItems);
    
    // Generate the HTML - ensure it's always a valid string
    const htmlContent = `
      <div class="report-container" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <!-- Header -->
        <div style="background-color: #1e88e5; color: white; padding: 20px; display: flex; align-items: center;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 40px; height: 40px; background-color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
              <span style="color: #1e88e5; font-size: 20px;">🧠</span>
            </div>
            <span style="font-size: 24px; font-weight: bold;">Scanwise</span>
          </div>
        </div>

        <!-- Greeting -->
        <div style="padding: 30px 20px;">
          <h2 style="font-size: 24px; margin-bottom: 10px;">Hi ${patientName}, here's what we found in your X-Ray:</h2>
          <p style="color: #666; margin-bottom: 20px;">Below is a clear, easy-to-understand breakdown of your scan and what it means for your dental health.</p>
          <p style="text-align: center; color: #666; margin: 20px 0;">Scroll down to view your full written report.</p>
        </div>

        <!-- Treatment Overview Table -->
        <div style="padding: 0 20px; margin-bottom: 40px;">
          <h3 style="font-size: 20px; margin-bottom: 20px;">Treatment Overview Table</h3>
          <table style="width: 100%; border-collapse: collapse; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Procedure (ADA Item Code)</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Unit Price</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Quantity</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Total Price</th>
              </tr>
            </thead>
            <tbody>
              ${groupedTreatments.map((treatment: any) => `
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #eee;">${treatment.procedure} (${treatment.adaCode})</td>
                  <td style="padding: 12px; border-bottom: 1px solid #eee;">$${treatment.unitPrice}</td>
                  <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee;">${treatment.quantity}</td>
                  <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee;">$${treatment.totalPrice}</td>
                </tr>
              `).join('')}
              <tr style="background-color: #f5f5f5; font-weight: bold;">
                <td colspan="3" style="padding: 12px;">Total Cost</td>
                <td style="padding: 12px; text-align: right;">$${calculateTotal(groupedTreatments)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Stage-Based Treatment Plan -->
        ${(() => {
          // Check if we have Staging V2 data from backend
          if (data.staging_v2_meta && data.stages && data.stages.length > 0) {
            // Render Staging V2 with visits
            return `
              <div style="padding: 0 20px; margin-bottom: 40px;">
                <h3 style="font-size: 20px; margin-bottom: 20px;">
                  Treatment Plan Stages
                  <span style="font-size: 14px; color: #666; font-weight: normal; margin-left: 10px;">
                    (AI-Optimized Scheduling)
                  </span>
                </h3>
                <p style="color: #666; margin-bottom: 20px; font-style: italic;">
                  Your treatment plan has been intelligently staged for scheduling efficiency and patient comfort. 
                  Each stage represents a treatment phase, and visits are grouped by time budget and anesthesia rules.
                </p>
                
                ${data.stages.map((stage: any) => `
                  <div style="border: 1px solid #ddd; border-left: 4px solid #1e88e5; margin-bottom: 20px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="background-color: #e3f2fd; padding: 12px 16px;">
                      <strong style="font-size: 16px;">${stage.stage_title}</strong>
                    </div>
                    <div style="padding: 20px;">
                      ${stage.visits.map((visit: any) => `
                        <div style="border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 15px; background: #fafafa;">
                          <div style="background-color: #f0f0f0; padding: 10px 15px; border-radius: 8px 8px 0 0;">
                            <strong style="color: #1e88e5;">${visit.visit_label}</strong>
                          </div>
                          <div style="padding: 15px;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                              <div style="background-color: white; padding: 12px; border-radius: 6px; border: 1px solid #e0e0e0;">
                                <strong style="color: #666;">Visit Duration:</strong>
                                <div style="font-size: 16px; color: #1e88e5; margin-top: 5px;">
                                  ${Math.round(visit.visit_duration_min / 60 * 10) / 10} hours
                                </div>
                              </div>
                              <div style="background-color: white; padding: 12px; border-radius: 6px; border: 1px solid #e0e0e0;">
                                <strong style="color: #666;">Visit Cost:</strong>
                                <div style="font-size: 16px; color: #1e88e5; margin-top: 5px;">
                                  $${visit.visit_cost}
                                </div>
                              </div>
                            </div>
                            
                            <div style="margin-bottom: 15px;">
                              <strong style="color: #666;">Treatments:</strong>
                              <ul style="margin: 8px 0; padding-left: 20px;">
                                ${visit.treatments.map((treatment: any) => `
                                  <li style="margin-bottom: 5px;">
                                    <strong>Tooth ${treatment.tooth}</strong>: ${treatment.procedure.replace('-', ' ')} 
                                    for ${treatment.condition.replace('-', ' ')}
                                    <span style="color: #666; font-size: 12px;">
                                      (${treatment.time_estimate_min} min)
                                    </span>
                                  </li>
                                `).join('')}
                              </ul>
                            </div>
                            
                            <div style="background-color: #e8f5e8; padding: 12px; border-radius: 6px; border-left: 4px solid #4caf50;">
                              <strong style="color: #2e7d32;">Why This Grouping:</strong>
                              <div style="color: #2e7d32; margin-top: 5px; font-size: 14px;">
                                ${visit.explain_note}
                              </div>
                            </div>
                          </div>
                        </div>
                      `).join('')}
                      
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px;">
                          <strong style="color: #666;">Stage Duration:</strong>
                          <div style="font-size: 18px; color: #1e88e5; margin-top: 5px;">
                            ${Math.round(stage.total_duration_min / 60 * 10) / 10} hours
                          </div>
                        </div>
                        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px;">
                          <div style="font-size: 18px; color: #1e88e5; margin-top: 5px;">
                            $${stage.total_cost}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                `).join('')}
                
                ${data.future_tasks && data.future_tasks.length > 0 ? `
                  <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-top: 20px;">
                    <h4 style="color: #856404; margin-bottom: 15px;">
                      📅 Planned Follow-ups
                    </h4>
                    ${data.future_tasks.map((task: any) => `
                      <div style="background-color: white; padding: 12px; border-radius: 6px; margin-bottom: 10px; border-left: 4px solid #ffc107;">
                        <strong style="color: #856404;">${task.treatment.replace('-', ' ')} on Tooth ${task.tooth}</strong>
                        <div style="color: #856404; font-size: 14px; margin-top: 5px;">
                          ${task.dependency_reason} - Earliest: ~${task.earliest_date_offset_weeks} weeks
                        </div>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
                
                <div style="background-color: #e3f2fd; border: 1px solid #bbdefb; border-radius: 8px; padding: 15px; margin-top: 20px; text-align: center;">
                  <p style="color: #1976d2; margin: 0; font-size: 14px;">
                    <strong>Note:</strong> This plan is auto-staged for scheduling efficiency and patient comfort. 
                    It follows a typical sequence (disease control → restoration → prosthetics → aesthetics) and 
                    respects appointment length, anesthesia side, and clinical dependencies. 
                    <strong>Your clinician will review and adjust as needed.</strong>
                  </p>
                </div>
              </div>
            `;
          }
          
          // Legacy staging logic (existing code)
          // Only show stages if more than one session is needed
          if (uniqueFindings.length <= 3) {
            return ''; // Don't show stages for simple cases
          }

          // Define urgency levels for different conditions
          const urgencyLevels: {[key: string]: number} = {
            'periapical-lesion': 1, // Highest priority
            'cavity': 1,
            'decay': 1,
            'abscess': 1,
            'root-piece': 2, // Medium priority
            'fracture': 2,
            'impacted-tooth': 2,
            'missing-tooth': 3, // Lowest priority (cosmetic)
            'whitening': 3
          };

          // Group findings by urgency level
          const urgencyGroups: {[key: number]: any[]} = {};
          
          uniqueFindings.forEach((finding: any) => {
            const urgency = urgencyLevels[finding.condition] || 2; // Default to medium priority
            if (!urgencyGroups[urgency]) {
              urgencyGroups[urgency] = [];
            }
            urgencyGroups[urgency].push(finding);
          });

          // Sort by urgency level
          const sortedUrgencyLevels = Object.keys(urgencyGroups).map(Number).sort((a, b) => a - b);

          // Only show stages if we have multiple urgency levels
          if (sortedUrgencyLevels.length <= 1) {
            return '';
          }

          // Treatment duration estimates (in minutes)
          const treatmentDurations: {[key: string]: number} = {
            'filling': 30,
            'crown': 90,
            'root-canal-treatment': 120,
            'surgical-extraction': 60,
            'implant': 180,
            'bridge': 120,
            'scaling': 60,
            'whitening': 45
          };

          // Generate stage content
          return `
            <div style="padding: 0 20px; margin-bottom: 40px;">
              <h3 style="font-size: 20px; margin-bottom: 20px;">Treatment Plan Stages</h3>
              <p style="color: #666; margin-bottom: 20px; font-style: italic;">Your treatment plan has been organized into stages based on urgency and complexity. Each stage represents one treatment session.</p>
              
              ${sortedUrgencyLevels.map((urgencyLevel, index) => {
                const findings = urgencyGroups[urgencyLevel];
                const treatments = [...new Set(findings.map(f => f.treatment))];
                const conditions = [...new Set(findings.map(f => f.condition))];
                
                // Calculate total duration for this stage
                let totalDuration = 0;
                findings.forEach(finding => {
                  const duration = treatmentDurations[finding.treatment] || 60;
                  totalDuration += duration;
                });
                
                // Calculate total cost for this stage
                let stageCost = 0;
                findings.forEach(finding => {
                  const price = getTreatmentPrice(finding.treatment, finding.price);
                  stageCost += price;
                });

                // Generate treatment summary
                const treatmentSummary = treatments.map(treatment => {
                  const count = uniqueFindings.filter(f => f.treatment === treatment).length;
                  const condition = uniqueFindings.find(f => f.treatment === treatment)?.condition;
                  return `${count} ${treatment.replace('-', ' ')}${count > 1 ? 's' : ''} for ${condition?.replace('-', ' ')}`;
                }).join(', ');

                return `
                  <div style="border: 1px solid #ddd; border-left: 4px solid #1e88e5; margin-bottom: 20px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="background-color: #e3f2fd; padding: 12px 16px;">
                      <strong style="font-size: 16px;">Stage ${index + 1}</strong>
                    </div>
                    <div style="padding: 20px;">
                      <h4 style="font-size: 18px; margin-bottom: 15px; color: #1e88e5;">${treatmentSummary}</h4>
                      
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
                        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px;">
                          <strong style="color: #666;">Estimated Duration:</strong>
                          <div style="font-size: 18px; color: #1e88e5; margin-top: 5px;">
                            ${Math.round(totalDuration / 60 * 10) / 10} hours
                          </div>
                        </div>
                        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px;">
                          <strong style="color: #666;">Stage Cost:</strong>
                          <div style="font-size: 18px; color: #1e88e5; margin-top: 5px;">
                            $${stageCost}
                          </div>
                        </div>
                      </div>
                      
                      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 6px;">
                        <strong style="color: #666;">Treatments in this stage:</strong>
                        <ul style="margin: 10px 0 0 20px; color: #666;">
                          ${uniqueFindings.filter(f => urgencyGroups[urgencyLevel].includes(f)).map(finding => `
                            <li>${finding.treatment.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} on Tooth ${finding.tooth} for ${finding.condition.replace('-', ' ')}</li>
                          `).join('')}
                        </ul>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `;
        })()}

        <!-- Doctor's Findings Summary -->
        <div style="padding: 0 20px;">
          <div style="margin-bottom: 30px;">
            <h3 style="font-size: 18px; margin-bottom: 15px;">Treatment Plan Summary</h3>
            <ul style="list-style: disc; padding-left: 20px; color: #666;">
              <li>Total treatments planned: ${uniqueFindings.length}</li>
              <li>Teeth requiring treatment: ${uniqueFindings.map(f => f.tooth).join(', ')}</li>
              <li>Total estimated cost: $${calculateTotal(groupedTreatments)}</li>
            </ul>
          </div>
        </div>

        <!-- Active Conditions from Doctor's Findings - Grouped by Treatment -->
        <div style="padding: 20px;">
          ${(() => {
            // Group findings by treatment type, with special handling for extraction + replacement
            const treatmentGroups: {[key: string]: any[]} = {};
            const extractionReplacements: any[] = [];
            
            uniqueFindings.forEach((finding: any) => {
              // Special case: if this is an extraction with replacement, group them together
              if (finding.treatment === 'extraction' && finding.replacement && finding.replacement !== 'none') {
                extractionReplacements.push(finding);
                return;
              }
              
              // Regular treatment grouping
              const treatmentKey = finding.treatment;
              if (!treatmentGroups[treatmentKey]) {
                treatmentGroups[treatmentKey] = [];
              }
              treatmentGroups[treatmentKey].push(finding);
            });
            
            // Add extraction + replacement group if exists
            if (extractionReplacements.length > 0) {
              treatmentGroups['extraction-with-replacement'] = extractionReplacements;
            }

            // Generate enhanced content for each treatment group
            return Object.entries(treatmentGroups).map(([treatmentKey, findings]) => {
              // Special handling for extraction + replacement group
              if (treatmentKey === 'extraction-with-replacement') {
                return findings.map((finding: any) => {
                  const tooth = finding.tooth;
                  const replacement = finding.replacement;
                  
                  // Generate extraction + replacement description
                  const extractionDesc = `
            <div style="border: 1px solid #ddd; border-left: 4px solid #1e88e5; margin-bottom: 20px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <div style="background-color: #ffeb3b; padding: 8px 16px;">
                        <strong style="font-size: 14px;">Extraction with Replacement</strong>
              </div>
              <div style="padding: 20px;">
                        <h3 style="font-size: 20px; margin-bottom: 15px;">Extraction and ${replacement.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} for Tooth ${tooth}</h3>
                        
                        <p style="margin-bottom: 15px;"><strong>Tooth ${tooth}</strong> requires extraction followed by replacement with a ${replacement.replace('-', ' ')}.</p>
                        
                        <p style="margin-bottom: 15px;"><strong>What This Means:</strong> An impacted tooth is one that has not fully erupted through the gum or has grown in at an angle. This can cause pain, swelling, and can damage neighboring teeth.</p>
                
                <p style="margin-bottom: 15px;">
                          <span style="color: #4caf50;">✓</span> <strong>Recommended Treatment:</strong> Surgical extraction involves removing the tooth through a small incision in the gum, followed by replacement with a ${replacement.replace('-', ' ')} after healing.
                </p>
                
                <p style="margin: 15px 0; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
                          <span style="color: #f44336;">⚠️</span> <strong>Urgency:</strong> Delaying extraction can lead to severe pain, infection spreading to other teeth, and potential damage to your jawbone. The longer you wait, the more complex the procedure becomes.
                </p>
                        

              </div>
            </div>
                  `;
                  
                  return extractionDesc;
                }).join('');
              }
              
              // Regular treatment handling
              const conditions = [...new Set(findings.map(f => f.condition))];
              const teeth = findings.map(f => f.tooth).sort();
              const teethText = teeth.length === 1 ? `Tooth ${teeth[0]}` : `Teeth ${teeth.join(', ')}`;
              
              // Enhanced condition descriptions
              const getConditionDescription = (condition: string) => {
                const descriptions: {[key: string]: string} = {
                  'impacted-tooth': 'An impacted tooth is one that has not fully erupted through the gum or has grown in at an angle. This can cause pain, swelling, and can damage neighboring teeth.',
                  'periapical-lesion': 'A periapical lesion is an infection or inflammation at the tip of the tooth root, usually caused by untreated decay or trauma. This can lead to severe pain and bone loss.',
                  'cavity': 'A cavity is a hole in your tooth caused by bacteria that eat away at the enamel. Left untreated, cavities can grow larger and reach the sensitive inner part of your tooth.',
                  'root-piece': 'A root piece is a fragment of a tooth root that remains in the jawbone after a tooth has been extracted. This can cause infection and prevent proper healing.',
                  'missing-tooth': 'A missing tooth creates a gap that can cause other teeth to shift, leading to bite problems and potential jaw pain.',
                  'decay': 'Tooth decay is the destruction of tooth structure caused by acids produced by bacteria. It starts on the surface and can progress deeper, causing pain and infection.',
                  'fracture': 'A fractured tooth has a crack or break that can cause pain and sensitivity. Without treatment, the fracture can worsen and lead to tooth loss.',
                  'abscess': 'An abscess is a pocket of infection that forms around the tooth root. This is a serious condition that can cause severe pain and spread to other parts of your body.'
                };
                return descriptions[condition] || `${condition.replace('-', ' ')} is a dental condition that requires professional treatment.`;
              };

              // Enhanced treatment descriptions
              const getTreatmentDescription = (treatment: string) => {
                const descriptions: {[key: string]: string} = {
                  'surgical-extraction': 'Surgical extraction involves removing the tooth through a small incision in the gum. This is necessary when a tooth cannot be removed with simple extraction techniques.',
                  'root-canal-treatment': 'Root canal treatment removes infected tissue from inside the tooth, cleans the canals, and seals them to prevent future infection. This saves your natural tooth.',
                  'filling': 'A filling repairs a damaged tooth by removing decay and filling the space with a strong material. This restores the tooth\'s function and prevents further decay.',
                  'crown': 'A crown is a cap that covers the entire tooth to restore its shape, size, and strength. This protects the tooth and improves its appearance.',
                  'bridge': 'A bridge replaces missing teeth by anchoring artificial teeth to neighboring teeth. This restores your smile and prevents other teeth from shifting.',
                  'implant': 'An implant is a titanium post that replaces the tooth root, providing a strong foundation for a replacement tooth that looks and functions like a natural tooth.',
                  'scaling': 'Scaling removes plaque and tartar buildup from below the gum line. This treats gum disease and prevents tooth loss.',
                  'whitening': 'Professional whitening uses safe, effective methods to remove stains and brighten your smile by several shades.'
                };
                return descriptions[treatment] || `${treatment.replace('-', ' ')} is a dental procedure that will effectively treat your condition and restore your oral health.`;
              };

              // Enhanced urgency messaging
              const getUrgencyMessage = (treatment: string, conditions: string[]) => {
                const urgencyMessages: {[key: string]: string} = {
                  'surgical-extraction': 'Delaying extraction can lead to severe pain, infection spreading to other teeth, and potential damage to your jawbone. The longer you wait, the more complex the procedure becomes.',
                  'root-canal-treatment': 'Without treatment, the infection can spread to your jawbone and other parts of your body. Early treatment saves your tooth and prevents the need for extraction.',
                  'filling': 'Untreated cavities grow larger and can reach the nerve, causing severe pain and requiring more extensive treatment like a root canal or extraction.',
                  'crown': 'A damaged tooth without a crown is vulnerable to further damage and infection. This can lead to tooth loss and affect your ability to eat and speak properly.',
                  'bridge': 'Missing teeth cause other teeth to shift, creating gaps and bite problems. This can lead to jaw pain and difficulty eating your favorite foods.',
                  'implant': 'The longer you wait, the more your jawbone shrinks, making implant placement more difficult and potentially requiring bone grafting procedures.',
                  'scaling': 'Untreated gum disease can lead to tooth loss and has been linked to serious health conditions like heart disease and diabetes.',
                  'whitening': 'While not urgent for health, professional whitening gives you immediate confidence and a brighter smile that can improve your personal and professional life.'
                };
                
                const physicalRisks = urgencyMessages[treatment] || 'Delaying treatment can lead to worsening pain, infection, and potentially more complex and expensive procedures in the future.';
                
                // Add aesthetic risks where applicable
                const aestheticRisks = {
                  'cavity': 'Untreated cavities can cause visible discoloration and may eventually lead to tooth loss, creating gaps in your smile.',
                  'missing-tooth': 'Missing teeth can cause your face to look sunken and make you appear older than you are.',
                  'fracture': 'A fractured tooth can be visible when you smile and may cause you to hide your smile.',
                  'decay': 'Visible decay can make you self-conscious about your smile and affect your confidence in social situations.'
                };
                
                const aestheticRisk = conditions.some((c: string) => aestheticRisks[c as keyof typeof aestheticRisks]) ? 
                  ' Additionally, this condition can affect the appearance of your smile and your confidence.' : '';
                
                return physicalRisks + aestheticRisk;
              };

              return `
                <div style="border: 1px solid #ddd; border-left: 4px solid #1e88e5; margin-bottom: 20px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                  <div style="background-color: #ffeb3b; padding: 8px 16px;">
                    <strong style="font-size: 14px;">${treatmentKey.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</strong>
                  </div>
                  <div style="padding: 20px;">
                    <h3 style="font-size: 20px; margin-bottom: 15px;">${treatmentKey.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} for ${conditions.map((c: string) => c.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())).join(', ')}</h3>
                    
                    <p style="margin-bottom: 15px;"><strong>${teethText}</strong> ${teeth.length === 1 ? 'has' : 'have'} ${conditions.map((c: string) => c.replace('-', ' ')).join(', ')} that requires ${treatmentKey.replace('-', ' ')}.</p>
                    
                    <p style="margin-bottom: 15px;"><strong>What This Means:</strong> ${conditions.map((c: string) => getConditionDescription(c)).join(' ')}</p>
                    
                    <p style="margin-bottom: 15px;">
                      <span style="color: #4caf50;">✓</span> <strong>Recommended Treatment:</strong> ${getTreatmentDescription(treatmentKey)}
                    </p>
                    
                    <p style="margin: 15px 0; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
                      <span style="color: #f44336;">⚠️</span> <strong>Urgency:</strong> ${getUrgencyMessage(treatmentKey, conditions)}
                    </p>
                    

                </div>
                </div>
              `;
            }).join('');
          })()}
          </div>

        ${(() => {
          // Debug logging to understand why table might not be showing
          console.log('🔍 Table Generation Debug:', {
            showReplacementTable,
            findingsCount: findings.length,
            allFindings: findings.map(f => ({ tooth: f.tooth, condition: f.condition, treatment: f.treatment })),
            relevantTreatments: findings.filter(f => 
              f.treatment && ['implant-placement', 'crown', 'bridge', 'partial-denture'].includes(f.treatment)
            ).map(f => ({ tooth: f.tooth, condition: f.condition, treatment: f.treatment })),
            clinicPrices: clinicPrices,
            toggleState: showReplacementOptionsTable // Add this to see the actual toggle state
          });
          
          // Only show the table if the toggle is on
          if (!showReplacementTable) {
            console.log('❌ Table not shown: toggle is OFF');
            console.log('❌ Toggle state details:', { showReplacementTable, showReplacementOptionsTable });
            return '';
          }
          
          // Check if there are any relevant replacement treatments
          const relevantTreatments = findings.filter(f => 
            f.treatment && ['implant-placement', 'crown', 'bridge', 'partial-denture'].includes(f.treatment)
          );
          
          if (relevantTreatments.length === 0) {
            console.log('❌ Table not shown: no relevant treatments found');
            console.log('❌ All treatments found:', findings.map(f => f.treatment).filter(Boolean));
            return '';
          }
          
          console.log('✅ Generating unified replacement options table for treatments:', relevantTreatments.map(f => f.treatment));
          
          // Generate the table with all relevant treatments
          return generateReplacementOptionsTable({
            context: 'missing-tooth',
            selectedTreatment: relevantTreatments[0].treatment, // Use first treatment as primary
            clinicPrices: clinicPrices
          });
        })()}

        ${reportImageUrl ? `
          <!-- Annotated X-Ray Section -->
          <div style="padding: 40px 20px; text-align: center;">

            <h3 style="font-size: 24px; margin-bottom: 10px;">Annotated X-Ray Image</h3>
            <p style="color: #666; margin-bottom: 30px;">Below is your panoramic X-ray with AI-generated highlights of all detected conditions.</p>
            
            ${(() => {
              // Only show legend if there are detections
              if (!data.detections || data.detections.length === 0) {
                return '';
              }

              // Define hex colors for each condition type - EXACTLY the same as AIAnalysisSection
              const conditionColors: {[key: string]: string} = {
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

              // Get unique detected conditions
              const uniqueConditions = [...new Set(data.detections.map((detection: any) => detection.class || detection.class_name))] as string[];

              // Normalize condition names to handle different formats - EXACTLY the same as AIAnalysisSection
              const normalizeCondition = (condition: string) => {
                return condition
                  .toLowerCase()
                  .replace(/\s+/g, '-')
                  .replace(/s$/, '')  // Remove plural 's'
                  .replace(/^carie$/, 'caries'); // Special case: restore 'caries' from 'carie'
              };

              // Format condition names for display - EXACTLY the same as AIAnalysisSection
              const formatConditionName = (condition: string) => {
                return condition
                  .replace(/-/g, ' ')
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
              };

              // Generate dynamic legend
              return `
                <!-- Dynamic Legend -->
            <div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 30px; flex-wrap: wrap;">
                  ${uniqueConditions.map((condition: string) => {
                    const normalizedCondition = normalizeCondition(condition);
                    const color = conditionColors[normalizedCondition] || '#666666'; // Default gray if color not found
                    const displayName = formatConditionName(condition);
                    
                    return `
              <div style="display: flex; align-items: center; gap: 5px;">
                        <div style="width: 15px; height: 15px; background-color: ${color}; border-radius: 2px;"></div>
                        <span style="font-size: 14px;">${displayName}</span>
              </div>
                    `;
                  }).join('')}
              </div>
              `;
            })()}
            
            <img src="${reportImageUrl}" alt="Annotated X-ray" style="max-width: 100%; height: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 8px;" />
          </div>
        ` : `
          <!-- No X-Ray Section -->
          <div style="padding: 40px 20px; text-align: center; background-color: #f5f5f5; margin: 20px;">
            <h3 style="font-size: 20px; margin-bottom: 10px; color: #666;">Report Generated Without X-Ray</h3>
            <p style="color: #888; font-size: 14px;">This report was generated based on clinical observations and findings only.</p>
            <p style="color: #888; font-size: 14px;">For a more comprehensive analysis, please upload an X-ray image.</p>
          </div>
        `}
      </div>
      </div>
    `;
    
    console.log('🚀 REPORT GENERATION: Generated HTML length:', htmlContent.length);
    return htmlContent;
  };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Validation based on mode
      if (useXrayMode) {
        if (!uploadedImage || !patientName.trim()) {
          toast({ title: "Missing info", description: "Please upload an OPG and enter patient name." });
          return;
        }
      } else {
        if (!patientName.trim() || (!patientObservations.trim() && findings.filter(f => f.tooth && f.condition && f.treatment).length === 0)) {
          toast({ title: "Missing info", description: "Please enter patient name and either observations or findings." });
          return;
        }
      }

      // Validate findings rows: either all empty, or all required filled
      const invalidIndex = findings.findIndex(f => {
        const toothOk = !!(f.tooth && f.tooth.trim() !== '');
        const condOk = !!(f.condition && f.condition.trim() !== '');
        const treatOk = !!(f.treatment && f.treatment.trim() !== '');
        
        // Special validation for extraction: must have replacement selected
        const replacementOk = f.treatment === 'extraction' ? !!(f.replacement && f.replacement.trim() !== '') : true;
        
        const allEmpty = !toothOk && !condOk && !treatOk;
        const allFilled = toothOk && condOk && treatOk && replacementOk;
        return !(allEmpty || allFilled);
      });
      if (invalidIndex !== -1) {
        // Scroll to the problematic finding card and show a gentle prompt
        const cards = document.querySelectorAll('#findings-list .finding-card');
        const target = cards[invalidIndex] as HTMLElement | undefined;
        if (target && typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.classList.add('ring-2', 'ring-red-400');
          setTimeout(() => target.classList.remove('ring-2', 'ring-red-400'), 2000);
        }
        
        const problematicFinding = findings[invalidIndex];
        let errorMessage = 'Please complete tooth, condition, and treatment (or clear the row).';
        
        if (problematicFinding.treatment === 'extraction' && !problematicFinding.replacement) {
          errorMessage = 'Please select a replacement option for the extraction (or choose "No Replacement").';
        }
        
        toast({ title: 'Incomplete finding', description: errorMessage });
        return;
      }

      // Validate pricing for all treatments
      const validFindings = findings.filter(f => f.tooth && f.condition && f.treatment);
      const treatments = validFindings.map(f => f.treatment);
      const pricingValidation = validatePricing(treatments);
      
      if (!pricingValidation.valid) {
        // Show price validation dialog instead of toast
        setMissingPrices(pricingValidation.missing);
        setPendingSubmitData({ validFindings, useXrayMode, patientName, patientObservations });
        setShowPriceValidation(true);
        return;
      }
      
      // If validation passes, proceed with submit
      await performSubmit({ validFindings, useXrayMode, patientName, patientObservations });
    };
    
    // Function to poll for video status
    const pollForVideoStatus = async (diagnosisId: string) => {
      if (!diagnosisId) {
        console.log('🚀 VIDEO POLLING: No diagnosis ID provided, skipping video polling');
        return;
      }
      
      console.log('🚀 VIDEO POLLING: Starting video status polling for diagnosis:', diagnosisId);
      
      // Check immediately first
      console.log('🚀 VIDEO POLLING: Performing initial video status check...');
      const hasVideo = await checkVideoStatus(diagnosisId);
      if (hasVideo) {
        console.log('🚀 VIDEO POLLING: Video already available, no need to poll');
        return;
      }
      
      console.log('🚀 VIDEO POLLING: Setting up polling interval (every 30 seconds)...');
      // Then set up interval - check every 30 seconds since video takes 3-5 minutes
      const intervalId = setInterval(async () => {
        console.log('🚀 VIDEO POLLING: Polling for video status...');
        const hasVideo = await checkVideoStatus(diagnosisId);
        if (hasVideo) {
          console.log('🚀 VIDEO POLLING: Video found, stopping polling');
          clearInterval(intervalId);
        }
      }, 30000); // Check every 30 seconds (more appropriate for 3-5 min generation)
      
      // Clear interval after 10 minutes (20 * 30000ms = 10 minutes) to account for longer generation time
      setTimeout(() => {
        console.log('🚀 VIDEO POLLING: Polling timeout reached after 10 minutes, clearing interval');
        clearInterval(intervalId);
        // Check one more time before giving up
        checkVideoStatus(diagnosisId).then(hasVideo => {
          if (!hasVideo) {
            console.log('🚀 VIDEO POLLING: Final check - video still not ready after timeout');
            toast({
              title: "Video Generation",
              description: "Video generation is taking longer than expected. You can check back later or try refreshing.",
              variant: "default"
            });
          }
        });
      }, 600000); // 10 minutes timeout
    };

  const handleEditClick = () => {
    setIsEditing(true);
    // Store the original report content as a backup for cancellation
    setOriginalReportBackup(report);
    // Don't set editedReport here - let the contentEditable div work with the current report
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    if (reportRef.current) {
      const newContent = reportRef.current.innerHTML;
      setReport(newContent);
      addVersion(newContent, "Manual Edit", "Dentist manually edited the report");
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Restore the original report content from backup
    if (originalReportBackup) {
      setReport(originalReportBackup);
    }
    toast({
      title: "Changes Cancelled",
      description: "Report reverted to its original state.",
      variant: "default"
    });
  };

  // Speech-to-text for AI suggestion
  const handleMicClick = () => {
    if (!('webkitSpeechRecognition' in window)) {
      toast({ title: "Speech Recognition not supported", description: "Try Chrome or a compatible browser." });
      return;
    }
    if (isListening) {
      recognition && recognition.stop();
      setIsListening(false);
      return;
    }
    // @ts-ignore
    recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;  // Keep listening continuously
    recognition.interimResults = true;  // Get real-time results
    recognition.lang = 'en-US';
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      
      // Process all results for continuous speech
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        }
      }
      
      // Update with accumulated speech (don't stop listening)
      if (finalTranscript) {
        setAiSuggestion(prev => prev + finalTranscript);
      }
      // Keep listening - don't set isListening to false
    };
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // Don't stop on no-speech errors, just keep listening
        return;
      }
      setIsListening(false);
    };
    recognition.onend = () => {
      // Only stop if user explicitly stopped listening
      if (isListening) {
        // Restart if it ended unexpectedly
        try {
          recognition.start();
        } catch (e) {
          console.log('Restarting speech recognition...');
        }
      }
    };
    recognition.start();
    setIsListening(true);
  };

  const handleAiSuggest = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!report || !aiSuggestion.trim()) {
      toast({ title: "Missing info", description: "Type or speak a change request." });
      return;
    }
    setIsAiLoading(true);
    try {
      console.log('🤖 AI SUGGEST: Starting AI suggestion request...');
      console.log('🤖 AI SUGGEST: Request payload:', {
        previous_report_html_length: report.length,
        change_request_text: aiSuggestion
      });
      
      const data = await api.applyAiSuggestions(report, aiSuggestion);
      
      console.log('🤖 AI SUGGEST: Response data:', data);
      
      if (!data.updated_html) {
        throw new Error('No updated HTML received from AI service');
      }
      
      setReport(data.updated_html);
      // Don't clear the backup - keep it as the original state for future edits
      setAiSuggestion("");
      addVersion(data.updated_html, "AI Edit", aiSuggestion);
      
      toast({
        title: "Success",
        description: "AI suggestions applied successfully!",
      });
    } catch (error) {
      console.error('🤖 AI SUGGEST: Error details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({ 
        title: "AI Suggestion Failed", 
        description: `Error: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const addVersion = (html: string, type: string, summary: string) => {
    setHistory(prev => [...prev, { html, timestamp: new Date().toLocaleString(), type, summary }]);
    setAuditTrail(prev => [
      { action: `${type}: ${summary}`, timestamp: new Date().toLocaleString() },
      ...prev
    ]);
  };

  useEffect(() => {
    if (report && history.length === 0) {
      addVersion(report, "Initial", "First AI-generated report");
    }
  }, [report]);

  // Auto-resize textarea when aiSuggestion changes (especially for speech dictation)
  useEffect(() => {
    const textarea = document.querySelector('textarea[placeholder="Type or speak your change request..."]') as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [aiSuggestion]);

  const handleUndo = () => {
    if (history.length > 1) {
      const prev = history[history.length - 2];
      setReport(prev.html);
      // Update the backup to the new current state for future edits
      setOriginalReportBackup(prev.html);
      setHistory(h => h.slice(0, -1));
      setAuditTrail(prevTrail => [
        { action: "Undo to previous version", timestamp: new Date().toLocaleString() },
        ...prevTrail
      ]);
    }
  };

  const handleRestoreVersion = (idx: number) => {
    setReport(history[idx].html);
    // Update the backup to the new current state for future edits
    setOriginalReportBackup(history[idx].html);
    setHistory(h => h.slice(0, idx + 1));
    setShowHistory(false);
    setAuditTrail(prevTrail => [
      { action: `Restored version from ${history[idx].timestamp}`, timestamp: new Date().toLocaleString() },
      ...prevTrail
    ]);
  };

  const downloadFile = (content: string, type: string, filename: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload = (format: 'html' | 'txt') => {
    if (!report) return;
    if (format === 'html') downloadFile(report, 'text/html', 'treatment-report.html');
    if (format === 'txt') downloadFile(report.replace(/<[^>]+>/g, ''), 'text/plain', 'treatment-report.txt');
  };

  const handleDownloadPDF = () => {
    if (!report) return;
    
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Dental Report - ${patientName}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .report-container { max-width: 800px; margin: 0 auto; }
              h2, h3, h4 { color: #333; }
              img { max-width: 100%; height: auto; display: block; margin: 20px 0; }
              .treatment-stage { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px; }
              ul { margin: 10px 0; }
              li { margin: 5px 0; }
              @media print {
                body { margin: 0; }
                .report-container { max-width: 100%; }
              }
            </style>
          </head>
          <body>
            ${report}
          </body>
        </html>
      `);
      printWindow.document.close();
      
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    }
  };

  useEffect(() => {
    const handler = () => {
      setFindings(prev => {
        if (prev.length === 0) return prev;
        const f = prev[0];
        const isEmpty = (!f.tooth || f.tooth.trim() === '') && (!f.condition || f.condition.trim() === '') && (!f.treatment || f.treatment.trim() === '') && (f.price === undefined);
        return isEmpty ? prev.slice(1) : prev;
      });
    };
    window.addEventListener('remove-empty-finding-placeholder', handler as EventListener);
    return () => window.removeEventListener('remove-empty-finding-placeholder', handler as EventListener);
  }, []);

  // Check for existing video URL when component mounts
  useEffect(() => {
    const checkExistingVideo = async () => {
      // If we have a report but no video URL, try to check if video was generated
      if (report && !videoUrl) {
        console.log('🚀 COMPONENT MOUNT: Checking for existing video URL...');
        
        // Note: Video status checking is now handled by the video generation endpoint
        console.log('🚀 COMPONENT MOUNT: Video status checking handled by backend');
      }
    };
    
    checkExistingVideo();
  }, [report, videoUrl]);
  
  // Function to refresh video status when switching to video tab
  const handleVideoTabClick = async () => {
    if (!videoUrl && report) {
      console.log('🚀 VIDEO TAB: Video tab clicked, checking for video availability...');
      
      // Note: Video status checking is now handled by the backend
      console.log('🚀 VIDEO TAB: Video status checking handled by backend');
      toast({
        title: "Video Status",
        description: "Video generation is in progress. Please wait a few minutes or check back later.",
        variant: "default"
      });
    }
  };

  // Function to send report to patient via email
  const handleSendReportToPatient = async () => {
    if (!patientEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter the patient's email address.",
        variant: "destructive"
      });
      return;
    }

    if (!report) {
      toast({
        title: "Report Required",
        description: "No report content available to send.",
        variant: "destructive"
      });
      return;
    }

    setIsSendingEmail(true);
    
    try {
      // Send preview report using the new API endpoint
      const result = await api.sendPreviewReportToPatient({
        patientEmail: patientEmail.trim(),
        patientName: patientName || 'Patient',
        reportContent: report,
        findings: findings || [],
        annotatedImageUrl: originalImageUrl || immediateAnalysisData?.annotated_image_url
      });
      
      if (result.success) {
        toast({
          title: "Report Sent!",
          description: `Dental report has been sent to ${patientEmail}`,
        });
        setPatientEmail(''); // Clear the email input
      } else {
        throw new Error(result.error || 'Failed to send report');
      }
      
    } catch (error) {
      console.error('Error sending report:', error);
      toast({
        title: "Send Failed",
        description: "Failed to send report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Function to generate consultation using Heygen service
  const handleGenerateConsultation = async () => {
    if (!report) return;
    
    setIsGeneratingConsultation(true);
    
    try {
      // Extract treatment plan and findings from report data
      const treatmentPlan = report || 'Treatment plan not available';
      const findings = 'Dental findings from X-ray analysis'; // This would come from the actual findings data
      
      const consultationRequest = {
        reportId: 'preview', // Since this is preview mode
        patientName: patientName || 'Patient',
        treatmentPlan,
        findings
      };
      
      console.log('🎭 Generating consultation for:', consultationRequest);
      
      // Generate consultation URL using Heygen service
      const result = await heygenService.generateConsultationUrl(consultationRequest);
      
      if (result.success && result.consultationUrl) {
        // Open consultation in new tab
        window.open(result.consultationUrl, '_blank');
        
        toast({
          title: "Consultation Ready!",
          description: "Your personalized interactive consultation has been created and opened in a new tab.",
        });
      } else {
        throw new Error(result.error || 'Failed to generate consultation');
      }
      
    } catch (error) {
      console.error('Error generating consultation:', error);
      toast({
        title: "Consultation Failed",
        description: "Failed to generate consultation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingConsultation(false);
    }
  };
  
  // Helper function to check video status (extracted from pollForVideoStatus)
  const checkVideoStatus = async (diagnosisId: string): Promise<boolean> => {
    try {
      const token = await api.getAuthToken();
      console.log('🚀 VIDEO CHECK: Checking video status for diagnosis:', diagnosisId);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/diagnosis/${diagnosisId}/video-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        console.error('🚀 VIDEO CHECK: Failed to check video status:', response.status, response.statusText);
        throw new Error('Failed to check video status');
      }
      
      const data = await response.json();
      console.log('🚀 VIDEO CHECK: Video status response:', data);
      
      if (data.has_video && data.video_url) {
        console.log('🚀 VIDEO CHECK: Video is ready! Setting video URL:', data.video_url);
        setVideoUrl(data.video_url);
        
        toast({
          title: "Video Ready! 🎥",
          description: "Patient education video has been generated successfully!",
        });
        return true;
      } else {
        console.log('🚀 VIDEO CHECK: Video not ready yet. Status:', data.status);
        return false;
      }
    } catch (error) {
      console.error('🚀 VIDEO CHECK: Error checking video status:', error);
      
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                Scanwise
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ViewInBulgarian />
            <LanguageSelector />
            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.nav.dashboard}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create New Report
            </h1>
            <p className="text-gray-600">
              Upload a panoramic X-ray (OPG) to generate an AI-enhanced treatment report
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Mode Toggle Section - Only show before AI analysis is complete */}
            {!immediateAnalysisData && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Brain className="mr-2 h-5 w-5" />
                      {t.createReport.title}
                    </span>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="xray-mode" className="text-sm font-normal">
                        {useXrayMode ? "With X-ray" : "Without X-ray"}
                      </Label>
                      <Switch
                        id="xray-mode"
                        checked={useXrayMode}
                        onCheckedChange={setUseXrayMode}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </div>
                  </CardTitle>
                  <CardDescription>
                    {useXrayMode
                      ? "Generate report with AI analysis of uploaded X-ray image"
                      : "Generate report based on manual observations and findings only"}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {/* Upload Section - Only show when useXrayMode is true and no report */}
            {useXrayMode && !report && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileImage className="mr-2 h-5 w-5" />
                    {t.createReport.uploadXray}
                  </CardTitle>
                  <CardDescription>
                    Upload the patient's panoramic X-ray for AI analysis and treatment planning
                  </CardDescription>
                </CardHeader>
                <CardContent>
                {!uploadedImage ? (
                  <div 
                    className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 ${
                      isDragOver 
                        ? 'border-blue-500 bg-blue-50 scale-105' 
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
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
                        {isDragOver && (
                          <p className="text-blue-600 font-medium mt-2">
                            Drop your file here to upload
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        Supports: DICOM, JPEG, PNG, TIFF (Max 50MB)
                      </p>
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
                      <div className={`flex items-center justify-between p-4 ${isProcessing ? 'opacity-50' : ''} bg-green-50 border border-green-200 rounded-lg transition-opacity`}>
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

                                             {/* Full-Screen AI Analysis Loading Modal */}
                      {isAnalyzingImage && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
                            <div className="text-center">
                              <div className="relative inline-flex">
                                <Brain className="w-16 h-16 text-blue-600" />
                                <div className="absolute inset-0 w-16 h-16 bg-blue-600/20 rounded-full animate-ping" />
                              </div>
                              <h3 className="text-xl font-semibold mt-4 mb-2">AI Analyzing X-ray</h3>
                              <p className="text-gray-600 mb-6">Processing your X-ray with advanced AI...</p>
                              
                              {/* Progress Bar */}
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

                      {/* Enhanced Loading Animation with Real Progress */}
                      {isProcessing && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
                            <div className="text-center">
                              <div className="relative inline-flex">
                                <Brain className="w-16 h-16 text-blue-600" />
                                <div className="absolute inset-0 w-16 h-16 bg-blue-600/20 rounded-full animate-ping" />
                              </div>
                              <h3 className="text-xl font-semibold mt-4 mb-2">Generating Treatment Report</h3>
                              <p className="text-gray-600 mb-6">Creating comprehensive treatment plan</p>
                              
                              {/* Single Dynamic Progress Bar */}
                              <div className="space-y-4">
                                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                  <div 
                                    className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${reportProgress}%` }}
                                  />
                                </div>
                                
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-blue-600 font-medium">{reportProgress}%</span>
                                  <span className="text-gray-600">Complete</span>
                                </div>
                                
                                {/* Current Step Text */}
                                {reportProgressText && (
                                  <div className="text-sm text-gray-700 mt-3">
                                    {reportProgressText}
                                  </div>
                                )}
                              </div>
                              
                              <div className="mt-6 flex items-center justify-center text-sm text-gray-500">
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                This may take up to 2 minutes...
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>





                    {/* UNIFIED AI Analysis Section - Single source of truth */}
                    {immediateAnalysisData && !isAnalyzingImage && !isProcessing && !report && (
                      <AIAnalysisSection
                        findingsSummary={immediateAnalysisData.findings_summary}
                        detections={immediateAnalysisData.detections}
                        annotatedImageUrl={immediateAnalysisData.annotated_image_url}
                        onAcceptFinding={handleAcceptAIFinding}
                        onRejectFinding={handleRejectAIFinding}
                        // Tooth numbering overlay props
                        showToothNumberOverlay={showToothNumberOverlay}
                        setShowToothNumberOverlay={setShowToothNumberOverlay}
                        textSizeMultiplier={textSizeMultiplier}
                        setTextSizeMultiplier={setTextSizeMultiplier}
                        isUpdatingTextSize={isUpdatingTextSize}
                        originalImageUrl={originalImageUrl}
                        setImmediateAnalysisData={setImmediateAnalysisData}
                      />
                    )}



                    {/* Patient Name Input - Only show if no report and not analyzing */}
                    {!report && !isAnalyzingImage && (
                      <div className={`mt-4 ${isProcessing ? 'opacity-50 pointer-events-none' : ''} transition-opacity`}>
                        <label className="block font-medium text-blue-900 mb-1">{t.createReport.patientName}</label>
                        <Input
                          value={patientName}
                          onChange={e => setPatientName(e.target.value)}
                          placeholder={t.createReport.patientNamePlaceholder}
                          required
                          disabled={isProcessing}
                        />
                      </div>
                    )}



                    {/* Enhanced Findings Table - Only show if no report and not analyzing */}
                    {!report && !isAnalyzingImage && (
                      <div className={`mt-6 ${isProcessing ? 'opacity-50 pointer-events-none' : ''} transition-opacity`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <span className="font-medium text-blue-900">Manual Findings Entry</span>
                            {immediateAnalysisData && (
                              <Badge variant="outline" className="bg-blue-50">
                                {immediateAnalysisData.detections?.length || 0} AI suggestions available above
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Label htmlFor="show-pricing" className="text-sm font-medium text-gray-700">
                                {t.createReport.showTreatmentPricing}
                              </Label>
                              <Switch
                                id="show-pricing"
                                checked={showTreatmentPricing}
                                onCheckedChange={(checked) => {
                                  setShowTreatmentPricing(checked);
                                  localStorage.setItem('showTreatmentPricing', checked.toString());
                                }}
                                className="data-[state=checked]:bg-blue-600"
                              />
                            </div>
                            <Button type="button" variant="outline" onClick={addFinding} size="sm" disabled={isProcessing}>
                              + {t.createReport.addFinding}
                            </Button>
                          </div>
                        </div>
                        
                        <div id="findings-list" className="space-y-4">
                        {findings.map((f, idx) => {
                          const isMissingTooth = normalizeConditionName(f.condition) === 'missing-tooth';
                          return (
                          <Card key={idx} className="p-4 finding-card relative">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              {/* Tooth Number */}
                              <div className="space-y-2">
                                <div className="flex items-center space-x-1">
                                  <Label className="text-sm font-medium">{t.createReport.tooth} ({toothNumberingSystem})</Label>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 text-gray-400 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="space-y-2">
                                        <p>You can change between FDI or Universal in settings.</p>
                                        <a 
                                          href="/settings" 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-700 underline"
                                        >
                                          Open Settings
                                        </a>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <SearchableSelect
                                  options={getToothOptions(toothNumberingSystem)}
                                  value={f.tooth}
                                  onValueChange={(value) => handleFindingChange(idx, "tooth", value)}
                                  placeholder={t.createReport.selectTooth}
                                  searchPlaceholder="Search tooth number..."
                                  disabled={isProcessing}
                                />
                              </div>

                              {/* Condition */}
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">{t.createReport.condition}</Label>
                                <SearchableSelect
                                  options={ALL_CONDITIONS}
                                  value={f.condition}
                                  onValueChange={(value) => handleFindingChange(idx, "condition", value)}
                                  placeholder={t.createReport.selectCondition}
                                  searchPlaceholder="Search conditions..."
                                  disabled={isProcessing}
                                />
                              </div>

                              {/* Treatment */}
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">{t.createReport.treatment}</Label>
                                <SearchableSelect
                                  options={f.condition ? getSuggestedTreatments(f.condition) : ALL_TREATMENTS}
                                  value={f.treatment}
                                  onValueChange={(value) => handleFindingChange(idx, "treatment", value)}
                                  placeholder={t.createReport.selectTreatment}
                                  searchPlaceholder="Search treatments..."
                                  disabled={isProcessing}
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

                                {/* Remove Button / Toggle Column */}
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
                                    {t.common.remove}
                                  </Button>


                                </div>
                              </div>

                              {/* Pricing Input */}
                              {f.treatment && showTreatmentPricing && (
                                <div className="mt-4 pt-4 border-t">
                                  <Label className="text-sm font-medium mb-2 block">Treatment Pricing</Label>
                                  <PricingInput
                                    treatment={f.treatment}
                                    value={f.price}
                                    onChange={(price) => handleFindingChange(idx, "price", price)}
                                    clinicPrices={clinicPrices}
                                    onPriceSave={handlePriceSave}
                                    disabled={isProcessing}
                                  />
                                </div>
                              )}
                          </Card>
                          )})}
                        </div>
                      </div>
                    )}

                    {/* Unified Replacement Options Toggle - Only show when relevant treatments exist */}
                    {(() => {
                      // Check if any findings have relevant replacement treatments
                      const hasReplacementTreatments = findings.some(f => 
                        f.treatment && ['implant-placement', 'crown', 'bridge', 'partial-denture'].includes(f.treatment)
                      );
                      
                      if (!hasReplacementTreatments) return null;
                      
                      return (
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="replacement-options-toggle" className="text-sm font-medium text-blue-900">
                                🦷 Replacement Options Comparison
                              </Label>
                              <p className="text-xs text-blue-700 mt-1">
                                Include a comprehensive comparison table for all replacement treatments in your report
                              </p>
                            </div>
                            <Switch
                              id="replacement-options-toggle"
                              checked={showReplacementOptionsTable}
                              onCheckedChange={(checked) => {
                                setShowReplacementOptionsTable(checked);
                                localStorage.setItem('showReplacementOptionsTable', checked.toString());
                              }}
                              className="data-[state=checked]:bg-blue-600"
                            />
                          </div>
                        </div>
                      );
                    })()}



                    {/* Submit Button - Only show if no report */}
                    {!report && (
                      <div className="flex justify-center mt-8">
                        <Button 
                          size="lg"
                          type="submit"
                          disabled={isProcessing}
                          className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-lg px-8 py-4"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              {t.createReport.analyzing}...
                            </>
                          ) : (
                            <>
                              <Brain className="mr-2 h-5 w-5" />
                              {t.createReport.generateReport}
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {/* Upload Guidelines - Only show when no report */}
            {!report && (
              <Card className="mb-8">
              <CardHeader>
                <CardTitle>Upload Guidelines</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Image Quality Requirements</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• High resolution (minimum 1200x800 pixels)</li>
                      <li>• Clear visibility of all teeth and surrounding structures</li>
                      <li>• Minimal motion artifacts or blur</li>
                      <li>• Proper exposure and contrast</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">What's Included</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• AI-powered dental condition detection</li>
                      <li>• Comprehensive treatment plan</li>
                      <li>• Patient-friendly video explanation</li>
                      <li>• Downloadable reports in multiple formats</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
            )}

            {/* Observations Section - Only show when useXrayMode is false and no report */}
            {!useXrayMode && !report && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Patient Observations
                  </CardTitle>
                  <CardDescription>
                    Enter your clinical observations and notes about the patient's dental condition
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={`space-y-4 ${isProcessing ? 'opacity-50 pointer-events-none' : ''} transition-opacity`}>
                    <div>
                      <Label htmlFor="patient-name-no-xray" className="block font-medium text-blue-900 mb-1">
                        Patient Name
                      </Label>
                      <Input
                        id="patient-name-no-xray"
                        value={patientName}
                        onChange={e => setPatientName(e.target.value)}
                        placeholder="Enter patient name"
                        required
                        disabled={isProcessing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="observations" className="block font-medium text-blue-900 mb-1">
                        {t.createReport.clinicalObservations}
                      </Label>
                      <Textarea
                        id="observations"
                        value={patientObservations}
                        onChange={e => setPatientObservations(e.target.value)}
                        placeholder={t.createReport.clinicalObservationsPlaceholder}
                        rows={6}
                        className="w-full"
                        disabled={isProcessing}
                      />
                    </div>
                  </div>

                  {/* Manual Findings for Non-X-ray Mode */}
                  <div className={`mt-6 ${isProcessing ? 'opacity-50 pointer-events-none' : ''} transition-opacity`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-medium text-blue-900">Manual Findings</span>
                      <Button type="button" variant="outline" onClick={addFinding} size="sm" disabled={isProcessing}>
                        + {t.createReport.addFinding}
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      {findings.map((f, idx) => {
                        const isMissingTooth = normalizeConditionName(f.condition) === 'missing-tooth';
                        return (
                        <Card key={idx} className="p-4 relative">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Tooth Number */}
                            <div className="space-y-2">
                              <div className="flex items-center space-x-1">
                                <Label className="text-sm font-medium">{t.createReport.tooth} ({toothNumberingSystem})</Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3 w-3 text-gray-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="space-y-2">
                                      <p>You can change between FDI or Universal in settings.</p>
                                                                              <a 
                                          href="/settings" 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-700 underline"
                                        >
                                          Open Settings
                                        </a>
                                    </div>
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
                            <div className="space-y-2">
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
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Treatment</Label>
                              <SearchableSelect
                                options={f.condition ? getSuggestedTreatments(f.condition) : ALL_TREATMENTS}
                                value={f.treatment}
                                onValueChange={(value) => handleFindingChange(idx, "treatment", value)}
                                placeholder="Select treatment"
                                searchPlaceholder="Search treatments..."
                                disabled={isProcessing}
                              />
                            </div>

                            {/* Remove Button / Toggle Column */}
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

                          {/* Pricing Input */}
                          {f.treatment && showTreatmentPricing && (
                            <div className="mt-4 pt-4 border-t">
                              <Label className="text-sm font-medium mb-2 block">Treatment Pricing</Label>
                              <PricingInput
                                treatment={f.treatment}
                                value={f.price}
                                onChange={(price) => handleFindingChange(idx, "price", price)}
                                clinicPrices={clinicPrices}
                                onPriceSave={handlePriceSave}
                                disabled={isProcessing}
                              />
                            </div>
                          )}
                        </Card>
                      )})}
                    </div>
                  </div>



                  {/* Submit Button for Non-X-ray Mode */}
                  <div className="flex justify-center mt-8">
                    <Button
                      size="lg"
                      type="submit"
                      disabled={isProcessing}
                      className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-lg px-8 py-4"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Generating Report...
                        </>
                      ) : (
                        <>
                          <Brain className="mr-2 h-5 w-5" />
                          Generate Treatment Report
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Full-Screen Loading Modal for Non-X-ray Mode */}
                  {isProcessing && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                      <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
                        <div className="text-center">
                          <div className="relative inline-flex">
                            <Brain className="w-16 h-16 text-blue-600" />
                            <div className="absolute inset-0 w-16 h-16 bg-blue-600/20 rounded-full animate-ping" />
                          </div>
                          <h3 className="text-xl font-semibold mt-4 mb-2">Generating Treatment Report</h3>
                          <p className="text-gray-600 mb-6">Creating comprehensive treatment plan</p>
                          
                          {/* Single Dynamic Progress Bar */}
                          <div className="space-y-4">
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${reportProgress}%` }}
                              />
                            </div>
                            
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-blue-600 font-medium">{reportProgress}%</span>
                              <span className="text-gray-600">Complete</span>
                            </div>
                            
                            {/* Current Step Text */}
                            {reportProgressText && (
                              <div className="text-sm text-gray-700 mt-3">
                                {reportProgressText}
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-6 flex items-center justify-center text-sm text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            This may take up to 2 minutes...
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            </form>

            
                    {/* Report Display Section - Clean without duplicate confidence scores */}
                    {report && (
                      <Card className="mt-8 bg-white border-blue-200">
                        <CardHeader>
                          <CardTitle className="text-blue-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <span>Generated Treatment Report</span>
                            <div className="flex flex-wrap gap-2">
                              <Button type="button" size="sm" variant="outline" onClick={handleUndo} disabled={history.length <= 1}>
                                Undo
                              </Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => setShowHistory(h => !h)} disabled={history.length <= 1}>
                                History
                              </Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => handleDownload('html')}>
                                HTML
                              </Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => handleDownload('txt')}>
                                TXT
                              </Button>
                              <Button type="button" size="sm" variant="outline" onClick={handleDownloadPDF}>
                                PDF
                              </Button>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                              <TabsTrigger value="report" className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Written Report
                              </TabsTrigger>
                              <TabsTrigger value="video" className="flex items-center gap-2" onClick={handleVideoTabClick}>
                                <Video className="w-4 h-4" />
                                Patient Video (Loading...)
                              </TabsTrigger>
                            </TabsList>

                            {/* Report Tab - Cleaned up, no duplicate confidence scores */}
                            <TabsContent value="report" className="mt-4">
                              <div className="relative">
                                {/* Loading overlay for AI */}
                                {isAiLoading && (
                                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 backdrop-blur-sm">
                                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                                  </div>
                                )}
                                
                                {isEditing ? (
                                  <div
                                    ref={reportRef}
                                    className="border rounded p-4 min-h-[120px] bg-gray-50 focus:outline-blue-400 outline outline-2"
                                    contentEditable={true}
                                    suppressContentEditableWarning={true}
                                    dangerouslySetInnerHTML={{ __html: report }}
                                    style={{ overflowX: 'auto', wordBreak: 'break-word' }}
                                  />
                                ) : (
                                  <div
                                    ref={reportRef}
                                    className="border rounded p-4 min-h-[120px] bg-gray-50"
                                    dangerouslySetInnerHTML={{ __html: report }}
                                    style={{ overflowX: 'auto', wordBreak: 'break-word' }}
                                  />
                                )}
                                
                                {/* Edit/Save buttons */}
                                {!isEditing ? (
                                  <Button className="mt-3" type="button" onClick={handleEditClick} disabled={isAiLoading}>
                                    Edit Report
                                  </Button>
                                ) : (
                                  <div className="flex gap-3 mt-3">
                                    <Button type="button" onClick={handleSaveEdit}>
                                    Save Changes
                                  </Button>
                                    <Button variant="outline" type="button" onClick={handleCancelEdit}>
                                      <RefreshCw className="w-4 h-4 mr-2" />
                                      Cancel Changes
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </TabsContent>

                            {/* Video Tab */}
                            <TabsContent value="video" className="mt-4">
                              {videoUrl ? (
                                <div className="space-y-4">
                                  <div className="bg-gray-900 rounded-lg overflow-hidden">
                                    <video 
                                      controls 
                                      className="w-full"
                                      poster={report.match(/src="([^"]+)"/)?.[1] || ''}
                                    >
                                      <source src={videoUrl} type="video/mp4" />
                                      Your browser does not support the video tag.
                                    </video>
                                  </div>
                                  <div className="bg-blue-50 p-4 rounded-lg">
                                    <h4 className="font-semibold text-blue-900 mb-2">About This Video</h4>
                                    <p className="text-sm text-blue-700">
                                      This personalized video explains the X-ray findings in an easy-to-understand way. 
                                      It includes voice narration and subtitles to help patients understand their dental conditions and treatment options.
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button 
                                      variant="outline" 
                                      onClick={() => window.open(videoUrl, '_blank')}
                                      className="flex items-center gap-2"
                                    >
                                      <Play className="w-4 h-4" />
                                      Open in New Tab
                                    </Button>
                                    <Button 
                                      variant="outline"
                                      onClick={() => {
                                        const a = document.createElement('a');
                                        a.href = videoUrl;
                                        a.download = `patient-video-${patientName.replace(/\s+/g, '-')}.mp4`;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                      }}
                                    >
                                      Download Video
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-12">
                                  <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                  <p className="text-gray-600 mb-2">No video available</p>
                                  <p className="text-sm text-gray-500 mb-4">Generate a report with X-ray analysis to create a patient education video.</p>
                                </div>
                              )}
                            </TabsContent>
                          </Tabs>

                          {/* Send Report to Patient - Prominent Section */}
                          <div className="mt-8 border-t pt-6">
                            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                      <Mail className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                      <h3 className="text-lg font-semibold text-green-900">Send Report to Patient</h3>
                                      <p className="text-sm text-green-700">
                                        Send this completed dental report directly to your patient's email
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-3">
                                    <input
                                      type="email"
                                      value={patientEmail}
                                      onChange={(e) => setPatientEmail(e.target.value)}
                                      placeholder="patient@example.com"
                                      className="px-4 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent w-64"
                                    />
                                    <Button
                                      onClick={handleSendReportToPatient}
                                      disabled={isSendingEmail || !patientEmail.trim()}
                                      className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 px-6"
                                    >
                                      {isSendingEmail ? (
                                        <>
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                          Sending...
                                        </>
                                      ) : (
                                        <>
                                          <Send className="w-4 h-4" />
                                          Send Report
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Interactive Avatar Consultation - New Section */}
                          <div className="mt-6">
                            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                      <MessageCircle className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                      <h3 className="text-lg font-semibold text-blue-900">Interactive AI Consultation Preview</h3>
                                      <p className="text-sm text-blue-700">
                                        This is the interactive avatar that will be linked in the patient report. You can preview talking to it by clicking here.
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-3">
                                    <div className="text-right mr-4">
                                      <p className="text-sm text-blue-600 font-medium">Available 24/7</p>
                                      <p className="text-xs text-blue-500">Personalized responses</p>
                                    </div>
                                    <Button
                                      onClick={handleGenerateConsultation}
                                      disabled={isGeneratingConsultation}
                                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex items-center gap-2 px-6"
                                    >
                                      {isGeneratingConsultation ? (
                                        <>
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                          Generating...
                                        </>
                                      ) : (
                                        <>
                                          <MessageCircle className="w-4 h-4" />
                                          Preview Avatar
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* AI Suggestion Section - Only show in report tab */}
                          {activeTab === "report" && (
                            <div className="mt-8 border-t pt-8">
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2">
                                <label className="font-medium text-blue-900">AI-Powered Report Editing</label>
                              </div>
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <textarea
                                  value={aiSuggestion}
                                  onChange={e => {
                                    setAiSuggestion(e.target.value);
                                    // Auto-resize the textarea
                                    e.target.style.height = 'auto';
                                    e.target.style.height = e.target.scrollHeight + 'px';
                                  }}
                                  placeholder="Type or speak your change request..."
                                  disabled={isAiLoading}
                                  className="flex-1 min-h-[40px] px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-hidden"
                                  style={{ height: '40px' }}
                                  onInput={e => {
                                    // Ensure height adjusts on input (for speech dictation)
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = target.scrollHeight + 'px';
                                  }}
                                />
                                <Button type="button" variant={isListening ? "secondary" : "outline"} onClick={handleMicClick} disabled={isAiLoading}>
                                  <Mic className={isListening ? "animate-pulse text-red-500" : ""} />
                                </Button>
                                                <Button type="button" onClick={handleAiSuggest} disabled={isAiLoading || !aiSuggestion.trim()}>
                                  Apply Changes
                                </Button>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Example: "Make the summary more concise" or "Add a section about oral hygiene recommendations"
                              </div>
                            </div>
                          )}

                          {/* Version History Modal */}
                          {showHistory && (
                            <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
                              <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 overflow-auto max-h-[80vh]">
                                <h2 className="text-lg font-bold mb-4">Version History</h2>
                                <ul className="space-y-3">
                                  {history.map((v, idx) => (
                                    <li key={idx} className="border rounded p-3 flex flex-col gap-1">
                                      <div className="flex justify-between items-center">
                                        <span className="font-medium">{v.type}</span>
                                        <span className="text-xs text-gray-500">{v.timestamp}</span>
                                      </div>
                                      <p className="text-sm text-gray-600">{v.summary}</p>
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => handleRestoreVersion(idx)} 
                                        className="w-full mt-2"
                                      >
                                        Restore this version
                                      </Button>
                                    </li>
                                  ))}
                                </ul>
                                <Button className="mt-4 w-full" onClick={() => setShowHistory(false)}>Close</Button>
                              </div>
                            </div>
                          )}

                          {/* Audit Trail */}
                          <div className="mt-8 border-t pt-6">
                            <h3 className="font-semibold text-blue-900 mb-2">Audit Trail</h3>
                            <ul className="text-xs text-gray-700 space-y-1 max-h-32 overflow-auto border rounded p-3 bg-gray-50">
                              {auditTrail.length === 0 ? (
                                <li className="text-gray-500 italic">No changes recorded yet</li>
                              ) : (
                                auditTrail.map((entry, idx) => (
                                  <li key={idx} className="border-b last:border-0 py-1 flex justify-between">
                                    <span>{entry.action}</span>
                                    <span className="text-gray-400">{entry.timestamp}</span>
                                  </li>
                                ))
                              )}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    )}
        </div>
      </div>
      
      {/* Price Validation Dialog */}
      <PriceValidationDialog
        open={showPriceValidation}
        onOpenChange={setShowPriceValidation}
        missingPrices={missingPrices}
        onPricesProvided={handlePricesProvided}
        onCancel={handlePriceValidationCancel}
      />
    </div>
  );
};

export default CreateReport;
    