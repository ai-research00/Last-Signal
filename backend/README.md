# Last Signal: Rogue Sector - Backend API

This directory contains the backend API for Last Signal: Rogue Sector using **Firebase (Google Cloud Platform)**.

## Why Firebase?

- **Google Cloud Platform** - Fully integrated with Google services
- **Serverless** - No server management required
- **Auto-scaling** - Handles traffic spikes automatically
- **Free tier** - Generous free tier for development
- **Easy deployment** - One command deployment
- **Built-in auth** - Firebase Authentication included

## Tech Stack

- **Firebase Cloud Functions** - Serverless backend
- **Firestore** - NoSQL database
- **Firebase Authentication** - Google OAuth
- **Firebase Hosting** - Static file hosting
- **Stripe** - Payment processing

## Quick Start

See `firebase/README.md` for detailed setup instructions.

```bash
cd firebase
npm install -g firebase-tools
firebase login
firebase init
firebase deploy
```

## Required Services

1. **Firebase Authentication** - Google Sign-In
2. **Firestore Database** - User data and game state
3. **Cloud Functions** - API endpoints
4. **Firebase Hosting** - Frontend hosting (optional)

## Cloud Functions Endpoints

- `authSync` - Sync user data after Google OAuth
- `createCheckout` - Create Stripe checkout session
- `stripeWebhook` - Handle Stripe webhooks
- `verifyPayment` - Verify payment completion
- `saveGame` - Save game state to cloud
- `loadGame` - Load game state from cloud

## Environment Variables

Set via Firebase CLI:
```bash
firebase functions:config:set \
  stripe.secret_key="sk_test_..." \
  stripe.webhook_secret="whsec_..."
```

## Cost Estimation

Firebase Blaze plan (pay-as-you-go):
- **Functions**: ~$0.40 per million invocations
- **Firestore**: Free tier: 50K reads, 20K writes per day
- **Hosting**: Free tier: 10GB storage, 360MB/day transfer
- **Authentication**: Free for Google Sign-In

**Expected monthly cost for 1000 active users: $5-10**

## Deployment

```bash
# Deploy everything
firebase deploy

# Deploy only functions
firebase deploy --only functions

# Deploy only hosting
firebase deploy --only hosting
```

## Local Development

```bash
cd functions
npm run serve
```

Emulator runs at http://localhost:5001

## Documentation

See `firebase/README.md` for complete documentation.
