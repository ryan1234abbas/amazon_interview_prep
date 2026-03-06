/**
 * InterviewCoach Main Component
 * 
 * Main React component that orchestrates the interview practice experience.
 * Manages state, integrates services, handles user interactions, and updates UI.
 * 
 * Requirements: 1.5, 2.1, 2.3, 3.2, 4.1, 5.1, 7.3
 */

import { useState, useEffect, useRef } from 'react';
import { QuestionGenerator } from '../services/QuestionGenerator';
import { PracticeSessionManager } from '../services/PracticeSessionManager';
import { TranscriptionService } from '../services/TranscriptionService';
import { AICoach } from '../services/AICoach';
import { formatTimer } from '../utils/timer';
import { logError, getUserErrorMessage, isRetryableError } from '../utils/errorHandling';
import { 
  GeneratedQuestion, 
  SessionState, 
  Feedback, 
  ErrorState,
  ErrorType 
} from '../types';
import './InterviewCoach.css';

/**
 * InterviewCoach component state interface
 */
interface InterviewCoachState {
  question: GeneratedQuestion | null;
  sessionState: SessionState;
  elapsedTime: number;
  liveTranscription: string;
  feedback: Feedback | null;
  error: ErrorState | null;
  isGeneratingQuestion: boolean;
  isAnalyzing: boolean;
}

/**
 * Main InterviewCoach component
 */
export function InterviewCoach() {
  // State management
  const [state, setState] = useState<InterviewCoachState>({
    question: null,
    sessionState: 'idle',
    elapsedTime: 0,
    liveTranscription: '',
    feedback: null,
    error: null,
    isGeneratingQuestion: false,
    isAnalyzing: false,
  });

  // Service instances (using refs to persist across renders)
  const questionGeneratorRef = useRef<QuestionGenerator | null>(null);
  const practiceSessionManagerRef = useRef<PracticeSessionManager | null>(null);
  const transcriptionServiceRef = useRef<TranscriptionService | null>(null);
  const aiCoachRef = useRef<AICoach | null>(null);

  // Initialize services on mount
  useEffect(() => {
    transcriptionServiceRef.current = new TranscriptionService();
    practiceSessionManagerRef.current = new PracticeSessionManager(
      transcriptionServiceRef.current
    );
    questionGeneratorRef.current = new QuestionGenerator();
    aiCoachRef.current = new AICoach();

    // Set up transcription callback to update live transcription (Requirement 3.2)
    transcriptionServiceRef.current.onTranscript((text: string) => {
      setState(prev => ({
        ...prev,
        liveTranscription: text,
      }));
    });

    // Set up transcription error callback
    transcriptionServiceRef.current.onError((error) => {
      handleError('transcription', error.message);
      // If session is active, stop it
      if (practiceSessionManagerRef.current?.getSessionState() === 'active') {
        stopSession();
      }
    });

    // Cleanup on unmount
    return () => {
      if (practiceSessionManagerRef.current?.getSessionState() === 'active') {
        practiceSessionManagerRef.current.stopSession().catch(console.error);
      }
    };
  }, []);

  // Timer effect - updates elapsed time every second during active session (Requirement 6.1)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (state.sessionState === 'active' && practiceSessionManagerRef.current) {
      interval = setInterval(() => {
        const elapsed = practiceSessionManagerRef.current!.getElapsedTime();
        setState(prev => ({
          ...prev,
          elapsedTime: elapsed,
        }));
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [state.sessionState]);

  /**
   * Handles error state and logging
   */
  const handleError = (type: ErrorType, message: string, context?: Record<string, unknown>) => {
    const userMessage = getUserErrorMessage(type);
    const retryable = isRetryableError(type);

    setState(prev => ({
      ...prev,
      error: {
        type,
        message: userMessage,
        retryable,
      },
      isGeneratingQuestion: false,
      isAnalyzing: false,
    }));

    logError(type, message, context);
  };

  /**
   * Clears error state
   */
  const clearError = () => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  };

  /**
   * Generates a new behavioral interview question (Requirement 1.1, 1.5)
   */
  const generateQuestion = async () => {
    if (!questionGeneratorRef.current) return;

    clearError();
    setState(prev => ({
      ...prev,
      isGeneratingQuestion: true,
      feedback: null, // Clear previous feedback
      liveTranscription: '', // Clear previous transcription
    }));

    try {
      const generatedQuestion = await questionGeneratorRef.current.generateQuestion();
      
      setState(prev => ({
        ...prev,
        question: generatedQuestion,
        isGeneratingQuestion: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      handleError('generation', message, { action: 'generateQuestion' });
    }
  };

  /**
   * Starts a practice session (Requirement 2.1)
   */
  const startSession = async () => {
    if (!practiceSessionManagerRef.current) return;

    clearError();

    try {
      await practiceSessionManagerRef.current.startSession();
      
      setState(prev => ({
        ...prev,
        sessionState: practiceSessionManagerRef.current!.getSessionState(),
        elapsedTime: 0,
        liveTranscription: '',
        feedback: null, // Clear previous feedback when starting new session
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      handleError('microphone', message, { action: 'startSession' });
    }
  };

  /**
   * Stops the practice session and triggers analysis (Requirement 2.3, 4.1)
   */
  const stopSession = async () => {
    if (!practiceSessionManagerRef.current || !aiCoachRef.current) return;

    try {
      const sessionResult = await practiceSessionManagerRef.current.stopSession();
      
      setState(prev => ({
        ...prev,
        sessionState: 'idle',
        liveTranscription: sessionResult.transcription, // Preserve transcription (Requirement 3.5)
        isAnalyzing: true,
      }));

      // Analyze the response if we have a question and transcription
      if (state.question && sessionResult.transcription.trim().length > 0) {
        try {
          const feedback = await aiCoachRef.current.analyzeResponse(
            state.question.question,
            sessionResult.transcription
          );

          setState(prev => ({
            ...prev,
            feedback, // Display feedback (Requirement 5.1)
            isAnalyzing: false,
          }));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          handleError('analysis', message, { 
            action: 'analyzeResponse',
            questionCategory: state.question.category,
            transcriptionLength: sessionResult.transcription.length,
          });
        }
      } else {
        setState(prev => ({
          ...prev,
          isAnalyzing: false,
        }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      handleError('transcription', message, { action: 'stopSession' });
      
      // Ensure session state is reset
      setState(prev => ({
        ...prev,
        sessionState: 'idle',
        isAnalyzing: false,
      }));
    }
  };

  // Determine button states (Requirements 2.4, 2.5)
  const isStartDisabled = state.sessionState !== 'idle' || state.isGeneratingQuestion;
  const isStopDisabled = state.sessionState !== 'active';
  const isGenerateDisabled = state.sessionState !== 'idle' || state.isGeneratingQuestion;

  return (
    <div className="interview-coach">
      <header className="interview-coach__header">
        <h1>Interview Coach</h1>
        <p>Practice behavioral interview questions with AI-powered feedback</p>
      </header>

      <main className="interview-coach__main">
        {/* Error Display */}
        {state.error && (
          <div className="interview-coach__error">
            <p>{state.error.message}</p>
            {state.error.retryable && (
              <button onClick={clearError} className="button button--secondary">
                Dismiss
              </button>
            )}
          </div>
        )}

        {/* Question Display (Requirement 1.5, 7.3) */}
        <section className="interview-coach__question">
          <h2>Question</h2>
          <div className="question-display">
            {state.isGeneratingQuestion ? (
              <p className="question-display__loading">Generating question...</p>
            ) : state.question ? (
              <>
                <p className="question-display__text">{state.question.question}</p>
                <span className="question-display__category">{state.question.category}</span>
              </>
            ) : (
              <p className="question-display__placeholder">
                Click "Generate Question" to get started
              </p>
            )}
          </div>
          <button 
            onClick={generateQuestion} 
            disabled={isGenerateDisabled}
            className="button button--primary"
          >
            Generate Question
          </button>
        </section>

        {/* Control Buttons and Timer (Requirements 2.1, 2.3, 6.1, 6.2, 7.3) */}
        <section className="interview-coach__controls">
          <div className="controls">
            <button 
              onClick={startSession} 
              disabled={isStartDisabled}
              className="button button--primary"
            >
              Start Practice Session
            </button>
            <button 
              onClick={stopSession} 
              disabled={isStopDisabled}
              className="button button--danger"
            >
              Stop Session
            </button>
          </div>
          <div className="timer">
            <span className="timer__label">Time:</span>
            <span className="timer__value">{formatTimer(state.elapsedTime)}</span>
          </div>
        </section>

        {/* Live Transcription Display (Requirement 3.2, 7.3) */}
        <section className="interview-coach__transcription">
          <h2>Live Transcription</h2>
          <div className="transcription-display">
            {state.liveTranscription ? (
              <p>{state.liveTranscription}</p>
            ) : (
              <p className="transcription-display__placeholder">
                {state.sessionState === 'active' 
                  ? 'Speak your answer...' 
                  : 'Start a session to see your transcription here'}
              </p>
            )}
          </div>
        </section>

        {/* Feedback Panel (Requirement 5.1, 7.3) */}
        <section className="interview-coach__feedback">
          <h2>Feedback</h2>
          {state.isAnalyzing ? (
            <div className="feedback-panel">
              <p className="feedback-panel__loading">Analyzing your response...</p>
            </div>
          ) : state.feedback ? (
            <div className="feedback-panel">
              {/* STAR Analysis */}
              <div className="feedback-panel__star">
                <h3>STAR Analysis</h3>
                <ul className="star-analysis">
                  <li className={`star-analysis__item star-analysis__item--${state.feedback.starAnalysis.situation}`}>
                    <strong>Situation:</strong> {state.feedback.starAnalysis.situation}
                  </li>
                  <li className={`star-analysis__item star-analysis__item--${state.feedback.starAnalysis.task}`}>
                    <strong>Task:</strong> {state.feedback.starAnalysis.task}
                  </li>
                  <li className={`star-analysis__item star-analysis__item--${state.feedback.starAnalysis.action}`}>
                    <strong>Action:</strong> {state.feedback.starAnalysis.action}
                  </li>
                  <li className={`star-analysis__item star-analysis__item--${state.feedback.starAnalysis.result}`}>
                    <strong>Result:</strong> {state.feedback.starAnalysis.result}
                  </li>
                </ul>
              </div>

              {/* Strengths (Requirement 5.2) */}
              <div className="feedback-panel__strengths">
                <h3>Strengths</h3>
                <ul>
                  {state.feedback.strengths.map((strength, index) => (
                    <li key={index}>{strength}</li>
                  ))}
                </ul>
              </div>

              {/* Improvements (Requirement 5.3) */}
              <div className="feedback-panel__improvements">
                <h3>Areas for Improvement</h3>
                <ul>
                  {state.feedback.improvements.map((improvement, index) => (
                    <li key={index}>{improvement}</li>
                  ))}
                </ul>
              </div>

              {/* Actionable Tips (Requirement 5.4) */}
              <div className="feedback-panel__tips">
                <h3>Actionable Tips</h3>
                <ul>
                  {state.feedback.actionableTips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="feedback-panel">
              <p className="feedback-panel__placeholder">
                Complete a practice session to receive feedback
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
