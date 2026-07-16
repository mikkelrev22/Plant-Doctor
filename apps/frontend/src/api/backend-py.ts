import { config } from '../config';
import type {
  ChatRequest,
  ChatResponse,
  DiagnoseRequest,
  DiagnoseResponse,
  DiagnoseUploadRequest,
  LinearDiagnosisResult,
  LinearStreamStatusEvent,
  LinearStreamStepEvent,
} from '../types/backend-py';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readError(response: Response): Promise<string> {
  const detail = await response.text();
  let message = detail || `Request failed with status ${response.status}`;
  try {
    const parsed = JSON.parse(detail) as { message?: string; detail?: string };
    message = parsed.message || parsed.detail || message;
  } catch {
    // keep raw text
  }
  return message;
}

function buildDiagnoseFormData(payload: DiagnoseUploadRequest): FormData {
  const formData = new FormData();
  formData.append('user_text', payload.user_text);
  if (payload.image) {
    formData.append('image', payload.image);
  }
  if (payload.image_url) {
    formData.append('image_url', payload.image_url);
  }
  if (payload.plant_id != null) {
    formData.append('plant_id', String(payload.plant_id));
  }
  if (payload.plant_name) {
    formData.append('plant_name', payload.plant_name);
  }
  return formData;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${config.backendPyUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      `Could not reach the Python backend at ${config.backendPyUrl}. Is it running?`,
    );
  }

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json() as Promise<T>;
}

export function diagnoseLinear(payload: DiagnoseRequest): Promise<DiagnoseResponse> {
  return postJson<DiagnoseResponse>('/diagnose/linear', payload);
}

export async function diagnoseLinearUpload(
  payload: DiagnoseUploadRequest,
): Promise<DiagnoseResponse> {
  let response: Response;
  try {
    response = await fetch(`${config.backendPyUrl}/diagnose/linear`, {
      method: 'POST',
      body: buildDiagnoseFormData(payload),
    });
  } catch {
    throw new Error(
      `Could not reach the Python backend at ${config.backendPyUrl}. Is it running?`,
    );
  }

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json() as Promise<DiagnoseResponse>;
}

export type LinearStreamHandlers = {
  onStatus?: (event: LinearStreamStatusEvent) => void;
  onStep?: (event: LinearStreamStepEvent) => void;
};

/**
 * Stream linear diagnosis progress (SSE). Resolves with the final result.
 */
export async function diagnoseLinearUploadStream(
  payload: DiagnoseUploadRequest,
  handlers: LinearStreamHandlers = {},
): Promise<LinearDiagnosisResult> {
  let response: Response;
  try {
    response = await fetch(`${config.backendPyUrl}/diagnose/linear/stream`, {
      method: 'POST',
      body: buildDiagnoseFormData(payload),
    });
  } catch {
    throw new Error(
      `Could not reach the Python backend at ${config.backendPyUrl}. Is it running?`,
    );
  }

  if (!response.ok) {
    throw new Error(await readError(response));
  }
  if (!response.body) {
    throw new Error('Streaming response had no body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult: LinearDiagnosisResult | null = null;

  const flushEvent = (rawEvent: string) => {
    const lines = rawEvent.split('\n');
    let eventName = 'message';
    const dataLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }
    if (dataLines.length === 0) {
      return;
    }
    const data: unknown = JSON.parse(dataLines.join('\n'));

    if (eventName === 'status') {
      if (!isRecord(data) || typeof data.message !== 'string') {
        return;
      }
      handlers.onStatus?.({
        message: data.message,
        step: typeof data.step === 'string' ? data.step : undefined,
      });
    } else if (eventName === 'step') {
      if (
        !isRecord(data) ||
        typeof data.step !== 'string' ||
        typeof data.message !== 'string' ||
        !isRecord(data.partial)
      ) {
        return;
      }
      handlers.onStep?.({
        step: data.step,
        message: data.message,
        partial: data.partial as LinearDiagnosisResult,
      });
    } else if (eventName === 'done') {
      if (!isRecord(data)) {
        return;
      }
      finalResult = (data.result ?? data) as LinearDiagnosisResult;
    } else if (eventName === 'error') {
      const detail =
        isRecord(data) && data.detail != null
          ? String(data.detail)
          : 'Linear diagnosis stream failed';
      throw new Error(detail);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      if (part.trim()) {
        flushEvent(part);
      }
    }
  }
  if (buffer.trim()) {
    flushEvent(buffer);
  }

  if (!finalResult) {
    throw new Error('Stream ended without a final result');
  }
  return finalResult;
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
