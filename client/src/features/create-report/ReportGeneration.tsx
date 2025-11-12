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
        
        // Get video language from localStorage settings
        const videoLanguage = localStorage.getItem('videoNarrationLanguage') || 'english';
        console.log(`🎙️ Using video narration language: ${videoLanguage}`);
        
        analysisResult = await api.analyzeXray({
          patientName,
          imageUrl: imageUrl,
          findings,
          generateVideo: true, // Request video generation for both manual and AWS
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
        clinicBranding: brandingData
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

// WORKING generateReportHTML from commit 2784580 (adapted)
const generateReportHTML = (data: any) => {
  const { findings, patientName, treatmentSettings, showReplacementOptionsTable, clinicBranding } = data;
  
  // DEBUG: Log clinic branding to diagnose issue
  console.log('📊 generateReportHTML - clinicBranding received:', clinicBranding);
  console.log('📊 generateReportHTML - detections received:', data.detections);
  
  // Extract clinic branding with defaults
  const clinicName = clinicBranding?.clinicName || 'Dental Clinic';
  const clinicLogo = clinicBranding?.logoUrl || '';
  const clinicAddress = clinicBranding?.address || '';
  const clinicPhone = clinicBranding?.phone || '';
  const clinicEmail = clinicBranding?.email || '';
  const clinicWebsite = clinicBranding?.website || '';
  const primaryColor = clinicBranding?.primaryColor || '#1e88e5';
  
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
  
  // ✅ NEW: Get friendly patient name for report
  const getTreatmentFriendlyName = (treatment: string) => {
    return TreatmentService.getFriendlyName(treatment);
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
      procedure: getTreatmentFriendlyName(finding.treatment), // ✅ Use friendly patient name
      adaCode: generateADACode(finding.treatment), // ✅ Use AU insurance code
      unitPrice: getTreatmentPrice(finding.treatment, finding.price),
      quantity: 1,
      tooth: finding.tooth,
      condition: finding.condition,
      stage: 'Doctor Findings'
    });
  });

  const groupedTreatments = groupTreatments(treatmentItems);
  
  // Generate the HTML with clinic branding
  const htmlContent = `
    <div class="report-container" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <!-- Clinic Header with Branding -->
      <div style="background-color: ${primaryColor}; color: white; padding: 25px 20px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 15px;">
          ${clinicLogo ? `
            <img src="${clinicLogo}" alt="${clinicName}" style="height: 50px; width: auto; max-width: 150px; object-fit: contain; background: white; padding: 5px; border-radius: 8px;" />
          ` : ''}
          <div>
            <div style="font-size: 26px; font-weight: bold; margin-bottom: 5px;">${clinicName}</div>
            ${clinicAddress ? `
              <div style="font-size: 13px; opacity: 0.95; line-height: 1.4;">
                ${clinicAddress}
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Patient Info & Title -->
      <div style="padding: 25px 20px; background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
        <h1 style="font-size: 28px; margin: 0 0 12px 0; color: #111827; font-weight: 700;">Treatment Report for ${patientName}</h1>
        <p style="text-align: center; color: #6b7280; margin: 20px 0 0; font-style: italic; font-size: 14px;">Scroll down to view your full written report</p>
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
                              <strong>Tooth ${treatment.tooth}</strong>: ${(treatment.procedure || treatment.treatment || '').replace(/-/g, ' ')} 
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
                          Tooth ${item.toothNumber || item.tooth}: ${(item.treatment || '').replace(/-/g, ' ')}
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
                <strong style="color: #856404;">${(task.treatment || '').replace(/-/g, ' ')} on Tooth ${task.tooth}</strong>
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
          return `${count} ${treatment.replace(/-/g, ' ')}${count > 1 ? 's' : ''} for ${condition?.replace(/-/g, ' ')}`;
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
    return descriptions[treatment] || `${treatment.replace(/-/g, ' ')} is a dental procedure that will effectively treat your condition and restore your oral health.`;
  };

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
    
    const aestheticRisks: {[key: string]: string} = {
      'caries': 'Untreated caries can cause visible discoloration and dark spots on your teeth, and may eventually lead to tooth loss, creating gaps in your smile.',
      'cavity': 'Untreated cavities can cause visible discoloration and may eventually lead to tooth loss, creating gaps in your smile.',
      'missing-tooth': 'Missing teeth can cause your face to look sunken and make you appear older than you are.',
      'fracture': 'A fractured tooth can be visible when you smile and may cause you to hide your smile.',
      'decay': 'Visible decay can make you self-conscious about your smile and affect your confidence in social situations.'
    };
    
    const aestheticRisk = conditions.some((c: string) => aestheticRisks[c]) ? 
      ' Additionally, this condition can affect the appearance of your smile and your confidence.' : '';
    
    return physicalRisks + aestheticRisk;
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
              <strong style="font-size: 16px; color: #111827;">${treatmentKey.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} for ${conditions.map((c: string) => c.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())).join(', ')}</strong>
            </div>
            <div style="padding: 20px;">
              
              <p style="margin-bottom: 15px;"><strong>${teethText}</strong> ${teeth.length === 1 ? 'has' : 'have'} ${conditions.map((c: string) => c.replace(/-/g, ' ')).join(', ')} that requires ${treatmentKey.replace(/-/g, ' ')}.</p>
              
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
            <td style="text-align: left; white-space: nowrap;">
              <span style="display: inline-block; width: 18px; height: 18px; background-color: ${color}; border: 1px solid #333; vertical-align: middle; margin-right: 6px;"></span>
              <span style="font-size: 14px; vertical-align: middle;">${name}</span>
            </td>
          `).join('')}
        </tr>
      </table>
    </div>
  `;
};

export { useReportGeneration, generateReportHTML };
