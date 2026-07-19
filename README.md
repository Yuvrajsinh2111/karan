# Laxmichem Billing App

Mobile-first billing web app for chemical trading: Tax Invoices, Commission Bills, Purchase Orders — with records, filters, dashboard and backup. Built with Next.js + Tailwind + Supabase.

## One-time setup (~10 minutes)

### 1. Create the Supabase project
1. Go to [supabase.com](https://supabase.com) → sign up (free) → **New project** (any name, e.g. `laxmichem`), choose region **Mumbai**, set a strong database password.
2. Wait ~2 minutes for it to provision.

### 2. Create the database tables
1. In your Supabase project, open **SQL Editor** → **New query**.
2. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. It creates all tables, indexes and security policies, and pre-fills your firm's details (editable later in Settings).

### 3. Create your login user
1. **Authentication → Users → Add user → Create new user.**
2. Enter your email + a strong password. Tick **Auto Confirm User**.

### 4. Connect the app
1. **Project Settings → API** — copy the **Project URL** and **anon public** key.
2. Copy `.env.local.example` to `.env.local` and paste both values.

### 5. Run it
```bash
npm install
npm run dev
```
Open http://localhost:3000 and sign in.

## Deploy to Vercel (access from your phone)
1. Push this folder to a GitHub repository.
2. [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. In the project's **Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same values as `.env.local`).
4. Deploy — you'll get a URL like `laxmichem.vercel.app`. Open it on your phone and "Add to Home Screen" for an app-like experience.

## Daily use
- **+ New Bill** → pick type → pick party/product → save → **Print / PDF**.
- Parties and Products are saved once and reused; add them before your first bill.
- GST is automatic: party in Gujarat → CGST+SGST, other state → IGST (you can override per bill).
- Invoice numbers auto-increment per type per financial year; you can override the number on any bill.
- **Backup monthly** from More → Backup & Export (the dashboard reminds you after 30 days).

## Existing project upgrade
If your Supabase project was created before the scale upgrade, run [`supabase/scale.sql`](supabase/scale.sql) once in the SQL Editor. It adds atomic bill numbering and database-side dashboard aggregation (fresh installs get these from `schema.sql` automatically).

## Notes
- Supabase free tier pauses after ~7 idle days — if the app shows a connection error, open supabase.com and click **Restore project**. Using the app weekly prevents this.
- The print output is A4; use the browser's Print → Save as PDF.
