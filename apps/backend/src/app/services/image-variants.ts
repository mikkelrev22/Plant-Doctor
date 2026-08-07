// Shared dimensions and quality settings for the image variants we produce
// when a user uploads a plant photo. Used by `uploads.service` when
// persisting the variants to disk.
//
// The LLM call reuses the persisted "display" variant directly, so the model
// always sees the same image we show in the dashboard — there is no separate
// processing path to keep in sync.

export const DISPLAY_MAX_DIMENSION = 1024;
export const DISPLAY_JPEG_QUALITY = 85;

export const THUMB_MAX_DIMENSION = 160;
export const THUMB_JPEG_QUALITY = 80;
