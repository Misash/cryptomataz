/**
 * API Configuration
 * 
 * Configure the base URL for the Supervisor Agent API endpoint.
 * Update this value to match your backend server URL.
 */

// Default API URL - update this to match your backend
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Supervisor Agent endpoint (regular POST request)
export const SUPERVISOR_AGENT_ENDPOINT = `${API_BASE_URL}/supervisor-agent/`;

// Supervisor Agent streaming endpoint (Server-Sent Events)
export const SUPERVISOR_AGENT_STREAM_ENDPOINT = `${API_BASE_URL}/supervisor-agent/stream`;

