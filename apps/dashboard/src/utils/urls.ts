// The backend returns local-storage image URLs as absolute
// (e.g. http://192.168.88.5:4100/uploads/plant-photos/2024/01/1.jpg). Through
// the Vite dev proxy the same bytes are served same-origin at /uploads/…, so
// strip the origin for dev and when shared over a reverse tunnel — keeps
// images same-origin (no CORS, reachable by a colleague's browser). S3 URLs
// (STORAGE_DRIVER=s3, staging/prod) are already public absolute URLs and
// are left untouched. `blob:` URLs (a just-selected upload, not yet analyzed)
// and any other string pass through unchanged.
export function toImgSrc(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const i = url.indexOf('/uploads/plant-photos/');
  return i >= 0 ? url.slice(i) : url;
}