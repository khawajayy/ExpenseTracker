# 💳 Expense Tracker

A personal expense-tracking web app that mirrors the Excel workbook it was built
from: a **Transactions** log, an auto-computed **Dashboard** (income / expenses /
net + spending by category), and a **Net Worth** register (assets + bank balances).

- **Hosting:** static site on GitHub Pages (no server to run or pay for)
- **Login & data:** [Supabase](https://supabase.com) email sign-in + Postgres,
  so your data syncs across your phone and laptop
- **Privacy:** Row Level Security locks every row to your own account
- **Currency:** PKR (Rs) — change `CURRENCY_PREFIX` in `js/config.js`

---

## One-time setup

### 1. Create a free Supabase project
1. Go to <https://supabase.com> → sign in → **New project**.
2. Give it a name and a strong database password (you won't need the password in
   the app). Wait ~2 minutes for it to provision.

### 2. Create the database tables
1. In your project: **SQL Editor** → **New query**.
2. Open [`supabase/schema.sql`](supabase/schema.sql), copy all of it, paste, and
   click **Run**. This creates the `transactions` and `accounts` tables and the
   security rules.

### 3. Plug your keys into the app
1. In Supabase: **Project Settings → API**.
2. Copy the **Project URL** and the **anon / public** key.
3. Open [`js/config.js`](js/config.js) and paste them in:
   ```js
   export const SUPABASE_URL = "https://xxxxxxxx.supabase.co";
   export const SUPABASE_ANON_KEY = "eyJhbGciOi...";
   ```
   > These two values are safe to commit publicly — the anon key can only reach
   > data allowed by the security rules, which restrict everything to the
   > signed-in user.

### 4. Create your account
Easiest way (no email confirmation needed):
1. Supabase → **Authentication → Users → Add user → Create new user**.
2. Enter your email + a password, and tick **Auto Confirm User**.

Then, so nobody else can register on your app:
3. Supabase → **Authentication → Sign In / Providers → Email** → turn **Allow new
   users to sign up** **off**.

(You can instead just open the app and use **Create an account** — but then you
must confirm via email, and you should still disable sign-ups afterward.)

---

## Deploy to GitHub Pages

From this folder (`Expense Tracker`), in a terminal:

```bash
git init
git add .
git commit -m "Expense tracker app"
git branch -M main
git remote add origin https://github.com/khawajayy/ExpenseTracker.git
git push -u origin main
```

Then on GitHub:
1. Repo → **Settings → Pages**.
2. **Build and deployment → Source:** *Deploy from a branch*.
3. **Branch:** `main`, folder `/ (root)` → **Save**.
4. Wait ~1 minute. Your app is live at:
   **https://khawajayy.github.io/ExpenseTracker/**

Open that URL, sign in with the account from step 4, and (first time only) click
**Import starter data (July 2026)** at the bottom to load your existing figures.

---

## Using the app

- **Month selector** (top): `‹ July 2026 ›`. Each month has its own transactions
  and summary. Click the month name to jump back to the current month.
- **Dashboard:** income, expenses, net balance, and a spending-by-category
  breakdown for the selected month, plus your current net worth.
- **Transactions:** add / edit / delete. Toggle **OUT** (spent) or **IN**
  (received); category is only needed for spending.
- **Net Worth:** edit any asset or bank balance inline (saves on blur), add or
  remove accounts. These balances are ongoing (not per-month).

To update the live site after any change: `git add . && git commit -m "..." && git push`.

---

## Project structure

```
index.html            App shell (auth screen + three views)
css/styles.css        Styling (dark / light, responsive)
js/config.js          <-- your Supabase URL + anon key go here
js/supabase.js        Supabase client init
js/constants.js       Expense categories
js/seed.js            July 2026 starter data
js/app.js             All app logic (auth, CRUD, rendering)
supabase/schema.sql   Database tables + Row Level Security
```

No build step, no dependencies to install — it's plain HTML/CSS/JS that loads the
Supabase library from a CDN.
