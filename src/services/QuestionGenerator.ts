/**
 * QuestionGenerator Service
 * 
 * Generates behavioral interview questions using AWS Bedrock with Amazon Nova Pro model.
 * Questions are appropriate for college students and entry-level candidates,
 * covering six categories: leadership, teamwork, conflict resolution, problem-solving,
 * failure/learning, and time management.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import { API_BASE_URL } from '../config/aws';
import { GeneratedQuestion } from '../types';

/**
 * Timeout for question generation (3 seconds as per requirement 1.1)
 */
const GENERATION_TIMEOUT_MS = 3000;

/**
 * QuestionGenerator class handles behavioral interview question generation
 * using AWS Bedrock with Amazon Nova Pro model.
 */
export class QuestionGenerator {
  /**
   * Generates a behavioral interview question appropriate for college students
   * and entry-level candidates.
   * 
   * @returns Promise resolving to a GeneratedQuestion with question text and category
   * @throws Error if generation fails or times out after 3 seconds
   */
  async generateQuestion(): Promise<GeneratedQuestion> {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Question generation timed out after 3 seconds'));
      }, GENERATION_TIMEOUT_MS);
    });

    // Create generation promise
    const generationPromise = this.performGeneration();

    // Race between generation and timeout
    try {
      return await Promise.race([generationPromise, timeoutPromise]);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to generate question: ${error.message}`);
      }
      throw new Error('Failed to generate question: Unknown error');
    }
  }

  /**
   * Performs the actual question generation using backend API
   */
  private async performGeneration(): Promise<GeneratedQuestion> {
    const response = await fetch(`${API_BASE_URL}/api/generate-question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      question: data.question,
      category: data.category,
    };
  }
}
