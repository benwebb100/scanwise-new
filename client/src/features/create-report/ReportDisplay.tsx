import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, Video, Loader2, Mic, Play, Clock, RotateCcw, 
  Mail, Send, Download 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';

interface ReportDisplayProps {
  report: string;
  videoUrl: string | null;
  patientName: string;
  onReportUpdate: (newReport: string) => void;
}

export const ReportDisplay = ({ 
  report, 
  videoUrl, 
  patientName, 
  onReportUpdate 
}: ReportDisplayProps) => {
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement | null>(null);
  
  const [activeTab, setActiveTab] = useState("report");
  const [isEditing, setIsEditing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [patientEmail, setPatientEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [history, setHistory] = useState<{ html: string, timestamp: string, type: string, summary: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [auditTrail, setAuditTrail] = useState<{ action: string, timestamp: string }[]>([]);

  let recognition: any = null;

  useEffect(() => {
    if (report && history.length === 0) {
      addVersion(report, "Initial", "First AI-generated report");
    }
  }, [report]);

  const addVersion = (html: string, type: string, summary: string) => {
    const timestamp = new Date().toLocaleString();
    setHistory(prev => [...prev, { html, timestamp, type, summary }]);
    setAuditTrail(prev => [
      { action: `${type}: ${summary}`, timestamp },
      ...prev
    ]);
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    if (reportRef.current) {
      const newContent = reportRef.current.innerHTML;
      if (newContent !== report) {
        onReportUpdate(newContent);
        addVersion(newContent, "Manual Edit", "Dentist manually edited the report");
        toast({
          title: "Success",
          description: "Report changes saved successfully",
        });
      }
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (reportRef.current && report) {
      reportRef.current.innerHTML = report;
    }
  };

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
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        }
      }
      if (finalTranscript) {
        setAiSuggestion(prev => prev + finalTranscript);
      }
    };
    
    recognition.start();
    setIsListening(true);
  };

  const handleAiSuggest = async () => {
    if (!report || !aiSuggestion.trim()) {
      toast({ title: "Missing info", description: "Type or speak a change request." });
      return;
    }
    setIsAiLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/apply-suggested-changes`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          previous_report_html: report,
          change_request_text: aiSuggestion,
        }),
      });
      
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      
      const data = await res.json();
      onReportUpdate(data.updated_html);
      setAiSuggestion("");
      addVersion(data.updated_html, "AI Edit", aiSuggestion);
      
      toast({
        title: "Success",
        description: "AI suggestions applied successfully!",
      });
    } catch (error) {
      console.error('AI suggestion error:', error);
      toast({ 
        title: "Error", 
        description: "Failed to apply AI suggestion.",
        variant: "destructive"
      });
    } finally {
      setIsAiLoading(false);
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

    setIsSendingEmail(true);
    
    try {
      const result = await api.sendPreviewReportToPatient({
        patientEmail: patientEmail.trim(),
        patientName: patientName || 'Patient',
        reportContent: report,
        findings: [],
        annotatedImageUrl: undefined
      });
      
      if (result.success) {
        toast({
          title: "Report Sent!",
          description: `Dental report has been sent to ${patientEmail}`,
        });
        setPatientEmail('');
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

  const handleDownload = (format: 'html' | 'txt' | 'pdf') => {
    if (!report) return;
    
    if (format === 'pdf') {
      const printWindow = window.open('', '', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(`<html><body>${report}</body></html>`);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
        };
      }
    } else {
      const content = format === 'html' ? report : report.replace(/<[^>]+>/g, '');
      const blob = new Blob([content], { type: format === 'html' ? 'text/html' : 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `treatment-report.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleUndo = () => {
    if (history.length > 1) {
      const prev = history[history.length - 2];
      onReportUpdate(prev.html);
      setHistory(h => h.slice(0, -1));
      setAuditTrail(prevTrail => [
        { action: "Undo to previous version", timestamp: new Date().toLocaleString() },
        ...prevTrail
      ]);
    }
  };

  const handleRestoreVersion = (idx: number) => {
    onReportUpdate(history[idx].html);
    setHistory(h => h.slice(0, idx + 1));
    setShowHistory(false);
    setAuditTrail(prevTrail => [
      { action: `Restored version from ${history[idx].timestamp}`, timestamp: new Date().toLocaleString() },
      ...prevTrail
    ]);
  };

  return (
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
            <Button type="button" size="sm" variant="outline" onClick={() => handleDownload('pdf')}>
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
            <TabsTrigger value="video" className="flex items-center gap-2" disabled={!videoUrl}>
              <Video className="w-4 h-4" />
              Patient Video {!videoUrl ? "(Generating...)" : ""}
            </TabsTrigger>
          </TabsList>

          {/* Report Tab */}
          <TabsContent value="report" className="mt-4">
            <div className="relative">
              {isAiLoading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 backdrop-blur-sm">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                </div>
              )}
              
              {isEditing ? (
                <>
                  <div
                    ref={reportRef}
                    className="border rounded p-4 min-h-[120px] bg-gray-50 focus:outline-blue-400 outline outline-2"
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    dangerouslySetInnerHTML={{ __html: report }}
                    style={{ overflowX: 'auto', wordBreak: 'break-word' }}
                  />
                  <div className="flex gap-2 mt-3">
                    <Button type="button" onClick={handleSaveEdit}>
                      Save Changes
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div
                    ref={reportRef}
                    className="border rounded p-4 min-h-[120px] bg-gray-50"
                    dangerouslySetInnerHTML={{ __html: report }}
                    style={{ overflowX: 'auto', wordBreak: 'break-word' }}
                  />
                  <Button className="mt-3" type="button" onClick={handleEditClick} disabled={isAiLoading}>
                    Edit Report
                  </Button>
                </>
              )}
            </div>
          </TabsContent>

          {/* Video Tab */}
          <TabsContent value="video" className="mt-4">
            {videoUrl ? (
              <div className="space-y-4">
                <div className="bg-gray-900 rounded-lg overflow-hidden">
                  <video controls className="w-full">
                    <source src={videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">About This Video</h4>
                  <p className="text-sm text-blue-700">
                    This personalized video explains the X-ray findings in an easy-to-understand way.
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
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Patient Video Generating</h3>
                <p className="text-gray-600 mb-2">Your personalized patient education video is being created...</p>
                <p className="text-sm text-gray-500 mb-4">This usually takes 1-3 minutes</p>
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-4" />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Send Report to Patient */}
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
                    className="px-4 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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

        {/* AI Suggestion Section */}
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
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                placeholder="Type or speak your change request..."
                disabled={isAiLoading}
                className="flex-1 min-h-[40px] px-3 py-2 border rounded-md resize-none"
                style={{ height: '40px' }}
              />
              <Button type="button" variant={isListening ? "secondary" : "outline"} onClick={handleMicClick} disabled={isAiLoading}>
                <Mic className={isListening ? "animate-pulse text-red-500" : ""} />
              </Button>
              <Button type="button" onClick={handleAiSuggest} disabled={isAiLoading || !aiSuggestion.trim()}>
                Apply Changes
              </Button>
            </div>
          </div>
        )}

        {/* Version History Modal */}
        {showHistory && (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 overflow-auto max-h-[80vh]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Version History</h2>
                <span className="text-sm text-gray-500">{history.length} versions</span>
              </div>
              
              <div className="space-y-3">
                {history.map((v, idx) => (
                  <div key={idx} className={`border rounded-lg p-4 ${idx === history.length - 1 ? 'border-blue-300 bg-blue-50' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{v.type}</span>
                          {idx === history.length - 1 && (
                            <Badge variant="default" className="text-xs">Current</Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{v.timestamp}</span>
                      </div>
                      {idx < history.length - 1 && (
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => handleRestoreVersion(idx)}
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{v.summary}</p>
                  </div>
                ))}
              </div>
              <Button className="mt-4 w-full" onClick={() => setShowHistory(false)}>
                Close
              </Button>
            </div>
          </div>
        )}

        {/* Audit Trail */}
        <div className="mt-8 border-t pt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-blue-900">Audit Trail</h3>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowHistory(h => !h)} 
              disabled={history.length <= 1}
            >
              <Clock className="w-4 h-4 mr-1" />
              View Full History
            </Button>
          </div>
          
          <div className="border rounded-lg bg-gray-50 max-h-64 overflow-y-auto">
            {auditTrail.length === 0 ? (
              <div className="p-4 text-center text-gray-500 italic">
                No changes recorded yet
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {auditTrail.map((entry, idx) => (
                  <div key={idx} className="p-3 hover:bg-gray-100 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {idx === 0 && (
                            <Badge variant="default" className="text-xs">Current</Badge>
                          )}
                          <span className="text-sm font-medium text-gray-900 break-words">
                            {entry.action}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {entry.timestamp}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};