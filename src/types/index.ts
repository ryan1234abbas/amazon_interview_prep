/**
 * Type definitions for Interview Coach application
 * Based on design document data models and interfaces
 */

// Question types
export type QuestionCategory = 
  | 'leadership'
  | 'teamwork'
  | 'conflict-resolution'
  | 'problem-solving'
  | 'failure-learning'
  | 'time-management';

export interface GeneratedQuestion {
  question: string;
  category: QuestionCategory;
}

export interface Question {
  id: string;
  text: string;
  category: QuestionCategory;
  generatedAt: Date;
}

// Session types
export type SessionState = 'idle' | 'starting' | 'active' | 'stopping';

export interface SessionResult {
  transcription: string;
  duration: number;
  audioData?: Blob;
}

export interface Session {
  id: string;
  questionId: string;
  startTime: Date;
  endTime: Date | null;
  duration: number;
  transcription: string;
  state: SessionState;
}

// Feedback types
export type ComponentPresence = 'present' | 'partial' | 'missing';

export interface STARAnalysis {
  situation: ComponentPresence;
  task: ComponentPresence;
  action: ComponentPresence;
  result: ComponentPresence;
}

export interface Feedback {
  starAnalysis: STARAnalysis;
  strengths: string[];
  improvements: string[];
  actionableTips: string[];
}

export interface FeedbackRecord {
  id: string;
  sessionId: string;
  starAnalysis: STARAnalysis;
  strengths: string[];
  improvements: string[];
  actionableTips: string[];
  createdAt: Date;
}

// Error types
export type ErrorType = 'microphone' | 'transcription' | 'generation' | 'analysis';

export interface ErrorState {
  type: ErrorType;
  message: string;
  retryable: boolean;
}

export interface TranscriptionError {
  code: string;
  message: string;
  recoverable: boolean;
}

// Transcribe types
export interface TranscribeStreamConfig {
  languageCode: 'en-US';
  mediaSampleRateHertz: 16000;
  mediaEncoding: 'pcm';
}

export interface TranscriptEvent {
  transcript: {
    results: Array<{
      alternatives: Array<{
        transcript: string;
      }>;
      isPartial: boolean;
    }>;
  };
}
