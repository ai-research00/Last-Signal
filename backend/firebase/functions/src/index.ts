/**
 * Firebase Cloud Functions for Last Signal: Rogue Sector
 * 
 * Deploy with: firebase deploy --only functions
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import * as cors from 'cors';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

// CORS configuration
const corsHandler = cors({
  origin: true, // Allow all origins in development, restrict in production
  credentials: true,
});

// Product definitions
const PRODUCTS = {
  coins_100: { price: 99, coins: 100 },
  coins_500: { price: 399, coins: 500 },
  coins_1000: { price: 699, coins: 1000 },
};

/**
 * Authentication: Sync user data after Google OAuth
 */
export const authSync = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { email, googleId, name, picture } = req.body;

      if (!email || !googleId) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Verify Firebase Auth token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);

      // Store/update user in Firestore
      const userRef = admin.firestore().collection('users').doc(googleId);
      await userRef.set({
        email,
        googleId,
        name,
        picture,
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      functions.logger.info('User synced:', { email, googleId });

      res.status(200).json({
        success: true,
        message: 'User synced successfully',
      });
    } catch (error) {
      functions.logger.error('Auth sync error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  });
});

/**
 * Payment: Create Stripe checkout session
 */
export const createCheckout = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { productId, successUrl, cancelUrl } = req.body;

      // Validate product
      const product = PRODUCTS[productId as keyof typeof PRODUCTS];
      if (!product) {
        res.status(400).json({ error: 'Invalid product' });
        return;
      }

      // Verify authentication
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${product.coins} Signal Coins`,
                description: 'In-game currency for Last Signal: Rogue Sector',
              },
              unit_amount: product.price,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          productId,
          coins: product.coins.toString(),
          userId,
        },
      });

      res.status(200).json({ sessionId: session.id });
    } catch (error) {
      functions.logger.error('Checkout error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  });
});

/**
 * Payment: Stripe webhook handler
 */
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  try {
    const event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      webhookSecret
    );

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { productId, coins, userId } = session.metadata || {};

        if (!coins || !userId) {
          functions.logger.error('Missing metadata in session:', session.id);
          break;
        }

        // Update user's coin balance in Firestore
        const userRef = admin.firestore().collection('users').doc(userId);
        await userRef.update({
          coins: admin.firestore.FieldValue.increment(parseInt(coins)),
          totalCoinsSpent: admin.firestore.FieldValue.increment(
            session.amount_total ? session.amount_total / 100 : 0
          ),
          lastPurchase: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Log transaction
        await admin.firestore().collection('transactions').add({
          userId,
          productId,
          coins: parseInt(coins),
          amount: session.amount_total ? session.amount_total / 100 : 0,
          sessionId: session.id,
          status: 'completed',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        functions.logger.info(`Payment successful: User ${userId} purchased ${coins} coins`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        functions.logger.error('Payment failed:', paymentIntent.id);
        break;
      }

      default:
        functions.logger.info(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    functions.logger.error('Webhook error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Webhook error',
    });
  }
});

/**
 * Payment: Verify payment completion
 */
export const verifyPayment = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { sessionId } = req.body;

      if (!sessionId) {
        res.status(400).json({ error: 'Missing session ID' });
        return;
      }

      // Verify authentication
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const token = authHeader.split('Bearer ')[1];
      await admin.auth().verifyIdToken(token);

      // Retrieve session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === 'paid') {
        const { coins } = session.metadata || {};
        res.status(200).json({
          success: true,
          coins: coins ? parseInt(coins) : 0,
          transactionId: session.id,
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Payment not completed',
        });
      }
    } catch (error) {
      functions.logger.error('Payment verification error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Verification failed',
      });
    }
  });
});

/**
 * Game: Save game state
 */
export const saveGame = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      // Verify authentication
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const { gameState } = req.body;

      // Save game state to Firestore
      await admin.firestore().collection('users').doc(userId).update({
        gameState,
        lastSaved: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({ success: true });
    } catch (error) {
      functions.logger.error('Save game error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Save failed',
      });
    }
  });
});

/**
 * Game: Load game state
 */
export const loadGame = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      // Verify authentication
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      // Load game state from Firestore
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      const userData = userDoc.data();

      if (!userData || !userData.gameState) {
        res.status(404).json({ error: 'No saved game found' });
        return;
      }

      res.status(200).json({
        success: true,
        gameState: userData.gameState,
      });
    } catch (error) {
      functions.logger.error('Load game error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Load failed',
      });
    }
  });
});
