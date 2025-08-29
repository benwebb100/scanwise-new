// Heygen API Service for Avatar Integration
// This service handles communication with Heygen's avatar and text-to-speech APIs

export interface HeygenConfig {
  apiKey: string;
  baseUrl: string;
  avatarId: string; // Default avatar ID for generic dentist
}

export interface AvatarResponse {
  avatarUrl: string;
  audioUrl?: string;
  duration: number;
  success: boolean;
  error?: string;
}

export interface ChatMessage {
  text: string;
  sender: 'user' | 'avatar';
  timestamp: Date;
}

class HeygenService {
  private config: HeygenConfig;

  constructor(config: HeygenConfig) {
    this.config = config;
  }

  // Generate avatar response with text-to-speech
  async generateAvatarResponse(
    message: string,
    context: {
      patientName: string;
      treatmentPlan: string;
      findings: string;
    }
  ): Promise<AvatarResponse> {
    try {
      console.log('🎭 Heygen: Generating avatar response for:', message);
      console.log('🎭 Heygen: Context:', context);

      // Check if we have the API key
      if (!this.config.apiKey || this.config.apiKey === 'your-api-key-here') {
        console.warn('🎭 Heygen: No API key configured, using fallback response');
        return this.generateFallbackResponse(message, context);
      }

      // Create the prompt for the avatar
      const prompt = this.createAvatarPrompt(message, context);
      
      // Call Heygen API to generate avatar video
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
                input_text: prompt,
                voice_id: 'en_us_001', // Default English voice
              }
            }
          ],
          test: false, // Set to true for testing
          aspect_ratio: '16:9',
          quality: 'medium'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Heygen API error: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('🎭 Heygen: API response:', result);

      // Check if video generation was successful
      if (result.data && result.data.video_id) {
        // Poll for video completion
        const videoUrl = await this.waitForVideoCompletion(result.data.video_id);
        
        return {
          avatarUrl: videoUrl,
          audioUrl: videoUrl, // Video includes audio
          duration: result.data.duration || 10,
          success: true
        };
      } else {
        throw new Error('No video ID returned from Heygen API');
      }

    } catch (error) {
      console.error('🎭 Heygen: Error generating avatar response:', error);
      
      // Fallback to mock response if API fails
      return this.generateFallbackResponse(message, context);
    }
  }

  // Generate fallback response when API is not available
  private generateFallbackResponse(
    message: string,
    context: {
      patientName: string;
      treatmentPlan: string;
      findings: string;
    }
  ): AvatarResponse {
    console.log('🎭 Heygen: Using fallback response');
    
    // Simulate API call delay
    setTimeout(() => {}, 1000);

    return {
      avatarUrl: '/placeholder-avatar.svg',
      audioUrl: undefined,
      duration: 5,
      success: true
    };
  }

  // Create a contextual prompt for the avatar
  private createAvatarPrompt(
    message: string,
    context: {
      patientName: string;
      treatmentPlan: string;
      findings: string;
    }
  ): string {
    return `You are Dr. Smith, a professional dentist. A patient named ${context.patientName} is asking: "${message}". 

Based on their treatment plan and findings, provide a helpful, professional response. Keep your response concise (under 50 words) and focus on being reassuring and informative.

Treatment Plan: ${context.treatmentPlan.substring(0, 200)}...
Findings: ${context.findings.substring(0, 200)}...

Respond naturally as if you're speaking to the patient in person.`;
  }

  // Wait for video generation to complete
  private async waitForVideoCompletion(videoId: string): Promise<string> {
    const maxAttempts = 30; // 5 minutes max wait
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
        
        if (status.data.status === 'completed') {
          return status.data.video_url;
        } else if (status.data.status === 'failed') {
          throw new Error(`Video generation failed: ${status.data.error_message}`);
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
    
    throw new Error('Video generation timed out');
  }

  // Get available avatars (for future use when you have multiple avatars)
  async getAvailableAvatars(): Promise<any[]> {
    try {
      // Placeholder - replace with actual Heygen API call
      return [
        {
          id: 'default-dentist',
          name: 'Dr. Smith',
          description: 'Professional dentist avatar',
          previewUrl: '/placeholder-avatar.jpg'
        }
      ];
    } catch (error) {
      console.error('🎭 Heygen: Error fetching avatars:', error);
      return [];
    }
  }

  // Create custom avatar (for future dentist cloning feature)
  async createCustomAvatar(
    videoSamples: File[],
    name: string,
    description: string
  ): Promise<{ success: boolean; avatarId?: string; error?: string }> {
    try {
      // Placeholder - replace with actual Heygen avatar creation API
      console.log('🎭 Heygen: Creating custom avatar:', { name, description, samples: videoSamples.length });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        success: true,
        avatarId: `custom-${Date.now()}`
      };
    } catch (error) {
      console.error('🎭 Heygen: Error creating custom avatar:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Test API connection
  async testConnection(): Promise<boolean> {
    try {
      // Placeholder - replace with actual Heygen API health check
      console.log('🎭 Heygen: Testing API connection...');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return true;
    } catch (error) {
      console.error('🎭 Heygen: Connection test failed:', error);
      return false;
    }
  }
}

// Create default instance with placeholder config
export const heygenService = new HeygenService({
  apiKey: process.env.VITE_HEYGEN_API_KEY || 'your-api-key-here',
  baseUrl: process.env.VITE_HEYGEN_BASE_URL || 'https://api.heygen.com',
  avatarId: process.env.VITE_HEYGEN_DEFAULT_AVATAR_ID || 'default-dentist'
});

export default heygenService;
