# BNBMS — BNB Management System

A multi-tenant SaaS platform for apartment and lodge management. Built with React + Vite, Vercel serverless functions, and Neon PostgreSQL.

---

## 🚀 Quick Deployment (5 steps)

### Step 1 — Set up the database (Neon)
1. Go to [neon.tech](https://neon.tech) and create a free project
2. In your Neon dashboard, click **SQL Editor**
3. Paste the entire contents of `schema.sql` and click **Run**
4. You should see tables created successfully
5. Copy your **Connection String** (starts with `postgresql://`)

### Step 2 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial BNBMS commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bnbms.git
git push -u origin main
```

### Step 3 — Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **New Project** → **Import from GitHub**
3. Select your `bnbms` repository
4. Vercel will auto-detect the Vite settings
5. Before clicking Deploy, go to **Environment Variables** and add:
   ```
   DATABASE_URL = postgresql://your-neon-connection-string
   ```
6. Click **Deploy**

### Step 4 — Verify deployment
Visit `https://your-project.vercel.app/api/stores?action=setup` — you should see:
```json
{ "ok": true, "tables": [...] }
```

### Step 5 — First login
- Visit your deployed URL
- Click **Sign In** → **Super Admin**
- Email: `admin@bnbms.co.tz`
- Password: `Admin@2024!`
- **Immediately go to Settings → Change Password**

---

## 👥 User Access

### Super Admin (you)
- URL: your-site.vercel.app
- Click Sign In → Super Admin
- Credentials set in `schema.sql` (change after first login)

### Store Owners
- Register at: your-site.vercel.app → "List Your Property"
- Or: Sign In → Store Owner
- After registration, they get 14-day free trial

### Store Staff
- Sign In → Staff Login
- Requires: **Store ID** (shown in owner portal) + email + PIN
- Store owner must create staff accounts and share the Store ID

### Guests (customers)
- Browse properties on the homepage
- Click any room → "Book Now" → creates account or logs in

---

## 📁 Project Structure

```
bnbms/
├── api/                    # Vercel serverless functions
│   ├── _db.js             # Database connection + auth helpers
│   ├── auth.js            # Login for super/owner/staff
│   ├── stores.js          # Store CRUD + marketplace
│   ├── subscriptions.js   # Subscription plans + billing
│   ├── platform.js        # Platform settings
│   ├── locations.js       # Location management
│   ├── rooms.js           # Room management
│   ├── bookings.js        # Full booking lifecycle
│   ├── staff.js           # Staff + payment methods
│   ├── expenses.js        # Expense logging
│   ├── reports.js         # Financial reports

│   ├── reviews.js         # Reviews

├── src/
│   ├── App.jsx            # Main React app (all portals)
│   ├── api.js             # Frontend API client
│   └── main.jsx           # React entry point
├── schema.sql             # Full database schema + seed data
├── vercel.json            # Vercel routing config
├── vite.config.js         # Vite build config
└── package.json
```

---

## 🔑 Authentication System

Tokens are base64-encoded strings: `type:id:storeId`

| Token Type | Format | Who |
|-----------|--------|-----|
| `super:SA001` | Super admin | You |
| `owner:OWN123:ST456` | Store owner | Apartment owner |
| `staff:S789:ST456` | Staff | Receptionist/manager |

Customers use a separate session in `bnbms_customer` localStorage.

---

## 💳 Subscription Plans (defaults)

| Plan | Monthly | Locations | Rooms | Staff |
|------|---------|-----------|-------|-------|
| Free Trial | TZS 0 | 1 | 5 | 2 |
| Starter | TZS 29,000 | 2 | 15 | 5 |
| Professional | TZS 79,000 | 10 | 50 | 20 |
| Enterprise | TZS 199,000 | ∞ | ∞ | ∞ |

Edit these in Super Admin → Plans.

---

## 🛠 Local Development

```bash
npm install
# Create .env file:
echo "DATABASE_URL=your-neon-connection-string" > .env
npm run dev
# Visit http://localhost:5173
```

---

## 🔒 Security Notes

- Passwords are stored as plain text in demo mode — add bcrypt hashing before production
- The `DATABASE_URL` must ONLY be in Vercel environment variables — never commit it to GitHub
- Change the super admin password immediately after first deployment
- Store IDs are needed for staff login — keep them private within your team

---

## 📞 Support

Built on top of BNC Lodge system. For issues, check Vercel function logs:
Vercel Dashboard → Your Project → Functions → View logs
