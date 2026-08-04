#!/usr/bin/env node
/**
 * Generate the PNG branding assets required by Expo from the source SVG logo.
 *
 * Expo's app.json only accepts PNG for app icons, splash screens, adaptive
 * icons, and favicons. This script rasterizes `assets/images/logo.svg` into
 * the sizes and padding expected by iOS and Android launchers.
 *
 * Requires Node and `sharp`. The root monorepo already installs sharp, so run
 * this from the repo root:
 *   node apps/mobile-app/scripts/generate-branding.js
 */

const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const assetsDir = path.resolve(__dirname, '../assets/images');
const svgPath = path.join(assetsDir, 'logo.svg');
const svgBuffer = fs.readFileSync(svgPath);

const CREAM = '#F7F3EC';
const ANDROID_BG = '#E6F4FE';

function hexToRgba(hex) {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
    alpha: 1,
  };
}

async function renderLogo(size) {
  return sharp(svgBuffer)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function generate(fileName, { canvasSize, logoScale, background }) {
  const bg = background ? hexToRgba(background) : { r: 0, g: 0, b: 0, alpha: 0 };
  const base = sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: bg,
    },
  });

  if (logoScale > 0) {
    const logoSize = Math.round(canvasSize * logoScale);
    const logo = await renderLogo(logoSize);
    const top = Math.round((canvasSize - logoSize) / 2);
    const left = Math.round((canvasSize - logoSize) / 2);
    base.composite([{ input: logo, top, left }]);
  }

  await base.png().toFile(path.join(assetsDir, fileName));

  console.log(`Generated ${fileName} (${canvasSize}x${canvasSize})`);
}

async function main() {
  // iOS / generic app icon: full-bleed icon on cream.
  await generate('icon.png', { canvasSize: 1024, logoScale: 0.7, background: CREAM });

  // Splash screen: large transparent logo over the splash background color.
  await generate('splash-icon.png', { canvasSize: 1242, logoScale: 0.55, background: null });

  // Android adaptive icon foreground: keep generous padding so OEM masks don't
  // clip the flower or pot. Background is supplied by backgroundColor.
  await generate('android-icon-foreground.png', {
    canvasSize: 1024,
    logoScale: 0.55,
    background: null,
  });

  // Android adaptive icon background (used when backgroundColor alone is not
  // sufficient; a solid swatch is fine).
  await generate('android-icon-background.png', {
    canvasSize: 1024,
    logoScale: 0,
    background: ANDROID_BG,
  });

  // Web favicon.
  await generate('favicon.png', { canvasSize: 48, logoScale: 0.75, background: CREAM });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
