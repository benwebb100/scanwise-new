// Heygen API Service for Avatar Integration
// This service handles communication with Heygen's avatar API to generate custom consultation URLs

// Configuration interface
export interface HeygenConfig {
  apiKey: string;
  baseUrl: string;
  avatarId: string;
  voiceId?: string;
}

// Request interface for consultation
export interface ConsultationRequest {
  reportId: string;
  patientName: string;
  treatmentPlan: string;
  findings: string;
}

// Response interface
export interface ConsultationResponse {
  consultationUrl: string;
  success: boolean;
  error?: string;
  sessionId?: string;
}

class HeygenService {
  private config: HeygenConfig;

  constructor(config: HeygenConfig) {
    this.config = config;
    console.log('🎭 Heygen Service initialized with config:', {
      apiKey: config.apiKey ? '✅ Set' : '❌ Not set',
      baseUrl: config.baseUrl,
      avatarId: config.avatarId,
      voiceId: config.voiceId || 'default'
    });
  }

  // Generate a custom consultation URL based on treatment plan
  async generateConsultationUrl(request: ConsultationRequest): Promise<ConsultationResponse> {
    try {
      console.log('🎭 Heygen: Generating consultation URL for:', request.reportId);
      
      // Check if we have the API key
      if (!this.config.apiKey || this.config.apiKey === 'your-api-key-here') {
        throw new Error('Heygen API key not configured');
      }

      // Create context prompt for the avatar based on treatment plan
      const contextPrompt = this.createContextPrompt(request);
      
      // Step 1: Create streaming session
      const sessionResponse = await fetch(`${this.config.baseUrl}/v1/streaming.new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.config.apiKey,
        },
        body: JSON.stringify({
          quality: 'high',
          avatar_name: this.config.avatarId,
          voice: {
            voice_id: this.config.voiceId || 'en_us_001',
            rate: 1.0,
          },
          version: 'v2',
          video_encoding: 'H264',
          opening_text: contextPrompt,
        })
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json();
        throw new Error(`Session creation failed: ${errorData.message || sessionResponse.statusText}`);
      }

      const sessionData = await sessionResponse.json();
      const sessionInfo = sessionData.data;
      console.log('🎭 Heygen: Streaming session created:', sessionInfo);

      // Step 2: Start the streaming session
      const startResponse = await fetch(`${this.config.baseUrl}/v1/streaming.start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.config.apiKey,
        },
        body: JSON.stringify({
          session_id: sessionInfo.session_id,
        })
      });

      if (!startResponse.ok) {
        const errorData = await startResponse.json();
        throw new Error(`Session start failed: ${errorData.message || startResponse.statusText}`);
      }

      console.log('🎭 Heygen: Streaming session started');

      // Generate the interactive streaming URL
      // This will be a real-time WebRTC connection using LiveKit
      const streamingUrl = `https://app.heygen.com/streaming/${sessionInfo.session_id}`;
      
      return {
        consultationUrl: streamingUrl,
        success: true,
        sessionId: sessionInfo.session_id
      };

    } catch (error) {
      console.error('🎭 Heygen: Error generating consultation:', error);
      return {
        consultationUrl: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Create context prompt for the avatar based on treatment plan
  private createContextPrompt(request: ConsultationRequest): string {
    return `You are Dr. Smith, an AI dental specialist. You have a patient named ${request.patientName} with the following dental findings and treatment plan:

Dental Findings:
${request.findings}

Treatment Plan:
${request.treatmentPlan}

Please introduce yourself and explain that you're here to answer questions about their specific treatment plan. Be professional, caring, and ready to help them understand their dental care needs.`;
  }

  // Get streaming session status
  async getStreamingSessionStatus(sessionId: string): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/streaming.status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.config.apiKey,
        },
        body: JSON.stringify({
          session_id: sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('🎭 Heygen: Error getting streaming session status:', error);
      throw error;
    }
  }

  // Stop streaming session
  async stopStreamingSession(sessionId: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/streaming.stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.config.apiKey,
        },
        body: JSON.stringify({
          session_id: sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`Stop session failed: ${response.statusText}`);
      }

      console.log('🎭 Heygen: Streaming session stopped');
    } catch (error) {
      console.error('🎭 Heygen: Error stopping streaming session:', error);
      throw error;
    }
  }
}

// Create and export the service instance
export const heygenService = new HeygenService({
  apiKey: import.meta.env.VITE_HEYGEN_API_KEY || 'your-api-key-here',
  baseUrl: import.meta.env.VITE_HEYGEN_BASE_URL || 'https://api.heygen.com',
  avatarId: import.meta.env.VITE_HEYGEN_DEFAULT_AVATAR_ID || 'Dexter_Doctor_Sitting2_public',
  voiceId: 'en_us_001'
});

// Debug: Log environment variables
console.log('🔍 Heygen Environment Variables:');
console.log('🔑 API Key:', import.meta.env.VITE_HEYGEN_API_KEY ? '✅ Set' : '❌ Not set');
console.log('🌐 Base URL:', import.meta.env.VITE_HEYGEN_BASE_URL);
console.log('👤 Avatar ID:', import.meta.env.VITE_HEYGEN_DEFAULT_AVATAR_ID);
