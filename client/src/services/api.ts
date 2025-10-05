import { supabase } from './supabase'; // You'll need to setup Supabase client

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const api = {
  // Get auth token
  async getAuthToken() {
    console.log('🔐 API: Getting auth token...');
    const { data: { session } } = await supabase.auth.getSession();
    console.log('🔐 API: Session exists:', !!session);
    if (!session) {
      console.error('🔐 API: No session found - user not authenticated');
      throw new Error('No session');
    }
    console.log('🔐 API: Auth token retrieved successfully');
    return session.access_token;
  },

  // Upload image
  async uploadImage(file: File) {
    const token = await this.getAuthToken();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  },

  // Analyze X-ray
  // In api.ts - the analyzeXray method
  async analyzeXray(data: {
    patientName: string;
    imageUrl: string;
    findings: Array<{ tooth: string; condition: string; treatment: string }>;
    generateVideo?: boolean;  // Make sure this is included in the type
  }) {
    
    const token = await this.getAuthToken();
    
    const requestBody = {
      patient_name: data.patientName,
      image_url: data.imageUrl,
      findings: data.findings,
      generate_video: data.generateVideo !== false,  // Default to true if not specified
    };
    // Use query parameter for generate_video if needed (keeping both approaches for compatibility)
    const url = `${API_BASE_URL}/analyze-xray`;
    
    console.log('📊 API: Request body with generate_video:', requestBody);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📊 API: Response status:', response.status);
    console.log('📊 API: Response ok:', response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('📊 API: Error response:', errorText);
      throw new Error(`Analysis failed: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('📊 API: Response received, keys:', Object.keys(result));
    console.log('📊 API: Has report_html:', !!result.report_html);
    console.log('📊 API: Report HTML length:', result.report_html?.length || 0);
    
    return result;
  },

  // Get diagnoses for dashboard
  async getDiagnoses(limit = 10, offset = 0) {
    const token = await this.getAuthToken();
    
    const response = await fetch(
      `${API_BASE_URL}/diagnoses?limit=${limit}&offset=${offset}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) throw new Error('Failed to fetch diagnoses');
    return response.json();
  },

  // Send report to patient via email
  async sendReportToPatient(reportId: string, patientEmail: string) {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/send-report-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        report_id: reportId,
        patient_email: patientEmail,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send report: ${response.status} - ${errorText}`);
    }

    return response.json();
  },

  // Send preview report to patient via email
  async sendPreviewReportToPatient(data: {
    patientEmail: string;
    patientName: string;
    reportContent: string;
    findings?: Array<{ tooth: string; condition: string; treatment: string }>;
    annotatedImageUrl?: string;
  }) {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/send-preview-report-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patient_email: data.patientEmail,
        patient_name: data.patientName,
        report_content: data.reportContent,
        findings: data.findings || [],
        annotated_image_url: data.annotatedImageUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send preview report: ${response.status} - ${errorText}`);
    }

    return response.json();
  },

  // Get report by ID
  async getReport(reportId: string) {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/diagnoses/${reportId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch report');
    }

    const data = await response.json();
    
    console.log('API getReport: Raw response data:', data);
    console.log('API getReport: videoUrl in response:', data.videoUrl);
    console.log('API getReport: reportHtml exists:', !!data.reportHtml);
    
    // Return data directly since field names are now consistent
    return data;
  },

  // Apply AI suggestions to report
  async applyAiSuggestions(previousReportHtml: string, changeRequestText: string) {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/apply-suggested-changes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        previous_report_html: previousReportHtml,
        change_request_text: changeRequestText,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI suggestion failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  },

  // Analyze without X-ray
  async analyzeWithoutXray(data: {
    patientName: string;
    observations: string;
    findings: Array<{ tooth: string; condition: string; treatment: string }>;
    generateVideo?: boolean;
  }) {
    console.log('📊 API: Starting analyzeWithoutXray request...');
    console.log('📊 API: Request data:', {
      patientName: data.patientName,
      observationsLength: data.observations?.length || 0,
      findingsCount: data.findings?.length || 0
    });
    
    const token = await this.getAuthToken();
    
    const requestBody = {
      patient_name: data.patientName,
      observations: data.observations,
      findings: data.findings,
    };
    
    console.log('📊 API: Making request to:', `${API_BASE_URL}/analyze-without-xray`);
    console.log('📊 API: Request body:', requestBody);
    
    const response = await fetch(`${API_BASE_URL}/analyze-without-xray`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📊 API: Response status:', response.status);
    console.log('📊 API: Response ok:', response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('📊 API: Error response:', errorText);
      throw new Error(`Analysis failed: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('📊 API: Response received, keys:', Object.keys(result));
    console.log('📊 API: Has report_html:', !!result.report_html);
    console.log('📊 API: Report HTML length:', result.report_html?.length || 0);
    
    return result;
  },

  // Clinic pricing endpoints
  async saveClinicPricing(pricingData: Record<string, number>) {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/clinic-pricing`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pricingData),
    });

    if (!response.ok) throw new Error('Failed to save pricing');
    return response.json();
  },

  async getClinicPricing() {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/clinic-pricing`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to get pricing');
    return response.json();
  },

  // Treatment settings endpoints (pricing + durations)
  async saveTreatmentSettings(treatmentData: Record<string, { duration: number; price: number }>) {
    console.log('💾 API: Saving treatment settings...', {
      treatmentCount: Object.keys(treatmentData).length,
      sampleData: Object.entries(treatmentData).slice(0, 3) // First 3 treatments for debugging
    });
    
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/treatment-settings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(treatmentData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API: Treatment settings save failed:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText
      });
      throw new Error(`Failed to save treatment settings: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ API: Treatment settings saved successfully:', result);
    return result;
  },

  async getTreatmentSettings() {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/treatment-settings`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to get treatment settings');
    return response.json();
  },

  // Clinic branding endpoints
  async saveClinicBranding(brandingData: any) {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/clinic-branding`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(brandingData),
    });

    if (!response.ok) throw new Error('Failed to save branding');
    return response.json();
  },

  async getClinicBranding() {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/clinic-branding`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to get branding');
    return response.json();
  },

  // Dental data endpoints
  // Dental data endpoints
  async getDentalConditions() {
    const response = await fetch(`${API_BASE_URL}/dental-data/conditions`);
    if (!response.ok) throw new Error('Failed to get conditions');
    return response.json();
  },

  async getDentalTreatments() {
    const response = await fetch(`${API_BASE_URL}/dental-data/treatments`);
    if (!response.ok) throw new Error('Failed to get treatments');
    return response.json();
  },

  async getTreatmentSuggestions(condition: string) {
    const response = await fetch(`${API_BASE_URL}/dental-data/treatment-suggestions/${condition}`);
    if (!response.ok) throw new Error('Failed to get treatment suggestions');
    return response.json();
  },

  // OCR processing for price list images
  async processImageOCR(base64Image: string) {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/process-image-ocr`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_data: base64Image
      }),
    });

    if (!response.ok) throw new Error('OCR processing failed');
    return response.json();
  },

  // Add this new method to the api object
  async analyzeXrayImmediate(imageUrl: string) {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/analyze-xray-immediate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl
      }),
    });

    if (!response.ok) throw new Error('Failed to analyze X-ray immediately');
    return response.json();
  },

  // Insurance Verification Methods
  async verifyInsurance(data: {
    patient_id: string;
    insurance_provider: string;
    policy_number: string;
    group_number?: string;
    subscriber_name: string;
    subscriber_relationship: string;
    date_of_birth: string;
    treatment_codes?: string[];
  }) {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/insurance/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('Insurance verification failed');
    return response.json();
  },

  async savePatientInsurance(insuranceData: {
    patient_id: string;
    patient_name: string;
    insurance_provider: string;
    policy_number: string;
    group_number?: string;
    subscriber_name: string;
    subscriber_relationship: string;
    effective_date: string;
    expiration_date: string;
    copay_amount?: number;
    deductible_remaining?: number;
    max_annual_benefit?: number;
  }) {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/insurance/patient`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(insuranceData),
    });

    if (!response.ok) throw new Error('Failed to save insurance data');
    return response.json();
  },

  async getPatientInsurance(patientId: string) {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/insurance/patient/${patientId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to get insurance data');
    return response.json();
  },

  async getInsuranceProviders() {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/insurance/providers`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to get insurance providers');
    return response.json();
  },

  async getVerificationStatus(verificationId: string) {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/insurance/verification/${verificationId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to get verification status');
    return response.json();
  },

  // Tooth Mapping Methods
  async mapTeeth(imageUrl: string, detections: any[], numberingSystem: string = 'FDI') {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/tooth-mapping`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        detections: detections,
        numbering_system: numberingSystem
      }),
    });

    if (!response.ok) throw new Error('Tooth mapping failed');
    return response.json();
  },

  // Billing endpoints
  async createCheckout(interval: 'monthly' | 'yearly' = 'monthly') {
    const token = await this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/billing/checkout?interval=${interval}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to create checkout session');
    return response.json() as Promise<{ url: string }>
  },

  // Create registration checkout (payment before account creation)
  async createRegistrationCheckout(data: { userData: any; interval: string }) {
    const response = await fetch(`${API_BASE_URL}/billing/registration-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create registration checkout');
    return response.json() as Promise<{ url: string }>;
  },

  // Verify payment session
  async verifyPayment(sessionId: string) {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${API_BASE_URL}/billing/verify?session_id=${sessionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to verify payment');
      return response.json() as Promise<{ success: boolean; session?: any }>;
    } catch (error) {
      console.error('Payment verification failed:', error);
      return { success: false };
    }
  },

  // Verify payment session for new registrations (no auth required)
  async verifyPaymentPublic(sessionId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/billing/verify-public`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (!response.ok) throw new Error('Failed to verify payment');
      return response.json() as Promise<{ success: boolean; is_new_registration?: boolean; message?: string }>;
    } catch (error) {
      console.error('Public payment verification failed:', error);
      return { success: false };
    }
  },

  async createBillingPortal(customerId: string) {
    const token = await this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/billing/portal`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ customer_id: customerId }),
    });
    if (!response.ok) throw new Error('Failed to create billing portal session');
    return response.json() as Promise<{ url: string }>
  },

  // Tooth Number Overlay
  async addToothNumberOverlay(
    imageUrl: string, 
    numberingSystem: string = 'FDI', 
    showNumbers: boolean = true,
    textSizeMultiplier: number = 1.0,
    conditionData?: any,
    cachedSegmentationData?: any  // NEW: Optional cached data
  ) {
    try {
      const token = await this.getAuthToken();
      
      console.log('🔢 API: Adding tooth number overlay:', { imageUrl, numberingSystem, showNumbers });
      
      const response = await fetch(`${API_BASE_URL}/image/overlay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl,
          numbering_system: numberingSystem,
          show_numbers: showNumbers,
          text_size_multiplier: textSizeMultiplier,
          condition_data: conditionData,
          cached_segmentation_data: cachedSegmentationData  // NEW: Send cached data
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔢 API: Overlay request failed:', response.status, errorText);
        throw new Error(`Failed to add tooth number overlay: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('🔢 API: Overlay result:', result);
      return result;
    } catch (error) {
      console.error('🔢 API: Overlay error:', error);
      throw error;
    }
  },

  // AWS S3 Integration Methods
  async getAwsImages() {
    console.log('☁️ API: Getting AWS images...');
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/aws/images`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('☁️ API: Error response:', errorText);
      throw new Error(`Failed to fetch AWS images: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('☁️ API: AWS images fetched successfully, count:', result.total);
    return result;
  },

  // Manual processing removed - images are now processed automatically via S3 webhooks
  // async processAwsDicom() - REMOVED
};