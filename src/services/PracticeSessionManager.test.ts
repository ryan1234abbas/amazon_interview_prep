/**
 * Unit tests for PracticeSessionManager
 * 
 * Tests session lifecycle, microphone permission handling, timer tracking,
 * and coordination with TranscriptionService.
 */

import { PracticeSessionManager } from './PracticeSessionManager';
import { TranscriptionService } from './TranscriptionService';

// Mock AWS config
jest.mock('../config/aws', () => ({
  transcribeClient: {
    send: jest.fn(),
  },
  bedrockClient: {
    send: jest.fn(),
  },
  NOVA_PRO_MODEL_ID: 'amazon.nova-pro-v1:0',
}));

// Mock TranscriptionService
jest.mock('./TranscriptionService');

// Setup global mocks before tests
const mockMediaStream = {
  getTracks: jest.fn().mockReturnValue([
    { stop: jest.fn() }
  ]),
} as any;

const mockMediaRecorder = {
  start: jest.fn(),
  stop: jest.fn(),
  state: 'inactive',
  ondataavailable: null,
  mimeType: 'audio/webm',
} as any;

// Mock navigator.mediaDevices.getUserMedia
Object.defineProperty(globalThis, 'navigator', {
  value: {
    mediaDevices: {
      getUserMedia: jest.fn().mockResolvedValue(mockMediaStream),
    },
  },
  writable: true,
});

// Mock MediaRecorder constructor
Object.defineProperty(globalThis, 'MediaRecorder', {
  value: jest.fn().mockImplementation(() => mockMediaRecorder),
  writable: true,
});

(globalThis.MediaRecorder as any).isTypeSupported = jest.fn().mockReturnValue(true);

describe('PracticeSessionManager', () => {
  let manager: PracticeSessionManager;
  let mockTranscriptionService: TranscriptionService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Reset mock implementations
    mockMediaRecorder.start = jest.fn();
    mockMediaRecorder.stop = jest.fn();
    mockMediaRecorder.state = 'inactive';
    mockMediaRecorder.ondataavailable = null;
    
    mockMediaStream.getTracks = jest.fn().mockReturnValue([
      { stop: jest.fn() }
    ]);
    
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue(mockMediaStream);
    (globalThis.MediaRecorder as any).isTypeSupported = jest.fn().mockReturnValue(true);

    // Create mock TranscriptionService
    mockTranscriptionService = new TranscriptionService();
    mockTranscriptionService.connect = jest.fn().mockResolvedValue(undefined);
    mockTranscriptionService.startStreaming = jest.fn();
    mockTranscriptionService.stopStreaming = jest.fn().mockResolvedValue('Test transcription');
    mockTranscriptionService.onTranscript = jest.fn();
    mockTranscriptionService.onError = jest.fn();

    // Create manager instance
    manager = new PracticeSessionManager(mockTranscriptionService);

    // Mock timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Session Lifecycle', () => {
    it('should start in idle state', () => {
      expect(manager.getSessionState()).toBe('idle');
    });

    it('should transition from idle to starting to active when starting session', async () => {
      const startPromise = manager.startSession();
      
      // Should be in starting state during async operations
      expect(manager.getSessionState()).toBe('starting');
      
      await startPromise;
      
      // Should be in active state after successful start
      expect(manager.getSessionState()).toBe('active');
    });

    it('should transition from active to stopping to idle when stopping session', async () => {
      await manager.startSession();
      expect(manager.getSessionState()).toBe('active');

      const stopPromise = manager.stopSession();
      
      // Should be in stopping state during async operations
      expect(manager.getSessionState()).toBe('stopping');
      
      await stopPromise;
      
      // Should be in idle state after successful stop
      expect(manager.getSessionState()).toBe('idle');
    });

    it('should throw error when starting session while not idle', async () => {
      await manager.startSession();
      
      await expect(manager.startSession()).rejects.toThrow(
        'Cannot start session: session is already active or transitioning'
      );
    });

    it('should throw error when stopping session while not active', async () => {
      await expect(manager.stopSession()).rejects.toThrow(
        'Cannot stop session: no session is active'
      );
    });
  });

  describe('Microphone Permission Handling', () => {
    it('should request microphone access when starting session', async () => {
      await manager.startSession();
      
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        }
      });
    });

    it('should throw user-friendly error when microphone access is denied', async () => {
      const deniedError = new Error('Permission denied');
      deniedError.name = 'NotAllowedError';
      
      (navigator.mediaDevices.getUserMedia as any).mockRejectedValue(deniedError);
      
      await expect(manager.startSession()).rejects.toThrow(
        'Microphone access denied. Please grant permission to record your response.'
      );
      
      // Should return to idle state
      expect(manager.getSessionState()).toBe('idle');
    });

    it('should throw user-friendly error when no microphone is found', async () => {
      const notFoundError = new Error('No microphone');
      notFoundError.name = 'NotFoundError';
      
      (navigator.mediaDevices.getUserMedia as any).mockRejectedValue(notFoundError);
      
      await expect(manager.startSession()).rejects.toThrow(
        'No microphone found. Please connect a microphone and try again.'
      );
      
      expect(manager.getSessionState()).toBe('idle');
    });

    it('should throw user-friendly error when microphone is in use', async () => {
      const inUseError = new Error('Microphone in use');
      inUseError.name = 'NotReadableError';
      
      (navigator.mediaDevices.getUserMedia as any).mockRejectedValue(inUseError);
      
      await expect(manager.startSession()).rejects.toThrow(
        'Microphone is already in use by another application.'
      );
      
      expect(manager.getSessionState()).toBe('idle');
    });
  });

  describe('MediaRecorder Management', () => {
    it('should create and start MediaRecorder when starting session', async () => {
      await manager.startSession();
      
      expect(globalThis.MediaRecorder).toHaveBeenCalledWith(
        mockMediaStream,
        expect.objectContaining({ mimeType: expect.any(String) })
      );
      
      expect(mockMediaRecorder.start).toHaveBeenCalledWith(100);
    });

    it('should stop MediaRecorder when stopping session', async () => {
      await manager.startSession();
      mockMediaRecorder.state = 'recording';
      
      await manager.stopSession();
      
      expect(mockMediaRecorder.stop).toHaveBeenCalled();
    });

    it('should stop all media stream tracks when stopping session', async () => {
      await manager.startSession();
      
      await manager.stopSession();
      
      const tracks = mockMediaStream.getTracks();
      tracks.forEach((track: any) => {
        expect(track.stop).toHaveBeenCalled();
      });
    });

    it('should collect audio chunks during recording', async () => {
      await manager.startSession();
      
      // Simulate data available events
      const chunk1 = new Blob(['audio1'], { type: 'audio/webm' });
      const chunk2 = new Blob(['audio2'], { type: 'audio/webm' });
      
      mockMediaRecorder.ondataavailable?.({ data: chunk1, timecode: 0 } as BlobEvent);
      mockMediaRecorder.ondataavailable?.({ data: chunk2, timecode: 100 } as BlobEvent);
      
      const result = await manager.stopSession();
      
      expect(result.audioData).toBeDefined();
      expect(result.audioData?.type).toBe('audio/webm');
    });
  });

  describe('TranscriptionService Coordination', () => {
    it('should connect to transcription service when starting session', async () => {
      await manager.startSession();
      
      expect(mockTranscriptionService.connect).toHaveBeenCalled();
    });

    it('should start streaming audio to transcription service', async () => {
      await manager.startSession();
      
      expect(mockTranscriptionService.startStreaming).toHaveBeenCalledWith(mockMediaStream);
    });

    it('should stop transcription service when stopping session', async () => {
      await manager.startSession();
      await manager.stopSession();
      
      expect(mockTranscriptionService.stopStreaming).toHaveBeenCalled();
    });

    it('should return transcription from service in session result', async () => {
      mockTranscriptionService.stopStreaming = jest.fn().mockResolvedValue('Final transcription text');
      
      await manager.startSession();
      const result = await manager.stopSession();
      
      expect(result.transcription).toBe('Final transcription text');
    });
  });

  describe('Timer Tracking', () => {
    it('should initialize elapsed time to 0 when starting session', async () => {
      await manager.startSession();
      
      expect(manager.getElapsedTime()).toBe(0);
    });

    it('should track elapsed time with 1-second granularity', async () => {
      await manager.startSession();
      
      expect(manager.getElapsedTime()).toBe(0);
      
      // Advance time by 1 second
      jest.advanceTimersByTime(1000);
      expect(manager.getElapsedTime()).toBe(1);
      
      // Advance time by 2 more seconds
      jest.advanceTimersByTime(2000);
      expect(manager.getElapsedTime()).toBe(3);
    });

    it('should stop timer when stopping session', async () => {
      await manager.startSession();
      
      jest.advanceTimersByTime(5000);
      expect(manager.getElapsedTime()).toBe(5);
      
      await manager.stopSession();
      
      // Advance time after stopping - elapsed time should not change
      jest.advanceTimersByTime(3000);
      expect(manager.getElapsedTime()).toBe(5);
    });

    it('should return duration in session result', async () => {
      await manager.startSession();
      
      jest.advanceTimersByTime(7000);
      
      const result = await manager.stopSession();
      
      expect(result.duration).toBe(7);
    });

    it('should reset elapsed time when starting new session', async () => {
      // First session
      await manager.startSession();
      jest.advanceTimersByTime(5000);
      await manager.stopSession();
      
      // Second session
      await manager.startSession();
      expect(manager.getElapsedTime()).toBe(0);
    });
  });

  describe('Session Result', () => {
    it('should return complete session result with all fields', async () => {
      mockTranscriptionService.stopStreaming = jest.fn().mockResolvedValue('Complete transcription');
      
      await manager.startSession();
      
      // Simulate audio chunks
      const chunk = new Blob(['audio'], { type: 'audio/webm' });
      mockMediaRecorder.ondataavailable?.({ data: chunk, timecode: 0 } as BlobEvent);
      
      jest.advanceTimersByTime(10000);
      
      const result = await manager.stopSession();
      
      expect(result).toEqual({
        transcription: 'Complete transcription',
        duration: 10,
        audioData: expect.any(Blob),
      });
    });

    it('should handle empty transcription gracefully', async () => {
      mockTranscriptionService.stopStreaming = jest.fn().mockResolvedValue('');
      
      await manager.startSession();
      const result = await manager.stopSession();
      
      expect(result.transcription).toBe('');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling and Cleanup', () => {
    it('should clean up resources when start fails', async () => {
      const error = new Error('Connection failed');
      mockTranscriptionService.connect = jest.fn().mockRejectedValue(error);
      
      await expect(manager.startSession()).rejects.toThrow('Connection failed');
      
      // Should return to idle state
      expect(manager.getSessionState()).toBe('idle');
      
      // Should stop media stream tracks
      const tracks = mockMediaStream.getTracks();
      tracks.forEach((track: any) => {
        expect(track.stop).toHaveBeenCalled();
      });
    });

    it('should clean up resources when stop fails', async () => {
      const error = new Error('Stop failed');
      mockTranscriptionService.stopStreaming = jest.fn().mockRejectedValue(error);
      
      await manager.startSession();
      
      await expect(manager.stopSession()).rejects.toThrow('Stop failed');
      
      // Should still return to idle state
      expect(manager.getSessionState()).toBe('idle');
    });

    it('should handle MediaRecorder already stopped', async () => {
      await manager.startSession();
      
      // Manually stop MediaRecorder
      mockMediaRecorder.state = 'inactive';
      
      // Should not throw error
      await expect(manager.stopSession()).resolves.toBeDefined();
    });
  });

  describe('MIME Type Selection', () => {
    it('should select supported MIME type for MediaRecorder', async () => {
      (globalThis.MediaRecorder as any).isTypeSupported = jest.fn()
        .mockReturnValueOnce(false) // audio/webm;codecs=opus not supported
        .mockReturnValueOnce(true);  // audio/webm supported
      
      await manager.startSession();
      
      expect(globalThis.MediaRecorder).toHaveBeenCalledWith(
        mockMediaStream,
        expect.objectContaining({ mimeType: 'audio/webm' })
      );
    });

    it('should fallback to empty MIME type if none supported', async () => {
      (globalThis.MediaRecorder as any).isTypeSupported = jest.fn().mockReturnValue(false);
      
      await manager.startSession();
      
      expect(globalThis.MediaRecorder).toHaveBeenCalledWith(
        mockMediaStream,
        expect.objectContaining({ mimeType: '' })
      );
    });
  });
});
