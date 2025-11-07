// import { useState, useRef, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { useNavigate } from "react-router-dom";
// import { Brain, ArrowLeft, ArrowRight, Upload, Camera, FileImage, Loader2, Mic, FileText, Video, Play, ToggleLeft, ToggleRight, Settings, Info, RefreshCw, Mail, Send, MessageCircle, Edit3 } from "lucide-react";
// import { useToast } from "@/hooks/use-toast";
// import { Input } from "@/components/ui/input";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Switch } from "@/components/ui/switch";
// import { Label } from "@/components/ui/label";
// import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
// import { Textarea } from "@/components/ui/textarea";
// import { SearchableSelect } from "@/components/ui/searchable-select";
// import { PricingInput } from "@/components/PricingInput";
// import { useTreatmentSettings } from "@/hooks/useTreatmentSettings";
// import { PriceValidationDialog } from "@/components/PriceValidationDialog";
// import { useClinicBranding } from "@/components/ClinicBranding";
// import { AIAnalysisSection } from '@/components/AIAnalysisSection';
// import { LanguageSelector } from '@/components/LanguageSelector';
// import { ViewInBulgarian } from '@/components/ViewInBulgarian';
// import { useTranslation } from '@/contexts/TranslationContext';
// import { api } from '@/services/api';
// import { Clock, RotateCcw } from "lucide-react";
// import { generateReplacementOptionsTable } from '@/lib/replacementOptionsTemplate';
// import {
//   ToothNumberingSystem,
//   getToothOptions,
//   getReplacementOptions,
//   getSuggestedTreatments
// } from '@/data/dental-data';
// import { useDentalData } from '@/hooks/useDentalData';
// import './CreateReport.css';

// // Stage Editor imports
// import { StageEditorModal, useFeatureFlag, deserializeStages, serializeStages, findingsToTreatmentItems, generateId, createDynamicStages, getFindingUrgency, getTreatmentDurationFromMapping } from '@/features/stage-editor';

// const CreateReport = () => {
//   const navigate = useNavigate();
//   const { toast } = useToast();
//   const { t, translateCondition, translateTreatment } = useTranslation();
//   const { settings: treatmentSettings, updateTreatmentSetting, saveChanges, getTreatmentSetting, isLoading: treatmentSettingsLoading } = useTreatmentSettings();
//   const { applyBrandingToReport } = useClinicBranding();
//   const { conditions: ALL_CONDITIONS, treatments: ALL_TREATMENTS, isLoading: dentalDataLoading } = useDentalData();
  
//   // Create a getPrice function that uses the new treatment settings
//   const getPrice = (treatment: string): number => {
//     const setting = getTreatmentSetting(treatment);
//     return setting.price;
//   };
  
//   // Create a getDuration function that uses the new treatment settings
//   const getDuration = (treatment: string): number => {
//     const setting = getTreatmentSetting(treatment);
//     return setting.duration;
//   };
  
//   // Create a savePrice function that uses the new treatment settings
//   const savePrice = async (treatment: string, price: number) => {
//     updateTreatmentSetting(treatment, { price });
//     // Note: We don't auto-save here, user needs to click "Save Changes" in settings
//   };
  
//   const [uploadedImage, setUploadedImage] = useState<File | null>(null);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [findings, setFindings] = useState([
//     { tooth: "", condition: "", treatment: "", replacement: "", price: undefined as number | undefined },
//   ]);
//   const [patientName, setPatientName] = useState("");
//   const [report, setReport] = useState<string | null>(null);
//   const [videoUrl, setVideoUrl] = useState<string | null>(null);
//   const reportRef = useRef<HTMLDivElement | null>(null);
//   const [aiSuggestion, setAiSuggestion] = useState("");
//   const [isAiLoading, setIsAiLoading] = useState(false);
//   const [isListening, setIsListening] = useState(false);
//   const [history, setHistory] = useState<{ html: string, timestamp: string, type: string, summary: string }[]>([]);
//   const [showHistory, setShowHistory] = useState(false);
//   const [auditTrail, setAuditTrail] = useState<{ action: string, timestamp: string }[]>([]);
//   const [activeTab, setActiveTab] = useState("report");
//   const [useXrayMode, setUseXrayMode] = useState(true);
//   const [patientObservations, setPatientObservations] = useState("");
//   const [isEditing, setIsEditing] = useState(false);
//   const [editedReport, setEditedReport] = useState<string | null>(null);
//   // Add new state for cached segmentation
//   const [cachedSegmentationData, setCachedSegmentationData] = useState<any>(null);
  
//   // Treatment stage editor state
//   const [isStageEditorOpen, setIsStageEditorOpen] = useState(false);
//   const [currentTreatmentStages, setCurrentTreatmentStages] = useState<any[]>([]);
  
//   // New state for enhanced functionality
//   const [toothNumberingSystem, setToothNumberingSystem] = useState<ToothNumberingSystem>(() => {
//     const saved = localStorage.getItem('toothNumberingSystem');
//     return (saved as ToothNumberingSystem) || 'FDI';
//   });
//   const [showTreatmentPricing, setShowTreatmentPricing] = useState(() => {
//     const saved = localStorage.getItem('showTreatmentPricing');
//     return saved === 'true' || false; // Hidden by default
//   });
  

  
//   // Report generation progress state
//   const [reportProgress, setReportProgress] = useState(0);
//   const [reportProgressText, setReportProgressText] = useState('');
//   // Global toggle: include replacement options comparison table
//   const [showReplacementOptionsTable, setShowReplacementOptionsTable] = useState<boolean>(() => {
//     const saved = localStorage.getItem('showReplacementOptionsTable');
//     return saved === 'true';
//   });
  
//   // Global toggle: show tooth numbers on X-ray
//   const [showToothNumberOverlay, setShowToothNumberOverlay] = useState<boolean>(() => {
//     const saved = localStorage.getItem('showToothNumberOverlay');
//     // Default to false - toggle should be OFF by default when AI analysis first appears
//     return false;
//   });
  
//   // Store the original image URL to restore when toggle is turned off
//   const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  
//   // Text size multiplier for tooth numbers
//   const [textSizeMultiplier, setTextSizeMultiplier] = useState<number>(() => {
//     const saved = localStorage.getItem('toothNumberTextSize');
//     // Default to 1.2x (38px) when first turned on, otherwise use saved value
//     return saved ? parseFloat(saved) : 1.2;
//   });
  
//   // State to track when text size is being updated
//   const [isUpdatingTextSize, setIsUpdatingTextSize] = useState<boolean>(false);
  
//   // Function to refresh image with tooth number overlay
//   const refreshImageWithOverlay = async (imageUrl: string) => {
//     if (!showToothNumberOverlay) {
//       return imageUrl;
//     }
    
//     try {
//       const overlayResult = await api.addToothNumberOverlay(
//         imageUrl,
//         toothNumberingSystem,
//         true,
//         textSizeMultiplier,
//         immediateAnalysisData?.detections,
//         cachedSegmentationData  // Pass cached data
//       );
      
//       if (overlayResult && overlayResult.has_overlay) {
//         // Cache segmentation data for future calls
//         if (overlayResult.segmentation_data && !cachedSegmentationData) {
//           console.log('💾 Caching segmentation data for future use');
//           setCachedSegmentationData(overlayResult.segmentation_data);
//         }
        
//         return overlayResult.image_url;
//       }
//     } catch (error) {
//       console.error('Failed to add tooth number overlay:', error);
//     }
    
//     return imageUrl;
//   };

//   // Clear cache when toggle is turned off or new image is uploaded
//   useEffect(() => {
//     if (!showToothNumberOverlay) {
//       setCachedSegmentationData(null);
//     }
//   }, [showToothNumberOverlay]);


//   // Function to restore original image when toggle is turned off
//   const restoreOriginalImage = () => {
//     if (originalImageUrl && immediateAnalysisData?.annotated_image_url !== originalImageUrl) {
//       setImmediateAnalysisData((prev: any) => ({
//         ...prev,
//         annotated_image_url: originalImageUrl
//       }));
//     }
//   };
  
//   // Progress steps for report generation
//   const progressSteps = [
//     { progress: 10, text: "Analyzing dental findings..." },
//     { progress: 20, text: "Processing AI recommendations..." },
//     { progress: 30, text: "Constructing summary table..." },
//     { progress: 40, text: "Adding clinic pricing..." },
//     { progress: 50, text: "Creating condition explanation boxes..." },
//     { progress: 60, text: "Generating treatment descriptions..." },
//     { progress: 70, text: "Adding annotated X-ray..." },
//     { progress: 80, text: "Applying clinic branding..." },
//     { progress: 90, text: "Formatting final report..." },
//     { progress: 100, text: "Finalizing document..." }
//   ];
  
//   // Function to simulate progress updates
//   const simulateProgress = () => {
//     setReportProgress(0);
//     setReportProgressText('');
    
//     progressSteps.forEach((step, index) => {
//       setTimeout(() => {
//         setReportProgress(step.progress);
//         setReportProgressText(step.text);
//       }, index * 1500); // 1.5 seconds between each step
//     });
//   };

//   const normalizeConditionName = (condition: string) =>
//     condition?.toLowerCase().replace(/\s+/g, '-');
  
//   // Price validation dialog state
//   const [showPriceValidation, setShowPriceValidation] = useState(false);
//   const [missingPrices, setMissingPrices] = useState<string[]>([]);
//   const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);

//   // State for immediate analysis
//   const [immediateAnalysisData, setImmediateAnalysisData] = useState<any>(null);
//   const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
//   const [analysisProgress, setAnalysisProgress] = useState(0);
//   const [isDragOver, setIsDragOver] = useState(false);
//   // const [isGeneratingConsultation, setIsGeneratingConsultation] = useState(false);
//   const [patientEmail, setPatientEmail] = useState('');
//   const [isSendingEmail, setIsSendingEmail] = useState(false);
  
//   // Effect to refresh image when tooth number overlay toggle changes
//   useEffect(() => {
//     if (!immediateAnalysisData?.annotated_image_url) return;
    
//     if (showToothNumberOverlay) {
//       // Toggle is ON - add overlay using ORIGINAL URL
//       console.log('🔢 TOOTH OVERLAY: Toggle turned ON, adding overlay...');
      
//       // Use original URL if available, otherwise use current
//       const urlToUse = originalImageUrl || immediateAnalysisData.annotated_image_url;
      
//       console.log('🔢 TOOTH OVERLAY: Using URL:', urlToUse.substring(0, 100));
      
//       refreshImageWithOverlay(urlToUse).then(newImageUrl => {
//         if (newImageUrl !== urlToUse && showToothNumberOverlay) {
//           setImmediateAnalysisData((prev: any) => ({
//             ...prev,
//             annotated_image_url: newImageUrl
//           }));
//         }
//       });
//     } else {
//       // Toggle is OFF - restore original image
//       console.log('🔢 TOOTH OVERLAY: Toggle turned OFF, restoring original image...');
//       restoreOriginalImage();
//     }
//   }, [showToothNumberOverlay]); // Only depend on toggle, not text size

//   // Separate effect for real-time text size updates with debouncing
//   useEffect(() => {
//     if (!showToothNumberOverlay || !immediateAnalysisData?.annotated_image_url) return;
    
//     // Debounce the text size changes to avoid too many API calls
//     const timeoutId = setTimeout(() => {
//       console.log('🔢 TOOTH OVERLAY: Text size changed to', textSizeMultiplier, 'x, refreshing overlay...');
//       setIsUpdatingTextSize(true);
      
//       // FIX: Always use the original URL, not the current (possibly base64) image
//       const urlToUse = originalImageUrl || immediateAnalysisData.annotated_image_url;
      
//       console.log('🔢 TOOTH OVERLAY: Using URL for re-overlay:', urlToUse.substring(0, 100));
      
//       refreshImageWithOverlay(urlToUse).then(newImageUrl => {
//         // Only update if we got a new image and toggle is still on
//         if (newImageUrl !== urlToUse && showToothNumberOverlay) {
//           setImmediateAnalysisData((prev: any) => ({
//             ...prev,
//             annotated_image_url: newImageUrl
//           }));
//         }
//         setIsUpdatingTextSize(false);
//       }).catch((error) => {
//         console.error('🔢 TOOTH OVERLAY: Failed to update text size:', error);
//         setIsUpdatingTextSize(false);
//       });
//     }, 300); // 300ms debounce delay
    
//     return () => clearTimeout(timeoutId);
//   }, [textSizeMultiplier, showToothNumberOverlay]); // Depend on text size and toggle state

//   // Auto-resize textarea when aiSuggestion changes (especially for speech dictation)
//   useEffect(() => {
//     const textarea = document.querySelector('textarea[placeholder="Type or speak your change request..."]') as HTMLTextAreaElement;
//     if (textarea) {
//       textarea.style.height = 'auto';
//       textarea.style.height = textarea.scrollHeight + 'px';
//     }
//   }, [aiSuggestion]);
  
//   let recognition: any = null;

//     // Update handleImageUpload function (continued)
//   const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (file) {
//       await processUploadedFile(file);
//     }
//   };

//   // Handle dropped files
//   const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
//     event.preventDefault();
//     setIsDragOver(false);
    
//     const files = event.dataTransfer.files;
//     if (files.length > 0) {
//       const file = files[0];
//       await processUploadedFile(file);
//     }
//   };

//   // Handle drag over
//   const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
//     event.preventDefault();
//     setIsDragOver(true);
//   };

//   // Handle drag leave
//   const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
//     event.preventDefault();
//     setIsDragOver(false);
//   };

//   // Process uploaded file
//   const processUploadedFile = async (file: File) => {
//     setUploadedImage(file);
//     setIsAnalyzingImage(true);
//     setAnalysisProgress(0);
//     setImmediateAnalysisData(null); // Clear previous data
    
//     // Start progress animation
//     const startTime = Date.now();
//     const duration = 15000; // 15 seconds total
    
//     const progressInterval = setInterval(() => {
//       const elapsed = Date.now() - startTime;
//       const progress = Math.min((elapsed / duration) * 100, 95); // Cap at 95% until complete
//       setAnalysisProgress(progress);
//     }, 100);
    
//     try {
//       // First upload the image
//       const uploadResult = await api.uploadImage(file);
      
//       toast({
//         title: "Image Uploaded",
//         description: "Analyzing X-ray with AI...",
//       });

//       // Immediately analyze the uploaded image
//       const analysisResult = await api.analyzeXrayImmediate(uploadResult.url);
      
//       // Complete the progress bar
//       setAnalysisProgress(100);
//       clearInterval(progressInterval);
      
//       // Small delay to show completion
//       await new Promise(resolve => setTimeout(resolve, 500));
      
//       setImmediateAnalysisData(analysisResult);
//       (analysisResult.detections || []);
      
//       // Store the original image URL for tooth number overlay toggle
//       if (analysisResult.annotated_image_url) {
//         setOriginalImageUrl(analysisResult.annotated_image_url);
//       }
      
//       toast({
//         title: "AI Analysis Complete",
//         description: `Found ${analysisResult.detections?.length || 0} potential conditions. Review the findings below.`,
//       });
//     } catch (error) {
//       clearInterval(progressInterval);
//       setAnalysisProgress(0);
//       console.error('Error during analysis:', error);
//       toast({
//         title: "Analysis Failed",
//         description: "There was an error analyzing the X-ray. Please try again.",
//         variant: "destructive",
//       });
//     } finally {
//       setIsAnalyzingImage(false);
//     }
//   };

//   const handleFindingChange = (idx: number, field: string, value: string | number) => {
//     setFindings((prev) => {
//       const updated = [...prev];
//       updated[idx] = { ...updated[idx], [field]: value };
      
//       // Auto-suggest treatments when condition changes (only if treatment is empty)
//       if (field === 'condition' && typeof value === 'string' && value !== '') {
//         // Only clear treatment if it was empty or auto-filled
//         if (!updated[idx].treatment) {
//           // Auto-populate with the most recommended treatment
//           const suggestedTreatments = getSuggestedTreatments(value);
//           if (suggestedTreatments && suggestedTreatments.length > 0) {
//             // Get the first (most recommended) treatment
//             const recommendedTreatment = suggestedTreatments[0].value;
//             updated[idx].treatment = recommendedTreatment;
            
//             // Auto-fill price if available
//             const price = getPrice(recommendedTreatment);
//             if (price) {
//               updated[idx].price = price;
//             }
            
//             // Show a toast to inform the user (less intrusive)
//             console.log(`Auto-selected treatment: ${suggestedTreatments[0].label} for condition: ${value}`);
//           }
//         }
//       }
      
//       // Auto-fill price when treatment changes manually
//       if (field === 'treatment' && typeof value === 'string' && value !== '') {
//         const price = getPrice(value);
//         if (price) {
//           updated[idx].price = price;
//         }
//       }
      
//       return updated;
//     });
//   };

//   const addFinding = () => {
//     setFindings((prev) => [{ tooth: "", condition: "", treatment: "", replacement: "", price: undefined }, ...prev]);
//   };

//   const handleAcceptAIFinding = (detection: any, toothMapping?: {tooth: string, confidence: number}) => {
//     const conditionName = detection.class_name || detection.class || 'Unknown';
//     let normalizedCondition = conditionName.toLowerCase().replace(/\s+/g, '-');
    
//     // Normalize missing tooth variants to standard "missing-tooth"
//     if (normalizedCondition === 'missing-tooth-between' || normalizedCondition === 'missing-teeth-no-distal') {
//       normalizedCondition = 'missing-tooth';
//     }
    
//     // Find matching condition from database
//     const matchingCondition = ALL_CONDITIONS.find(c => c.value === normalizedCondition);
//     const conditionCode = matchingCondition ? matchingCondition.value : normalizedCondition;
    
//     // Leave treatment empty - user will select from database treatments
//     const recommendedTreatment = '';
//     const price = undefined;
    
//     // Auto-fill tooth number if mapping is available
//     const tooth = toothMapping ? toothMapping.tooth : '';
    
//     const newFinding = {
//       tooth: tooth, // Auto-filled if mapping available
//       condition: conditionCode,
//       treatment: recommendedTreatment,
//       replacement: "", // No replacement for AI-detected findings
//       price: price
//     };
    
//     setFindings(prev => {
//       // If the first row is still the initial empty placeholder, remove it
//       const isEmptyFinding = (f: { tooth: string; condition: string; treatment: string; price?: number | undefined }) =>
//         (!f.tooth || f.tooth.trim() === '') && (!f.condition || f.condition.trim() === '') && (!f.treatment || f.treatment.trim() === '') && (f.price === undefined);
//       const next = prev.length > 0 && isEmptyFinding(prev[0]) ? prev.slice(1) : prev;
//       return [newFinding, ...next];
//     });
    
//     const message = toothMapping
//       ? `${conditionName} has been added to your findings table with tooth #${tooth} (${Math.round(toothMapping.confidence * 100)}% confidence). Please select a treatment.`
//       : `${conditionName} has been added to your findings table. Please select a treatment.`;
    
//     toast({
//       title: "AI Finding Added",
//       description: message,
//     });
//   };

//   const handleRejectAIFinding = (detection: any) => {
//     // Could implement logic to hide this detection or mark as rejected
//     toast({
//       title: "AI Finding Rejected",
//       description: "This finding has been marked as rejected.",
//     });
//   };

//   const handlePriceSave = (treatment: string, price: number) => {
//     savePrice(treatment, price);
//     toast({
//       title: "Price Saved",
//       description: `Price for ${treatment} has been saved to your clinic pricing.`,
//     });
//   };

//   // Handle price validation dialog
//   const handlePricesProvided = async (prices: Record<string, number>) => {
//     try {
//       // Save the provided prices to treatment settings
//       Object.entries(prices).forEach(([treatment, price]) => {
//         updateTreatmentSetting(treatment, { price });
//       });
      
//       // Close the dialog
//       setShowPriceValidation(false);
      
//       // Continue with the original submit
//       if (pendingSubmitData) {
//         await performSubmit(pendingSubmitData);
//       }
      
//       // Clear pending data
//       setPendingSubmitData(null);
//       setMissingPrices([]);
      
//     } catch (error) {
//       console.error('Error saving prices:', error);
//       toast({
//         title: "Error",
//         description: "Failed to save prices. Please try again.",
//         variant: "destructive"
//       });
//     }
//   };

//   const handlePriceValidationCancel = () => {
//     setShowPriceValidation(false);
//     setPendingSubmitData(null);
//     setMissingPrices([]);
//   };

//   // Extract the main submit logic into a separate function
//   const performSubmit = async (submitData: any) => {
//     console.log('🚀 REPORT GENERATION: Starting report generation...');
//     console.log('🚀 REPORT GENERATION: Submit data:', submitData);
    
//     const { validFindings, useXrayMode, patientName, patientObservations, organizedStages } = submitData;
    
//     console.log('🚀 REPORT GENERATION: Valid findings count:', validFindings?.length || 0);
//     console.log('🚀 REPORT GENERATION: Use X-ray mode:', useXrayMode);
//     console.log('🚀 REPORT GENERATION: Patient name:', patientName);
//     console.log('🚀 REPORT GENERATION: Uploaded image exists:', !!uploadedImage);
    
//     setIsProcessing(true);
//     setReport(null);
//     // Don't reset videoUrl here - preserve it if it exists
//     // setVideoUrl(null);
//     ([]);
    
//     // Reset video generation status for new report
    
    
    
//     // Start progress tracking
//     simulateProgress();
    
//     try {
//       let analysisResult;
      
//       if (useXrayMode) {
//         console.log('🚀 REPORT GENERATION: Processing X-ray mode...');
//         // Original flow with X-ray upload
//         try {
//           console.log('🚀 REPORT GENERATION: Uploading image to backend...');
//           const uploadResult = await api.uploadImage(uploadedImage!);
//           console.log('🚀 REPORT GENERATION: Image upload result:', uploadResult);
          
//           console.log('🚀 REPORT GENERATION: Calling analyzeXray API...');
//           analysisResult = await api.analyzeXray({
//             patientName,
//             imageUrl: uploadResult.url,
//             findings: validFindings,
//             generateVideo: true
//           });
//           console.log('🚀 REPORT GENERATION: Analysis result received:', analysisResult);
//           console.log('🚀 REPORT GENERATION: Video URL from backend:', analysisResult.video_url);
//         } catch (networkError) {
//           console.error('🚀 REPORT GENERATION: Network error during API call:', networkError);
//           console.log('🚀 REPORT GENERATION: Using frontend-only generation fallback');
//           // Create a mock analysis result for frontend generation
//           analysisResult = {
//             detections: [],
//             treatment_stages: [],
//             summary: 'Report generated offline due to network issues'
//           };
//         }
        
//         if (analysisResult.detections) {
//           console.log('🚀 REPORT GENERATION: Setting detections:', analysisResult.detections.length);
//           (analysisResult.detections);

//           }
        
//           // Set video URL directly from the response
//           if (analysisResult.video_url) {
//             console.log('🚀 REPORT GENERATION: Setting video URL:', analysisResult.video_url);
//             setVideoUrl(analysisResult.video_url);
//           }
        
//         // Store original image URL for tooth number overlay toggle
//         if (analysisResult.annotated_image_url) {
//           setOriginalImageUrl(analysisResult.annotated_image_url);
//         }
        
//         // Handle tooth number overlay if toggle is on
//         if (showToothNumberOverlay && analysisResult.annotated_image_url) {
//           try {
//             console.log('🔢 TOOTH OVERLAY: Adding tooth numbers to X-ray...');
//             console.log('🔢 TOOTH OVERLAY: Using numbering system:', toothNumberingSystem);
            
//             const overlayResult = await api.addToothNumberOverlay(
//               analysisResult.annotated_image_url,
//               toothNumberingSystem, // Use user's preferred numbering system
//               true,
//               textSizeMultiplier, // Include text size multiplier
//               analysisResult.detections // Use mapped detections with tooth number assignments
//             );
            
//             if (overlayResult && overlayResult.has_overlay) {
//               console.log('🔢 TOOTH OVERLAY: Successfully created numbered image');
//               // Replace the annotated image URL with the numbered version
//               analysisResult.annotated_image_url = overlayResult.image_url;
//             } else {
//               console.log('🔢 TOOTH OVERLAY: No overlay applied, using original image');
//             }
//           } catch (overlayError) {
//             console.error('🔢 TOOTH OVERLAY: Failed to add tooth numbers:', overlayError);
//             // Continue with original image if overlay fails
//             toast({
//               title: "Tooth Number Overlay Failed",
//               description: "Could not add tooth numbers to X-ray, using original image.",
//               variant: "destructive",
//             });
//           }
//         }
        
//         // Use the HTML report generated by the backend, fallback to frontend generation
//         console.log('🚀 REPORT GENERATION: Analysis result structure:', Object.keys(analysisResult));
//         console.log('🚀 REPORT GENERATION: Report HTML from backend exists:', !!analysisResult.report_html);
//         console.log('🚀 REPORT GENERATION: Report HTML length:', analysisResult.report_html?.length || 0);
        
//         let reportHtml = analysisResult.report_html;
//         if (!reportHtml) {
//           console.log('🚀 REPORT GENERATION: Backend report_html is empty, using frontend generation');
//           console.log('🚀 REPORT GENERATION: Calling generateReportHTML with toggle state:', showReplacementOptionsTable);
          
//           // If we have organized stages from the stage editor, use them
//           if (organizedStages) {
//             console.log('🚀 REPORT GENERATION: Using organized stages from stage editor:', organizedStages);
//             analysisResult.treatment_stages = organizedStages;
//           }
          
//           reportHtml = generateReportHTML(analysisResult, showReplacementOptionsTable);
//           console.log('🚀 REPORT GENERATION: Frontend generated HTML length:', reportHtml?.length || 0);
//         }
        
//         console.log('🚀 REPORT GENERATION: Applying branding to report...');
//         const brandedReport = applyBrandingToReport(reportHtml);
//         console.log('🚀 REPORT GENERATION: Branded report length:', brandedReport?.length || 0);
//         console.log('🚀 REPORT GENERATION: First 200 chars of branded report:', brandedReport?.substring(0, 200));
//         console.log('🚀 REPORT GENERATION: Setting report state...');
        
//         // Always set the report if we have any HTML content
//         const finalReport = brandedReport || reportHtml || '';
//         if (finalReport && finalReport.trim().length > 0) {
//           setReport(finalReport);
//           console.log('🚀 REPORT GENERATION: Report state set successfully with length:', finalReport.length);
          
//           // Switch to report tab to show the generated report IMMEDIATELY
//           setActiveTab('report');
//           console.log('🚀 REPORT GENERATION: Switched to report tab - Report is now visible!');
          
//           // Show success toast for report generation
//           toast({
//             title: "Report Ready! 🎉",
//             description: "Your dental report has been generated successfully. Video generation is continuing in the background...",
//           });
//         } else {
//           console.error('🚀 REPORT GENERATION: No valid HTML content available');
//           console.error('🚀 REPORT GENERATION: brandedReport:', brandedReport);
//           console.error('🚀 REPORT GENERATION: reportHtml:', reportHtml);
//           throw new Error('Failed to generate report HTML content');
//         }
        
//         // Handle video generation SEPARATELY from report display
//         console.log('🚀 VIDEO GENERATION: Starting video generation process...');
//         // Remove polling logic - we already have the video URL
//         // No need to call pollForVideoStatus anymore
//       } else {
//         console.log('🚀 REPORT GENERATION: Processing without X-ray mode...');
//         // New flow without X-ray
//         try {
//           console.log('🚀 REPORT GENERATION: Calling analyzeWithoutXray API...');
//           analysisResult = await api.analyzeWithoutXray({
//             patientName,
//             observations: patientObservations,
//             findings: validFindings,
//             generateVideo: false
//           });
//           console.log('🚀 REPORT GENERATION: Analysis result (no xray) received:', analysisResult);
//         } catch (networkError) {
//           console.error('🚀 REPORT GENERATION: Network error during no-xray API call:', networkError);
//           console.log('🚀 REPORT GENERATION: Using frontend-only generation fallback');
//           // Create a mock analysis result for frontend generation
//           analysisResult = {
//             detections: [],
//             treatment_stages: [],
//             summary: 'Report generated offline due to network issues'
//           };
//         }
        
//         // Use the HTML report generated by the backend, fallback to frontend generation
//         console.log('🚀 REPORT GENERATION: Analysis result (no xray) structure:', Object.keys(analysisResult));
//         console.log('🚀 REPORT GENERATION: Report HTML from backend (no xray) exists:', !!analysisResult.report_html);
//         console.log('🚀 REPORT GENERATION: Report HTML (no xray) length:', analysisResult.report_html?.length || 0);
        
//         let reportHtml = analysisResult.report_html;
//         if (!reportHtml) {
//           console.log('🚀 REPORT GENERATION: Backend report_html is empty (no xray), using frontend generation');
//           console.log('🚀 REPORT GENERATION: Calling generateReportHTML with toggle state (no xray):', showReplacementOptionsTable);
          
//           // If we have organized stages from the stage editor, use them
//           if (organizedStages) {
//             console.log('🚀 REPORT GENERATION: Using organized stages from stage editor (no xray):', organizedStages);
//             analysisResult.treatment_stages = organizedStages;
//           }
          
//           reportHtml = generateReportHTML(analysisResult, showReplacementOptionsTable);
//           console.log('🚀 REPORT GENERATION: Frontend generated HTML (no xray) length:', reportHtml?.length || 0);
//         }
        
//         console.log('🚀 REPORT GENERATION: Applying branding to report (no xray)...');
//         const brandedReport = applyBrandingToReport(reportHtml);
//         console.log('🚀 REPORT GENERATION: Branded report (no xray) length:', brandedReport?.length || 0);
//         console.log('🚀 REPORT GENERATION: First 200 chars of branded report (no xray):', brandedReport?.substring(0, 200));
//         console.log('🚀 REPORT GENERATION: Setting report state (no xray)...');
        
//         // Always set the report if we have any HTML content
//         const finalReport = brandedReport || reportHtml || '';
//         if (finalReport && finalReport.trim().length > 0) {
//           setReport(finalReport);
//           console.log('🚀 REPORT GENERATION: Report state (no xray) set successfully with length:', finalReport.length);
          
//           // Switch to report tab to show the generated report IMMEDIATELY
//           setActiveTab('report');
//           console.log('🚀 REPORT GENERATION: Switched to report tab (no xray) - Report is now visible!');
          
//           // Show success toast for report generation
//           toast({
//             title: "Report Ready! 🎉",
//             description: "Your dental report has been generated successfully.",
//           });
//         } else {
//           console.error('🚀 REPORT GENERATION: No valid HTML content available (no xray)');
//           console.error('🚀 REPORT GENERATION: brandedReport (no xray):', brandedReport);
//           console.error('🚀 REPORT GENERATION: reportHtml (no xray):', reportHtml);
//           throw new Error('Failed to generate report HTML content');
//         }
        
//         // Note: No video generation for non-X-ray mode
//         console.log('🚀 REPORT GENERATION: Non-X-ray mode - no video generation needed');
//       }
//     } catch (err) {
//       const error = err as Error;
//       console.error('🚀 REPORT GENERATION: ERROR occurred:', error);
//       console.error('🚀 REPORT GENERATION: Error message:', error.message);
//       console.error('🚀 REPORT GENERATION: Error stack:', error.stack);
//       console.error('🚀 REPORT GENERATION: Error name:', error.name);
      
//       // Check if it's a network error
//       if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
//         console.error('🚀 REPORT GENERATION: This appears to be a network/API error');
//       }
      
//       toast({
//         title: "Error",
//         description: `Failed to generate report: ${error.message}`,
//         variant: "destructive"
//       });
//     } finally {
//       console.log('🚀 REPORT GENERATION: Cleaning up and resetting state...');
//       setIsProcessing(false);
//       // Reset progress
//       setReportProgress(0);
//       setReportProgressText('');
//       console.log('🚀 REPORT GENERATION: Cleanup completed');
//     }
//   };

//   const removeFinding = (idx: number) => {
//     setFindings((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
//   };

//   // Generate HTML report from doctor's findings (not AI extraction) - DISABLED: Now using backend GPT generation
//   const generateReportHTML = (data: any, showReplacementTable: boolean) => {
//     // Debug logging to show what toggle values are being passed
//     console.log('🔧 generateReportHTML called with toggle values:', {
//       showReplacementTable,
//       findingsCount: findings.length,
//       doctorFindingsCount: findings.filter(f => f.tooth && f.condition && f.treatment).length
//     });
    
//     // Safety check: Ensure we have valid findings
//     if (!findings || findings.length === 0) {
//       console.warn('⚠️ No findings available for report generation');
//       return '<div>No findings available</div>';
//     }
    
//     // Safety check: Ensure data object exists
//     if (!data) {
//       console.warn('⚠️ No data object provided for report generation');
//       data = {};
//     }
    
//     // CRITICAL FIX: Always use the original annotated image for reports, never the numbered version
//     // This ensures reports always show clean X-rays without tooth numbers
//     let reportImageUrl = originalImageUrl || data.annotated_image_url;
    
//     // SECURITY FIX: Only use web-accessible URLs, not local file paths
//     // If the URL looks like a local file path, don't include the image in the report
//     if (reportImageUrl && (reportImageUrl.startsWith('/tmp/') || reportImageUrl.startsWith('file://') || !reportImageUrl.startsWith('http'))) {
//       console.warn('🚨 SECURITY: Blocking local file path from report:', reportImageUrl);
//       reportImageUrl = null; // Don't include potentially unsafe local paths
//     }
    
//     console.log('🔧 REPORT IMAGE: Using original image for report:', !!originalImageUrl, 'URL:', reportImageUrl);
    
//     // Use doctor's findings as the primary source of truth
//     // Safety check: Filter out any invalid findings
//     const doctorFindings = findings.filter(f => {
//       try {
//         return f && f.tooth && f.condition && f.treatment;
//       } catch (error) {
//         console.error('Error filtering finding:', error, f);
//         return false;
//       }
//     });
    
//     // If no valid findings, return minimal report
//     if (doctorFindings.length === 0) {
//       console.warn('⚠️ No valid doctor findings for report generation');
//       return `
//         <div class="report-container" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
//           <h2>No Complete Findings</h2>
//           <p>Please ensure all findings have tooth number, condition, and treatment selected.</p>
//         </div>
//       `;
//     }
    
//     // CRITICAL FIX: Use the current findings state, not stale data
//     // The data parameter might contain stale findings, so we use the current findings state
//     console.log('🔧 Current findings state:', findings);
//     console.log('🔧 Data parameter:', data);
    
//     // Helper functions first
//     const generateADACode = (treatment: string) => {
//       const adaCodes: Record<string, string> = {
//         'filling': 'D2330',
//         'extraction': 'D7140',
//         'root-canal-treatment': 'D3310',
//         'crown': 'D2740',
//         'bridge': 'D6240',
//         'implant-placement': 'D6010',
//         'partial-denture': 'D5213',
//         'scale-and-clean': 'D1110',
//         'deep-cleaning': 'D4341',
//         'veneer': 'D2962',
//         'fluoride-treatment': 'D1206'
//       };
      
//       const key = Object.keys(adaCodes).find(k => treatment.toLowerCase().includes(k.replace('-', ' ')));
//       return key ? adaCodes[key] : 'D0000';
//     };

//     const getTreatmentPrice = (treatment: string, findingPrice?: number) => {
//       // Use the price from the finding if available, otherwise use treatment settings
//       if (findingPrice) return findingPrice;
      
//       // Get price from treatment settings
//       return getPrice(treatment) || 100;
//     };

//     const groupTreatments = (items: any[]) => {
//       const grouped: Record<string, any> = {};
      
//       items.forEach(item => {
//         const key = `${item.procedure}_${item.adaCode}`;
//         if (!grouped[key]) {
//           grouped[key] = {
//             procedure: item.procedure,
//             adaCode: item.adaCode,
//             unitPrice: item.unitPrice,
//             quantity: 0,
//             totalPrice: 0
//           };
//         }
//         grouped[key].quantity += item.quantity;
//         grouped[key].totalPrice = grouped[key].quantity * grouped[key].unitPrice;
//       });
      
//       return Object.values(grouped);
//     };

//     const calculateTotal = (treatments: any[]) => {
//       return treatments.reduce((sum: number, t: any) => sum + t.totalPrice, 0);
//     };

//     // Process doctor's findings to create treatment items
//     const treatmentItems: any[] = [];
    
//     // First, deduplicate findings to prevent multiple entries for the same tooth-treatment-condition combination
//     const uniqueFindings = doctorFindings.filter((finding, index, self) => {
//       const key = `${finding.tooth}-${finding.treatment}-${finding.condition}`;
//       return index === self.findIndex(f => `${f.tooth}-${f.treatment}-${f.condition}` === key);
//     });
    
//     uniqueFindings.forEach((finding) => {
//       try {
//         treatmentItems.push({
//           procedure: finding.treatment,
//           adaCode: generateADACode(finding.treatment),
//           unitPrice: getTreatmentPrice(finding.treatment, finding.price),
//           quantity: 1,
//           tooth: finding.tooth,
//           condition: finding.condition,
//           stage: 'Doctor Findings'
//         });
//       } catch (error) {
//         console.error('Error processing finding:', error, finding);
//       }
//     });

//     // Group treatments by type
//     const groupedTreatments = groupTreatments(treatmentItems);
    
//     // Generate the HTML - ensure it's always a valid string
//     const htmlContent = `
//       <div class="report-container" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
//         <!-- Header -->
//         <div style="background-color: #1e88e5; color: white; padding: 20px; display: flex; align-items: center;">
//           <div style="display: flex; align-items: center; gap: 10px;">
//             <div style="width: 40px; height: 40px; background-color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
//               <span style="color: #1e88e5; font-size: 20px;">🧠</span>
//             </div>
//             <span style="font-size: 24px; font-weight: bold;">Scanwise</span>
//           </div>
//         </div>

//         <!-- Greeting -->
//         <div style="padding: 30px 20px;">
//           <h2 style="font-size: 24px; margin-bottom: 10px;">Hi ${patientName}, here's what we found in your X-Ray:</h2>
//           <p style="color: #666; margin-bottom: 20px;">Below is a clear, easy-to-understand breakdown of your scan and what it means for your dental health.</p>
//           <p style="text-align: center; color: #666; margin: 20px 0;">Scroll down to view your full written report.</p>
//         </div>

//         <!-- Treatment Overview Table -->
//         <div style="padding: 0 20px; margin-bottom: 40px;">
//           <h3 style="font-size: 20px; margin-bottom: 20px;">Treatment Overview Table</h3>
//           <table style="width: 100%; border-collapse: collapse; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
//             <thead>
//               <tr style="background-color: #f5f5f5;">
//                 <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Procedure (ADA Item Code)</th>
//                 <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Unit Price</th>
//                 <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Quantity</th>
//                 <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Total Price</th>
//               </tr>
//             </thead>
//             <tbody>
//               ${groupedTreatments.map((treatment: any) => `
//                 <tr>
//                   <td style="padding: 12px; border-bottom: 1px solid #eee;">${treatment.procedure} (${treatment.adaCode})</td>
//                   <td style="padding: 12px; border-bottom: 1px solid #eee;">$${treatment.unitPrice}</td>
//                   <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee;">${treatment.quantity}</td>
//                   <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee;">$${treatment.totalPrice}</td>
//                 </tr>
//               `).join('')}
//               <tr style="background-color: #f5f5f5; font-weight: bold;">
//                 <td colspan="3" style="padding: 12px;">Total Cost</td>
//                 <td style="padding: 12px; text-align: right;">$${calculateTotal(groupedTreatments)}</td>
//               </tr>
//             </tbody>
//           </table>
//         </div>

//         <!-- Stage-Based Treatment Plan -->
//         ${(() => {
//           // Check if we have Staging V2 data from backend OR stage editor data
//           // ✅ FIXED: Check both data.stages AND data.treatment_stages
//           const stages = data.stages || data.treatment_stages || [];
//           console.log('🎯 STAGES DEBUG: Checking for stages in report generation');
//           console.log('🎯 STAGES DEBUG: data.stages:', data.stages);
//           console.log('🎯 STAGES DEBUG: data.treatment_stages:', data.treatment_stages);
//           console.log('🎯 STAGES DEBUG: Final stages array:', stages);
          
//           if (stages && stages.length > 0) {
//             console.log('✅ STAGES DEBUG: Rendering stages section with', stages.length, 'stages');
//             // Render Staging V2 with visits
//             return `
//               <div style="padding: 0 20px; margin-bottom: 40px;">
//                 <h3 style="font-size: 20px; margin-bottom: 20px;">
//                   Treatment Plan Stages
//                   <span style="font-size: 14px; color: #666; font-weight: normal; margin-left: 10px;">
//                     (AI-Optimized Scheduling)
//                   </span>
//                 </h3>
//                 <p style="color: #666; margin-bottom: 20px; font-style: italic;">
//                   Your treatment plan has been intelligently staged for scheduling efficiency and patient comfort. 
//                   Each stage represents a treatment phase, and visits are grouped by time budget and anesthesia rules.
//                 </p>
                
//                 ${stages.map((stage: any) => `
//                   <div style="border: 1px solid #ddd; border-left: 4px solid #1e88e5; margin-bottom: 20px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
//                     <div style="background-color: #e3f2fd; padding: 12px 16px;">
//                       <strong style="font-size: 16px;">${stage.stage_title}${stage.focus ? ` - ${stage.focus}` : ''}</strong>
//                     </div>
//                     <div style="padding: 20px;">
//                       ${stage.visits.map((visit: any) => `
//                         <div style="border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 15px; background: #fafafa;">
//                           <div style="background-color: #f0f0f0; padding: 10px 15px; border-radius: 8px 8px 0 0;">
//                             <strong style="color: #1e88e5;">${visit.visit_label}</strong>
//                           </div>
//                           <div style="padding: 15px;">
//                             <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
//                               <div style="background-color: white; padding: 12px; border-radius: 6px; border: 1px solid #e0e0e0;">
//                                 <strong style="color: #666;">Visit Duration:</strong>
//                                 <div style="font-size: 16px; color: #1e88e5; margin-top: 5px;">
//                                   ${Math.round(visit.visit_duration_min / 60 * 10) / 10} hours
//                                 </div>
//                               </div>
//                               <div style="background-color: white; padding: 12px; border-radius: 6px; border: 1px solid #e0e0e0;">
//                                 <strong style="color: #666;">Visit Cost:</strong>
//                                 <div style="font-size: 16px; color: #1e88e5; margin-top: 5px;">
//                                   $${visit.visit_cost}
//                                 </div>
//                               </div>
//                             </div>
                            
//                             <div style="margin-bottom: 15px;">
//                               <strong style="color: #666;">Treatments:</strong>
//                               <ul style="margin: 8px 0; padding-left: 20px;">
//                                 ${visit.treatments.map((treatment: any) => `
//                                   <li style="margin-bottom: 5px;">
//                                     <strong>Tooth ${treatment.tooth}</strong>: ${treatment.procedure.replace('-', ' ')} 
//                                     for ${treatment.condition.replace('-', ' ')}
//                                     <span style="color: #666; font-size: 12px;">
//                                       (${treatment.time_estimate_min} min)
//                                     </span>
//                                   </li>
//                                 `).join('')}
//                               </ul>
//                             </div>
                            
//                             <div style="background-color: #e8f5e8; padding: 12px; border-radius: 6px; border-left: 4px solid #4caf50;">
//                               <strong style="color: #2e7d32;">Why This Grouping:</strong>
//                               <div style="color: #2e7d32; margin-top: 5px; font-size: 14px;">
//                                 ${visit.explain_note}
//                               </div>
//                             </div>
//                           </div>
//                         </div>
//                       `).join('')}
                      
//                       <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
//                         <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px;">
//                           <strong style="color: #666;">Stage Duration:</strong>
//                           <div style="font-size: 18px; color: #1e88e5; margin-top: 5px;">
//                             ${Math.round(stage.total_duration_min / 60 * 10) / 10} hours
//                           </div>
//                         </div>
//                         <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px;">
//                           <div style="font-size: 18px; color: #1e88e5; margin-top: 5px;">
//                             $${stage.total_cost}
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 `).join('')}
                
//                 ${(data.future_tasks && data.future_tasks.length > 0) ? `
//                   <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-top: 20px;">
//                     <h4 style="color: #856404; margin-bottom: 15px;">
//                       📅 Planned Follow-ups
//                     </h4>
//                     ${data.future_tasks.map((task: any) => `
//                       <div style="background-color: white; padding: 12px; border-radius: 6px; margin-bottom: 10px; border-left: 4px solid #ffc107;">
//                         <strong style="color: #856404;">${task.treatment.replace('-', ' ')} on Tooth ${task.tooth}</strong>
//                         <div style="color: #856404; font-size: 14px; margin-top: 5px;">
//                           ${task.dependency_reason} - Earliest: ~${task.earliest_date_offset_weeks} weeks
//                         </div>
//                       </div>
//                     `).join('')}
//                   </div>
//                 ` : ''}
                
//                 <div style="background-color: #e3f2fd; border: 1px solid #bbdefb; border-radius: 8px; padding: 15px; margin-top: 20px; text-align: center;">
//                   <p style="color: #1976d2; margin: 0; font-size: 14px;">
//                     <strong>Note:</strong> This plan is auto-staged for scheduling efficiency and patient comfort. 
//                     It follows a typical sequence (disease control → restoration → prosthetics → aesthetics) and 
//                     respects appointment length, anesthesia side, and clinical dependencies. 
//                     <strong>Your clinician will review and adjust as needed.</strong>
//                   </p>
//                 </div>
//               </div>
//             `;
//           }
          
//           // Legacy staging logic (existing code)
//           // Only show stages if more than one session is needed
//           if (uniqueFindings.length <= 3) {
//             return ''; // Don't show stages for simple cases
//           }

//           // Define urgency levels for different conditions
//           const urgencyLevels: {[key: string]: number} = {
//             'periapical-lesion': 1, // Highest priority
//             'cavity': 1,
//             'decay': 1,
//             'abscess': 1,
//             'root-piece': 2, // Medium priority
//             'fracture': 2,
//             'impacted-tooth': 2,
//             'missing-tooth': 3, // Lowest priority (cosmetic)
//             'whitening': 3
//           };

//           // Group findings by urgency level
//           const urgencyGroups: {[key: number]: any[]} = {};
          
//           uniqueFindings.forEach((finding: any) => {
//             const urgency = urgencyLevels[finding.condition] || 2; // Default to medium priority
//             if (!urgencyGroups[urgency]) {
//               urgencyGroups[urgency] = [];
//             }
//             urgencyGroups[urgency].push(finding);
//           });

//           // Sort by urgency level
//           const sortedUrgencyLevels = Object.keys(urgencyGroups).map(Number).sort((a, b) => a - b);

//           // Only show stages if we have multiple urgency levels
//           if (sortedUrgencyLevels.length <= 1) {
//             return '';
//           }

//           // Treatment duration estimates (in minutes)
//           const treatmentDurations: {[key: string]: number} = {
//             'filling': 30,
//             'crown': 90,
//             'root-canal-treatment': 120,
//             'surgical-extraction': 60,
//             'implant': 180,
//             'bridge': 120,
//             'scaling': 60,
//             'whitening': 45
//           };

//           // Generate stage content
//           return `
//             <div style="padding: 0 20px; margin-bottom: 40px;">
//               <h3 style="font-size: 20px; margin-bottom: 20px;">Treatment Plan Stages</h3>
//               <p style="color: #666; margin-bottom: 20px; font-style: italic;">Your treatment plan has been organized into stages based on urgency and complexity. Each stage represents one treatment session.</p>
              
//               ${sortedUrgencyLevels.map((urgencyLevel, index) => {
//                 const findings = urgencyGroups[urgencyLevel];
//                 const treatments = [...new Set(findings.map(f => f.treatment))];
//                 const conditions = [...new Set(findings.map(f => f.condition))];
                
//                 // Calculate total duration for this stage
//                 let totalDuration = 0;
//                 findings.forEach(finding => {
//                   const duration = treatmentDurations[finding.treatment] || 60;
//                   totalDuration += duration;
//                 });
                
//                 // Calculate total cost for this stage
//                 let stageCost = 0;
//                 findings.forEach(finding => {
//                   const price = getTreatmentPrice(finding.treatment, finding.price);
//                   stageCost += price;
//                 });

//                 // Generate treatment summary
//                 const treatmentSummary = treatments.map(treatment => {
//                   const count = uniqueFindings.filter(f => f.treatment === treatment).length;
//                   const condition = uniqueFindings.find(f => f.treatment === treatment)?.condition;
//                   return `${count} ${treatment.replace('-', ' ')}${count > 1 ? 's' : ''} for ${condition?.replace('-', ' ')}`;
//                 }).join(', ');

//                 return `
//                   <div style="border: 1px solid #ddd; border-left: 4px solid #1e88e5; margin-bottom: 20px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
//                     <div style="background-color: #e3f2fd; padding: 12px 16px;">
//                       <strong style="font-size: 16px;">Stage ${index + 1}</strong>
//                     </div>
//                     <div style="padding: 20px;">
//                       <h4 style="font-size: 18px; margin-bottom: 15px; color: #1e88e5;">${treatmentSummary}</h4>
                      
//                       <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
//                         <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px;">
//                           <strong style="color: #666;">Estimated Duration:</strong>
//                           <div style="font-size: 18px; color: #1e88e5; margin-top: 5px;">
//                             ${Math.round(totalDuration / 60 * 10) / 10} hours
//                           </div>
//                         </div>
//                         <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px;">
//                           <strong style="color: #666;">Stage Cost:</strong>
//                           <div style="font-size: 18px; color: #1e88e5; margin-top: 5px;">
//                             $${stageCost}
//                           </div>
//                         </div>
//                       </div>
                      
//                       <div style="background-color: #f5f5f5; padding: 15px; border-radius: 6px;">
//                         <strong style="color: #666;">Treatments in this stage:</strong>
//                         <ul style="margin: 10px 0 0 20px; color: #666;">
//                           ${uniqueFindings.filter(f => urgencyGroups[urgencyLevel].includes(f)).map(finding => `
//                             <li>${finding.treatment.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} on Tooth ${finding.tooth} for ${finding.condition.replace('-', ' ')}</li>
//                           `).join('')}
//                         </ul>
//                       </div>
//                     </div>
//                   </div>
//                 `;
//               }).join('')}
//             </div>
//           `;
//         })()}

//         <!-- Doctor's Findings Summary -->
//         <div style="padding: 0 20px;">
//           <div style="margin-bottom: 30px;">
//             <h3 style="font-size: 18px; margin-bottom: 15px;">Treatment Plan Summary</h3>
//             <ul style="list-style: disc; padding-left: 20px; color: #666;">
//               <li>Total treatments planned: ${uniqueFindings.length}</li>
//               <li>Teeth requiring treatment: ${uniqueFindings.map(f => f.tooth).join(', ')}</li>
//               <li>Total estimated cost: $${calculateTotal(groupedTreatments)}</li>
//             </ul>
//           </div>
//         </div>

//         <!-- Active Conditions from Doctor's Findings - Grouped by Treatment -->
//         <div style="padding: 20px;">
//           ${(() => {
//             // Group findings by treatment type, with special handling for extraction + replacement
//             const treatmentGroups: {[key: string]: any[]} = {};
//             const extractionReplacements: any[] = [];
            
//             uniqueFindings.forEach((finding: any) => {
//               // Special case: if this is an extraction with replacement, group them together
//               if (finding.treatment === 'extraction' && finding.replacement && finding.replacement !== 'none') {
//                 extractionReplacements.push(finding);
//                 return;
//               }
              
//               // Regular treatment grouping
//               const treatmentKey = finding.treatment;
//               if (!treatmentGroups[treatmentKey]) {
//                 treatmentGroups[treatmentKey] = [];
//               }
//               treatmentGroups[treatmentKey].push(finding);
//             });
            
//             // Add extraction + replacement group if exists
//             if (extractionReplacements.length > 0) {
//               treatmentGroups['extraction-with-replacement'] = extractionReplacements;
//             }

//             // Generate enhanced content for each treatment group
//             return Object.entries(treatmentGroups).map(([treatmentKey, findings]) => {
//               // Special handling for extraction + replacement group
//               if (treatmentKey === 'extraction-with-replacement') {
//                 return findings.map((finding: any) => {
//                   const tooth = finding.tooth;
//                   const replacement = finding.replacement;
                  
//                   // Generate extraction + replacement description
//                   const extractionDesc = `
//             <div style="border: 1px solid #ddd; border-left: 4px solid #1e88e5; margin-bottom: 20px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
//               <div style="background-color: #ffeb3b; padding: 8px 16px;">
//                         <strong style="font-size: 14px;">Extraction with Replacement</strong>
//               </div>
//               <div style="padding: 20px;">
//                         <h3 style="font-size: 20px; margin-bottom: 15px;">Extraction and ${replacement.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} for Tooth ${tooth}</h3>
                        
//                         <p style="margin-bottom: 15px;"><strong>Tooth ${tooth}</strong> requires extraction followed by replacement with a ${replacement.replace('-', ' ')}.</p>
                        
//                         <p style="margin-bottom: 15px;"><strong>What This Means:</strong> An impacted tooth is one that has not fully erupted through the gum or has grown in at an angle. This can cause pain, swelling, and can damage neighboring teeth.</p>
                
//                 <p style="margin-bottom: 15px;">
//                           <span style="color: #4caf50;">✓</span> <strong>Recommended Treatment:</strong> Surgical extraction involves removing the tooth through a small incision in the gum, followed by replacement with a ${replacement.replace('-', ' ')} after healing.
//                 </p>
                
//                 <p style="margin: 15px 0; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
//                           <span style="color: #f44336;">⚠️</span> <strong>Urgency:</strong> Delaying extraction can lead to severe pain, infection spreading to other teeth, and potential damage to your jawbone. The longer you wait, the more complex the procedure becomes.
//                 </p>
                        

//               </div>
//             </div>
//                   `;
                  
//                   return extractionDesc;
//                 }).join('');
//               }
              
//               // Regular treatment handling
//               const conditions = [...new Set(findings.map(f => f.condition))];
//               const teeth = findings.map(f => f.tooth).sort();
//               const teethText = teeth.length === 1 ? `Tooth ${teeth[0]}` : `Teeth ${teeth.join(', ')}`;
              
//               // Enhanced condition descriptions
//               const getConditionDescription = (condition: string) => {
//                 const descriptions: {[key: string]: string} = {
//                   'impacted-tooth': 'An impacted tooth is one that has not fully erupted through the gum or has grown in at an angle. This can cause pain, swelling, and can damage neighboring teeth.',
//                   'periapical-lesion': 'A periapical lesion is an infection or inflammation at the tip of the tooth root, usually caused by untreated decay or trauma. This can lead to severe pain and bone loss.',
//                   'cavity': 'A cavity is a hole in your tooth caused by bacteria that eat away at the enamel. Left untreated, cavities can grow larger and reach the sensitive inner part of your tooth.',
//                   'root-piece': 'A root piece is a fragment of a tooth root that remains in the jawbone after a tooth has been extracted. This can cause infection and prevent proper healing.',
//                   'missing-tooth': 'A missing tooth creates a gap that can cause other teeth to shift, leading to bite problems and potential jaw pain.',
//                   'decay': 'Tooth decay is the destruction of tooth structure caused by acids produced by bacteria. It starts on the surface and can progress deeper, causing pain and infection.',
//                   'fracture': 'A fractured tooth has a crack or break that can cause pain and sensitivity. Without treatment, the fracture can worsen and lead to tooth loss.',
//                   'abscess': 'An abscess is a pocket of infection that forms around the tooth root. This is a serious condition that can cause severe pain and spread to other parts of your body.'
//                 };
//                 return descriptions[condition] || `${condition.replace('-', ' ')} is a dental condition that requires professional treatment.`;
//               };

//               // Enhanced treatment descriptions
//               const getTreatmentDescription = (treatment: string) => {
//                 const descriptions: {[key: string]: string} = {
//                   'surgical-extraction': 'Surgical extraction involves removing the tooth through a small incision in the gum. This is necessary when a tooth cannot be removed with simple extraction techniques.',
//                   'root-canal-treatment': 'Root canal treatment removes infected tissue from inside the tooth, cleans the canals, and seals them to prevent future infection. This saves your natural tooth.',
//                   'filling': 'A filling repairs a damaged tooth by removing decay and filling the space with a strong material. This restores the tooth\'s function and prevents further decay.',
//                   'crown': 'A crown is a cap that covers the entire tooth to restore its shape, size, and strength. This protects the tooth and improves its appearance.',
//                   'bridge': 'A bridge replaces missing teeth by anchoring artificial teeth to neighboring teeth. This restores your smile and prevents other teeth from shifting.',
//                   'implant': 'An implant is a titanium post that replaces the tooth root, providing a strong foundation for a replacement tooth that looks and functions like a natural tooth.',
//                   'scaling': 'Scaling removes plaque and tartar buildup from below the gum line. This treats gum disease and prevents tooth loss.',
//                   'whitening': 'Professional whitening uses safe, effective methods to remove stains and brighten your smile by several shades.'
//                 };
//                 return descriptions[treatment] || `${treatment.replace('-', ' ')} is a dental procedure that will effectively treat your condition and restore your oral health.`;
//               };

//               // Enhanced urgency messaging
//               const getUrgencyMessage = (treatment: string, conditions: string[]) => {
//                 const urgencyMessages: {[key: string]: string} = {
//                   'surgical-extraction': 'Delaying extraction can lead to severe pain, infection spreading to other teeth, and potential damage to your jawbone. The longer you wait, the more complex the procedure becomes.',
//                   'root-canal-treatment': 'Without treatment, the infection can spread to your jawbone and other parts of your body. Early treatment saves your tooth and prevents the need for extraction.',
//                   'filling': 'Untreated cavities grow larger and can reach the nerve, causing severe pain and requiring more extensive treatment like a root canal or extraction.',
//                   'crown': 'A damaged tooth without a crown is vulnerable to further damage and infection. This can lead to tooth loss and affect your ability to eat and speak properly.',
//                   'bridge': 'Missing teeth cause other teeth to shift, creating gaps and bite problems. This can lead to jaw pain and difficulty eating your favorite foods.',
//                   'implant': 'The longer you wait, the more your jawbone shrinks, making implant placement more difficult and potentially requiring bone grafting procedures.',
//                   'scaling': 'Untreated gum disease can lead to tooth loss and has been linked to serious health conditions like heart disease and diabetes.',
//                   'whitening': 'While not urgent for health, professional whitening gives you immediate confidence and a brighter smile that can improve your personal and professional life.'
//                 };
                
//                 const physicalRisks = urgencyMessages[treatment] || 'Delaying treatment can lead to worsening pain, infection, and potentially more complex and expensive procedures in the future.';
                
//                 // Add aesthetic risks where applicable
//                 const aestheticRisks = {
//                   'cavity': 'Untreated cavities can cause visible discoloration and may eventually lead to tooth loss, creating gaps in your smile.',
//                   'missing-tooth': 'Missing teeth can cause your face to look sunken and make you appear older than you are.',
//                   'fracture': 'A fractured tooth can be visible when you smile and may cause you to hide your smile.',
//                   'decay': 'Visible decay can make you self-conscious about your smile and affect your confidence in social situations.'
//                 };
                
//                 const aestheticRisk = conditions.some((c: string) => aestheticRisks[c as keyof typeof aestheticRisks]) ? 
//                   ' Additionally, this condition can affect the appearance of your smile and your confidence.' : '';
                
//                 return physicalRisks + aestheticRisk;
//               };

//               return `
//                 <div style="border: 1px solid #ddd; border-left: 4px solid #1e88e5; margin-bottom: 20px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
//                   <div style="background-color: #ffeb3b; padding: 8px 16px;">
//                     <strong style="font-size: 14px;">${treatmentKey.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</strong>
//                   </div>
//                   <div style="padding: 20px;">
//                     <h3 style="font-size: 20px; margin-bottom: 15px;">${treatmentKey.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} for ${conditions.map((c: string) => c.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())).join(', ')}</h3>
                    
//                     <p style="margin-bottom: 15px;"><strong>${teethText}</strong> ${teeth.length === 1 ? 'has' : 'have'} ${conditions.map((c: string) => c.replace('-', ' ')).join(', ')} that requires ${treatmentKey.replace('-', ' ')}.</p>
                    
//                     <p style="margin-bottom: 15px;"><strong>What This Means:</strong> ${conditions.map((c: string) => getConditionDescription(c)).join(' ')}</p>
                    
//                     <p style="margin-bottom: 15px;">
//                       <span style="color: #4caf50;">✓</span> <strong>Recommended Treatment:</strong> ${getTreatmentDescription(treatmentKey)}
//                     </p>
                    
//                     <p style="margin: 15px 0; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
//                       <span style="color: #f44336;">⚠️</span> <strong>Urgency:</strong> ${getUrgencyMessage(treatmentKey, conditions)}
//                     </p>
                    

//                 </div>
//                 </div>
//               `;
//             }).join('');
//           })()}
//           </div>

//         ${(() => {
//           // Debug logging to understand why table might not be showing
//           console.log('🔍 Table Generation Debug:', {
//             showReplacementTable,
//             findingsCount: findings.length,
//             allFindings: findings.map(f => ({ tooth: f.tooth, condition: f.condition, treatment: f.treatment })),
//             relevantTreatments: findings.filter(f =>
//               f.treatment && ['implant-placement', 'crown', 'bridge', 'partial-denture'].includes(f.treatment)
//             ).map(f => ({ tooth: f.tooth, condition: f.condition, treatment: f.treatment })),
//             clinicPrices: treatmentSettings ? Object.fromEntries(
//               Object.entries(treatmentSettings).map(([key, value]) => [key, value.price])
//             ) : {},
//             toggleState: showReplacementOptionsTable // Add this to see the actual toggle state
//           });
          
//           // Only show the table if the toggle is on
//           if (!showReplacementTable) {
//             console.log('❌ Table not shown: toggle is OFF');
//             console.log('❌ Toggle state details:', { showReplacementTable, showReplacementOptionsTable });
//             return '';
//           }
          
//           // Check if there are any relevant replacement treatments
//           const relevantTreatments = findings.filter(f =>
//             f.treatment && ['implant-placement', 'crown', 'bridge', 'partial-denture'].includes(f.treatment)
//           );
          
//           if (relevantTreatments.length === 0) {
//             console.log('❌ Table not shown: no relevant treatments found');
//             console.log('❌ All treatments found:', findings.map(f => f.treatment).filter(Boolean));
//             return '';
//           }
          
//           console.log('✅ Generating unified replacement options table for treatments:', relevantTreatments.map(f => f.treatment));
          
//           // Safety check: Ensure treatmentSettings exists before accessing
//           if (!treatmentSettings) {
//             console.warn('⚠️ Treatment settings not available, skipping replacement table');
//             return '';
//           }
          
//           // Generate the table with all relevant treatments
//           return generateReplacementOptionsTable({
//             context: 'missing-tooth',
//             selectedTreatment: relevantTreatments[0].treatment, // Use first treatment as primary
//             clinicPrices: Object.fromEntries(
//               Object.entries(treatmentSettings).map(([key, value]) => [key, value.price])
//             )
//           });
//         })()}

//         ${reportImageUrl ? `
//           <!-- Annotated X-Ray Section -->
//           <div style="padding: 40px 20px; text-align: center;">

//             <h3 style="font-size: 24px; margin-bottom: 10px;">Annotated X-Ray Image</h3>
//             <p style="color: #666; margin-bottom: 30px;">Below is your panoramic X-ray with AI-generated highlights of all detected conditions.</p>
            
//             ${(() => {
//               // Only show legend if there are detections
//               if (!data.detections || data.detections.length === 0) {
//                 return '';
//               }

//               // Define hex colors for each condition type - EXACTLY the same as AIAnalysisSection
//               const conditionColors: {[key: string]: string} = {
//                 'bone-level': '#6C4A35',
//                 'caries': '#58eec3',
//                 'crown': '#FF00D4',
//                 'filling': '#FF004D',
//                 'fracture': '#FF69F8',
//                 'impacted-tooth': '#FFD700',
//                 'implant': '#00FF5A',
//                 'missing-teeth-no-distal': '#4FE2E2',
//                 'missing-tooth-between': '#8c28fe',
//                 'periapical-lesion': '#007BFF',
//                 'post': '#00FFD5',
//                 'root-piece': '#fe4eed',
//                 'root-canal-treatment': '#FF004D',
//                 'tissue-level': '#A2925D'
//               };

//               // Get unique detected conditions
//               const uniqueConditions = [...new Set(data.detections.map((detection: any) => detection.class || detection.class_name))] as string[];

//               // Normalize condition names to handle different formats - EXACTLY the same as AIAnalysisSection
//               const normalizeCondition = (condition: string) => {
//                 return condition
//                   .toLowerCase()
//                   .replace(/\s+/g, '-')
//                   .replace(/s$/, '')  // Remove plural 's'
//                   .replace(/^carie$/, 'caries'); // Special case: restore 'caries' from 'carie'
//               };

//               // Format condition names for display - EXACTLY the same as AIAnalysisSection
//               const formatConditionName = (condition: string) => {
//                 return condition
//                   .replace(/-/g, ' ')
//                   .split(' ')
//                   .map(word => word.charAt(0).toUpperCase() + word.slice(1))
//                   .join(' ');
//               };

//               // Generate dynamic legend
//               return `
//                 <!-- Dynamic Legend -->
//             <div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 30px; flex-wrap: wrap;">
//                   ${uniqueConditions.map((condition: string) => {
//                     const normalizedCondition = normalizeCondition(condition);
//                     const color = conditionColors[normalizedCondition] || '#666666'; // Default gray if color not found
//                     const displayName = formatConditionName(condition);
                    
//                     return `
//               <div style="display: flex; align-items: center; gap: 5px;">
//                         <div style="width: 15px; height: 15px; background-color: ${color}; border-radius: 2px;"></div>
//                         <span style="font-size: 14px;">${displayName}</span>
//               </div>
//                     `;
//                   }).join('')}
//               </div>
//               `;
//             })()}
            
//             <img src="${reportImageUrl}" alt="Annotated X-ray" style="max-width: 100%; height: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 8px;" />
//           </div>
//         ` : `
//           <!-- No X-Ray Section -->
//           <div style="padding: 40px 20px; text-align: center; background-color: #f5f5f5; margin: 20px;">
//             <h3 style="font-size: 20px; margin-bottom: 10px; color: #666;">Report Generated Without X-Ray</h3>
//             <p style="color: #888; font-size: 14px;">This report was generated based on clinical observations and findings only.</p>
//             <p style="color: #888; font-size: 14px;">For a more comprehensive analysis, please upload an X-ray image.</p>
//           </div>
//         `}
//       </div>
//       </div>
//     `;
    
//     console.log('🚀 REPORT GENERATION: Generated HTML length:', htmlContent.length);
//     return htmlContent;
//   };

//     // New function to handle "Next Step" - opens stage editor instead of generating report
//     const handleNextStep = async (e: React.FormEvent) => {
//       e.preventDefault();
      
//       // Validation based on mode
//       if (useXrayMode) {
//         if (!uploadedImage || !patientName.trim()) {
//           toast({ title: "Missing info", description: "Please upload an OPG and enter patient name." });
//           return;
//         }
//         // In X-ray mode, ensure AI analysis is complete before proceeding
//         if (!immediateAnalysisData) {
//           toast({ title: "Analysis required", description: "Please wait for AI analysis to complete before proceeding." });
//           return;
//         }
//       } else {
//         if (!patientName.trim() || (!patientObservations.trim() && findings.filter(f => f.tooth && f.condition && f.treatment).length === 0)) {
//           toast({ title: "Missing info", description: "Please enter patient name and either observations or findings." });
//           return;
//         }
//       }

//       // Validate that all findings are complete before proceeding
//       if (!validateFindingsComplete()) {
//         return;
//       }

//       // Validate findings rows: either all empty, or all required filled
//       const invalidIndex = findings.findIndex(f => {
//         // Safety check: ensure finding object exists
//         if (!f) return true;
        
//         const toothOk = !!(f.tooth && f.tooth.trim() !== '');
//         const condOk = !!(f.condition && f.condition.trim() !== '');
//         const treatOk = !!(f.treatment && f.treatment.trim() !== '');
        
//         // Special validation for extraction: must have replacement selected
//         const replacementOk = f.treatment === 'extraction' ? !!(f.replacement && f.replacement.trim() !== '') : true;
        
//         const allEmpty = !toothOk && !condOk && !treatOk;
//         const allFilled = toothOk && condOk && treatOk && replacementOk;
//         return !(allEmpty || allFilled);
//       });
//       if (invalidIndex !== -1) {
//         // Scroll to the problematic finding card and show a gentle prompt
//         const cards = document.querySelectorAll('#findings-list .finding-card');
//         const target = cards[invalidIndex] as HTMLElement | undefined;
//         if (target && typeof target.scrollIntoView === 'function') {
//           target.scrollIntoView({ behavior: 'smooth', block: 'center' });
//           target.classList.add('ring-2', 'ring-red-400');
//           setTimeout(() => target.classList.remove('ring-2', 'ring-red-400'), 2000);
//         }
        
//         const problematicFinding = findings[invalidIndex];
//         let errorMessage = 'Please complete tooth, condition, and treatment (or clear the row).';
        
//         if (problematicFinding.treatment === 'extraction' && !problematicFinding.replacement) {
//           errorMessage = 'Please select a replacement option for the extraction (or choose "No Replacement").';
//         }
        
//         toast({ title: 'Incomplete finding', description: errorMessage });
//         return;
//       }

//       // Validate pricing for all treatments
//       const validFindings = findings.filter(f => f.tooth && f.condition && f.treatment);
//       const treatments = validFindings.map(f => f.treatment);
      
//       // Check if all treatments have prices
//       const missingPrices = treatments.filter(treatment => {
//         const setting = getTreatmentSetting(treatment);
//         return !setting.price || setting.price === 0;
//       });
      
//       const pricingValidation = {
//         valid: missingPrices.length === 0,
//         missingPrices: missingPrices
//       };
      
//       if (!pricingValidation.valid) {
//         // Show price validation dialog instead of toast
//         setMissingPrices(pricingValidation.missingPrices);
//         setPendingSubmitData({ validFindings, useXrayMode, patientName, patientObservations });
//         setShowPriceValidation(true);
//         return;
//       }
      
//       // If validation passes, open stage editor with smart defaults
//       await openStageEditorWithFindings({ validFindings, useXrayMode, patientName, patientObservations });
//     };

//     // Function to create stages from findings and open editor
//     const openStageEditorWithFindings = async (data: { validFindings: any[], useXrayMode: boolean, patientName: string, patientObservations: string }) => {
//       console.log('🎯 Opening stage editor with findings:', data.validFindings);
      
//       let findingsForStaging = data.validFindings;
      
//       // In X-ray mode, check if we have AI-generated stages to use as a starting point
//       if (data.useXrayMode && immediateAnalysisData?.treatment_stages?.length > 0) {
//         console.log('🎯 X-ray mode: Using AI analysis data for staging');
        
//         // Try to use AI-generated stages first, then fall back to manual findings
//         try {
//           const aiStages = deserializeStages(immediateAnalysisData.treatment_stages);
//           const totalItems = aiStages.reduce((sum, stage) => sum + stage.items.length, 0);
//           const maxItemsInOneStage = Math.max(...aiStages.map(stage => stage.items.length));
          
//           // If AI stages are well-distributed, use them
//           if (aiStages.length > 1 && !(totalItems > 3 && maxItemsInOneStage / totalItems > 0.8)) {
//             console.log('🎯 Using well-distributed AI stages');
//             setCurrentTreatmentStages(aiStages);
//             setPendingSubmitData(data);
//             setIsStageEditorOpen(true);
//             return;
//           } else {
//             console.log('🎯 AI stages poorly distributed, using manual findings approach');
//           }
//         } catch (error) {
//           console.warn('🎯 Error processing AI stages, falling back to manual findings:', error);
//         }
//       }
      
//       // Create dynamic stages using the new urgency system (fallback or non-X-ray mode)
//       console.log('🎯 Findings for staging:', findingsForStaging);
//       console.log('🎯 Sample finding structure:', findingsForStaging[0]);
      
//       const dynamicStages = createDynamicStages(findingsForStaging);
//       console.log('🎯 Created dynamic stages:', dynamicStages);
//       console.log('🎯 Stage distribution:', dynamicStages.map(s => ({ name: s.name, itemCount: s.items.length })));
      
//       // Convert to editor format
//       const editorStages = dynamicStages.map((stage, index) => ({
//         id: generateId(),
//         name: stage.name,
//         focus: stage.focus,
//         order: index,
//         items: stage.items.map(finding => ({
//           id: generateId(),
//           toothNumber: finding.tooth,
//           condition: finding.condition,
//           treatment: finding.treatment,
//           replacement: finding.replacement || null,
//           urgency: getFindingUrgency(finding.condition, finding.treatment),
//           estimatedTime: getDuration(finding.treatment), // ✅ FIXED: Fetch duration from database
//           price: getPrice(finding.treatment) // ✅ FIXED: Always fetch price from database
//         })),
//         totalTime: 0,
//         totalCost: 0
//       }));
      
//       console.log('🎯 Editor stages ready:', editorStages);
      
//       // Store the pending data for when "Generate Report" is clicked in the editor
//       setPendingSubmitData(data);
      
//       // Set stages and open editor
//       setCurrentTreatmentStages(editorStages);
//       setIsStageEditorOpen(true);
//     };

//     // Original handleSubmit renamed to handleGenerateFromEditor
//     const handleGenerateFromEditor = async (finalStages: any[]) => {
//       if (!pendingSubmitData) {
//         console.error('No pending submit data found');
//         return;
//       }
      
//       console.log('🎯 Generating report with final stages:', finalStages);
      
//       // Convert stages back to findings format for report generation
//       const updatedFindings = finalStages.flatMap(stage => 
//         stage.items.map((item: any) => ({
//           tooth: item.toothNumber,
//           condition: item.condition,
//           treatment: item.treatment,
//           replacement: item.replacement,
//           price: item.price
//         }))
//       );
      
//       // Convert stages to backend format for report generation
//       const organizedStages = finalStages.map((stage, index) => ({
//         stage_title: stage.name,
//         focus: stage.focus,
//         visits: [{
//           visit_label: `Visit ${index + 1}`,
//           visit_duration_min: stage.totalTime || 0,
//           visit_cost: stage.totalCost || 0,
//           treatments: stage.items.map((item: any) => ({
//             tooth: item.toothNumber,
//             condition: item.condition,
//             treatment: item.treatment,
//             replacement: item.replacement,
//             price: item.price,
//             urgency: item.urgency
//           }))
//         }]
//       }));
      
//       // Update the findings with the organized data and pass stage organization
//       const updatedSubmitData = {
//         ...pendingSubmitData,
//         validFindings: updatedFindings,
//         organizedStages: organizedStages // Pass the stage organization
//       };
      
//       // Close stage editor
//       setIsStageEditorOpen(false);
      
//       // Proceed with report generation using the organized findings and stages
//       await performSubmit(updatedSubmitData);
//     };

//     // Keep original handleSubmit for backward compatibility (shouldn't be used in new workflow)
//     const handleSubmit = async (e: React.FormEvent) => {
//       // This should redirect to the new workflow
//       await handleNextStep(e);
//     };

//   const handleEditClick = () => {
//     setIsEditing(true);
//     // Don't set editedReport here - let the contentEditable div work with the current report
//   };

//     const handleSaveEdit = () => {
//     setIsEditing(false);
//     if (reportRef.current) {
//       const newContent = reportRef.current.innerHTML;
//       const oldContent = report || '';
      
//       // Only save if content actually changed
//       if (newContent !== oldContent) {
//         setReport(newContent);
//         addVersion(newContent, "Manual Edit", "Dentist manually edited the report");
        
//         toast({
//           title: "Success",
//           description: "Report changes saved successfully",
//         });
//       } else {
//         toast({
//           title: "Info",
//           description: "No changes were made to the report",
//         });
//       }
//     }
//   };

//   // Speech-to-text for AI suggestion
//   const handleMicClick = () => {
//     if (!('webkitSpeechRecognition' in window)) {
//       toast({ title: "Speech Recognition not supported", description: "Try Chrome or a compatible browser." });
//       return;
//     }
//     if (isListening) {
//       recognition && recognition.stop();
//       setIsListening(false);
//       return;
//     }
//     // @ts-ignore
//     recognition = new window.webkitSpeechRecognition();
//     recognition.continuous = true;  // Keep listening continuously
//     recognition.interimResults = true;  // Get real-time results
//     recognition.lang = 'en-US';
//     recognition.onresult = (event: any) => {
//       let finalTranscript = '';
      
//       // Process all results for continuous speech
//       for (let i = event.resultIndex; i < event.results.length; i++) {
//         const transcript = event.results[i][0].transcript;
//         if (event.results[i].isFinal) {
//           finalTranscript += transcript + ' ';
//         }
//       }
      
//       // Update with accumulated speech (don't stop listening)
//       if (finalTranscript) {
//         setAiSuggestion(prev => prev + finalTranscript);
//       }
//       // Keep listening - don't set isListening to false
//     };
//     recognition.onerror = (event: any) => {
//       console.error('Speech recognition error:', event.error);
//       if (event.error === 'no-speech') {
//         // Don't stop on no-speech errors, just keep listening
//         return;
//       }
//       setIsListening(false);
//     };
//     recognition.onend = () => {
//       // Only stop if user explicitly stopped listening
//       if (isListening) {
//         // Restart if it ended unexpectedly
//         try {
//           recognition.start();
//         } catch (e) {
//           console.log('Restarting speech recognition...');
//         }
//       }
//     };
//     recognition.start();
//     setIsListening(true);
//   };

//   const handleAiSuggest = async (e: React.FormEvent | React.MouseEvent) => {
//   e.preventDefault();
//   if (!report || !aiSuggestion.trim()) {
//     toast({ title: "Missing info", description: "Type or speak a change request." });
//     return;
//   }
//   setIsAiLoading(true);
//   try {
//     const token = localStorage.getItem('authToken');
    
//     const res = await fetch(`${import.meta.env.VITE_API_URL}/apply-suggested-changes`, {
//       method: "POST",
//       headers: { 
//         "Content-Type": "application/json",
//         "Authorization": `Bearer ${token}`
//       },
//       body: JSON.stringify({
//         previous_report_html: report,
//         change_request_text: aiSuggestion,
//       }),
//     });
    
//     if (!res.ok) {
//       const errorData = await res.json().catch(() => ({ detail: 'Unknown error' }));
//       throw new Error(errorData.detail || `Server error: ${res.status}`);
//     }
    
//     const data = await res.json();
    
//     if (!data.updated_html) {
//       throw new Error('No updated HTML received from server');
//     }
    
//     setReport(data.updated_html);
//     // setEditedReport(null);
//     setAiSuggestion("");
//     addVersion(data.updated_html, "AI Edit", aiSuggestion);
    
//     toast({
//       title: "Success",
//       description: "AI suggestions applied successfully!",
//     });
//   } catch (error) {
//     console.error('AI suggestion error:', error);
    
//     // Provide more specific error messages
//     let errorMessage = "Failed to apply AI suggestion.";
//     if (error instanceof Error) {
//       if (error.message.includes('model')) {
//         errorMessage = "AI model configuration error. Please contact support.";
//       } else if (error.message.includes('token')) {
//         errorMessage = "Report too large for AI editing. Try a more specific change request.";
//       } else {
//         errorMessage = error.message;
//       }
//     }
    
//     toast({ 
//       title: "Error", 
//       description: errorMessage,
//       variant: "destructive"
//       });
//     } finally {
//       setIsAiLoading(false);
//     }
//   };

//   const addVersion = (html: string, type: string, summary: string) => {

//     const timestamp = new Date().toLocaleString();
//     setHistory(prev => [...prev, { html, timestamp, type, summary }]);

//     setAuditTrail(prev => [
//       { action: `${type}: ${summary}`, timestamp },
//       ...prev
//     ]);
//   };

//   useEffect(() => {
//     if (report && history.length === 0) {
//       addVersion(report, "Initial", "First AI-generated report");
//     }
//   }, [report]);

//   // Auto-resize textarea when aiSuggestion changes (especially for speech dictation)
//   useEffect(() => {
//     const textarea = document.querySelector('textarea[placeholder="Type or speak your change request..."]') as HTMLTextAreaElement;
//     if (textarea) {
//       textarea.style.height = 'auto';
//       textarea.style.height = textarea.scrollHeight + 'px';
//     }
//   }, [aiSuggestion]);

//   const handleUndo = () => {
//     if (history.length > 1) {
//       const prev = history[history.length - 2];
//       setReport(prev.html);
//       setHistory(h => h.slice(0, -1));
//       setAuditTrail(prevTrail => [
//         { action: "Undo to previous version", timestamp: new Date().toLocaleString() },
//         ...prevTrail
//       ]);
//     }
//   };

//   // Stage Editor handlers

//   // Validate that all findings are complete before opening stage editor
//   const validateFindingsComplete = () => {
//     const incompleteFindings: number[] = [];
    
//     findings.forEach((finding: any, index: number) => {
//       // Safety check: ensure finding object exists
//       if (!finding) {
//         incompleteFindings.push(index);
//         return;
//       }
      
//       if (!finding.tooth || !finding.condition || !finding.treatment) {
//         incompleteFindings.push(index);
//       }
//     });

//     if (incompleteFindings.length > 0) {
//       // Scroll to first incomplete finding
//       const firstIncompleteIndex = incompleteFindings[0];
//       const element = document.getElementById(`finding-${firstIncompleteIndex}`);
//       if (element) {
//         element.scrollIntoView({ behavior: 'smooth', block: 'center' });
//         // Add red outline temporarily
//         element.classList.add('border-red-500', 'border-2');
//         setTimeout(() => {
//           element.classList.remove('border-red-500', 'border-2');
//         }, 3000);
//       }

//       toast({
//         title: "Incomplete Findings",
//         description: `Please complete all dental findings before opening the stage editor. ${incompleteFindings.length} finding(s) are incomplete.`,
//         variant: "destructive",
//       });
//       return false;
//     }
//     return true;
//   };

//   // Refresh stages based on current dental findings (for "Continue Editing Stages" button)
//   const handleContinueEditingStages = async () => {
//     // Validate all findings are complete first
//     if (!validateFindingsComplete()) {
//       return;
//     }

//     // If we have saved stages, use them; otherwise create new ones from findings
//     if (currentTreatmentStages && currentTreatmentStages.length > 0) {
//       console.log('🎯 Continue Editing: Using saved stages:', currentTreatmentStages);
//       setIsStageEditorOpen(true);
//     } else {
//       // Get current valid findings
//       const currentValidFindings = findings.filter((finding: any) => 
//         finding.condition && finding.treatment && finding.tooth
//       );

//       if (currentValidFindings.length === 0) {
//         toast({
//           title: "No Findings",
//           description: "No dental findings found. Please add some findings first.",
//           variant: "destructive",
//         });
//         return;
//       }

//       // Create the data structure for stage creation
//       const data = {
//         validFindings: currentValidFindings,
//         useXrayMode: useXrayMode,
//         patientName: patientName,
//         patientObservations: patientObservations
//       };

//       // Use the same logic as handleNextStep to create/refresh stages
//       await openStageEditorWithFindings(data);
//     }
//   };

//   // Generate report directly from saved stages (for "Confirm and Generate Report" button)
//   const handleGenerateFromSavedStages = async () => {
//     if (!currentTreatmentStages || currentTreatmentStages.length === 0) {
//       toast({
//         title: "No Stages Found",
//         description: "No treatment stages found. Please create stages first.",
//         variant: "destructive",
//       });
//       return;
//     }

//     // Convert saved stages to the format expected by performSubmit
//     const organizedStages = currentTreatmentStages.map((stage, index) => ({
//       stage_title: stage.name,
//       focus: stage.focus,
//       visits: [{
//         visit_label: `Visit ${index + 1}`,
//         visit_duration_min: stage.totalTime || 0,
//         visit_cost: stage.totalCost || 0,
//         treatments: stage.items.map((item: any) => ({
//           tooth: item.toothNumber || item.tooth,
//           condition: item.condition,
//           treatment: item.treatment,
//           replacement: item.replacement,
//           price: getPrice(item.treatment) // ✅ FIXED: Always fetch price from database
//         }))
//       }]
//     }));

//     // Create the submit data structure
//     const submitData = {
//       validFindings: currentTreatmentStages.flatMap(stage => 
//         stage.items.map((item: any) => ({
//           tooth: item.toothNumber || item.tooth,
//           condition: item.condition,
//           treatment: item.treatment,
//           replacement: item.replacement,
//           price: item.price || 0
//         }))
//       ),
//       useXrayMode: useXrayMode,
//       patientName: patientName,
//       patientObservations: patientObservations,
//       organizedStages: organizedStages
//     };

//     // Generate the report directly
//     await performSubmit(submitData);
//   };

//   // Save function for the stage editor modal - only used when "Save" is clicked (not "Generate Report")
//   const handleSaveStageEdits = (editedStages: any[]) => {
//     console.log('🎯 Saving stage edits (Close/Save workflow)');
//     setCurrentTreatmentStages(editedStages);
    
//     // Close the stage editor - user can re-open to continue editing
//     setIsStageEditorOpen(false);
    
//     toast({
//       title: "Stages Saved",
//       description: "Your treatment stages have been saved. You can continue editing or generate the report.",
//     });
//   };

//   const handleRestoreVersion = (idx: number) => {
//     setReport(history[idx].html);
//     setHistory(h => h.slice(0, idx + 1));
//     setShowHistory(false);
//     setAuditTrail(prevTrail => [
//       { action: `Restored version from ${history[idx].timestamp}`, timestamp: new Date().toLocaleString() },
//       ...prevTrail
//     ]);
//   };

//   // Add this function after the existing handleRestoreVersion function
//   const handleRevertToVersion = (auditEntry: { action: string; timestamp: string }) => {
//     // Find the corresponding history entry by timestamp
//     const historyIndex = history.findIndex(h => h.timestamp === auditEntry.timestamp);
    
//     if (historyIndex >= 0 && historyIndex < history.length - 1) {
//       // Restore to that version
//       const versionToRestore = history[historyIndex];
//       setReport(versionToRestore.html);
      
//       // Update history to only include up to this version
//       setHistory(h => h.slice(0, historyIndex + 1));
      
//       // Add new audit entry for the revert action
//       setAuditTrail(prevTrail => [
//         { 
//           action: `Reverted to version from ${versionToRestore.timestamp}`, 
//           timestamp: new Date().toLocaleString() 
//         },
//         ...prevTrail
//       ]);
      
//       toast({
//         title: "Success",
//         description: `Reverted to version from ${versionToRestore.timestamp}`,
//       });
//     }
//   };

//   // Add cancel functionality
//   const handleCancelEdit = () => {
//     setIsEditing(false);
//     setEditedReport(null);    
//     setEditedReport(null);
//     // Reset the report content to original
//     if (reportRef.current && report) {
//       reportRef.current.innerHTML = report;
//     }
//   };

//   const downloadFile = (content: string, type: string, filename: string) => {
//     const blob = new Blob([content], { type });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = filename;
//     a.click();
//     URL.revokeObjectURL(url);
//   };

//   const handleDownload = (format: 'html' | 'txt') => {
//     if (!report) return;
//     if (format === 'html') downloadFile(report, 'text/html', 'treatment-report.html');
//     if (format === 'txt') downloadFile(report.replace(/<[^>]+>/g, ''), 'text/plain', 'treatment-report.txt');
//   };

//   const handleDownloadPDF = () => {
//     if (!report) return;
    
//     const printWindow = window.open('', '', 'width=800,height=600');
//     if (printWindow) {
//       printWindow.document.write(`
//         <html>
//           <head>
//             <title>Dental Report - ${patientName}</title>
//             <style>
//               body { font-family: Arial, sans-serif; margin: 20px; }
//               .report-container { max-width: 800px; margin: 0 auto; }
//               h2, h3, h4 { color: #333; }
//               img { max-width: 100%; height: auto; display: block; margin: 20px 0; }
//               .treatment-stage { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px; }
//               ul { margin: 10px 0; }
//               li { margin: 5px 0; }
//               @media print {
//                 body { margin: 0; }
//                 .report-container { max-width: 100%; }
//               }
//             </style>
//           </head>
//           <body>
//             ${report}
//           </body>
//         </html>
//       `);
//       printWindow.document.close();
      
//       printWindow.onload = () => {
//         printWindow.focus();
//         printWindow.print();
//       };
//     }
//   };

//   useEffect(() => {
//     const handler = () => {
//       setFindings(prev => {
//         if (prev.length === 0) return prev;
//         const f = prev[0];
//         const isEmpty = (!f.tooth || f.tooth.trim() === '') && (!f.condition || f.condition.trim() === '') && (!f.treatment || f.treatment.trim() === '') && (f.price === undefined);
//         return isEmpty ? prev.slice(1) : prev;
//       });
//     };
//     window.addEventListener('remove-empty-finding-placeholder', handler as EventListener);
//     return () => window.removeEventListener('remove-empty-finding-placeholder', handler as EventListener);
//   }, []);

//   // Check for existing video URL when component mounts
//   useEffect(() => {
//     const checkExistingVideo = async () => {
//       // If we have a report but no video URL, try to check if video was generated
//       if (report && !videoUrl) {
//         console.log('🚀 COMPONENT MOUNT: Checking for existing video URL...');
        
//         // Note: Video status checking is now handled by the video generation endpoint
//         console.log('🚀 COMPONENT MOUNT: Video status checking handled by backend');
//       }
//     };
    
//     checkExistingVideo();
//   }, [report, videoUrl]);

//   // Function to send report to patient via email
//   const handleSendReportToPatient = async () => {
//     if (!patientEmail.trim()) {
//       toast({
//         title: "Email Required",
//         description: "Please enter the patient's email address.",
//         variant: "destructive"
//       });
//       return;
//     }

//     if (!report) {
//       toast({
//         title: "Report Required",
//         description: "No report content available to send.",
//         variant: "destructive"
//       });
//       return;
//     }

//     setIsSendingEmail(true);
    
//     try {
//       // Send preview report using the new API endpoint
//       // SECURITY FIX: Apply same validation as generateReportHTML to block unsafe local file paths
//       let emailImageUrl = originalImageUrl || immediateAnalysisData?.annotated_image_url;
//       if (emailImageUrl && (emailImageUrl.startsWith('/tmp/') || emailImageUrl.startsWith('file://') || !emailImageUrl.startsWith('http'))) {
//         console.warn('🚨 SECURITY: Blocking local file path from email:', emailImageUrl);
//         emailImageUrl = null; // Don't include potentially unsafe local paths
//       }
      
//       const result = await api.sendPreviewReportToPatient({
//         patientEmail: patientEmail.trim(),
//         patientName: patientName || 'Patient',
//         reportContent: report,
//         findings: findings || [],
//         annotatedImageUrl: emailImageUrl
//       });
      
//       if (result.success) {
//         toast({
//           title: "Report Sent!",
//           description: `Dental report has been sent to ${patientEmail}`,
//         });
//         setPatientEmail(''); // Clear the email input
//       } else {
//         throw new Error(result.error || 'Failed to send report');
//       }
      
//     } catch (error) {
//       console.error('Error sending report:', error);
//       toast({
//         title: "Send Failed",
//         description: "Failed to send report. Please try again.",
//         variant: "destructive"
//       });
//     } finally {
//       setIsSendingEmail(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <header className="bg-white border-b shadow-sm">
//         <div className="px-6 py-4 flex items-center justify-between">
//           <div className="flex items-center space-x-6">
//             <div className="flex items-center space-x-2">
//               <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
//                 <Brain className="h-5 w-5 text-white" />
//               </div>
//               <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
//                 Scanwise
//               </span>
//             </div>
//           </div>

//           <div className="flex items-center gap-3">
//             <ViewInBulgarian />
//             <LanguageSelector />
//             <Button variant="ghost" onClick={() => navigate("/dashboard")} className="flex items-center">
//               <ArrowLeft className="mr-2 h-4 w-4" />
//               {t.nav.dashboard}
//             </Button>
//           </div>
//         </div>
//       </header>

//       {/* Main Content */}
//       <div className="p-6">
//         <div className="max-w-4xl mx-auto">
//           <div className="mb-8">
//             <h1 className="text-3xl font-bold text-gray-900 mb-2">
//               Create New Report
//             </h1>
//             <p className="text-gray-600">
//               Upload a panoramic X-ray (OPG) to generate an AI-enhanced treatment report
//             </p>
//           </div>

//           <form onSubmit={handleSubmit}>
//             {/* Mode Toggle Section - Only show before AI analysis is complete */}
//             {!immediateAnalysisData && (
//               <Card className="mb-6">
//                 <CardHeader>
//                   <CardTitle className="flex items-center justify-between">
//                     <span className="flex items-center">
//                       <Brain className="mr-2 h-5 w-5" />
//                       {t.createReport.title}
//                     </span>
//                     <div className="flex items-center space-x-2">
//                       <Label htmlFor="xray-mode" className="text-sm font-normal">
//                         {useXrayMode ? "With X-ray" : "Without X-ray"}
//                       </Label>
//                       <Switch
//                         id="xray-mode"
//                         checked={useXrayMode}
//                         onCheckedChange={setUseXrayMode}
//                         className="data-[state=checked]:bg-blue-600"
//                       />
//                     </div>
//                   </CardTitle>
//                   <CardDescription>
//                     {useXrayMode
//                       ? "Generate report with AI analysis of uploaded X-ray image"
//                       : "Generate report based on manual observations and findings only"}
//                   </CardDescription>
//                 </CardHeader>
//               </Card>
//             )}

//             {/* Upload Section - Only show when useXrayMode is true and no report */}
//             {useXrayMode && !report && (
//               <Card className="mb-8">
//                 <CardHeader>
//                   <CardTitle className="flex items-center">
//                     <FileImage className="mr-2 h-5 w-5" />
//                     {t.createReport.uploadXray}
//                   </CardTitle>
//                   <CardDescription>
//                     Upload the patient's panoramic X-ray for AI analysis and treatment planning
//                   </CardDescription>
//                 </CardHeader>
//                 <CardContent>
//                 {!uploadedImage ? (
//                   <div 
//                     className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 ${
//                       isDragOver 
//                         ? 'border-blue-500 bg-blue-50 scale-105' 
//                         : 'border-gray-300 hover:border-blue-400'
//                     }`}
//                     onDrop={handleDrop}
//                     onDragOver={handleDragOver}
//                     onDragLeave={handleDragLeave}
//                   >
//                     <Upload className={`mx-auto h-16 w-16 mb-6 transition-colors ${
//                       isDragOver ? 'text-blue-500' : 'text-gray-400'
//                     }`} />
//                     <div className="space-y-4">
//                       <div>
//                         <label htmlFor="opg-upload" className="cursor-pointer">
//                           <span className="text-xl font-medium text-blue-600 hover:text-blue-700">
//                             Click to upload OPG image
//                           </span>
//                         </label>
//                         <p className="text-gray-500 mt-2">
//                           or drag and drop your panoramic X-ray file here
//                         </p>
//                         {isDragOver && (
//                           <p className="text-blue-600 font-medium mt-2">
//                             Drop your file here to upload
//                           </p>
//                         )}
//                       </div>
//                       <p className="text-sm text-gray-400">
//                         Supports: DICOM, JPEG, PNG, TIFF (Max 50MB)
//                       </p>
//                       <input 
//                         id="opg-upload"
//                         type="file"
//                         onChange={handleImageUpload}
//                         accept=".dcm,.jpg,.jpeg,.png,.tiff,.tif"
//                         className="hidden"
//                       />
//                     </div>
//                   </div>
//                 ) : (
//                   <div className="space-y-6">
//                     <div className="relative">
//                       <div className={`flex items-center justify-between p-4 ${isProcessing ? 'opacity-50' : ''} bg-green-50 border border-green-200 rounded-lg transition-opacity`}>
//                         <div className="flex items-center space-x-3">
//                           <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
//                             <Camera className="h-5 w-5 text-green-600" />
//                           </div>
//                           <div>
//                             <p className="font-medium text-green-900">{uploadedImage.name}</p>
//                             <p className="text-sm text-green-700">
//                               {(uploadedImage.size / (1024 * 1024)).toFixed(2)} MB • Ready for analysis
//                             </p>
//                           </div>
//                         </div>
//                         <Badge className="bg-green-100 text-green-700 border-green-200">
//                           ✓ Uploaded
//                         </Badge>
//                       </div>

//                                              {/* Full-Screen AI Analysis Loading Modal */}
//                       {isAnalyzingImage && (
//                         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
//                           <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
//                             <div className="text-center">
//                               <div className="relative inline-flex">
//                                 <Brain className="w-16 h-16 text-blue-600" />
//                                 <div className="absolute inset-0 w-16 h-16 bg-blue-600/20 rounded-full animate-ping" />
//                               </div>
//                               <h3 className="text-xl font-semibold mt-4 mb-2">AI Analyzing X-ray</h3>
//                               <p className="text-gray-600 mb-6">Processing your X-ray with advanced AI...</p>
                              
//                               {/* Progress Bar */}
//                               <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
//                                 <div 
//                                   className="h-3 bg-blue-600 rounded-full transition-all duration-300 ease-out"
//                                   style={{ width: `${analysisProgress}%` }}
//                                 />
//                               </div>
                              
//                               <div className="flex items-center justify-center text-sm text-gray-500">
//                                 <Loader2 className="w-4 h-4 animate-spin mr-2" />
//                                 This will take a few moments...
//                               </div>
//                             </div>
//                           </div>
//                         </div>
//                       )}

//                       {/* Enhanced Loading Animation with Real Progress */}
//                       {isProcessing && (
//                         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
//                           <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
//                             <div className="text-center">
//                               <div className="relative inline-flex">
//                                 <Brain className="w-16 h-16 text-blue-600" />
//                                 <div className="absolute inset-0 w-16 h-16 bg-blue-600/20 rounded-full animate-ping" />
//                               </div>
//                               <h3 className="text-xl font-semibold mt-4 mb-2">Generating Treatment Report</h3>
//                               <p className="text-gray-600 mb-6">Creating comprehensive treatment plan</p>
                              
//                               {/* Single Dynamic Progress Bar */}
//                               <div className="space-y-4">
//                                 <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
//                                   <div 
//                                     className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
//                                     style={{ width: `${reportProgress}%` }}
//                                   />
//                                 </div>
                                
//                                 <div className="flex items-center justify-between text-sm">
//                                   <span className="text-blue-600 font-medium">{reportProgress}%</span>
//                                   <span className="text-gray-600">Complete</span>
//                                 </div>
                                
//                                 {/* Current Step Text */}
//                                 {reportProgressText && (
//                                   <div className="text-sm text-gray-700 mt-3">
//                                     {reportProgressText}
//                                   </div>
//                                 )}
//                               </div>
                              
//                               <div className="mt-6 flex items-center justify-center text-sm text-gray-500">
//                                 <Loader2 className="w-4 h-4 animate-spin mr-2" />
//                                 This may take up to 2 minutes...
//                               </div>
//                             </div>
//                           </div>
//                         </div>
//                       )}
//                     </div>





//                     {/* UNIFIED AI Analysis Section - Single source of truth */}
//                     {immediateAnalysisData && !isAnalyzingImage && !isProcessing && !report && (
//                       <AIAnalysisSection
//                         findingsSummary={immediateAnalysisData.findings_summary}
//                         detections={immediateAnalysisData.detections}
//                         annotatedImageUrl={immediateAnalysisData.annotated_image_url}
//                         onAcceptFinding={handleAcceptAIFinding}
//                         onRejectFinding={handleRejectAIFinding}
//                         // Tooth numbering overlay props
//                         showToothNumberOverlay={showToothNumberOverlay}
//                         setShowToothNumberOverlay={setShowToothNumberOverlay}
//                         textSizeMultiplier={textSizeMultiplier}
//                         setTextSizeMultiplier={setTextSizeMultiplier}
//                         isUpdatingTextSize={isUpdatingTextSize}
//                         originalImageUrl={originalImageUrl}
//                         setImmediateAnalysisData={setImmediateAnalysisData}
//                       />
//                     )}



//                     {/* Patient Name Input - Only show if no report and not analyzing */}
//                     {!report && !isAnalyzingImage && (
//                       <div className={`mt-4 ${isProcessing ? 'opacity-50 pointer-events-none' : ''} transition-opacity`}>
//                         <label className="block font-medium text-blue-900 mb-1">{t.createReport.patientName}</label>
//                         <Input
//                           value={patientName}
//                           onChange={e => setPatientName(e.target.value)}
//                           placeholder={t.createReport.patientNamePlaceholder}
//                           required
//                           disabled={isProcessing}
//                         />
//                       </div>
//                     )}



//                     {/* Enhanced Findings Table - Only show if no report and not analyzing */}
//                     {!report && !isAnalyzingImage && (
//                       <div className={`mt-6 ${isProcessing ? 'opacity-50 pointer-events-none' : ''} transition-opacity`}>
//                         <div className="flex items-center justify-between mb-4">
//                           <div className="flex items-center space-x-4">
//                             <span className="font-medium text-blue-900">Manual Findings Entry</span>
//                             {immediateAnalysisData && (
//                               <Badge variant="outline" className="bg-blue-50">
//                                 {immediateAnalysisData.detections?.length || 0} AI suggestions available above
//                               </Badge>
//                             )}
//                           </div>
//                           <div className="flex items-center space-x-4">
//                             <div className="flex items-center space-x-2">
//                               <Label htmlFor="show-pricing" className="text-sm font-medium text-gray-700">
//                                 {t.createReport.showTreatmentPricing}
//                               </Label>
//                               <Switch
//                                 id="show-pricing"
//                                 checked={showTreatmentPricing}
//                                 onCheckedChange={(checked) => {
//                                   setShowTreatmentPricing(checked);
//                                   localStorage.setItem('showTreatmentPricing', checked.toString());
//                                 }}
//                                 className="data-[state=checked]:bg-blue-600"
//                               />
//                             </div>
//                             <Button type="button" variant="outline" onClick={addFinding} size="sm" disabled={isProcessing}>
//                               + {t.createReport.addFinding}
//                             </Button>
//                           </div>
//                         </div>
                        
//                         <div id="findings-list" className="space-y-4">
//                         {findings.map((f, idx) => {
//                           const isMissingTooth = normalizeConditionName(f.condition) === 'missing-tooth';
//                           return (
//                           <Card key={idx} id={`finding-${idx}`} className="p-4 finding-card relative">
//                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
//                               {/* Tooth Number */}
//                               <div className="space-y-2">
//                                 <div className="flex items-center space-x-1">
//                                   <Label className="text-sm font-medium">{t.createReport.tooth} ({toothNumberingSystem})</Label>
//                                   <Tooltip>
//                                     <TooltipTrigger asChild>
//                                       <Info className="h-3 w-3 text-gray-400 cursor-help" />
//                                     </TooltipTrigger>
//                                     <TooltipContent>
//                                       <div className="space-y-2">
//                                         <p>You can change between FDI or Universal in settings.</p>
//                                         <a 
//                                           href="/settings" 
//                                           target="_blank" 
//                                           rel="noopener noreferrer"
//                                           className="text-blue-600 hover:text-blue-700 underline"
//                                         >
//                                           Open Settings
//                                         </a>
//                                       </div>
//                                     </TooltipContent>
//                                   </Tooltip>
//                                 </div>
//                                 <SearchableSelect
//                                   options={getToothOptions(toothNumberingSystem)}
//                                   value={f.tooth}
//                                   onValueChange={(value) => handleFindingChange(idx, "tooth", value)}
//                                   placeholder={t.createReport.selectTooth}
//                                   searchPlaceholder="Search tooth number..."
//                                   disabled={isProcessing}
//                                 />
//                               </div>

//                               {/* Condition */}
//                               <div className="space-y-2 lg:col-span-2">
//                                 <Label className="text-sm font-medium">{t.createReport.condition}</Label>
//                                 <SearchableSelect
//                                   options={ALL_CONDITIONS}
//                                   value={f.condition}
//                                   onValueChange={(value) => handleFindingChange(idx, "condition", value)}
//                                   placeholder={dentalDataLoading ? "Loading..." : t.createReport.selectCondition}
//                                   searchPlaceholder="Search conditions..."
//                                   disabled={isProcessing || dentalDataLoading}
//                                 />
//                               </div>

//                               {/* Treatment */}
//                               <div className="space-y-2 lg:col-span-2">
//                                 <Label className="text-sm font-medium">{t.createReport.treatment}</Label>
//                                 <SearchableSelect
//                                   options={ALL_TREATMENTS}
//                                   value={f.treatment}
//                                   onValueChange={(value) => handleFindingChange(idx, "treatment", value)}
//                                   placeholder={dentalDataLoading ? "Loading..." : t.createReport.selectTreatment}
//                                   searchPlaceholder="Search treatments..."
//                                   disabled={isProcessing || dentalDataLoading}
//                                 />
//                               </div>

//                               {/* Replacement Field - Only show when extraction is selected */}
//                               {f.treatment === 'extraction' && (
//                                 <div className="space-y-2">
//                                   <Label className="text-sm font-medium">Replacement</Label>
//                                   <SearchableSelect
//                                     options={getReplacementOptions(f.tooth)}
//                                     value={f.replacement || ''}
//                                     onValueChange={(value) => handleFindingChange(idx, "replacement", value)}
//                                     placeholder="Select replacement..."
//                                     searchPlaceholder="Search replacements..."
//                                     disabled={isProcessing}
//                                   />
//                                 </div>
//                               )}

//                                 {/* Remove Button / Toggle Column */}
//                                 <div className="space-y-2">
//                                   <Label className="text-sm font-medium opacity-0">Actions</Label>
//                                   <Button
//                                     type="button"
//                                     variant="destructive"
//                                     size="sm"
//                                     onClick={() => removeFinding(idx)}
//                                     disabled={findings.length === 1 || isProcessing}
//                                     className="w-full"
//                                   >
//                                     {t.common.remove}
//                                   </Button>


//                                 </div>
//                               </div>

//                               {/* Pricing Input */}
//                               {f.treatment && showTreatmentPricing && (
//                                 <div className="mt-4 pt-4 border-t">
//                                   <Label className="text-sm font-medium mb-2 block">Treatment Pricing</Label>
//                                   <PricingInput
//                                     treatment={f.treatment}
//                                     value={f.price}
//                                     onChange={(price) => handleFindingChange(idx, "price", price)}
//                                     onPriceSave={handlePriceSave}
//                                     disabled={isProcessing}
//                                   />
//                                 </div>
//                               )}
//                           </Card>
//                           )})}
//                         </div>
//                       </div>
//                     )}

//                     {/* Unified Replacement Options Toggle - Only show when relevant treatments exist */}
//                     {(() => {
//                       // Check if any findings have relevant replacement treatments
//                       const hasReplacementTreatments = findings.some(f => 
//                         f.treatment && ['implant-placement', 'crown', 'bridge', 'partial-denture'].includes(f.treatment)
//                       );
                      
//                       if (!hasReplacementTreatments) return null;
                      
//                       return (
//                         <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
//                           <div className="flex items-center justify-between">
//                             <div>
//                               <Label htmlFor="replacement-options-toggle" className="text-sm font-medium text-blue-900">
//                                 🦷 Replacement Options Comparison
//                               </Label>
//                               <p className="text-xs text-blue-700 mt-1">
//                                 Include a comprehensive comparison table for all replacement treatments in your report
//                               </p>
//                             </div>
//                             <Switch
//                               id="replacement-options-toggle"
//                               checked={showReplacementOptionsTable}
//                               onCheckedChange={(checked) => {
//                                 setShowReplacementOptionsTable(checked);
//                                 localStorage.setItem('showReplacementOptionsTable', checked.toString());
//                               }}
//                               className="data-[state=checked]:bg-blue-600"
//                             />
//                           </div>
//                         </div>
//                       );
//                     })()}



//                     {/* Submit Button - Only show if no report */}
//                     {!report && (
//                       <div className="flex flex-col items-center gap-3 mt-8">
//                         {/* Continue Editing Stages button - shown if stages were previously saved */}
//                         {currentTreatmentStages.length > 0 && !isProcessing && (
//                           <Button 
//                             type="button"
//                             variant="outline"
//                             size="lg"
//                             onClick={handleContinueEditingStages}
//                             className="text-lg px-8 py-4"
//                           >
//                             <Edit3 className="mr-2 h-5 w-5" />
//                             Continue Editing Stages
//                           </Button>
//                         )}
                        
//                         {/* Main Next Step button */}
//                         <Button 
//                           size="lg"
//                           type={currentTreatmentStages.length > 0 ? "button" : "submit"}
//                           disabled={isProcessing}
//                           onClick={currentTreatmentStages.length > 0 ? handleGenerateFromSavedStages : undefined}
//                           className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-lg px-8 py-4"
//                         >
//                           {isProcessing ? (
//                             <>
//                               <Loader2 className="mr-2 h-5 w-5 animate-spin" />
//                               {t.createReport.analyzing}...
//                             </>
//                           ) : (
//                             <>
//                               <ArrowRight className="mr-2 h-5 w-5" />
//                               {currentTreatmentStages.length > 0 ? 'Confirm and Generate Report' : 'Next Step'}
//                             </>
//                           )}
//                         </Button>
//                       </div>
//                     )}
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//             )}

//             {/* Upload Guidelines - Only show when no report */}
//             {!report && (
//               <Card className="mb-8">
//               <CardHeader>
//                 <CardTitle>Upload Guidelines</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="grid md:grid-cols-2 gap-6">
//                   <div>
//                     <h4 className="font-medium text-gray-900 mb-3">Image Quality Requirements</h4>
//                     <ul className="space-y-2 text-sm text-gray-600">
//                       <li>• High resolution (minimum 1200x800 pixels)</li>
//                       <li>• Clear visibility of all teeth and surrounding structures</li>
//                       <li>• Minimal motion artifacts or blur</li>
//                       <li>• Proper exposure and contrast</li>
//                     </ul>
//                   </div>
//                   <div>
//                     <h4 className="font-medium text-gray-900 mb-3">What's Included</h4>
//                     <ul className="space-y-2 text-sm text-gray-600">
//                       <li>• AI-powered dental condition detection</li>
//                       <li>• Comprehensive treatment plan</li>
//                       <li>• Patient-friendly video explanation</li>
//                       <li>• Downloadable reports in multiple formats</li>
//                     </ul>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//             )}

//             {/* Observations Section - Only show when useXrayMode is false and no report */}
//             {!useXrayMode && !report && (
//               <Card className="mb-8">
//                 <CardHeader>
//                   <CardTitle className="flex items-center">
//                     <FileText className="mr-2 h-5 w-5" />
//                     Patient Observations
//                   </CardTitle>
//                   <CardDescription>
//                     Enter your clinical observations and notes about the patient's dental condition
//                   </CardDescription>
//                 </CardHeader>
//                 <CardContent>
//                   <div className={`space-y-4 ${isProcessing ? 'opacity-50 pointer-events-none' : ''} transition-opacity`}>
//                     <div>
//                       <Label htmlFor="patient-name-no-xray" className="block font-medium text-blue-900 mb-1">
//                         Patient Name
//                       </Label>
//                       <Input
//                         id="patient-name-no-xray"
//                         value={patientName}
//                         onChange={e => setPatientName(e.target.value)}
//                         placeholder="Enter patient name"
//                         required
//                         disabled={isProcessing}
//                       />
//                     </div>
//                     <div>
//                       <Label htmlFor="observations" className="block font-medium text-blue-900 mb-1">
//                         {t.createReport.clinicalObservations}
//                       </Label>
//                       <Textarea
//                         id="observations"
//                         value={patientObservations}
//                         onChange={e => setPatientObservations(e.target.value)}
//                         placeholder={t.createReport.clinicalObservationsPlaceholder}
//                         rows={6}
//                         className="w-full"
//                         disabled={isProcessing}
//                       />
//                     </div>
//                   </div>

//                   {/* Manual Findings for Non-X-ray Mode */}
//                   <div className={`mt-6 ${isProcessing ? 'opacity-50 pointer-events-none' : ''} transition-opacity`}>
//                     <div className="flex items-center justify-between mb-4">
//                       <span className="font-medium text-blue-900">Manual Findings</span>
//                       <Button type="button" variant="outline" onClick={addFinding} size="sm" disabled={isProcessing}>
//                         + {t.createReport.addFinding}
//                       </Button>
//                     </div>
                    
//                     <div className="space-y-4">
//                       {findings.map((f, idx) => {
//                         const isMissingTooth = normalizeConditionName(f.condition) === 'missing-tooth';
//                         return (
//                         <Card key={idx} id={`finding-${idx}`} className="p-4 relative">
//                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
//                             {/* Tooth Number */}
//                             <div className="space-y-2">
//                               <div className="flex items-center space-x-1">
//                                 <Label className="text-sm font-medium">{t.createReport.tooth} ({toothNumberingSystem})</Label>
//                                 <Tooltip>
//                                   <TooltipTrigger asChild>
//                                     <Info className="h-3 w-3 text-gray-400 cursor-help" />
//                                   </TooltipTrigger>
//                                   <TooltipContent>
//                                     <div className="space-y-2">
//                                       <p>You can change between FDI or Universal in settings.</p>
//                                                                               <a 
//                                           href="/settings" 
//                                           target="_blank" 
//                                           rel="noopener noreferrer"
//                                           className="text-blue-600 hover:text-blue-700 underline"
//                                         >
//                                           Open Settings
//                                         </a>
//                                     </div>
//                                   </TooltipContent>
//                                 </Tooltip>
//                               </div>
//                               <SearchableSelect
//                                 options={getToothOptions(toothNumberingSystem)}
//                                 value={f.tooth}
//                                 onValueChange={(value) => handleFindingChange(idx, "tooth", value)}
//                                 placeholder="Select tooth"
//                                 searchPlaceholder="Search tooth number..."
//                                 disabled={isProcessing}
//                               />
//                             </div>

//                             {/* Condition */}
//                             <div className="space-y-2">
//                               <Label className="text-sm font-medium">Condition</Label>
//                               <SearchableSelect
//                                 options={ALL_CONDITIONS}
//                                 value={f.condition}
//                                 onValueChange={(value) => handleFindingChange(idx, "condition", value)}
//                                 placeholder={dentalDataLoading ? "Loading..." : "Select condition"}
//                                 searchPlaceholder="Search conditions..."
//                                 disabled={isProcessing || dentalDataLoading}
//                               />
//                             </div>

//                             {/* Treatment */}
//                             <div className="space-y-2 lg:col-span-2">
//                               <Label className="text-sm font-medium">Treatment</Label>
//                               <SearchableSelect
//                                 options={ALL_TREATMENTS}
//                                 value={f.treatment}
//                                 onValueChange={(value) => handleFindingChange(idx, "treatment", value)}
//                                 placeholder={dentalDataLoading ? "Loading..." : "Select treatment"}
//                                 searchPlaceholder="Search treatments..."
//                                 disabled={isProcessing || dentalDataLoading}
//                               />
//                             </div>

//                             {/* Remove Button / Toggle Column */}
//                             <div className="space-y-2">
//                               <Label className="text-sm font-medium opacity-0">Actions</Label>
//                               <Button
//                                 type="button"
//                                 variant="destructive"
//                                 size="sm"
//                                 onClick={() => removeFinding(idx)}
//                                 disabled={findings.length === 1 || isProcessing}
//                                 className="w-full"
//                               >
//                                 Remove
//                               </Button>

//                             </div>
//                           </div>

//                           {/* Pricing Input */}
//                           {f.treatment && showTreatmentPricing && (
//                             <div className="mt-4 pt-4 border-t">
//                               <Label className="text-sm font-medium mb-2 block">Treatment Pricing</Label>
//                               <PricingInput
//                                 treatment={f.treatment}
//                                 value={f.price}
//                                 onChange={(price) => handleFindingChange(idx, "price", price)}
//                                 onPriceSave={handlePriceSave}
//                                 disabled={isProcessing}
//                               />
//                             </div>
//                           )}
//                         </Card>
//                       )})}
//                     </div>
//                   </div>



//                   {/* Submit Button for Non-X-ray Mode */}
//                   <div className="flex flex-col items-center gap-3 mt-8">
//                     {/* Continue Editing Stages button - shown if stages were previously saved */}
//                     {currentTreatmentStages.length > 0 && !isProcessing && (
//                       <Button 
//                         type="button"
//                         variant="outline"
//                         size="lg"
//                         onClick={handleContinueEditingStages}
//                         className="text-lg px-8 py-4"
//                       >
//                         <Edit3 className="mr-2 h-5 w-5" />
//                         Continue Editing Stages
//                       </Button>
//                     )}
                    
//                     {/* Main Next Step button */}
//                     <Button
//                       size="lg"
//                       type={currentTreatmentStages.length > 0 ? "button" : "submit"}
//                       disabled={isProcessing}
//                       onClick={currentTreatmentStages.length > 0 ? handleGenerateFromSavedStages : undefined}
//                       className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-lg px-8 py-4"
//                     >
//                       {isProcessing ? (
//                         <>
//                           <Loader2 className="mr-2 h-5 w-5 animate-spin" />
//                           Generating Report...
//                         </>
//                       ) : (
//                         <>
//                           <ArrowRight className="mr-2 h-5 w-5" />
//                           {currentTreatmentStages.length > 0 ? 'Confirm and Generate Report' : 'Next Step'}
//                         </>
//                       )}
//                     </Button>
//                   </div>

//                   {/* Full-Screen Loading Modal for Non-X-ray Mode */}
//                   {isProcessing && (
//                     <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
//                       <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
//                         <div className="text-center">
//                           <div className="relative inline-flex">
//                             <Brain className="w-16 h-16 text-blue-600" />
//                             <div className="absolute inset-0 w-16 h-16 bg-blue-600/20 rounded-full animate-ping" />
//                           </div>
//                           <h3 className="text-xl font-semibold mt-4 mb-2">Generating Treatment Report</h3>
//                           <p className="text-gray-600 mb-6">Creating comprehensive treatment plan</p>
                          
//                           {/* Single Dynamic Progress Bar */}
//                           <div className="space-y-4">
//                             <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
//                               <div
//                                 className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
//                                 style={{ width: `${reportProgress}%` }}
//                               />
//                             </div>
                            
//                             <div className="flex items-center justify-between text-sm">
//                               <span className="text-blue-600 font-medium">{reportProgress}%</span>
//                               <span className="text-gray-600">Complete</span>
//                             </div>
                            
//                             {/* Current Step Text */}
//                             {reportProgressText && (
//                               <div className="text-sm text-gray-700 mt-3">
//                                 {reportProgressText}
//                               </div>
//                             )}
//                           </div>
                          
//                           <div className="mt-6 flex items-center justify-center text-sm text-gray-500">
//                             <Loader2 className="w-4 h-4 animate-spin mr-2" />
//                             This may take up to 2 minutes...
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   )}
//                 </CardContent>
//               </Card>
//             )}
//             </form>

            
//                     {/* Report Display Section - Clean without duplicate confidence scores */}
//                     {report && (
//                       <Card className="mt-8 bg-white border-blue-200">
//                         <CardHeader>
//                           <CardTitle className="text-blue-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//                             <span>Generated Treatment Report</span>
//                             <div className="flex flex-wrap gap-2">
//                               <Button type="button" size="sm" variant="outline" onClick={handleUndo} disabled={history.length <= 1}>
//                                 Undo
//                               </Button>
//                               <Button type="button" size="sm" variant="outline" onClick={() => setShowHistory(h => !h)} disabled={history.length <= 1}>
//                                 History
//                               </Button>
//                               <Button type="button" size="sm" variant="outline" onClick={() => handleDownload('html')}>
//                                 HTML
//                               </Button>
//                               <Button type="button" size="sm" variant="outline" onClick={() => handleDownload('txt')}>
//                                 TXT
//                               </Button>
//                               <Button type="button" size="sm" variant="outline" onClick={handleDownloadPDF}>
//                                 PDF
//                               </Button>
//                             </div>
//                           </CardTitle>
//                         </CardHeader>
//                         <CardContent>
//                           <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
//                             <TabsList className="grid w-full grid-cols-2 mb-4">
//                               <TabsTrigger value="report" className="flex items-center gap-2">
//                                 <FileText className="w-4 h-4" />
//                                 Written Report
//                               </TabsTrigger>
//                               <TabsTrigger value="video" className="flex items-center gap-2" disabled={!videoUrl}>
//                                 <Video className="w-4 h-4" />
//                                 Patient Video {!videoUrl ? "(Generating...)" : ""}
//                               </TabsTrigger>
//                             </TabsList>

//                             {/* Report Tab - Cleaned up, no duplicate confidence scores */}
//                             <TabsContent value="report" className="mt-4">
//                               <div className="relative">
//                                 {/* Loading overlay for AI */}
//                                 {isAiLoading && (
//                                   <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 backdrop-blur-sm">
//                                     <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
//                                   </div>
//                                 )}
                                
//                                 {isEditing ? (
//                                    <>
//                                     <div
//                                       ref={reportRef}
//                                       className="border rounded p-4 min-h-[120px] bg-gray-50 focus:outline-blue-400 outline outline-2"
//                                       contentEditable={true}
//                                       suppressContentEditableWarning={true}
//                                       dangerouslySetInnerHTML={{ __html: editedReport || report }}
//                                       style={{ overflowX: 'auto', wordBreak: 'break-word' }}
//                                     />
//                                     <div className="flex gap-2 mt-3">
//                                       <Button type="button" onClick={handleSaveEdit}>
//                                         Save Changes
//                                       </Button>
//                                       <Button type="button" variant="outline" onClick={handleCancelEdit}>
//                                         Cancel
//                                       </Button>
//                                     </div>
//                                   </>
//                                 ) : (
//                                    <>
//                                     <div
//                                       ref={reportRef}
//                                       className="border rounded p-4 min-h-[120px] bg-gray-50"
//                                       dangerouslySetInnerHTML={{ __html: report }}
//                                       style={{ overflowX: 'auto', wordBreak: 'break-word' }}
//                                     />
//                                     <Button className="mt-3" type="button" onClick={handleEditClick} disabled={isAiLoading}>
//                                       Edit Report
//                                     </Button>
//                                   </>
//                                 )}
//                               </div>
//                             </TabsContent>

//                             {/* Video Tab */}
//                             <TabsContent value="video" className="mt-4">
//                               {videoUrl ? (
//                                 <div className="space-y-4">
//                                   <div className="bg-gray-900 rounded-lg overflow-hidden">
//                                     <video 
//                                       controls 
//                                       className="w-full"
//                                       poster={report.match(/src="([^"]+)"/)?.[1] || ''}
//                                     >
//                                       <source src={videoUrl} type="video/mp4" />
//                                       Your browser does not support the video tag.
//                                     </video>
//                                   </div>
//                                   <div className="bg-blue-50 p-4 rounded-lg">
//                                     <h4 className="font-semibold text-blue-900 mb-2">About This Video</h4>
//                                     <p className="text-sm text-blue-700">
//                                       This personalized video explains the X-ray findings in an easy-to-understand way. 
//                                       It includes voice narration and subtitles to help patients understand their dental conditions and treatment options.
//                                     </p>
//                                   </div>
//                                   <div className="flex gap-2">
//                                     <Button 
//                                       variant="outline" 
//                                       onClick={() => window.open(videoUrl, '_blank')}
//                                       className="flex items-center gap-2"
//                                     >
//                                       <Play className="w-4 h-4" />
//                                       Open in New Tab
//                                     </Button>
//                                     <Button 
//                                       variant="outline"
//                                       onClick={() => {
//                                         const a = document.createElement('a');
//                                         a.href = videoUrl;
//                                         a.download = `patient-video-${patientName.replace(/\s+/g, '-')}.mp4`;
//                                         document.body.appendChild(a);
//                                         a.click();
//                                         document.body.removeChild(a);
//                                       }}
//                                     >
//                                       Download Video
//                                     </Button>
//                                   </div>
//                                 </div>
//                               ) : (
//                                 <div className="text-center py-12">
//                                   <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
//                                   <h3 className="text-lg font-semibold text-gray-700 mb-2">Patient Video Generating</h3>
//                                   <p className="text-gray-600 mb-2">Your personalized patient education video is being created...</p>
//                                   <p className="text-sm text-gray-500 mb-4">This usually takes 1-3 minutes</p>
//                                   <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-4" />
//                                   <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-md mx-auto">
//                                     <p className="text-xs text-blue-700">
//                                       <strong>What's happening:</strong> AI is generating voice narration, creating subtitles, and combining everything with your X-ray analysis.
//                                     </p>
//                                   </div>
//                                 </div>
//                               )}
//                             </TabsContent>
//                           </Tabs>

//                           {/* Send Report to Patient - Prominent Section */}
//                           <div className="mt-8 border-t pt-6">
//                             <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
//                               <CardContent className="p-6">
//                                 <div className="flex items-center justify-between">
//                                   <div className="flex items-center space-x-3">
//                                     <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
//                                       <Mail className="w-6 h-6 text-green-600" />
//                                     </div>
//                                     <div>
//                                       <h3 className="text-lg font-semibold text-green-900">Send Report to Patient</h3>
//                                       <p className="text-sm text-green-700">
//                                         Send this completed dental report directly to your patient's email
//                                       </p>
//                                     </div>
//                                   </div>
                                  
//                                   <div className="flex items-center space-x-3">
//                                     <input
//                                       type="email"
//                                       value={patientEmail}
//                                       onChange={(e) => setPatientEmail(e.target.value)}
//                                       placeholder="patient@example.com"
//                                       className="px-4 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent w-64"
//                                     />
//                                     <Button
//                                       onClick={handleSendReportToPatient}
//                                       disabled={isSendingEmail || !patientEmail.trim()}
//                                       className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 px-6"
//                                     >
//                                       {isSendingEmail ? (
//                                         <>
//                                           <Loader2 className="w-4 h-4 animate-spin" />
//                                           Sending...
//                                         </>
//                                       ) : (
//                                         <>
//                                           <Send className="w-4 h-4" />
//                                           Send Report
//                                         </>
//                                       )}
//                                     </Button>
//                                   </div>
//                                 </div>
//                               </CardContent>
//                             </Card>
//                           </div>

//                           {/* AI Suggestion Section - Only show in report tab */}
//                           {activeTab === "report" && (
//                             <div className="mt-8 border-t pt-8">
//                               <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2">
//                                 <label className="font-medium text-blue-900">AI-Powered Report Editing</label>
//                               </div>
//                               <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
//                                 <textarea
//                                   value={aiSuggestion}
//                                   onChange={e => {
//                                     setAiSuggestion(e.target.value);
//                                     // Auto-resize the textarea
//                                     e.target.style.height = 'auto';
//                                     e.target.style.height = e.target.scrollHeight + 'px';
//                                   }}
//                                   placeholder="Type or speak your change request..."
//                                   disabled={isAiLoading}
//                                   className="flex-1 min-h-[40px] px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-hidden"
//                                   style={{ height: '40px' }}
//                                   onInput={e => {
//                                     // Ensure height adjusts on input (for speech dictation)
//                                     const target = e.target as HTMLTextAreaElement;
//                                     target.style.height = 'auto';
//                                     target.style.height = target.scrollHeight + 'px';
//                                   }}
//                                 />
//                                 <Button type="button" variant={isListening ? "secondary" : "outline"} onClick={handleMicClick} disabled={isAiLoading}>
//                                   <Mic className={isListening ? "animate-pulse text-red-500" : ""} />
//                                 </Button>
//                                                 <Button type="button" onClick={handleAiSuggest} disabled={isAiLoading || !aiSuggestion.trim()}>
//                                   Apply Changes
//                                 </Button>
//                               </div>
//                               <div className="text-xs text-gray-500 mt-1">
//                                 Example: "Make the summary more concise" or "Add a section about oral hygiene recommendations"
//                               </div>
//                             </div>
//                           )}

//                           {/* Enhanced Version History Modal */}
//                           {showHistory && (
//                             <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
//                               <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 overflow-auto max-h-[80vh]">
//                                 <div className="flex items-center justify-between mb-4">
//                                   <h2 className="text-lg font-bold">Version History</h2>
//                                   <span className="text-sm text-gray-500">{history.length} versions</span>
//                                 </div>
                                
//                                 <div className="space-y-3">
//                                   {history.map((v, idx) => (
//                                     <div key={idx} className={`border rounded-lg p-4 ${idx === history.length - 1 ? 'border-blue-300 bg-blue-50' : ''}`}>
//                                       <div className="flex justify-between items-start mb-2">
//                                         <div>
//                                           <div className="flex items-center gap-2">
//                                             <span className="font-medium">{v.type}</span>
//                                             {idx === history.length - 1 && (
//                                               <Badge variant="default" className="text-xs">Current</Badge>
//                                             )}
//                                           </div>
//                                           <span className="text-xs text-gray-500">{v.timestamp}</span>
//                                         </div>
//                                         <div className="flex gap-2">
//                                           {idx < history.length - 1 && (
//                                             <>
//                                               <Button 
//                                                 size="sm" 
//                                                 variant="outline"
//                                                 onClick={() => {
//                                                   // Preview version in a modal
//                                                   const previewWindow = window.open('', '_blank', 'width=800,height=600');
//                                                   if (previewWindow) {
//                                                     previewWindow.document.write(`
//                                                       <html>
//                                                         <head>
//                                                           <title>Version Preview - ${v.timestamp}</title>
//                                                           <style>
//                                                             body { font-family: Arial, sans-serif; margin: 20px; }
//                                                           </style>
//                                                         </head>
//                                                         <body>
//                                                           <h3>Version from ${v.timestamp}</h3>
//                                                           <hr />
//                                                           ${v.html}
//                                                         </body>
//                                                       </html>
//                                                     `);
//                                                     previewWindow.document.close();
//                                                   }
//                                                 }}
//                                               >
//                                                 Preview
//                                               </Button>
//                                               <Button 
//                                                 size="sm" 
//                                                 variant="default"
//                                                 onClick={() => handleRestoreVersion(idx)}
//                                               >
//                                                 Restore
//                                               </Button>
//                                             </>
//                                           )}
//                                         </div>
//                                       </div>
//                                       <p className="text-sm text-gray-600">{v.summary}</p>
//                                     </div>
//                                   ))}
//                                 </div>
//                                 <Button className="mt-4 w-full" onClick={() => setShowHistory(false)}>
//                                   Close
//                                 </Button>
//                               </div>
//                             </div>
//                           )}

//                           {/* Enhanced Audit Trail with Revert Buttons */}
//                           <div className="mt-8 border-t pt-6">
//                             <div className="flex items-center justify-between mb-3">
//                               <h3 className="font-semibold text-blue-900">Audit Trail</h3>
//                               <div className="flex gap-2">
//                                 <Button 
//                                   size="sm" 
//                                   variant="outline" 
//                                   onClick={() => setShowHistory(h => !h)} 
//                                   disabled={history.length <= 1}
//                                 >
//                                   <Clock className="w-4 h-4 mr-1" />
//                                   View Full History
//                                 </Button>
//                                 <Button 
//                                   size="sm" 
//                                   variant="outline" 
//                                   onClick={() => {
//                                     if (window.confirm("Are you sure you want to clear the audit trail? This action cannot be undone.")) {
//                                       setAuditTrail([]);
//                                       toast({
//                                         title: "Audit Trail Cleared",
//                                         description: "The audit trail has been cleared.",
//                                       });
//                                     }
//                                   }}
//                                   disabled={auditTrail.length === 0}
//                                 >
//                                   Clear Trail
//                                 </Button>
//                               </div>
//                             </div>
                            
//                             <div className="border rounded-lg bg-gray-50 max-h-64 overflow-y-auto">
//                               {auditTrail.length === 0 ? (
//                                 <div className="p-4 text-center text-gray-500 italic">
//                                   No changes recorded yet
//                                 </div>
//                               ) : (
//                                 <div className="divide-y divide-gray-200">
//                                   {auditTrail.map((entry, idx) => {
//                                     // Check if this is a revertable action (not the current state and not a revert action itself)
//                                     const isRevertable = idx > 0 && !entry.action.startsWith("Reverted to");
//                                     const historyEntry = history.find(h => h.timestamp === entry.timestamp);
                                    
//                                     return (
//                                       <div key={idx} className="p-3 hover:bg-gray-100 transition-colors">
//                                         <div className="flex items-start justify-between gap-3">
//                                           <div className="flex-1 min-w-0">
//                                             <div className="flex items-center gap-2">
//                                               {idx === 0 && (
//                                                 <Badge variant="default" className="text-xs">Current</Badge>
//                                               )}
//                                               <span className="text-sm font-medium text-gray-900 break-words">
//                                                 {entry.action}
//                                               </span>
//                                             </div>
//                                             <div className="text-xs text-gray-500 mt-1">
//                                               {entry.timestamp}
//                                             </div>
//                                             {historyEntry && (
//                                               <div className="text-xs text-gray-600 mt-1">
//                                                 Type: {historyEntry.type}
//                                               </div>
//                                             )}
//                                           </div>
                                          
//                                           {isRevertable && (
//                                             <Button
//                                               size="sm"
//                                               variant="ghost"
//                                               onClick={() => {
//                                                 if (window.confirm(`Revert to version from ${entry.timestamp}? Current changes will be lost.`)) {
//                                                   handleRevertToVersion(entry);
//                                                 }
//                                               }}
//                                               className="flex-shrink-0"
//                                             >
//                                               <RotateCcw className="w-3 h-3 mr-1" />
//                                               Revert
//                                             </Button>
//                                           )}
//                                         </div>
//                                       </div>
//                                     );
//                                   })}
//                                 </div>
//                               )}
//                             </div>
                            
//                             <div className="mt-3 text-xs text-gray-500">
//                               Total changes: {auditTrail.length} | 
//                               Last modified: {auditTrail.length > 0 ? auditTrail[0].timestamp : 'Never'}
//                             </div>
//                           </div>
//                         </CardContent>
//                       </Card>
//                     )}
//                 </div>
//               </div>
      
//       {/* Stage Editor Modal - Core part of workflow */}
//       <StageEditorModal
//         isOpen={isStageEditorOpen}
//         onClose={() => setIsStageEditorOpen(false)}
//         initialStages={currentTreatmentStages}
//         onSave={handleSaveStageEdits}
//         onGenerateReport={handleGenerateFromEditor}
//       />
      
//       {/* Price Validation Dialog */}
//       <PriceValidationDialog
//         open={showPriceValidation}
//         onOpenChange={setShowPriceValidation}
//         missingPrices={missingPrices}
//         onPricesProvided={handlePricesProvided}
//         onCancel={handlePriceValidationCancel}
//       />
//     </div>
//   );
// };

// export default CreateReport;
    























// ------------------------------------------------------------------------


import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Brain, ArrowLeft, Loader2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useTreatmentSettings } from "@/hooks/useTreatmentSettings";
import { PriceValidationDialog } from "@/components/PriceValidationDialog";
import { AIAnalysisSection } from '@/components/AIAnalysisSection';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ViewInBulgarian } from '@/components/ViewInBulgarian';
import { useTranslation } from '@/contexts/TranslationContext';
import { StageEditorModal, createDynamicStages, generateId, getFindingUrgency } from '@/features/stage-editor';
import { api } from '@/services/api';
import { ToothNumberingSystem } from '@/data/dental-data';

// Import our new extracted components
import { FileUploadSection } from "@/features/create-report/FileUploadSection";
import { FindingsManagement, Finding } from '@/features/create-report/FindingsManagement';
import { ReportDisplay } from '@/features/create-report/ReportDisplay';
import { useReportGeneration } from '@/features/create-report/ReportGeneration';

import './CreateReport.css';

const CreateReport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { 
    settings: treatmentSettings, 
    updateTreatmentSetting, 
    getTreatmentSetting,
    isLoading: treatmentSettingsLoading 
  } = useTreatmentSettings();
  
  const { generateReport, simulateProgress } = useReportGeneration();
  
  // State management
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [findings, setFindings] = useState<Finding[]>([
    { tooth: "", condition: "", treatment: "", replacement: "", price: undefined },
  ]);
  const [patientName, setPatientName] = useState("");
  const [report, setReport] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null); // Simple state - no polling
  const [useXrayMode, setUseXrayMode] = useState(true);
  const [patientObservations, setPatientObservations] = useState("");
  const [immediateAnalysisData, setImmediateAnalysisData] = useState<any>(null);
  const [cachedSegmentationData, setCachedSegmentationData] = useState<any>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  
  // Stage editor state
  const [isStageEditorOpen, setIsStageEditorOpen] = useState(false);
  const [currentTreatmentStages, setCurrentTreatmentStages] = useState<any[]>([]);
  const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);
  
  // Settings state
  const [toothNumberingSystem, setToothNumberingSystem] = useState<ToothNumberingSystem>(() => {
    const saved = localStorage.getItem('toothNumberingSystem');
    return (saved as ToothNumberingSystem) || 'FDI';
  });
  const [showTreatmentPricing, setShowTreatmentPricing] = useState(() => {
    const saved = localStorage.getItem('showTreatmentPricing');
    return saved === 'true';
  });
  const [showReplacementOptionsTable, setShowReplacementOptionsTable] = useState<boolean>(() => {
    const saved = localStorage.getItem('showReplacementOptionsTable');
    return saved === 'true';
  });
  const [showToothNumberOverlay, setShowToothNumberOverlay] = useState<boolean>(false);
  const [textSizeMultiplier, setTextSizeMultiplier] = useState<number>(1.2);
  const [isUpdatingTextSize, setIsUpdatingTextSize] = useState<boolean>(false);
  
  // Progress state
  const [reportProgress, setReportProgress] = useState(0);
  const [reportProgressText, setReportProgressText] = useState('');
  
  // Price validation state
  const [showPriceValidation, setShowPriceValidation] = useState(false);
  const [missingPrices, setMissingPrices] = useState<string[]>([]);

  // Helper functions
  const getPrice = (treatment: string): number => {
    const setting = getTreatmentSetting(treatment);
    return setting.price;
  };
  
  const getDuration = (treatment: string): number => {
    const setting = getTreatmentSetting(treatment);
    return setting.duration;
  };
  
  const savePrice = async (treatment: string, price: number) => {
    updateTreatmentSetting(treatment, { price });
  };

  // File upload handlers
  const handleFileUploaded = (file: File, analysisData: any) => {
    setUploadedImage(file);
    if (analysisData.annotated_image_url) {
      setOriginalImageUrl(analysisData.annotated_image_url);
    }
  };

  const handleAnalysisComplete = (data: any) => {
    setImmediateAnalysisData(data);
    toast({
      title: "AI Analysis Complete",
      description: `Found ${data.detections?.length || 0} potential conditions.`,
    });
  };

  // AI Finding handlers
  const handleAcceptAIFinding = (detection: any, toothMapping?: any) => {
    const conditionName = detection.class_name || detection.class || 'Unknown';
    let normalizedCondition = conditionName.toLowerCase().replace(/\s+/g, '-');
    
    if (normalizedCondition === 'missing-tooth-between' || normalizedCondition === 'missing-teeth-no-distal') {
      normalizedCondition = 'missing-tooth';
    }
    
    const recommendedTreatment = detection.suggestedTreatment || '';
    const price = recommendedTreatment ? getPrice(recommendedTreatment) : undefined;
    const tooth = toothMapping ? toothMapping.tooth : '';
    
    const newFinding: Finding = {
      tooth: tooth,
      condition: normalizedCondition,
      treatment: recommendedTreatment,
      replacement: '',
      price: price
    };
    
    setFindings(prev => {
      const isEmptyFinding = (f: Finding) =>
        (!f.tooth || f.tooth.trim() === '') && 
        (!f.condition || f.condition.trim() === '') && 
        (!f.treatment || f.treatment.trim() === '');
      
      const next = prev.length > 0 && isEmptyFinding(prev[0]) ? prev.slice(1) : prev;
      return [newFinding, ...next];
    });
    
    const message = toothMapping
      ? `${conditionName} added for tooth #${tooth}${recommendedTreatment ? ` with suggested treatment: ${recommendedTreatment}` : '. Please select a treatment.'}`
      : `${conditionName} added${recommendedTreatment ? ` with suggested treatment: ${recommendedTreatment}` : '. Please select a treatment.'}`;
    
    toast({
      title: "AI Finding Added",
      description: message,
    });
  };

  const handleRejectAIFinding = (detection: any) => {
    toast({
      title: "AI Finding Rejected",
      description: "This finding has been marked as rejected.",
    });
  };

  // Stage management
  const openStageEditorWithFindings = async (data: { 
    validFindings: any[], 
    useXrayMode: boolean, 
    patientName: string, 
    patientObservations: string 
  }) => {
    console.log('🎯 Opening stage editor with findings:', data.validFindings);
    
    const dynamicStages = createDynamicStages(data.validFindings);
    
    const editorStages = dynamicStages.map((stage, index) => ({
      id: generateId(),
      name: stage.name,
      focus: stage.focus,
      order: index,
      items: stage.items.map(finding => ({
        id: generateId(),
        toothNumber: finding.tooth,
        condition: finding.condition,
        treatment: finding.treatment,
        replacement: finding.replacement || null,
        urgency: getFindingUrgency(finding.condition, finding.treatment),
        estimatedTime: getDuration(finding.treatment),
        price: getPrice(finding.treatment)
      })),
      totalTime: 0,
      totalCost: 0
    }));
    
    editorStages.forEach(stage => {
      stage.totalTime = stage.items.reduce((sum, item) => sum + (item.estimatedTime || 0), 0);
      stage.totalCost = stage.items.reduce((sum, item) => sum + (item.price || 0), 0);
    });
    
    setPendingSubmitData(data);
    setCurrentTreatmentStages(editorStages);
    setIsStageEditorOpen(true);
  };

  // Report generation handlers
  const handleNextStep = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Validation
    if (useXrayMode) {
      if (!uploadedImage || !patientName.trim()) {
        toast({ 
          title: "Missing info", 
          description: "Please upload an OPG and enter patient name." 
        });
        return;
      }
    } else {
      if (!patientName.trim() || (!patientObservations.trim() && findings.filter(f => f.tooth && f.condition && f.treatment).length === 0)) {
        toast({ 
          title: "Missing info", 
          description: "Please enter patient name and either observations or findings." 
        });
        return;
      }
    }

    const validFindings = findings.filter(f => f.tooth && f.condition && f.treatment);
    const findingsWithoutTreatment = findings.filter(f => f.tooth && f.condition && !f.treatment);
    
    if (findingsWithoutTreatment.length > 0) {
      toast({
        title: "Treatments Required",
        description: `Please select treatments for ${findingsWithoutTreatment.length} finding(s) before proceeding.`,
        variant: "destructive",
      });
      return;
    }
    
    if (validFindings.length === 0) {
// CreateReport.tsx (continued)

      toast({
        title: "No Complete Findings",
        description: "Please add at least one complete finding with tooth, condition, and treatment.",
        variant: "destructive",
      });
      return;
    }

    // Check for missing prices
    const treatments = validFindings.map(f => f.treatment);
    const missingPrices = treatments.filter(treatment => {
      const setting = getTreatmentSetting(treatment);
      return !setting.price || setting.price === 0;
    });
    
    if (missingPrices.length > 0) {
      setMissingPrices(missingPrices);
      setPendingSubmitData({ validFindings, useXrayMode, patientName, patientObservations });
      setShowPriceValidation(true);
      return;
    }
    
    await openStageEditorWithFindings({ validFindings, useXrayMode, patientName, patientObservations });
  };

  const handleGenerateFromEditor = async (finalStages: any[]) => {
    setIsStageEditorOpen(false);
    setIsProcessing(true);
    setReport(null);
    
    simulateProgress((progress, text) => {
      setReportProgress(progress);
      setReportProgressText(text);
    });
    
    try {
      // Generate report with video URL directly from backend
      const result = await generateReport({
        patientName,
        findings,
        useXrayMode,
        uploadedImage: uploadedImage || undefined,
        patientObservations,
        immediateAnalysisData,
        treatmentSettings,
        showReplacementOptionsTable,
        toothNumberingSystem,
        organizedStages: finalStages
      });
      
      setReport(result.reportHtml);
      
      // Video URL comes directly from the backend response - no polling needed
      if (result.videoUrl) {
        console.log('🚀 VIDEO: Setting video URL from backend:', result.videoUrl);
        setVideoUrl(result.videoUrl);
      }
      
      toast({
        title: "Report Ready! 🎉",
        description: "Your dental report has been generated successfully.",
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setReportProgress(0);
      setReportProgressText('');
    }
  };

  const handleGenerateFromSavedStages = async () => {
    if (!currentTreatmentStages || currentTreatmentStages.length === 0) {
      toast({
        title: "No Stages Found",
        description: "No treatment stages found. Please create stages first.",
        variant: "destructive",
      });
      return;
    }
    
    await handleGenerateFromEditor(currentTreatmentStages);
  };

  const handleContinueEditingStages = () => {
    if (currentTreatmentStages && currentTreatmentStages.length > 0) {
      setIsStageEditorOpen(true);
    } else {
      const validFindings = findings.filter(f => f.tooth && f.condition && f.treatment);
      if (validFindings.length === 0) {
        toast({
          title: "No Findings",
          description: "Please add some findings first.",
          variant: "destructive",
        });
        return;
      }
      openStageEditorWithFindings({
        validFindings,
        useXrayMode,
        patientName,
        patientObservations
      });
    }
  };

  const handleSaveStageEdits = (editedStages: any[]) => {
    setCurrentTreatmentStages(editedStages);
    setIsStageEditorOpen(false);
    toast({
      title: "Stages Saved",
      description: "Your treatment stages have been saved.",
    });
  };

  const handlePricesProvided = async (prices: Record<string, number>) => {
    Object.entries(prices).forEach(([treatment, price]) => {
      updateTreatmentSetting(treatment, { price });
    });
    
    setShowPriceValidation(false);
    
    if (pendingSubmitData) {
      await openStageEditorWithFindings(pendingSubmitData);
    }
    
    setPendingSubmitData(null);
    setMissingPrices([]);
  };

  const handlePriceValidationCancel = () => {
    setShowPriceValidation(false);
    setPendingSubmitData(null);
    setMissingPrices([]);
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

          <form onSubmit={handleNextStep}>
            {/* Mode Toggle Section */}
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

            {/* X-ray Mode Content */}
            {useXrayMode && !report && (
              <>
                <FileUploadSection
                  onFileUploaded={handleFileUploaded}
                  onAnalysisComplete={handleAnalysisComplete}
                  patientName={patientName}
                  onPatientNameChange={setPatientName}
                  isProcessing={isProcessing}
                />

                {immediateAnalysisData && !isProcessing && (
                  <AIAnalysisSection
                    findingsSummary={immediateAnalysisData.findings_summary}
                    detections={immediateAnalysisData.detections}
                    annotatedImageUrl={immediateAnalysisData.annotated_image_url}
                    onAcceptFinding={handleAcceptAIFinding}
                    onRejectFinding={handleRejectAIFinding}
                    showToothNumberOverlay={showToothNumberOverlay}
                    setShowToothNumberOverlay={setShowToothNumberOverlay}
                    textSizeMultiplier={textSizeMultiplier}
                    setTextSizeMultiplier={setTextSizeMultiplier}
                    isUpdatingTextSize={isUpdatingTextSize}
                    originalImageUrl={originalImageUrl}
                    setImmediateAnalysisData={setImmediateAnalysisData}
                  />
                )}

                {!report && immediateAnalysisData && (
                  <FindingsManagement
                    findings={findings}
                    onFindingsChange={setFindings}
                    toothNumberingSystem={toothNumberingSystem}
                    showTreatmentPricing={showTreatmentPricing}
                    onShowPricingChange={(value) => {
                      setShowTreatmentPricing(value);
                      localStorage.setItem('showTreatmentPricing', value.toString());
                    }}
                    isProcessing={isProcessing}
                    onPriceSave={savePrice}
                    getPrice={getPrice}
                    onNextStep={handleNextStep}
                    onContinueEditingStages={handleContinueEditingStages}
                    onGenerateFromSavedStages={handleGenerateFromSavedStages}
                    currentTreatmentStages={currentTreatmentStages}
                  />
                )}
              </>
            )}

            {/* Non X-ray Mode Content */}
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
                  <div className={`space-y-4 ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div>
                      <Label htmlFor="patient-name-no-xray" className="block font-medium text-blue-900 mb-1">
                        Patient Name
                      </Label>
// CreateReport.tsx (continued)

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
                        Clinical Observations
                      </Label>
                      <Textarea
                        id="observations"
                        value={patientObservations}
                        onChange={e => setPatientObservations(e.target.value)}
                        placeholder="Enter your clinical observations..."
                        rows={6}
                        className="w-full"
                        disabled={isProcessing}
                      />
                    </div>
                  </div>

                  <FindingsManagement
                    findings={findings}
                    onFindingsChange={setFindings}
                    toothNumberingSystem={toothNumberingSystem}
                    showTreatmentPricing={showTreatmentPricing}
                    onShowPricingChange={(value) => {
                      setShowTreatmentPricing(value);
                      localStorage.setItem('showTreatmentPricing', value.toString());
                    }}
                    isProcessing={isProcessing}
                    onPriceSave={savePrice}
                    getPrice={getPrice}
                    onNextStep={handleNextStep}
                    onContinueEditingStages={handleContinueEditingStages}
                    onGenerateFromSavedStages={handleGenerateFromSavedStages}
                    currentTreatmentStages={currentTreatmentStages}
                  />
                </CardContent>
              </Card>
            )}

            {/* Replacement Options Toggle */}
            {findings.some(f => f.treatment && ['implant-placement', 'crown', 'bridge', 'partial-denture'].includes(f.treatment)) && !report && (
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
            )}

            {/* Upload Guidelines */}
            {!report && useXrayMode && (
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
          </form>

          {/* Report Display */}
          {report && (
            <ReportDisplay
              report={report}
              videoUrl={videoUrl}
              patientName={patientName}
              onReportUpdate={setReport}
            />
          )}
        </div>
      </div>

      {/* Full-Screen Loading Modal */}
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

      {/* Stage Editor Modal */}
      <StageEditorModal
        isOpen={isStageEditorOpen}
        onClose={() => setIsStageEditorOpen(false)}
        initialStages={currentTreatmentStages}
        onSave={handleSaveStageEdits}
        onGenerateReport={handleGenerateFromEditor}
      />
      
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