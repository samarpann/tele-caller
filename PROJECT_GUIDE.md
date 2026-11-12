# JewelERP Telecaller CRM — Project Handover & Architecture Guide

A complete reference guide detailing the architecture, codebase structure, features, database configuration, deployment workflow, and instructions for making future updates.

---

## 1. Quick Reference & System Links

| Resource | Value / URL |
| :--- | :--- |
| **Live Production Application** | [https://tele-caller-ylfw.vercel.app](https://tele-caller-ylfw.vercel.app) |
| **GitHub Repository** | [https://github.com/samarpann/tele-caller.git](https://github.com/samarpann/tele-caller.git) (branch `main`) |
| **Local Project Path** | `/Users/samarpan/swastik/swastik-telecaller` |
| **Production Cloud Database** | MongoDB Atlas (`swastik_telecaller` on cluster `atlas-violet-pillar.qh9sxcn.mongodb.net`) |
| **Framework & Stack** | Next.js 15.5.29 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, MongoDB Driver, XLSX |

---

## 2. Default Credentials & Role-Based Access

The platform uses HMAC SHA-256 session cookies (`telecaller_session`) with strict server-side Role-Based Access Control (RBAC):

### Super Admin
* **Username:** `admin`
* **Password:** `admin123`
* **Permissions:** Full access to Lead Distribution, Auto-Distribution, Bulk Assignment & Unassignment, Team Performance, User Credential Management, Excel Import/Export, and All-Lead Dialer.

### Active Sales Callers
Callers can **only view and dial leads assigned to their username**. They cannot see other callers' queues or unassigned leads.

| Username | Name | Role | Current Workload |
| :--- | :--- | :--- | :--- |
| `sale7` | **preeti** | Caller | **80 West Delhi Jeweller Leads** (`WD-JWL-101` to `WD-JWL-180`) |
| `sales1` | **Priya Sharma** | Caller | **20 West Delhi Jeweller Leads** (`WD-JWL-001` to `020`) |
| `sales2` | **Rahul Verma** | Caller | **20 West Delhi Jeweller Leads** (`WD-JWL-021` to `040`) |
| `sales3` | **Neha Gupta** | Caller | **20 West Delhi Jeweller Leads** (`WD-JWL-041` to `060`) |
| `sales4` | **Amit Singh** | Caller | **20 West Delhi Jeweller Leads** (`WD-JWL-061` to `080`) |
| `sales5` | **Pooja Patel** | Caller | **20 West Delhi Jeweller Leads** (`WD-JWL-081` to `100`) |
| `sale6` | **sale-6** | Caller | **300 Delhi NCR Manufacturing Leads** (with call history) |

*(Default password for callers is `sales123` or `123456`)*

---

## 3. What Was Built & Key Features

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SUPER ADMIN DASHBOARD                           │
├────────────────────┬────────────────────┬──────────────────────────────┤
│ 💎 West Delhi Hubs │ 👥 Auto-Distribute │ ↩️ 1-Click Outcome Undo      │
│ 180 Jewellers (7   │ Round-robin to     │ Instant undo on deck, toast, │
│ prime retail zones)│ active callers     │ table rows, & bulk selection │
├────────────────────┼────────────────────┼──────────────────────────────┤
│ 📦 Bulk Assignment │ 📵 Direct Dialer   │ 🛡️ Overwrite Protection     │
│ Assign, Unassign,  │ 1-tap Phone (tel:) │ MongoDB $setOnInsert guards  │
│ Reset Status       │ & WhatsApp web API │ caller data on redeployment  │
└────────────────────┴────────────────────┴──────────────────────────────┘
```

### 1. West Delhi Jeweller CRM Dataset (180 Total Leads)
* Categorized by prime jewelry markets:
  * **Karol Bagh Bank St & Ajmal Khan Rd (45)**
  * **Rajouri Garden & Vishal Enclave (35)**
  * **Tilak Nagar & Old Mahavir Nagar (25)**
  * **Pitampura & Rohini (25)**
  * **Punjabi Bagh Club Rd & Central Market (22)**
  * **Janakpuri & Vikaspuri (15)**
  * **Paschim Vihar (13)**
* Each lead includes: Showroom name, owner/contact person, verified phone number, showroom size, turnover, existing accounting software gap (Tally 9, Busy, Marg, Paper registers), workshop karigar setup, and tailored JewelERP sales pitch angle.

### 2. Accidental Click "Undo" Engine
When a caller or admin records an outcome (`Interested`, `Callback`, `No Answer`, `Rejected`):
* **Floating Toast:** An amber toast banner appears: *"Marked [Name] as [Status]. Accidental click? [↩️ Undo]"*.
* **Lead Card Banner:** The lead card displays its current outcome with an explicit **`[ ↩️ Undo / Reset to Pending ]`** button.
* **Mobile Quick Undo:** On mobile devices, an undo pill appears right above the thumb buttons.
* **Inline Table Undo:** A `↺` button next to any outcome badge in both the Lead Distribution and Dialer table views.
* **Bulk Reset:** Select any number of leads and click **`Reset to Pending (X)`** to revert mistaken batches in one click.

### 3. Safe Sync & Overwrite Protection
* The database sync and seeding scripts use MongoDB's **`$setOnInsert`** for `assignedTo`, `assignedToName`, `assignedAt`, `status`, `notes`, and `callbackTime`.
* **Static showroom data** updates cleanly on deploy, while **caller assignments and call progress are preserved 100%**.

### 4. Lead Assignment & Unassignment
* **Bulk Assign:** Select multiple leads across pages and assign to any caller.
* **Bulk Unassign:** Select leads and click `Unassign (X)` to move them to Unassigned.
* **Single Unassign:** Click the `×` button next to any assigned caller in table view.
* **Auto-Distribute:** Automatically divides unassigned leads evenly round-robin across selected active callers.

---

## 4. Codebase Architecture & File Structure

```
swastik-telecaller/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts      # Authentication & bcrypt hash verification
│   │   │   │   ├── logout/route.ts     # Cookie invalidation
│   │   │   │   └── me/route.ts         # Session token verification
│   │   │   ├── export/route.ts         # Export leads to Excel (.xlsx)
│   │   │   ├── leads/
│   │   │   │   ├── route.ts            # GET: Paginated leads with filters & search; POST: XLSX upload
│   │   │   │   ├── [id]/route.ts       # GET single lead, PUT lead status/notes
│   │   │   │   └── assign/route.ts     # POST: bulk assign, unassign, auto-distribute, reset-status
│   │   │   ├── stats/route.ts          # Aggregate counts (called, pending, interested, conversion)
│   │   │   ├── sync-jewellers/route.ts # Safe upsert of jeweller leads into Atlas via $setOnInsert
│   │   │   └── users/
│   │   │       ├── route.ts            # GET list of users with stats; POST create new caller
│   │   │       └── [username]/route.ts # PUT edit caller; DELETE caller
│   │   ├── login/page.tsx              # Modern luxury login page
│   │   ├── page.tsx                    # Main Telecaller App (Super Admin & Caller views)
│   │   ├── layout.tsx                  # Root layout & dark theme styling
│   │   └── globals.css                 # Tailwind CSS styling
│   └── lib/
│       ├── mongodb.ts                  # MongoDB Atlas connection pooling & database initialization
│       ├── db.ts                       # Core database operations (search, filter, assign, unassign, stats)
│       ├── users.ts                    # User management, bcrypt hashing, HMAC session tokens
│       ├── west-delhi-jewellers.ts     # 180 West Delhi Jeweller leads dataset
│       └── initial-leads.ts            # 300 Delhi NCR manufacturing leads dataset
├── data/                               # Local JSON fallback cache for offline development
├── package.json                        # Dependencies (Next 15.5.29, React 19, MongoDB 6.13)
├── tsconfig.json                       # TypeScript config
└── next.config.ts                      # Next.js build config
```

---

## 5. How to Deploy & Make Future Changes

### Step 1: Making Code Changes
When editing files in `/Users/samarpan/swastik/swastik-telecaller`:
```bash
# Verify TypeScript types and production build locally
npm run build
```

### Step 2: Committing & Pushing to GitHub
Vercel is linked to GitHub `origin/main`. Any push automatically triggers a build and deploy:
```bash
git add .
git commit -m "feat: description of your change"
git push origin main
```

### Step 3: Verifying on Vercel
* Check live site: `https://tele-caller-ylfw.vercel.app`
* Check build status on Vercel dashboard: [vercel.com](https://vercel.com)
* If adding new leads to `west-delhi-jewellers.ts`, trigger a safe sync while logged in as Super Admin:
  ```bash
  curl -b /tmp/cookies.txt "https://tele-caller-ylfw.vercel.app/api/sync-jewellers"
  ```

---

## 6. Starting a New Chat Context

When starting a fresh chat session, provide this brief prompt:

> "I am working on the **JewelERP Telecaller CRM** located at `/Users/samarpan/swastik/swastik-telecaller` (live at `https://tele-caller-ylfw.vercel.app`, repo `github.com/samarpann/tele-caller.git`). The database is MongoDB Atlas (`swastik_telecaller`). Refer to `PROJECT_GUIDE.md` in the project root for full architecture, credentials, and caller workload."
