/**
 * PracticeSessionManager
 * 
 * Manages practice session lifecycle, coordinates audio capture via MediaRecorder API,
 * tracks session timing with 1-second granularity, and orchestrates transcription service.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 8.1, 8.2, 8.3, 8.4
 */

import { SessionState, SessionResult } from '../types';
import { TranscriptionService } from './TranscriptionService';

/**
 * PracticeSessionManager class handles the complete lifecycle of a practice session.
 * It coordinates microphone access, audio recording, transcription, and timing.
 */
export class PracticeSessionManager {
  private state: SessionState = 'idle';
  private transcriptionService: TranscriptionService;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private startTime: number = 0;
  private elapsedTime: number = 0;
  private timerInterval: NodeJS.Timeout | null = null;
  private audioChunks: Blob[] = [];
  private currentTranscription: string = '';

  constructor(transcriptionService: TranscriptionService) {
    this.transcriptionService = transcriptionService;
    
    // Register transcription callback
    this.transcriptionService.onTranscript((text: string) => {
      this.currentTranscription = text;
    });
  }

  /**
   * Starts a practice session.
   * Requests microphone permission, initializes MediaRecorder, starts transcription,
   * and begins tracking elapsed time.
   * 
   * @throws Error if microphone access is denied or unavailable
   * @throws Error if session is already active
   */
  async startSession(): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error('Cannot start session: session is already active or transitioning');
    }

    this.state = 'starting';

    try {
      // Request microphone access (Requirements 8.1, 8.3, 8.4)
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        } 
      });

      // Initialize MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: this.getSupportedMimeType(),
      });

      this.audioChunks = [];

      // Collect audio chunks for potential future use
      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Start MediaRecorder (Requirement 2.1)
      this.mediaRecorder.start(100); // Collect data every 100ms

      // Connect and start transcription service (Requirement 3.1)
      await this.transcriptionService.connect();
      this.transcriptionService.startStreaming(this.mediaStream);

      // Start timer (Requirement 2.2)
      this.startTime = Date.now();
      this.elapsedTime = 0;
      this.currentTranscription = '';
      
      this.timerInterval = setInterval(() => {
        this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
      }, 1000);

      this.state = 'active';

    } catch (error) {
      // Clean up on error
      this.state = 'idle';
      await this.cleanup();

      // Handle microphone access errors (Requirement 8.2)
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          throw new Error('Microphone access denied. Please grant permission to record your response.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone and try again.');
        } else if (error.name === 'NotReadableError') {
          throw new Error('Microphone is already in use by another application.');
        }
      }

      throw error;
    }
  }

  /**
   * Stops the current practice session.
   * Stops MediaRecorder, ends transcription, stops timer, and returns session results.
   * 
   * @returns SessionResult containing transcription, duration, and optional audio data
   * @throws Error if no session is active
   */
  async stopSession(): Promise<SessionResult> {
    if (this.state !== 'active') {
      throw new Error('Cannot stop session: no session is active');
    }

    this.state = 'stopping';

    try {
      // Stop timer
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }

      // Calculate final duration
      const duration = Math.floor((Date.now() - this.startTime) / 1000);

      // Stop MediaRecorder (Requirement 2.3)
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }

      // Stop transcription service (Requirement 3.4)
      const transcription = await this.transcriptionService.stopStreaming();

      // Create audio blob from chunks
      let audioData: Blob | undefined;
      if (this.audioChunks.length > 0) {
        audioData = new Blob(this.audioChunks, { 
          type: this.mediaRecorder?.mimeType || 'audio/webm' 
        });
      }

      // Clean up resources
      await this.cleanup();

      this.state = 'idle';

      // Return session result
      return {
        transcription: transcription || this.currentTranscription,
        duration,
        audioData,
      };

    } catch (error) {
      // Ensure cleanup even on error
      await this.cleanup();
      this.state = 'idle';
      throw error;
    }
  }

  /**
   * Gets the current session state.
   * 
   * @returns Current SessionState
   */
  getSessionState(): SessionState {
    return this.state;
  }

  /**
   * Gets the elapsed time in seconds since session start.
   * 
   * @returns Elapsed time in seconds
   */
  getElapsedTime(): number {
    return this.elapsedTime;
  }

  /**
   * Cleans up resources (MediaRecorder, MediaStream, timer).
   * Called internally during stop or error handling.
   */
  private async cleanup(): Promise<void> {
    // Stop timer
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    // Stop MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;

    // Stop all media stream tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Clear audio chunks
    this.audioChunks = [];
  }

  /**
   * Gets a supported MIME type for MediaRecorder.
   * Tries common formats in order of preference.
   * 
   * @returns Supported MIME type string
   */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    // Fallback to default
    return '';
  }
}
