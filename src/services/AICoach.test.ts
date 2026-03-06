/**
 * Unit tests for AICoach
 * 
 * Tests response analysis with mocked Bedrock responses,
 * timeout handling, STAR analysis validation, and error scenarios.
 */

import { AICoach } from './AICoach';
import { bedrockClient } from '../config/aws';
import { ComponentPresence } from '../types';

// Mock the AWS SDK
jest.mock('../config/aws', () => ({
  bedrockClient: {
    send: jest.fn(),
  },
  NOVA_PRO_MODEL_ID: 'amazon.nova-pro-v1:0',
}));

describe('AICoach', () => {
  let coach: AICoach;
  let mockSend: jest.Mock;

  const sampleQuestion = 'Tell me about a time when you led a team project.';
  const sampleTranscription = 'In my software engineering class, I led a team of four students to build a web application. We had to deliver it in six weeks. I organized weekly meetings, delegated tasks based on each member\'s strengths, and we successfully launched the app on time with all features working.';

  beforeEach(() => {
    coach = new AICoach();
    mockSend = bedrockClient.send as jest.Mock;
    jest.clearAllMocks();
  });

  describe('analyzeResponse', () => {
    it('should analyze response and return valid feedback', async () => {
      // Mock successful Bedrock response
      mockSend.mockResolvedValueOnce({
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  starAnalysis: {
                    situation: 'present',
                    task: 'present',
                    action: 'present',
                    result: 'present',
                  },
                  strengths: ['Clear description of the project context', 'Good leadership approach'],
                  improvements: ['Could provide more specific metrics for success'],
                  actionableTips: [
                    'Include specific numbers or metrics when describing results',
                    'Describe any challenges you overcame during the project',
                  ],
                }),
              },
            ],
          },
        },
      });

      const result = await coach.analyzeResponse(sampleQuestion, sampleTranscription);

      expect(result).toHaveProperty('starAnalysis');
      expect(result).toHaveProperty('strengths');
      expect(result).toHaveProperty('improvements');
      expect(result).toHaveProperty('actionableTips');

      // Validate STAR analysis structure
      expect(result.starAnalysis).toHaveProperty('situation');
      expect(result.starAnalysis).toHaveProperty('task');
      expect(result.starAnalysis).toHaveProperty('action');
      expect(result.starAnalysis).toHaveProperty('result');

      // Validate feedback requirements
      expect(result.strengths.length).toBeGreaterThanOrEqual(1);
      expect(result.improvements.length).toBeGreaterThanOrEqual(1);
      expect(result.actionableTips.length).toBeGreaterThanOrEqual(2);
      expect(result.actionableTips.length).toBeLessThanOrEqual(3);
    });

    it('should call Bedrock with correct model and parameters', async () => {
      mockSend.mockResolvedValueOnce({
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  starAnalysis: {
                    situation: 'present',
                    task: 'present',
                    action: 'partial',
                    result: 'missing',
                  },
                  strengths: ['Good start'],
                  improvements: ['Add more detail about results'],
                  actionableTips: ['Tip 1', 'Tip 2'],
                }),
              },
            ],
          },
        },
      });

      await coach.analyzeResponse(sampleQuestion, sampleTranscription);

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
        maxTokens: 1000,
        temperature: 0.7,
      });
    });

    it('should include question and transcription in prompt', async () => {
      mockSend.mockResolvedValueOnce({
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  starAnalysis: {
                    situation: 'present',
                    task: 'present',
                    action: 'present',
                    result: 'present',
                  },
                  strengths: ['Great response'],
                  improvements: ['None needed'],
                  actionableTips: ['Keep it up', 'Practice more'],
                }),
              },
            ],
          },
        },
      });

      await coach.analyzeResponse(sampleQuestion, sampleTranscription);

      const command = mockSend.mock.calls[0][0];
      // @ts-ignore - accessing command input for testing
      const prompt = command.input.messages[0].content[0].text;

      expect(prompt).toContain(sampleQuestion);
      expect(prompt).toContain(sampleTranscription);
      expect(prompt).toContain('STAR');
      expect(prompt).toContain('college student');
    });

    it('should validate all STAR components are present', async () => {
      mockSend.mockResolvedValueOnce({
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  starAnalysis: {
                    situation: 'partial',
                    task: 'missing',
                    action: 'present',
                    result: 'partial',
                  },
                  strengths: ['Good action description'],
                  improvements: ['Add more context about the task'],
                  actionableTips: ['Describe the specific goal', 'Quantify your results'],
                }),
              },
            ],
          },
        },
      });

      const result = await coach.analyzeResponse(sampleQuestion, sampleTranscription);

      const validValues: ComponentPresence[] = ['present', 'partial', 'missing'];
      expect(validValues).toContain(result.starAnalysis.situation);
      expect(validValues).toContain(result.starAnalysis.task);
      expect(validValues).toContain(result.starAnalysis.action);
      expect(validValues).toContain(result.starAnalysis.result);
    });

    it('should timeout after 5 seconds', async () => {
      // Mock a slow response that takes longer than 5 seconds
      mockSend.mockImplementationOnce(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              output: {
                message: {
                  content: [
                    {
                      text: JSON.stringify({
                        starAnalysis: {
                          situation: 'present',
                          task: 'present',
                          action: 'present',
                          result: 'present',
                        },
                        strengths: ['Too slow'],
                        improvements: ['Speed up'],
                        actionableTips: ['Tip 1', 'Tip 2'],
                      }),
                    },
                  ],
                },
              },
            });
          }, 6000); // 6 seconds - exceeds timeout
        });
      });

      await expect(coach.analyzeResponse(sampleQuestion, sampleTranscription)).rejects.toThrow(
        'Response analysis timed out after 5 seconds'
      );
    }, 7000); // Test timeout of 7 seconds

    it('should handle invalid response format', async () => {
      mockSend.mockResolvedValueOnce({
        output: {
          message: {
            content: [],
          },
        },
      });

      await expect(coach.analyzeResponse(sampleQuestion, sampleTranscription)).rejects.toThrow(
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

      await expect(coach.analyzeResponse(sampleQuestion, sampleTranscription)).rejects.toThrow(
        'No text content in Bedrock response'
      );
    });

    it('should handle invalid JSON in response', async () => {
      mockSend.mockResolvedValueOnce({
        output: {
          message: {
            content: [{ text: 'This is not valid JSON' }],
          },
        },
      });

      await expect(coach.analyzeResponse(sampleQuestion, sampleTranscription)).rejects.toThrow(
        'Failed to analyze response'
      );
    });

    it('should extract JSON from response with extra text', async () => {
      mockSend.mockResolvedValueOnce({
        output: {
          message: {
            content: [
              {
                text: `Here is the analysis:
                
                ${JSON.stringify({
                  starAnalysis: {
                    situation: 'present',
                    task: 'present',
                    action: 'present',
                    result: 'present',
                  },
                  strengths: ['Excellent response'],
                  improvements: ['Minor improvements needed'],
                  actionableTips: ['Keep practicing', 'Focus on metrics'],
                })}
                
                Hope this helps!`,
              },
            ],
          },
        },
      });

      const result = await coach.analyzeResponse(sampleQuestion, sampleTranscription);

      expect(result.starAnalysis.situation).toBe('present');
      expect(result.strengths).toContain('Excellent response');
    });

    it('should reject feedback with missing STAR analysis', async () => {
      mockSend.mockResolvedValueOnce({
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  strengths: ['Good'],
                  improvements: ['Better'],
                  actionableTips: ['Tip 1', 'Tip 2'],
                }),
              },
            ],
          },
        },
      });

      await expect(coach.analyzeResponse(sampleQuestion, sampleTranscription)).rejects.toThrow(
        'Missing or invalid starAnalysis in response'
      );
    });

    it('should reject feedback with invalid STAR component value', async () => {
      mockSend.mockResolvedValueOnce({
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  starAnalysis: {
                    situation: 'present',
                    task: 'invalid-value',
                    action: 'present',
                    result: 'present',
                  },
                  strengths: ['Good'],
                  improvements: ['Better'],
                  actionableTips: ['Tip 1', 'Tip 2'],
                }),
              },
            ],
          },
        },
      });

      await expect(coach.analyzeResponse(sampleQuestion, sampleTranscription)).rejects.toThrow(
        'Invalid task value'
      );
    });

    it('should reject feedback with no strengths', async () => {
      mockSend.mockResolvedValueOnce({
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  starAnalysis: {
                    situation: 'present',
                    task: 'present',
                    action: 'present',
                    result: 'present',
                  },
                  strengths: [],
                  improvements: ['Better'],
                  actionableTips: ['Tip 1', 'Tip 2'],
                }),
              },
            ],
          },
        },
      });

      await expect(coach.analyzeResponse(sampleQuestion, sampleTranscription)).rejects.toThrow(
        'Feedback must include at least one strength'
      );
    });

    it('should reject feedback with no improvements', async () => {
      mockSend.mockResolvedValueOnce({
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  starAnalysis: {
                    situation: 'present',
                    task: 'present',
                    action: 'present',
                    result: 'present',
                  },
                  strengths: ['Good'],
                  improvements: [],
                  actionableTips: ['Tip 1', 'Tip 2'],
                }),
              },
            ],
          },
        },
      });

      await expect(coach.analyzeResponse(sampleQuestion, sampleTranscription)).rejects.toThrow(
        'Feedback must include at least one improvement'
      );
    });

    it('should reject feedback with fewer than 2 actionable tips', async () => {
      mockSend.mockResolvedValueOnce({
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  starAnalysis: {
                    situation: 'present',
                    task: 'present',
                    action: 'present',
                    result: 'present',
                  },
                  strengths: ['Good'],
                  improvements: ['Better'],
                  actionableTips: ['Only one tip'],
                }),
              },
            ],
          },
        },
      });

      await expect(coach.analyzeResponse(sampleQuestion, sampleTranscription)).rejects.toThrow(
        'Feedback must include between 2 and 3 actionable tips'
      );
    });

    it('should reject feedback with more than 3 actionable tips', async () => {
      mockSend.mockResolvedValueOnce({
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  starAnalysis: {
                    situation: 'present',
                    task: 'present',
                    action: 'present',
                    result: 'present',
                  },
                  strengths: ['Good'],
                  improvements: ['Better'],
                  actionableTips: ['Tip 1', 'Tip 2', 'Tip 3', 'Tip 4'],
                }),
              },
            ],
          },
        },
      });

      await expect(coach.analyzeResponse(sampleQuestion, sampleTranscription)).rejects.toThrow(
        'Feedback must include between 2 and 3 actionable tips'
      );
    });

    it('should accept feedback with exactly 2 actionable tips', async () => {
      mockSend.mockResolvedValueOnce({
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  starAnalysis: {
                    situation: 'present',
                    task: 'present',
                    action: 'present',
                    result: 'present',
                  },
                  strengths: ['Good'],
                  improvements: ['Better'],
                  actionableTips: ['Tip 1', 'Tip 2'],
                }),
              },
            ],
          },
        },
      });

      const result = await coach.analyzeResponse(sampleQuestion, sampleTranscription);

      expect(result.actionableTips).toHaveLength(2);
    });

    it('should accept feedback with exactly 3 actionable tips', async () => {
      mockSend.mockResolvedValueOnce({
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  starAnalysis: {
                    situation: 'present',
                    task: 'present',
                    action: 'present',
                    result: 'present',
                  },
                  strengths: ['Good'],
                  improvements: ['Better'],
                  actionableTips: ['Tip 1', 'Tip 2', 'Tip 3'],
                }),
              },
            ],
          },
        },
      });

      const result = await coach.analyzeResponse(sampleQuestion, sampleTranscription);

      expect(result.actionableTips).toHaveLength(3);
    });

    it('should handle Bedrock API errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('Bedrock service unavailable'));

      await expect(coach.analyzeResponse(sampleQuestion, sampleTranscription)).rejects.toThrow(
        'Failed to analyze response: Bedrock service unavailable'
      );
    });

    it('should handle all STAR components as missing', async () => {
      mockSend.mockResolvedValueOnce({
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  starAnalysis: {
                    situation: 'missing',
                    task: 'missing',
                    action: 'missing',
                    result: 'missing',
                  },
                  strengths: ['You attempted to answer the question'],
                  improvements: ['Include all STAR components in your response'],
                  actionableTips: [
                    'Start by describing the situation and context',
                    'Explain what specific task or goal you had',
                    'Detail the actions you took',
                  ],
                }),
              },
            ],
          },
        },
      });

      const result = await coach.analyzeResponse(sampleQuestion, 'I did some work.');

      expect(result.starAnalysis.situation).toBe('missing');
      expect(result.starAnalysis.task).toBe('missing');
      expect(result.starAnalysis.action).toBe('missing');
      expect(result.starAnalysis.result).toBe('missing');
      expect(result.strengths.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle mixed STAR component presence', async () => {
      mockSend.mockResolvedValueOnce({
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  starAnalysis: {
                    situation: 'present',
                    task: 'partial',
                    action: 'present',
                    result: 'missing',
                  },
                  strengths: ['Clear situation description', 'Detailed actions'],
                  improvements: ['Clarify the specific task', 'Add measurable results'],
                  actionableTips: [
                    'Be more specific about what you were trying to achieve',
                    'Include numbers or metrics to show the impact of your actions',
                  ],
                }),
              },
            ],
          },
        },
      });

      const result = await coach.analyzeResponse(sampleQuestion, sampleTranscription);

      expect(result.starAnalysis.situation).toBe('present');
      expect(result.starAnalysis.task).toBe('partial');
      expect(result.starAnalysis.action).toBe('present');
      expect(result.starAnalysis.result).toBe('missing');
    });
  });
});
