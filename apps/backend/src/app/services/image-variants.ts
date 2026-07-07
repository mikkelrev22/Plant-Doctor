// Shared dimensions and quality settings for the image variants we produce
// when a user uploads a plant photo. Used by `uploads.service` when persisting
// the variants to disk, and by `llm.service`'s `processImageForLlm` fallback
// (which exists for callers that pass a raw buffer without going through
// `storePlantPhoto`).
//
// Keep these in sync — the LLM vision input and the persisted "display"
// variant must always match, otherwise the model sees a different image than
// the one we show in the dashboard.

export const DISPLAY_MAX_DIMENSION = 1024;
export const DISPLAY_JPEG_QUALITY = 85;

export const THUMB_MAX_DIMENSION = 160;
export const THUMB_JPEG_QUALITY = 80;
