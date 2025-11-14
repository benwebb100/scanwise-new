import { api } from '@/services/api';
import { useClinicBranding } from '@/components/ClinicBranding';
import { generateReplacementOptionsTable } from '@/lib/replacementOptionsTemplate';
import { TreatmentService } from '@/lib/treatment-service';

interface ReportGenerationData {
  patientName: string;
  findings: any[];
  useXrayMode: boolean;
  uploadedImage?: File;
  patientObservations?: string;
  immediateAnalysisData?: any;
  treatmentSettings?: any;
  showReplacementOptionsTable?: boolean;
  toothNumberingSystem?: string;
  organizedStages?: any[];
  clinicBranding?: any;
}

const useReportGeneration = () => {
  const { applyBrandingToReport, brandingData } = useClinicBranding();

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

  const simulateProgress = (updateProgress: (progress: number, text: string) => void) => {
    progressSteps.forEach((step, index) => {
      setTimeout(() => {
        updateProgress(step.progress, step.text);
      }, index * 1500);
    });
  };

  const generateReport = async (data: ReportGenerationData) => {
    const { 
      patientName, 
      findings, 
      useXrayMode, 
      uploadedImage,
      patientObservations,
      immediateAnalysisData,
      treatmentSettings,
      showReplacementOptionsTable,
      organizedStages
    } = data;

    let analysisResult;
    let videoUrl = null;

    // Check if we have an X-ray (either manual upload OR AWS pre-analyzed)
    const hasXrayImage = uploadedImage || (immediateAnalysisData && immediateAnalysisData.annotated_image_url);

    if (useXrayMode && hasXrayImage) {
      try {
        let imageUrl;
        let preAnalyzedDetections;
        let preAnalyzedAnnotatedUrl;
        
        // For manual uploads, upload the file first
        if (uploadedImage) {
          const uploadResult = await api.uploadImage(uploadedImage);
          imageUrl = uploadResult.url;
        } 
        // For AWS images, use the original or annotated image URL and pass pre-analyzed data
        else if (immediateAnalysisData) {
          imageUrl = immediateAnalysisData.original_image_url || immediateAnalysisData.annotated_image_url;
          
          // Pass pre-analyzed detections and annotated URL to skip redundant Roboflow processing
          if (immediateAnalysisData.detections && immediateAnalysisData.annotated_image_url) {
            preAnalyzedDetections = immediateAnalysisData.detections;
            preAnalyzedAnnotatedUrl = immediateAnalysisData.annotated_image_url;
            console.log('🔄 Using pre-analyzed AWS data for report generation');
          }
        }
        
        // Get video generation setting from localStorage
        const generateVideosAutomatically = localStorage.getItem('generateVideosAutomatically');
        const shouldGenerateVideo = generateVideosAutomatically === null ? true : generateVideosAutomatically === 'true';
        
        // Get video language from localStorage settings
        const videoLanguage = localStorage.getItem('videoNarrationLanguage') || 'english';
        console.log('🎬 VIDEO GENERATION SETTING CHECK:');
        console.log(`   localStorage value: "${generateVideosAutomatically}"`);
        console.log(`   Parsed to boolean: ${shouldGenerateVideo}`);
        console.log(`   Will send to backend: ${shouldGenerateVideo}`);
        console.log(`🎙️ Video narration language: ${videoLanguage}`);
        
        analysisResult = await api.analyzeXray({
          patientName,
          imageUrl: imageUrl,
          findings,
          generateVideo: shouldGenerateVideo, // Only generate if setting is enabled
          videoLanguage, // Pass the selected language
          preAnalyzedDetections,
          preAnalyzedAnnotatedUrl
        });
        
        // Video URL comes directly from backend - NO POLLING NEEDED
        if (analysisResult.video_url) {
          console.log('🚀 VIDEO: Received video URL from backend:', analysisResult.video_url);
          videoUrl = analysisResult.video_url;
        }
      } catch (error) {
        console.error('❌ Network error during API call:', error);
        console.error('   Error details:', error);
        // Fallback to local generation - but we won't have a diagnosis_id
        analysisResult = { detections: [], treatment_stages: [] };
        console.warn('⚠️ Using fallback analysisResult without diagnosis_id - HTML will NOT be saved');
      }
    } else {
      try {
        analysisResult = await api.analyzeWithoutXray({
          patientName,
          observations: patientObservations || '',
          findings,
          generateVideo: false // No video for non-X-ray mode
        });
      } catch (error) {
        console.error('❌ Network error during no-xray API call:', error);
        console.error('   Error details:', error);
        // Fallback to local generation - but we won't have a diagnosis_id
        analysisResult = { detections: [], treatment_stages: [] };
        console.warn('⚠️ Using fallback analysisResult without diagnosis_id - HTML will NOT be saved');
      }
    }

    // CRITICAL FIX: Set both properties to ensure compatibility
    if (organizedStages) {
      analysisResult.stages = organizedStages;  // For HTML template access
      analysisResult.treatment_stages = organizedStages;  // For backwards compatibility
    }

    let reportHtml = analysisResult.report_html;
    
    // If backend didn't provide HTML, generate it locally
    if (!reportHtml) {
      console.log('🏥 Clinic Branding Data:', brandingData);
      console.log('🔬 Analysis Result Detections:', analysisResult.detections);
      
      reportHtml = generateReportHTML({
        ...analysisResult,
        findings,
        patientName,
        treatmentSettings,
        showReplacementOptionsTable,
        annotated_image_url: immediateAnalysisData?.annotated_image_url || analysisResult.annotated_image_url,
        detections: analysisResult.detections || immediateAnalysisData?.detections || [], // Explicitly pass detections
        clinicBranding: brandingData,
        videoUrl: videoUrl // Pass video URL to report HTML generator
      });
    }

    const brandedReport = applyBrandingToReport(reportHtml);
    const finalHtml = brandedReport || reportHtml;
    
    // Save the generated HTML back to the database
    console.log('🔍 Checking if we can save HTML to database...');
    console.log('   - finalHtml exists:', !!finalHtml, '(length:', finalHtml?.length || 0, ')');
    console.log('   - analysisResult.diagnosis_id:', analysisResult?.diagnosis_id);
    console.log('   - analysisResult keys:', Object.keys(analysisResult || {}));
    
    if (finalHtml && analysisResult?.diagnosis_id) {
      try {
        console.log('💾 Saving generated HTML to database for diagnosis:', analysisResult.diagnosis_id);
        await api.updateReportHtml(analysisResult.diagnosis_id, finalHtml);
        console.log('✅ HTML saved successfully to database');
      } catch (error) {
        console.error('❌ Failed to save HTML to database:', error);
        // Don't fail the whole report generation if this fails
      }
    } else {
      console.warn('⚠️ Cannot save HTML to database:');
      if (!finalHtml) console.warn('   - Missing finalHtml');
      if (!analysisResult?.diagnosis_id) console.warn('   - Missing diagnosis_id in analysisResult');
    }
    
    return {
      reportHtml: finalHtml,
      videoUrl: videoUrl, // Video URL from backend, or null
      detections: analysisResult.detections
    };
  };

  return {
    generateReport,
    simulateProgress,
    progressSteps
  };
};

// ✅ HELPER: Get friendly patient name for report (module-level to avoid scope issues)
const getTreatmentFriendlyName = (treatment: string) => {
  return TreatmentService.getFriendlyName(treatment);
};

// ✅ HELPER: Format date with timezone
const getFormattedDate = (timezone?: string) => {
  const clinicTimezone = timezone || localStorage.getItem('clinicTimezone') || 'Australia/Melbourne';
  const now = new Date();
  
  try {
    return now.toLocaleDateString('en-AU', {
      timeZone: clinicTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.warn(`Invalid timezone "${clinicTimezone}", falling back to system locale`);
    return now.toLocaleDateString();
  }
};

// WORKING generateReportHTML from commit 2784580 (adapted)
const generateReportHTML = (data: any) => {
  const { findings, patientName, treatmentSettings, showReplacementOptionsTable, clinicBranding, videoUrl } = data;
  
  // DEBUG: Log clinic branding to diagnose issue
  console.log('📊 generateReportHTML - clinicBranding received:', clinicBranding);
  console.log('📊 generateReportHTML - headerTemplate exists:', !!clinicBranding?.headerTemplate);
  console.log('📊 generateReportHTML - footerTemplate exists:', !!clinicBranding?.footerTemplate);
  console.log('📊 generateReportHTML - detections received:', data.detections);
  
  // Extract clinic branding with defaults
  const clinicName = clinicBranding?.clinicName || 'Dental Clinic';
  const clinicLogo = clinicBranding?.logoUrl || '';
  const clinicAddress = clinicBranding?.address || '';
  const clinicPhone = clinicBranding?.phone || '';
  const clinicEmail = clinicBranding?.email || '';
  const clinicWebsite = clinicBranding?.website || '';
  const primaryColor = clinicBranding?.primaryColor || '#1e88e5';
  const secondaryColor = clinicBranding?.secondaryColor || '#666666';
  
  // Safety checks
  if (!findings || findings.length === 0) {
    console.warn('⚠️ No findings available for report generation');
    return '<div>No findings available</div>';
  }
  
  // CRITICAL FIX: Use the annotated image from data
  let reportImageUrl = data.annotated_image_url;
  
  // SECURITY FIX: Only use web-accessible URLs, not local file paths
  // Allow: HTTP/HTTPS URLs and data URLs (base64-encoded images)
  // Block: Local file paths (/tmp/, file://)
  if (reportImageUrl) {
    const isDataUrl = reportImageUrl.startsWith('data:');
    const isHttpUrl = reportImageUrl.startsWith('http://') || reportImageUrl.startsWith('https://');
    const isLocalPath = reportImageUrl.startsWith('/tmp/') || reportImageUrl.startsWith('file://') || reportImageUrl.startsWith('/');
    
    if (isLocalPath && !isDataUrl) {
      console.warn('🚨 SECURITY: Blocking local file path from report:', reportImageUrl.substring(0, 100));
      reportImageUrl = null;
    } else if (isDataUrl) {
      console.log('✅ Using base64 data URL for report image (length:', reportImageUrl.length, ')');
    } else if (isHttpUrl) {
      console.log('✅ Using HTTP URL for report image:', reportImageUrl);
    } else {
      console.warn('⚠️ Unexpected image URL format:', reportImageUrl.substring(0, 100));
      reportImageUrl = null;
    }
  }
  
  console.log('🔧 REPORT IMAGE: Final image URL for report:', reportImageUrl ? (reportImageUrl.startsWith('data:') ? `data URL (${reportImageUrl.length} chars)` : reportImageUrl) : 'None');
  
  // Use doctor's findings as the primary source of truth
  const doctorFindings = findings.filter((f: any) => f && f.tooth && f.condition && f.treatment);
  
  if (doctorFindings.length === 0) {
    return `
      <div class="report-container" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h2>No Complete Findings</h2>
        <p>Please ensure all findings have tooth number, condition, and treatment selected.</p>
      </div>
    `;
  }
  
  console.log('🔧 Current findings state:', findings);
  console.log('🔧 Data parameter:', data);
  
  // ✅ NEW: Use master database for insurance codes
  const generateADACode = (treatment: string) => {
    // Get insurance code from master database
    const insuranceCode = TreatmentService.getInsuranceCode(treatment, 'AU');
    return insuranceCode || 'N/A';
  };

  const getTreatmentPrice = (treatment: string, findingPrice?: number) => {
    // Use the price from the finding if available, otherwise use treatment settings
    if (findingPrice) return findingPrice;
    
    // Get price from treatment settings
    return treatmentSettings?.[treatment]?.price || 100;
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
      const treatment = groupedTreatments.find((t: any) => 
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
      'crown': 1.5,
      'implant': 2,
      'bridge': 2,
      'scaling': 1
    };
    
    let totalHours = 0;
    stage.items.forEach((item: any) => {
      const procedure = item.recommended_treatment.toLowerCase();
      const duration = Object.keys(durations).find(key => procedure.includes(key));
      totalHours += duration ? durations[duration] : 1;
    });
    
    return Math.round(totalHours * 10) / 10;
  };

  // Process findings to create treatment items
  const treatmentItems: any[] = [];
  const uniqueFindings = doctorFindings.filter((finding: any, index: number, self: any[]) => {
    const key = `${finding.tooth}-${finding.treatment}-${finding.condition}`;
    return index === self.findIndex((f: any) => `${f.tooth}-${f.treatment}-${f.condition}` === key);
  });
  
  uniqueFindings.forEach((finding: any) => {
    treatmentItems.push({
      procedure: TreatmentService.getDisplayName(finding.treatment), // ✅ Use display name for overview table
      adaCode: generateADACode(finding.treatment), // ✅ Use AU insurance code
      unitPrice: getTreatmentPrice(finding.treatment, finding.price),
      quantity: 1,
      tooth: finding.tooth,
      condition: finding.condition,
      stage: 'Doctor Findings'
    });
  });

  const groupedTreatments = groupTreatments(treatmentItems);
  
  // ✅ Use clinic branding header template from settings
  const headerTemplate = clinicBranding?.headerTemplate || `
    <div style="background-color: ${primaryColor}; color: white; padding: 20px; display: flex; align-items: center; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 15px;">
          ${clinicLogo ? `
          <img src="${clinicLogo}" alt="${clinicName} Logo" style="height: 50px; width: auto;" />
        ` : `
          <div style="width: 50px; height: 50px; background-color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <span style="color: ${primaryColor}; font-size: 24px;">🦷</span>
          </div>
        `}
          <div>
          <h1 style="font-size: 28px; font-weight: bold; margin: 0;">${clinicName}</h1>
          ${clinicAddress ? `<p style="margin: 5px 0 0 0; opacity: 0.9;">${clinicAddress}</p>` : ''}
              </div>
          </div>
        </div>
  `;

  // Generate the HTML with clinic branding
  const htmlContent = `
    <div class="report-container" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <!-- Clinic Header from Template -->
      ${headerTemplate}

      <!-- Patient Info & Title -->
      <div style="padding: 25px 20px; background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
        <h1 style="font-size: 28px; margin: 0 0 15px 0; color: #111827; font-weight: 700;">Treatment Report for ${patientName}</h1>
        
        <!-- Contact Info Block (clinic name + contact details, NO address) -->
        <div style="margin: 0 0 15px 0; color: #4b5563; font-size: 14px; line-height: 1.8;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #111827;">${clinicName}</p>
          ${clinicPhone ? `<p style="margin: 0 0 4px 0;"><strong>Phone:</strong> ${clinicPhone}</p>` : ''}
          ${clinicEmail ? `<p style="margin: 0 0 4px 0;"><strong>Email:</strong> ${clinicEmail}</p>` : ''}
          ${clinicWebsite ? `<p style="margin: 0 0 4px 0;"><strong>Website:</strong> ${clinicWebsite}</p>` : ''}
        </div>
        
        <p style="text-align: center; color: #6b7280; margin: 0; font-style: italic; font-size: 14px;">Scroll down to view your full written report</p>
      </div>

      <!-- Treatment Overview Table -->
      <div style="padding: 0 20px; margin-bottom: 40px; margin-top: 30px;">
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

      <!-- Stage-Based Treatment Plan (uses data.stages from stage editor) -->
      ${renderStages(data, uniqueFindings, getTreatmentPrice)}

      <!-- Active Conditions with Enhanced Descriptions -->
      ${renderActiveConditions(uniqueFindings)}

      <!-- Replacement Options Table -->
      ${renderReplacementOptionsTable(showReplacementOptionsTable, findings, treatmentSettings)}

      <!-- Annotated X-Ray Section -->
      ${renderXraySection(reportImageUrl, data)}
      
      <!-- Personalized Video Section -->
      ${renderVideoSection(videoUrl, primaryColor)}
      
      <!-- Clinic Footer from Template -->
      ${(clinicBranding?.footerTemplate || `
        <div style="background-color: #f8f9fa; padding: 30px 20px; margin-top: 40px; border-top: 3px solid ${primaryColor};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 20px;">
            <div style="flex: 1; min-width: 200px;">
              <h3 style="color: ${primaryColor}; margin: 0 0 10px 0;">${clinicName}</h3>
              <div style="color: ${secondaryColor}; font-size: 14px; line-height: 1.6;">
                ${clinicAddress ? `<p style="margin: 2px 0;">${clinicAddress}</p>` : ''}
                ${clinicPhone ? `<p style="margin: 2px 0;">${clinicPhone}</p>` : ''}
                ${clinicEmail ? `<p style="margin: 2px 0;">${clinicEmail}</p>` : ''}
                ${clinicWebsite ? `<p style="margin: 2px 0;">${clinicWebsite}</p>` : ''}
              </div>
            </div>
            <div style="text-align: center;">
              ${clinicWebsite ? `
                <a href="${clinicWebsite.startsWith('http') ? clinicWebsite : 'https://' + clinicWebsite}" style="background-color: ${primaryColor}; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-size: 16px; text-decoration: none; display: inline-block;">
                  Book Your Next Appointment
                </a>
              ` : `
                <button style="background-color: ${primaryColor}; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-size: 16px; cursor: pointer;">
                  Book Your Next Appointment
                </button>
              `}
              <p style="margin: 10px 0 0 0; font-size: 12px; color: ${secondaryColor};">
                Generated by Scanwise AI • ${getFormattedDate()}
              </p>
            </div>
          </div>
          <div style="border-top: 1px solid #d1d5db; padding-top: 15px; margin-top: 20px; text-align: center;">
            <p style="margin: 5px 0; color: #9ca3af; font-size: 11px; font-style: italic;">
              This report contains confidential patient information
            </p>
            <p style="margin: 10px 0 0; color: #991b1b; font-size: 11px; font-weight: bold;">
              For professional dental advice only - not a substitute for in-person examination
            </p>
          </div>
        </div>
      `).replace('{{REPORT_DATE}}', getFormattedDate())}
    </div>
  `;
  
  return htmlContent;
};

// Helper functions for report sections
const renderStages = (data: any, uniqueFindings: any[], getTreatmentPrice: Function) => {
  // CRITICAL FIX: Check for data.stages (from stage editor organized stages)
  const stages = data?.stages || data?.treatment_stages || [];
  
  console.log('🎯 renderStages called with:', { 
    hasStages: !!stages, 
    stagesLength: stages?.length, 
    stagesData: stages 
  });
  
  if (stages && stages.length > 0) {
    return `
      <div style="padding: 0 20px; margin-bottom: 40px;">
        <h3 style="font-size: 20px; margin-bottom: 20px;">Treatment Plan Stages</h3>
        
        ${stages.map((stage: any, stageIndex: number) => {
          // Support both formats: stage editor format (items) and backend format (visits)
          const hasItems = stage.items && stage.items.length > 0;
          const hasVisits = stage.visits && stage.visits.length > 0;
          const stageName = stage.name || stage.stage_title || stage.stage || `Stage ${stageIndex + 1}`;
          const stageFocus = stage.focus || '';
          
          return `
          <div style="border: 1px solid #ddd; border-left: 4px solid #1e88e5; margin-bottom: 20px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div style="background-color: #e3f2fd; padding: 12px 16px;">
              <strong style="font-size: 16px;">${stageName}${stageFocus ? ` - ${stageFocus}` : ''}</strong>
            </div>
            <div style="padding: 20px;">
              ${hasVisits ? stage.visits.map((visit: any, visitIndex: number) => `
                <div style="border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 15px; background: #fafafa;">
                  <div style="background-color: #f0f0f0; padding: 10px 15px; border-radius: 8px 8px 0 0;">
                    <strong style="color: #1e88e5;">${visit.visit_label || `Visit ${visitIndex + 1}`}</strong>
                  </div>
                  <div style="padding: 15px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                      <div style="background-color: white; padding: 12px; border-radius: 6px; border: 1px solid #e0e0e0;">
                        <strong style="color: #666;">Visit Duration:</strong>
                        <div style="font-size: 16px; color: #1e88e5; margin-top: 5px;">
                          ${Math.round((visit.visit_duration_min || 60) / 60 * 10) / 10} hours
                        </div>
                      </div>
                      <div style="background-color: white; padding: 12px; border-radius: 6px; border: 1px solid #e0e0e0;">
                        <strong style="color: #666;">Visit Cost:</strong>
                        <div style="font-size: 16px; color: #1e88e5; margin-top: 5px;">
                          $${visit.visit_cost || 0}
                        </div>
                      </div>
                    </div>
                    
                    ${(visit.treatments && visit.treatments.length > 0) ? `
                      <div style="margin-bottom: 15px;">
                        <strong style="color: #666;">Treatments:</strong>
                        <ul style="margin: 8px 0; padding-left: 20px;">
                          ${visit.treatments.map((treatment: any) => `
                            <li style="margin-bottom: 5px;">
                              <strong>Tooth ${treatment.tooth}</strong>: ${getTreatmentFriendlyName(treatment.procedure || treatment.treatment || '')} 
                              for ${(treatment.condition || '').replace(/-/g, ' ')}
                              ${treatment.time_estimate_min ? `<span style="color: #666; font-size: 12px;">(${treatment.time_estimate_min} min)</span>` : ''}
                            </li>
                          `).join('')}
                        </ul>
                      </div>
                    ` : ''}
                    
                    ${visit.explain_note ? `
                      <div style="background-color: #e8f5e8; padding: 12px; border-radius: 6px; border-left: 4px solid #4caf50;">
                        <strong style="color: #2e7d32;">Why This Grouping:</strong>
                        <div style="color: #2e7d32; margin-top: 5px; font-size: 14px;">
                          ${visit.explain_note}
                        </div>
                      </div>
                    ` : ''}
                  </div>
                </div>
              `).join('') : hasItems ? `
                <div style="margin-bottom: 15px;">
                  <strong style="color: #666; font-size: 15px; display: block; margin-bottom: 10px;">Treatments in this stage:</strong>
                  <ul style="margin: 0; padding-left: 20px; list-style: none;">
                    ${stage.items.map((item: any) => `
                      <li style="margin-bottom: 10px; padding: 10px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px;">
                        <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">
                          Tooth ${item.toothNumber || item.tooth}: ${getTreatmentFriendlyName(item.treatment || '')}
                        </div>
                        <div style="font-size: 13px; color: #6b7280;">
                          For: ${(item.condition || '').replace(/-/g, ' ')}
                        </div>
                        ${item.estimatedTime ? `
                          <div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">
                            ${item.estimatedTime} minutes • $${item.price || 0}
                          </div>
                        ` : ''}
                      </li>
                    `).join('')}
                  </ul>
                </div>
              ` : '<div style="color: #6b7280; font-style: italic;">No treatments in this stage</div>'}
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px;">
                  <strong style="color: #666;">Stage Duration:</strong>
                  <div style="font-size: 18px; color: #1e88e5; margin-top: 5px;">
                    ${stage.totalTime ? `${Math.round(stage.totalTime / 60 * 10) / 10} hours` : stage.total_duration_min ? `${Math.round(stage.total_duration_min / 60 * 10) / 10} hours` : '1 hour'}
                  </div>
                </div>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px;">
                  <strong style="color: #666;">Stage Cost:</strong>
                  <div style="font-size: 18px; color: #1e88e5; margin-top: 5px;">
                    $${stage.totalCost || stage.total_cost || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
        }).join('')}
        
        ${(data.future_tasks && data.future_tasks.length > 0) ? `
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-top: 20px;">
            <h4 style="color: #856404; margin-bottom: 15px;">
              📅 Planned Follow-ups
            </h4>
            ${data.future_tasks.map((task: any) => `
              <div style="background-color: white; padding: 12px; border-radius: 6px; margin-bottom: 10px; border-left: 4px solid #ffc107;">
                <strong style="color: #856404;">${getTreatmentFriendlyName(task.treatment || '')} on Tooth ${task.tooth}</strong>
                <div style="color: #856404; font-size: 14px; margin-top: 5px;">
                  ${task.dependency_reason} - Earliest: ~${task.earliest_date_offset_weeks} weeks
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }
  
  // Fallback to simple staging if no organized stages
  console.log('⚠️ No organized stages found, using simple fallback staging');
  
  if (!uniqueFindings || !Array.isArray(uniqueFindings) || uniqueFindings.length === 0 || uniqueFindings.length <= 3) {
    return '';
  }

  // Define urgency levels for fallback
  const urgencyLevels: {[key: string]: number} = {
    'periapical-lesion': 1,
    'cavity': 1,
    'decay': 1,
    'abscess': 1,
    'root-piece': 2,
    'fracture': 2,
    'impacted-tooth': 2,
    'missing-tooth': 3,
    'whitening': 3
  };

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
  
  // Group findings by urgency
  const urgencyGroups: {[key: number]: any[]} = {};
  uniqueFindings.forEach((finding: any) => {
    const urgency = urgencyLevels[finding.condition] || 2;
    if (!urgencyGroups[urgency]) {
      urgencyGroups[urgency] = [];
    }
    urgencyGroups[urgency].push(finding);
  });

  const sortedUrgencyLevels = Object.keys(urgencyGroups).map(Number).sort((a, b) => a - b);

  if (sortedUrgencyLevels.length <= 1) {
    return '';
  }

  return `
    <div style="padding: 0 20px; margin-bottom: 40px;">
      <h3 style="font-size: 20px; margin-bottom: 20px;">Treatment Plan Stages</h3>
      <p style="color: #666; margin-bottom: 20px; font-style: italic;">Your treatment plan has been organized into stages based on urgency and complexity.</p>
      
      ${sortedUrgencyLevels.map((urgencyLevel, index) => {
        const findings = urgencyGroups[urgencyLevel];
        const treatments = [...new Set(findings.map((f: any) => f.treatment))];
        
        let totalDuration = 0;
        let stageCost = 0;
        findings.forEach((finding: any) => {
          const duration = treatmentDurations[finding.treatment] || 60;
          totalDuration += duration;
          stageCost += getTreatmentPrice(finding.treatment, finding.price);
        });

        const treatmentSummary = treatments.map((treatment: any) => {
          const count = findings.filter((f: any) => f.treatment === treatment).length;
          const condition = findings.find((f: any) => f.treatment === treatment)?.condition;
          return `${count} ${getTreatmentFriendlyName(treatment)}${count > 1 ? 's' : ''} for ${condition?.replace(/-/g, ' ')}`;
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
                  ${findings.map((finding: any) => `
                    <li>${getTreatmentFriendlyName(finding.treatment)} on Tooth ${finding.tooth} for ${finding.condition.replace(/-/g, ' ')}</li>
                  `).join('')}
                </ul>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
};

const renderActiveConditions = (uniqueFindings: any[]) => {
  // Helper functions for active conditions
  const getConditionDescription = (condition: string) => {
    const descriptions: {[key: string]: string} = {
      'impacted-tooth': 'An impacted tooth is one that has not fully erupted through the gum or has grown in at an angle. This can cause pain, swelling, and can damage neighboring teeth.',
      'periapical-lesion': 'A periapical lesion is an infection or inflammation at the tip of the tooth root, usually caused by untreated decay or trauma. This can lead to severe pain and bone loss.',
      'caries': 'Caries, commonly known as cavities, are areas of tooth decay caused by bacteria that produce acids that eat away at your tooth enamel. This decay starts on the surface and can progress deeper into the tooth if left untreated, potentially reaching the nerve and causing severe pain.',
      'cavity': 'A cavity is a hole in your tooth caused by bacteria that eat away at the enamel. Left untreated, cavities can grow larger and reach the sensitive inner part of your tooth.',
      'root-piece': 'A root piece is a fragment of a tooth root that remains in the jawbone after a tooth has been extracted. This can cause infection and prevent proper healing.',
      'missing-tooth': 'A missing tooth creates a gap that can cause other teeth to shift, leading to bite problems and potential jaw pain.',
      'decay': 'Tooth decay is the destruction of tooth structure caused by acids produced by bacteria. It starts on the surface and can progress deeper, causing pain and infection.',
      'fracture': 'A fractured tooth has a crack or break that can cause pain and sensitivity. Without treatment, the fracture can worsen and lead to tooth loss.',
      'abscess': 'An abscess is a pocket of infection that forms around the tooth root. This is a serious condition that can cause severe pain and spread to other parts of your body.'
    };
    return descriptions[condition] || `${condition.replace(/-/g, ' ')} is a dental condition that requires professional treatment.`;
  };

  const getTreatmentDescription = (treatment: string) => {
    // 🔍 DEBUG: Log treatment code being looked up
    console.log(`🔍 getTreatmentDescription called with: "${treatment}"`);
    
    // Comprehensive, patient-friendly treatment descriptions with recovery and aftercare info
    const descriptions: {[key: string]: string} = {
      // ENDODONTICS
      'endo_rct_prep_1': 'Root canal treatment saves your tooth by removing the infected nerve inside. We carefully clean the canal, disinfect it, and prepare it for sealing. The procedure is done under local anesthesia so you won\'t feel pain. Most patients can return to normal activities the next day, though you may feel some tenderness for a few days. Avoid chewing on that tooth until it\'s fully restored with a filling or crown.',
      
      'endo_rct_obt_1': 'After the canal is cleaned, we seal it with a special filling material to prevent future infection. This step permanently seals the tooth and completes your root canal treatment. You may experience mild sensitivity for a few days, but this will gradually fade. A crown is usually recommended afterward to protect the tooth from breaking.',
      
      'endo_extirpation': 'This emergency procedure provides immediate pain relief by removing the infected nerve tissue and draining any abscess. We\'ll open the tooth, remove the painful infection, place medication inside, and cover it temporarily. You should feel significant relief within hours. This is the first step - you\'ll need to return to complete the root canal treatment. Stick to soft foods and take any prescribed antibiotics.',
      
      'endo_apicectomy_per_root': 'When a standard root canal doesn\'t resolve the infection, we may need to surgically access the root tip through your gum. We remove the infected tip of the root and seal it from underneath. This is done under local anesthesia and takes about an hour. Expect some swelling and discomfort for 2-3 days - ice packs and pain medication will help. Stick to soft foods for a week and avoid strenuous activity for a few days.',
      
      // ORAL SURGERY
      'surg_simple_extraction': 'We gently remove the tooth using specialized instruments after numbing the area completely. You won\'t feel pain during the procedure, though you may feel pressure. Afterward, we\'ll place gauze to help stop bleeding. Expect soreness for 2-3 days - ice packs and pain medication will help. Stick to soft foods for a few days and avoid using straws, as suction can dislodge the blood clot. The site will heal completely in about 2 weeks.',
      
      'surg_surgical_extraction': 'When a tooth is difficult to remove (like an impacted wisdom tooth), we make a small incision in your gum and may need to section the tooth into pieces for easier removal. The procedure is done under local anesthesia or sedation if you prefer. Expect moderate swelling and discomfort for 3-5 days. Use ice packs for the first 24 hours, then switch to warm compresses. Stick to soft, cool foods and avoid strenuous activity for a few days. Most people take 2-3 days off work.',
      
      'surg_incision_drainage': 'To relieve an abscess, we make a small incision to drain the infection, providing immediate relief from pressure and pain. This is a quick procedure done under local anesthesia. You\'ll likely need antibiotics to clear the remaining infection. The relief is usually immediate, though the area will be tender for a few days. Continue saltwater rinses and take all prescribed antibiotics.',
      
      // RESTORATIVE (DIRECT)
      'resto_comp_one_surface_ant': 'We remove the decay and restore your front tooth with a tooth-colored filling that blends naturally with your smile. The procedure is quick (usually 30 minutes) and done under local anesthesia. You can eat right away once the numbness wears off - just be careful not to bite your lip while numb! The filling should last 5-7 years with good care.',
      
      'resto_comp_two_surface_post': 'We carefully clean out the decay and fill the cavity with a strong, tooth-colored material. The filling is shaped and polished to match your bite perfectly. You may experience brief sensitivity to cold for a few days - this is normal as the tooth adjusts. Avoid very hard or sticky foods for 24 hours. With proper care, this filling should last 7-10 years.',
      
      'resto_comp_three_plus_post': 'For larger cavities involving multiple surfaces, we remove all decay and rebuild your tooth with a durable composite filling. This takes a bit longer (about 45-60 minutes) but saves your natural tooth. Expect some sensitivity to cold for a week or two as your tooth heals. If the filling is very large, we may recommend a crown in the future to prevent the tooth from cracking.',
      
      // CROWNS & INDIRECT RESTORATIONS
      'crown_full_tooth_coloured': 'We prepare your tooth by gently reshaping it, then take precise impressions to create a custom crown that fits perfectly. A temporary crown protects your tooth while the lab makes your permanent one (about 2 weeks). The permanent crown is cemented in place, fully restoring your tooth\'s strength and appearance. The temporary may feel bulky - be careful with sticky or hard foods. Once the permanent crown is on, you can eat normally, though it may feel slightly sensitive for a few days.',
      
      'onlay_inlay_indirect_tc': 'This lab-made restoration is like a custom puzzle piece that fits precisely into your tooth. It\'s stronger than a filling and preserves more of your natural tooth than a crown. The procedure requires two visits - first to prepare and take impressions, then to bond the final restoration. Between visits, a temporary filling protects your tooth. Once bonded, it\'s incredibly strong and should last 10-15 years.',
      
      'veneer_porcelain': 'We remove a thin layer of enamel from your front tooth and bond a custom-made porcelain shell that transforms your smile. The veneer is incredibly thin but very strong. The procedure requires two visits - one for preparation and impressions, and one to bond the veneers permanently. Your teeth may be slightly sensitive for a few days after preparation. Once bonded, treat them like natural teeth - brush and floss normally.',
      
      // PREVENTIVE
      'scale_clean_polish': 'Professional cleaning removes plaque and tartar that brushing can\'t reach, especially below the gum line. We use specialized instruments and gentle ultrasonic scalers. Your gums may feel slightly tender for a day, especially if we had to clean deeply below the gumline. This is normal and will quickly improve. Some people experience brief sensitivity to cold - this should resolve within a few days.',
      
      'fluoride_varnish': 'We paint a concentrated fluoride treatment directly onto your teeth to strengthen enamel and prevent cavities. It goes on quickly and dries in seconds. Avoid eating or drinking for 30 minutes to let it absorb fully. The varnish may feel slightly sticky or rough on your teeth - this will wear off naturally. This simple treatment significantly reduces your cavity risk.',
      
      'fissure_sealant_per_tooth': 'We apply a protective coating to the grooves of your back teeth where cavities often start. It\'s quick, painless, and doesn\'t require any drilling or numbing. The sealant acts like a shield, preventing food and bacteria from getting stuck in the deep grooves. You can eat normally right away. Sealants typically last 5-10 years.',
      
      // PERIODONTAL
      'perio_srp_per_quadrant': 'Deep cleaning (scaling and root planing) removes tartar and bacteria from beneath your gums. We\'ll numb the area to keep you comfortable, then carefully clean the root surfaces to help your gums reattach to the teeth. Your gums will likely be tender for 3-5 days. Stick to soft foods and rinse with warm salt water. You may notice some bleeding when brushing for the first few days - this is normal. Most people see significant improvement in gum health within 2-3 weeks.',
      
      // PROSTHODONTICS
      'prost_partial_denture_resin_1to3': 'We create a custom appliance to replace your missing teeth and restore your smile. The denture has natural-looking teeth attached to a gum-colored base that clips onto your remaining teeth. It takes a few visits to ensure a perfect fit. There\'s an adjustment period - start with soft foods and practice speaking. You may produce more saliva initially (this is normal and temporary). Remove and clean your denture daily. Most people adapt within 2-3 weeks.',
      
      'prost_full_denture_upper': 'A complete denture replaces all your upper teeth with a custom-fitted plate. We take multiple impressions and measurements to ensure comfort and a natural appearance. The denture fits snugly against your palate using natural suction. There\'s definitely an adjustment period - start with soft foods, cut food into small pieces, and practice speaking. Your mouth will produce extra saliva for the first few weeks. Most people adapt fully within 4-6 weeks.',
      
      // WHITENING
      'whitening_in_chair': 'Professional whitening can brighten your teeth up to 8 shades in just one visit. We apply a powerful but safe whitening gel and use a special light to activate it. The procedure takes about 90 minutes. Your teeth will be sensitive for 24-48 hours afterward - avoid very hot, cold, or acidic foods during this time. The results are immediate and can last 1-2 years with good care.',
      
      'whitening_take_home': 'We create custom trays that fit your teeth perfectly and provide professional whitening gel. You wear the trays for 30-60 minutes daily for 1-2 weeks. The gradual process is gentle on your teeth while delivering excellent results. You may experience mild sensitivity - if this happens, skip a day or reduce wear time. Results typically last 1-2 years. Avoid staining foods and drinks while whitening.',
      
      // IMPLANTS
      'implant_single_stage': 'A dental implant replaces your missing tooth root with a titanium post that integrates with your jawbone. This is a surgical procedure done under local anesthesia or sedation. The implant takes 3-6 months to fuse with your bone (osseointegration), after which we attach a crown. There will be some swelling and discomfort for about a week. Stick to soft foods during healing and maintain excellent oral hygiene. Once healed, your implant will function just like a natural tooth and can last a lifetime with proper care.',
      
      'implant_crown_attached': 'After your implant has integrated with the bone, we attach a custom crown that looks and functions like your natural tooth. The crown is color-matched to blend perfectly with your smile. This appointment is straightforward and doesn\'t require anesthesia. You can eat normally once it\'s attached, though you may want to be gentle for the first day. The implant crown should last 10-15 years or more with good care.',
      
      // BRIDGES
      'bridge_three_unit_tc': 'A bridge replaces one missing tooth by using the adjacent teeth as anchors. We prepare the teeth on either side, take impressions, and create a 3-piece restoration that spans the gap. A temporary bridge protects your teeth while the lab makes your permanent one (2-3 weeks). The permanent bridge is cemented in place, restoring your ability to chew and smile confidently. You\'ll need to use a special floss threader to clean under the bridge. With good care, a bridge can last 10-15 years.',
      
      // EXTRACTIONS (Additional)
      'surg_root_extraction_fragment': 'Sometimes part of a tooth root remains after an extraction or breaks off. We carefully remove this fragment to prevent infection and allow proper healing. The procedure is usually quick (15-30 minutes) and done under local anesthesia. You may have some soreness for a few days. Use ice packs, take prescribed pain medication, and stick to soft foods. The site should heal completely within 1-2 weeks.',
      
      // ROOT CANAL ADDITIONAL
      'endo_rct_prep_addl': 'Molars have multiple canals (usually 3-4) that all need cleaning. This additional canal preparation ensures we\'ve removed all infected tissue. Each canal requires careful cleaning and shaping. The procedure takes longer for multi-canal teeth (90-120 minutes total). Recovery is the same as single-canal treatment - some tenderness for a few days, but you\'ll feel significant relief once the infection is removed.',
      
      'endo_rct_obt_addl': 'After cleaning all canals in your molar, we seal each one to prevent reinfection. This completes your root canal treatment. Multiple canal obturation takes time to ensure each is perfectly sealed. You may have some sensitivity for a few days. A crown is strongly recommended for molars after root canal treatment, as they\'re under heavy chewing forces and can crack without protection.',
      
      // ADDITIONAL COMMON TREATMENTS
      'resto_amalgam_one_surface': 'Silver (amalgam) fillings are extremely durable and perfect for back teeth that endure heavy chewing forces. We remove the decay and fill the cavity with a silver-colored material that hardens quickly. You can eat once the numbness wears off, though the filling continues to strengthen over 24 hours. Avoid very hard foods for a day. Amalgam fillings can last 10-15 years or more.',
      
      'resto_amalgam_two_surface': 'For cavities spanning two surfaces of your back tooth, we use a strong amalgam filling that can withstand years of chewing pressure. The procedure takes about 45 minutes. Some sensitivity to cold is normal for a few days as your tooth adjusts. These fillings are incredibly durable and can last 15+ years with proper care.',
      
      'post_core_fiberglass': 'When a tooth has significant structure loss after root canal treatment, we place a post inside the canal to support the crown. The fiberglass post bonds strongly with your tooth and provides a solid foundation. This is done before the crown preparation, adding about 30 minutes to your appointment. Once the post is in place, we can build up the tooth and prepare it for a crown.',
      
      'build_up_core': 'We rebuild your tooth structure using strong composite material before placing a crown. This is necessary when decay or breakage has removed too much of your natural tooth. The buildup is shaped to support the crown and restore the tooth\'s strength. The procedure is done under anesthesia and takes about 30-45 minutes. Once complete, your tooth is ready for crown preparation.',
    };
    
    // Check if we have a specific description
    if (descriptions[treatment]) {
      console.log(`✅ Found comprehensive description for: ${treatment}`);
      return descriptions[treatment];
    }
    
    // Fallback: Try to get description from TreatmentService
    const masterTreatment = TreatmentService.getByCode(treatment);
    if (masterTreatment?.description) {
      console.log(`⚠️ Using master database description for: ${treatment}`);
      console.log(`   Master description: "${masterTreatment.description.substring(0, 100)}..."`);
      return masterTreatment.description;
    }
    
    // Final fallback
    console.log(`❌ No description found for: ${treatment}, using generic fallback`);
    return `This ${treatment.replace(/_/g, ' ')} procedure will effectively treat your condition and restore your oral health. Your dentist will discuss the specific details, recovery time, and aftercare instructions with you during your consultation.`;
  };

  const getUrgencyMessage = (treatment: string, conditions: string[]) => {
    // Dynamic urgency based on CONDITION + TREATMENT (not hardcoded one-size-fits-all)
    const conditionUrgency: {[key: string]: { physical: string; aesthetic?: string }} = {
      // Infection/Abscess - URGENT
      'periapical_abscess': {
        physical: 'This is a dental emergency. The infection can spread to your jaw, face, and even bloodstream if left untreated. Immediate treatment is critical to prevent serious complications.',
        aesthetic: 'Untreated abscesses can cause facial swelling and visible deformity.'
      },
      'periodontal_abscess': {
        physical: 'This gum infection can rapidly spread and lead to tooth loss. Early treatment prevents the infection from damaging surrounding teeth and bone.',
      },
      
      // Pulp/Nerve Issues
      'irreversible_pulpitis': {
        physical: 'The nerve is infected and will not heal on its own. Without treatment, the infection will worsen, causing severe pain and potentially forming an abscess.',
      },
      'necrotic_pulp': {
        physical: 'The tooth nerve has died and bacteria are multiplying inside. This will lead to infection, abscess formation, and potential bone loss if not treated promptly.',
      },
      'symptomatic_apical_periodontitis': {
        physical: 'The infection has spread beyond the tooth root. Delaying treatment allows bacteria to destroy more bone and can lead to abscess formation.',
      },
      
      // Bone Loss/Periapical Issues
      'periapical-lesion': {
        physical: 'This infection is actively destroying the bone around your tooth root. Continued delay may make the tooth unsaveable and require extraction.',
      },
      'bone_loss': {
        physical: 'Progressive bone loss is occurring. Once bone is lost, it cannot regenerate naturally. Treatment now preserves your remaining bone and tooth stability.',
        aesthetic: 'Bone loss can cause gum recession, making teeth appear longer and creating gaps between teeth.'
      },
      
      // Caries/Decay
      'caries_dentine': {
        physical: 'The decay has reached the deeper layer of your tooth. Without treatment, it will progress to the nerve, requiring root canal treatment instead of a simple filling.',
        aesthetic: 'Visible cavities can appear as dark spots or holes in your teeth, affecting your smile.'
      },
      'caries_enamel': {
        physical: 'Early decay can be treated with a simple filling now. If left untreated, it will progress deeper, requiring more extensive (and expensive) treatment.',
      },
      'caries_recurrent': {
        physical: 'Decay has formed around an existing filling. This indicates the seal has broken, allowing bacteria to enter. The cavity is growing underneath and may already be larger than it appears.',
      },
      'caries_root': {
        physical: 'Root surface decay is aggressive and can quickly reach the nerve. The root has no protective enamel layer, making it vulnerable to rapid progression.',
        aesthetic: 'Root decay near the gumline is often visible and can appear as dark brown or black spots.'
      },
      
      // Gum Disease
      'gingivitis_plaque': {
        physical: 'Gum disease is reversible at this stage with proper treatment and hygiene. If left untreated, it progresses to periodontitis, which causes permanent bone loss.',
      },
      'periodontitis_stage_i_ii': {
        physical: 'Bone loss has begun. Without treatment, you will continue losing bone support, leading to tooth mobility and eventual tooth loss. Gum disease is also linked to heart disease and diabetes.',
      },
      'periodontitis_stage_iii_iv': {
        physical: 'Advanced bone loss has occurred. You are at high risk of tooth loss. The infection can affect your overall health, including increased risk of heart disease, stroke, and diabetes complications.',
        aesthetic: 'Severe gum disease causes gum recession, tooth mobility, and eventual tooth loss, creating gaps in your smile.'
      },
      
      // Tooth Structure Issues
      'fracture': {
        physical: 'Fractured teeth are at risk of splitting completely, which often requires extraction. The crack also allows bacteria to enter, leading to infection and pain.',
        aesthetic: 'Visible cracks or broken pieces can significantly affect your smile and may cause you to avoid smiling.'
      },
      'cracked_tooth_vital': {
        physical: 'Cracks in teeth tend to worsen over time. If the crack extends to the root, the tooth will require extraction. Early treatment with a crown can save the tooth.',
        aesthetic: 'Cracked teeth can discolor along the crack line and become increasingly visible.'
      },
      'fractured_cusp_restorable': {
        physical: 'The fractured portion makes the tooth weak and prone to further breakage. Restoring it now prevents the need for extraction later.',
      },
      
      // Missing Teeth
      'missing_single_tooth': {
        physical: 'Neighboring teeth will slowly drift into the gap, creating bite problems and making future tooth replacement more difficult and expensive. Bone loss occurs where the tooth is missing.',
        aesthetic: 'A visible gap affects your smile, and over time, the missing tooth can cause your face to appear sunken in that area.'
      },
      'partial_edentulism': {
        physical: 'Multiple missing teeth cause remaining teeth to shift, leading to bite problems, difficulty chewing, and increased strain on remaining teeth.',
        aesthetic: 'Multiple missing teeth significantly impact your smile and can cause facial sagging, making you appear older.'
      },
      
      // Impacted/Eruption Issues
      'impacted_tooth': {
        physical: 'Impacted teeth can damage adjacent teeth, cause cysts or infections, and lead to severe pain. The longer they remain, the higher the risk of complications.',
      },
      'pericoronitis': {
        physical: 'This painful infection around a partially erupted tooth can spread to your throat and neck if untreated. It tends to recur and worsen over time.',
      },
      
      // Failed/Existing Restorations
      'failed_restoration': {
        physical: 'A failing restoration allows bacteria and decay to enter underneath. What appears small on the surface may be extensive decay underneath, potentially requiring root canal treatment.',
      },
      'existing-large-filling': {
        physical: 'Large fillings weaken teeth and are prone to fracture. Crowning the tooth now prevents catastrophic fracture that would require extraction.',
      },
      
      // Aesthetic Conditions (lower urgency but mention aesthetic impact)
      'aesthetic_discolouration': {
        physical: 'While not a health emergency, discoloration can indicate underlying enamel weakness or staining that will worsen over time.',
        aesthetic: 'Discolored teeth can make you self-conscious about your smile and affect your confidence in social and professional settings.'
      },
      'staining': {
        physical: 'Surface staining can sometimes mask underlying decay or enamel erosion.',
        aesthetic: 'Stained teeth can affect your smile confidence and how others perceive you.'
      },
      'hypoplasia': {
        physical: 'Enamel hypoplasia leaves teeth more vulnerable to cavities and sensitivity. Treating it now protects the teeth long-term.',
        aesthetic: 'Visible enamel defects can appear as white or brown spots, affecting the uniformity of your smile.'
      },
      
      // Tooth Wear
      'tooth_wear_erosion': {
        physical: 'Acid erosion is progressively thinning your enamel. Once enamel is lost, it cannot regenerate. This leads to sensitivity and increased cavity risk.',
        aesthetic: 'Worn teeth can appear shorter and more translucent, aging your smile.'
      },
      'tooth_wear_attrition': {
        physical: 'Grinding is wearing down your teeth. This can expose the nerve layer, cause severe sensitivity, and weaken tooth structure.',
        aesthetic: 'Worn-down teeth can appear short and flat, aging your appearance.'
      },
      
      // Sensitivity
      'dentine_hypersensitivity': {
        physical: 'Sensitivity indicates exposed dentine, which is vulnerable to rapid decay. Addressing it now prevents cavities and discomfort when eating or drinking.',
      },
      
      // Miscellaneous
      'dry_socket': {
        physical: 'Dry socket causes severe pain and delayed healing. Treatment provides immediate relief and promotes proper healing.',
      },
      'retained_root': {
        physical: 'Retained root fragments can become infected and form abscesses. They also complicate future tooth replacement options.',
      },
      'calculus': {
        physical: 'Hardened tartar buildup harbors bacteria that cause gum disease and bone loss. It cannot be removed by brushing and requires professional cleaning.',
      },
    };
    
    // Get urgency for the primary condition
    const primaryCondition = conditions[0] || '';
    const urgencyData = conditionUrgency[primaryCondition];
    
    if (urgencyData) {
      let message = urgencyData.physical;
      if (urgencyData.aesthetic) {
        message += ' ' + urgencyData.aesthetic;
      }
      return message;
    }
    
    // Fallback for unknown conditions
    return 'Delaying treatment can lead to worsening symptoms, more complex procedures, and higher costs. Early intervention provides the best outcomes.';
  };

  // Group findings by treatment type
  const treatmentGroups: {[key: string]: any[]} = {};
  const extractionReplacements: any[] = [];
  
  uniqueFindings.forEach((finding: any) => {
    if (finding.treatment === 'extraction' && finding.replacement && finding.replacement !== 'none') {
      extractionReplacements.push(finding);
      return;
    }
    
    const treatmentKey = finding.treatment;
    if (!treatmentGroups[treatmentKey]) {
      treatmentGroups[treatmentKey] = [];
    }
    treatmentGroups[treatmentKey].push(finding);
  });
  
  if (extractionReplacements.length > 0) {
    treatmentGroups['extraction-with-replacement'] = extractionReplacements;
  }

  return `
    <div style="padding: 20px;">
      <h3 style="font-size: 20px; margin-bottom: 10px; color: #111827;">Understanding Your Treatment Conditions</h3>
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 25px; line-height: 1.6;">
        Below you'll find detailed explanations for each recommended treatment. Each section describes what the condition means, why treatment is important, and what to expect from the procedure.
      </p>
      ${Object.entries(treatmentGroups).map(([treatmentKey, findings]) => {
        if (treatmentKey === 'extraction-with-replacement') {
          return findings.map((finding: any) => {
            const tooth = finding.tooth;
            const replacement = finding.replacement;
            
            return `
              <div style="border: 1px solid #ddd; border-left: 4px solid #1e88e5; margin-bottom: 20px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <div style="background-color: #ffeb3b; padding: 12px 16px;">
                  <strong style="font-size: 16px; color: #111827;">Extraction and ${replacement.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} for Tooth ${tooth}</strong>
                </div>
                <div style="padding: 20px;">
                  
                  <p style="margin-bottom: 15px;"><strong>Tooth ${tooth}</strong> requires extraction followed by replacement with a ${replacement.replace(/-/g, ' ')}.</p>
                  
                  <p style="margin-bottom: 15px;"><strong>What This Means:</strong> An impacted tooth is one that has not fully erupted through the gum or has grown in at an angle. This can cause pain, swelling, and can damage neighboring teeth.</p>
                  
                  <p style="margin-bottom: 15px;">
                    <span style="color: #4caf50;">✓</span> <strong>Recommended Treatment:</strong> Surgical extraction involves removing the tooth through a small incision in the gum, followed by replacement with a ${replacement.replace(/-/g, ' ')} after healing.
                  </p>
                  
                  <p style="margin: 15px 0; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
                    <span style="color: #f44336;">⚠️</span> <strong>Urgency:</strong> Delaying extraction can lead to severe pain, infection spreading to other teeth, and potential damage to your jawbone. The longer you wait, the more complex the procedure becomes.
                  </p>
                </div>
              </div>
            `;
          }).join('');
        }
        
        const conditions = [...new Set(findings.map((f: any) => f.condition))];
        const teeth = findings.map((f: any) => f.tooth).sort();
        const teethText = teeth.length === 1 ? `Tooth ${teeth[0]}` : `Teeth ${teeth.join(', ')}`;
        
        return `
          <div style="border: 1px solid #ddd; border-left: 4px solid #1e88e5; margin-bottom: 20px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div style="background-color: #ffeb3b; padding: 12px 16px;">
              <strong style="font-size: 16px; color: #111827;">${getTreatmentFriendlyName(treatmentKey)} for ${conditions.map((c: string) => c.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())).join(', ')}</strong>
            </div>
            <div style="padding: 20px;">
              
              <p style="margin-bottom: 15px;"><strong>${teethText}</strong> ${teeth.length === 1 ? 'has' : 'have'} ${conditions.map((c: string) => c.replace(/-/g, ' ')).join(', ')} that requires ${getTreatmentFriendlyName(treatmentKey)}.</p>
              
              <p style="margin-bottom: 15px;"><strong>What This Means:</strong> ${conditions.map((c: string) => getConditionDescription(c)).join(' ')}</p>
              
              <p style="margin-bottom: 15px;">
                <span style="color: #4caf50;">✓</span> <strong>Recommended Treatment:</strong> ${getTreatmentFriendlyName(treatmentKey)}
              </p>
              
              <p style="margin-bottom: 15px; padding: 15px; background-color: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 4px; line-height: 1.8;">
                ${getTreatmentDescription(treatmentKey)}
              </p>
              
              <p style="margin: 15px 0; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
                <span style="color: #f44336;">⚠️</span> <strong>Urgency:</strong> ${getUrgencyMessage(treatmentKey, conditions)}
              </p>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
};

const renderReplacementOptionsTable = (showReplacementTable: boolean, findings: any[], treatmentSettings: any) => {
  if (!showReplacementTable) {
    return '';
  }
  
  const relevantTreatments = findings.filter((f: any) =>
    f.treatment && ['implant-placement', 'crown', 'bridge', 'partial-denture'].includes(f.treatment)
  );
  
  if (relevantTreatments.length === 0) {
    return '';
  }
  
  if (!treatmentSettings) {
    return '';
  }
  
  return generateReplacementOptionsTable({
    context: 'missing-tooth',
    selectedTreatment: relevantTreatments[0].treatment,
    clinicPrices: Object.fromEntries(
      Object.entries(treatmentSettings).map(([key, value]: [string, any]) => [key, value.price])
    )
  });
};

const renderXraySection = (reportImageUrl: string | null, data: any) => {
  if (!reportImageUrl) {
    return `
      <div style="padding: 40px 20px; text-align: center; background-color: #f5f5f5; margin: 20px;">
        <h3 style="font-size: 20px; margin-bottom: 10px; color: #666;">Report Generated Without X-Ray</h3>
        <p style="color: #888; font-size: 14px;">This report was generated based on clinical observations and findings only.</p>
        <p style="color: #888; font-size: 14px;">For a more comprehensive analysis, please upload an X-ray image.</p>
      </div>
    `;
  }
  
  return `
    <div style="padding: 40px 20px; text-align: center;">
      <h3 style="font-size: 24px; margin-bottom: 10px;">Annotated X-Ray Image</h3>
      <p style="color: #666; margin-bottom: 30px;">Below is your panoramic X-ray with AI-generated highlights of all detected conditions.</p>
      
      <img src="${reportImageUrl}" alt="Annotated X-ray" style="max-width: 100%; height: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 8px; margin-bottom: 30px;" />
      
      ${renderLegend(data.detections)}
    </div>
  `;
};

const renderLegend = (detections: any[]) => {
  if (!detections || detections.length === 0) {
    return '';
  }

  const conditionColors: {[key: string]: string} = {
    'bone-level': '#6C4A35',
    'caries': '#58eec3',
    'crown': '#FF00D4',
    'filling': '#FF004D',
    'root-canal-treatment': '#FF004D',
    'root-canal': '#FF004D',
    'fracture': '#FF69F8',
    'impacted-tooth': '#FFD700',
    'implant': '#00FF5A',
    'missing-teeth-no-distal': '#4FE2E2',
    'missing-tooth-between': '#8c28fe',
    'periapical-lesion': '#007BFF',
    'post': '#00FFD5',
    'root-piece': '#fe4eed',
    'tissue-level': '#A2925D'
  };

  const uniqueConditions = [...new Set(detections.map((detection: any) => detection.class || detection.class_name))] as string[];

  const normalizeCondition = (condition: string) => {
    return condition
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/s$/, '')
      .replace(/^carie$/, 'caries');
  };

  const formatConditionName = (condition: string) => {
    return condition
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Check if both filling and root canal are present
  const normalizedConditions = uniqueConditions.map(normalizeCondition);
  const hasFilling = normalizedConditions.includes('filling');
  const hasRootCanal = normalizedConditions.includes('root-canal-treatment') || normalizedConditions.includes('root-canal');
  
  let displayConditions: Array<{name: string, color: string}> = [];
  
  if (hasFilling && hasRootCanal) {
    // Combine them
    displayConditions.push({
      name: 'Filling & Root Canal',
      color: '#FF004D'
    });
    // Add other conditions
    uniqueConditions.forEach(condition => {
      const normalized = normalizeCondition(condition);
      if (normalized !== 'filling' && normalized !== 'root-canal-treatment' && normalized !== 'root-canal') {
        displayConditions.push({
          name: formatConditionName(condition),
          color: conditionColors[normalized] || '#666666'
        });
      }
    });
  } else {
    // Show all individually
    uniqueConditions.forEach(condition => {
      const normalized = normalizeCondition(condition);
      displayConditions.push({
        name: formatConditionName(condition),
        color: conditionColors[normalized] || '#666666'
      });
    });
  }

  return `
    <div style="text-align: center; margin-bottom: 30px; padding: 15px;">
      <h4 style="margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">Key</h4>
      <table style="margin: 0 auto; border-collapse: separate; border-spacing: 15px 8px;">
        <tr>
          ${displayConditions.map(({name, color}, index) => `
            ${index % 3 === 0 && index !== 0 ? '</tr><tr>' : ''}
            <td style="text-align: center; white-space: nowrap;">
              <span style="display: inline-block; width: 18px; height: 18px; background-color: ${color}; border: 1px solid #333; vertical-align: middle; margin-right: 6px;"></span>
              <span style="font-size: 14px; vertical-align: middle;">${name}</span>
            </td>
          `).join('')}
        </tr>
      </table>
    </div>
  `;
};

const renderVideoSection = (videoUrl: string | null, primaryColor: string) => {
  if (!videoUrl) {
    console.log('ℹ️ No video URL provided - skipping video section in report');
    return '';
  }

  console.log('🎬 Rendering video section in report with URL:', videoUrl);

  return `
    <div style="margin: 40px 0; padding: 30px; background: linear-gradient(135deg, ${primaryColor}15 0%, ${primaryColor}05 100%); border-radius: 12px; border: 2px solid ${primaryColor}30; text-align: center;">
      <h3 style="margin: 0 0 15px 0; font-size: 24px; font-weight: bold; color: ${primaryColor};">
        Watch Your Personalized Video
      </h3>
      <p style="margin: 0 0 25px 0; font-size: 16px; color: #374151; line-height: 1.6;">
        We've created a custom video explanation of your dental findings. Watch this short video to better understand your condition and recommended treatment options.
      </p>
      <a href="${videoUrl}" target="_blank" style="display: inline-block; background-color: ${primaryColor}; color: white; padding: 15px 40px; border-radius: 8px; font-size: 18px; font-weight: bold; text-decoration: none; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: all 0.3s ease;">
        ▶ Watch Video Now
      </a>
    </div>
  `;
};

export { useReportGeneration, generateReportHTML };
