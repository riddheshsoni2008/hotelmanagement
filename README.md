# AtithiStay - Multi-Hotel Guest Management System

A production-quality, mobile-first Guest Management and Property Management System (PMS) tailored for Indian guest houses and hotel chains operating across 4-5 properties.

Built with **Next.js (App Router)**, **TypeScript**, **MongoDB with Mongoose**, **Tailwind CSS**, **date-fns-tz (Asia/Kolkata IST)**, and **custom secure JWT auth**.

---

## 🌟 Key Features

1. **Instant Guest Check-in with Aadhaar Verification**:
   - Register guests in seconds with phone lookup that automatically auto-fills returning guest details and past stay records.
   - Upload Aadhaar card front, back, and optional guest webcam/camera photo directly on the check-in screen.
   - Stored and displayed side-by-side with full-screen lightbox zoom inspection.

2. **Strict <= 40KB Client & Server Image Compression (MongoDB Free Tier Safe)**:
   - Built-in canvas compression dynamically scales dimensions and JPEG quality from 0.85 down to 0.28 to guarantee all uploaded photos are strictly **under 40KB (40,960 bytes)**.
   - Server validates MIME types (`image/jpeg`, `image/png`, `image/webp`) and enforces `<= 40KB` with HTTP 413 rejection.
   - Images are stored in an isolated `GuestDocument` collection as binary Buffers (never embedded in Stay lists to keep queries lightning fast).
   - Images are served strictly through authenticated endpoint `GET /api/documents/[id]` with private caching and hotel authorization. No public image URLs.

3. **Hourly and Daily Booking Duration with Live Calculations**:
   - Staff chooses duration in **hours** or **days** using quick-pick chips (`1h`, `2h`, `3h`, `6h`, `12h`, `24h`, `1 day`, `2 days`, `3 days`, `5 days`, `7 days`) or custom inputs.
   - Live check-out banner calculates and previews exact check-out timestamp in IST before submission.

4. **Multi-Hotel Tenant Isolation & Roles**:
   - **Hotel Switcher** in top bar lets staff switch between their assigned properties, while the Owner gets a combined **"All Hotels"** dashboard overview.
   - Role-based server-side filtering: staff cannot query or access data from hotels outside their assignment.

5. **Live Reception Dashboard with Overstay Alerts**:
   - KPI metrics: Currently Checked-In, Available Rooms, Today's Check-ins, Today's Check-outs, and Overstay Count.
   - Live Countdown: e.g. "1h 12m left" or pulsing red alert "Overstay by 25m".
   - Auto-refreshes every 30 seconds with manual refresh option.
   - Quick action check-out modal showing on-time / early / late departure calculation.
   - One-click stay extension (add extra hours or days).

6. **Owner Administration & Business Analytics**:
   - **Hotel Management**: Add and manage hotel properties.
   - **Room Inventory**: Track room statuses (`available`, `occupied`, `maintenance`) and tariff prices.
   - **Staff Management**: Create receptionists and assign them to specific hotel branches.
   - **Reports & Analytics**: Stays per day, revenue per hotel, total guests accommodated, date range filters, and **1-click CSV export**.
   - **Storage Optimizer**: Purge document images older than N months to keep database storage well within MongoDB Atlas 512MB limits.

7. **Privacy & Security**:
   - Only last 4 digits of Aadhaar can be recorded (full 12 digits are never collected or stored).
   - Rate-limited login route (5 attempts / minute per IP).
   - Passwords hashed with bcrypt; JWT stored in `httpOnly`, `secure`, `sameSite=lax` cookies.

---

## 🔑 Demo Credentials

| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Hotel Owner** | `owner@demo.com` | `Demo@1234` | Full access across all 3 hotels, staff, reports, and settings |
| **Front Desk Staff** | `staff@demo.com` | `Demo@1234` | Assigned to Jaipur & Bangalore properties |

*Quick 1-click login buttons are also provided on the `/login` screen.*

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Database**: MongoDB (Atlas free tier 512MB / local MongoDB) with Mongoose
- **Styling**: Tailwind CSS v4 (Clean white & deep blue theme, responsive down to 360px)
- **Icons**: `lucide-react`
- **Authentication**: Custom JWT with `jose`, bcrypt password hashing, `httpOnly` cookie, and route proxy protection
- **Validation**: `zod` schemas shared across API routes and client forms
- **Date & Time**: `date-fns` and `date-fns-tz` with `Asia/Kolkata` (IST) 12-hour AM/PM formatting

---

## 🚀 Quick Setup & Run

### 1. Prerequisites
- Node.js 18+ (tested on Node 26)
- MongoDB instance running locally (e.g. `mongodb://127.0.0.1:27017/hotel_management`) or MongoDB Atlas URI

### 2. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Configure your connection string if needed:
```ini
MONGODB_URI=mongodb://127.0.0.1:27017/hotel_management
JWT_SECRET=hotelmgmt_super_secret_jwt_key_production_grade_2026_xyz
NEXT_PUBLIC_APP_NAME="AtithiStay Guest Management"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Seed Demo Data
Populates 3 demo hotels, 26 rooms, 15 realistic Indian guests with active, overstay, and completed stays, and demo Aadhaar card images under 40KB:
```bash
npm run seed
```

### 5. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📱 Mobile-First Design
Receptionists can access the PMS on any smartphone (360px+ viewport):
- Sticky bottom thumb navigation for **Dashboard**, **New Check-in**, **Stays**, and **Rooms**.
- Fast camera capture for Aadhaar cards with instant compression.
- Card-based layouts with high-contrast status badges (Green = Checked-in, Grey = Checked-out, Red = Overstay).

---

## 📁 Project Architecture

```
├── scripts/
│   └── seed.ts                  # Database seeder with realistic mock data & Aadhaar images
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/            # Login (rate-limited), Logout, Me
│   │   │   ├── dashboard/stats/ # Live KPI metrics & active stays list
│   │   │   ├── documents/       # Secure binary image streaming & upload (<= 40KB)
│   │   │   ├── guests/          # Guests directory & phone lookup auto-fill
│   │   │   ├── hotels/          # Hotel branches CRUD
│   │   │   ├── reports/         # Stays per day/hotel & CSV export
│   │   │   ├── rooms/           # Room inventory & maintenance toggle
│   │   │   ├── settings/        # Free-tier document purge endpoint
│   │   │   ├── staff/           # Staff accounts & hotel branch assignment
│   │   │   └── stays/           # Check-in, check-out, extend stay, details
│   │   ├── check-in/            # 3-step fast check-in wizard
│   │   ├── dashboard/           # Live reception dashboard
│   │   ├── hotels/              # Hotel property manager (Owner)
│   │   ├── login/               # Authentication screen
│   │   ├── reports/             # Business reports with CSV export (Owner)
│   │   ├── rooms/               # Room inventory manager
│   │   ├── settings/            # Storage optimizer (Owner)
│   │   ├── staff/               # Staff administration (Owner)
│   │   ├── stays/               # Stays list and [id] detail page with lightbox
│   │   ├── globals.css          # Design system & tokens
│   │   ├── layout.tsx           # Global shell & providers
│   │   └── page.tsx             # Root redirect
│   ├── components/
│   │   ├── ConfirmationDialog.tsx
│   │   ├── HotelContext.tsx     # Active hotel switcher & user session
│   │   ├── ImageUploader.tsx    # Canvas auto-compressor & camera uploader
│   │   ├── Navbar.tsx           # Responsive navbar with hotel switcher & IST clock
│   │   ├── StatusBadge.tsx      # Green / Grey / Red overstay badges
│   │   └── ToastContext.tsx     # Toast notifications
│   ├── lib/
│   │   ├── auth.ts              # Authorization & rate limiting
│   │   ├── db.ts                # Mongoose singleton with global cache
│   │   ├── image-compressor.ts  # HTML5 Canvas image compressor
│   │   ├── jwt.ts               # Jose JWT signing and verification
│   │   ├── time.ts              # IST Asia/Kolkata date-fns-tz utilities
│   │   └── validations/         # Zod schemas shared client/server
│   ├── models/                  # Mongoose models: User, Hotel, Room, Guest, GuestDocument, Stay
│   └── proxy.ts                 # Next.js route protection proxy
```
# hotelmanagement
