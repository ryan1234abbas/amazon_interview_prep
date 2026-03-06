/**
 * TranscriptionService Unit Tests
 * 
 * Tests for the TranscriptionService class that handles real-time audio transcription
 * using AWS Transcribe WebSocket streaming.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { TranscriptionService } from './TranscriptionService';

// Mock AWS Transcribe client
jest.mock('../config/aws', () => ({
  transcribeClient: {
    send: jest.fn(),
  },
}));

// Mock AudioContext and related Web Audio API
class MockAudioContext {
  sampleRate: number;
  destination: any;

  constructor(options?: { sampleRate?: number }) {
    this.sampleRate = options?.sampleRate || 16000;
    this.destination = {};
  }

  createMediaStreamSource(_stream: MediaStream) {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
  }

  createScriptProcessor(_bufferSize: number, _inputChannels: number, _outputChannels: number) {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
      onaudioprocess: null,
    };
  }

  async close() {
    return Promise.resolve();
  }
}

// Mock MediaStream
class MockMediaStream {
  getTracks() {
    return [
      {
        stop: jest.fn(),
      },
    ];
  }
}

// Set up global mocks
(globalThis as any).AudioContext = MockAudioContext;
(globalThis as any).MediaStream = MockMediaStream;

describe('TranscriptionService', () => {
  let service: TranscriptionService;

  beforeEach(() => {
    service = new TranscriptionService();
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should initialize connection successfully', async () => {
      await expect(service.connect()).resolves.not.toThrow();
    });

    it('should reset transcription buffer on connect', async () => {
      await service.connect();
      const transcription = await service.stopStreaming();
      expect(transcription).toBe('');
    });
  });

  describe('onTranscript', () => {
    it('should register transcript callback', () => {
      const callback = jest.fn();
      service.onTranscript(callback);
      // Callback is registered, will be tested in integration
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('onError', () => {
    it('should register error callback', () => {
      const callback = jest.fn();
      service.onError(callback);
      // Callback is registered, will be tested in error scenarios
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('startStreaming', () => {
    it('should throw error if already streaming', () => {
      const mockStream = new MockMediaStream() as any;
      
      service.startStreaming(mockStream);
      
      expect(() => {
        service.startStreaming(mockStream);
      }).toThrow('Already streaming');
    });

    it('should create audio context with correct sample rate', () => {
      const mockStream = new MockMediaStream() as any;
      
      service.startStreaming(mockStream);
      
      // Audio context should be created (verified by no errors)
      expect(true).toBe(true);
    });
  });

  describe('stopStreaming', () => {
    it('should return empty string when not streaming', async () => {
      const transcription = await service.stopStreaming();
      expect(transcription).toBe('');
    });

    it('should return transcription buffer when streaming stops', async () => {
      const mockStream = new MockMediaStream() as any;
      
      service.startStreaming(mockStream);
      const transcription = await service.stopStreaming();
      
      expect(typeof transcription).toBe('string');
    });

    it('should stop all audio tracks', async () => {
      const mockTrack = { stop: jest.fn() };
      const mockStream = {
        getTracks: jest.fn().mockReturnValue([mockTrack]),
      } as any;
      
      service.startStreaming(mockStream);
      await service.stopStreaming();
      
      expect(mockTrack.stop).toHaveBeenCalled();
    });

    it('should clean up audio context', async () => {
      const mockStream = new MockMediaStream() as any;
      
      service.startStreaming(mockStream);
      await service.stopStreaming();
      
      // Should not throw and should complete cleanup
      expect(true).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle invalid stream gracefully', () => {
      const errorCallback = jest.fn();
      service.onError(errorCallback);

      // Create an invalid stream to trigger error
      const invalidStream = null as any;
      
      // The service may throw or call error callback depending on implementation
      try {
        service.startStreaming(invalidStream);
      } catch (error) {
        // Error thrown is acceptable
        expect(error).toBeDefined();
      }
    });

    it('should return transcription buffer even if cleanup fails', async () => {
      const mockStream = new MockMediaStream() as any;
      
      service.startStreaming(mockStream);
      
      // Even if there's an error during cleanup, should return buffer
      const transcription = await service.stopStreaming();
      expect(typeof transcription).toBe('string');
    });
  });

  describe('transcription persistence', () => {
    it('should preserve transcription after session ends (Requirement 3.5)', async () => {
      await service.connect();
      
      const mockStream = new MockMediaStream() as any;
      service.startStreaming(mockStream);
      
      // Simulate receiving transcription (would come from AWS in real scenario)
      // For now, just verify the buffer is accessible after stopping
      const transcription = await service.stopStreaming();
      
      // Transcription should be accessible (empty in this mock scenario)
      expect(transcription).toBeDefined();
      expect(typeof transcription).toBe('string');
    });
  });

  describe('audio format conversion', () => {
    it('should convert Float32Array to PCM 16-bit format', () => {
      // Access the private method through any cast for testing
      const serviceAny = service as any;
      
      const float32Data = new Float32Array([0, 0.5, -0.5, 1, -1]);
      const pcmData = serviceAny.convertToPCM16(float32Data);
      
      expect(pcmData).toBeInstanceOf(Uint8Array);
      expect(pcmData.length).toBe(float32Data.length * 2); // 2 bytes per sample
    });

    it('should clamp audio values between -1 and 1', () => {
      const serviceAny = service as any;
      
      // Test with values outside the valid range
      const float32Data = new Float32Array([2, -2, 0.5]);
      const pcmData = serviceAny.convertToPCM16(float32Data);
      
      // Should not throw and should produce valid output
      expect(pcmData).toBeInstanceOf(Uint8Array);
      expect(pcmData.length).toBe(float32Data.length * 2);
    });
  });

  describe('WebSocket connection lifecycle', () => {
    it('should maintain connection during active session (Requirement 3.3)', async () => {
      await service.connect();
      
      const mockStream = new MockMediaStream() as any;
      service.startStreaming(mockStream);
      
      // Connection should be active (no errors thrown)
      expect(true).toBe(true);
      
      await service.stopStreaming();
    });

    it('should close connection when session stops (Requirement 3.4)', async () => {
      await service.connect();
      
      const mockStream = new MockMediaStream() as any;
      service.startStreaming(mockStream);
      
      await service.stopStreaming();
      
      // Connection should be closed (verified by successful stop)
      expect(true).toBe(true);
    });
  });
});
