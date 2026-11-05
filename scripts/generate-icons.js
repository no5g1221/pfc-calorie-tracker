import fs from 'node:fs';
import zlib from 'node:zlib';

function createPng(width, height, r, g, b, a = 255) {
  // Simple PNG generator with solid color & stylish rounded badge
  const bytesPerPixel = 4;
  const rawData = Buffer.alloc(height * (1 + width * bytesPerPixel));
  
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * bytesPerPixel);
    rawData[rowOffset] = 0; // Filter type: None
    
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * bytesPerPixel;
      
      // Calculate distance to center for circular/badge look
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.hypot(x - cx, y - cy);
      const radius = width * 0.45;
      
      if (dist <= radius) {
        // Inner badge: stylish dark slate (#0f172a) with cyan ring (#0284c7)
        if (dist > radius - (width * 0.08)) {
          // Ring
          rawData[pixelOffset] = 2;     // R
          rawData[pixelOffset + 1] = 132; // G
          rawData[pixelOffset + 2] = 199; // B
          rawData[pixelOffset + 3] = 255;
        } else {
          // Inside
          rawData[pixelOffset] = 15;
          rawData[pixelOffset + 1] = 23;
          rawData[pixelOffset + 2] = 42;
          rawData[pixelOffset + 3] = 255;
        }
      } else {
        // Background rounded corners
        const cornerR = width * 0.2;
        const inCornerX = x < cornerR ? cornerR - x : (x > width - cornerR ? x - (width - cornerR) : 0);
        const inCornerY = y < cornerR ? cornerR - y : (y > height - cornerR ? y - (height - cornerR) : 0);
        if (Math.hypot(inCornerX, inCornerY) > cornerR) {
          rawData[pixelOffset + 3] = 0; // Transparent
        } else {
          rawData[pixelOffset] = 9;
          rawData[pixelOffset + 1] = 13;
          rawData[pixelOffset + 2] = 22;
          rawData[pixelOffset + 3] = 255;
        }
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Header
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = chunk('IHDR', ihdr);
  const idatChunk = chunk('IDAT', deflated);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const pwa192 = createPng(192, 192);
const pwa512 = createPng(512, 512);

fs.writeFileSync('public/pwa-192x192.png', pwa192);
fs.writeFileSync('public/pwa-512x512.png', pwa512);
fs.writeFileSync('public/apple-touch-icon.png', pwa192);
console.log('PNG icons created successfully!');
