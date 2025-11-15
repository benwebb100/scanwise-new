import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, User, Settings, LogOut, Search, Filter, Loader2, Cloud, ArrowRight, Trash2, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api } from '@/services/api';
import { supabase } from '@/services/supabase';
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/TranslationContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ViewInBulgarian } from "@/components/ViewInBulgarian";
import { RefreshCw, Info } from "lucide-react";
import { FollowUpsTab } from "@/components/FollowUpsTab";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Report {
  id: string;
  patientName: string;
  patientId: string;
  scanDate: string;
  status: string;
  teethAnalyzed: number;
  conditions: string[];
  createdAt: string;
  summary?: string;
  imageUrl?: string;
  annotatedImageUrl?: string;
  // AWS S3 specific fields
  source?: 'manual' | 'aws_s3';
  isDicom?: boolean;
  originalFilename?: string;
  clinicId?: string;
  // AWS analysis fields
  analysisComplete?: boolean;
  analysisId?: string;
  detections?: any[];
  findingsSummary?: string;
  s3Key?: string;
  patientEmail?: string;  // DICOM metadata
  emailSentAt?: string;  // Timestamp when report was emailed to patient
  emailTracking?: {
    first_opened_at?: string;
    open_count?: number;
    urgency_level?: 'high' | 'medium' | 'low';
    follow_up_completed?: boolean;
  };
}

interface Stats {
  totalReports: number;
  thisMonth: number;
  avgProcessing: string;
  successRate: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Doctor");
  const [userEmail, setUserEmail] = useState("");
  const [processingAws, setProcessingAws] = useState<string | null>(null); // Track which AWS image is being processed
  const [loadingAws, setLoadingAws] = useState(false); // Track AWS images loading state
  const [awsError, setAwsError] = useState<string | null>(null); // Track AWS errors
  const [dataFullyLoaded, setDataFullyLoaded] = useState(false); // Track if all data is loaded and ready
  const [stats, setStats] = useState<Stats>({
    totalReports: 0,
    thisMonth: 0,
    avgProcessing: "2.3min",
    successRate: "98.5%"
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'reports' | 'followups'>('reports');

  useEffect(() => {
    checkAuth();
    fetchDiagnoses();
  }, []);

  // Check AWS processing status periodically
  useEffect(() => {
    // Poll for AWS images with Processing or Pending status
    const hasProcessingImages = reports.some(r => 
      r.source === 'aws_s3' && 
      (r.status === 'Processing' || r.status === 'processing' || 
       r.status === 'Pending' || r.status === 'pending' ||
       r.status === 'In Progress')
    );
    
    if (hasProcessingImages) {
      console.log('⏳ AWS images are processing, starting polling...');
      const interval = setInterval(() => {
        console.log('🔄 Polling for AWS processing status...');
        fetchAwsImages();
      }, 60000); // Check every 60 seconds (1 minute) to reduce AWS API costs
      
      return () => {
        console.log('✅ Stopping AWS polling');
        clearInterval(interval);
      };
    }
  }, [reports]);

  // Auto-refresh AWS images when dashboard loads
  useEffect(() => {
    if (!loading) {
      // Small delay to ensure manual uploads are loaded first
      const timer = setTimeout(() => {
        fetchAwsImages();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }
      
      // Get user info
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
        // Extract name from email or metadata
        const name = user.user_metadata?.name || user.email?.split('@')[0] || "Doctor";
        setUserName(name.charAt(0).toUpperCase() + name.slice(1));
        
        // Initialize S3 folder for user if it doesn't exist
        // This is a fallback for existing users who registered before this feature
        try {
          await api.initializeUserS3Folder();
          console.log('✅ S3 folder initialization check completed');
        } catch (error) {
          // Silently fail - S3 folder might already exist or S3 might not be configured
          console.log('ℹ️ S3 folder initialization skipped:', error);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      navigate("/");
    }
  };

  const fetchDiagnoses = async () => {
    try {
      setLoading(true);
      
      // Fetch manual uploads
      const manualData = await api.getDiagnoses(50, 0);
      
      // Transform manual data to match our Report interface
      const manualReports: Report[] = manualData.diagnoses.map((diagnosis: any) => ({
        id: diagnosis.id || `RPT-${Date.now()}`,
        patientName: diagnosis.patientName,
        patientId: diagnosis.patientId,
        scanDate: diagnosis.createdAt,
        status: "Completed",
        teethAnalyzed: diagnosis.teethAnalyzed || 0,
        conditions: diagnosis.conditions || [],
        createdAt: diagnosis.createdAt,
        summary: diagnosis.summary,
        imageUrl: diagnosis.imageUrl,
        annotatedImageUrl: diagnosis.annotatedImageUrl,
        source: 'manual' as const,
        emailSentAt: diagnosis.emailSentAt || diagnosis.email_sent_at
      }));
      
      // Fetch email tracking data for enhanced features (if available)
      // This will fail silently if the email_tracking table doesn't exist yet
      const trackingMap = new Map();
      try {
        // Fetch tracking data for all report IDs
        const reportIds = manualReports.map(r => r.id);
        for (const reportId of reportIds) {
          try {
            const tracking = await api.getEmailTracking(reportId);
            if (tracking) {
              trackingMap.set(reportId, {
                first_opened_at: tracking.first_opened_at,
                open_count: tracking.open_count,
                urgency_level: tracking.urgency_level,
                follow_up_completed: tracking.follow_up_completed
              });
            }
          } catch (err) {
            // Silently skip if tracking not found for this report
          }
        }
        console.log(`📧 Loaded email tracking for ${trackingMap.size} reports`);
      } catch (trackingError) {
        console.log('ℹ️ Email tracking not available yet (table may not exist)');
      }
      
      // Merge tracking data with reports
      manualReports.forEach(report => {
        if (trackingMap.has(report.id)) {
          report.emailTracking = trackingMap.get(report.id);
        }
      });
      
      // Fetch AWS images
      let awsReports: Report[] = [];
      try {
        const awsData = await api.getAwsImages();
        awsReports = awsData.images.map((image: any) => ({
          id: image.id,
          patientName: image.patientName,
          patientId: image.patientId,
          scanDate: image.scanDate,
          status: image.status,
          teethAnalyzed: image.teethAnalyzed || 0,
          conditions: image.conditions || [],
          createdAt: image.createdAt,
          summary: image.summary,
          imageUrl: image.imageUrl,
          annotatedImageUrl: image.annotatedImageUrl,
          source: 'aws_s3' as const,
          isDicom: image.isDicom,
          originalFilename: image.originalFilename,
          clinicId: image.clinicId
        }));
      } catch (awsError) {
        console.warn('Failed to fetch AWS images:', awsError);
        // Continue without AWS images
      }
      
      // Combine and sort all reports by creation date
      const allReports = [...manualReports, ...awsReports].sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      
      setReports(allReports);
      
      // Calculate stats
      const now = new Date();
      const thisMonthReports = allReports.filter((report) => {
        const reportDate = new Date(report.createdAt);
        return reportDate.getMonth() === now.getMonth() && 
               reportDate.getFullYear() === now.getFullYear();
      });
      
      setStats({
        totalReports: allReports.length,
        thisMonth: thisMonthReports.length,
        avgProcessing: "2.3min", // This could be calculated from actual processing times
        successRate: "98.5%" // This could be calculated from actual success/failure rates
      });
      
    } catch (error) {
      console.error('Error fetching diagnoses:', error);
      toast({
        title: "Error",
        description: "Failed to load reports. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      // Set a small delay to ensure all data is rendered and ready
      setTimeout(() => {
        setDataFullyLoaded(true);
      }, 500);
    }
  };

  // Helper function for user-friendly messages
  const getAwsErrorMessage = (errorType: string): string => {
    const errorMessages: Record<string, string> = {
      'service_unavailable': 'AWS service is temporarily unavailable',
      'network_error': 'Connection to AWS failed',
      'authentication_failed': 'AWS authentication issue',
      'clinic_folder_not_found': 'AWS folder not configured',
      'clinic_folder_creation_failed': 'AWS setup incomplete',
      's3_service_unavailable': 'AWS S3 is not configured'
    };
    
    return errorMessages[errorType] || 'AWS service is offline';
  };

  const fetchAwsImages = async () => {
    try {
      setLoadingAws(true);
      
      // Show toast only when manually triggered
      toast({
        title: "Checking AWS",
        description: (
          <div className="flex items-center">
            <Cloud className="h-4 w-4 mr-2 animate-pulse" />
            <span>Looking for new images in cloud storage...</span>
          </div>
        ),
        duration: 2000,
      });
      
      const awsData = await api.getAwsImages();
      
      if (awsData.error) {
        setAwsError("AWS not configured");
        // Don't show error toast for expected states
        return;
      }
      
      // Clear error if successful
      setAwsError(null);
      
      const awsReports: Report[] = awsData.images.map((image: any) => ({
        id: image.id,
        patientName: image.patientName,
        patientId: image.patientId,
        scanDate: image.scanDate,
        status: image.status,
        teethAnalyzed: image.teethAnalyzed || 0,
        conditions: image.conditions || [],
        createdAt: image.createdAt,
        summary: image.summary,
        imageUrl: image.imageUrl,
        annotatedImageUrl: image.annotatedImageUrl,
        source: 'aws_s3' as const,
        isDicom: image.isDicom,
        originalFilename: image.originalFilename,
        clinicId: image.clinicId,
        // New fields for AWS analysis
        analysisComplete: image.analysisComplete,
        analysisId: image.analysisId,
        detections: image.detections,
        findingsSummary: image.findingsSummary,
        s3Key: image.s3Key,
        patientEmail: image.patientEmail  // DICOM metadata
      }));
      
      // Update only AWS reports in the existing reports array
      setReports(prevReports => {
        const manualReports = prevReports.filter(r => r.source === 'manual');
        const allReports = [...manualReports, ...awsReports].sort((a, b) => {
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
        return allReports;
      });

      // Auto-trigger analysis for pending images
      const pendingImages = awsReports.filter(img => img.status === 'Pending');
      if (pendingImages.length > 0) {
        console.log(`🔬 Found ${pendingImages.length} pending AWS images, triggering analysis...`);
        pendingImages.forEach(async (img) => {
          try {
            await api.analyzeAwsImage(img.s3Key!, img.imageUrl!, img.originalFilename!);
            console.log(`✅ Analysis triggered for ${img.originalFilename}`);
            // Refresh after a short delay
            setTimeout(() => fetchAwsImages(), 2000);
          } catch (error) {
            console.error(`❌ Failed to trigger analysis for ${img.originalFilename}:`, error);
          }
        });
      }
      
      // Show result toast
      if (awsReports.length > 0) {
        toast({
          title: "AWS Images Found",
          description: `Found ${awsReports.length} image${awsReports.length > 1 ? 's' : ''} in cloud storage`,
          duration: 3000,
        });
      } else {
        toast({
          title: "No AWS Images",
          description: "No images found in your cloud storage folder",
          duration: 2000,
        });
      }
      
    } catch (error) {
      console.error('Error fetching AWS images:', error);
      setAwsError("Connection failed");
    } finally {
      setLoadingAws(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
      case "completed":
        return "bg-green-100 text-green-700 border-green-200";
      case "In Progress":
      case "Processing":
      case "processing":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Pending":
      case "pending":
        return "bg-gray-100 text-gray-700 border-gray-200";
      case "Ready":  // AWS analysis complete, ready to create report
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Failed":
      case "failed":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const filteredReports = reports.filter(report =>
    report.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.patientId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // const handleViewReport = async (report: Report) => {
  //   // For AWS images, they should already be processed when they arrive
  //   // Just navigate to the report
  //   navigate(`/report/${report.id}`, { state: { report } });
  // };

    const handleViewReport = async (report: Report) => {
    // Prevent clicking if data not fully loaded yet
    if (!dataFullyLoaded) {
      toast({
        title: "Loading...",
        description: "Please wait while we load all report data.",
        duration: 2000,
      });
      return;
    }
    
    // Check if this is an AWS image
    if (report.source === 'aws_s3') {
      // Prevent clicking on Pending or Processing reports
      if (report.status === 'Pending' || report.status === 'pending' || 
          report.status === 'Processing' || report.status === 'processing') {
        toast({
          title: "⏳ AI Analysis in Progress",
          description: "This image is still being analyzed. Please wait until processing is complete.",
          duration: 3000,
        });
        return;
      }
      
      // Check if analysis is complete
      if (report.analysisComplete && report.detections) {
        // Navigate to CreateReport with pre-analyzed AWS data
        navigate('/create-report', { 
          state: { 
            awsPreAnalyzed: {
              imageUrl: report.imageUrl,
              annotatedImageUrl: report.annotatedImageUrl,
              patientName: report.patientName,
              patientId: report.patientId,
              patientEmail: report.patientEmail,  // DICOM metadata email
              reportId: report.id,
              originalFilename: report.originalFilename,
              detections: report.detections,
              findingsSummary: report.findingsSummary,
              s3Key: report.s3Key,
              analysisId: report.analysisId
            }
          }
        });
      } else if (report.status === 'Failed' || report.status === 'failed') {
        // Failed, allow retry
        navigate('/create-report', { 
          state: { 
            awsImage: {
              imageUrl: report.imageUrl,
              patientName: report.patientName,
              patientId: report.patientId,
              reportId: report.id,
              originalFilename: report.originalFilename,
              s3Key: report.s3Key,
              retry: true
            }
          }
        });
      } else {
        // Not analyzed yet, go to upload page (will trigger analysis)
        navigate('/create-report', { 
          state: { 
            awsImage: {
              imageUrl: report.imageUrl,
              patientName: report.patientName,
              patientId: report.patientId,
              reportId: report.id,
              originalFilename: report.originalFilename,
              s3Key: report.s3Key
            }
          }
        });
      }
    } else {
      // For completed manual reports, view normally
      navigate(`/report/${report.id}`, { state: { report } });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, report: Report) => {
    e.stopPropagation(); // Prevent card click
    // Only allow deleting completed reports, not AWS arrivals that haven't been processed
    if (report.source === 'aws_s3' && (report.status === 'Pending' || report.status === 'pending' || report.status === 'Ready')) {
      toast({
        title: "Cannot Delete",
        description: "AWS images cannot be deleted. Only generated reports can be removed.",
        variant: "destructive"
      });
      return;
    }
    setReportToDelete(report);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!reportToDelete) return;
    
    setIsDeleting(true);
    try {
      await api.deleteReport(reportToDelete.id);
      
      // Remove from local state
      setReports(reports.filter(r => r.id !== reportToDelete.id));
      
      toast({
        title: "Report Deleted",
        description: `Report for ${reportToDelete.patientName} has been permanently deleted.`,
      });
      
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center p-1.5">
              <img 
                src="/scanwise-logo.png" 
                alt="ScanWise Logo" 
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
              Scanwise
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <ViewInBulgarian />
            <LanguageSelector />
            <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>
              <Settings className="h-4 w-4 mr-2" />
              {t.settings.title}
            </Button>
            <Button variant="ghost" size="sm">
              <User className="h-4 w-4 mr-2" />
              Dr. {userName}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t.dashboard.welcome}, Dr. {userName}
            </h1>
            <p className="text-gray-600">
              {userEmail} • Last login: {formatDate(new Date().toISOString())}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-4 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-3 font-medium transition-colors relative ${
                activeTab === 'reports'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <span>Reports</span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('followups')}
              className={`px-4 py-3 font-medium transition-colors relative ${
                activeTab === 'followups'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                <span>Follow-Ups</span>
              </div>
            </button>
          </div>

          {/* Tab Content - Follow-Ups */}
          {activeTab === 'followups' && <FollowUpsTab />}
          
          {/* Tab Content - Reports */}
          <div className={activeTab === 'reports' ? 'block' : 'hidden'}>
            {/* Top Stats Cards - Total Reports and Manual Uploads */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{t.dashboard.totalReports}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalReports}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Manual Uploads</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : reports.filter(r => r.source === 'manual').length}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-xl">↑</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AWS Integration Status */}
          {/* AWS Connection Status - Only show when relevant */}
          {!loading && (
            <div className="mb-4">
              <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    loadingAws ? 'bg-blue-50' : 
                    awsError ? 'bg-gray-50' : 
                    reports.filter(r => r.source === 'aws_s3').length > 0 ? 'bg-green-50' : 'bg-amber-50'
                  }`}>
                    <Cloud className={`h-5 w-5 ${
                      loadingAws ? 'text-blue-600 animate-pulse' : 
                      awsError ? 'text-gray-400' : 
                      reports.filter(r => r.source === 'aws_s3').length > 0 ? 'text-green-600' : 'text-amber-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      AWS S3 Integration
                    </p>
                    <p className="text-xs text-gray-600">
                      {awsError ? 'Not configured' : 
                      loadingAws ? 'Syncing with cloud storage...' :
                      reports.filter(r => r.source === 'aws_s3').length > 0 ? 
                      `${reports.filter(r => r.source === 'aws_s3').length} images from AWS` : 
                      'Cloud folder ready - awaiting images'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {/* Show folder name for easy reference */}
                  {!awsError && (
                    <div className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded">
                      Folder: Clinic-{userName}
                    </div>
                  )}
                  
                  {/* Connection Status */}
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      awsError ? 'bg-gray-400' : 'bg-green-500'
                    }`} />
                    <span className="text-xs text-gray-500">
                      {awsError ? 'Offline' : 'Connected'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Instructions for empty folder */}
              {!loading && !loadingAws && !awsError && 
              reports.filter(r => r.source === 'aws_s3').length === 0 && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded">
                  <div className="flex items-start space-x-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-blue-700">
                      <p className="font-medium mb-1">Your AWS folder is ready!</p>
                      <p className="mb-2">Upload X-ray images to your S3 folder to see them here automatically.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Processing Statistics */}
          {!loading && reports.filter(r => r.source === 'aws_s3').length > 0 && (
            <div className="mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {reports.filter(r => r.source === 'aws_s3').length}
                      </div>
                      <div className="text-xs text-gray-600">AWS Images</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {reports.filter(r => r.source === 'aws_s3' && r.status === 'Completed').length}
                      </div>
                      <div className="text-xs text-gray-600">Processed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {reports.filter(r => r.source === 'aws_s3' && (r.status === 'In Progress' || r.status === 'Processing' || r.status === 'processing')).length}
                      </div>
                      <div className="text-xs text-gray-600">Processing</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {reports.filter(r => r.source === 'aws_s3' && r.isDicom).length}
                      </div>
                      <div className="text-xs text-gray-600">DICOM Files</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Create New Report Button - Full Width */}
          <div className="mb-8">
            <Button 
              size="lg"
              onClick={() => navigate("/create-report")}
              className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-xl px-12 py-6 w-full"
            >
              <Plus className="mr-3 h-6 w-6" />
              Create New Report
            </Button>
          </div>

          {/* Recent Reports */}
          <Card>
             <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Reports</CardTitle>
                  <CardDescription>
                    Your latest AI-generated diagnostic reports
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search patients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  
                  {/* AWS Status Indicator */}
                  {loadingAws && (
                    <div className="flex items-center px-3 py-1 bg-blue-50 rounded-lg animate-pulse">
                      <Cloud className="h-4 w-4 text-blue-600 mr-2 animate-bounce" />
                      <span className="text-xs text-blue-600">Fetching from AWS...</span>
                    </div>
                  )}
                  
                  {/* Refresh AWS Button */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchAwsImages} 
                    disabled={loadingAws}
                    className="relative"
                  >
                    {loadingAws ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Checking AWS...
                      </>
                    ) : (
                      <>
                        <Cloud className="h-4 w-4 mr-2" />
                        Check AWS
                        {/* Small badge showing AWS image count */}
                        {reports.filter(r => r.source === 'aws_s3').length > 0 && (
                          <Badge 
                            variant="secondary" 
                            className="ml-2 px-1 py-0 text-[10px] h-4 min-w-[16px]"
                          >
                            {reports.filter(r => r.source === 'aws_s3').length}
                          </Badge>
                        )}
                      </>
                    )}
                  </Button>
                  
                  {/* Refresh All Button */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchDiagnoses}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <Filter className="h-4 w-4 mr-2" />
                        Refresh All
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading reports...</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {filteredReports.map((report) => {
                      // Check if report is clickable
                      const isProcessing = report.source === 'aws_s3' && 
                        (report.status === 'Pending' || report.status === 'pending' || 
                         report.status === 'Processing' || report.status === 'processing');
                      const isClickable = dataFullyLoaded && !isProcessing;
                      
                      return (
                      <div 
                          key={report.id} 
                          className={`border rounded-lg p-4 transition-colors ${
                            isClickable ? 'cursor-pointer hover:bg-gray-50' : 'cursor-not-allowed opacity-75'
                          } ${
                            report.source === 'aws_s3' && report.status !== 'Completed' ? 'border-blue-300 bg-blue-50/30' : ''
                          } ${
                            isProcessing ? 'border-yellow-300 bg-yellow-50/30' : ''
                          } ${
                            !dataFullyLoaded ? 'pointer-events-none' : ''
                          }`}
                          onClick={() => isClickable && handleViewReport(report)}
                        >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-4">
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="font-semibold text-gray-900">{report.patientName}</h3>
                                {report.source === 'aws_s3' && (
                                  <Cloud className="h-4 w-4 text-blue-500" aria-label="From AWS S3" />
                                )}
                              </div>
                              <p className="text-sm text-gray-600">Patient ID: {report.patientId}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              {report.emailSentAt ? (
                                <div className="flex flex-col items-start space-y-1">
                                  {/* Email Opened Status */}
                                  {report.emailTracking?.first_opened_at ? (
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-green-100 text-green-700 border-green-200">
                                        ✓ Opened
                                      </Badge>
                                      {report.emailTracking.open_count && report.emailTracking.open_count > 1 && (
                                        <span className="text-xs text-gray-500">
                                          ({report.emailTracking.open_count}x)
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                                        Sent, Not Opened
                                      </Badge>
                                      {report.emailTracking?.urgency_level && (
                                        <span className="text-xs">
                                          {report.emailTracking.urgency_level === 'high' ? '🔴' : 
                                           report.emailTracking.urgency_level === 'medium' ? '🟡' : '🟢'}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  <span className="text-xs text-gray-500">
                                    Sent: {new Date(report.emailSentAt).toLocaleString()}
                                  </span>
                                </div>
                              ) : (
                                <Badge className={getStatusColor(report.status)}>
                                  {report.status}
                                </Badge>
                              )}
                              {report.source === 'aws_s3' && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  <Cloud className="h-3 w-3 mr-1" />
                                  Cloud
                                </Badge>
                              )}
                              {report.isDicom && report.source === 'aws_s3' && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  DICOM
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">Report #{report.id.slice(0, 8)}</p>
                              <p className="text-sm text-gray-600">
                                {formatDate(report.createdAt)}
                              </p>
                            </div>
                            {/* Delete button - only show for completed reports, not AWS arrivals */}
                            {!(report.source === 'aws_s3' && (report.status === 'Pending' || report.status === 'pending' || report.status === 'Ready')) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => handleDeleteClick(e, report)}
                                title="Delete report"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <div className="flex items-center space-x-4">
                            {/* For AWS scans that are ready, show affected teeth count from detections */}
                            {report.source === 'aws_s3' && report.status === 'Ready' && report.detections ? (
                              <>
                                <span>{report.detections.length} conditions detected</span>
                                <span>•</span>
                                <span>
                                  {(() => {
                                    // Count unique tooth numbers from detections
                                    const uniqueTeeth = new Set(
                                      report.detections
                                        .map((d: any) => d.tooth_number)
                                        .filter((t: any) => t)
                                    );
                                    return `${uniqueTeeth.size} ${uniqueTeeth.size === 1 ? 'tooth' : 'teeth'} affected`;
                                  })()}
                                </span>
                              </>
                            ) : (
                              // For completed reports, show the standard format
                              <>
                                <span>{report.teethAnalyzed} teeth analyzed</span>
                                {report.conditions.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate max-w-xs">
                                      {report.conditions.slice(0, 3).join(", ")}
                                      {report.conditions.length > 3 && ` +${report.conditions.length - 3} more`}
                                    </span>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {report.source === 'aws_s3' && report.status === 'In Progress' && (
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center">
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin text-blue-600" />
                                  <span className="text-xs text-blue-600">Processing...</span>
                                </div>
                              </div>
                            )}
                            {report.source === 'aws_s3' && report.status === 'In Progress' && (
                              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                    <span className="text-sm font-medium text-blue-900">Processing in Background</span>
                                  </div>
                                  <span className="text-xs text-blue-600">Real-time</span>
                                </div>
                                <div className="mt-2 text-xs text-blue-700">
                                  <p>• AI analysis running automatically</p>
                                  <p>• Tooth mapping in progress</p>
                                  <p>• Report will be ready shortly</p>
                                </div>
                              </div>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              disabled={report.source === 'aws_s3' && report.status === 'In Progress'}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (report.source !== 'aws_s3' || report.status !== 'In Progress') {
                                  handleViewReport(report);
                                }
                              }}
                            >
                              {report.source === 'aws_s3' && report.status === 'In Progress' ? (
                                "Processing..."
                              ) : (
                                "View Report"
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Summary or status-specific message */}
                        {report.source === 'aws_s3' && report.status === 'Ready' && !report.summary ? (
                          <div className="mt-3 text-sm text-gray-600">
                            AI analysis complete. Click to review findings and create patient report.
                          </div>
                        ) : report.summary ? (
                          <div className="mt-3 text-sm text-gray-500 line-clamp-2">
                            {report.summary}
                          </div>
                        ) : null}

                        {/* Processing/Pending indicator */}
                        {isProcessing && (
                          <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
                              <span className="text-sm font-medium text-yellow-800">
                                ⏳ AI Analysis in Progress - Please wait...
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* Ready to create report indicator */}
                        {report.source === 'aws_s3' && report.status === 'Ready' && !isProcessing && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Cloud className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-700">
                                Ready to create report
                              </span>
                            </div>
                            <ArrowRight className="h-4 w-4 text-blue-600" />
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                  
                  {filteredReports.length === 0 && !loading && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
                      <p className="text-gray-600 mb-4">
                        {searchTerm ? 'No reports match your search criteria.' : 'Get started by creating your first report.'}
                      </p>
                      {!searchTerm && (
                        <Button onClick={() => navigate("/create-report")}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Report
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report - Irreversible Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete the report for{" "}
              <span className="font-semibold text-gray-900">{reportToDelete?.patientName}</span>
              ?
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800 font-medium">
                  ⚠️ This action cannot be undone. The report and all associated data will be permanently removed from the database.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Report
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;