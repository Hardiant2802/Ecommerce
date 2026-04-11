'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { graphqlClient } from '@/lib/graphql/client';
import { GET_PRODUCTS } from '@/lib/graphql/queries/products';
import { getPrimaryProductImageUrl } from '@/lib/utils/image';
import { Product } from '@/types/product';

export default function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  // Hàm chuyển đổi số thành định dạng Tiền Việt Nam (VND)
  const formatVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const loadProducts = async () => {
    try {
      const data = await graphqlClient<{
        products: {
          items: Product[];
        };
      }>({
        query: GET_PRODUCTS,
        variables: {
          pageSize: 4,
          search: "", 
        },
        cache: 'no-store',
      });

      setProducts(data.products.items);
    } catch (error) {
      console.error('Failed to load featured products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-lg">Loading featured products...</p>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-lg">No products available</p>
        <p className="text-sm mt-2">Check back later for new products</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map((product) => {
        const imageUrl = getPrimaryProductImageUrl(product);

        return (
        <Link
          key={product.id}
          href={`/products/${product.url_key}`}
          className="group"
        >
          <div className="card hover:shadow-lg transition-shadow bg-white rounded-lg overflow-hidden border border-gray-100 flex flex-col h-full">
            <div className="aspect-square bg-gray-50 relative overflow-hidden p-4">
              {product.image?.url ? (
                <img
                  src={imageUrl}
                  alt={product.name}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="text-4xl">📱</span>
                </div>
              )}
            </div>
            
            <div className="p-4 flex flex-col flex-grow">
              <h3 className="font-semibold text-lg mb-2 group-hover:text-primary-600 transition-colors line-clamp-2 text-gray-900 min-h-[3.5rem]">
                {product.name}
              </h3>
              
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-xl font-bold text-primary-600">
                  {/* Sử dụng hàm formatVND thay cho hardcode $ */}
                  {formatVND(
                    product.price_range?.minimum_price?.final_price?.value || 
                    product.price_range?.minimum_price?.regular_price?.value || 
                    0
                  )}
                </span>
              </div>

              {/* Nút Add to Cart đẩy xuống cuối nhờ flex-grow của thẻ cha */}
              <div className="mt-auto">
                <button className="w-full bg-primary-600 text-white py-2.5 rounded-md font-medium hover:bg-primary-700 transition-colors">
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </Link>
        );
      })}
    </div>
  );
}