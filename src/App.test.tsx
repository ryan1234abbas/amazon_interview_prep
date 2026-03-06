import { render, screen } from '@testing-library/react';
import App from './App';

// Mock AWS config
jest.mock('./config/aws', () => ({
  bedrockClient: {},
  transcribeClient: {},
  NOVA_PRO_MODEL_ID: 'amazon.nova-pro-v1:0',
}));

// Mock the services
jest.mock('./services/QuestionGenerator');
jest.mock('./services/PracticeSessionManager');
jest.mock('./services/AICoach');
jest.mock('./services/TranscriptionService');

describe('App', () => {
  it('renders the Interview Coach heading', () => {
    render(<App />);
    const heading = screen.getByText(/Interview Coach/i);
    expect(heading).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<App />);
    const subtitle = screen.getByText(/Practice behavioral interview questions with AI-powered feedback/i);
    expect(subtitle).toBeInTheDocument();
  });
});
