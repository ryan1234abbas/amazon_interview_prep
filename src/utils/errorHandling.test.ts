/**
 * Unit tests for error handling utilities
 * Validates: Requirements 8.2, 9.1, 9.2, 9.4, 10.1, 10.2, 10.3, 10.4
 */

import {
  ERROR_MESSAGES,
  TRANSCRIPTION_ERROR_MESSAGES,
  AI_SERVICE_ERROR_MESSAGES,
  logError,
  getUserErrorMessage,
  isRetryableError,
} from './errorHandling';
import type { ErrorType } from '../types';

describe('ERROR_MESSAGES', () => {
  it('should have messages for all error types', () => {
    expect(ERROR_MESSAGES.microphone).toBeDefined();
    expect(ERROR_MESSAGES.transcription).toBeDefined();
    expect(ERROR_MESSAGES.generation).toBeDefined();
    expect(ERROR_MESSAGES.analysis).toBeDefined();
  });

  it('should have clear, actionable microphone error message', () => {
    expect(ERROR_MESSAGES.microphone).toContain('Microphone access is required');
    expect(ERROR_MESSAGES.microphone).toContain('grant permission');
  });

  it('should have clear transcription error message', () => {
    expect(ERROR_MESSAGES.transcription).toContain('transcription service');
    expect(ERROR_MESSAGES.transcription).toContain('internet connection');
  });

  it('should have clear generation error message', () => {
    expect(ERROR_MESSAGES.generation).toContain('generate question');
    expect(ERROR_MESSAGES.generation).toContain('try again');
  });

  it('should have clear analysis error message that mentions preserved transcription', () => {
    expect(ERROR_MESSAGES.analysis).toContain('analyze your response');
    expect(ERROR_MESSAGES.analysis).toContain('transcription has been preserved');
  });
});

describe('TRANSCRIPTION_ERROR_MESSAGES', () => {
  it('should have specific messages for different transcription scenarios', () => {
    expect(TRANSCRIPTION_ERROR_MESSAGES.connectionFailed).toBeDefined();
    expect(TRANSCRIPTION_ERROR_MESSAGES.unexpectedDisconnection).toBeDefined();
    expect(TRANSCRIPTION_ERROR_MESSAGES.noAudioDetected).toBeDefined();
    expect(TRANSCRIPTION_ERROR_MESSAGES.serviceUnavailable).toBeDefined();
  });

  it('should have message for no audio detected scenario', () => {
    expect(TRANSCRIPTION_ERROR_MESSAGES.noAudioDetected).toContain('No audio detected');
    expect(TRANSCRIPTION_ERROR_MESSAGES.noAudioDetected).toContain('check your microphone');
  });
});

describe('AI_SERVICE_ERROR_MESSAGES', () => {
  it('should have specific messages for AI service scenarios', () => {
    expect(AI_SERVICE_ERROR_MESSAGES.generationFailed).toBeDefined();
    expect(AI_SERVICE_ERROR_MESSAGES.analysisFailed).toBeDefined();
    expect(AI_SERVICE_ERROR_MESSAGES.serviceUnavailable).toBeDefined();
    expect(AI_SERVICE_ERROR_MESSAGES.timeout).toBeDefined();
  });

  it('should have message for service unavailable scenario', () => {
    expect(AI_SERVICE_ERROR_MESSAGES.serviceUnavailable).toContain('temporarily unavailable');
    expect(AI_SERVICE_ERROR_MESSAGES.serviceUnavailable).toContain('try again');
  });
});

describe('logError', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should log error with timestamp, type, and message', () => {
    logError('microphone', 'Permission denied');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[Interview Coach Error]',
      expect.objectContaining({
        errorType: 'microphone',
        message: 'Permission denied',
        timestamp: expect.any(String),
      })
    );
  });

  it('should include context data when provided', () => {
    const context = {
      sessionId: 'abc123',
      action: 'startSession',
    };

    logError('transcription', 'WebSocket connection failed', context);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[Interview Coach Error]',
      expect.objectContaining({
        errorType: 'transcription',
        message: 'WebSocket connection failed',
        context,
      })
    );
  });

  it('should include stack trace when error object provided', () => {
    const error = new Error('Test error');

    logError('generation', 'Bedrock request failed', undefined, error);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[Interview Coach Error]',
      expect.objectContaining({
        errorType: 'generation',
        message: 'Bedrock request failed',
        stack: expect.stringContaining('Error: Test error'),
      })
    );
  });

  it('should format timestamp as ISO string', () => {
    logError('analysis', 'Analysis timeout');

    const loggedData = consoleErrorSpy.mock.calls[0][1];
    expect(loggedData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should log all error types correctly', () => {
    const errorTypes: ErrorType[] = ['microphone', 'transcription', 'generation', 'analysis'];

    errorTypes.forEach(errorType => {
      consoleErrorSpy.mockClear();
      logError(errorType, `Test ${errorType} error`);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Interview Coach Error]',
        expect.objectContaining({
          errorType,
        })
      );
    });
  });
});

describe('getUserErrorMessage', () => {
  it('should return correct message for microphone error', () => {
    expect(getUserErrorMessage('microphone')).toBe(ERROR_MESSAGES.microphone);
  });

  it('should return correct message for transcription error', () => {
    expect(getUserErrorMessage('transcription')).toBe(ERROR_MESSAGES.transcription);
  });

  it('should return correct message for generation error', () => {
    expect(getUserErrorMessage('generation')).toBe(ERROR_MESSAGES.generation);
  });

  it('should return correct message for analysis error', () => {
    expect(getUserErrorMessage('analysis')).toBe(ERROR_MESSAGES.analysis);
  });
});

describe('isRetryableError', () => {
  it('should return true for microphone permission denied (user can retry)', () => {
    expect(isRetryableError('microphone', 'NotAllowedError')).toBe(true);
  });

  it('should return true for transcription errors', () => {
    expect(isRetryableError('transcription')).toBe(true);
    expect(isRetryableError('transcription', 'ConnectionFailed')).toBe(true);
  });

  it('should return true for generation errors', () => {
    expect(isRetryableError('generation')).toBe(true);
    expect(isRetryableError('generation', 'Timeout')).toBe(true);
  });

  it('should return true for analysis errors', () => {
    expect(isRetryableError('analysis')).toBe(true);
    expect(isRetryableError('analysis', 'ServiceUnavailable')).toBe(true);
  });
});
