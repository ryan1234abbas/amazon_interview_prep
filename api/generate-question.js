const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

const categories = [
  'leadership',
  'teamwork',
  'conflict-resolution',
  'problem-solving',
  'failure-learning',
  'time-management',
];

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
    const category = categories[Math.floor(Math.random() * categories.length)];

    const prompt = `Generate a single behavioral interview question suitable for college students or entry-level candidates. 
The question should be about ${category} and should encourage them to draw from academic projects, internships, part-time jobs, volunteer work, or extracurricular activities.

Requirements:
- Start with "Tell me about a time when..." or "Describe a situation where..."
- Be specific and focused on one scenario
- Be appropriate for someone with limited professional experience
- Be clear and concise (1-2 sentences)

Generate only the question text, nothing else.`;

    const command = new ConverseCommand({
      modelId: 'amazon.nova-pro-v1:0',
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
    const questionText = response.output.message.content[0].text.trim();

    res.status(200).json({
      question: questionText,
      category: category,
    });
  } catch (error) {
    console.error('Error generating question:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      hasCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
      region: process.env.AWS_REGION,
    });
    res.status(500).json({ 
      error: 'Failed to generate question',
      details: error.message,
      hasCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
    });
  }
};
