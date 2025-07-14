import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Brain, ArrowLeft, Upload, Camera, FileImage, Loader2, Mic, FileText, Video, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from '@/services/api';
import './CreateReport.css';

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
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedReport, setEditedReport] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [history, setHistory] = useState<{ html: string, timestamp: string, type: string, summary: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [auditTrail, setAuditTrail] = useState<{ action: string, timestamp: string }[]>([]);
  const [activeTab, setActiveTab] = useState("report");
  
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
    // Helper functions first
    const generateADACode = (treatment: string) => {
      const adaCodes: Record<string, string> = {
        'filling': 'D2330',
        'extraction': 'D7140',
        'root canal': 'D3310',
        'crown': 'D2740',
        'bridge': 'D6240',
        'implant': 'D6010',
        'partial denture': 'D5213'
      };
      
      const key = Object.keys(adaCodes).find(k => treatment.toLowerCase().includes(k));
      return key ? adaCodes[key] : 'D0000';
    };

    const estimatePrice = (treatment: string) => {
      const prices: Record<string, number> = {
        'filling': 120,
        'extraction': 180,
        'root canal': 400,
        'crown': 1200,
        'bridge': 850,
        'implant': 2300,
        'partial denture': 600
      };
      
      const key = Object.keys(prices).find(k => treatment.toLowerCase().includes(k));
      return key ? prices[key] : 100;
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

    // Process all treatment stages to create a unified list
    const treatmentItems: any[] = [];
    data.treatment_stages.forEach((stage: any) => {
      stage.items.forEach((item: any) => {
        treatmentItems.push({
          procedure: item.recommended_treatment,
          adaCode: item.ada_code || generateADACode(item.recommended_treatment),
          unitPrice: item.price || estimatePrice(item.recommended_treatment),
          quantity: item.quantity || 1,
          tooth: item.tooth,
          condition: item.condition,
          stage: stage.stage
        });
      });
    });

    // Group treatments by type
    const groupedTreatments = groupTreatments(treatmentItems);
    
    // Generate the HTML
    return `
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

        <!-- Stage Breakdowns -->
        <div style="padding: 0 20px;">
          ${data.treatment_stages.map((stage: any, index: number) => `
            <div style="margin-bottom: 30px;">
              <h3 style="font-size: 18px; margin-bottom: 15px;">${stage.stage}</h3>
              <ul style="list-style: disc; padding-left: 20px; color: #666;">
                <li>Treatment summary: ${stage.summary || getStageSummary(stage)}</li>
                <li>Estimated procedure duration: ${stage.duration || estimateDuration(stage)} hours</li>
                <li>Stage cost: $${calculateStageCost(stage, groupedTreatments)}</li>
              </ul>
            </div>
          `).join('')}
        </div>

        <!-- Active Conditions -->
        <div style="padding: 20px;">
          ${data.treatment_stages.map((stage: any) => 
            stage.items.map((item: any) => `
              <div style="border: 1px solid #ddd; border-left: 4px solid #1e88e5; margin-bottom: 20px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <div style="background-color: #ffeb3b; padding: 8px 16px;">
                  <strong style="font-size: 14px;">Active Condition</strong>
                </div>
                <div style="padding: 20px;">
                  <h3 style="font-size: 20px; margin-bottom: 15px;">${formatTreatmentTitle(item)}</h3>
                  <p style="margin-bottom: 15px;">${item.quantity || 1} ${item.quantity > 1 ? 'teeth have' : 'tooth has'} ${item.condition.toLowerCase()} that ${item.quantity > 1 ? 'need' : 'needs'} attention.</p>
                  
                  <p style="margin-bottom: 15px;">
                    <span style="color: #4caf50;">✓</span> <strong>Recommended Treatment:</strong> ${getDetailedTreatmentDescription(item)}
                  </p>
                  
                  <p style="margin: 15px 0; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
                    <span style="color: #f44336;">⚫</span> <strong>Risks if Untreated:</strong> ${getRiskDescription(item)}
                  </p>
                </div>
              </div>
            `).join('')
          ).join('')}
        </div>

        <!-- Annotated X-Ray Section -->
        <div style="padding: 40px 20px; text-align: center;">
          <h3 style="font-size: 24px; margin-bottom: 10px;">Annotated X-Ray Image</h3>
          <p style="color: #666; margin-bottom: 30px;">Below is your panoramic X-ray with AI-generated highlights of all detected conditions.</p>
          
          <!-- Legend -->
          <div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 30px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 5px;">
              <div style="width: 15px; height: 15px; background-color: #00BCD4;"></div>
              <span style="font-size: 14px;">Caries</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
              <div style="width: 15px; height: 15px; background-color: #9C27B0;"></div>
              <span style="font-size: 14px;">Missing-tooth-between</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
              <div style="width: 15px; height: 15px; background-color: #00BCD4;"></div>
              <span style="font-size: 14px;">Missing-teeth-no-distal</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
              <div style="width: 15px; height: 15px; background-color: #E91E63;"></div>
              <span style="font-size: 14px;">Root Piece</span>
            </div>
          </div>
          
          ${data.annotated_image_url ? `
            <img src="${data.annotated_image_url}" alt="Annotated X-ray" style="max-width: 100%; height: auto; box-shadow: 0 4px 8px rgba(0,0,0,0.1); border-radius: 8px;" />
          ` : ''}
        </div>

        <!-- Booking Section -->
        <div style="background-color: #1e88e5; color: white; padding: 40px 20px; text-align: center;">
          <button style="background-color: white; color: #1e88e5; padding: 12px 40px; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; margin-bottom: 10px;">
            📅 Book Your Appointment
          </button>
          <p style="margin: 0;">or call us at (03) 8525 3875</p>
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
    setVideoUrl(null);
    
    try {
      // Step 1: Upload image to Supabase
      const uploadResult = await api.uploadImage(uploadedImage);
      
      // Step 2: Analyze the X-ray with video generation
      const analysisResult = await api.analyzeXray({
        patientName,
        imageUrl: uploadResult.url,
        findings: findings.filter(f => f.tooth && f.condition && f.treatment),
        generateVideo: true // Request video generation
      });
      
      // Step 3: Generate HTML report from the analysis
      const reportHtml = generateReportHTML(analysisResult);
      setReport(reportHtml);
      
      // Step 4: Set video URL if available
      if (analysisResult.video_url) {
        setVideoUrl(analysisResult.video_url);
      }
      
      toast({
        title: "Success",
        description: "Report and video generated successfully!",
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

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedReport(report);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    if (reportRef.current) {
      const newContent = reportRef.current.innerHTML;
      setReport(newContent);
      addVersion(newContent, "Manual Edit", "Dentist manually edited the report");
    }
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

  const handleAiSuggest = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
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
      
      if (!res.ok) {
        throw new Error('Failed to apply changes');
      }
      
      const data = await res.json();
      
      setReport(data.updated_html);
      setEditedReport(null);
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

  const handleRestoreVersion = (idx: number) => {
    setReport(history[idx].html);
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

                      {/* Simplified Loading Animation */}
                      {isProcessing && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
                            <div className="text-center">
                              <div className="relative inline-flex">
                                <Brain className="w-16 h-16 text-blue-600" />
                                <div className="absolute inset-0 w-16 h-16 bg-blue-600/20 rounded-full animate-ping" />
                              </div>
                              <h3 className="text-xl font-semibold mt-4 mb-2">Analyzing X-ray...</h3>
                              <p className="text-gray-600 mb-6">Our AI is examining the dental conditions</p>
                              
                              <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                  <span>Processing image</span>
                                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '100%' }} />
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span>Detecting conditions</span>
                                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '75%' }} />
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span>Generating report</span>
                                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '50%' }} />
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span>Creating video</span>
                                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '25%' }} />
                                  </div>
                                </div>
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

                    {/* Patient Name Input - Only show if no report */}
                    {!report && (
                      <div className={`mt-4 ${isProcessing ? 'opacity-50 pointer-events-none' : ''} transition-opacity`}>
                        <label className="block font-medium text-blue-900 mb-1">Patient Name</label>
                        <Input
                          value={patientName}
                          onChange={e => setPatientName(e.target.value)}
                          placeholder="Enter patient name"
                          required
                          disabled={isProcessing}
                        />
                      </div>
                    )}

                    {/* Findings Table - Only show if no report */}
                    {!report && (
                      <div className={`mt-6 ${isProcessing ? 'opacity-50 pointer-events-none' : ''} transition-opacity`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-blue-900">Dentist Findings (Optional)</span>
                          <Button type="button" variant="outline" onClick={addFinding} size="sm" disabled={isProcessing}>+ Add Finding</Button>
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
                                    disabled={isProcessing}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={f.condition}
                                    onChange={e => handleFindingChange(idx, "condition", e.target.value)}
                                    placeholder="e.g. Caries"
                                    disabled={isProcessing}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={f.treatment}
                                    onChange={e => handleFindingChange(idx, "treatment", e.target.value)}
                                    placeholder="e.g. Filling"
                                    disabled={isProcessing}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button type="button" variant="destructive" size="sm" onClick={() => removeFinding(idx)} disabled={findings.length === 1 || isProcessing}>Remove</Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

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
                              Generating Report & Video...
                            </>
                          ) : (
                            <>
                              <Brain className="mr-2 h-5 w-5" />
                              Generate Treatment Report
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Report/Video Display with Tabs */}
                    {report && (
                      <Card className="mt-8 bg-white border-blue-200">
                        <CardHeader>
                          <CardTitle className="text-blue-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <span>Treatment Analysis Results</span>
                            <div className="flex flex-wrap gap-2">
                              <Button type="button" size="sm" variant="outline" onClick={handleUndo} disabled={history.length <= 1}>Undo</Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => setShowHistory(h => !h)} disabled={history.length <= 1}>History</Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => handleDownload('html')}>HTML</Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => handleDownload('txt')}>TXT</Button>
                              <Button type="button" size="sm" variant="outline" onClick={handleDownloadPDF}>PDF</Button>
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
                                Patient Video {!videoUrl && "(Generating...)"}
                              </TabsTrigger>
                            </TabsList>

                            {/* Report Tab */}
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
                                    dangerouslySetInnerHTML={{ __html: editedReport || report }}
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
                                  <Button className="mt-3" type="button" onClick={handleSaveEdit}>
                                    Save Changes
                                  </Button>
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
                                  <p className="text-gray-600 mb-2">Video is being generated...</p>
                                  <p className="text-sm text-gray-500">This usually takes 1-2 minutes</p>
                                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mt-4" />
                                </div>
                              )}
                            </TabsContent>
                          </Tabs>

                          {/* AI Suggestion Section - Only show in report tab */}
                          {activeTab === "report" && (
                            <div className="mt-8 border-t pt-8">
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2">
                                <label className="font-medium text-blue-900">AI-Powered Report Editing</label>
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
        </div>
      </div>

      
    </div>
  );
};

export default CreateReport;
    