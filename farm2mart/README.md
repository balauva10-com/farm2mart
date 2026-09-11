# 🌾 Farm2Mart — Smart India Hackathon Full-Stack Platform

Unified, full-stack digital agricultural procurement system designed for farmers, Mandi supervisors, and procurement gate operators. Combines a modular Node.js API backend with a high-contrast, field-ready "Modern Agri-Tech" frontend UI.

---

## 🚀 Quick Start (Zero Config)

No external database installation is required. Farm2Mart runs out-of-the-box with Node.js 22+ using embedded SQLite, auto-seeding centers, crops, and live slots:

```bash
cd farm2mart
npm install
npm start
```

Open your browser at:
👉 **[http://localhost:4000](http://localhost:4000)**

---

## 🏗️ Architecture & Features

### 1. Modern Agri-Tech UI (`/public`)
- **Farmer Dashboard (`index.html`)**: Farmer profile, live Mandi MSP rates ticker, active procurement pass indicator, quick tools, multi-language switcher (English, Tamil, Hindi, Telugu, Punjabi, Marathi), and grain moisture guide.
- **Book Slot (`book-slot.html`)**: 3-step procurement booking flow:
  1. Select Crop & Volume (Paddy, Wheat, Cotton with live price ticks).
  2. Choose Nearest Procurement Depot (FCI Perungudi, Ambattur, Madipakkam).
  3. Pick AI crowd-aware time slot (Low / Moderate / Peak traffic).
  - Generates instant digital gate token connected to backend!
- **Digital Token Pass (`token-pass.html`)**: Official digital gate pass with scannable QR code, rapid weighbridge barcode, driver & lot details, and offline printable pass.
- **Produce & Payment Tracker (`track-status.html`)**: Real-time 5-stage consignment pipeline:
  1. *Slot Booked & Token Issued*
  2. *Gate Arrival & Weighbridge 1 (Gross Weight)*
  3. *Assaying & Moisture Lab Check (Refractometer & Purity)*
  4. *Unloading & Weighbridge 2 (Tare Weight & Net Yield)*
  5. *Direct Benefit Transfer (DBT payout to Aadhaar-linked bank account)*
  - Includes **"Simulate Next Stage"** interactive demo button that advances backend status live!
- **Kisan Support & Grievances (`support.html`)**: 24/7 farmer redressal form connected to the backend grievance API, plus toll-free and SMS hotline links.

### 2. Modular Backend API (`/src`)
- **Dual-Mode Database Layer (`src/lib/db.js`)**: Runs on zero-config embedded SQLite (`node:sqlite`) by default; seamlessly switches to PostgreSQL when `DATABASE_URL` is provided.
- **Auth (`src/modules/auth`)**: Phone OTP verification with bcrypt hashing, dev OTP auto-delivery, and staff JWT login.
- **Centers & Forecast (`src/modules/centers`, `src/modules/forecast`)**: Live slot capacity, crowd calculation, and rolling slot scheduler.
- **Bookings (`src/modules/bookings`)**: Transactional slot reservations and unique gate token generation (`F2M-XXXX`).
- **Produce (`src/modules/produce`)**: Live weighbridge tare tracking, moisture grading, and DBT status updates.
- **Grievances (`src/modules/grievances`)**: Farmer issue ticket filing and resolution.

---

## 🔑 Demo Credentials

| Role | Identifier | Password / Code |
|---|---|---|
| **Farmer (Demo)** | `+919876543210` | Dev OTP auto-filled (or `123456`) |
| **Mandi Supervisor (Staff)** | `+919000000000` | `admin12345` |

---

## 📡 API Reference

- `GET /health`: Server & database status check
- `POST /api/v1/auth/otp/request`: Request 6-digit phone OTP
- `POST /api/v1/auth/otp/verify`: Verify OTP & obtain 7-day farmer JWT
- `POST /api/v1/auth/staff/login`: Staff login
- `GET /api/v1/centers`: List active procurement centers and supported crops
- `GET /api/v1/centers/:id/slots?date=YYYY-MM-DD`: Fetch slots with crowd levels
- `GET /api/v1/forecast/centers/:id/recommendations`: AI crowd-predicted slot ordering
- `POST /api/v1/bookings`: Create slot reservation (`slotId`, `cropCode`, `estimatedQuantityKg`)
- `GET /api/v1/bookings/active/current`: Fetch active booking for logged-in farmer
- `GET /api/v1/bookings/:id`: Fetch booking details, gate assignment, and timeline events
- `POST /api/v1/bookings/:id/cancel`: Cancel slot reservation
- `POST /api/v1/produce/:id/advance`: Demo simulation endpoint to advance consignment stage
- `PATCH /api/v1/produce/:id`: Staff stage, grade, and payment update
- `POST /api/v1/grievances`: Submit grievance ticket

