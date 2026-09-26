# Easy Foods â€” Vegetable Chopping & Delivery Website

A full-stack starter for a chopped-vegetable delivery business: a React + TypeScript
frontend and a Node.js/Express backend for handling orders, with order tracking and
an admin dashboard.

## What's inside

```
chop-and-drop/
â”œâ”€â”€ frontend/          React + TypeScript (Vite on port 5173) â€” Customer Storefront
â”‚   â””â”€â”€ src/
â”‚       â”œâ”€â”€ pages/     Home, Products, About, Order, Cart, TrackOrder, HelpSupport, MyOrders, Login, Register, OtpLogin
â”‚       â”œâ”€â”€ components/Navbar, Footer, ProductCard, CartBar, PaymentModal, AuthCard, PasswordInput, Icons
â”‚       â”œâ”€â”€ data/      products.ts (edit this to change your catalogue)
â”‚       â”œâ”€â”€ api.ts     calls the backend (JWT auth enabled)
â”‚       â”œâ”€â”€ socket.ts  Socket.IO real-time client connection
â”‚       â””â”€â”€ index.css  all customer storefront styling / design tokens
â”œâ”€â”€ admin/             React + TypeScript (Vite on port 5174) â€” Dedicated Standalone Admin Portal
â”‚   â””â”€â”€ src/
â”‚       â”œâ”€â”€ components/PasswordInput, Icons
â”‚       â”œâ”€â”€ api.ts     admin endpoints (Orders, Tickets, Users, Visits)
â”‚       â”œâ”€â”€ socket.ts  Socket.IO real-time admin push connection
â”‚       â”œâ”€â”€ types.ts   admin data contracts
â”‚       â”œâ”€â”€ App.tsx    full-featured admin operations dashboard
â”‚       â””â”€â”€ index.css  admin console styling & metrics tokens
â””â”€â”€ backend/           Node.js + Express (Port 4000)
    â”œâ”€â”€ routes/        products.js, orders.js, admin.js, auth.js, visits.js, support.js
    â”œâ”€â”€ models/        User.js, Order.js, SupportTicket.js, Visit.js (Mongoose Schemas)
    â”œâ”€â”€ lib/           db.js (MongoDB + SQLite fallback), socket.js (Socket.IO), auth.js (JWT), mailer.js, sms.js
    â”œâ”€â”€ middleware/    adminAuth.js (JWT Bearer check), requireAuth.js, rateLimiters.js
    â”œâ”€â”€ data/          chop_and_drop.db (SQLite database backup), products.js
    â”œâ”€â”€ .env           environment variables and secure secrets
    â””â”€â”€ server.js      HTTP server with Helmet security & Socket.IO
```

## Features added

- **Database (MongoDB / Mongoose)**: Integrated with MongoDB via Mongoose (`backend/models/User.js`, `Order.js`, `SupportTicket.js`, `Visit.js`). Works seamlessly with both MongoDB Atlas cloud connection strings (`mongodb+srv://...`) and local MongoDB (`mongodb://127.0.0.1:27017/chop_and_drop`), with automatic fallback to persistent SQLite (`backend/data/chop_and_drop.db`) if MongoDB is not reachable.
- **JWT Authentication & Security Hardening**:
  - Secure **Admin JWT Tokens** issued upon login; requests use standard `Authorization: Bearer <token>` instead of sending raw passwords over the network.
  - Customer JWT authentication with phone/password and SMS OTP.
  - **Helmet** HTTP security headers (CSP, anti-clickjacking, MIME protection).
  - **Rate Limiting** via `express-rate-limit` on auth and order endpoints to prevent brute-force attacks and abuse.
  - Input validation and phone number sanitization.
- **Real-Time WebSockets (Socket.IO)**:
  - **Live Order Tracking** (`/track`): Order status changes made by staff update on customer tracking screens instantly without page refreshes!
  - **Live Admin Dashboard** (`/admin`): New incoming orders trigger instant real-time push notifications and update the orders table immediately, removing the need for 8-second polling.
  - **Live Visitors Activity**: Visitor navigation is broadcast to the admin dashboard in real-time.
- **Order ID**: every order gets a short ID like `CD-8K3F2A`, shown to the customer right after they submit.
- **Email & SMS confirmation**: when an order comes in, the backend tries to send the
  customer a confirmation email (via any SMTP account) and SMS (via Twilio). Both are
  **optional** â€” without credentials in `.env`, the order still goes through fine, it
  just skips sending and logs a note in the backend console.
- **Customer login & register** (`/login`, `/register`, `/otp-login`): customers can
  create an account (name, phone, password, optional email) or log in with a
  password. There's also **OTP login** (`/otp-login`) â€” enter a phone number, get a
  6-digit code by SMS, and log in with no password; first-time numbers are asked for
  a name and get an account created automatically. Without Twilio configured, the
  code is shown right on the page (and printed in the backend console) so you can
  test the whole flow with no SMS account. Logged-in customers get the Order form
  pre-filled, and can see their full order history at `/my-orders`. Guests can still
  order without an account. Passwords are hashed with bcrypt; all sessions (password
  or OTP) use a JWT stored in the browser. Set `JWT_SECRET` in `backend/.env` to a
  long random string before going live.
- **Cart** (`/cart`): "ADD" buttons on product cards (Swiggy-style â€” tap once to add,
  then a +/- stepper appears), a running cart with quantities and a subtotal, and a
  sticky "N items Â· â‚¹total â†’ View Cart" bar at the bottom of the screen whenever the
  cart isn't empty. Proceeding to the Order page pre-fills the items field from the
  cart; the cart clears once the order is placed. Cart contents persist in the
  browser (`localStorage`) between visits.
- **UI style**: food-delivery-app look and feel â€” orange primary actions, shadow-
  elevated cards, a small veg indicator on each product, and the sticky cart bar â€”
  inspired by apps like Swiggy/Zomato.

## Run it locally

You need Node.js 18+ installed.

**1. Backend** (runs on http://localhost:4000)
```bash
cd backend
npm install
npm run dev
```

**2. Frontend â€” Customer Storefront** (runs on http://localhost:5173)
```bash
cd frontend
npm install
npm run dev
```

**3. Admin â€” Dedicated Admin Portal** (runs on http://localhost:5174)
```bash
cd admin
npm install
npm run dev
```

- **Customer Website**: http://localhost:5173
- **Dedicated Admin Portal**: http://localhost:5174 (Password: `admin123`)
- **Backend API**: http://localhost:4000


### Setting up email confirmations

Any SMTP account works â€” the simplest is a Gmail address with an
[App Password](https://myaccount.google.com/apppasswords) (not your normal password).
Put the host/port/user/pass into `backend/.env`. Without this set, orders still work â€”
email sending is just skipped.

### Setting up SMS confirmations

Create a free trial account at [twilio.com](https://www.twilio.com/), grab your
Account SID, Auth Token and a Twilio phone number, and put them into `backend/.env`.
Without this set, orders still work â€” SMS sending is just skipped.

## Things to customise first

- **Products & prices**: `frontend/src/data/products.ts` and `backend/data/products.js`
  (keep both in sync, or move them to a shared database later).
- **Business name, phone, service area**: `frontend/src/components/Navbar.tsx` and
  `Footer.tsx`.
- **Colours and fonts**: CSS variables at the top of `frontend/src/index.css`.
- **Delivery slots**: `slots` array in `frontend/src/pages/Order.tsx`.

## Next steps for going live

- Swap the JSON-file order storage for a real database (Postgres, MongoDB, etc.).
- Send yourself a notification (SMS/WhatsApp/email) when `POST /api/orders` fires.
- Add authentication if you want a private dashboard to view/manage orders.
- Deploy the backend (Render, Railway, a small VPS) and the frontend (Vercel, Netlify),
  pointing the frontend's `/api` calls at your deployed backend URL.

## Build for production

```bash
cd frontend
npm run build     # outputs static files to frontend/dist

cd ../backend
npm start          # serves the API; put it behind your own process manager (pm2, etc.)
```

