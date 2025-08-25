import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Brain, Plus, Calendar, FileText, User, Settings, LogOut, Search, Filter, Loader2, Shield, Cloud, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api } from '@/services/api';
import { supabase } from '@/services/supabase';
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/TranslationContext";
import { LanguageToggleSimple } from "@/components/LanguageToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ViewInBulgarian } from "@/components/ViewInBulgarian";

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
  const [stats, setStats] = useState<Stats>({
    totalReports: 0,
    thisMonth: 0,
    avgProcessing: "2.3min",
    successRate: "98.5%"
  });

  useEffect(() => {
    checkAuth();
    fetchDiagnoses();
  }, []);

  // Check AWS processing status periodically
  useEffect(() => {
    if (reports.some(r => r.source === 'aws_s3' && r.status === 'In Progress')) {
      const interval = setInterval(() => {
        // Refresh AWS images to check processing status
        fetchAwsImages();
      }, 10000); // Check every 10 seconds
      
      return () => clearInterval(interval);
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
        source: 'manual' as const
      }));
      
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
    }
  };

  const fetchAwsImages = async () => {
    try {
      setLoadingAws(true);
      setAwsError(null);
      
      const awsData = await api.getAwsImages();
      
      if (awsData.error) {
        setAwsError(awsData.message);
        toast({
          title: "AWS Error",
          description: awsData.message,
          variant: "destructive"
        });
        return;
      }
      
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
        clinicId: image.clinicId
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
      
      toast({
        title: "Success",
        description: `Refreshed ${awsReports.length} AWS images`,
      });
      
    } catch (error) {
      console.error('Error fetching AWS images:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh AWS images';
      setAwsError(errorMessage);
      toast({
        title: "Error",
        description: "Failed to refresh AWS images. Please try again.",
        variant: "destructive"
      });
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
        return "bg-green-100 text-green-700 border-green-200";
      case "In Progress":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const filteredReports = reports.filter(report =>
    report.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.patientId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewReport = async (report: Report) => {
    // For AWS images, they should already be processed when they arrive
    // Just navigate to the report
    navigate(`/report/${report.id}`, { state: { report } });
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
            
            <nav className="hidden md:flex items-center space-x-6">
              <button className="text-blue-600 font-medium border-b-2 border-blue-600 pb-1">
                {t.dashboard.title}
              </button>
              <button className="text-gray-600 hover:text-gray-900">
                Reports
              </button>
              <button className="text-gray-600 hover:text-gray-900">
                Analytics
              </button>
            </nav>
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t.dashboard.welcome}, Dr. {userName}
            </h1>
            <p className="text-gray-600">
              {userEmail} • Last login: {formatDate(new Date().toISOString())}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
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
                    <p className="text-sm text-gray-600">This Month</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.thisMonth}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-teal-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg. Processing</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.avgProcessing}</p>
                  </div>
                  <Brain className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.successRate}</p>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 font-bold">✓</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Action Button */}
          <div className="mb-8">
            <Button 
              size="lg"
              onClick={() => navigate("/create-report")}
              className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-lg px-8 py-4"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create New Report
            </Button>
          </div>

          {/* AWS Integration Status */}
          {!loading && (
            <div className="mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Cloud className="h-5 w-5 text-blue-600" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">AWS S3 Integration</h4>
                        <p className="text-xs text-gray-600">
                          {awsError ? 'Connection Error' : 'Real-time processing enabled'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${awsError ? 'bg-red-500' : 'bg-green-500'}`}></div>
                      <span className="text-xs text-gray-500">
                        {awsError ? 'Offline' : 'Online'}
                      </span>
                    </div>
                  </div>
                  {awsError && (
                    <div className="mt-3 p-2 bg-red-50 rounded text-xs text-red-700">
                      {awsError}
                    </div>
                  )}
                </CardContent>
              </Card>
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
                        {reports.filter(r => r.source === 'aws_s3' && r.status === 'In Progress').length}
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

          {/* Reports Summary */}
          {!loading && reports.length > 0 && (
            <div className="mb-6">
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Reports</p>
                        <p className="text-xl font-bold text-gray-900">{stats.totalReports}</p>
                      </div>
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Manual Uploads</p>
                        <p className="text-xl font-bold text-gray-900">
                          {reports.filter(r => r.source === 'manual').length}
                        </p>
                      </div>
                      <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 font-bold">↑</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">AWS Images</p>
                        <p className="text-xl font-bold text-gray-900">
                          {reports.filter(r => r.source === 'aws_s3').length}
                        </p>
                      </div>
                      <Cloud className="h-6 w-6 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

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
                  <Button variant="outline" size="sm" onClick={fetchDiagnoses}>
                    <Filter className="h-4 w-4 mr-2" />
                    Refresh All
                  </Button>
                  <Button variant="outline" size="sm" onClick={fetchAwsImages} disabled={loadingAws}>
                    <Cloud className="h-4 w-4 mr-2" />
                    {loadingAws ? (
                      <div className="flex items-center">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Refreshing...
                      </div>
                    ) : (
                      "Refresh AWS"
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* AWS Error Display */}
              {awsError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                      <span className="text-red-800 font-medium">AWS Integration Error</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setAwsError(null)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ×
                    </Button>
                  </div>
                  <p className="text-red-700 mt-1 text-sm">{awsError}</p>
                  <p className="text-red-600 mt-2 text-xs">
                    Manual uploads will continue to work. AWS images may not be available.
                  </p>
                </div>
              )}
              
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
                    {filteredReports.map((report) => (
                      <div 
                        key={report.id} 
                        className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                          processingAws === report.id 
                            ? 'bg-blue-50 border-blue-200 cursor-not-allowed' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => processingAws !== report.id && handleViewReport(report)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-4">
                            <div>
                              <h3 className="font-semibold text-gray-900">{report.patientName}</h3>
                              <p className="text-sm text-gray-600">Patient ID: {report.patientId}</p>
                              {report.source === 'aws_s3' && (
                                <div className="mt-1">
                                  <p className="text-xs text-gray-500">
                                    File: {report.originalFilename}
                                    {report.isDicom && (
                                      <span className="ml-2 text-green-600">• DICOM with metadata</span>
                                    )}
                                    {!report.isDicom && (
                                      <span className="ml-2 text-orange-600">• Image file (manual naming required)</span>
                                    )}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getStatusColor(report.status)}>
                                {processingAws === report.id ? (
                                  <div className="flex items-center">
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Processing...
                                  </div>
                                ) : (
                                  report.status
                                )}
                              </Badge>
                              {report.source === 'aws_s3' && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  <Cloud className="h-3 w-3 mr-1" />
                                  AWS
                                </Badge>
                              )}
                              {report.isDicom && report.source === 'aws_s3' && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  DICOM
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">Report #{report.id.slice(0, 8)}</p>
                            <p className="text-sm text-gray-600">
                              {formatDate(report.createdAt)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <div className="flex items-center space-x-4">
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

                        {report.summary && (
                          <div className="mt-3 text-sm text-gray-500 line-clamp-2">
                            {report.summary}
                          </div>
                        )}
                      </div>
                    ))}
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
                  
                  {/* AWS Images Info */}
                  {!loading && reports.filter(r => r.source === 'aws_s3').length === 0 && reports.filter(r => r.source === 'manual').length > 0 && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center">
                        <Cloud className="h-5 w-5 text-blue-600 mr-2" />
                        <div>
                          <h4 className="text-sm font-medium text-blue-900">AWS Images Not Available</h4>
                          <p className="text-sm text-blue-700 mt-1">
                            No AWS S3 images found. This could mean:
                          </p>
                          <ul className="text-xs text-blue-600 mt-2 ml-4 list-disc">
                            <li>Your clinic hasn't been set up in AWS S3 yet</li>
                            <li>No images have been uploaded to your clinic folder</li>
                            <li>There's a configuration issue with AWS integration</li>
                          </ul>
                          <p className="text-xs text-blue-600 mt-2">
                            Manual uploads will continue to work normally.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;