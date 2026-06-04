import Link from 'next/link';
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
    <div className="rounded-lg bg-gray-50 p-4 sm:p-6 md:sticky md:top-20">
      <h2 className="text-lg sm:text-xl font-bold mb-4">Tóm tắt đơn hàng</h2>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-gray-600">
          <span>Số lượng</span>
          <span>{itemCount} sản phẩm</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Tạm tính</span>
          <span>{formatPrice(subtotal, currency)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Vận chuyển</span>
          <span className="text-green-600">MIỄN PHÍ</span>
        </div>
        <div className="flex justify-between gap-3 border-t pt-3 text-lg font-bold">
          <span>Tổng tiền</span>
          <span className="break-words text-right text-primary-600">{formatPrice(total, currency)}</span>
        </div>
      </div>

      <Link href="/checkout?payment=banking">
        <Button fullWidth size="lg">
          Tiến hành thanh toán
        </Button>
      </Link>

      <p className="text-xs text-gray-500 text-center mt-4">
        Thuế được tính khi thanh toán
      </p>
    </div>
  );
}
