# Firebase Backend for Last Signal: Rogue Sector

## Setup

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

### 3. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name it "last-signal-rogue-sector"
4. Enable Google Analytics (optional)
5. Create project

### 4. Initialize Firebase in this directory

```bash
cd backend/firebase
firebase use --add
# Select your project
# Give it an alias: default
```

### 5. Enable Required Services

In Firebase Console:
1. **Authentication** → Enable Google Sign-In
2. **Firestore Database** → Create database (start in production mode)
3. **Functions** → Upgrade to Blaze plan (pay-as-you-go, required for external API calls)

### 6. Set Environment Variables

```bash
cd functions
firebase functions:config:set \
  stripe.secret_key="sk_test_your_key" \
  stripe.webhook_secret="whsec_your_secret"
```

### 7. Install Dependencies

```bash
cd functions
npm install
```

### 8. Deploy

```bash
# Deploy everything
firebase deploy

# Or deploy individually
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only hosting
```

## Cloud Functions Endpoints

After deployment, your functions will be available at:
- `https://us-central1-your-project-id.cloudfunctions.net/authSync`
- `https://us-central1-your-project-id.cloudfunctions.net/createCheckout`
- `https://us-central1-your-project-id.cloudfunctions.net/stripeWebhook`
- `https://us-central1-your-project-id.cloudfunctions.net/verifyPayment`
- `https://us-central1-your-project-id.cloudfunctions.net/saveGame`
- `https://us-central1-your-project-id.cloudfunctions.net/loadGame`

## Configure Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://us-central1-your-project-id.cloudfunctions.net/stripeWebhook`
3. Select events: `checkout.session.completed`, `payment_intent.payment_failed`
4. Copy webhook secret
5. Set it: `firebase functions:config:set stripe.webhook_secret="whsec_..."`

## Local Development

```bash
cd functions
npm run serve
```

This starts the Firebase emulator at http://localhost:5001

## View Logs

```bash
firebase functions:log
```

## Firestore Data Structure

### Users Collection
```
users/{userId}
  - email: string
  - googleId: string
  - name: string
  - picture: string
  - coins: number
  - totalCoinsSpent: number
  - gameState: object
  - lastLogin: timestamp
  - lastSaved: timestamp
  - lastPurchase: timestamp
```

### Transactions Collection
```
transactions/{transactionId}
  - userId: string
  - productId: string
  - coins: number
  - amount: number
  - sessionId: string
  - status: string
  - createdAt: timestamp
```

### Leaderboard Collection
```
leaderboard/{entryId}
  - userId: string
  - name: string
  - score: number
  - level: number
  - createdAt: timestamp
```

## Security

- Firestore rules enforce user authentication
- Cloud Functions verify Firebase Auth tokens
- Stripe webhook signatures are verified
- CORS is configured for your domain only (update in production)

## Cost Estimation

Firebase Blaze plan (pay-as-you-go):
- **Functions**: ~$0.40 per million invocations
- **Firestore**: Free tier: 50K reads, 20K writes, 20K deletes per day
- **Hosting**: Free tier: 10GB storage, 360MB/day transfer
- **Authentication**: Free for Google Sign-In

Expected monthly cost for 1000 active users: **$5-10**

## Troubleshooting

### Functions not deploying
```bash
# Check Node version (must be 18)
node --version

# Rebuild
cd functions
rm -rf node_modules
npm install
npm run build
```

### CORS errors
Update allowed origins in `functions/src/index.ts`:
```typescript
const corsHandler = cors({
  origin: 'https://yourdomain.com',
  credentials: true,
});
```

### Stripe webhook not working
1. Check webhook secret is set correctly
2. Verify endpoint URL in Stripe Dashboard
3. Check function logs: `firebase functions:log`
