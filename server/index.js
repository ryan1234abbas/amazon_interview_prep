import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { TranscribeStreamingClient, StartStreamTranscriptionCommand } from '@aws-sdk/client-transcribe-streaming';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/transcribe' });

app.use(cors());
app.use(express.json());

// AWS clients
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
});

const transcribeClient = new TranscribeStreamingClient({
  region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
});

const NOVA_PRO_MODEL_ID = 'amazon.nova-pro-v1:0';

// Question categories
const QUESTION_CATEGORIES = [
  'leadership',
  'teamwork',
  'conflict-resolution',
  'problem-solving',
  'failure-learning',
  'time-management',
];

// Generate question endpoint
app.post('/api/generate-question', async (req, res) => {
  try {
    const category = QUESTION_CATEGORIES[Math.floor(Math.random() * QUESTION_CATEGORIES.length)];
    
    const categoryDescriptions = {
      leadership: 'leadership, taking initiative, or guiding others',
      teamwork: 'collaboration, working with others, or team dynamics',
      'conflict-resolution': 'handling disagreements, resolving conflicts, or managing difficult situations',
      'problem-solving': 'analytical thinking, creative solutions, or overcoming challenges',
      'failure-learning': 'learning from mistakes, handling setbacks, or personal growth',
      'time-management': 'prioritization, meeting deadlines, or managing multiple responsibilities',
    };

    const prompt = `Generate a single behavioral interview question about ${categoryDescriptions[category]}.

The question should:
- Be appropriate for college students or entry-level candidates
- Ask about past experiences or behaviors
- Start with phrases like "Tell me about a time when..." or "Describe a situation where..." or "Give me an example of..."
- Be clear and specific
- Be answerable based on academic projects, internships, part-time jobs, volunteer work, or extracurricular activities

Return ONLY the question text, without any additional explanation or formatting.`;

    const command = new ConverseCommand({
      modelId: NOVA_PRO_MODEL_ID,
      messages: [
        {
          role: 'user',
          content: [{ text: prompt }],
        },
      ],
      inferenceConfig: {
        maxTokens: 200,
        temperature: 0.7,
      },
    });

    const response = await bedrockClient.send(command);
    const question = response.output.message.content[0].text.trim();

    res.json({
      question,
      category,
    });
  } catch (error) {
    console.error('Error generating question:', error);
    res.status(500).json({ error: 'Failed to generate question' });
  }
});

// Analyze response endpoint
app.post('/api/analyze-response', async (req, res) => {
  try {
    const { question, transcription } = req.body;

    if (!question || !transcription) {
      return res.status(400).json({ error: 'Question and transcription are required' });
    }

    const prompt = `You are an encouraging interview coach helping a college student improve their behavioral interview skills. Analyze their response using the STAR format (Situation, Task, Action, Result).

Question: ${question}

Student's Response: ${transcription}

Provide your analysis in the following JSON format:
{
  "starAnalysis": {
    "situation": "present|partial|missing",
    "task": "present|partial|missing",
    "action": "present|partial|missing",
    "result": "present|partial|missing"
  },
  "strengths": ["strength1", "strength2", ...],
  "improvements": ["improvement1", "improvement2", ...],
  "actionableTips": ["tip1", "tip2", "tip3"]
}

Guidelines:
- For each STAR component, determine if it's "present" (clearly described), "partial" (mentioned but lacking detail), or "missing" (not addressed)
- Identify at least one strength in their response (e.g., good detail, clear communication, relevant example)
- Identify specific areas for improvement based on missing or weak STAR components
- Provide exactly 2-3 actionable tips they can use to improve their answer
- Use encouraging, supportive language appropriate for coaching college students
- Be constructive and specific in your feedback

Return ONLY the JSON object, without any additional text or formatting.`;

    const command = new ConverseCommand({
      modelId: NOVA_PRO_MODEL_ID,
      messages: [
        {
          role: 'user',
          content: [{ text: prompt }],
        },
      ],
      inferenceConfig: {
        maxTokens: 1000,
        temperature: 0.7,
      },
    });

    const response = await bedrockClient.send(command);
    const responseText = response.output.message.content[0].text.trim();
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const feedback = JSON.parse(jsonMatch[0]);

    res.json(feedback);
  } catch (error) {
    console.error('Error analyzing response:', error);
    res.status(500).json({ error: 'Failed to analyze response' });
  }
});

// WebSocket for transcription
wss.on('connection', (ws) => {
  console.log('Client connected to transcription WebSocket');
  
  let transcriptionBuffer = '';
  let mockTranscriptionInterval = null;

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      if (data.action === 'start') {
        console.log('Starting transcription stream');
        transcriptionBuffer = '';

        // Check if we should use mock transcription
        if (process.env.USE_MOCK_TRANSCRIPTION === 'true') {
          console.log('Using mock transcription (AWS Transcribe permissions not available)');
          
          // Simulate transcription with mock data
          const mockPhrases = [
            'In my software engineering class',
            'I led a team of four students',
            'to build a web application',
            'We had to deliver it in six weeks',
            'I organized weekly meetings',
            'delegated tasks based on strengths',
            'and we successfully launched on time',
          ];
          
          let phraseIndex = 0;
          mockTranscriptionInterval = setInterval(() => {
            if (phraseIndex < mockPhrases.length) {
              if (transcriptionBuffer.length > 0) {
                transcriptionBuffer += ' ';
              }
              transcriptionBuffer += mockPhrases[phraseIndex];
              
              ws.send(JSON.stringify({
                type: 'transcript',
                text: transcriptionBuffer,
              }));
              
              phraseIndex++;
            } else {
              clearInterval(mockTranscriptionInterval);
            }
          }, 2000); // Add a phrase every 2 seconds
          
          return;
        }

        // Real AWS Transcribe implementation
        // Create async generator for audio chunks
        const audioStream = async function* () {
          ws.on('message', (msg) => {
            const audioData = JSON.parse(msg);
            if (audioData.action === 'audio') {
              // Audio data is base64 encoded PCM
              const audioBuffer = Buffer.from(audioData.data, 'base64');
              return { AudioEvent: { AudioChunk: audioBuffer } };
            }
          });
        };

        const command = new StartStreamTranscriptionCommand({
          LanguageCode: 'en-US',
          MediaSampleRateHertz: 16000,
          MediaEncoding: 'pcm',
          AudioStream: audioStream(),
        });

        const response = await transcribeClient.send(command);

        // Process transcription events
        if (response.TranscriptResultStream) {
          for await (const event of response.TranscriptResultStream) {
            if (event.TranscriptEvent) {
              const results = event.TranscriptEvent.Transcript?.Results;
              
              if (results && results.length > 0) {
                for (const result of results) {
                  if (result.Alternatives && result.Alternatives.length > 0) {
                    const transcript = result.Alternatives[0].Transcript || '';
                    
                    if (!result.IsPartial && transcript.trim().length > 0) {
                      if (transcriptionBuffer.length > 0) {
                        transcriptionBuffer += ' ';
                      }
                      transcriptionBuffer += transcript;

                      // Send update to client
                      ws.send(JSON.stringify({
                        type: 'transcript',
                        text: transcriptionBuffer,
                      }));
                    }
                  }
                }
              }
            }
          }
        }
      } else if (data.action === 'audio') {
        // Audio chunk received - handled by the generator above or ignored in mock mode
      } else if (data.action === 'stop') {
        console.log('Stopping transcription stream');
        
        // Clear mock interval if running
        if (mockTranscriptionInterval) {
          clearInterval(mockTranscriptionInterval);
          mockTranscriptionInterval = null;
        }
        
        ws.send(JSON.stringify({
          type: 'final',
          text: transcriptionBuffer,
        }));
      }
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message,
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected from transcription WebSocket');
    if (mockTranscriptionInterval) {
      clearInterval(mockTranscriptionInterval);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/transcribe`);
});
