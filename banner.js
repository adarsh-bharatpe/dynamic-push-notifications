/**
 * Dynamic banner generator for Gold Price Drop PN.
 * Uses node-canvas when available; falls back to SVG (no native deps).
 */

function formatDate(d) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getBannerData(goldPriceResponse) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const drop = goldPriceResponse.drop ?? 0;
  return {
    title: 'Gold Price Drop',
    subtitle: 'Time to maximise your saving today',
    staticLine: 'Gold Discount day, invest in gold today before this is gone.',
    todayDate: formatDate(now),
    yesterdayDate: formatDate(yesterday),
    priceDropText: `₹${Math.abs(drop)}/gram`,
    isDrop: drop > 0,
  };
}

/**
 * Generate banner as PNG buffer using node-canvas (if installed).
 * @param {Object} goldPriceResponse - { price_per_gram, previous_price, drop, ... }
 * @returns {Promise<{ buffer: Buffer, mime: 'image/png' }>}
 */
async function generatePng(goldPriceResponse) {
  const { createCanvas } = require('canvas');
  const data = getBannerData(goldPriceResponse);

  const width = 800;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background: dark gradient (gold theme)
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(0.5, '#16213e');
  gradient.addColorStop(1, '#0f3460');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Accent line
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(0, 0, width, 4);

  const centerX = width / 2;
  let y = 52;

  // Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(data.title, centerX, y);
  y += 36;

  // Subtitle
  ctx.fillStyle = '#B8B8B8';
  ctx.font = '18px Arial';
  ctx.fillText(data.subtitle, centerX, y);
  y += 44;

  // Static line
  ctx.fillStyle = '#E0E0E0';
  ctx.font = '16px Arial';
  ctx.fillText(data.staticLine, centerX, y);
  y += 36;

  // Dates
  ctx.fillStyle = '#A0A0A0';
  ctx.font = '14px Arial';
  ctx.fillText(`${data.todayDate}  vs  ${data.yesterdayDate}`, centerX, y);
  y += 48;

  // Price drop — big and gold
  ctx.fillStyle = data.isDrop ? '#4ADE80' : '#F87171';
  ctx.font = 'bold 56px Arial';
  ctx.fillText(data.priceDropText + ' down', centerX, y);

  const buffer = canvas.toBuffer('image/png');
  return { buffer, mime: 'image/png' };
}

/**
 * Generate banner as SVG (no native deps). Use when canvas is not installed.
 * @param {Object} goldPriceResponse
 * @returns {{ svg: string, mime: 'image/svg+xml' }}
 */
function generateSvg(goldPriceResponse) {
  const data = getBannerData(goldPriceResponse);
  const width = 800;
  const height = 400;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="50%" style="stop-color:#16213e"/>
      <stop offset="100%" style="stop-color:#0f3460"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="0" y="0" width="${width}" height="4" fill="#FFD700"/>
  <text x="${width/2}" y="52" text-anchor="middle" fill="#FFF" font-family="Arial,sans-serif" font-size="32" font-weight="bold">${escapeXml(data.title)}</text>
  <text x="${width/2}" y="88" text-anchor="middle" fill="#B8B8B8" font-family="Arial,sans-serif" font-size="18">${escapeXml(data.subtitle)}</text>
  <text x="${width/2}" y="132" text-anchor="middle" fill="#E0E0E0" font-family="Arial,sans-serif" font-size="16">${escapeXml(data.staticLine)}</text>
  <text x="${width/2}" y="168" text-anchor="middle" fill="#A0A0A0" font-family="Arial,sans-serif" font-size="14">${escapeXml(data.todayDate)}  vs  ${escapeXml(data.yesterdayDate)}</text>
  <text x="${width/2}" y="216" text-anchor="middle" fill="${data.isDrop ? '#4ADE80' : '#F87171'}" font-family="Arial,sans-serif" font-size="56" font-weight="bold">${escapeXml(data.priceDropText)} down</text>
</svg>`;

  return { svg, mime: 'image/svg+xml' };
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

let canvasAvailable = null;
function isCanvasAvailable() {
  if (canvasAvailable === null) {
    try {
      require.resolve('canvas');
      canvasAvailable = true;
    } catch {
      canvasAvailable = false;
    }
  }
  return canvasAvailable;
}

/**
 * Generate banner image. Returns PNG if canvas is available, else SVG.
 * @param {Object} goldPriceResponse
 * @returns {Promise<{ buffer: Buffer, mime: string }>}
 */
async function generateBanner(goldPriceResponse) {
  if (isCanvasAvailable()) {
    return generatePng(goldPriceResponse);
  }
  const { svg, mime } = generateSvg(goldPriceResponse);
  return { buffer: Buffer.from(svg, 'utf8'), mime };
}

module.exports = {
  generateBanner,
  getBannerData,
  isCanvasAvailable,
};
