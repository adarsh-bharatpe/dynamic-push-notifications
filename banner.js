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
  const prev = goldPriceResponse.previous_price ?? 0;
  const curr = goldPriceResponse.price_per_gram ?? 0;
  const drop = goldPriceResponse.drop ?? (prev - curr);
  const isPriceDown = drop > 0;
  const changeText = `₹${Math.abs(drop)}/gram`;

  if (isPriceDown) {
    return {
      title: 'Gold Price Drop',
      subtitle: 'Gold prices are down. Invest now.',
      headerLine: 'Lowest gold prices. Buy now before it\'s gone!',
      staticLine: 'Lowest gold prices. Buy now before it\'s gone!',
      todayDate: formatDate(now),
      yesterdayDate: formatDate(yesterday),
      priceChangeText: changeText,
      rightLabel: 'Price down by',
      isPriceDown: true,
      pnBody: `Gold prices are down. Invest now. ${formatDate(now)} vs ${formatDate(yesterday)} — ${changeText} down.`,
    };
  }
  return {
    title: 'Gold Price Rise',
    subtitle: 'Gold prices are increasing. Invest now to earn return.',
    headerLine: 'Gold prices are increasing. Invest now to earn return.',
    staticLine: 'Invest now to earn return.',
    todayDate: formatDate(now),
    yesterdayDate: formatDate(yesterday),
    priceChangeText: changeText,
    rightLabel: 'Price up by',
    isPriceDown: false,
    pnBody: `Gold prices are increasing. Invest now to earn return. ${formatDate(now)} vs ${formatDate(yesterday)} — ${changeText} up.`,
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

  // Left panel: Dark Charcoal + soft primary circles for depth
  ctx.fillStyle = heading;
  roundRect(ctx, 0, 0, splitX, height, [radius, 0, 0, radius]);
  ctx.fill();
  ctx.fillStyle = 'rgba(0, 179, 134, 0.1)';
  ctx.beginPath();
  ctx.arc(80, 180, 55, 0, Math.PI * 2);
  ctx.arc(320, 320, 35, 0, Math.PI * 2);
  ctx.fill();

  // Right panel: White background
  ctx.fillStyle = white;
  roundRect(ctx, splitX, 0, width - splitX, height, [0, radius, radius, 0]);
  ctx.fill();

  // Header: Primary green + white gradient overlay for shine (brand colours only)
  ctx.fillStyle = primary;
  roundRect(ctx, 0, 0, width, headerH, [radius, radius, 0, 0]);
  ctx.fill();
  const shineGrad = ctx.createLinearGradient(0, 0, 0, headerH);
  shineGrad.addColorStop(0, 'rgba(255,255,255,0.28)');
  shineGrad.addColorStop(0.6, 'rgba(255,255,255,0)');
  ctx.fillStyle = shineGrad;
  roundRect(ctx, 0, 0, width, headerH, [radius, radius, 0, 0]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, headerH);
  ctx.lineTo(width, headerH);
  ctx.stroke();

  ctx.fillStyle = white;
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetY = 1;
  ctx.fillText(data.title, width / 2, 31);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.font = '14px Arial';
  ctx.fillText(data.headerLine, width / 2, 52);

  // Vertical dashed line (coupon tear) between panels
  ctx.strokeStyle = bodyText;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(splitX, headerH);
  ctx.lineTo(splitX, height);
  ctx.stroke();
  ctx.setLineDash([]);

  // ---- Left panel: accent bars with gradient (Primary), dotted trend line, down arrow ----
  const barY = height - 48;
  const barW = 36;
  const barH = 12;
  for (let i = 0; i < 4; i++) {
    const bx = 28 + i * 4;
    const by = barY + 24 - i * 8;
    const bw = barW + i * 6;
    const barGrad = ctx.createLinearGradient(bx, by, bx, by + barH);
    barGrad.addColorStop(0, primary);
    barGrad.addColorStop(1, 'rgba(0, 179, 134, 0.75)');
    ctx.fillStyle = barGrad;
    ctx.fillRect(bx, by, bw, barH);
  }

  // Trend line: yesterday on LEFT, today on RIGHT. Downward curve if price dropped, upward if price rose.
  const leftX = 80;
  const rightX = splitX - 80;
  const topY = headerH + 50;
  const bottomY = barY - 10;
  const lowY = barY + 20;
  const lineStartX = data.isPriceDown ? leftX : leftX;
  const lineStartY = data.isPriceDown ? topY : lowY;
  const lineEndX = data.isPriceDown ? rightX : rightX;
  const lineEndY = data.isPriceDown ? bottomY : topY;
  ctx.strokeStyle = white;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(lineStartX, lineStartY);
  ctx.lineTo(lineEndX, lineEndY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Date labels: yesterday on LEFT, today on RIGHT (at curve endpoints)
  ctx.font = '12px Arial';
  ctx.fillStyle = white;
  ctx.textAlign = 'left';
  const yesterdayY = data.isPriceDown ? lineStartY - 6 : lineStartY + 16;
  ctx.fillText(data.yesterdayDate, 24, yesterdayY);
  ctx.textAlign = 'right';
  const todayY = data.isPriceDown ? lineEndY + 16 : lineEndY - 6;
  ctx.fillText(data.todayDate, splitX - 24, todayY);

  // Arrow on trend line: down if price dropped, up if price rose
  const ax = (lineStartX + lineEndX) / 2;
  const ay = (lineStartY + lineEndY) / 2;
  ctx.beginPath();
  if (data.isPriceDown) {
    ctx.moveTo(ax, ay - 28);
    ctx.lineTo(ax + 24, ay + 12);
    ctx.lineTo(ax + 10, ay + 12);
    ctx.lineTo(ax + 10, ay + 32);
    ctx.lineTo(ax - 10, ay + 32);
    ctx.lineTo(ax - 10, ay + 12);
    ctx.lineTo(ax - 24, ay + 12);
  } else {
    ctx.moveTo(ax, ay + 28);
    ctx.lineTo(ax + 24, ay - 12);
    ctx.lineTo(ax + 10, ay - 12);
    ctx.lineTo(ax + 10, ay - 32);
    ctx.lineTo(ax - 10, ay - 32);
    ctx.lineTo(ax - 10, ay - 12);
    ctx.lineTo(ax - 24, ay - 12);
  }
  ctx.closePath();
  ctx.strokeStyle = white;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = primary;
  ctx.fill();

  // ---- Right panel: "Price down/up by" + ₹X/g ----
  const rightCenterX = splitX + (width - splitX) / 2;
  const priceY = 268;
  ctx.fillStyle = 'rgba(0, 179, 134, 0.14)';
  roundRect(ctx, splitX + 40, priceY - 42, width - splitX - 80, 58, [28, 28, 28, 28]);
  ctx.fill();
  ctx.fillStyle = bodyText;
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(data.rightLabel, rightCenterX, 198);
  ctx.fillStyle = primary;
  ctx.font = 'bold 58px Arial';
  ctx.shadowColor = 'rgba(0,0,0,0.08)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.fillText(data.priceChangeText, rightCenterX, priceY);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

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
  const leftX = 80;
  const rightX = splitX - 80;
  const topY = headerH + 50;
  const bottomY = barY - 10;
  const lowY = barY + 20;
  const lineStartX = leftX;
  const lineStartY = data.isPriceDown ? topY : lowY;
  const lineEndX = rightX;
  const lineEndY = data.isPriceDown ? bottomY : topY;
  const priceY = 268;
  const pillX = splitX + 40;
  const pillW = width - splitX - 80;
  const pillY = priceY - 42;
  const pillR = 28;
  const ax = (lineStartX + lineEndX) / 2;
  const ay = (lineStartY + lineEndY) / 2;
  const arrowPathDown = `M ${ax} ${ay - 28} L ${ax + 24} ${ay + 12} L ${ax + 10} ${ay + 12} L ${ax + 10} ${ay + 32} L ${ax - 10} ${ay + 32} L ${ax - 10} ${ay + 12} L ${ax - 24} ${ay + 12} Z`;
  const arrowPathUp = `M ${ax} ${ay + 28} L ${ax + 24} ${ay - 12} L ${ax + 10} ${ay - 12} L ${ax + 10} ${ay - 32} L ${ax - 10} ${ay - 32} L ${ax - 10} ${ay - 12} L ${ax - 24} ${ay - 12} Z`;
  const yesterdayY = data.isPriceDown ? lineStartY - 6 : lineStartY + 16;
  const todayY = data.isPriceDown ? lineEndY + 16 : lineEndY - 6;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="headerShine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${white}" stop-opacity="0.28"/>
      <stop offset="60%" stop-color="${white}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="0" y="${headerH}" width="${splitX}" height="${height - headerH}" fill="${heading}"/>
  <circle cx="80" cy="180" r="55" fill="${primary}" fill-opacity="0.1"/>
  <circle cx="320" cy="320" r="35" fill="${primary}" fill-opacity="0.1"/>
  <rect x="${splitX}" y="${headerH}" width="${width - splitX}" height="${height - headerH}" fill="${white}"/>
  <rect x="0" y="0" width="${width}" height="${headerH}" fill="${primary}"/>
  <rect x="0" y="0" width="${width}" height="${headerH}" fill="url(#headerShine)"/>
  <line x1="0" y1="${headerH}" x2="${width}" y2="${headerH}" stroke="${white}" stroke-opacity="0.35" stroke-width="1"/>
  <text x="${width/2}" y="31" text-anchor="middle" fill="${white}" font-family="Arial,sans-serif" font-size="24" font-weight="bold">${escapeXml(data.title)}</text>
  <text x="${width/2}" y="52" text-anchor="middle" fill="${white}" font-family="Arial,sans-serif" font-size="14">${escapeXml(data.headerLine)}</text>
  <line x1="${splitX}" y1="${headerH}" x2="${splitX}" y2="${height}" stroke="${bodyText}" stroke-width="2" stroke-dasharray="8 8"/>
  <rect x="28" y="${barY}" width="36" height="12" fill="${primary}"/>
  <rect x="32" y="${barY + 16}" width="42" height="12" fill="${primary}"/>
  <rect x="36" y="${barY + 8}" width="48" height="12" fill="${primary}"/>
  <rect x="40" y="${barY}" width="54" height="12" fill="${primary}"/>
  <line x1="${lineStartX}" y1="${lineStartY}" x2="${lineEndX}" y2="${lineEndY}" stroke="${white}" stroke-width="2" stroke-dasharray="4 6"/>
  <text x="24" y="${yesterdayY}" text-anchor="start" fill="${white}" font-family="Arial,sans-serif" font-size="12">${escapeXml(data.yesterdayDate)}</text>
  <text x="${splitX - 24}" y="${todayY}" text-anchor="end" fill="${white}" font-family="Arial,sans-serif" font-size="12">${escapeXml(data.todayDate)}</text>
  <path d="${data.isPriceDown ? arrowPathDown : arrowPathUp}" stroke="${white}" stroke-width="2" fill="${primary}"/>
  <rect x="${pillX}" y="${pillY}" width="${pillW}" height="58" rx="${pillR}" ry="${pillR}" fill="${primary}" fill-opacity="0.14"/>
  <text x="${rightCenterX}" y="198" text-anchor="middle" fill="${bodyText}" font-family="Arial,sans-serif" font-size="18" font-weight="bold">${escapeXml(data.rightLabel)}</text>
  <text x="${rightCenterX}" y="${priceY}" text-anchor="middle" fill="${primary}" font-family="Arial,sans-serif" font-size="58" font-weight="bold">${escapeXml(data.priceChangeText)}</text>
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
