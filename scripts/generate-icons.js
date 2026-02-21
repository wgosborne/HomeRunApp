#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crc ^ buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function generatePNG(width, height, filename) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const ihdrType = Buffer.from('IHDR');
  const ihdrCrc = Buffer.alloc(4);
  ihdrCrc.writeUInt32BE(crc32(Buffer.concat([ihdrType, ihdr])), 0);
  const ihdrChunk = Buffer.concat([Buffer.alloc(4), ihdrType, ihdr, ihdrCrc]);
  ihdrChunk.writeUInt32BE(13, 0);

  const pixelData = Buffer.alloc(width * height * 3 + height);
  let idx = 0;
  const r = 79, g = 70, b = 229;

  for (let y = 0; y < height; y++) {
    pixelData[idx++] = 0;
    for (let x = 0; x < width; x++) {
      pixelData[idx++] = r;
      pixelData[idx++] = g;
      pixelData[idx++] = b;
    }
  }

  const compressed = zlib.deflateSync(pixelData);

  const idatType = Buffer.from('IDAT');
  const idatCrc = Buffer.alloc(4);
  idatCrc.writeUInt32BE(crc32(Buffer.concat([idatType, compressed])), 0);
  const idatChunk = Buffer.concat([Buffer.alloc(4), idatType, compressed, idatCrc]);
  idatChunk.writeUInt32BE(compressed.length, 0);

  const iendType = Buffer.from('IEND');
  const iendCrc = Buffer.alloc(4);
  iendCrc.writeUInt32BE(crc32(iendType), 0);
  const iendChunk = Buffer.concat([Buffer.from([0, 0, 0, 0]), iendType, iendCrc]);

  const png = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);

  const outputPath = path.join(__dirname, '..', 'public', filename);
  fs.writeFileSync(outputPath, png);
  console.log(`✓ Created ${filename} (${width}×${height}px)`);
}

try {
  generatePNG(144, 144, 'icon-144x144.png');
  generatePNG(192, 192, 'icon-192x192.png');
  generatePNG(320, 320, 'icon-320x320.png');
  generatePNG(512, 512, 'icon-512x512.png');
  generatePNG(72, 72, 'badge-72x72.png');
  console.log('\n✓ All icons generated successfully!');
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
