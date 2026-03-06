const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

module.exports = async (req, res) => {
  const bedrockClient = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { question, transcription } = req.body;

    if (!question || !transcription) {
      return res.status(400).json({ error: 'Missing question or transcription' });
    }

    const prompt = `You are an interview coach helping a college student improve their behavioral interview responses.

Question: ${question}

Student's Response: ${transcription}

Analyze this response using the STAR method (Situation, Task, Action, Result). For each component, indicate if it is:
- "present" (clearly described with sufficient detail)
- "partial" (mentioned but lacking detail or clarity)
- "missing" (not addressed at all)

Also provide:
- Strengths: What the student did well (at least 1 point)
- Improvements: What could be better (at least 1 point)
- Actionable Tips: Specific, concrete advice for improvement (exactly 2-3 tips)

Remember this is a college student, so be encouraging and constructive.

Respond ONLY with a valid JSON object in this exact format:
{
  "starAnalysis": {
    "situation": "present|partial|missing",
    "task": "present|partial|missing",
    "action": "present|partial|missing",
    "result": "present|partial|missing"
  },
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "actionableTips": ["tip 1", "tip 2", "tip 3"]
}`;

    const command = new ConverseCommand({
      modelId: 'amazon.nova-pro-v1:0',
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
    const responseText = response.output.message.content[0].text;

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const feedback = JSON.parse(jsonMatch[0]);

    res.status(200).json(feedback);
  } catch (error) {
    console.error('Error analyzing response:', error);
    res.status(500).json({ 
      error: 'Failed to analyze response',
      details: error.message 
    });
  }
};
