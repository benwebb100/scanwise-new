import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, MessageCircle, Send, Brain, User, Loader2, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from '@/services/api';
import { heygenService } from '@/services/heygen';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'avatar';
  timestamp: Date;
  videoUrl?: string;
  duration?: number;
}

interface ConsultationData {
  reportId: string;
  patientName: string;
  treatmentPlan: string;
  findings: string;
  avatarUrl?: string;
}

const Consultation = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [consultationData, setConsultationData] = useState<ConsultationData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (reportId) {
      fetchConsultationData();
    }
  }, [reportId]);

  const fetchConsultationData = async () => {
    try {
      setIsLoading(true);
      const data = await api.getReport(reportId!);
      
      setConsultationData({
        reportId: reportId!,
        patientName: data.patientName || 'Patient',
        treatmentPlan: data.report_html || 'No treatment plan available',
        findings: data.findings || 'No findings available',
        avatarUrl: data.avatarUrl
      });

      // Add initial greeting message
      const initialMessage: Message = {
        id: '1',
        text: `Hello! I'm Dr. ${data.patientName ? 'Smith' : 'Smith'}, and I'll be explaining your treatment plan today. I have all the details about your dental analysis and can answer any questions you have. What would you like to know?`,
        sender: 'avatar',
        timestamp: new Date()
      };
      setMessages([initialMessage]);
    } catch (error) {
      console.error('Error fetching consultation data:', error);
      toast({
        title: "Error",
        description: "Failed to load consultation data. Please try again.",
        variant: "destructive"
      });
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !consultationData) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Use Heygen service to generate avatar response
      const avatarResponse = await heygenService.generateAvatarResponse(inputMessage, {
        patientName: consultationData.patientName,
        treatmentPlan: consultationData.treatmentPlan,
        findings: consultationData.findings
      });
      
      if (avatarResponse.success && avatarResponse.avatarUrl) {
        // Create avatar message with video
        const avatarMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `I've prepared a personalized response for you. Watch the video below to hear my answer.`,
          sender: 'avatar',
          timestamp: new Date()
        };

        // Add the message first
        setMessages(prev => [...prev, avatarMessage]);
        
        // Then add the video response
        const videoMessage: Message = {
          id: (Date.now() + 2).toString(),
          text: `[VIDEO RESPONSE]`,
          sender: 'avatar',
          timestamp: new Date(),
          videoUrl: avatarResponse.avatarUrl,
          duration: avatarResponse.duration
        };

        setTimeout(() => {
          setMessages(prev => [...prev, videoMessage]);
          setIsTyping(false);
        }, 500);

      } else {
        // Fallback to text response
        const fallbackResponse = generateFallbackTextResponse(inputMessage, consultationData);
        const avatarMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: fallbackResponse,
          sender: 'avatar',
          timestamp: new Date()
        };

        setTimeout(() => {
          setMessages(prev => [...prev, avatarMessage]);
          setIsTyping(false);
        }, 1000);
      }

    } catch (error) {
      console.error('Error generating response:', error);
      setIsTyping(false);
      
      // Use fallback response
      const fallbackResponse = generateFallbackTextResponse(inputMessage, consultationData);
      const avatarMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: fallbackResponse,
        sender: 'avatar',
        timestamp: new Date()
      };
      
      setTimeout(() => {
        setMessages(prev => [...prev, avatarMessage]);
      }, 1000);
    }
  };

  // Fallback text response generator (used when Heygen API is not available)
  const generateFallbackTextResponse = (question: string, data: ConsultationData): string => {
    const questionLower = question.toLowerCase();
    
    if (questionLower.includes('treatment') || questionLower.includes('plan')) {
      return `Based on your analysis, your treatment plan includes addressing the dental conditions we identified. I can see from your report that we need to focus on specific areas. Would you like me to explain any particular part of the treatment in more detail?`;
    }
    
    if (questionLower.includes('pain') || questionLower.includes('hurt')) {
      return `I understand you're concerned about discomfort. The treatment plan I've prepared takes into account minimizing any pain during procedures. We'll use appropriate anesthesia and techniques to ensure your comfort. Is there a specific procedure you're worried about?`;
    }
    
    if (questionLower.includes('cost') || questionLower.includes('price') || questionLower.includes('expensive')) {
      return `I can see your treatment plan, but I don't have access to specific pricing information. I'd recommend speaking with your clinic's billing department for detailed cost breakdowns. They can also discuss payment options and insurance coverage.`;
    }
    
    if (questionLower.includes('time') || questionLower.includes('duration') || questionLower.includes('long')) {
      return `The duration of your treatment will depend on the specific procedures needed. Some treatments can be completed in a single visit, while others may require multiple appointments. Your dentist will be able to give you a more precise timeline during your consultation.`;
    }
    
    return `That's a great question about your dental health. Based on your treatment plan, I can help explain various aspects of your care. Could you be more specific about what you'd like to know? I'm here to help you understand your treatment options.`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading consultation...</p>
        </div>
      </div>
    );
  }

  if (!consultationData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Consultation data not found</p>
          <Button onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

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

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate(`/report/${reportId}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Report
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Consultation Info */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Virtual Consultation with Dr. Smith
            </h1>
            <p className="text-gray-600">
              Ask questions about your treatment plan • Patient: {consultationData.patientName}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Avatar Section */}
            <div className="lg:col-span-1">
              <Card className="bg-white border-blue-200">
                <CardHeader>
                  <CardTitle className="text-blue-900 flex items-center justify-between">
                    <span>Your AI Dentist</span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsMuted(!isMuted)}
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsAvatarSpeaking(!isAvatarSpeaking)}
                      >
                        {isAvatarSpeaking ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-4">
                    <Avatar className="w-32 h-32 mx-auto mb-4">
                      <AvatarImage src={consultationData.avatarUrl || "/placeholder-avatar.svg"} />
                      <AvatarFallback className="text-4xl bg-gradient-to-br from-blue-600 to-teal-600 text-white">
                        DS
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-lg font-semibold text-gray-900">Dr. Smith</h3>
                    <p className="text-sm text-gray-600">AI Dental Specialist</p>
                  </div>
                  
                  <div className="text-left space-y-3">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <h4 className="font-semibold text-blue-900 text-sm">Specialties</h4>
                      <p className="text-xs text-blue-700">Treatment Planning, Patient Education, Dental Analysis</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <h4 className="font-semibold text-green-900 text-sm">Available</h4>
                      <p className="text-xs text-green-700">24/7 for your questions</p>
                    </div>
                    <div className={`p-3 rounded-lg ${heygenService.config.apiKey && heygenService.config.apiKey !== 'your-api-key-here' ? 'bg-green-50' : 'bg-yellow-50'}`}>
                      <h4 className={`font-semibold text-sm ${heygenService.config.apiKey && heygenService.config.apiKey !== 'your-api-key-here' ? 'text-green-900' : 'text-yellow-900'}`}>
                        {heygenService.config.apiKey && heygenService.config.apiKey !== 'your-api-key-here' ? 'AI Avatar Active' : 'AI Avatar (Demo Mode)'}
                      </h4>
                      <p className={`text-xs ${heygenService.config.apiKey && heygenService.config.apiKey !== 'your-api-key-here' ? 'text-green-700' : 'text-yellow-700'}`}>
                        {heygenService.config.apiKey && heygenService.config.apiKey !== 'your-api-key-here' ? 'Full video responses available' : 'Text responses only'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chat Section */}
            <div className="lg:col-span-2">
              <Card className="bg-white border-blue-200 h-[600px] flex flex-col">
                <CardHeader>
                  <CardTitle className="text-blue-900 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Chat with Dr. Smith
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-2">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.sender === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="text-sm">{message.text}</p>
                          
                          {/* Show video if available */}
                          {message.videoUrl && message.videoUrl !== '/placeholder-avatar.svg' && (
                            <div className="mt-3">
                              <video
                                controls
                                className="w-full rounded-lg"
                                style={{ maxHeight: '200px' }}
                              >
                                <source src={message.videoUrl} type="video/mp4" />
                                Your browser does not support the video tag.
                              </video>
                              <p className="text-xs text-gray-500 mt-1">
                                Duration: {message.duration}s
                              </p>
                            </div>
                          )}
                          
                          <p className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-lg p-3">
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <div className="flex gap-2">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask Dr. Smith about your treatment plan..."
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} disabled={!inputMessage.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Quick Questions */}
          <div className="mt-8">
            <Card className="bg-white border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900">Quick Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    "What's my treatment plan?",
                    "Will it hurt?",
                    "How long will it take?",
                    "What are the costs?",
                    "Are there alternatives?",
                    "What should I expect?",
                    "How do I prepare?",
                    "What's the recovery like?"
                  ].map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => setInputMessage(question)}
                      className="text-left justify-start h-auto p-3"
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Consultation;
