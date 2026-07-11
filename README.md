# 🏆 Competition Manager

A web app to run a team competition end to end:

- **Players self-register** to join.
- **One primary admin + secondary admins** run everything.
- **Admins build teams** and assign players to them.
- **Admins add games and enter each team's points** — standings & the podium
  update automatically (cumulative points).
- **Admins schedule fixtures** (team vs team) and record results.
- Public pages show live **standings / podium**, **fixtures**, and **team rosters**.

**Stack:** React + Vite + React Router (frontend, plain CSS) · **Google Sheets +
Apps Script** (database + API). No server to run — the frontend is static files
and the backend is a free Google Apps Script Web App.

> Note: You originally mentioned SQL. This build uses **Google Sheets** as the
> data store (your choice). It's free and zero-infrastructure, great for one
> competition, but it isn't SQL and isn't built for heavy concurrent writes. The
> React app is written against a small `api.js` layer, so swapping to a real SQL
> backend (e.g. Supabase) later would not require rewriting the UI.

---

## 📁 Project structure

```
Competiton App/
├── index.html
├── package.json
├── vite.config.js
├── vercel.json              # SPA rewrite for Vercel
├── .env.example             # copy to .env, add your API URL
├── apps-script/
│   ├── Code.gs              # the entire backend (paste into Apps Script)
│   └── SETUP.md             # step-by-step backend setup
├── public/
│   ├── trophy.svg
│   └── _redirects           # SPA rewrite for Netlify
└── src/
    ├── main.jsx / App.jsx   # app shell + routes
    ├── api.js               # calls the Apps Script backend
    ├── auth.jsx             # admin login state
    ├── useData.js           # shared competition data
    ├── useAction.js         # admin action helper
    ├── components/          # Layout, Podium, AdminNav, UI bits
    └── pages/               # public pages + pages/admin/*
```

---

## 🚀 Setup (two parts)

### Part 1 — Backend (Google Sheets), ~10 min
Follow **[`apps-script/SETUP.md`](./apps-script/SETUP.md)**. You'll end up with a
Web App URL ending in `/exec`. That's your API.

### Part 2 — Frontend (this app)

1. **Add your API URL.** Copy the example env file and paste your `/exec` URL:
   ```bash
   cp .env.example .env
   # then edit .env:  VITE_API_URL=https://script.google.com/macros/s/..../exec
   ```
2. **Install & run:**
   ```bash
   npm install
   npm run dev
   ```
   Open http://localhost:5173.

Log in at **/login** with the admin username/password you set in `Code.gs`.

> ⚠️ **Folder-name gotcha:** this project currently lives inside a folder named
> `HTML:CSS`. The `:` is the PATH separator on macOS/Linux, which breaks the
> normal `vite` command. That's why `package.json` runs vite as
> `node node_modules/vite/bin/vite.js`. It works fine as-is — but if you ever move
> the project somewhere without a `:` in the path, you can simplify the scripts
> back to `"dev": "vite"` etc.

---

## 🌐 Deploy the frontend

The frontend is just static files (`npm run build` → `dist/`). Pick one:

### Option A — Vercel (easiest)
1. Push this folder to a GitHub repo.
2. On [vercel.com](https://vercel.com) → **New Project** → import the repo.
3. Framework preset: **Vite**. Build command `npm run build`, output `dist`.
4. Add an **Environment Variable**: `VITE_API_URL` = your `/exec` URL.
5. Deploy. `vercel.json` already handles page refresh routing.

### Option B — Netlify
1. Push to GitHub, then **Add new site → Import** on [netlify.com](https://netlify.com).
2. Build command `npm run build`, publish directory `dist`.
3. Add env var `VITE_API_URL`. (`public/_redirects` handles routing.)

### Option C — any static host
```bash
npm run build      # outputs dist/
```
Upload `dist/` anywhere. Make sure the host rewrites unknown routes to
`index.html` (for `/standings` etc. to work on refresh).

> Set `VITE_API_URL` in the host's build env **before** building — Vite bakes it
> into the bundle at build time.

---

## 🧭 How to run a competition (admin flow)

1. **Teams** → create your teams.
2. **Players** → players register at `/register`; approve them and assign to teams.
3. **Games & Scores** → add each game/round, type each team's points, Save.
   The standings and podium recompute from the totals.
4. **Fixtures** → schedule team-vs-team matches and record scores/status.
5. **Admins** (primary only) → add secondary admins.

## 🔐 Security notes
- Admin auth is password-based (salted + SHA-256 hashed in the sheet) with
  12-hour login tokens. It's hobby-grade — fine for a friendly competition, not
  for sensitive data. Use a strong, unique admin password.
- Anyone with the app can register as a player and read public standings — that's
  by design.

## 🛠️ Changing things
- **Rename the competition:** edit the `Config` tab's `competitionName` in the sheet.
- **Change scoring rules:** the standings math lives in `getState()` in `Code.gs`.
- **Edit data by hand:** it's just a spreadsheet — you can fix rows directly.
- **Update the backend code:** re-deploy (see the end of `apps-script/SETUP.md`).
```
