/**
 * API Configuration
 * 
 * Configuration for backend API endpoints.
 * The backend server handles AWS Bedrock and Transcribe calls securely.
 * 
 * Requirements: 1.2, 4.2
 */

// Backend API base URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// WebSocket URL for transcription
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/transcribe';

/**
 * Amazon Nova Pro model ID for Bedrock (used by backend)
 */
export const NOVA_PRO_MODEL_ID = 'amazon.nova-pro-v1:0';

// Legacy exports for backward compatibility with tests
export const bedrockClient = {};
export const transcribeClient = {};
