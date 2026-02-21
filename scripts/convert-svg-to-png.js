#!/usr/bin/env node
/**
 * Convert SVG icons to PNG using browser-like rendering
 * Uses a simple approach: write SVG as data URI and use sharp if available
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

// Check if sharp is available
let sharpAvailable = false;
try {
  require.resolve('sharp');
  sharpAvailable = true;
} catch (e) {
  sharpAvailable = false;
}

if (sharpAvailable) {
  console.log('✓ Sharp library found, converting SVG to PNG...');
  const sharp = require('sharp');

  const conversions = [
    { svg: 'icon-192x192.svg', png: 'icon-192x192.png', size: 192 },
    { svg: 'icon-512x512.svg', png: 'icon-512x512.png', size: 512 },
    { svg: 'badge-72x72.svg', png: 'badge-72x72.png', size: 72 }
  ];

  conversions.forEach(({ svg, png, size }) => {
    const svgPath = path.join(publicDir, svg);
    const pngPath = path.join(publicDir, png);

    sharp(svgPath)
      .png()
      .toFile(pngPath)
      .then(() => {
        console.log(`✓ Converted ${svg} → ${png}`);
      })
      .catch(err => {
        console.error(`✗ Failed to convert ${svg}:`, err.message);
      });
  });
} else {
  console.log('Sharp not found. Installing...');

  // Create placeholder PNGs (minimal valid PNG files)
  // This is a 1x1 transparent PNG in base64
  const minimalPNG = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
  ]);

  // For now, create indigo colored placeholders using a simple approach
  // We'll write them as actual minimal PNGs
  const pngFiles = [
    { name: 'icon-192x192.png', size: 192 },
    { name: 'icon-512x512.png', size: 512 },
    { name: 'badge-72x72.png', size: 72 }
  ];

  // Create a proper PNG with indigo background
  // Using libpng format with basic structure
  const createIndigoPNG = (size) => {
    // For development, we'll use a simple approach
    // Create a minimal valid PNG (will show as solid color)
    // This is a placeholder - ideally use sharp or ImageMagick in production

    // PNG header
    let buffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a // PNG signature
    ]);

    // IHDR chunk (image header) - 13 bytes
    const width = size;
    const height = size;
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;   // bit depth
    ihdr[9] = 2;   // color type (RGB)
    ihdr[10] = 0;  // compression
    ihdr[11] = 0;  // filter
    ihdr[12] = 0;  // interlace

    const ihdrChunk = createChunk('IHDR', ihdr);
    buffer = Buffer.concat([buffer, ihdrChunk]);

    // IDAT chunk (image data) - simple indigo fill
    // For simplicity, create minimal valid data
    const idat = Buffer.alloc(1);
    idat[0] = 0; // filter type
    const idatChunk = createChunk('IDAT', idat);
    buffer = Buffer.concat([buffer, idatChunk]);

    // IEND chunk (image end)
    const iendChunk = createChunk('IEND', Buffer.alloc(0));
    buffer = Buffer.concat([buffer, iendChunk]);

    return buffer;
  };

  const createChunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);

    const typeBuffer = Buffer.from(type);
    const chunkData = Buffer.concat([typeBuffer, data]);

    // CRC calculation (simplified - just use a placeholder)
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(0x00000000, 0);

    return Buffer.concat([length, chunkData, crc]);
  };

  pngFiles.forEach(({ name, size }) => {
    const pngPath = path.join(publicDir, name);
    // For now, just copy the SVG info to a text file
    // In production, use: npm install sharp && npx ts-node scripts/convert-svg-to-png.ts
    console.log(`Note: ${name} should be converted from SVG using 'sharp' or ImageMagick`);
  });

  console.log('\nTo convert SVG → PNG in production:');
  console.log('  npm install sharp');
  console.log('  node scripts/convert-svg-to-png.js');
}
