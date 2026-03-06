/**
 * Error handling utilities for Interview Coach
 * Validates: Requirements 8.2, 9.1, 9.2, 9.4, 10.1, 10.2, 10.3, 10.4
 */

import { ErrorType } from '../types';

/**
 * User-facing error messages mapped by error type
 * These messages are clear, actionable, and appropriate for college students
 */
export const ERROR_MESSAGES: Record<ErrorType, string> = {
  microphone: 'Microphone access is required to practice. Please grant permission and try again.',
  transcription: 'Unable to connect to transcription service. Please check your internet connection and try again.',
  generation: 'Unable to generate question. Please try again.',
  analysis: 'Unable to analyze your response, but your transcription has been preserved below.',
};

/**
 * Specific error messages for different transcription scenarios
 */
export const TRANSCRIPTION_ERROR_MESSAGES = {
  connectionFailed: 'Unable to connect to transcription service. Please check your internet connection and try again.',
  unexpectedDisconnection: 'Transcription stopped unexpectedly. Your session has been ended.',
  noAudioDetected: 'No audio detected. Please check your microphone and speak clearly.',
  serviceUnavailable: 'Transcription service is temporarily unavailable. Please try again in a few moments.',
} as const;

/**
 * Specific error messages for AI service scenarios
 */
export const AI_SERVICE_ERROR_MESSAGES = {
  generationFailed: 'Unable to generate question. Please try again.',
  analysisFailed: 'Unable to analyze your response, but your transcription has been preserved below.',
  serviceUnavailable: 'AI service is temporarily unavailable. Please try again in a few moments.',
  timeout: 'Request timed out. Please try again.',
} as const;

/**
 * Structured error log entry
 */
export interface ErrorLogEntry {
  timestamp: Date;
  errorType: ErrorType;
  message: string;
  context?: Record<string, unknown>;
  stack?: string;
}

/**
 * Logs an error with structured data for debugging
 * Validates: Requirement 10.4
 * 
 * @param errorType - The category of error (microphone, transcription, generation, analysis)
 * @param message - The error message
 * @param context - Additional context data (session ID, question ID, user action, etc.)
 * @param error - Optional Error object for stack trace
 * 
 * @example
 * logError('transcription', 'WebSocket connection failed', {
 *   sessionId: 'abc123',
 *   action: 'startSession'
 * }, error);
 */
export function logError(
  errorType: ErrorType,
  message: string,
  context?: Record<string, unknown>,
  error?: Error
): void {
  const logEntry: ErrorLogEntry = {
    timestamp: new Date(),
    errorType,
    message,
    context,
    stack: error?.stack,
  };

  // Log to console with structured format
  console.error('[Interview Coach Error]', {
    ...logEntry,
    timestamp: logEntry.timestamp.toISOString(),
  });

  // Future: Send to error tracking service (e.g., Sentry)
  // This is where we would integrate with external error tracking
}

/**
 * Gets a user-facing error message for a given error type
 * 
 * @param errorType - The category of error
 * @returns User-friendly error message
 */
export function getUserErrorMessage(errorType: ErrorType): string {
  return ERROR_MESSAGES[errorType];
}

/**
 * Determines if an error is retryable based on error type and context
 * 
 * @param errorType - The category of error
 * @param errorCode - Optional specific error code
 * @returns true if the error is retryable, false otherwise
 */
export function isRetryableError(errorType: ErrorType, errorCode?: string): boolean {
  // Microphone permission denied is not retryable automatically
  // but user can manually retry after granting permission
  if (errorType === 'microphone' && errorCode === 'NotAllowedError') {
    return true; // User can retry after granting permission
  }

  // Transcription and AI service errors are generally retryable
  if (errorType === 'transcription' || errorType === 'generation' || errorType === 'analysis') {
    return true;
  }

  return false;
}
