# Dynamic Push Notifications — PRD + TSD

## Overview

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

Use this exact structure for the Gold Price Drop PN.

| Field | Content |
|--------|--------|
| **Title** | Gold Price Drop |
| **Subtitle** | Time to maximise your saving today |
| **PN image** | Dynamic banner (generated with today’s price / drop). |

**Body copy**

- **Static:**  
  `Gold Discount day, invest in gold today before this is gone.`
- **Dynamic (fill from API / date):**
  - Today’s date (e.g. *16 Mar 2026*).
  - Yesterday’s date (e.g. *15 Mar 2026*).
  - Price difference as **big/emphasised**: e.g. **₹410/gram** (use actual `drop` from gold price API).

**Example final body:**

> Gold Discount day, invest in gold today before this is gone.  
> **16 Mar 2026** vs **15 Mar 2026** — **₹410/gram** down.

**Placeholders for implementation**

| Placeholder | Source |
|-------------|--------|
| `{{TODAY_DATE}}` | e.g. `16 Mar 2026` |
| `{{YESTERDAY_DATE}}` | e.g. `15 Mar 2026` |
| `{{PRICE_DROP_PER_GRAM}}` | `drop` from API, e.g. `410` → show as **₹410/gram** |

---

## Step 1 — Fetch Gold Price from API

**Example:**

```http
GET https://api.goldpriceapi.com/latest
```

**Response:**

```json
{
  "price_per_gram": 15570,
  "previous_price": 16190
}
```

**Calculate drop:**

```text
drop = previous_price - price
```

---

## Step 2 — Generate Dynamic Banner

Instead of static images, generate banners dynamically.

**Example (Node.js + Canvas):**

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

Upload to **AWS S3 / Cloudflare R2**.

**Example URL:**

```text
https://cdn.yourapp.com/gold/2026-03-16.png
```

---

## Step 3 — Send Push Notification with Image

Using **Firebase Cloud Messaging (FCM)**.

**Example payload (matches [Push notification content](#push-notification-content-copy) above):**

```json
{
  "message": {
    "token": "USER_DEVICE_TOKEN",
    "notification": {
      "title": "Gold Price Drop",
      "body": "Gold Discount day, invest in gold today before this is gone. 16 Mar 2026 vs 15 Mar 2026 — ₹410/gram down."
    },
    "android": {
      "notification": {
        "image": "https://cdn.yourapp.com/gold/banner_16_mar.png"
      }
    }
  }
}
```

- **Title:** Gold Price Drop  
- **Subtitle:** Time to maximise your saving today (use `android.notification.channelId` / data payload if your app reads subtitle from data).  
- **Body:** Static + dynamic (today’s date, yesterday’s date, **₹410/gram**).  
- **Image:** Dynamic banner URL.

Android automatically shows the image banner in the PN.

---

## Step 4 — Android App Support

On Android you must support **BigPictureStyle**.

**Example:**

```kotlin
val bigPictureStyle = NotificationCompat.BigPictureStyle()
    .bigPicture(bitmap)
    .bigLargeIcon(null)
```

If using Firebase automatically, it already renders.

---

## Step 5 — Automate Daily

Create **cron job**: every day at 6 PM.

**Flow:**

1. Fetch gold price  
2. Calculate price drop  
3. Generate banner  
4. Upload banner  
5. Send push  

**Result:** User receives PN with title, body, and dynamic banner image (e.g. “Gold Price Drop 📉”, “Price down by ₹410/g”).

---

## Pro Tip — How Top Fintech Apps Do It

Instead of generating images every time, they use a **Dynamic Image API**.

**Example:**

```text
https://img.yourapp.com/gold-banner?price=15570&drop=410
```

Server generates the image on the fly.

**Advantages:**

- No storage  
- Real-time  
- Easy A/B testing  

---

## Tools Used in Production

| Layer              | Tool                    |
|--------------------|-------------------------|
| Image generation   | Node Canvas / Puppeteer |
| Hosting            | AWS S3 / Cloudflare R2 |
| CDN                | Cloudflare             |
| Push               | Firebase Cloud Messaging |
| Scheduler          | AWS Lambda / Cloud Scheduler |

---

## Future: Fintech Trick (Optional)

How CRED, Groww, Jar send **millions of personalized dynamic banners** in push notifications without generating millions of images — using a clever CDN trick. (To be elaborated if needed.)
