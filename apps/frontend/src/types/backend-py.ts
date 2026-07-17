export interface CareContext {
  /** Brightness / intensity of light the plant receives */
  light_intensity: string;
  /** Facing direction of the nearest window */
  window_direction: string;
  /** How far the plant sits from that window */
  distance_from_window: string;
  /** Rough daily light hours */
  daily_light_hours: string;
  water_amount: string;
  watering_frequency: string;
  /** Tap, filtered, distilled, etc. */
  water_type: string;
  /** Top-water vs bottom-water */
  watering_method: string;
  /** Current feel of the soil */
  soil_moisture: string;
  soil_drainage: string;
  temperature: string;
  humidity: string;
}

export interface DiagnoseRequest {
  image_url: string;
  user_text: string;
  plant_id?: number | null;
  plant_name?: string | null;
  care: CareContext;
}

export interface DiagnoseUploadRequest {
  image?: File | null;
  image_url?: string | null;
  user_text: string;
  plant_id?: number | null;
  plant_name?: string | null;
  care: CareContext;
}

export interface Advice {
  summary: string;
  actions: string[];
}

export interface LinearDiagnosisResult {
  image_url?: string;
  user_text?: string;
  plant_id?: number;
  plant_name?: string;
  care?: CareContext;
  triage?: Record<string, unknown>;
  rejected?: boolean;
  symptom_report?: Record<string, unknown>;
  care_profile?: Record<string, unknown>;
  diagnosis?: Record<string, unknown>;
  advice?: Advice;
}

export interface DiagnoseResponse {
  result: LinearDiagnosisResult;
}

export interface LinearStreamStepEvent {
  step: string;
  message: string;
  partial: LinearDiagnosisResult;
}

export interface LinearStreamStatusEvent {
  message: string;
  step?: string;
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
