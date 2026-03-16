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
    staticLine: 'Lowest gold prices. Buy now before it\'s gone!',
    todayDate: formatDate(now),
    yesterdayDate: formatDate(yesterday),
    priceDropText: `₹${Math.abs(drop)}/gram`,
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

  const radius = 16;
  const headerH = 64;
  const splitX = width / 2; // vertical dashed line
  // BharatPe brand colours only
  const primary = '#00B386';      // BharatPe Green / Teal
  const heading = '#1A1A1A';     // Dark Charcoal
  const bodyText = '#6B7280';    // Grey
  const white = '#FFFFFF';

  // Rounded card background: left panel (Dark Charcoal)
  ctx.fillStyle = heading;
  roundRect(ctx, 0, 0, splitX, height, [radius, 0, 0, radius]);
  ctx.fill();

  // Right panel (White background)
  ctx.fillStyle = white;
  roundRect(ctx, splitX, 0, width - splitX, height, [0, radius, radius, 0]);
  ctx.fill();

  // Header strip (Primary - BharatPe Green)
  ctx.fillStyle = primary;
  roundRect(ctx, 0, 0, width, headerH, [radius, radius, 0, 0]);
  ctx.fill();

  ctx.fillStyle = white;
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Gold Discount Day', width / 2, 32);
  ctx.font = '14px Arial';
  ctx.fillText(data.staticLine, width / 2, 52);

  // Vertical dashed line (coupon tear) between panels
  ctx.strokeStyle = bodyText;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(splitX, headerH);
  ctx.lineTo(splitX, height);
  ctx.stroke();
  ctx.setLineDash([]);

  // ---- Left panel: accent bars (Primary), dotted trend line, down arrow ----
  const barY = height - 48;
  const barW = 36;
  const barH = 12;
  ctx.fillStyle = primary;
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(28 + i * 4, barY + 24 - i * 8, barW + i * 6, barH);
  }

  // Dotted downward trend line (top-right of left panel to near gold bars)
  const lineStartX = splitX - 80;
  const lineStartY = headerH + 50;
  const lineEndX = 120;
  const lineEndY = barY - 10;
  ctx.strokeStyle = white;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(lineStartX, lineStartY);
  ctx.lineTo(lineEndX, lineEndY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Date labels at graph endpoints: yesterday (high) → today (low)
  ctx.fillStyle = white;
  ctx.font = '12px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(data.yesterdayDate, lineStartX - 4, lineStartY - 6);
  ctx.textAlign = 'left';
  ctx.fillStyle = bodyText;
  ctx.fillText(data.todayDate, lineEndX + 4, lineEndY + 16);

  // Large down arrow on the trend line (Primary)
  const ax = 200;
  const ay = 200;
  ctx.fillStyle = primary;
  ctx.beginPath();
  ctx.moveTo(ax, ay - 28);
  ctx.lineTo(ax + 24, ay + 12);
  ctx.lineTo(ax + 10, ay + 12);
  ctx.lineTo(ax + 10, ay + 32);
  ctx.lineTo(ax - 10, ay + 32);
  ctx.lineTo(ax - 10, ay + 12);
  ctx.lineTo(ax - 24, ay + 12);
  ctx.closePath();
  ctx.fill();

  // ---- Right panel: "Price down by" + huge ₹X/g (Body text + Heading) ----
  const rightCenterX = splitX + (width - splitX) / 2;
  ctx.fillStyle = bodyText;
  ctx.font = '18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Price down by', rightCenterX, 200);
  ctx.fillStyle = heading;
  ctx.font = 'bold 56px Arial';
  ctx.fillText(data.priceDropText, rightCenterX, 268);

  const buffer = canvas.toBuffer('image/png');
  return { buffer, mime: 'image/png' };
}

function roundRect(ctx, x, y, w, h, radii = [0, 0, 0, 0]) {
  const [tl, tr, br, bl] = radii;
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
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
  const headerH = 64;
  const splitX = width / 2;
  const primary = '#00B386';
  const heading = '#1A1A1A';
  const bodyText = '#6B7280';
  const white = '#FFFFFF';
  const rightCenterX = splitX + (width - splitX) / 2;
  const barY = height - 48;
  const lineStartX = splitX - 80;
  const lineStartY = headerH + 50;
  const lineEndX = 120;
  const lineEndY = barY - 10;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="${headerH}" width="${splitX}" height="${height - headerH}" fill="${heading}"/>
  <rect x="${splitX}" y="${headerH}" width="${width - splitX}" height="${height - headerH}" fill="${white}"/>
  <rect x="0" y="0" width="${width}" height="${headerH}" fill="${primary}"/>
  <text x="${width/2}" y="32" text-anchor="middle" fill="${white}" font-family="Arial,sans-serif" font-size="22" font-weight="bold">Gold Discount Day</text>
  <text x="${width/2}" y="52" text-anchor="middle" fill="${white}" font-family="Arial,sans-serif" font-size="14">${escapeXml(data.staticLine)}</text>
  <line x1="${splitX}" y1="${headerH}" x2="${splitX}" y2="${height}" stroke="${bodyText}" stroke-width="2" stroke-dasharray="8 8"/>
  <rect x="28" y="${barY}" width="36" height="12" fill="${primary}"/>
  <rect x="32" y="${barY + 16}" width="42" height="12" fill="${primary}"/>
  <rect x="36" y="${barY + 8}" width="48" height="12" fill="${primary}"/>
  <rect x="40" y="${barY}" width="54" height="12" fill="${primary}"/>
  <line x1="${lineStartX}" y1="${lineStartY}" x2="${lineEndX}" y2="${lineEndY}" stroke="${white}" stroke-width="2" stroke-dasharray="4 6"/>
  <text x="${lineStartX - 4}" y="${lineStartY - 6}" text-anchor="end" fill="${white}" font-family="Arial,sans-serif" font-size="12">${escapeXml(data.yesterdayDate)}</text>
  <text x="${lineEndX + 4}" y="${lineEndY + 16}" text-anchor="start" fill="${bodyText}" font-family="Arial,sans-serif" font-size="12">${escapeXml(data.todayDate)}</text>
  <path d="M 200 172 L 224 212 L 210 212 L 210 232 L 190 232 L 190 212 L 176 212 Z" fill="${primary}"/>
  <text x="${rightCenterX}" y="200" text-anchor="middle" fill="${bodyText}" font-family="Arial,sans-serif" font-size="18">Price down by</text>
  <text x="${rightCenterX}" y="268" text-anchor="middle" fill="${heading}" font-family="Arial,sans-serif" font-size="56" font-weight="bold">${escapeXml(data.priceDropText)}</text>
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
