/**
 * AICoach Service
 * 
 * Analyzes transcribed interview responses for STAR format compliance and provides
 * constructive feedback. Uses AWS Bedrock with Amazon Nova Pro model to identify
 * presence of Situation, Task, Action, and Result components, and generates
 * encouraging feedback with strengths, improvements, and actionable tips.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.2, 5.3, 5.4, 5.5
 */

import { API_BASE_URL } from '../config/aws';
import { Feedback } from '../types';

/**
 * Timeout for response analysis (5 seconds as per requirement 4.5)
 */
const ANALYSIS_TIMEOUT_MS = 5000;

/**
 * AICoach class handles analysis of interview responses using AWS Bedrock
 * with Amazon Nova Pro model.
 */
export class AICoach {
  /**
   * Analyzes a transcribed interview response for STAR format compliance
   * and generates constructive feedback.
   * 
   * @param question - The behavioral interview question that was asked
   * @param transcription - The user's transcribed response
   * @returns Promise resolving to Feedback with STAR analysis and coaching tips
   * @throws Error if analysis fails or times out after 5 seconds
   */
  async analyzeResponse(question: string, transcription: string): Promise<Feedback> {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Response analysis timed out after 5 seconds'));
      }, ANALYSIS_TIMEOUT_MS);
    });

    // Create analysis promise
    const analysisPromise = this.performAnalysis(question, transcription);

    // Race between analysis and timeout
    try {
      return await Promise.race([analysisPromise, timeoutPromise]);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to analyze response: ${error.message}`);
      }
      throw new Error('Failed to analyze response: Unknown error');
    }
  }

  /**
   * Performs the actual response analysis using backend API
   */
  private async performAnalysis(question: string, transcription: string): Promise<Feedback> {
    const response = await fetch(`${API_BASE_URL}/api/analyze-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        transcription,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const feedback = await response.json();
    
    // Validate the feedback structure
    if (!feedback.starAnalysis || !feedback.strengths || !feedback.improvements || !feedback.actionableTips) {
      throw new Error('Invalid feedback structure from server');
    }

    return feedback;
  }
}
