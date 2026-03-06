/**
 * TranscriptionService
 * 
 * Handles real-time audio transcription using browser's Web Speech API.
 * Works completely offline and locally - no backend or AWS needed!
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { TranscriptionError } from '../types';

/**
 * TranscriptionService class handles real-time audio transcription
 * using the browser's built-in Web Speech API.
 */
export class TranscriptionService {
  private recognition: any = null;
  private transcriptCallback: ((text: string) => void) | null = null;
  private errorCallback: ((error: TranscriptionError) => void) | null = null;
  private transcriptionBuffer: string = '';
  private isStreaming: boolean = false;

  /**
   * Connects to speech recognition service.
   * Initializes the Web Speech API.
   * 
   * @throws Error if Web Speech API is not supported
   */
  async connect(): Promise<void> {
    try {
      // Check if Web Speech API is supported
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        throw new Error('Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.');
      }

      // Create recognition instance
      this.recognition = new SpeechRecognition();
      
      // Configure recognition
      this.recognition.continuous = true; // Keep listening
      this.recognition.interimResults = false; // Only final results
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;

      this.transcriptionBuffer = '';
      this.isStreaming = false;

      // Set up event handlers
      this.recognition.onresult = (event: any) => {
        // Process speech recognition results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          
          if (result.isFinal) {
            const transcript = result[0].transcript.trim();
            
            if (transcript.length > 0) {
              // Add to buffer
              if (this.transcriptionBuffer.length > 0) {
                this.transcriptionBuffer += ' ';
              }
              this.transcriptionBuffer += transcript;

              // Emit the updated transcription
              if (this.transcriptCallback) {
                this.transcriptCallback(this.transcriptionBuffer);
              }
            }
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        const transcriptionError: TranscriptionError = {
          code: event.error.toUpperCase(),
          message: this.getErrorMessage(event.error),
          recoverable: event.error !== 'not-allowed',
        };
        
        if (this.errorCallback) {
          this.errorCallback(transcriptionError);
        }
      };

      this.recognition.onend = () => {
        // Restart if still streaming (continuous mode)
        if (this.isStreaming) {
          try {
            this.recognition.start();
          } catch (error) {
            // Ignore if already started
          }
        }
      };

    } catch (error) {
      const transcriptionError: TranscriptionError = {
        code: 'CONNECTION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to initialize speech recognition',
        recoverable: false,
      };
      
      if (this.errorCallback) {
        this.errorCallback(transcriptionError);
      }
      
      throw error;
    }
  }

  /**
   * Starts streaming audio for transcription.
   * Note: audioStream parameter is kept for interface compatibility but not used
   * since Web Speech API handles audio capture internally.
   * 
   * @param audioStream - MediaStream (not used by Web Speech API)
   */
  startStreaming(_audioStream: MediaStream): void {
    if (this.isStreaming) {
      throw new Error('Already streaming');
    }

    if (!this.recognition) {
      throw new Error('Speech recognition not initialized. Call connect() first.');
    }

    try {
      this.isStreaming = true;
      this.transcriptionBuffer = '';
      
      // Start speech recognition
      this.recognition.start();
      
      console.log('Speech recognition started (using Web Speech API)');
    } catch (error) {
      this.isStreaming = false;
      const transcriptionError: TranscriptionError = {
        code: 'STREAMING_START_FAILED',
        message: error instanceof Error ? error.message : 'Failed to start speech recognition',
        recoverable: true,
      };
      
      if (this.errorCallback) {
        this.errorCallback(transcriptionError);
      }
      
      throw error;
    }
  }

  /**
   * Stops streaming audio and returns the final transcription.
   * 
   * @returns Promise resolving to the complete transcription text
   */
  async stopStreaming(): Promise<string> {
    if (!this.isStreaming) {
      return this.transcriptionBuffer;
    }

    this.isStreaming = false;

    try {
      // Stop speech recognition
      if (this.recognition) {
        this.recognition.stop();
      }

      // Return the final transcription
      return this.transcriptionBuffer;
    } catch (error) {
      const transcriptionError: TranscriptionError = {
        code: 'STREAMING_STOP_FAILED',
        message: error instanceof Error ? error.message : 'Failed to stop speech recognition',
        recoverable: false,
      };
      
      if (this.errorCallback) {
        this.errorCallback(transcriptionError);
      }
      
      // Still return the transcription buffer even if stop fails
      return this.transcriptionBuffer;
    }
  }

  /**
   * Registers a callback for transcription updates.
   * 
   * @param callback - Function to call with transcribed text
   */
  onTranscript(callback: (text: string) => void): void {
    this.transcriptCallback = callback;
  }

  /**
   * Registers a callback for transcription errors.
   * 
   * @param callback - Function to call when errors occur
   */
  onError(callback: (error: TranscriptionError) => void): void {
    this.errorCallback = callback;
  }

  /**
   * Gets a user-friendly error message for speech recognition errors
   */
  private getErrorMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      'no-speech': 'No speech detected. Please speak clearly into your microphone.',
      'aborted': 'Speech recognition was aborted.',
      'audio-capture': 'No microphone was found or microphone access was denied.',
      'network': 'Network error occurred during speech recognition.',
      'not-allowed': 'Microphone access was denied. Please grant permission and try again.',
      'service-not-allowed': 'Speech recognition service is not allowed.',
      'bad-grammar': 'Speech recognition grammar error.',
      'language-not-supported': 'The specified language is not supported.',
    };

    return errorMessages[errorCode] || `Speech recognition error: ${errorCode}`;
  }
}
