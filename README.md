# Shopify Marketplace Platform

A full-stack Next.js marketplace that aggregates products from multiple Shopify stores into one unified browsing experience. Shoppers browse natively, click a product, and the store opens in an embedded viewer — they never leave your platform.

---

## Features

- **Homepage** — hero section, partner store grid, featured random products
- **Products page** — unified product feed with filters (store, category, price, sort)
- **Search page** — live cross-store search with 400ms debounce
- **Embedded store viewer** — iFrame viewer with your platform nav always on top
- **Admin panel** — add/edit/delete stores, manual sync, real-time stats, sync logs
- **Webhook receiver** — auto-syncs product data when stores update Shopify
- **Prisma + Postgres** — full persistence, no in-memory state

---

## Tech Stack

| | |
|---|---|
| Framework | Next.js 14 (App Router) |
| Shopify API | Storefront API (public, no OAuth needed) |
| Database | PostgreSQL via Prisma ORM |
| Styling | CSS Variables + inline styles (dark theme) |
| Deployment | Vercel (recommended) |

---

## Setup

### 1. Clone and install

```bash
git clone <your-repo>
cd marketplace
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

```env
DATABASE_URL="postgresql://user:password@host:5432/marketplace"
NEXT_PUBLIC_APP_URL="https://your-marketplace.com"
SHOPIFY_WEBHOOK_SECRET="generate-a-random-secret"
ADMIN_SECRET_KEY="your-admin-password"
```

### 3. Set up the database

```bash
npm run db:migrate     # Run migrations
# or for fast prototyping:
npm run db:push        # Push schema directly (no migration files)
```

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000

---

## Connecting Your First Store

### Step 1 — Get a Storefront API token from each client store

1. Go to **Shopify Admin** → Settings → Apps and sales channels
2. Click **Develop apps** → Create an app (name it "Marketplace")
3. Click **Configure Storefront API scopes**
4. Enable: `unauthenticated_read_product_listings`, `unauthenticated_read_product_inventory`
5. Click **Save** → **Install app**
6. Copy the **Storefront API access token**

### Step 2 — Add the store in Admin

1. Go to `/admin` on your marketplace
2. Enter your admin password
3. Click **+ Add Store** tab
4. Fill in: Shopify domain, store name, and the token from Step 1
5. Click **Add store**
6. Click **Sync** to pull products immediately

### Step 3 — Configure iFrame embedding (important!)

Shopify blocks iFrame embedding by default. Since you manage these stores, add this to each store's `theme.liquid` in the `<head>` section:

```html
<meta http-equiv="Content-Security-Policy"
  content="frame-ancestors 'self' https://your-marketplace.com;">
```

Or ask your client to add it, or inject it via a Shopify app script.

---

## Webhook Setup (Auto-sync)

Register webhooks so your marketplace auto-updates when a client changes their products.

### Option A — Register via Shopify Admin

For each connected store, go to Shopify Admin → Settings → Notifications → Webhooks and add:

| Topic | URL |
|---|---|
| products/create | `https://your-marketplace.com/api/webhooks` |
| products/update | `https://your-marketplace.com/api/webhooks` |
| products/delete | `https://your-marketplace.com/api/webhooks` |

Set the webhook secret to match `SHOPIFY_WEBHOOK_SECRET` in your `.env`.

### Option B — Register via Shopify API (programmatic)

```bash
curl -X POST https://YOUR-STORE.myshopify.com/admin/api/2024-10/webhooks.json \
  -H "X-Shopify-Access-Token: YOUR-ADMIN-TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "topic": "products/update",
      "address": "https://your-marketplace.com/api/webhooks",
      "format": "json"
    }
  }'
```

Repeat for `products/create` and `products/delete`.

---

## Project Structure

```
marketplace/
├── app/
│   ├── page.jsx                    # Homepage
│   ├── layout.jsx                  # Root layout + navbar
│   ├── globals.css                 # Design system (dark theme)
│   ├── products/
│   │   ├── page.jsx                # Server: fetch products + filters
│   │   └── ProductsClient.jsx      # Client: filter UI + grid
│   ├── search/page.jsx             # Live cross-store search
│   ├── store/[shopDomain]/page.jsx # Embedded store viewer
│   ├── admin/
│   │   ├── layout.jsx              # Admin auth gate
│   │   ├── AdminAuth.jsx           # Password protection
│   │   └── page.jsx                # Full admin panel
│   └── api/
│       ├── products/route.js       # GET products with filters
│       ├── webhooks/route.js       # Shopify webhook receiver
│       └── admin/
│           ├── auth/route.js       # Admin login
│           ├── stores/route.js     # CRUD stores
│           ├── stores/[id]/route.js
│           ├── sync/route.js       # Trigger sync
│           ├── stats/route.js      # Dashboard stats
│           └── logs/route.js       # Sync history
├── components/
│   ├── layout/Navbar.jsx
│   └── ui/ProductCard.jsx
├── lib/
│   ├── db.js                       # Prisma singleton
│   ├── shopify.js                  # Storefront API client
│   └── aggregator.js               # Product sync + queries
└── prisma/schema.prisma
```

---

## Deployment to Vercel

```bash
npm install -g vercel
vercel --prod
```

Set all environment variables in the Vercel dashboard under **Settings → Environment Variables**.

For the database, use [Neon](https://neon.tech) (free Postgres, works perfectly with Vercel) or [Supabase](https://supabase.com).

After deploying, update `NEXT_PUBLIC_APP_URL` to your production URL and re-register webhooks with the production URL.

---

## Shopper Journey

```
Land on marketplace homepage
    ↓
Browse partner stores + random featured products
    ↓
Go to /products — filter by store, category, price
    ↓
Search across all stores at /search
    ↓
Click a product card
    ↓
Store opens in embedded viewer (your nav bar stays on top)
    ↓
Shopper browses, adds to cart, checks out (on Shopify store)
    ↓
Click "← Marketplace" to return — still in your ecosystem
```

---

## Admin Panel Guide

| Action | How |
|---|---|
| Add a store | Admin → "+ Add Store" tab → fill form |
| Edit a store | Admin → Stores tab → Edit button |
| Remove a store | Admin → Stores tab → ✕ → Confirm |
| Manual sync | Admin → Stores tab → Sync (single) or "Sync All Stores" button |
| View sync history | Admin → Sync Logs tab |
| Stats overview | Top of admin page — stores, products, sync count |
