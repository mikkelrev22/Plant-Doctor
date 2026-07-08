export interface DiagnoseRequest {
  image_url: string;
  user_text: string;
}

export interface Advice {
  summary: string;
  actions: string[];
}

export interface LinearDiagnosisResult {
  image_url?: string;
  user_text?: string;
  triage?: Record<string, unknown>;
  symptom_report?: Record<string, unknown>;
  care_profile?: Record<string, unknown>;
  diagnosis?: Record<string, unknown>;
  advice?: Advice;
}

export interface DiagnoseResponse {
  result: LinearDiagnosisResult;
}

export interface ChatRequest {
  message: string;
  thread_id?: string | null;
}

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ChatResult {
  messages: ChatMessage[];
}

export interface ChatResponse {
  thread_id: string;
  result: ChatResult;
}
