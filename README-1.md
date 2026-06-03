# 🌿 PRISM LAWN CARE

A fully functional lawn care booking website with:
- **Online booking** with blocked time slots (no double-booking)
- **Online payments** via Stripe
- **Coupon / discount codes** you generate and give to customers
- **Firebase Authentication** (sign up / sign in)
- **Firestore** database for bookings and coupons
- **Admin panel** to manage coupons and view all bookings
- **Demo mode** — works out of the box with localStorage, no setup needed to preview

---

## 📁 File Structure

```
prism-lawn-care/
├── index.html          ← Main page (links everything together)
├── css/
│   └── style.css       ← All styles
├── js/
│   ├── config.js       ← 🔑 Firebase + Stripe keys (edit this first)
│   ├── utils.js        ← Shared helpers (toast, formatDate, etc.)
│   ├── auth.js         ← Sign up / sign in / sign out
│   ├── booking.js      ← Time slots, coupons, payment, my bookings
│   └── admin.js        ← Admin panel, coupon generator, all bookings
└── README.md
```

---

## 🚀 Deploying to GitHub Pages

1. Push this folder to a GitHub repository
2. Go to **Settings → Pages**
3. Set source to **Deploy from branch → main → / (root)**
4. Your site will be live at `https://YOUR_USERNAME.github.io/REPO_NAME`

---

## 🔧 Setup (to go fully live)

### 1. Firebase

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project
3. **Enable Authentication:**
   - Build → Authentication → Get Started
   - Sign-in method → Email/Password → Enable
4. **Enable Firestore:**
   - Build → Firestore Database → Create database
   - Start in **test mode** (you'll lock it down later)
5. **Register a Web App:**
   - Project Settings (gear icon) → Your apps → Add app (Web)
   - Copy the `firebaseConfig` object
6. Paste it into `js/config.js`

**Recommended Firestore Security Rules** (paste in Firestore → Rules):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /bookings/{id} {
      allow read, write: if request.auth != null;
    }
    match /coupons/{id} {
      allow read:  if request.auth != null;
      allow write: if request.auth.token.email == "admin@prismlawncare.com";
    }
  }
}
```

### 2. Stripe

1. Go to [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Copy your **Publishable Key** (starts with `pk_live_` or `pk_test_`)
3. Paste it into `js/config.js` as `STRIPE_PK`

> **Note:** For real payments you also need a backend to create PaymentIntents.
> See the commented instructions in `js/booking.js` → `submitPayment()`.
> A simple Node/Express or serverless function (Vercel, Netlify, Firebase Functions) works great.

### 3. Admin Credentials

In `js/config.js`, change:
```js
window.ADMIN_PASSWORD = "prism2026";      // ← pick a strong password
window.ADMIN_EMAIL    = "admin@prismlawncare.com"; // ← your admin account email
```

Create an account on the site using that email. The ⚙️ Admin button will appear.

---

## 🎟️ How Coupons Work

1. Sign in with your admin email
2. Click **⚙️ Admin** in the navbar
3. Enter your admin password
4. Under **Generate Coupon Code**, choose:
   - **Type:** Percentage off, Fixed $ off, or Free (100%)
   - **Amount:** e.g. `20` for 20% off
   - **Service:** All services or a specific one
   - **Custom code:** e.g. `SUMMER25` (or leave blank to auto-generate)
5. Click **✨ Generate Coupon Code**
6. Copy the code and share it with your customer

Customers enter the code at checkout. It validates instantly and shows the discount before payment. Each code can only be used **once** — it's marked as used after redemption.

---

## 🧪 Test Cards (Stripe test mode)

| Card Number          | Result   |
|----------------------|----------|
| 4242 4242 4242 4242  | Success  |
| 4000 0000 0000 0002  | Declined |
| 4000 0025 0000 3155  | 3D Secure |

Use any future expiry date and any 3-digit CVC.

---

## 📋 Services & Pricing

| Service                       | Price Range |
|-------------------------------|-------------|
| Lawn Mowing & Weed Whacking   | $30 – $75   |
| Lawn Clean-Up                 | $10 – $40   |
| Edging & Trimming             | $20 – $50   |

---

## 📜 License

MIT — free to use, modify, and deploy for your business.
