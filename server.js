/**
 * Mock Gold Price API + Dynamic banner generator (local).
 * - GET /latest       → gold price JSON
 * - GET /banner       → mock Android notification preview (title, subtitle, image)
 * - GET /banner/image → raw banner image (PNG or SVG)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { generateBanner } = require('./banner.js');

const PREVIEW_HTML = fs.readFileSync(path.join(__dirname, 'preview.html'), 'utf8');

const MIN_PRICE_PER_GRAM = 15000;
const MAX_PRICE_PER_GRAM = 18000;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let lastPrice = randomInt(MIN_PRICE_PER_GRAM, MAX_PRICE_PER_GRAM);

function getGoldPrice() {
  const price_per_gram = randomInt(MIN_PRICE_PER_GRAM, MAX_PRICE_PER_GRAM);
  const previous_price = lastPrice;
  lastPrice = price_per_gram;

  const drop = previous_price - price_per_gram;

  return {
    price_per_gram,
    previous_price,
    drop,
    currency: 'INR',
    unit: 'gram',
    timestamp: new Date().toISOString(),
  };
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET' && (req.url === '/' || req.url === '/latest' || req.url === '/api/gold/latest')) {
    const data = getGoldPrice();
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify(data, null, 2));
    return;
  }

  if (req.method === 'GET' && req.url === '/banner') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.writeHead(200);
    res.end(PREVIEW_HTML);
    return;
  }

  if (req.method === 'GET' && (req.url === '/banner/image' || req.url === '/banner.png' || req.url === '/gold-banner')) {
    try {
      const priceData = getGoldPrice();
      const { buffer, mime } = await generateBanner(priceData);
      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'no-store');
      res.writeHead(200);
      res.end(buffer);
    } catch (err) {
      console.error('Banner generation failed:', err);
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Banner generation failed', message: err.message }));
    }
    return;
  }

  res.setHeader('Content-Type', 'application/json');
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found', path: req.url }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('  GET /latest         → gold price (₹/gram)');
  console.log('  GET /banner         → mock Android PN preview (title + subtitle + image)');
  console.log('  GET /banner/image   → raw banner image');
});
