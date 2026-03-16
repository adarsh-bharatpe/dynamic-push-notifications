/**
 * Dynamic banner generator for Gold Price Drop PN.
 * Uses node-canvas when available; falls back to SVG (no native deps).
 */

function formatDate(d) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatPrice(price) {
  return `₹${Number(price).toLocaleString('en-IN')}/gram`;
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
  const yesterdayPriceChip = formatPrice(prev);
  const todayPriceChip = formatPrice(curr);

  if (isPriceDown) {
    return {
      title: '📉 Gold prices just dipped!',
      subtitle: 'Perfect time to buy the dip, start investing in gold today.',
      headerLine: 'Perfect time to buy the dip, start investing in gold today.',
      staticLine: 'Perfect time to buy the dip, start investing in gold today.',
      todayDate: formatDate(now),
      yesterdayDate: formatDate(yesterday),
      yesterdayPriceChip,
      todayPriceChip,
      priceChangeText: changeText,
      rightLabel: 'Price down by',
      isPriceDown: true,
      pnBody: `Perfect time to buy the dip, start investing in gold today. ${formatDate(now)} vs ${formatDate(yesterday)} — ${changeText} down.`,
    };
  }
  return {
    title: '📈 Gold is on the rise!',
    subtitle: 'Prices are climbing today, start your gold investment now.',
    headerLine: 'Prices are climbing today, start your gold investment now.',
    staticLine: 'Prices are climbing today, start your gold investment now.',
    todayDate: formatDate(now),
    yesterdayDate: formatDate(yesterday),
    yesterdayPriceChip,
    todayPriceChip,
    priceChangeText: changeText,
    rightLabel: 'Price up by',
    isPriceDown: false,
    pnBody: `Prices are climbing today, start your gold investment now. ${formatDate(now)} vs ${formatDate(yesterday)} — ${changeText} up.`,
  };
}

const ARROW_GREEN = '#16A34A';
const ARROW_RED = '#DC2626';

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

  const radius = 20;
  const headerH = 0; // title/subtitle only in PN, not on image
  const splitX = width / 2;
  const primary = '#00B386';
  const primaryLight = '#5DD4B8';
  const primaryDark = '#008C6A';
  const heading = '#1A1A1A';
  const bodyText = '#6B7280';
  const white = '#FFFFFF';
  const rightCenterX = splitX + (width - splitX) / 2;

  // ---- Full card: colourful mint base (no white) ----
  const baseGrad = ctx.createLinearGradient(0, 0, width, height);
  baseGrad.addColorStop(0, '#C5EDE5');
  baseGrad.addColorStop(1, '#9FDED2');
  ctx.fillStyle = baseGrad;
  roundRect(ctx, 0, 0, width, height, [radius, radius, radius, radius]);
  ctx.fill();

  // Left panel: vibrant teal gradient (not flat dark)
  const leftGrad = ctx.createLinearGradient(0, 0, splitX, height);
  leftGrad.addColorStop(0, primaryDark);
  leftGrad.addColorStop(0.5, primary);
  leftGrad.addColorStop(1, primaryLight);
  ctx.fillStyle = leftGrad;
  roundRect(ctx, 0, 0, splitX, height, [radius, 0, 0, radius]);
  ctx.fill();
  // Organic blobs for depth (Gen Z style)
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.arc(60, 120, 70, 0, Math.PI * 2);
  ctx.arc(320, 280, 50, 0, Math.PI * 2);
  ctx.arc(120, 320, 45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.arc(280, 100, 55, 0, Math.PI * 2);
  ctx.fill();

  // Right panel: colourful mint-to-teal gradient (no white)
  const rightPanelGrad = ctx.createLinearGradient(splitX, 0, width, height);
  rightPanelGrad.addColorStop(0, '#9EE5D8');
  rightPanelGrad.addColorStop(0.5, '#6BC4B5');
  rightPanelGrad.addColorStop(1, '#4AB09E');
  ctx.fillStyle = rightPanelGrad;
  roundRect(ctx, splitX, 0, width - splitX, height, [0, radius, radius, 0]);
  ctx.fill();
  // Soft glow behind price area (keeps depth)
  const glowGrad = ctx.createRadialGradient(rightCenterX, 260, 0, rightCenterX, 260, 180);
  glowGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
  glowGrad.addColorStop(0.7, 'rgba(255,255,255,0.04)');
  glowGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(splitX, 0, width - splitX, height);

  // Divider: gradient line (primary tint)
  const divGrad = ctx.createLinearGradient(splitX, 0, splitX, height);
  divGrad.addColorStop(0, 'rgba(0, 179, 134, 0.4)');
  divGrad.addColorStop(1, 'rgba(0, 179, 134, 0.15)');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(splitX, 0);
  ctx.lineTo(splitX, height);
  ctx.stroke();
  ctx.setLineDash([]);

  // ---- Left panel: chunky gradient bars + trend line ----
  const barY = height - 52;
  const barW = 38;
  const barH = 14;
  for (let i = 0; i < 4; i++) {
    const bx = 28 + i * 5;
    const by = barY + 24 - i * 8;
    const bw = barW + i * 6;
    const barGrad = ctx.createLinearGradient(bx, by, bx, by + barH);
    barGrad.addColorStop(0, white);
    barGrad.addColorStop(0.25, primaryLight);
    barGrad.addColorStop(0.7, primary);
    barGrad.addColorStop(1, primaryDark);
    ctx.fillStyle = barGrad;
    roundRect(ctx, bx, by, bw, barH, [7, 7, 7, 7]);
    ctx.fill();
  }

  // Trend line: yesterday LEFT, today RIGHT; curve direction by price
  const leftX = 80;
  const rightX = splitX - 80;
  const topY = 48;
  const bottomY = barY - 8;
  const lowY = barY + 18;
  const lineStartX = data.isPriceDown ? leftX : leftX;
  const lineStartY = data.isPriceDown ? topY : lowY;
  const lineEndX = data.isPriceDown ? rightX : rightX;
  const lineEndY = data.isPriceDown ? bottomY : topY;
  ctx.strokeStyle = white;
  ctx.lineWidth = 3;
  ctx.shadowColor = 'rgba(0, 179, 134, 0.5)';
  ctx.shadowBlur = 8;
  ctx.setLineDash([5, 8]);
  ctx.beginPath();
  ctx.moveTo(lineStartX, lineStartY);
  ctx.lineTo(lineEndX, lineEndY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Date labels with price chips: yesterday LEFT, today RIGHT — chip above date with clear gap (no overlap)
  const chipH = 30;
  const chipPad = 14;
  const gapChipToDate = 20;
  const dateFontSize = 19;
  const chipFontSize = 17;
  ctx.font = `bold ${chipFontSize}px Arial`;
  const chip1W = Math.max(110, ctx.measureText(data.yesterdayPriceChip).width + chipPad * 2);
  const chip2W = Math.max(110, ctx.measureText(data.todayPriceChip).width + chipPad * 2);
  // Yesterday: chip above curve start, date below chip (clamp so chip stays on canvas)
  const chip1X = 24;
  const chip1Y = Math.max(8, lineStartY - chipH - 24);
  const yesterdayY = chip1Y + chipH + gapChipToDate;
  ctx.fillStyle = 'rgba(255,255,255,0.98)';
  roundRect(ctx, chip1X, chip1Y, chip1W, chipH, [14, 14, 14, 14]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, chip1X, chip1Y, chip1W, chipH, [14, 14, 14, 14]);
  ctx.stroke();
  ctx.fillStyle = primaryDark;
  ctx.textAlign = 'left';
  ctx.font = `bold ${chipFontSize}px Arial`;
  ctx.fillText(data.yesterdayPriceChip, chip1X + chipPad, chip1Y + chipH / 2 + 6);
  ctx.fillStyle = white;
  ctx.font = `bold ${dateFontSize}px Arial`;
  ctx.fillText(data.yesterdayDate, chip1X, yesterdayY + 4);
  // Today: date below curve end, chip above date
  const todayY = data.isPriceDown ? lineEndY + gapChipToDate + 4 : Math.max(chipH + gapChipToDate + 8, lineEndY - gapChipToDate - 4);
  const chip2Y = todayY - chipH - gapChipToDate;
  const chip2X = splitX - 24 - chip2W;
  ctx.fillStyle = 'rgba(255,255,255,0.98)';
  roundRect(ctx, chip2X, chip2Y, chip2W, chipH, [14, 14, 14, 14]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  roundRect(ctx, chip2X, chip2Y, chip2W, chipH, [14, 14, 14, 14]);
  ctx.stroke();
  ctx.fillStyle = primaryDark;
  ctx.textAlign = 'right';
  ctx.font = `bold ${chipFontSize}px Arial`;
  ctx.fillText(data.todayPriceChip, splitX - 24 - chipPad, chip2Y + chipH / 2 + 6);
  ctx.fillStyle = white;
  ctx.font = `bold ${dateFontSize}px Arial`;
  ctx.fillText(data.todayDate, splitX - 24, todayY + 4);

  // Arrow on trend line: down = red, up = green
  const ax = (lineStartX + lineEndX) / 2;
  const ay = (lineStartY + lineEndY) / 2;
  const arrowColor = data.isPriceDown ? ARROW_RED : ARROW_GREEN;
  ctx.beginPath();
  if (data.isPriceDown) {
    // Down arrow: tip at bottom
    ctx.moveTo(ax, ay + 28);
    ctx.lineTo(ax + 24, ay - 12);
    ctx.lineTo(ax + 10, ay - 12);
    ctx.lineTo(ax + 10, ay - 32);
    ctx.lineTo(ax - 10, ay - 32);
    ctx.lineTo(ax - 10, ay - 12);
    ctx.lineTo(ax - 24, ay - 12);
  } else {
    // Up arrow: tip at top
    ctx.moveTo(ax, ay - 28);
    ctx.lineTo(ax + 24, ay + 12);
    ctx.lineTo(ax + 10, ay + 12);
    ctx.lineTo(ax + 10, ay + 32);
    ctx.lineTo(ax - 10, ay + 32);
    ctx.lineTo(ax - 10, ay + 12);
    ctx.lineTo(ax - 24, ay + 12);
  }
  ctx.closePath();
  ctx.strokeStyle = white;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = arrowColor;
  ctx.fill();

  // ---- Right panel: bold gradient pill + price (spotlight, readable) ----
  const priceY = 272;
  const pillW = width - splitX - 64;
  const pillH = 68;
  const pillX = splitX + 32;
  const pillY = priceY - 50;
  // Soft shadow behind pill for depth
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, pillX + 2, pillY + 2, pillW, pillH, [32, 32, 32, 32]);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY + pillH);
  pillGrad.addColorStop(0, primaryLight);
  pillGrad.addColorStop(0.4, primary);
  pillGrad.addColorStop(1, primaryDark);
  ctx.fillStyle = pillGrad;
  roundRect(ctx, pillX, pillY, pillW, pillH, [32, 32, 32, 32]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  roundRect(ctx, pillX, pillY, pillW, pillH, [32, 32, 32, 32]);
  ctx.stroke();
  ctx.fillStyle = white;
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(data.rightLabel, rightCenterX, 204);
  ctx.fillStyle = white;
  ctx.font = 'bold 70px Arial';
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 8;
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
  const radius = 20;
  const headerH = 0; // title/subtitle only in PN, not on image
  const splitX = width / 2;
  const primary = '#00B386';
  const primaryLight = '#5DD4B8';
  const primaryDark = '#008C6A';
  const bodyText = '#6B7280';
  const white = '#FFFFFF';
  const rightCenterX = splitX + (width - splitX) / 2;
  const barY = height - 52;
  const leftX = 80;
  const rightX = splitX - 80;
  const topY = 48;
  const bottomY = barY - 8;
  const lowY = barY + 18;
  const lineStartX = leftX;
  const lineStartY = data.isPriceDown ? topY : lowY;
  const lineEndX = rightX;
  const lineEndY = data.isPriceDown ? bottomY : topY;
  const priceY = 272;
  const pillX = splitX + 32;
  const pillW = width - splitX - 64;
  const pillH = 68;
  const pillY = priceY - 50;
  const pillR = 32;
  const ax = (lineStartX + lineEndX) / 2;
  const ay = (lineStartY + lineEndY) / 2;
  const arrowPathDown = `M ${ax} ${ay + 28} L ${ax + 24} ${ay - 12} L ${ax + 10} ${ay - 12} L ${ax + 10} ${ay - 32} L ${ax - 10} ${ay - 32} L ${ax - 10} ${ay - 12} L ${ax - 24} ${ay - 12} Z`;
  const arrowPathUp = `M ${ax} ${ay - 28} L ${ax + 24} ${ay + 12} L ${ax + 10} ${ay + 12} L ${ax + 10} ${ay + 32} L ${ax - 10} ${ay + 32} L ${ax - 10} ${ay + 12} L ${ax - 24} ${ay + 12} Z`;
  const arrowColor = data.isPriceDown ? ARROW_RED : ARROW_GREEN;
  const chipH = 30;
  const chipPad = 14;
  const gapChipToDate = 20;
  const chip1W = 130;
  const chip2W = 130;
  const chip1X = 24;
  const chip1Y = Math.max(8, lineStartY - chipH - 24);
  const yesterdayY = chip1Y + chipH + gapChipToDate;
  const todayY = data.isPriceDown ? lineEndY + gapChipToDate + 4 : Math.max(chipH + gapChipToDate + 8, lineEndY - gapChipToDate - 4);
  const chip2Y = todayY - chipH - gapChipToDate;
  const chip2X = splitX - 24 - chip2W;
  const dateFontSize = 19;
  const chipFontSize = 17;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="baseGrad" x1="0" y1="0" x2="${width}" y2="${height}">
      <stop offset="0%" stop-color="#C5EDE5"/>
      <stop offset="100%" stop-color="#9FDED2"/>
    </linearGradient>
    <linearGradient id="leftPanel" x1="0" y1="0" x2="${splitX}" y2="${height}">
      <stop offset="0%" stop-color="${primaryDark}"/>
      <stop offset="50%" stop-color="${primary}"/>
      <stop offset="100%" stop-color="${primaryLight}"/>
    </linearGradient>
    <linearGradient id="rightPanelGrad" x1="${splitX}" y1="0" x2="${width}" y2="${height}">
      <stop offset="0%" stop-color="#9EE5D8"/>
      <stop offset="50%" stop-color="#6BC4B5"/>
      <stop offset="100%" stop-color="#4AB09E"/>
    </linearGradient>
    <linearGradient id="pillGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryLight}"/>
      <stop offset="40%" stop-color="${primary}"/>
      <stop offset="100%" stop-color="${primaryDark}"/>
    </linearGradient>
    <filter id="pillShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.35"/>
    </filter>
    <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000" flood-opacity="0.2"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" rx="${radius}" fill="url(#baseGrad)"/>
  <rect x="0" y="0" width="${splitX}" height="${height}" rx="${radius}" ry="0" fill="url(#leftPanel)"/>
  <circle cx="60" cy="120" r="70" fill="${white}" fill-opacity="0.12"/>
  <circle cx="320" cy="280" r="50" fill="${white}" fill-opacity="0.12"/>
  <circle cx="120" cy="320" r="45" fill="${white}" fill-opacity="0.12"/>
  <rect x="${splitX}" y="0" width="${width - splitX}" height="${height}" fill="url(#rightPanelGrad)"/>
  <line x1="${splitX}" y1="0" x2="${splitX}" y2="${height}" stroke="${primary}" stroke-opacity="0.35" stroke-width="2" stroke-dasharray="10 8"/>
  <rect x="28" y="${barY}" width="38" height="14" rx="7" fill="${primary}"/>
  <rect x="33" y="${barY + 16}" width="44" height="14" rx="7" fill="${primary}"/>
  <rect x="38" y="${barY + 8}" width="50" height="14" rx="7" fill="${primary}"/>
  <rect x="43" y="${barY}" width="56" height="14" rx="7" fill="${primary}"/>
  <line x1="${lineStartX}" y1="${lineStartY}" x2="${lineEndX}" y2="${lineEndY}" stroke="${white}" stroke-width="3" stroke-dasharray="5 8"/>
  <rect x="${chip1X}" y="${chip1Y}" width="${chip1W}" height="${chipH}" rx="14" fill="rgba(255,255,255,0.98)" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>
  <text x="${chip1X + chipPad}" y="${chip1Y + chipH / 2 + 6}" text-anchor="start" fill="${primaryDark}" font-family="Arial,sans-serif" font-size="${chipFontSize}" font-weight="bold">${escapeXml(data.yesterdayPriceChip)}</text>
  <text x="24" y="${yesterdayY + 4}" text-anchor="start" fill="${white}" font-family="Arial,sans-serif" font-size="${dateFontSize}" font-weight="bold">${escapeXml(data.yesterdayDate)}</text>
  <rect x="${chip2X}" y="${chip2Y}" width="${chip2W}" height="${chipH}" rx="14" fill="rgba(255,255,255,0.98)" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>
  <text x="${splitX - 24 - chipPad}" y="${chip2Y + chipH / 2 + 6}" text-anchor="end" fill="${primaryDark}" font-family="Arial,sans-serif" font-size="${chipFontSize}" font-weight="bold">${escapeXml(data.todayPriceChip)}</text>
  <text x="${splitX - 24}" y="${todayY + 4}" text-anchor="end" fill="${white}" font-family="Arial,sans-serif" font-size="${dateFontSize}" font-weight="bold">${escapeXml(data.todayDate)}</text>
  <path d="${data.isPriceDown ? arrowPathDown : arrowPathUp}" stroke="${white}" stroke-width="2" fill="${arrowColor}"/>
  <rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${pillR}" ry="${pillR}" fill="url(#pillGrad)" filter="url(#pillShadow)"/>
  <rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${pillR}" ry="${pillR}" fill="none" stroke="${white}" stroke-opacity="0.6" stroke-width="2"/>
  <text x="${rightCenterX}" y="204" text-anchor="middle" fill="${white}" font-family="Arial,sans-serif" font-size="24" font-weight="bold">${escapeXml(data.rightLabel)}</text>
  <text x="${rightCenterX}" y="${priceY}" text-anchor="middle" fill="${white}" font-family="Arial,sans-serif" font-size="70" font-weight="bold" filter="url(#textShadow)">${escapeXml(data.priceChangeText)}</text>
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
