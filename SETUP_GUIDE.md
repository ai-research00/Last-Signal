# Last Signal: Rogue Sector - Complete Setup Guide

This guide will walk you through setting up the complete production environment for Last Signal: Rogue Sector.

## 📋 Prerequisites

- Node.js 18+ installed
- Google Cloud Console account
- Stripe account
- Vercel account (or your preferred hosting platform)
- Git installed

---

## 🔐 Step 1: Google OAuth Setup

### 1.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "Last Signal Rogue Sector"
4. Click "Create"

### 1.2 Enable Google+ API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click "Enable"

### 1.3 Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Configure consent screen if prompted:
   - User Type: External
   - App name: Last Signal: Rogue Sector
   - User support email: your-email@example.com
   - Developer contact: your-email@example.com
4. Application type: "Web application"
5. Name: "Last Signal Web Client"
6. Authorized JavaScript origins:
   - `http://localhost:3000` (for development)
   - `https://yourdomain.com` (for production)
7. Authorized redirect URIs:
   - `http://localhost:3000`
   - `https://yourdomain.com`
8. Click "Create"
9. Copy the "Client ID" (looks like: `xxxxx.apps.googleusercontent.com`)

### 1.4 Add to Environment Variables

Edit `.env.local`:
```env
VITE_GOOGLE_CLIENT_ID=your_actual_client_id_here.apps.googleusercontent.com
```

---

## 💳 Step 2: Stripe Setup

### 2.1 Create Stripe Account

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/register)
2. Sign up for an account
3. Complete business verification (required for live mode)

### 2.2 Get API Keys

1. In Stripe Dashboard, go to "Developers" → "API keys"
2. Copy your "Publishable key" (starts with `pk_test_` or `pk_live_`)
3. Copy your "Secret key" (starts with `sk_test_` or `sk_live_`)

### 2.3 Create Products (Optional)

You can create products in Stripe Dashboard or let the API create them dynamically.

1. Go to "Products" → "Add product"
2. Create three products:
   - 100 Signal Coins - $0.99
   - 500 Signal Coins - $3.99
   - 1000 Signal Coins - $6.99

### 2.4 Add to Environment Variables

Edit `.env.local`:
```env
VITE_STRIPE_PUBLIC_KEY=pk_test_your_actual_key_here
```

For backend (create `backend/vercel/.env`):
```env
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

---

## 🚀 Step 3: Deploy Backend to Vercel

### 3.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 3.2 Login to Vercel

```bash
vercel login
```

### 3.3 Deploy Backend

```bash
cd backend/vercel
vercel
```

Follow the prompts:
- Set up and deploy? Yes
- Which scope? Your account
- Link to existing project? No
- Project name: last-signal-backend
- Directory: ./
- Override settings? No

### 3.4 Add Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to "Settings" → "Environment Variables"
4. Add:
   - `STRIPE_SECRET_KEY` = your secret key
   - `STRIPE_WEBHOOK_SECRET` = (get this in next step)
   - `ALLOWED_ORIGINS` = `https://yourdomain.com,http://localhost:3000`
   - `GOOGLE_CLIENT_ID` = your Google client ID
   - `GOOGLE_CLIENT_SECRET` = your Google client secret

### 3.5 Configure Stripe Webhooks

1. In Stripe Dashboard, go to "Developers" → "Webhooks"
2. Click "Add endpoint"
3. Endpoint URL: `https://your-backend.vercel.app/api/payment/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)
7. Add it to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`

---

## 🌐 Step 4: Deploy Frontend

### 4.1 Update Environment Variables

Edit `.env.local`:
```env
VITE_API_URL=https://your-backend.vercel.app
VITE_GOOGLE_CLIENT_ID=your_actual_client_id_here.apps.googleusercontent.com
VITE_STRIPE_PUBLIC_KEY=pk_test_your_actual_key_here
VITE_ENV=production
```

### 4.2 Build Frontend

```bash
npm run build
```

### 4.3 Deploy to Vercel

```bash
vercel
```

Or deploy to other platforms:

**Netlify:**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

**Firebase:**
```bash
npm install -g firebase-tools
firebase init hosting
firebase deploy
```

---

## 📱 Step 5: Mobile Deployment (Optional)

### 5.1 PWA Installation (Easiest)

Your app is already PWA-ready! Users can install it directly from Chrome:

1. Open your deployed URL in Chrome on Android
2. Tap menu (⋮) → "Install app"
3. App appears on home screen

### 5.2 Native App via Capacitor

```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# Initialize
npx cap init

# Build web assets
npm run build

# Add Android platform
npx cap add android

# Sync files
npx cap sync android

# Open in Android Studio
npx cap open android
```

In Android Studio:
1. Build → Generate Signed Bundle/APK
2. Follow wizard to create signing key
3. Build APK
4. Upload to Google Play Console

---

## 🧪 Step 6: Testing

### 6.1 Test Google OAuth

1. Open your deployed app
2. Click "Sign in with Google"
3. Complete OAuth flow
4. Verify you're logged in

### 6.2 Test Stripe Payment (Test Mode)

Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

1. Click "Buy Coins"
2. Select a package
3. Enter test card details
4. Complete payment
5. Verify coins are added

### 6.3 Test Game Functionality

1. Play through levels 1-5
2. Test save/load (refresh page)
3. Test revive system
4. Test mobile controls (if on mobile)

---

## 🔒 Step 7: Security Checklist

- [ ] Enable HTTPS on all domains
- [ ] Set up CORS properly (only allow your domains)
- [ ] Add rate limiting to API endpoints
- [ ] Enable Stripe webhook signature verification
- [ ] Use environment variables for all secrets
- [ ] Enable Google OAuth consent screen
- [ ] Set up error monitoring (Sentry)
- [ ] Add CSP headers
- [ ] Enable HSTS
- [ ] Regular security audits

---

## 📊 Step 8: Monitoring & Analytics (Optional)

### 8.1 Google Analytics

```bash
npm install @react-ga/react-ga4
```

Add to `index.tsx`:
```typescript
import ReactGA from 'react-ga4';
ReactGA.initialize('G-XXXXXXXXXX');
```

### 8.2 Sentry Error Tracking

```bash
npm install @sentry/react
```

Add to `App.tsx`:
```typescript
import * as Sentry from "@sentry/react";
Sentry.init({ dsn: "YOUR_SENTRY_DSN" });
```

---

## 🆘 Troubleshooting

### Google OAuth not working
- Check that your domain is in "Authorized JavaScript origins"
- Verify Client ID is correct in `.env.local`
- Check browser console for errors

### Stripe payment fails
- Verify you're using test mode keys in development
- Check that webhook URL is correct
- Verify webhook secret is set in environment variables

### Backend API errors
- Check Vercel logs: `vercel logs`
- Verify all environment variables are set
- Check CORS configuration

### Build fails
- Run `npm install` to ensure all dependencies are installed
- Check for TypeScript errors: `npm run type-check`
- Clear cache: `rm -rf node_modules dist && npm install`

---

## 📞 Support

For issues:
1. Check browser console (F12)
2. Check Vercel logs
3. Check Stripe Dashboard logs
4. Review this guide again

---

## 🎉 You're Done!

Your game is now fully deployed with:
- ✅ Google OAuth authentication
- ✅ Stripe payment processing
- ✅ Backend API
- ✅ Production-ready frontend
- ✅ Mobile support

**Next steps:**
- Monitor user feedback
- Add new features from TODO.md
- Optimize performance
- Market your game!

---

**Last Signal: Rogue Sector** is ready for players! 🚀
