/**
 * Payment Service
 * Handles Stripe integration for in-app purchases
 */

export interface PaymentProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  coins: number;
}

export interface PaymentResult {
  success: boolean;
  coins?: number;
  error?: string;
  transactionId?: string;
}

class PaymentService {
  private stripe: any = null;
  private readonly PRODUCTS: PaymentProduct[] = [
    {
      id: 'coins_100',
      name: '100 Signal Coins',
      description: 'Revive and continue your mission',
      price: 0.99,
      currency: 'USD',
      coins: 100
    },
    {
      id: 'coins_500',
      name: '500 Signal Coins',
      description: 'Best value for dedicated operators',
      price: 3.99,
      currency: 'USD',
      coins: 500
    },
    {
      id: 'coins_1000',
      name: '1000 Signal Coins',
      description: 'Ultimate coin package',
      price: 6.99,
      currency: 'USD',
      coins: 1000
    }
  ];

  /**
   * Initialize Stripe
   */
  async init(): Promise<boolean> {
    const publicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
    
    if (!publicKey || publicKey.includes('your_stripe_public_key')) {
      console.warn('Stripe public key not configured');
      return false;
    }

    try {
      // Load Stripe.js dynamically
      if (!window.Stripe) {
        await this.loadStripeScript();
      }

      this.stripe = window.Stripe(publicKey);
      return true;
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      return false;
    }
  }

  /**
   * Load Stripe.js script
   */
  private loadStripeScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src*="stripe.com"]')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Stripe.js'));
      document.head.appendChild(script);
    });
  }

  /**
   * Get available products
   */
  getProducts(): PaymentProduct[] {
    return this.PRODUCTS;
  }

  /**
   * Get product by ID
   */
  getProduct(productId: string): PaymentProduct | undefined {
    return this.PRODUCTS.find(p => p.id === productId);
  }

  /**
   * Create checkout session
   */
  async createCheckoutSession(productId: string): Promise<PaymentResult> {
    const product = this.getProduct(productId);
    
    if (!product) {
      return { success: false, error: 'Product not found' };
    }

    // Check if Stripe is initialized
    if (!this.stripe) {
      const initialized = await this.init();
      if (!initialized) {
        return { success: false, error: 'Payment system not available' };
      }
    }

    try {
      const backendUrl = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL;
      
      if (!backendUrl) {
        // Demo mode: simulate successful payment
        return this.simulatePayment(product);
      }

      // Create checkout session via Firebase Functions
      const response = await fetch(`${backendUrl}/createCheckout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          productId: product.id,
          successUrl: `${window.location.origin}/?payment=success`,
          cancelUrl: `${window.location.origin}/?payment=cancel`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId } = await response.json();

      // Redirect to Stripe Checkout
      const result = await this.stripe.redirectToCheckout({ sessionId });

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return { success: true, coins: product.coins };
    } catch (error) {
      console.error('Checkout error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Payment failed' 
      };
    }
  }

  /**
   * Simulate payment for demo mode
   */
  private simulatePayment(product: PaymentProduct): Promise<PaymentResult> {
    return new Promise((resolve) => {
      // Simulate network delay
      setTimeout(() => {
        resolve({
          success: true,
          coins: product.coins,
          transactionId: 'demo_' + Date.now()
        });
      }, 1000);
    });
  }

  /**
   * Verify payment completion (called after redirect back from Stripe)
   */
  async verifyPayment(sessionId: string): Promise<PaymentResult> {
    try {
      const backendUrl = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL;
      
      if (!backendUrl) {
        // Demo mode
        return { success: true, coins: 100, transactionId: sessionId };
      }

      const response = await fetch(`${backendUrl}/verifyPayment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ sessionId })
      });

      if (!response.ok) {
        throw new Error('Payment verification failed');
      }

      const data = await response.json();
      return {
        success: true,
        coins: data.coins,
        transactionId: data.transactionId
      };
    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  /**
   * Get auth token from storage
   */
  private getAuthToken(): string {
    const auth = localStorage.getItem('last_signal_auth');
    if (auth) {
      try {
        const { accessToken } = JSON.parse(auth);
        return accessToken;
      } catch (e) {
        return '';
      }
    }
    return '';
  }

  /**
   * Handle payment webhook (for backend)
   */
  async handleWebhook(payload: any, signature: string): Promise<boolean> {
    // This would be implemented on the backend
    // Frontend doesn't handle webhooks directly
    return false;
  }
}

// Extend Window interface for Stripe
declare global {
  interface Window {
    Stripe?: (key: string) => any;
  }
}

export const paymentService = new PaymentService();
