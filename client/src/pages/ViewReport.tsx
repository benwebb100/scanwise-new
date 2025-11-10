import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, ArrowLeft, FileText, Video, Play, Loader2, Download, Share2, FileIcon, MessageCircle, Mail, Send, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from '@/services/api';
import { heygenService } from '@/services/heygen';
import { supabase } from '@/services/supabase';

const ViewReport = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("report");
  const [patientEmail, setPatientEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isGeneratingConsultation, setIsGeneratingConsultation] = useState(false);
  
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
      
      // Add detailed logging
      console.log('ViewReport: Full report data:', JSON.stringify(data, null, 2));
      console.log('ViewReport: Video URL:', data.videoUrl);
      console.log('ViewReport: Report HTML exists:', !!data.reportHtml);
      console.log('ViewReport: All data keys:', Object.keys(data));
      
      setReportData(data);
      
      // If video exists and URL param specifies video tab, switch to it
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam === 'video' && data.videoUrl) {
        setActiveTab('video');
      }
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

  const handleDownloadPDF = async () => {
    if (!reportData?.reportHtml || !reportId) return;
    
    try {
      toast({
        title: "Generating PDF",
        description: "Please wait while we generate your PDF...",
      });
      
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      // Call backend to generate PDF
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://backend-scanwise.onrender.com/api/v1'}/generate-pdf/${reportId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Dental-Report-${reportData.patientName?.replace(/\s+/g, '-') || 'Report'}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "PDF Downloaded",
        description: "Your dental report PDF has been downloaded successfully.",
      });
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download PDF. You can try printing instead.",
        variant: "destructive"
      });
    }
  };
  
  const handlePrintReport = () => {
    if (!reportData?.reportHtml) return;
    
    // Open print dialog directly
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Dental Report - ${reportData.patientName}</title>
            <style>
              @page { size: A4; margin: 20mm; }
              body { font-family: Arial, sans-serif; margin: 20px; }
              .report-container { max-width: 800px; margin: 0 auto; }
              h2, h3, h4 { color: #333; }
              img { max-width: 100%; height: auto; display: block; margin: 20px 0; }
              .treatment-stage { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px; }
              ul { margin: 10px 0; }
              li { margin: 5px 0; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background: #f5f5f5; font-weight: bold; }
              @media print {
                body { margin: 0; }
                .report-container { max-width: 100%; }
              }
            </style>
          </head>
          <body>
            ${reportData.reportHtml}
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

  const handleGenerateConsultation = async () => {
    if (!reportData) return;
    
    setIsGeneratingConsultation(true);
    
    try {
      // Extract treatment plan and findings from report data
      const treatmentPlan = reportData.reportHtml || 'Treatment plan not available';
      const findings = reportData.findings || 'Dental findings not available';
      
      const consultationRequest = {
        reportId: reportId!,
        patientName: reportData.patientName || 'Patient',
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
          description: "Your personalized consultation has been generated and opened in a new tab.",
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

  const handleSendReportToPatient = async () => {
    if (!patientEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter the patient's email address.",
        variant: "destructive"
      });
      return;
    }

    if (!reportData?.reportHtml) {
      toast({
        title: "Report Required",
        description: "No report content available to send.",
        variant: "destructive"
      });
      return;
    }

    setIsSendingEmail(true);
    
    try {
      // Call the backend API to send the email
      await api.sendReportToPatient(reportId!, patientEmail);
      
      toast({
        title: "Report Sent!",
        description: `Dental report has been sent to ${patientEmail}`,
      });
      
      setPatientEmail(''); // Clear the email input
      
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

          {/* Send Report to Patient - Prominent Section */}
          <div className="mb-6">
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Mail className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-green-900">Ready to Send to Patient?</h3>
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
          <div className="mb-6">
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900">Interactive AI Consultation</h3>
                      <p className="text-sm text-blue-700">
                        Let patients ask questions about their treatment plan with our AI dentist avatar
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
                          Start Consultation
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Report/Video Display */}
          <Card className="bg-white border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900 flex items-center justify-between">
                <span>Treatment Analysis</span>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleDownloadPDF}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handlePrintReport}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="report" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Written Report
                  </TabsTrigger>
                  <TabsTrigger value="video" className="flex items-center gap-2" disabled={!reportData.videoUrl}>
                    <Video className="w-4 h-4" />
                    Patient Video {!reportData.videoUrl && "(Not Available)"}
                  </TabsTrigger>
                </TabsList>

                {/* Report Tab */}
                <TabsContent value="report" className="mt-4">
                  <div
                    className="border rounded p-4 bg-gray-50 max-h-[600px] overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: reportData.reportHtml }}
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
                      
                      <div className="flex justify-center gap-3">
                        <Button
                          onClick={handleDownloadPDF}
                          className="flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Generate & Download PDF
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleGenerateConsultation}
                          disabled={isGeneratingConsultation}
                          className="flex items-center gap-2"
                        >
                          {isGeneratingConsultation ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <MessageCircle className="w-4 h-4" />
                              Ask Questions
                            </>
                          )}
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
                        <Button 
                          variant="default"
                          onClick={handleGenerateConsultation}
                          disabled={isGeneratingConsultation}
                          className="bg-gradient-to-r from-blue-600 to-teal-600 text-white hover:from-blue-700 hover:to-teal-700"
                        >
                          {isGeneratingConsultation ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <MessageCircle className="w-4 h-4" />
                              Ask Questions
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">Patient Video Not Available</h3>
                      <p className="text-gray-600 mb-4">
                        {reportData.videoGenerationFailed
                          ? "Video generation failed. Please try regenerating the video."
                          : "No video has been generated for this report yet."}
                      </p>
                      {reportData.videoError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 max-w-md mx-auto">
                          <p className="text-sm text-red-700">
                            <strong>Error:</strong> {reportData.videoError}
                          </p>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Trigger video regeneration
                          window.location.reload();
                        }}
                      >
                        Refresh Page
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

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