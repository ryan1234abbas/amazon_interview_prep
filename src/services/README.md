# Services

This directory contains service classes that handle business logic and external integrations.

## QuestionGenerator

The `QuestionGenerator` class generates behavioral interview questions using AWS Bedrock with the Amazon Nova Pro model.

### Usage

```typescript
import { QuestionGenerator } from './services';

const generator = new QuestionGenerator();

try {
  const result = await generator.generateQuestion();
  console.log(`Question: ${result.question}`);
  console.log(`Category: ${result.category}`);
} catch (error) {
  console.error('Failed to generate question:', error);
}
```

### Features

- Generates questions appropriate for college students and entry-level candidates
- Covers six categories: leadership, teamwork, conflict resolution, problem-solving, failure/learning, and time management
- 3-second timeout enforcement (Requirement 1.1)
- Uses AWS Bedrock with Amazon Nova Pro model (amazon.nova-pro-v1:0) (Requirement 1.2)
- Returns both question text and category for tracking diversity

### Requirements Satisfied

- **1.1**: Generate questions within 3 seconds
- **1.2**: Use AWS Bedrock with Amazon Nova Pro model
- **1.3**: Cover six question categories
- **1.4**: Questions appropriate for college students and entry-level candidates

### Error Handling

The `generateQuestion()` method throws an error if:
- Question generation times out after 3 seconds
- AWS Bedrock returns an invalid response format
- The generated question is empty or too short
- AWS Bedrock service is unavailable

### Testing

Unit tests are available in `QuestionGenerator.test.ts` and cover:
- Successful question generation
- Timeout handling
- Error scenarios
- Response validation
- Category diversity
