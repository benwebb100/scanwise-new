import { supabase } from './supabase'; // You'll need to setup Supabase client

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const api = {
  // Get auth token
  async getAuthToken() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session');
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
  async analyzeXray(data: {
    patientName: string;
    imageUrl: string;
    findings: Array<{ tooth: string; condition: string; treatment: string }>;
  } & { generateVideo?: boolean }) {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/analyze-xray?generate_video=true`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patient_name: data.patientName,
        image_url: data.imageUrl,
        findings: data.findings,
      }),
    });

    if (!response.ok) throw new Error('Analysis failed');
    return response.json();
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

  // Get report by ID
  async getReport(reportId: string) {
    const token = await this.getAuthToken(); // Add await here
    
    const response = await fetch(`${API_BASE_URL}/diagnoses/${reportId}`, {
      headers: {
        'Authorization': `Bearer ${token}`, // Use the awaited token
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch report');
    }

    const data = await response.json();
    
    // Transform data for frontend
    return {
      ...data,
      reportHtml: data.report_html || ''
    };
  },

  // Analyze without X-ray
  async analyzeWithoutXray(data: {
    patientName: string;
    observations: string;
    findings: Array<{ tooth: string; condition: string; treatment: string }>;
    generateVideo?: boolean;
  }) {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/analyze-without-xray`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patient_name: data.patientName,
        observations: data.observations,
        findings: data.findings,
      }),
    });

    if (!response.ok) throw new Error('Analysis failed');
    return response.json();
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
};