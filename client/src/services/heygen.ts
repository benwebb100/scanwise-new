// Heygen API Service for Avatar Integration
// This service handles communication with Heygen's avatar API to generate custom consultation URLs

export interface HeygenConfig {
  apiKey: string;
  baseUrl: string;
  avatarId: string;
}

export interface ConsultationRequest {
  reportId: string;
  patientName: string;
  treatmentPlan: string;
  findings: string;
  question?: string;
}

export interface ConsultationResponse {
  consultationUrl: string;
  success: boolean;
  error?: string;
  videoId?: string;
}

class HeygenService {
  private config: HeygenConfig;

  constructor(config: HeygenConfig) {
    this.config = config;
    console.log('🎭 Heygen Service initialized with config:', {
      apiKey: config.apiKey ? '✅ Set' : '❌ Not set',
      baseUrl: config.baseUrl,
      avatarId: config.avatarId
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

      // Create the context prompt for the avatar
      const contextPrompt = this.createContextPrompt(request);
      
      // Call Heygen API to generate consultation video
      const response = await fetch(`${this.config.baseUrl}/v1/video/generate`, {
        method: 'POST',
        headers: {
          'X-Api-Key': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_inputs: [
            {
              character: {
                type: 'avatar',
                avatar_id: this.config.avatarId,
                input_text: contextPrompt,
                voice_id: 'en_us_001', // Default English voice
              }
            }
          ],
          test: false,
          aspect_ratio: '16:9',
          quality: 'medium',
          metadata: {
            report_id: request.reportId,
            patient_name: request.patientName,
            consultation_type: 'dental_treatment_plan'
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Heygen API error: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('🎭 Heygen: Video generation started:', result);

      if (result.data && result.data.video_id) {
        // Wait for video completion and get the consultation URL
        const consultationUrl = await this.waitForVideoCompletion(result.data.video_id);
        
        return {
          consultationUrl,
          success: true,
          videoId: result.data.video_id
        };
      } else {
        throw new Error('No video ID returned from Heygen API');
      }

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

  // Wait for video completion and get the consultation URL
  private async waitForVideoCompletion(videoId: string): Promise<string> {
    const maxAttempts = 30; // 5 minutes with 10-second intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${this.config.baseUrl}/v1/video/status?video_id=${videoId}`, {
          headers: {
            'X-Api-Key': this.config.apiKey,
          }
        });

        if (!response.ok) {
          throw new Error(`Status check failed: ${response.statusText}`);
        }

        const status = await response.json();
        console.log('🎭 Heygen: Video status:', status);

        if (status.data && status.data.video_url) {
          // Video is ready, return the consultation URL
          return status.data.video_url;
        } else if (status.data && status.data.status === 'failed') {
          throw new Error('Video generation failed');
        }

        // Wait 10 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempts++;

      } catch (error) {
        console.error('🎭 Heygen: Error checking video status:', error);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    throw new Error('Video generation timed out after 5 minutes');
  }

  // Get consultation status (for checking if ready)
  async getConsultationStatus(videoId: string): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/video/status?video_id=${videoId}`, {
        headers: {
          'X-Api-Key': this.config.apiKey,
        }
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('🎭 Heygen: Error getting status:', error);
      throw error;
    }
  }
}

// Create and export the service instance
export const heygenService = new HeygenService({
  apiKey: import.meta.env.VITE_HEYGEN_API_KEY || 'your-api-key-here',
  baseUrl: import.meta.env.VITE_HEYGEN_BASE_URL || 'https://api.heygen.com',
  avatarId: import.meta.env.VITE_HEYGEN_DEFAULT_AVATAR_ID || 'Dexter_Doctor_Sitting2_public'
});

// Debug: Log environment variables
console.log('🔍 Heygen Environment Variables:');
console.log('🔑 API Key:', import.meta.env.VITE_HEYGEN_API_KEY ? '✅ Set' : '❌ Not set');
console.log('🌐 Base URL:', import.meta.env.VITE_HEYGEN_BASE_URL);
console.log('👤 Avatar ID:', import.meta.env.VITE_HEYGEN_DEFAULT_AVATAR_ID);
