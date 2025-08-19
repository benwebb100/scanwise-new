import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, ArrowLeft, FileText, Video, Play, Loader2, Download, Share2, FileIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from '@/services/api';

const ViewReport = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("report");
  
  useEffect(() => {
    fetchReport();
  }, [reportId]);
  
  // Set the active tab based on what's available
  useEffect(() => {
    if (reportData) {
      // Default to report tab
      let tab = "report";
      
      // If URL has a tab parameter, try to use that
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      
      if (tabParam) {
        // Check if the requested tab is available
        if (tabParam === 'video' && reportData.videoUrl) {
          tab = 'video';
        } else if (tabParam === 'pdf') {
          tab = 'pdf';
        }
      }
      
      setActiveTab(tab);
    }
  }, [reportData]);
  
  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Update URL without reloading the page
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    window.history.pushState({}, '', url);
  };

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      const data = await api.getReport(reportId!);
      setReportData(data);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast({
        title: "Error",
        description: "Failed to load report. Please try again.",
        variant: "destructive"
      });
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link Copied",
      description: "Report link has been copied to clipboard.",
    });
  };

  const handleDownloadPDF = () => {
    if (!reportData?.report_html) return;
    
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Dental Report - ${reportData.patientName}</title>
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
            ${reportData.report_html}
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Report not found</p>
          <Button onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

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

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          {/* Report Info */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Treatment Report for {reportData.patientName}
            </h1>
            <p className="text-gray-600">
              Generated on {new Date(reportData.createdAt).toLocaleDateString()} • 
              Report ID: {reportId}
            </p>
          </div>

          {/* Report/Video Display */}
          <Card className="bg-white border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900 flex items-center justify-between">
                <span>Treatment Analysis</span>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleDownloadPDF}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="report" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Written Report
                  </TabsTrigger>
                  <TabsTrigger value="pdf" className="flex items-center gap-2">
                    <FileIcon className="w-4 h-4" />
                    PDF Report
                  </TabsTrigger>
                  <TabsTrigger value="video" className="flex items-center gap-2" disabled={!reportData.videoUrl}>
                    <Video className="w-4 h-4" />
                    Patient Video {!reportData.videoUrl && "(Not Available)"}
                  </TabsTrigger>
                </TabsList>

                {/* Report Tab */}
                <TabsContent value="report" className="mt-4">
                  <div
                    className="border rounded p-4 min-h-[120px] bg-gray-50"
                    dangerouslySetInnerHTML={{ __html: reportData.report_html }}
                    style={{ overflowX: 'auto', wordBreak: 'break-word' }}
                  />
                </TabsContent>

                {/* PDF Tab - Client-side PDF generation */}
                <TabsContent value="pdf" className="mt-4">
                  <div className="space-y-4">
                    <div className="bg-white border rounded p-4">
                      <div className="text-center mb-4">
                        <FileIcon className="w-16 h-16 text-blue-600 mx-auto mb-2" />
                        <h3 className="text-lg font-semibold">PDF Report Ready for Download</h3>
                        <p className="text-sm text-gray-600">
                          Click the button below to generate and download the PDF report
                        </p>
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-lg mb-4">
                        <h4 className="font-semibold text-blue-900 mb-2">About This PDF</h4>
                        <p className="text-sm text-blue-700">
                          This PDF report contains the complete dental analysis and treatment plan.
                          You can download it for your records or print it for reference.
                        </p>
                      </div>
                      
                      <div className="flex justify-center">
                        <Button
                          onClick={handleDownloadPDF}
                          className="flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Generate & Download PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Video Tab */}
                <TabsContent value="video" className="mt-4">
                  {reportData.videoUrl ? (
                    <div className="space-y-4">
                      <div className="bg-gray-900 rounded-lg overflow-hidden">
                        <video 
                          controls 
                          className="w-full"
                          poster={reportData.annotatedImageUrl}
                        >
                          <source src={reportData.videoUrl} type="video/mp4" />
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
                          onClick={() => window.open(reportData.videoUrl, '_blank')}
                        >
                          <Play className="mr-2 w-4 h-4" />
                          Open in New Tab
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = reportData.videoUrl;
                            a.download = `patient-video-${reportData.patientName.replace(/\s+/g, '-')}.mp4`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                        >
                          <Download className="mr-2 w-4 h-4" />
                          Download Video
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No video available for this report</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Tab Navigation */}
              <div className="mt-8 border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">Available Report Formats</h3>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant={activeTab === "report" ? "default" : "outline"}
                    onClick={() => handleTabChange("report")}
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Written Report
                  </Button>
                  
                  <Button
                    variant={activeTab === "pdf" ? "default" : "outline"}
                    onClick={() => handleTabChange("pdf")}
                    className="flex items-center gap-2"
                  >
                    <FileIcon className="w-4 h-4" />
                    PDF Report
                  </Button>
                  
                  {reportData.videoUrl && (
                    <Button
                      variant={activeTab === "video" ? "default" : "outline"}
                      onClick={() => handleTabChange("video")}
                      className="flex items-center gap-2"
                    >
                      <Video className="w-4 h-4" />
                      Patient Video
                    </Button>
                  )}
                </div>
              </div>

              {/* Report Details */}
              <div className="mt-8 border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">Report Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Patient Name:</span>
                    <span className="ml-2 font-medium">{reportData.patientName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Report ID:</span>
                    <span className="ml-2 font-medium">{reportId}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Created:</span>
                    <span className="ml-2 font-medium">
                      {new Date(reportData.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className="ml-2 font-medium text-green-600">Completed</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ViewReport;