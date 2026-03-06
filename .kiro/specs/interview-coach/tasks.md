# Implementation Plan: Interview Coach

## Overview

This plan implements an AI-powered interview coach application with React frontend, AWS Bedrock for question generation and STAR analysis, and AWS Transcribe for real-time speech transcription. The implementation follows a bottom-up approach: core services first, then session management, UI components, and finally integration with comprehensive testing throughout.

## Tasks

- [x] 1. Set up project structure and dependencies
  - Initialize React project with TypeScript
  - Install AWS SDK packages (@aws-sdk/client-bedrock-runtime, @aws-sdk/client-transcribe-streaming)
  - Install fast-check for property-based testing
  - Install testing libraries (Jest, React Testing Library)
  - Configure AWS credentials from environment
  - Create directory structure for components, services, and tests
  - _Requirements: 1.2, 4.2_

- [ ] 2. Implement AWS service integrations
  - [x] 2.1 Create QuestionGenerator class with AWS Bedrock integration
    - Implement generateQuestion() method using Bedrock converse API
    - Configure Amazon Nova Pro model (amazon.nova-pro-v1:0)
    - Implement prompt engineering for behavioral questions covering six categories
    - Add 3-second timeout enforcement
    - Parse and validate Bedrock responses
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 2.2 Create AICoach class with STAR analysis
    - Implement analyzeResponse() method using Bedrock converse API
    - Configure Amazon Nova Pro model (amazon.nova-pro-v1:0)
    - Implement structured prompt for STAR analysis
    - Parse STAR component presence (present/partial/missing)
    - Extract strengths, improvements, and 2-3 actionable tips
    - Add 5-second timeout enforcement
    - Use encouraging language appropriate for college students
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 2.3 Create TranscriptionService class with AWS Transcribe WebSocket streaming
    - Implement connect() method to establish WebSocket connection
    - Configure Transcribe stream (en-US, 16kHz PCM)
    - Implement startStreaming() to send audio chunks
    - Implement stopStreaming() to close connection and return final transcription
    - Add audio format conversion (browser format to PCM 16kHz mono)
    - Implement event handlers for transcript events
    - Buffer partial transcripts and emit complete phrases
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ]* 2.4 Write property-based tests for AWS services
    - **Property 1: Question Generation Latency** (Requirements 1.1)
    - **Property 2: Question Category Coverage** (Requirements 1.3)
    - **Property 4: Transcription Display Latency** (Requirements 3.2)
    - **Property 5: Transcription Persistence** (Requirements 3.5)
    - **Property 6: Complete STAR Analysis** (Requirements 4.3, 4.4)
    - **Property 7: Analysis Latency** (Requirements 4.5)
    - **Property 8: Feedback Strengths Presence** (Requirements 5.2)
    - **Property 9: Feedback Improvements Presence** (Requirements 5.3)
    - **Property 10: Actionable Tips Count** (Requirements 5.4)
  
  - [ ]* 2.5 Write unit tests for AWS services
    - Test question generation with mocked Bedrock responses
    - Test STAR analysis with sample transcriptions
    - Test WebSocket connection and audio streaming
    - Test timeout and error handling for all services
    - _Requirements: 1.1, 1.2, 3.1, 3.3, 3.4, 4.1, 4.2_

- [ ] 3. Implement session management and utilities
  - [x] 3.1 Create PracticeSessionManager class
    - Implement session state management (idle/starting/active/stopping)
    - Implement startSession() with microphone permission request
    - Implement stopSession() returning SessionResult
    - Coordinate with TranscriptionService for audio streaming
    - Manage MediaRecorder lifecycle
    - Track elapsed time with 1-second granularity
    - Handle microphone access errors gracefully
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 8.1, 8.2, 8.3, 8.4_
  
  - [x] 3.2 Create timer formatting utility and error handling
    - Implement formatTimer() utility function (MM:SS format with zero-padding)
    - Define ErrorState interface and error types
    - Create error message mapping for user-facing messages
    - Implement error logging function with structured data (timestamp, error type, context)
    - _Requirements: 6.2, 8.2, 9.1, 9.2, 9.4, 10.1, 10.2, 10.3, 10.4_
  
  - [ ]* 3.3 Write property-based tests for session management
    - **Property 3: Button State Consistency** (Requirements 2.4, 2.5)
    - **Property 11: Timer Update Frequency** (Requirements 6.1)
    - **Property 12: Timer Format Compliance** (Requirements 6.2)
    - **Property 13: Error Logging Completeness** (Requirements 10.4)
  
  - [ ]* 3.4 Write unit tests for session management
    - Test session lifecycle transitions
    - Test microphone permission request flow
    - Test timer initialization, updates, and reset
    - Test error handling and logging
    - _Requirements: 2.1, 2.2, 2.3, 6.2, 8.2, 9.1, 9.2, 10.1, 10.2, 10.4_

- [ ] 4. Implement React UI components
  - [x] 4.1 Create InterviewCoach main component
    - Set up component state (question, sessionState, elapsedTime, liveTranscription, feedback, error)
    - Implement component lifecycle and state management
    - Integrate QuestionGenerator, PracticeSessionManager, and AICoach services
    - Handle user interactions (generate question, start/stop session)
    - Update UI based on state changes
    - _Requirements: 1.5, 2.1, 2.3, 3.2, 4.1, 5.1, 7.3_
  
  - [ ] 4.2 Create display components
    - QuestionDisplay: Display generated question text with loading state
    - ControlButtons: Generate Question, Start Practice Session, Stop Session buttons with proper enable/disable logic
    - TranscriptionDisplay: Display live transcription with auto-scroll
    - SessionTimer: Display elapsed time in MM:SS format, update every second
    - FeedbackPanel: Display STAR analysis, strengths, improvements, and actionable tips
    - ErrorDisplay: Display error messages with retry button for retryable errors
    - _Requirements: 1.5, 2.4, 2.5, 3.2, 3.5, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 8.2, 9.1, 9.2, 9.3, 10.1, 10.2, 10.3_
  
  - [ ]* 4.3 Write unit tests for React components
    - Test InterviewCoach component state management
    - Test button enable/disable logic
    - Test error display rendering
    - Test feedback display rendering
    - Test timer display updates
    - Test transcription display updates
    - _Requirements: 2.4, 2.5, 3.2, 5.1, 6.1, 7.3_

- [ ] 5. Implement styling and integration
  - [x] 5.1 Create CSS styling
    - Apply black and white color scheme throughout
    - Add adequate white space between components
    - Implement minimalist design aesthetic
    - Ensure responsive layout
    - Style all buttons, text areas, and panels
    - _Requirements: 7.1, 7.2, 7.5_
  
  - [x] 5.2 Wire all components together
    - Connect QuestionGenerator to Generate Question button
    - Connect PracticeSessionManager to Start/Stop buttons
    - Connect TranscriptionService to live transcription display
    - Connect AICoach to feedback display
    - Wire error handlers to ErrorDisplay component
    - Ensure proper cleanup on component unmount
    - _Requirements: 1.1, 2.1, 2.3, 3.1, 3.2, 4.1, 5.1_

- [ ] 6. End-to-end testing and validation
  - Test complete user flow: generate question → start session → transcribe → stop → analyze → display feedback
  - Test error scenarios at each step (microphone denied, transcription failure, AI service errors)
  - Verify state transitions and UI updates
  - Verify all property-based tests pass (if implemented)
  - Verify all unit tests pass (if implemented)
  - _Requirements: 1.1, 2.1, 2.3, 3.1, 4.1, 5.1, 8.2, 9.1, 9.2, 10.1, 10.2_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property-based tests use fast-check library with minimum 100 iterations
- All property tests include comment tags referencing design document properties
- AWS credentials are loaded from environment using default credential provider chain
- Microphone access requires HTTPS or localhost for browser security
- WebSocket connection to AWS Transcribe requires proper IAM permissions
