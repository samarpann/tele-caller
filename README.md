# 📞 Tele-Caller CRM & Lead Management Portal

Modern, responsive telecalling CRM built with **Next.js 15 (App Router)** and **MongoDB Atlas**. Designed specifically for high-velocity sales calling teams in Delhi NCR targeting manufacturing, luxury salons, and specialty cafes.

---

## 🌟 Key Features

* **300 Verified Delhi NCR Leads:**
  * 💇‍♀️ **50 Luxury Salons, Spas & Aesthetic Studios** (Noida Sec 104/18/50/62, GK-1/2, Saket, Vasant Vihar, Khan Market, DLF Galleria Gurugram)
  * ☕ **50 Top Cafes, Bistros & Specialty Roasteries** (Noida Sec 104/18/50/142, Champa Gali, Dhan Mill, Mehrauli, 32nd Avenue, Cyber Hub Gurugram)
  * 🏭 **200 Mixed Manufacturing Units** (Steel & Laser Cutting, Marble & Granite, Sunmica & Decorative Laminates, LT/HT Electrical Panels, UPVC Windows, Corrugated Packaging)
* **Super Admin & Caller Isolation:**
  * **Super Admin View:** Team performance analytics, caller credential management, bulk lead assignment, and 1-click round-robin auto-distribution.
  * **Caller Privacy:** Callers log in with their credentials and **only see their assigned leads** without distraction or data overlap.
* **Ergonomic One-Thumb Mobile Calling Card:**
  * Clean company header with owner name and verified badge.
  * Compact 1-line vitals strip (`Est. Year` • `Turnover` • `Team Size` • `City`).
  * Dedicated **Ice-Breaker / Call Opener Box** with 1-click copy.
  * Collapsible **Deep Company Intelligence Drawer** (Products, Facility Area, Target Buyers, Exact Landmark, Google Maps link).
  * 1-Tap **Call (`tel:`)** and dynamic **WhatsApp (`wa.me`)** pitch generator tailored to Salons, Cafes, or B2B Manufacturers.
  * 4 quick outcome buttons: **Interested** (Green), **Callback** (Orange), **No Answer** (Slate), **Reject** (Red).
* **Multi-Page Lead Selection & Assignment:**
  * 1-Click **"Select ALL 300 Leads"** across all pages.
  * Configurable rows per page (`20`, `50`, `100`, `All`).
  * Multi-field server-side search across 10 fields inside MongoDB Atlas.

---

## 🚀 Tech Stack

* **Framework:** Next.js 15 (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS + Lucide React
* **Database:** MongoDB Atlas (M0 Free Cluster or higher)
* **Authentication:** Signed HTTP-only session cookies with `bcryptjs` password hashing
* **Export / Import:** Excel (`.xlsx`) & CSV support via `xlsx`

---

## ⚙️ Getting Started

### 1. Prerequisites
* Node.js v18+ or v20+
* MongoDB Atlas connection string (or local MongoDB)

### 2. Installation
```bash
git clone https://github.com/samarpann/tele-caller.git
cd tele-caller
npm install
```

### 3. Environment Variables
Create `.env.local` in the project root:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.yasfylo.mongodb.net/swastik_telecaller?retryWrites=true&w=majority
SESSION_SECRET=your-random-secure-secret-key-32-chars
PORT=3005
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build & Run
```bash
npm run build
npm start -- -p 3005 -H 0.0.0.0
```
Open [http://localhost:3005/login](http://localhost:3005/login) (or from mobile phones on local network at `http://<your-ip>:3005/login`).

---

## 🔐 Default Access Accounts

* **Super Admin:**
  * Username: `admin`
  * Password: `admin123`
* **Sales Callers (Pre-configured):**
  * Caller 1: `sales1` / `sales123` (Priya Sharma)
  * Caller 2: `sales2` / `sales123` (Rahul Verma)
  * Caller 3: `sales3` / `sales123` (Neha Gupta)
  * Caller 4: `sales4` / `sales123` (Amit Singh)
  * Caller 5: `sales5` / `sales123` (Pooja Patel)
