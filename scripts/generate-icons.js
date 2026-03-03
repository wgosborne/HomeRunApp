#!/usr/bin/env node

const canvas = require('canvas');
const fs = require('fs');
const path = require('path');

// Ensure directories exist
const iconsDir = path.join(__dirname, '../public/icons');
const splashDir = path.join(__dirname, '../public/splash');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}
if (!fs.existsSync(splashDir)) {
  fs.mkdirSync(splashDir, { recursive: true });
}

/**
 * Draw the Dingerz icon (Seam Detail - Icon 5)
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} size - Canvas size in pixels
 */
function drawIcon(ctx, size) {
  // Fill background: Cubs navy
  ctx.fillStyle = '#0E3386';
  ctx.fillRect(0, 0, size, size);

  // Apply subtle inner shadow/depth via radial gradient overlay
  const gradientOverlay = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradientOverlay.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
  gradientOverlay.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
  ctx.fillStyle = gradientOverlay;
  ctx.fillRect(0, 0, size, size);

  // Draw the "D" text
  const fontSize = Math.round(size * 0.65); // 65% of canvas height
  ctx.font = `900 ${fontSize}px 'Arial Black', sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('D', size / 2, size / 2);

  // Draw seam arcs (red, 60% opacity)
  const seamColor = 'rgba(204, 52, 51, 0.6)';
  const strokeWidth = Math.round(size * 0.035);
  const arcRadius = Math.round(size * 0.45);

  // Seam arc - top right
  const topRightCenterX = Math.round(size * 0.92);
  const topRightCenterY = Math.round(size * 0.08);
  ctx.strokeStyle = seamColor;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(topRightCenterX, topRightCenterY, arcRadius, (120 * Math.PI) / 180, (200 * Math.PI) / 180);
  ctx.stroke();

  // Seam arc - bottom left
  const bottomLeftCenterX = Math.round(size * 0.08);
  const bottomLeftCenterY = Math.round(size * 0.92);
  ctx.beginPath();
  ctx.arc(bottomLeftCenterX, bottomLeftCenterY, arcRadius, (300 * Math.PI) / 180, (20 * Math.PI) / 180);
  ctx.stroke();
}

/**
 * Generate PNG file at specified size
 * @param {number} size - Canvas size in pixels
 * @param {string} filename - Output filename
 */
function generateIcon(size, filename) {
  const c = canvas.createCanvas(size, size);
  const ctx = c.getContext('2d');
  drawIcon(ctx, size);

  const stream = fs.createWriteStream(filename);
  c.pngStream().pipe(stream);

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filename));
    stream.on('error', reject);
  });
}

/**
 * Draw splash screen
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
function drawSplashScreen(ctx, width, height) {
  // Dark background matching app
  ctx.fillStyle = '#0f1923';
  ctx.fillRect(0, 0, width, height);

  // Draw small icon centered
  const iconSize = 120;
  const iconCanvas = canvas.createCanvas(iconSize, iconSize);
  const iconCtx = iconCanvas.getContext('2d');
  drawIcon(iconCtx, iconSize);

  const iconX = (width - iconSize) / 2;
  const iconY = (height - iconSize) / 2 - 60; // Positioned above center
  ctx.drawImage(iconCanvas, iconX, iconY);

  // Draw "DINGERZ" text below icon
  const fontSize = Math.round(Math.min(width, height) * 0.08);
  ctx.font = `800 ${fontSize}px 'Arial Black', sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('DINGERZ', width / 2, iconY + iconSize + 40);
}

/**
 * Generate splash screen at specified dimensions
 * @param {number} width - Width in pixels
 * @param {number} height - Height in pixels
 * @param {string} filename - Output filename
 */
function generateSplashScreen(width, height, filename) {
  const c = canvas.createCanvas(width, height);
  const ctx = c.getContext('2d');
  drawSplashScreen(ctx, width, height);

  const stream = fs.createWriteStream(filename);
  c.pngStream().pipe(stream);

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filename));
    stream.on('error', reject);
  });
}

/**
 * Convert 32x32 PNG to ICO
 */
async function generateFavicon() {
  const toIco = require('to-ico');
  const iconPath = path.join(iconsDir, 'icon-32.png');
  const icoPath = path.join(__dirname, '../public/favicon.ico');

  if (fs.existsSync(iconPath)) {
    try {
      const buffer = fs.readFileSync(iconPath);
      const ico = await toIco([buffer]);
      fs.writeFileSync(icoPath, ico);
      console.log(`✓ Created favicon.ico`);
    } catch (e) {
      console.error(`  Warning: Failed to create ico file:`, e.message);
      // Fallback: copy PNG as favicon
      fs.copyFileSync(iconPath, icoPath.replace('.ico', '.png'));
      console.log(`  Fallback: Using PNG favicon`);
    }
  }
}

// Icon sizes to generate
const iconSizes = [
  { size: 16, name: 'icon-16.png' },
  { size: 32, name: 'icon-32.png' },
  { size: 48, name: 'icon-48.png' },
  { size: 72, name: 'icon-72.png' },
  { size: 96, name: 'icon-96.png' },
  { size: 128, name: 'icon-128.png' },
  { size: 144, name: 'icon-144.png' },
  { size: 152, name: 'icon-152.png' },
  { size: 180, name: 'icon-180.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 384, name: 'icon-384.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 1024, name: 'icon-1024.png' },
];

// Splash screen sizes
const splashSizes = [
  { width: 2048, height: 2732, name: 'splash-2048x2732.png' },
  { width: 1668, height: 2388, name: 'splash-1668x2388.png' },
  { width: 1290, height: 2796, name: 'splash-1290x2796.png' },
  { width: 1179, height: 2556, name: 'splash-1179x2556.png' },
  { width: 1170, height: 2532, name: 'splash-1170x2532.png' },
  { width: 750, height: 1334, name: 'splash-750x1334.png' },
];

async function main() {
  try {
    console.log('Generating Dingerz icons...');

    // Generate all icon sizes
    const iconPromises = iconSizes.map(({ size, name }) => {
      const filepath = path.join(iconsDir, name);
      console.log(`  Generating ${name} (${size}x${size})...`);
      return generateIcon(size, filepath);
    });

    await Promise.all(iconPromises);
    console.log('✓ All icons generated');

    console.log('\nGenerating splash screens...');

    // Generate splash screens
    const splashPromises = splashSizes.map(({ width, height, name }) => {
      const filepath = path.join(splashDir, name);
      console.log(`  Generating ${name} (${width}x${height})...`);
      return generateSplashScreen(width, height, filepath);
    });

    await Promise.all(splashPromises);
    console.log('✓ All splash screens generated');

    // Generate favicon
    console.log('\nGenerating favicon...');
    await generateFavicon();

    console.log('\n✓ Icon generation complete!');
    console.log('\nGenerated files:');
    console.log(`  - ${iconSizes.length} icon sizes in public/icons/`);
    console.log(`  - ${splashSizes.length} splash screens in public/splash/`);
    console.log(`  - favicon.ico in public/`);
  } catch (error) {
    console.error('✗ Error generating icons:', error);
    process.exit(1);
  }
}

main();
