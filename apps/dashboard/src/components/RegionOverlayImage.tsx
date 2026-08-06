import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { LlmDetectedRegion } from '@plant-doctor/api-types';

interface RegionOverlayImageProps {
  imageUrl: string;
  // Bounding boxes in normalized 0–1 fractions of the image dimensions, as
  // returned by the LLM (LlmDetectedRegion.bbox). Empty = just the image.
  regions: LlmDetectedRegion[];
  // stressSignId -> human-readable label for the frame tags. Falls back to a
  // generic "Region N" label when a sign id isn't in the map.
  signNames?: Map<string, string>;
  // Pixel cap for the rendered image height; the wrapper's width is constrained
  // by the image's aspect ratio so it never exceeds this. Matches the report
  // page's 420px photo height.
  maxHeight?: number;
  alt?: string;
  // Optional content pinned to the bottom corners of the image (rendered inside
  // the overlay layer, so it sits on the photo, aligned to the image bottom
  // regardless of aspect ratio). Used by the eval grid cards for the report id
  // and present-stress-sign count.
  bottomLeft?: ReactNode;
  bottomRight?: ReactNode;
}

// Renders a plant photo with the LLM's detected stress regions drawn as red
// frames with tiny labels. The image is laid out width:100% / height:auto so
// the image element's box is the content area — region frames positioned in
// percentage units then align exactly with the pictured plant, with no
// object-fit/letterbox math. Self-contained (plain HTML/CSS, no canvas) so it
// can be reused anywhere we show a report photo.
export function RegionOverlayImage({
  imageUrl,
  regions,
  signNames,
  maxHeight = 420,
  alt = 'Plant',
  bottomLeft,
  bottomRight,
}: RegionOverlayImageProps) {
  // Natural pixel dimensions, captured on load so we can cap the rendered
  // height while keeping the overlay layer edge-to-edge with the image.
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  const aspectRatio = natural ? `${natural.w} / ${natural.h}` : undefined;
  // Constrain width so the image height (width / aspect) stays within maxHeight.
  const maxWidth = natural ? natural.w / natural.h * maxHeight : undefined;

  const wrapperStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth,
    margin: '0 auto',
    aspectRatio,
  };

  return (
    <div style={wrapperStyle}>
      <img
        src={imageUrl}
        alt={alt}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth && img.naturalHeight) {
            setNatural({ w: img.naturalWidth, h: img.naturalHeight });
          }
        }}
        style={{ display: 'block', width: '100%', height: 'auto' }}
      />
      {regions.map((region, i) => {
        const { x, y, width, height } = region.bbox;
        const label =
          (signNames?.get(region.stressSignId)) ?? `Region ${i + 1}`;
        return (
          <div
            key={`${region.stressSignId}-${i}`}
            title={label}
            style={{
              position: 'absolute',
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              width: `${width * 100}%`,
              height: `${height * 100}%`,
              border: '1px solid red',
              boxSizing: 'border-box',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '-1.4em',
                left: -1,
                background: 'red',
                color: 'white',
                fontSize: 10,
                fontWeight: 'bold',
                lineHeight: '1.4em',
                padding: '0 4px',
                whiteSpace: 'nowrap',
                maxWidth: 'calc(100% + 2px)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
      {bottomLeft && (
        <div style={{ position: 'absolute', bottom: 4, left: 4, zIndex: 5 }}>
          {bottomLeft}
        </div>
      )}
      {bottomRight && (
        <div style={{ position: 'absolute', bottom: 4, right: 4, zIndex: 5 }}>
          {bottomRight}
        </div>
      )}
    </div>
  );
}