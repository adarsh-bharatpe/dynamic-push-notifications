# Dynamic Push Notifications

Mock gold price API + **dynamic banner image** (run locally; PN delivery not included).

**Repo:** [github.com/adarsh-bharatpe/dynamic-push-notifications](https://github.com/adarsh-bharatpe/dynamic-push-notifications)

## Clone and run

```bash
git clone https://github.com/adarsh-bharatpe/dynamic-push-notifications.git
cd dynamic-push-notifications
npm install
npm start
```

Server: **http://localhost:3000**

- **GET /latest** — gold price JSON (₹15,000–₹18,000/gram, random).
- **GET /banner** — dynamic **Gold Price Drop** banner image (PNG if `canvas` is installed, else SVG).

Open in browser: **http://localhost:3000/banner** to see the banner (title, subtitle, today vs yesterday date, ₹X/gram down).

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/`, `/latest`, `/api/gold/latest` | Gold price JSON |
| GET | `/banner`, `/banner.png`, `/gold-banner` | Dynamic banner image (PNG or SVG) |

---

## Gold price response (example)

```json
{
  "price_per_gram": 16520,
  "previous_price": 17200,
  "drop": 680,
  "currency": "INR",
  "unit": "gram",
  "timestamp": "2026-03-16T12:00:00.000Z"
}
```

---

## Dynamic banner content

- **Title:** Gold Price Drop  
- **Subtitle:** Time to maximise your saving today  
- **Static line:** Gold Discount day, invest in gold today before this is gone.  
- **Dynamic:** Today’s date, yesterday’s date, **₹&lt;drop&gt;/gram down** (from `/latest`).

Image is generated on each request; refresh `/banner` for a new price/drop.

---

## Optional: PNG vs SVG

- With **canvas** installed (`npm install`), `/banner` returns **PNG**.
- If canvas fails to build (e.g. missing system deps), the app falls back to **SVG** (no native deps); open `/banner` in the browser to view.

---

See **requirement.md** for full PRD + TSD (FCM, cron, etc.).
