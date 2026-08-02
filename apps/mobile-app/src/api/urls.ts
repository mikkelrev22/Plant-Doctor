/**
 * URL helpers for backend image URLs.
 *
 * The backend returns absolute image URLs (e.g. `http://<host>:4100/uploads/...`)
 * that are exempt from the `x-api-key` gate, so they can be fed straight to
 * `expo-image` `<Image>`. No client-side rewriting is needed; for a physical
 * device, set the backend's `BACKEND_URL` env to the LAN IP so the absolute
 * URLs are reachable.
 */

/** True for an absolute http(s) URL. */
export function isAbsoluteUrl(url: string | null | undefined): boolean {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}