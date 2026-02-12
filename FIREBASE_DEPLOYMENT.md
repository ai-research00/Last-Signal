# Firebase Deployment Guide - Last Signal: Rogue Sector

Complete step-by-step guide to deploy your game to Google Cloud Platform using Firebase.

---

## 📋 Prerequisites

- Google account
- Node.js 18+ installed
- npm installed
- Stripe account
- Credit card (for Firebase Blaze plan - pay-as-you-go)

---

## 🚀 Part 1: Firebase Project Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Project name: `last-signal-rogue-sector`
4. Enable Google Analytics: **Yes** (optional but recommended)
5. Choose or create Analytics account
6. Click **"Create project"**
7. Wait for project creation (~30 seconds)

### Step 2: Upgrade to Blaze Plan

1. In Firebase Console, click **"Upgrade"** in the bottom left
2. Select **"Blaze (Pay as you go)"**
3. Add payment method (credit card)
4. Set budget alert: $10/month (recommended)
5. Click **"Purchase"**

**Why Blaze plan?** Cloud Functions need to make external API calls (Stripe), which requires Blaze plan. Don't worry - you'll likely stay within free tier limits!

### Step 3: Enable Required Services

#### Enable Authentication
1. In Firebase Console → **Authentication**
2. Click **"Get started"**
3. Click **"Google"** provider
4. Toggle **"Enable"**
5. Project support email: your-email@gmail.com
6. Click **"Save"**

#### Enable Firestore Database
1. In Firebase Console → **Firestore Database**
2. Click **"Create database"**
3. Start in **"production mode"**
4. Choose location: **us-central** (or closest to your users)
5. Click **"Enable"**

#### Enable Hosting (Optional but recommended)
1. In Firebase Console → **Hosting**
2. Click **"Get started"**
3. Follow the wizard (we'll configure later)

---

## 🔧 Part 2: Local Setup

### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

Verify installation:
```bash
firebase --version
```

### Step 2: Login to Firebase

```bash
firebase login
```

This opens a browser window. Sign in with your Google account.

### Step 3: Initialize Firebase in Your Project

```bash
cd backend/firebase
firebase use --add
```

- Select your project: `last-signal-rogue-sector`
- Alias: `default`

### Step 4: Install Dependencies

```bash
cd functions
npm install
```

---

## 🔐 Part 3: Configure Google OAuth

### Step 1: Get OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to **APIs & Services** → **Credentials**
4. Click **"Create Credentials"** → **"OAuth client ID"**
5. Application type: **"Web application"**
6. Name: `Last Signal Web Client`
7. Authorized JavaScript origins:
   - `http://localhost:3000`
   - `https://your-project-id.web.app`
   - `https://your-project-id.firebaseapp.com`
8. Authorized redirect URIs:
   - `http://localhost:3000`
   - `https://your-project-id.web.app`
   - `https://your-project-id.firebaseapp.com`
9. Click **"Create"**
10. Copy the **Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)

### Step 2: Add Client ID to Frontend

Edit `.env.local`:
```env
VITE_GOOGLE_CLIENT_ID=your_actual_client_id_here.apps.googleusercontent.com
```

---

## 💳 Part 4: Configure Stripe

### Step 1: Get Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Sign up or log in
3. Go to **Developers** → **API keys**
4. Copy **Publishable key** (starts with `pk_test_`)
5. Copy **Secret key** (starts with `sk_test_`)

### Step 2: Add Stripe Keys

Frontend (`.env.local`):
```env
VITE_STRIPE_PUBLIC_KEY=pk_test_your_actual_key_here
```

Backend (Firebase Functions):
```bash
cd backend/firebase/functions
firebase functions:config:set stripe.secret_key="sk_test_your_actual_key_here"
```

---

## 🚀 Part 5: Deploy Backend

### Step 1: Build Functions

```bash
cd backend/firebase/functions
npm run build
```

### Step 2: Deploy to Firebase

```bash
cd ..  # back to backend/firebase
firebase deploy --only functions
```

This takes 2-5 minutes. You'll see output like:
```
✔  functions[authSync(us-central1)] Successful create operation.
✔  functions[createCheckout(us-central1)] Successful create operation.
✔  functions[stripeWebhook(us-central1)] Successful create operation.
...
```

### Step 3: Get Function URLs

After deployment, you'll see URLs like:
```
https://us-central1-your-project-id.cloudfunctions.net/authSync
https://us-central1-your-project-id.cloudfunctions.net/createCheckout
...
```

Copy the base URL: `https://us-central1-your-project-id.cloudfunctions.net`

### Step 4: Update Frontend Config

Edit `.env.local`:
```env
VITE_FIREBASE_FUNCTIONS_URL=https://us-central1-your-project-id.cloudfunctions.net
```

---

## 🔗 Part 6: Configure Stripe Webhook

### Step 1: Add Webhook Endpoint

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Go to **Developers** → **Webhooks**
3. Click **"Add endpoint"**
4. Endpoint URL: `https://us-central1-your-project-id.cloudfunctions.net/stripeWebhook`
5. Description: `Last Signal Payment Webhook`
6. Select events to listen to:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
7. Click **"Add endpoint"**

### Step 2: Get Webhook Secret

1. Click on your newly created webhook
2. Click **"Reveal"** next to **Signing secret**
3. Copy the secret (starts with `whsec_`)

### Step 3: Add Webhook Secret to Firebase

```bash
cd backend/firebase/functions
firebase functions:config:set stripe.webhook_secret="whsec_your_actual_secret_here"
```

### Step 4: Redeploy Functions

```bash
cd ..
firebase deploy --only functions
```

---

## 🌐 Part 7: Deploy Frontend

### Step 1: Build Frontend

```bash
cd ../..  # back to project root
npm run build
```

### Step 2: Deploy to Firebase Hosting

```bash
cd backend/firebase
firebase deploy --only hosting
```

### Step 3: Get Your Live URL

After deployment, you'll see:
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/your-project-id/overview
Hosting URL: https://your-project-id.web.app
```

Your game is now live at: `https://your-project-id.web.app` 🎉

---

## 🧪 Part 8: Testing

### Test Google OAuth

1. Open your live URL
2. Click **"Sign in with Google"**
3. Complete OAuth flow
4. Verify you're logged in

### Test Stripe Payment (Test Mode)

Use Stripe test cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Expiry**: Any future date
- **CVC**: Any 3 digits
- **ZIP**: Any 5 digits

1. Click **"Buy Coins"**
2. Select a package
3. Enter test card details
4. Complete payment
5. Verify coins are added

### Test Game Functionality

1. Play through levels 1-5
2. Test save/load (refresh page)
3. Test revive system
4. Test new enemy types (Phantom at level 20+)

---

## 📊 Part 9: Monitoring

### View Logs

```bash
firebase functions:log
```

Or in Firebase Console → **Functions** → Click function → **Logs**

### View Database

Firebase Console → **Firestore Database**

You'll see:
- `users` collection - User data
- `transactions` collection - Payment history

### View Analytics

Firebase Console → **Analytics** → **Dashboard**

---

## 🔒 Part 10: Security

### Update CORS

Edit `backend/firebase/functions/src/index.ts`:

```typescript
const corsHandler = cors({
  origin: 'https://your-project-id.web.app',  // Your actual domain
  credentials: true,
});
```

Redeploy:
```bash
firebase deploy --only functions
```

### Set Firestore Rules

Already configured in `backend/firebase/firestore.rules`

Deploy:
```bash
firebase deploy --only firestore:rules
```

---

## 💰 Part 11: Cost Management

### Set Budget Alerts

1. Firebase Console → **Usage and billing**
2. Click **"Details & settings"**
3. Set budget alert: $10/month
4. Add email for notifications

### Monitor Usage

Firebase Console → **Usage and billing** → **Usage**

Expected costs for 1000 active users/month:
- Functions: $2-5
- Firestore: $1-3
- Hosting: $0 (within free tier)
- **Total: $3-8/month**

---

## 🆘 Troubleshooting

### Functions not deploying

```bash
cd backend/firebase/functions
rm -rf node_modules
npm install
npm run build
cd ..
firebase deploy --only functions
```

### CORS errors

Update allowed origins in `functions/src/index.ts` and redeploy.

### Stripe webhook not working

1. Verify webhook URL in Stripe Dashboard
2. Check webhook secret is set: `firebase functions:config:get`
3. View logs: `firebase functions:log`

### Google OAuth not working

1. Verify Client ID in `.env.local`
2. Check authorized origins in Google Cloud Console
3. Rebuild and redeploy frontend

---

## 🎉 You're Done!

Your game is now fully deployed on Google Cloud Platform with:

- ✅ Firebase Authentication (Google OAuth)
- ✅ Cloud Functions (Backend API)
- ✅ Firestore Database
- ✅ Firebase Hosting (Frontend)
- ✅ Stripe Payments
- ✅ Auto-scaling
- ✅ Global CDN

**Live URL**: `https://your-project-id.web.app`

---

## 📞 Support

### Firebase Support
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Support](https://firebase.google.com/support)

### Stripe Support
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com/)

---

## 🚀 Next Steps

1. **Custom Domain**: Firebase Hosting → Connect custom domain
2. **Analytics**: Monitor user behavior in Firebase Analytics
3. **Performance**: Check Firebase Performance Monitoring
4. **Crashlytics**: Add crash reporting
5. **A/B Testing**: Use Firebase Remote Config

---

**Congratulations! Your game is live on Google Cloud Platform!** 🎮✨
