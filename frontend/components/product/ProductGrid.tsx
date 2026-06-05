import ProductCard from './ProductCard';
import ProductSkeleton from './ProductSkeleton';

interface Product {
  id: string;
  sku: string;
  name: string;
  url_key?: string;
  price_range: {
    minimum_price: {
      regular_price: {
        value: number;
        currency: string;
      };
      final_price?: {
        value: number;
        currency: string;
      };
    };
  };
  image?: {
    url: string;
    label: string;
  };
  stock_status?: string;
}

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  currentBrand?: string;
}

export default function ProductGrid({ products, loading = false, currentBrand }: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white py-16 text-center shadow-sm">
        <p className="text-slate-600 text-lg font-semibold">Không tìm thấy sản phẩm</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 items-stretch gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} currentBrand={currentBrand} />
      ))}
    </div>
  );
}
