import React, { useState, useEffect } from 'react';
import { X, CreditCard, CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import { paymentService, PaymentProduct } from '../services/payment';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (coins: number, transactionId: string) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [products, setProducts] = useState<PaymentProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const availableProducts = paymentService.getProducts();
      setProducts(availableProducts);
      setError(null);
    }
  }, [isOpen]);

  const handlePurchase = async (productId: string) => {
    setSelectedProduct(productId);
    setIsProcessing(true);
    setError(null);

    try {
      const result = await paymentService.createCheckoutSession(productId);
      
      if (result.success) {
        // In demo mode, coins are returned immediately
        if (result.coins && result.transactionId) {
          onSuccess(result.coins, result.transactionId);
          onClose();
        }
        // In real mode, user is redirected to Stripe and comes back via URL params
      } else {
        setError(result.error || 'Payment failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
      setSelectedProduct(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="max-w-2xl w-full bg-gradient-to-b from-zinc-900 to-black border-2 border-cyan-500 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-cyan-500/10 border-b border-cyan-500/30 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-cyan-400">SIGNAL COINS</h2>
            <p className="text-sm text-zinc-400 mt-1">Revive and continue your mission</p>
          </div>
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="text-zinc-500 hover:text-white transition-colors disabled:opacity-50"
          >
            <X size={28} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-6 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-500 font-bold text-sm">Payment Error</p>
              <p className="text-red-400 text-xs mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Products Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {products.map((product, index) => {
            const isPopular = index === 1; // Middle option is popular
            const isProcessingThis = isProcessing && selectedProduct === product.id;

            return (
              <div
                key={product.id}
                className={`relative border-2 rounded-xl p-6 transition-all ${
                  isPopular
                    ? 'border-cyan-500 bg-cyan-500/5 scale-105'
                    : 'border-zinc-700 bg-zinc-900/50 hover:border-cyan-500/50'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-black px-3 py-1 rounded-full text-xs font-bold">
                    BEST VALUE
                  </div>
                )}

                <div className="text-center space-y-4">
                  {/* Coin Amount */}
                  <div>
                    <div className="text-5xl font-black text-cyan-400">
                      {product.coins}
                    </div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">
                      Signal Coins
                    </div>
                  </div>

                  {/* Price */}
                  <div>
                    <div className="text-3xl font-black text-green-400">
                      ${product.price.toFixed(2)}
                    </div>
                    <div className="text-xs text-zinc-600 mt-1">
                      {product.currency}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-zinc-400 min-h-[2.5rem]">
                    {product.description}
                  </p>

                  {/* Purchase Button */}
                  <button
                    onClick={() => handlePurchase(product.id)}
                    disabled={isProcessing}
                    className={`w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                      isPopular
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isProcessingThis ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard size={16} />
                        Purchase
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 p-6 bg-black/40">
          <div className="flex items-start gap-3 text-xs text-zinc-500">
            <CheckCircle2 size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>✓ Secure payment processing via Stripe</p>
              <p>✓ Instant coin delivery</p>
              <p>✓ No subscription or recurring charges</p>
              <p>✓ PCI DSS compliant</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
