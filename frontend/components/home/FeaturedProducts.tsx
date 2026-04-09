'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { graphqlClient } from '@/lib/graphql/client';
import { GET_PRODUCTS } from '@/lib/graphql/queries/products';
import { Product } from '@/types/product';

export default function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

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
      {products.map((product) => (
        <Link
          key={product.id}
          href={`/products/${product.url_key}`}
          className="group"
        >
          <div className="card hover:shadow-lg transition-shadow bg-white rounded-lg overflow-hidden">
            <div className="aspect-square bg-gray-100 relative overflow-hidden">
              {product.small_image?.url ? (
                <img
                  src={product.small_image.url}
                  alt={product.name}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="text-4xl">📱</span>
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-2 group-hover:text-primary-600 transition-colors line-clamp-2 text-gray-900">
                {product.name}
              </h3>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary-600">
                  {/* ĐÃ SỬA LẠI THÀNH CHUẨN MAGENTO PRICE_RANGE Ở ĐÂY */}
                  ${product.price_range?.minimum_price?.final_price?.value?.toFixed(2) || 
                    product.price_range?.minimum_price?.regular_price?.value?.toFixed(2) || 
                    '0.00'}
                </span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}