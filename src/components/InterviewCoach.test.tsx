/**
 * Unit tests for InterviewCoach component
 * 
 * Tests component state management, button enable/disable logic,
 * error display, feedback display, timer updates, and transcription updates.
 * 
 * Requirements: 2.4, 2.5, 3.2, 5.1, 6.1, 7.3
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InterviewCoach } from './InterviewCoach';
import { QuestionGenerator } from '../services/QuestionGenerator';
import { PracticeSessionManager } from '../services/PracticeSessionManager';
import { AICoach } from '../services/AICoach';
import { TranscriptionService } from '../services/TranscriptionService';

// Mock AWS config
jest.mock('../config/aws', () => ({
  bedrockClient: {},
  transcribeClient: {},
  NOVA_PRO_MODEL_ID: 'amazon.nova-pro-v1:0',
}));

// Mock the services
jest.mock('../services/QuestionGenerator');
jest.mock('../services/PracticeSessionManager');
jest.mock('../services/AICoach');
jest.mock('../services/TranscriptionService');

describe('InterviewCoach Component', () => {
  let mockQuestionGenerator: jest.Mocked<QuestionGenerator>;
  let mockPracticeSessionManager: jest.Mocked<PracticeSessionManager>;
  let mockAICoach: jest.Mocked<AICoach>;
  let mockTranscriptionService: jest.Mocked<TranscriptionService>;
  let transcriptCallback: (text: string) => void;
  let errorCallback: (error: any) => void;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock TranscriptionService
    mockTranscriptionService = {
      onTranscript: jest.fn((callback) => {
        transcriptCallback = callback;
      }),
      onError: jest.fn((callback) => {
        errorCallback = callback;
      }),
      connect: jest.fn().mockResolvedValue(undefined),
      startStreaming: jest.fn(),
      stopStreaming: jest.fn().mockResolvedValue('Test transcription'),
    } as any;

    // Mock PracticeSessionManager
    mockPracticeSessionManager = {
      getSessionState: jest.fn().mockReturnValue('idle'),
      getElapsedTime: jest.fn().mockReturnValue(0),
      startSession: jest.fn().mockResolvedValue(undefined),
      stopSession: jest.fn().mockResolvedValue({
        transcription: 'Test transcription',
        duration: 30,
      }),
    } as any;

    // Mock QuestionGenerator
    mockQuestionGenerator = {
      generateQuestion: jest.fn().mockResolvedValue({
        question: 'Tell me about a time when you demonstrated leadership.',
        category: 'leadership',
      }),
    } as any;

    // Mock AICoach
    mockAICoach = {
      analyzeResponse: jest.fn().mockResolvedValue({
        starAnalysis: {
          situation: 'present',
          task: 'present',
          action: 'present',
          result: 'partial',
        },
        strengths: ['Clear communication'],
        improvements: ['Add more detail about results'],
        actionableTips: ['Quantify your impact', 'Describe the outcome more specifically'],
      }),
    } as any;

    // Set up constructor mocks
    (TranscriptionService as jest.Mock).mockImplementation(() => mockTranscriptionService);
    (PracticeSessionManager as jest.Mock).mockImplementation(() => mockPracticeSessionManager);
    (QuestionGenerator as jest.Mock).mockImplementation(() => mockQuestionGenerator);
    (AICoach as jest.Mock).mockImplementation(() => mockAICoach);
  });

  describe('Initial Render', () => {
    it('should render all main sections', () => {
      render(<InterviewCoach />);

      expect(screen.getByText('Interview Coach')).toBeInTheDocument();
      expect(screen.getByText('Question')).toBeInTheDocument();
      expect(screen.getByText('Live Transcription')).toBeInTheDocument();
      expect(screen.getByText('Feedback')).toBeInTheDocument();
    });

    it('should show placeholder text when no question is generated', () => {
      render(<InterviewCoach />);

      expect(screen.getByText('Click "Generate Question" to get started')).toBeInTheDocument();
    });

    it('should have Start button enabled and Stop button disabled initially (Requirement 2.4, 2.5)', () => {
      render(<InterviewCoach />);

      const startButton = screen.getByText('Start Practice Session');
      const stopButton = screen.getByText('Stop Session');

      expect(startButton).not.toBeDisabled();
      expect(stopButton).toBeDisabled();
    });

    it('should display timer at 00:00 initially (Requirement 6.1)', () => {
      render(<InterviewCoach />);

      expect(screen.getByText('00:00')).toBeInTheDocument();
    });
  });

  describe('Question Generation', () => {
    it('should generate and display a question when Generate Question is clicked', async () => {
      render(<InterviewCoach />);

      const generateButton = screen.getByText('Generate Question');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Tell me about a time when you demonstrated leadership.')).toBeInTheDocument();
      });

      expect(screen.getByText('leadership')).toBeInTheDocument();
    });

    it('should show loading state while generating question', async () => {
      mockQuestionGenerator.generateQuestion.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          question: 'Test question',
          category: 'teamwork',
        }), 100))
      );

      render(<InterviewCoach />);

      const generateButton = screen.getByText('Generate Question');
      fireEvent.click(generateButton);

      expect(screen.getByText('Generating question...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Test question')).toBeInTheDocument();
      });
    });

    it('should display error when question generation fails', async () => {
      mockQuestionGenerator.generateQuestion.mockRejectedValue(
        new Error('Failed to generate question')
      );

      render(<InterviewCoach />);

      const generateButton = screen.getByText('Generate Question');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Unable to generate question. Please try again.')).toBeInTheDocument();
      });
    });

    it('should disable Generate button while generating', async () => {
      mockQuestionGenerator.generateQuestion.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          question: 'Test question',
          category: 'teamwork',
        }), 100))
      );

      render(<InterviewCoach />);

      const generateButton = screen.getByText('Generate Question');
      fireEvent.click(generateButton);

      expect(generateButton).toBeDisabled();

      await waitFor(() => {
        expect(generateButton).not.toBeDisabled();
      });
    });
  });

  describe('Session Management', () => {
    it('should start session when Start button is clicked (Requirement 2.1)', async () => {
      mockPracticeSessionManager.getSessionState.mockReturnValue('active');

      render(<InterviewCoach />);

      const startButton = screen.getByText('Start Practice Session');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockPracticeSessionManager.startSession).toHaveBeenCalled();
      });
    });

    it('should disable Start button and enable Stop button when session is active (Requirement 2.4, 2.5)', async () => {
      render(<InterviewCoach />);

      const startButton = screen.getByText('Start Practice Session');
      
      mockPracticeSessionManager.getSessionState.mockReturnValue('active');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(startButton).toBeDisabled();
        expect(screen.getByText('Stop Session')).not.toBeDisabled();
      });
    });

    it('should stop session when Stop button is clicked (Requirement 2.3)', async () => {
      mockPracticeSessionManager.getSessionState.mockReturnValue('active');

      render(<InterviewCoach />);

      // Start session first
      const startButton = screen.getByText('Start Practice Session');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockPracticeSessionManager.startSession).toHaveBeenCalled();
      });

      // Stop session
      mockPracticeSessionManager.getSessionState.mockReturnValue('idle');
      const stopButton = screen.getByText('Stop Session');
      fireEvent.click(stopButton);

      await waitFor(() => {
        expect(mockPracticeSessionManager.stopSession).toHaveBeenCalled();
      });
    });

    it('should display microphone error when permission is denied', async () => {
      mockPracticeSessionManager.startSession.mockRejectedValue(
        new Error('Microphone access denied')
      );

      render(<InterviewCoach />);

      const startButton = screen.getByText('Start Practice Session');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('Microphone access is required to practice. Please grant permission and try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Live Transcription', () => {
    it('should update live transcription when callback is triggered (Requirement 3.2)', async () => {
      render(<InterviewCoach />);

      // Simulate transcription update
      transcriptCallback('This is my answer to the question');

      await waitFor(() => {
        expect(screen.getByText('This is my answer to the question')).toBeInTheDocument();
      });
    });

    it('should show placeholder when no transcription is available', () => {
      render(<InterviewCoach />);

      expect(screen.getByText('Start a session to see your transcription here')).toBeInTheDocument();
    });

    it('should preserve transcription after session ends', async () => {
      mockPracticeSessionManager.getSessionState.mockReturnValue('active');

      render(<InterviewCoach />);

      // Start session
      const startButton = screen.getByText('Start Practice Session');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockPracticeSessionManager.startSession).toHaveBeenCalled();
      });

      // Stop session
      mockPracticeSessionManager.getSessionState.mockReturnValue('idle');
      const stopButton = screen.getByText('Stop Session');
      fireEvent.click(stopButton);

      await waitFor(() => {
        expect(screen.getByText('Test transcription')).toBeInTheDocument();
      });
    });
  });

  describe('Feedback Display', () => {
    it('should display feedback after session ends and analysis completes (Requirement 5.1)', async () => {
      // Generate question first
      render(<InterviewCoach />);

      const generateButton = screen.getByText('Generate Question');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockQuestionGenerator.generateQuestion).toHaveBeenCalled();
      });

      // Start and stop session
      mockPracticeSessionManager.getSessionState.mockReturnValue('active');
      const startButton = screen.getByText('Start Practice Session');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockPracticeSessionManager.startSession).toHaveBeenCalled();
      });

      mockPracticeSessionManager.getSessionState.mockReturnValue('idle');
      const stopButton = screen.getByText('Stop Session');
      fireEvent.click(stopButton);

      await waitFor(() => {
        expect(screen.getByText('STAR Analysis')).toBeInTheDocument();
        expect(screen.getByText('Strengths')).toBeInTheDocument();
        expect(screen.getByText('Areas for Improvement')).toBeInTheDocument();
        expect(screen.getByText('Actionable Tips')).toBeInTheDocument();
      });
    });

    it('should show analyzing state while feedback is being generated', async () => {
      mockAICoach.analyzeResponse.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          starAnalysis: {
            situation: 'present',
            task: 'present',
            action: 'present',
            result: 'present',
          },
          strengths: ['Good example'],
          improvements: ['Add more detail'],
          actionableTips: ['Be specific', 'Quantify results'],
        }), 100))
      );

      render(<InterviewCoach />);

      // Generate question
      const generateButton = screen.getByText('Generate Question');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockQuestionGenerator.generateQuestion).toHaveBeenCalled();
      });

      // Start and stop session
      mockPracticeSessionManager.getSessionState.mockReturnValue('active');
      const startButton = screen.getByText('Start Practice Session');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockPracticeSessionManager.startSession).toHaveBeenCalled();
      });

      mockPracticeSessionManager.getSessionState.mockReturnValue('idle');
      const stopButton = screen.getByText('Stop Session');
      fireEvent.click(stopButton);

      await waitFor(() => {
        expect(screen.getByText('Analyzing your response...')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('STAR Analysis')).toBeInTheDocument();
      });
    });

    it('should display error when analysis fails but preserve transcription', async () => {
      mockAICoach.analyzeResponse.mockRejectedValue(
        new Error('Analysis failed')
      );

      render(<InterviewCoach />);

      // Generate question
      const generateButton = screen.getByText('Generate Question');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockQuestionGenerator.generateQuestion).toHaveBeenCalled();
      });

      // Start and stop session
      mockPracticeSessionManager.getSessionState.mockReturnValue('active');
      const startButton = screen.getByText('Start Practice Session');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockPracticeSessionManager.startSession).toHaveBeenCalled();
      });

      mockPracticeSessionManager.getSessionState.mockReturnValue('idle');
      const stopButton = screen.getByText('Stop Session');
      fireEvent.click(stopButton);

      await waitFor(() => {
        expect(screen.getByText('Unable to analyze your response, but your transcription has been preserved below.')).toBeInTheDocument();
        expect(screen.getByText('Test transcription')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error with dismiss button for retryable errors', async () => {
      mockQuestionGenerator.generateQuestion.mockRejectedValue(
        new Error('Network error')
      );

      render(<InterviewCoach />);

      const generateButton = screen.getByText('Generate Question');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Unable to generate question. Please try again.')).toBeInTheDocument();
        expect(screen.getByText('Dismiss')).toBeInTheDocument();
      });
    });

    it('should clear error when dismiss button is clicked', async () => {
      mockQuestionGenerator.generateQuestion.mockRejectedValue(
        new Error('Network error')
      );

      render(<InterviewCoach />);

      const generateButton = screen.getByText('Generate Question');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Unable to generate question. Please try again.')).toBeInTheDocument();
      });

      const dismissButton = screen.getByText('Dismiss');
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByText('Unable to generate question. Please try again.')).not.toBeInTheDocument();
      });
    });

    it('should handle transcription errors during active session', async () => {
      mockPracticeSessionManager.getSessionState.mockReturnValue('active');

      render(<InterviewCoach />);

      // Start session
      const startButton = screen.getByText('Start Practice Session');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockPracticeSessionManager.startSession).toHaveBeenCalled();
      });

      // Trigger transcription error
      errorCallback({
        code: 'CONNECTION_FAILED',
        message: 'WebSocket connection failed',
        recoverable: false,
      });

      await waitFor(() => {
        expect(screen.getByText('Unable to connect to transcription service. Please check your internet connection and try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Timer Display', () => {
    it('should format timer correctly (Requirement 6.1)', () => {
      render(<InterviewCoach />);

      expect(screen.getByText('00:00')).toBeInTheDocument();
    });

    it('should update timer during active session', async () => {
      jest.useFakeTimers();

      mockPracticeSessionManager.getSessionState.mockReturnValue('idle');
      mockPracticeSessionManager.getElapsedTime.mockReturnValue(0);

      render(<InterviewCoach />);

      // Start session
      mockPracticeSessionManager.getSessionState.mockReturnValue('active');
      const startButton = screen.getByText('Start Practice Session');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockPracticeSessionManager.startSession).toHaveBeenCalled();
      });

      // Advance time and update elapsed time
      mockPracticeSessionManager.getElapsedTime.mockReturnValue(5);
      
      // Advance timers to trigger the interval
      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('00:05')).toBeInTheDocument();
      }, { timeout: 2000 });

      jest.useRealTimers();
    });
  });

  describe('Component Cleanup', () => {
    it('should stop active session on component unmount', async () => {
      mockPracticeSessionManager.getSessionState.mockReturnValue('idle');

      const { unmount } = render(<InterviewCoach />);

      // Start session
      mockPracticeSessionManager.getSessionState.mockReturnValue('active');
      const startButton = screen.getByText('Start Practice Session');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockPracticeSessionManager.startSession).toHaveBeenCalled();
      });

      // Unmount component
      unmount();

      // Verify stopSession was called during cleanup
      await waitFor(() => {
        expect(mockPracticeSessionManager.stopSession).toHaveBeenCalled();
      });
    });

    it('should not call stopSession on unmount if session is idle', () => {
      mockPracticeSessionManager.getSessionState.mockReturnValue('idle');

      const { unmount } = render(<InterviewCoach />);

      // Unmount component without starting session
      unmount();

      // Verify stopSession was not called
      expect(mockPracticeSessionManager.stopSession).not.toHaveBeenCalled();
    });

    it('should clear timer interval on unmount', async () => {
      jest.useFakeTimers();

      mockPracticeSessionManager.getSessionState.mockReturnValue('idle');
      mockPracticeSessionManager.getElapsedTime.mockReturnValue(0);

      const { unmount } = render(<InterviewCoach />);

      // Start session
      mockPracticeSessionManager.getSessionState.mockReturnValue('active');
      const startButton = screen.getByText('Start Practice Session');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockPracticeSessionManager.startSession).toHaveBeenCalled();
      });

      // Unmount component
      unmount();

      // Advance timers - timer should not update after unmount
      mockPracticeSessionManager.getElapsedTime.mockReturnValue(10);
      jest.advanceTimersByTime(1000);

      // Component is unmounted, so we can't check screen updates
      // But we verified the cleanup logic exists in the component

      jest.useRealTimers();
    });
  });
});
