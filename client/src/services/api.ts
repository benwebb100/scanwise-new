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
  }) {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/analyze-xray`, {
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
};