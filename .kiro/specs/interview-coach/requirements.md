# Requirements Document

## Introduction

The Interview Coach is an AI-powered application that helps college students practice behavioral interview questions and receive structured feedback using the STAR format (Situation, Task, Action, Result). The system generates realistic behavioral questions, captures spoken responses through real-time transcription, and provides constructive coaching feedback to help students improve their interview skills.

## Glossary

- **Interview_Coach**: The complete application system that generates questions, captures responses, and provides feedback
- **Question_Generator**: The component that creates behavioral interview questions using AWS Bedrock
- **Practice_Session**: A timed recording session where the user speaks their answer to a behavioral question
- **Transcription_Service**: The component that converts spoken audio to text in real-time using AWS Transcribe
- **AI_Coach**: The component that analyzes transcribed responses and provides STAR-based feedback using AWS Bedrock
- **STAR_Format**: A structured response framework consisting of Situation, Task, Action, and Result components
- **User**: A college student or entry-level candidate practicing interview skills
- **Behavioral_Question**: An interview question that asks about past experiences and behaviors
- **Session_Timer**: A display showing elapsed time during a practice session
- **Feedback_Panel**: The UI component that displays AI coach analysis after a session

## Requirements

### Requirement 1: Generate Behavioral Interview Questions

**User Story:** As a user, I want to generate realistic behavioral interview questions on demand, so that I can practice answering different types of questions.

#### Acceptance Criteria

1. WHEN the user clicks the Generate Question button, THE Question_Generator SHALL create a behavioral interview question within 3 seconds
2. THE Question_Generator SHALL use AWS Bedrock with Amazon Nova Pro model (amazon.nova-pro-v1:0)
3. THE Question_Generator SHALL produce questions covering at least six categories: leadership, teamwork, conflict resolution, problem-solving, failure/learning, and time management
4. THE Question_Generator SHALL create questions appropriate for college students and entry-level candidates
5. THE Interview_Coach SHALL display the generated question in the question display area

### Requirement 2: Start and Stop Practice Sessions

**User Story:** As a user, I want to control when my practice session starts and stops, so that I can record my response when I'm ready.

#### Acceptance Criteria

1. WHEN the user clicks the Start Practice Session button, THE Interview_Coach SHALL begin capturing audio from the user's microphone
2. WHEN a practice session starts, THE Session_Timer SHALL begin counting elapsed time in seconds
3. WHEN the user clicks the Stop Session button, THE Interview_Coach SHALL stop capturing audio and end the practice session
4. WHILE a practice session is active, THE Interview_Coach SHALL disable the Start Practice Session button
5. WHILE no practice session is active, THE Interview_Coach SHALL disable the Stop Session button

### Requirement 3: Real-Time Audio Transcription

**User Story:** As a user, I want to see my words transcribed in real-time as I speak, so that I can verify what's being captured.

#### Acceptance Criteria

1. WHEN a practice session is active, THE Transcription_Service SHALL stream audio to AWS Transcribe via WebSocket
2. WHEN transcription data is received, THE Interview_Coach SHALL display the transcribed text in the live transcription display within 1 second
3. THE Transcription_Service SHALL maintain a WebSocket connection for bidirectional communication during the session
4. WHEN the practice session stops, THE Transcription_Service SHALL close the WebSocket connection
5. THE Interview_Coach SHALL preserve the complete transcription after the session ends

### Requirement 4: Analyze Response Using STAR Format

**User Story:** As a user, I want my response analyzed for STAR format compliance, so that I can understand which components I included or missed.

#### Acceptance Criteria

1. WHEN a practice session ends, THE AI_Coach SHALL analyze the transcribed response for STAR format compliance
2. THE AI_Coach SHALL use AWS Bedrock with Amazon Nova Pro model (amazon.nova-pro-v1:0)
3. THE AI_Coach SHALL identify the presence or absence of each STAR component: Situation, Task, Action, and Result
4. FOR each STAR component, THE AI_Coach SHALL determine whether the component is present, partially present, or missing
5. THE AI_Coach SHALL complete the analysis within 5 seconds of session end

### Requirement 5: Provide Constructive Feedback

**User Story:** As a user, I want to receive encouraging and actionable feedback on my response, so that I can improve my interview skills.

#### Acceptance Criteria

1. WHEN the AI_Coach completes analysis, THE Interview_Coach SHALL display feedback in the Feedback_Panel
2. THE AI_Coach SHALL provide at least one strength that the user demonstrated in their response
3. THE AI_Coach SHALL identify specific areas for improvement based on missing or weak STAR components
4. THE AI_Coach SHALL provide between 2 and 3 actionable tips for improving the response
5. THE AI_Coach SHALL use encouraging and constructive language appropriate for coaching college students

### Requirement 6: Display Session Timer

**User Story:** As a user, I want to see how long I've been speaking, so that I can manage my response length appropriately.

#### Acceptance Criteria

1. WHILE a practice session is active, THE Session_Timer SHALL update the displayed time every second
2. THE Session_Timer SHALL display elapsed time in minutes and seconds format (MM:SS)
3. WHEN a practice session starts, THE Session_Timer SHALL reset to 00:00
4. WHEN a practice session stops, THE Session_Timer SHALL display the final session duration

### Requirement 7: User Interface Design

**User Story:** As a user, I want a clean and intuitive interface, so that I can focus on practicing without distraction.

#### Acceptance Criteria

1. THE Interview_Coach SHALL use a black and white color scheme throughout the interface
2. THE Interview_Coach SHALL provide adequate white space between UI components for visual clarity
3. THE Interview_Coach SHALL display all required components: question display area, Generate Question button, Start Practice Session button, Stop Session button, live transcription display, Session_Timer, and Feedback_Panel
4. THE Interview_Coach SHALL use simple and intuitive navigation patterns
5. THE Interview_Coach SHALL maintain a minimalist design aesthetic

### Requirement 8: Handle Microphone Access

**User Story:** As a user, I want the application to request microphone access appropriately, so that I can grant permission to record my responses.

#### Acceptance Criteria

1. WHEN the user first clicks Start Practice Session, THE Interview_Coach SHALL request microphone access from the browser
2. IF microphone access is denied, THEN THE Interview_Coach SHALL display an error message explaining that microphone access is required
3. IF microphone access is granted, THEN THE Interview_Coach SHALL proceed with starting the practice session
4. WHEN microphone access is already granted, THE Interview_Coach SHALL start the session without additional prompts

### Requirement 9: Handle Transcription Errors

**User Story:** As a user, I want to be notified if transcription fails, so that I can retry my practice session.

#### Acceptance Criteria

1. IF the WebSocket connection to AWS Transcribe fails, THEN THE Interview_Coach SHALL display an error message to the user
2. IF transcription stops unexpectedly during a session, THEN THE Interview_Coach SHALL notify the user and end the session
3. WHEN a transcription error occurs, THE Interview_Coach SHALL allow the user to start a new practice session
4. IF no audio is detected during a practice session, THEN THE Interview_Coach SHALL display a message prompting the user to check their microphone

### Requirement 10: Handle AI Service Errors

**User Story:** As a user, I want to be notified if question generation or feedback analysis fails, so that I understand what went wrong.

#### Acceptance Criteria

1. IF the Question_Generator fails to generate a question, THEN THE Interview_Coach SHALL display an error message and allow the user to retry
2. IF the AI_Coach fails to analyze a response, THEN THE Interview_Coach SHALL display an error message and preserve the transcription for user review
3. WHEN AWS Bedrock is unavailable, THE Interview_Coach SHALL provide a clear error message indicating the service is temporarily unavailable
4. THE Interview_Coach SHALL log all service errors for debugging purposes
