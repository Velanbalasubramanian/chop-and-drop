# Zippo — Android & iOS Mobile Super App 📱⚡

A complete, high-performance cross-platform mobile app for **Zippo** built with **React Native**, **Expo (SDK 58)**, and **TypeScript**.

Supports both **Android** and **iOS** from a single codebase, delivering groceries, fresh cut vegetables, cakes, 20L water cans, flowers, and electricals with live real-time Socket.IO tracking.

---

## 🌟 Features Included

- **Product Catalogue**:
  - Full catalog of washed & cut vegetable packs (Sambar Mix, Poriyal Mix, Onion-Tomato Mix, Keerai, Salad Mix, Bulk Kitchen Packs).
  - Shows Tamil names (வெங்காயம் தக்காளி, சாம்பார் காய்கறி, etc.) and English names.
  - Green veg badge on every item.
  - Swiggy/Zomato style **ADD** button with interactive **+ / -** stepper.
- **Search & Category Filters**:
  - Instant live search by English or Tamil names.
  - Filter by category pills: *All Packs*, *Daily Gravy*, *Greens & Salads*, *Bulk Packs*.
- **Floating Cart Bar**:
  - Persistent sticky cart bar at the bottom showing item count & subtotal price.
  - Tapping opens the itemized Cart.
- **Cart & Bill Breakdown**:
  - Manage item quantities with instant subtotal and bill calculation.
  - Free morning doorstep delivery.
- **Checkout & Morning Slot Selection**:
  - Customer contact details (Full Name, Phone, Email, Delivery Address).
  - Delivery Slots:
    - `6:00 AM – 7:00 AM` (Early Morning Kitchen)
    - `7:00 AM – 8:00 AM` (Breakfast / Tiffin Slot)
    - `8:00 AM – 9:00 AM` (Regular Morning)
    - `9:00 AM – 10:00 AM` (Mid Morning)
  - Payment modes: **Online UPI / Cards** or **Cash on Delivery (COD)**.
- **Instant Online Payment Simulation (UPI)**:
  - Interactive modal simulating Google Pay, PhonePe, Paytm, or custom UPI ID.
  - Instant transaction verification and automatic order submission.
- **Real-Time Live Order Tracking (WebSockets)**:
  - Powered by **Socket.IO**: order status updates pushed from admin dashboard update customer screens in real-time without refreshing!
  - 5-step visual tracking:
    `Received` ➔ `Confirmed` ➔ `Washed & Chopped` ➔ `Out for Delivery` ➔ `Delivered`
  - Cancellation / Refund request flow.
- **Customer Authentication**:
  - **Phone + Password Login**
  - **Fast SMS OTP Login** with auto-filled Dev OTP mode for local testing without SMS fees.
  - **Account Registration**
  - Session persistent with `@react-native-async-storage/async-storage`.
- **My Orders History**:
  - List of past orders with live status badges and one-tap live tracking.
- **Customer Support & About Screen**:
  - Submit support tickets directly to the backend.
  - Quick helpline contact numbers.
  - Dynamic Backend Server IP switcher in the Profile tab.

---

## 🚀 How to Run the Mobile App

### 1. Ensure Backend is Running

Start the Node.js API server on port 4000:
```bash
cd backend
npm run dev
```

### 2. Start the Mobile App

Open a new terminal in the `mobile` directory (or use root script):
```bash
cd mobile
npm start
```
*(Or from the project root: `npm run mobile`)*

---

## 📲 How to Test on Your Physical Phone (Android & iOS)

You don't need Android Studio or Xcode to test right away!

1. Install the free **Expo Go** app on your phone:
   - **Android**: Download from [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - **iPhone**: Download from [Apple App Store](https://apps.apple.com/app/expo-go/id982107779)
2. Ensure your phone and your computer are on the **same Wi-Fi network**.
3. Run `npm start` in the `mobile/` directory.
4. Scan the QR code displayed in the terminal:
   - On **Android**: Scan with the Expo Go app.
   - On **iPhone**: Scan with the default iOS Camera app and tap the Expo banner.
5. The Chop & Drop app will bundle and load directly on your phone!

> **Network Note**:
> By default, the app is pre-configured with your machine's Wi-Fi IP (`http://192.168.29.143:4000`). If your Wi-Fi IP changes, you can tap **Account** ➔ **Change Server IP** inside the app anytime without touching code!

---

## 💻 Running on Emulators

- **Android Emulator**:
  ```bash
  npm run android
  ```
  *(Press `a` in the Expo terminal)*

- **iOS Simulator** (macOS only):
  ```bash
  npm run ios
  ```
  *(Press `i` in the Expo terminal)*

---

## 📦 How to Build the Standalone APK / IPA

To create an installable `.apk` file for Android or build for the App Store / Google Play:

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 2: Log In to Expo
```bash
eas login
```

### Step 3: Configure Build
```bash
eas build:configure
```

### Step 4: Build Android APK (Installable directly on any Android phone)
In `eas.json`, under `"preview"`:
```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```
Then run:
```bash
eas build -p android --profile preview
```
Expo cloud servers will compile the native Android code and provide a direct download link for the `.apk` file!

### Step 5: Build iOS
```bash
eas build -p ios --profile preview
```
*(Requires an Apple Developer account for Ad-Hoc/TestFlight/App Store distribution)*
