# Backend setup — Google Sheets + Apps Script (≈10 minutes)

This creates your free, no-server database + API. You only do this once.

## 1. Create the spreadsheet
1. Go to https://sheets.google.com and create a **blank** spreadsheet.
2. Name it something like `Competition Data`.

## 2. Add the script
1. In that spreadsheet, menu: **Extensions → Apps Script**.
2. Delete any code in `Code.gs`, then paste the entire contents of
   [`Code.gs`](./Code.gs) from this project.
3. Click the **Save** (💾) icon.

> There's nothing to configure at the top of the file anymore — there's no
> seeded admin. Everyone signs up inside the app, and anyone can create a
> competition (becoming its owner) or join one with a code.

## 3. Initialize the database
1. In the toolbar function dropdown, choose **`initialize`**.
2. Click **Run**.
3. Google will ask you to authorize — click **Review permissions**, pick your
   account, click **Advanced → Go to (project name)**, then **Allow**.
   (This is normal: the script needs permission to edit *your* sheet.)
4. Check the sheet — you should now see tabs: `Users, Sessions, Competitions,
   Admins, Players, Teams, Games, Fixtures`.

## 4. Deploy as a Web App (this is your API URL)
1. Top right: **Deploy → New deployment**.
2. Click the ⚙️ next to "Select type" → **Web app**.
3. Set:
   - **Description:** `Competition API`
   - **Execute as:** **Me**
   - **Who has access:** **Anyone**
4. Click **Deploy**, authorize again if asked.
5. Copy the **Web app URL** — it ends in `/exec`. This is your `VITE_API_URL`.

## 5. Wire it into the React app
In the project root, copy `.env.example` to `.env` and paste your URL:
```
VITE_API_URL=https://script.google.com/macros/s/AKfy...../exec
```
Then run `npm install && npm run dev` and open http://localhost:5173.

## 6. First run (in the app)
**Host (you):**
1. Click **Host log in → Create host account** (username + password).
2. Click **New competition**, give it a name — you'll get a **player code** and
   an **admin code**.
3. Add some **teams** in the competition's *Manage → Teams* area.

**Players:** share the **player code**. Anyone can click **Join a competition**,
enter the code + a display name (no account), and they're auto-assigned to the
smallest team. Their device remembers them.

**Co-admins:** share the **admin code**. They create/log into an account, then
enter it under **Admin code** to become a secondary admin.

---

### Updating the backend later
If you change `Code.gs`, you must **re-deploy**: **Deploy → Manage deployments
→ (edit ✏️) → Version: New version → Deploy**. The `/exec` URL stays the same.

### How data is organised
- **Users** — host / admin accounts (username + salted/hashed password).
- **Competitions** — each has a **playerCode**, an **adminCode**, and an owner.
- **Admins** — which accounts administer which competition (`primary`/`secondary`).
- **Players** — anonymous participants (name + device token), one per competition.
- **Teams / Games / Fixtures** — belong to one competition. Standings come from
  fixture scores.

### Notes & limits (Google Sheets as a database)
- Fine for a handful of competitions with tens of players each. Not built for
  heavy concurrent writes.
- Login tokens last 14 days (`SESSION_TTL_MS`).
- Passwords are salted + SHA-256 hashed. Still hobby-grade — use unique passwords.
- All data is just rows you can view/fix by hand in the sheet if needed.
