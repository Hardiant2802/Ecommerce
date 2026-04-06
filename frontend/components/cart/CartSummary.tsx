import { formatPrice } from '@/lib/utils/formatters';
import Button from '@/components/ui/Button';

interface CartSummaryProps {
  subtotal: number;
  total: number;
  currency: string;
  itemCount: number;
}

export default function CartSummary({ subtotal, total, currency, itemCount }: CartSummaryProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Order Summary</h2>
      
      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal ({itemCount} items)</span>
          <span>{formatPrice(subtotal, currency)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Shipping</span>
          <span className="text-green-600">FREE</span>
        </div>
        <div className="border-t pt-3 flex justify-between text-lg font-bold">
          <span>Total</span>
          <span className="text-primary-600">{formatPrice(total, currency)}</span>
        </div>
      </div>

      <Button fullWidth size="lg">
        Proceed to Checkout
      </Button>

      <p className="text-xs text-gray-500 text-center mt-4">
        Tax calculated at checkout
      </p>
    </div>
  );
}
