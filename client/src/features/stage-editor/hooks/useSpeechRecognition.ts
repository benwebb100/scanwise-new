// hooks/useSpeechRecognition.ts
import { useState } from 'react';


export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  let recognition: any = null;
  
  const startListening = (onResult: (text: string) => void, onError: () => void) => {
    if (!('webkitSpeechRecognition' in window)) {
      onError();
      return;
    }
    
    if (isListening) {
      recognition && recognition.stop();
      setIsListening(false);
      return;
    }
    
    // @ts-ignore
    recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        }
      }
      
      if (finalTranscript) {
        onResult(finalTranscript);
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        setIsListening(false);
      }
    };
    
    recognition.onend = () => {
      if (isListening) {
        try {
          recognition.start();
        } catch (e) {
          console.log('Restarting speech recognition...');
        }
      }
    };
    
    recognition.start();
    setIsListening(true);
  };
  
  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };
  
  return {
    isListening,
    startListening,
    stopListening
  };
};