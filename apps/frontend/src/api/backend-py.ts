import { config } from '../config';
import type {
  ChatRequest,
  ChatResponse,
  DiagnoseRequest,
  DiagnoseResponse,
} from '../types/backend-py';

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${config.backendPyUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function diagnoseLinear(payload: DiagnoseRequest): Promise<DiagnoseResponse> {
  return postJson<DiagnoseResponse>('/diagnose/linear', payload);
}

export function chatAgent(payload: ChatRequest): Promise<ChatResponse> {
  return postJson<ChatResponse>('/chat/agent', payload);
}

export async function checkBackendPyHealth(): Promise<string> {
  const response = await fetch(config.backendPyUrl);
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  const data = (await response.json()) as { message?: string };
  return data.message ?? 'Python backend is running';
}
