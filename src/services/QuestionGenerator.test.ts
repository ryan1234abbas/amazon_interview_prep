/**
 * Unit tests for QuestionGenerator
 * 
 * Tests question generation with mocked Bedrock responses,
 * timeout handling, and error scenarios.
 */

import { QuestionGenerator } from './QuestionGenerator';
import { bedrockClient } from '../config/aws';
import { QuestionCategory } from '../types';

// Mock the AWS SDK
jest.mock('../config/aws', () => ({
  bedrockClient: {
    send: jest.fn(),
  },
  NOVA_PRO_MODEL_ID: 'amazon.nova-pro-v1:0',
}));

describe('QuestionGenerator', () => {
  let generator: QuestionGenerator;
  let mockSend: jest.Mock;

  beforeEach(() => {
    generator = new QuestionGenerator();
    mockSend = bedrockClient.send as jest.Mock;
    jest.clearAllMocks();
  });

  describe('generateQuestion', () => {
    it('should generate a valid question with category', async () => {
      // Mock successful Bedrock response
      mockSend.mockResolvedValueOnce({
        output: {
          message: {
            content: [
              {
                text: 'Tell me about a time when you led a team project and faced unexpected challenges.',
              },
            ],
          },
        },
      });

      const result = await generator.generateQuestion();

      expect(result).toHaveProperty('question');
      expect(result).toHaveProperty('category');
      expect(typeof result.question).toBe('string');
      expect(result.question.length).toBeGreaterThan(10);
      
      // Verify category is one of the valid categories
      const validCategories: QuestionCategory[] = [
        'leadership',
        'teamwork',
        'conflict-resolution',
        'problem-solving',
        'failure-learning',
        'time-management',
      ];
      expect(validCategories).toContain(result.category);
    });

    it('should call Bedrock with correct model and parameters', async () => {
      mockSend.mockResolvedValueOnce({
        output: {
          message: {
            content: [{ text: 'Describe a situation where you worked effectively in a team.' }],
          },
        },
      });

      await generator.generateQuestion();

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      
      // @ts-ignore - accessing command input for testing
      expect(command.input.modelId).toBe('amazon.nova-pro-v1:0');
      // @ts-ignore
      expect(command.input.messages).toHaveLength(1);
      // @ts-ignore
      expect(command.input.messages[0].role).toBe('user');
      // @ts-ignore
      expect(command.input.messages[0].content[0]).toHaveProperty('text');
      // @ts-ignore
      expect(command.input.inferenceConfig).toEqual({
        maxTokens: 200,
        temperature: 0.7,
      });
    });

    it('should generate questions for different categories', async () => {
      const categories = new Set<QuestionCategory>();
      
      // Generate multiple questions to see different categories
      for (let i = 0; i < 20; i++) {
        mockSend.mockResolvedValueOnce({
          output: {
            message: {
              content: [{ text: `Sample question ${i}` }],
            },
          },
        });

        const result = await generator.generateQuestion();
        categories.add(result.category);
      }

      // With 20 attempts, we should see multiple categories
      expect(categories.size).toBeGreaterThan(1);
    });

    it('should timeout after 3 seconds', async () => {
      // Mock a slow response that takes longer than 3 seconds
      mockSend.mockImplementationOnce(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              output: {
                message: {
                  content: [{ text: 'This response is too slow' }],
                },
              },
            });
          }, 4000); // 4 seconds - exceeds timeout
        });
      });

      await expect(generator.generateQuestion()).rejects.toThrow(
        'Question generation timed out after 3 seconds'
      );
    }, 5000); // Test timeout of 5 seconds

    it('should handle invalid response format', async () => {
      mockSend.mockResolvedValueOnce({
        output: {
          message: {
            content: [],
          },
        },
      });

      await expect(generator.generateQuestion()).rejects.toThrow(
        'No content in Bedrock response'
      );
    });

    it('should handle missing text content', async () => {
      mockSend.mockResolvedValueOnce({
        output: {
          message: {
            content: [{ image: 'some-image-data' }],
          },
        },
      });

      await expect(generator.generateQuestion()).rejects.toThrow(
        'No text content in Bedrock response'
      );
    });

    it('should handle empty question text', async () => {
      mockSend.mockResolvedValueOnce({
        output: {
          message: {
            content: [{ text: '   ' }],
          },
        },
      });

      await expect(generator.generateQuestion()).rejects.toThrow(
        'Generated question is empty'
      );
    });

    it('should handle question text that is too short', async () => {
      mockSend.mockResolvedValueOnce({
        output: {
          message: {
            content: [{ text: 'Short' }],
          },
        },
      });

      await expect(generator.generateQuestion()).rejects.toThrow(
        'Generated question is too short'
      );
    });

    it('should handle Bedrock API errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('Bedrock service unavailable'));

      await expect(generator.generateQuestion()).rejects.toThrow(
        'Failed to generate question: Bedrock service unavailable'
      );
    });

    it('should trim whitespace from generated questions', async () => {
      mockSend.mockResolvedValueOnce({
        output: {
          message: {
            content: [
              {
                text: '  Tell me about a time when you demonstrated leadership.  \n',
              },
            ],
          },
        },
      });

      const result = await generator.generateQuestion();

      expect(result.question).toBe('Tell me about a time when you demonstrated leadership.');
      expect(result.question).not.toMatch(/^\s/);
      expect(result.question).not.toMatch(/\s$/);
    });

    it('should include appropriate prompt for college students', async () => {
      mockSend.mockResolvedValueOnce({
        output: {
          message: {
            content: [{ text: 'Sample question for testing' }],
          },
        },
      });

      await generator.generateQuestion();

      const command = mockSend.mock.calls[0][0];
      // @ts-ignore - accessing command input for testing
      const prompt = command.input.messages[0].content[0].text;

      expect(prompt).toContain('college students or entry-level candidates');
      expect(prompt).toContain('academic projects, internships, part-time jobs, volunteer work, or extracurricular activities');
    });
  });
});
