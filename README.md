# Dynamic Push Notifications (POC Only)

Mock gold price API + **dynamic banner image** (run locally; PN delivery not included). All project documentation is in this README.

**Repo:** [github.com/adarsh-bharatpe/dynamic-push-notifications](https://github.com/adarsh-bharatpe/dynamic-push-notifications)

---

## Product overview

Send push notifications (PNs) with **dynamic image banners** (e.g., daily gold price from API). Three layers:

1. **Backend** → Fetch gold price from API  
2. **Dynamic image generation service** → Create banner with that price  
3. **Push notification service** (Firebase/APNs) with image URL  

This is how most fintech apps (Groww, Jar, Cred, etc.) do daily market notifications.

---

## Architecture

```
Gold Price API
      │
      ▼
Backend Cron Job (daily / hourly)
      │
      ▼
Dynamic Banner Generator
(Node / Python / Cloud Function)
      │
      ▼
Upload Image → CDN / S3
      │
      ▼
Send PN via Firebase with image URL
```

---

## Push notification content (copy)

Two templates are used depending on whether gold price went **down** or **up** (today vs yesterday).

**1️⃣ When gold price decreases (buy the dip):**

| Field | Content |
|--------|--------|
| **Title** | 📉 Gold prices just dipped! |
| **Subtitle** | Perfect time to buy the dip, start investing in gold today. |
| **PN image** | Dynamic banner with **downward** curve; yesterday (left), today (right). |

**2️⃣ When gold price increases (bullish signal):**

| Field | Content |
|--------|--------|
| **Title** | 📈 Gold is on the rise! |
| **Subtitle** | Prices are climbing today, start your gold investment now. |
| **PN image** | Dynamic banner with **upward** curve; yesterday (left), today (right). |

**Body copy (price down)**

- Subtitle line as main message:  
  `Perfect time to buy the dip, start investing in gold today.`
- **Dynamic (fill from API / date):**
  - Today’s date (e.g. *16 Mar 2026*).
  - Yesterday’s date (e.g. *15 Mar 2026*).
  - Price difference as **big/emphasised**: e.g. **₹410/gram** (use actual `drop` from gold price API).

**Example final body (price down):**

> Perfect time to buy the dip, start investing in gold today. **16 Mar 2026** vs **15 Mar 2026** — **₹410/gram** down.

**Example final body (price up):**

> Prices are climbing today, start your gold investment now. **16 Mar 2026** vs **15 Mar 2026** — **₹200/gram** up.

**Placeholders for implementation**

| Placeholder | Source |
|-------------|--------|
| `{{TODAY_DATE}}` | e.g. `16 Mar 2026` |
| `{{YESTERDAY_DATE}}` | e.g. `15 Mar 2026` |
| `{{PRICE_DROP_PER_GRAM}}` | `drop` from API, e.g. `410` → show as **₹410/gram** |

---

## Tech implementation

### Step 1 — Fetch gold price from API

**Example:**

```http
GET https://api.goldpriceapi.com/latest
```

**Response (this repo’s mock):**

```json
{
  "price_per_gram": 15570,
  "previous_price": 16190,
  "drop": 620,
  "currency": "INR",
  "unit": "gram",
  "timestamp": "2026-03-16T12:00:00.000Z"
}
```

**Calculate drop:** `drop = previous_price - price_per_gram`

### Step 2 — Generate dynamic banner

Instead of static images, generate banners dynamically. Generic example (Node.js + Canvas):

```javascript
const { createCanvas, loadImage } = require('canvas');

const canvas = createCanvas(800, 400);
const ctx = canvas.getContext('2d');

const bg = await loadImage('gold_template.png');
ctx.drawImage(bg, 0, 0);

ctx.font = "bold 60px Arial";
ctx.fillStyle = "#FFD700";

ctx.fillText("₹410/g", 400, 250);

const buffer = canvas.toBuffer("image/png");
```

Upload to **AWS S3 / Cloudflare R2**. Example URL: `https://cdn.yourapp.com/gold/2026-03-16.png`

**This repo:** `banner.js` implements a jar-style coupon layout (gold header, trend line, “Price down by ₹X/gram”). Uses **node-canvas** for PNG when available; falls back to SVG. PNG: `npm install` (optional `canvas`). SVG: no native deps if canvas fails to build.

### Step 3 — Send push notification with image

Using **Firebase Cloud Messaging (FCM)**. Example payload:

```json
{
  "message": {
    "token": "USER_DEVICE_TOKEN",
    "notification": {
      "title": "📉 Gold prices just dipped!",
      "body": "Perfect time to buy the dip, start investing in gold today. 16 Mar 2026 vs 15 Mar 2026 — ₹410/gram down."
    },
    "android": {
      "notification": {
        "image": "https://cdn.yourapp.com/gold/banner_16_mar.png"
      }
    }
  }
}
```

- **Title:** Use template by direction (e.g. “📉 Gold prices just dipped!” or “📈 Gold is on the rise!”).  
- **Subtitle:** Matching subtitle (use `android.notification.channelId` or data payload if your app reads subtitle from data).  
- **Body:** Use `getBannerData(goldData).pnBody` for full dynamic body.  
- **Image:** Dynamic banner URL.

Android automatically shows the image banner in the PN when **BigPictureStyle** is supported (Firebase handles this when configured).

#### Android app support

On Android you must support **BigPictureStyle**. Example:

```kotlin
val bigPictureStyle = NotificationCompat.BigPictureStyle()
    .bigPicture(bitmap)
    .bigLargeIcon(null)
```

If using Firebase, it already renders.

### Step 4 — Automate (cron)

Create a **cron job** (e.g. every day at 6 PM).

**Flow:** Fetch gold price → calculate drop → generate banner → upload → send push.

**Result:** User receives PN with title, body, and dynamic banner (e.g. “📉 Gold prices just dipped!”, “Price down by ₹410/g”).

---

## Connecting to production

### 1. Connect to an actual gold price API

This repo currently uses a **mock** `getGoldPrice()` in `server.js` (random ₹15k–₹18k/gram). To use a real API:

1. **Choose a gold price API** (e.g. [GoldAPI](https://www.goldapi.io/), [MetalpriceAPI](https://metalpriceapi.com/), or your internal pricing service). Ensure the API returns or lets you derive:
   - Current price per gram (INR)
   - Previous day’s (or prior) price so you can compute `drop`.

2. **Add env config** (do not commit secrets):
   ```bash
   GOLD_API_URL=https://api.example.com/gold/latest
   GOLD_API_KEY=your_api_key_if_required
   ```

3. **Replace the mock in `server.js`** with an HTTP fetch and map the response to the shape `banner.js` expects:
   - `price_per_gram` (number)
   - `previous_price` (number)
   - `drop` = `previous_price - price_per_gram` (compute if the API doesn’t provide it)

   **Example** (using `node-fetch` or native `fetch` in Node 18+):

   ```javascript
   async function getGoldPrice() {
     const res = await fetch(process.env.GOLD_API_URL, {
       headers: process.env.GOLD_API_KEY ? { 'Authorization': `Bearer ${process.env.GOLD_API_KEY}` } : {},
     });
     if (!res.ok) throw new Error('Gold API failed');
     const data = await res.json();
     const price_per_gram = data.price_per_gram ?? data.pricePerGram;
     const previous_price = data.previous_price ?? data.previousPrice ?? data.yesterday_price;
     const drop = data.drop ?? (previous_price - price_per_gram);
     return {
       price_per_gram,
       previous_price,
       drop,
       currency: data.currency ?? 'INR',
       unit: data.unit ?? 'gram',
       timestamp: data.timestamp ?? new Date().toISOString(),
     };
   }
   ```

   Keep this return shape so **`banner.js` and `generateBanner()` need no changes**.

4. **Use one source of truth for the run:** In production, the cron/job should fetch gold price **once**, then generate the banner and send the PN using that same payload. Avoid calling the gold API again inside `/banner/image` for the same run so title, body, and image stay consistent.

---

### 2. Connect to Firebase Cloud Messaging (FCM)

To send real push notifications with the dynamic banner image:

1. **Firebase project**
   - Create a project in [Firebase Console](https://console.firebase.google.com/).
   - Enable **Cloud Messaging**.
   - In Project settings → Service accounts, generate a **private key** (JSON). Keep this file secure and **never commit it**.

2. **Install Admin SDK**
   ```bash
   npm install firebase-admin
   ```

3. **Initialize and send** (e.g. in a new file `send-push.js` or inside your cron handler):

   ```javascript
   const admin = require('firebase-admin');

   // Option A: env path to service account JSON
   const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
   if (path) admin.initializeApp({ credential: admin.credential.cert(require(path)) });
   // Option B: inline (prefer env vars in production)
   // admin.initializeApp({ credential: admin.credential.cert(require('./serviceAccountKey.json')) });

   async function sendGoldPriceDropPush(fcmTokens, bannerImageUrl, goldData) {
     const { getBannerData } = require('./banner.js');
     const data = getBannerData(goldData);

     const message = {
       notification: {
         title: data.title,
         body: data.pnBody,
       },
       android: {
         notification: {
           image: bannerImageUrl,
           channelId: 'gold_price', // optional
         },
       },
       tokens: fcmTokens, // or use topic: topic: 'gold_subscribers'
     };

     const res = await admin.messaging().sendEachForMulticast(message);
     return res;
   }
   ```

4. **Env**
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
   ```
   Your app gets FCM tokens from your mobile app (or you use FCM **topics** and subscribe users to e.g. `gold_subscribers`).

---

### 3. Changes in this project for production deployment

| Area | Current (demo) | Production change |
|------|----------------|--------------------|
| **Gold price** | `getGoldPrice()` in `server.js` returns random mock data | Replace with HTTP call to real gold API; use `GOLD_API_URL` (and `GOLD_API_KEY` if needed). |
| **Banner image URL** | Served on-the-fly at `/banner/image` | Generate banner once per run → **upload PNG to S3/R2** (or your CDN) → use that **public URL** in the FCM payload. FCM requires a publicly reachable image URL. |
| **Push sending** | Not implemented | Add `firebase-admin`; implement `sendGoldPriceDropPush(fcmTokens, imageUrl, goldData)` (or topic). Call it from your cron after uploading the banner. |
| **Scheduling** | None | Run as a **cron job** (e.g. Cloud Scheduler → HTTP to your service, or Lambda on schedule). Flow: fetch gold → generate banner → upload → send FCM. |
| **Secrets** | None | Use env vars or a secrets manager: `GOLD_API_URL`, `GOLD_API_KEY`, `GOOGLE_APPLICATION_CREDENTIALS`, S3/R2 credentials. Add `.env` to `.gitignore` and never commit keys. |
| **Banner endpoint** | `/banner/image` generates on every request | For cron: call `generateBanner(goldData)` once, upload buffer to S3/R2, then send FCM with the returned URL. You can still keep `/banner/image` for preview or use a “dynamic image API” (see Pro tip). |
| **Error handling** | Basic try/catch for banner | Add retries for gold API and FCM; log failures; consider dead-letter or alerts if the daily run fails. |
| **Health** | None | Optional: add `GET /health` that checks gold API (and optionally Firebase) so your orchestrator can monitor. |
| **Notification icon** | Preview uses a placeholder/Play icon URL in `preview.html` | **In production**, replace the notification icon URL with your **actual app icon** (e.g. from your CDN or app assets). The banner image itself has no logo; only the small header icon in the PN should use the real app icon. |

**Minimal production flow (pseudo-code):**

```text
1. Cron triggers (e.g. 6 PM daily).
2. goldData = await getGoldPrice()           // real API
3. { buffer } = await generateBanner(goldData)
4. imageUrl = await uploadToS3(buffer)        // or R2; get public URL
5. tokens = await getFCMTokensForGoldUsers()   // or use topic
6. await sendGoldPriceDropPush(tokens, imageUrl, goldData)
```

No changes are required inside **`banner.js`** for production; only the **data source** (gold API) and **downstream** (upload + FCM) need to be wired.

---

## Run locally

```bash
git clone https://github.com/adarsh-bharatpe/dynamic-push-notifications.git
cd dynamic-push-notifications
npm install
npm start
```

Server: **http://localhost:3000**

- **GET /latest** — gold price JSON (₹15,000–₹18,000/gram, random).
- **GET /banner** — **mock Android phone** with a notification: **Title**, **Subtitle**, and **banner image** (dynamic).
- **GET /banner/image** — raw banner image (PNG or SVG).

Open **http://localhost:3000/banner** to see the push notification inside a mock Android device.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/`, `/latest`, `/api/gold/latest` | Gold price JSON |
| GET | `/banner` | Mock Android notification preview (HTML) |
| GET | `/banner/image`, `/banner.png`, `/gold-banner` | Raw banner image (PNG or SVG) |

### Dynamic banner (this repo)

- **Title:** By direction — “📉 Gold prices just dipped!” (price down) or “📈 Gold is on the rise!” (price up).  
- **Subtitle / header line:** “Perfect time to buy the dip…” (down) or “Prices are climbing today…” (up).  
- **Dynamic:** Today’s date, yesterday’s date at graph endpoints; **₹&lt;drop&gt;/gram** (from `/latest`).

Image is generated on each request; refresh `/banner` for a new price/drop.

**BharatPe brand colours (banner + PN preview):** Only the following palette is used in images and notification UI.

| Role | Name | HEX |
|------|------|-----|
| Primary | BharatPe Green / Teal | `#00B386` |
| Heading | Dark Charcoal | `#1A1A1A` |
| Body text | Grey | `#6B7280` |
| Dark / Text | Black | `#000000` |
| Background | White | `#FFFFFF` |

---

## Tech KPIs (success metrics)

| Metric | Description |
|--------|-------------|
| **Banner generation latency** | Time to generate and (if applicable) upload banner image. |
| **PN delivery rate** | % of sent PNs that reach the device (FCM success rate). |
| **Open / tap rate** | % of delivered PNs that are opened (track via deep link / event). |
| **Conversion** | Gold / product actions attributed to the PN (e.g. from campaign UTM or event). |

---

## Tools used (production reference)

| Layer              | Tool                    |
|--------------------|-------------------------|
| Image generation   | Node Canvas / Puppeteer |
| Hosting            | AWS S3 / Cloudflare R2  |
| CDN                | Cloudflare             |
| Push               | Firebase Cloud Messaging |
| Scheduler          | AWS Lambda / Cloud Scheduler |

---

## Pro tip — dynamic image API

Instead of generating and storing images per run, use a **Dynamic Image API**:

```text
https://img.yourapp.com/gold-banner?price=15570&drop=410
```

Server generates the image on the fly.

**Advantages:** No storage; real-time; easy A/B testing.

---

## Optional: PNG vs SVG

- With **canvas** installed (`npm install`), `/banner/image` returns **PNG**.
- If canvas fails to build (e.g. missing system deps), the app falls back to **SVG** (no native deps); open `/banner` in the browser to view.

---

## Future (optional)

How CRED, Groww, Jar send **millions of personalized dynamic banners** in push notifications without generating millions of images — using a clever CDN trick. (To be elaborated if needed.)
