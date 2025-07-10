import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Brain, ArrowLeft, Upload, Camera, FileImage, Loader2, Mic } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { api } from '@/services/api';

const CreateReport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [findings, setFindings] = useState([
    { tooth: "", condition: "", treatment: "" },
  ]);
  const [patientName, setPatientName] = useState("");
  const [report, setReport] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedReport, setEditedReport] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [history, setHistory] = useState<{ html: string, timestamp: string, type: string, summary: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [auditTrail, setAuditTrail] = useState<{ action: string, timestamp: string }[]>([]);
  let recognition: any = null;

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      toast({
        title: "OPG Upload Successful",
        description: "Image uploaded and ready for analysis.",
      });
    }
  };

  const handleFindingChange = (idx: number, field: string, value: string) => {
    setFindings((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const addFinding = () => {
    setFindings((prev) => [...prev, { tooth: "", condition: "", treatment: "" }]);
  };

  const removeFinding = (idx: number) => {
    setFindings((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  };

  // Generate HTML report from API response
  const generateReportHTML = (data: any) => {
    return `
      <div class="report-container">
        <h2>Dental Analysis Report</h2>
        <p><strong>Patient:</strong> ${patientName}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        
        <h3>Summary</h3>
        <p>${data.summary}</p>
        
        <h3>Treatment Plan</h3>
        ${data.treatment_stages.map((stage: any) => `
          <div class="treatment-stage">
            <h4>${stage.stage}: ${stage.focus}</h4>
            <ul>
              ${stage.items.map((item: any) => `
                <li>Tooth ${item.tooth}: ${item.condition} - ${item.recommended_treatment}</li>
              `).join('')}
            </ul>
          </div>
        `).join('')}
        
        <h3>Clinical Notes</h3>
        <p>${data.ai_notes}</p>
        
        <div class="annotated-image">
          <h3>Annotated X-ray</h3>
          <img src="${data.annotated_image_url}" alt="Annotated X-ray" style="max-width: 100%;" />
        </div>
      </div>
    `;
  };

   const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedImage || !patientName.trim()) {
      toast({ title: "Missing info", description: "Please upload an OPG and enter patient name." });
      return;
    }
    
    setIsProcessing(true);
    setReport(null);
    
    try {
      // Step 1: Upload image to Supabase
      const uploadResult = await api.uploadImage(uploadedImage);
      
      // Step 2: Analyze the X-ray
      const analysisResult = await api.analyzeXray({
        patientName,
        imageUrl: uploadResult.url,
        findings: findings.filter(f => f.tooth && f.condition && f.treatment),
      });
      
      // Step 3: Generate HTML report from the analysis
      const reportHtml = generateReportHTML(analysisResult);
      setReport(reportHtml);
      
      toast({
        title: "Success",
        description: "Report generated successfully!",
      });
      
    } catch (err) {
      console.error('Error:', err);
      toast({ 
        title: "Error", 
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Manual editing handlers
  const handleEditClick = () => {
    setIsEditing(true);
    setEditedReport(report);
    setTimeout(() => {
      reportRef.current?.focus();
    }, 0);
  };
  const handleSaveEdit = () => {
    setIsEditing(false);
    setReport(editedReport);
    addVersion(editedReport || '', "Manual Edit", "Dentist manually edited the report");
  };
  const handleReportInput = (e: React.FormEvent<HTMLDivElement>) => {
    setEditedReport(e.currentTarget.innerHTML);
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
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event: any) => {
      setAiSuggestion(event.results[0][0].transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  };

  // Placeholder backend call for AI-powered change
  async function applySuggestedChanges(originalHTML: string, suggestion: string): Promise<string> {
    // Prompt will be inserted here later.
    // For now, just return the original HTML with a note appended.
    await new Promise(r => setTimeout(r, 2000));
    return originalHTML + `<div style='color: #888; font-style: italic;'>[AI suggestion applied: ${suggestion}]</div>`;
  }

  const handleAiSuggest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report || !aiSuggestion.trim()) {
      toast({ title: "Missing info", description: "Type or speak a change request." });
      return;
    }
    setIsAiLoading(true);
    try {
      const res = await fetch("http://localhost:3001/apply-suggested-changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          previous_report_html: report,
          change_request_text: aiSuggestion,
        }),
      });
      const data = await res.json();
      // Highlight changes
      const highlighted = highlightChanges(report, data.updated_html);
      setReport(data.updated_html);
      setEditedReport(null);
      setAiSuggestion("");
      addVersion(data.updated_html, "AI Edit", aiSuggestion);
    } catch {
      toast({ title: "Error", description: "Failed to apply AI suggestion." });
    } finally {
      setIsAiLoading(false);
    }
  };

  // Helper to add to history and audit
  const addVersion = (html: string, type: string, summary: string) => {
    setHistory(prev => [...prev, { html, timestamp: new Date().toLocaleString(), type, summary }]);
    setAuditTrail(prev => [
      { action: `${type}: ${summary}`, timestamp: new Date().toLocaleString() },
      ...prev
    ]);
  };

  // On first report generation, add to history
  useEffect(() => {
    if (report && history.length === 0) {
      addVersion(report, "Initial", "First AI-generated report");
    }
    // eslint-disable-next-line
  }, [report]);

  // Undo logic
  const handleUndo = () => {
    if (history.length > 1) {
      const prev = history[history.length - 2];
      setReport(prev.html);
      setHistory(h => h.slice(0, -1));
      setAuditTrail(prevTrail => [
        { action: "Undo to previous version", timestamp: new Date().toLocaleString() },
        ...prevTrail
      ]);
    }
  };

  // View history logic
  const handleRestoreVersion = (idx: number) => {
    setReport(history[idx].html);
    setHistory(h => h.slice(0, idx + 1));
    setShowHistory(false);
    setAuditTrail(prevTrail => [
      { action: `Restored version from ${history[idx].timestamp}`, timestamp: new Date().toLocaleString() },
      ...prevTrail
    ]);
  };

  // Change tracking/highlighting (simple diff)
  function highlightChanges(oldHtml: string, newHtml: string) {
    // Simple diff: highlight changed text blocks
    if (!oldHtml || !newHtml || oldHtml === newHtml) return newHtml;
    // For demo: highlight all text that is different
    // (A real implementation would use a diff algorithm)
    let highlighted = newHtml;
    try {
      const oldText = oldHtml.replace(/<[^>]+>/g, "");
      const newText = newHtml.replace(/<[^>]+>/g, "");
      if (oldText !== newText) {
        highlighted = `<mark style='background: #fff9c4;'>${newText}</mark>`;
      }
    } catch {}
    return highlighted;
  }

  // Download/export helpers
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
  // For PDF, use window.print as a simple solution
  const handleDownloadPDF = () => {
    if (!report) return;
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`<html><head><title>Dental Report</title></head><body>${report}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
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

          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
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
            {/* Upload Section */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileImage className="mr-2 h-5 w-5" />
                  Upload Panoramic X-ray (OPG)
                </CardTitle>
                <CardDescription>
                  Upload the patient's panoramic X-ray for AI analysis and treatment planning
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!uploadedImage ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors">
                    <Upload className="mx-auto h-16 w-16 text-gray-400 mb-6" />
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
                    <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
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

                    {/* Patient Name Input */}
                    <div className="mt-4">
                      <label className="block font-medium text-blue-900 mb-1">Patient Name</label>
                      <Input
                        value={patientName}
                        onChange={e => setPatientName(e.target.value)}
                        placeholder="Enter patient name"
                        required
                      />
                    </div>

                    {/* Findings Table */}
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-blue-900">Dentist Findings</span>
                        <Button type="button" variant="outline" onClick={addFinding} size="sm">+ Add Finding</Button>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tooth</TableHead>
                            <TableHead>Condition</TableHead>
                            <TableHead>Recommended Treatment</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {findings.map((f, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <Input
                                  value={f.tooth}
                                  onChange={e => handleFindingChange(idx, "tooth", e.target.value)}
                                  placeholder="e.g. 16"
                                  required
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={f.condition}
                                  onChange={e => handleFindingChange(idx, "condition", e.target.value)}
                                  placeholder="e.g. Caries"
                                  required
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={f.treatment}
                                  onChange={e => handleFindingChange(idx, "treatment", e.target.value)}
                                  placeholder="e.g. Filling"
                                  required
                                />
                              </TableCell>
                              <TableCell>
                                <Button type="button" variant="destructive" size="sm" onClick={() => removeFinding(idx)} disabled={findings.length === 1}>Remove</Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Submit Button */}
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

                    {/* Report Display */}
                    {report && (
                      <Card className="mt-8 bg-white border-blue-200 relative">
                        <CardHeader>
                          <CardTitle className="text-blue-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <span>Generated Treatment Report</span>
                            <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                              <Button type="button" size="sm" variant="outline" onClick={handleUndo} disabled={history.length <= 1}>Undo</Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => setShowHistory(h => !h)} disabled={history.length <= 1}>View History</Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => handleDownload('html')}>Download HTML</Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => handleDownload('txt')}>Download TXT</Button>
                              <Button type="button" size="sm" variant="outline" onClick={handleDownloadPDF}>Download PDF</Button>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="relative">
                            {/* Loading overlay for AI */}
                            {isAiLoading && (
                              <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 backdrop-blur-sm">
                                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                              </div>
                            )}
                            {/* Editable report with change highlighting */}
                            <div
                              ref={reportRef}
                              className={`border rounded p-4 min-h-[120px] bg-gray-50 focus:outline-blue-400 ${isEditing ? 'outline outline-2' : ''}`}
                              contentEditable={isEditing}
                              suppressContentEditableWarning
                              tabIndex={0}
                              onInput={handleReportInput}
                              dangerouslySetInnerHTML={{ __html: isEditing ? (editedReport ?? report) : report }}
                              style={{ pointerEvents: isAiLoading ? 'none' : undefined, overflowX: 'auto', wordBreak: 'break-word' }}
                            />
                            {/* Edit/Save buttons */}
                            {!isEditing ? (
                              <Button className="mt-3 w-full sm:w-auto" type="button" onClick={handleEditClick} disabled={isAiLoading}>
                                Edit Report
                              </Button>
                            ) : (
                              <Button className="mt-3 w-full sm:w-auto" type="button" onClick={handleSaveEdit}>
                                Save Changes
                              </Button>
                            )}
                          </div>
                          {/* AI Suggestion Section */}
                          <form className="mt-8" onSubmit={handleAiSuggest}>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2">
                              <label className="font-medium text-blue-900">Suggest a Change</label>
                            </div>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <Input
                                value={aiSuggestion}
                                onChange={e => setAiSuggestion(e.target.value)}
                                placeholder="Type or speak your change request..."
                                disabled={isAiLoading}
                                className="flex-1"
                              />
                              <Button type="button" variant={isListening ? "secondary" : "outline"} onClick={handleMicClick} disabled={isAiLoading}>
                                <Mic className={isListening ? "animate-pulse text-red-500" : ""} />
                              </Button>
                              <Button type="submit" disabled={isAiLoading || !aiSuggestion.trim()}>
                                Submit
                              </Button>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">You can type or use your voice to request changes, e.g. "Make the summary more concise" or "Add a section about oral hygiene".</div>
                          </form>
                          {/* Version History Modal */}
                          {showHistory && (
                            <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
                              <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 overflow-auto max-h-[80vh]">
                                <h2 className="text-lg font-bold mb-4">Version History</h2>
                                <ul className="space-y-3">
                                  {history.map((v, idx) => (
                                    <li key={idx} className="border rounded p-3 flex flex-col gap-1">
                                      <div className="flex justify-between items-center">
                                        <span className="font-medium">{v.type} ({v.summary})</span>
                                        <span className="text-xs text-gray-500">{v.timestamp}</span>
                                      </div>
                                      <Button size="sm" variant="outline" onClick={() => handleRestoreVersion(idx)} className="w-full sm:w-auto mt-2">Restore this version</Button>
                                    </li>
                                  ))}
                                </ul>
                                <Button className="mt-4 w-full sm:w-auto" onClick={() => setShowHistory(false)}>Close</Button>
                              </div>
                            </div>
                          )}
                          {/* Audit Trail */}
                          <div className="mt-8">
                            <h3 className="font-semibold text-blue-900 mb-2">Audit Trail</h3>
                            <ul className="text-xs text-gray-700 space-y-1 max-h-32 overflow-auto">
                              {auditTrail.map((entry, idx) => (
                                <li key={idx} className="border-b last:border-0 py-1 flex justify-between">
                                  <span>{entry.action}</span>
                                  <span className="text-gray-400">{entry.timestamp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </form>

          {/* Instructions */}
          <Card>
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
                  <h4 className="font-medium text-gray-900 mb-3">Supported Formats</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• DICOM files (.dcm) - Preferred</li>
                    <li>• JPEG images (.jpg, .jpeg)</li>
                    <li>• PNG images (.png)</li>
                    <li>• TIFF images (.tiff, .tif)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateReport;
