'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { graphqlClient } from '@/lib/graphql/client';
import { GET_PRODUCTS } from '@/lib/graphql/queries/products';
import { getPrimaryProductImageUrl } from '@/lib/utils/image';
import { formatPrice } from '@/lib/utils/formatters';
import { Product } from '@/types/product';

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function sortProductsBySeed(items: Product[], seed: string): Product[] {
  return [...items].sort((a, b) => {
    const aKey = hashString(`${a.sku}-${seed}`);
    const bKey = hashString(`${b.sku}-${seed}`);
    return aKey - bKey;
  });
}

export default function FeaturedProducts() {
  const PAGE_SIZE = 16;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [shuffleSeed] = useState(() => `${Date.now()}-${Math.random()}`);
  const requestControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadProducts(1, false);

    return () => {
      requestControllerRef.current?.abort();
    };
  }, []);

  const loadProducts = async (page: number, append: boolean) => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await graphqlClient<{
        products: {
          items: Product[];
          page_info?: {
            current_page: number;
            total_pages: number;
          };
        };
      }>({
        query: GET_PRODUCTS,
        variables: {
          pageSize: PAGE_SIZE,
          currentPage: page,
          filter: {
            price: { from: '0' },
          },
        },
        cache: 'default',
        ttlMs: 10 * 1000,
        signal: controller.signal,
      });

      setProducts((prev) => {
        const merged = append ? [...prev, ...data.products.items] : data.products.items;
        const deduped = merged.filter(
          (item, index, array) => array.findIndex((p) => p.id === item.id) === index
        );

        // Shuffle only first load so subsequent "Xem thêm" keeps stable order.
        return append ? deduped : sortProductsBySeed(deduped, shuffleSeed);
      });

      setCurrentPage(data.products.page_info?.current_page || page);
      setTotalPages(data.products.page_info?.total_pages || 1);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      console.error('Failed to load featured products:', error);
    } finally {
      if (requestControllerRef.current === controller) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  const handleLoadMore = () => {
    if (loadingMore || currentPage >= totalPages) return;
    loadProducts(currentPage + 1, true);
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
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => {
          const imageUrl = getPrimaryProductImageUrl(product);

          return (
          <Link
            key={product.id}
            href={`/product/${product.sku}`}
            className="group"
          >
            <div className="card hover:shadow-lg transition-shadow bg-white rounded-lg overflow-hidden border border-gray-100 flex flex-col h-full">
              <div className="aspect-square bg-gray-50 relative overflow-hidden p-4">
                {product.image?.url ? (
                  <img
                    src={imageUrl}
                    alt={product.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(event) => {
                      const target = event.currentTarget;
                      if (!target.src.endsWith('/images/placeholder.svg')) {
                        target.src = '/images/placeholder.svg';
                      }
                    }}
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
                    {formatPrice(
                      product.price_range?.minimum_price?.final_price?.value ||
                      product.price_range?.minimum_price?.regular_price?.value ||
                      0,
                      product.price_range?.minimum_price?.final_price?.currency ||
                      product.price_range?.minimum_price?.regular_price?.currency ||
                      'VND'
                    )}
                  </span>
                </div>

                <div className="mt-auto">
                  <button className="w-full bg-primary-600 text-white py-2.5 rounded-md font-medium hover:bg-primary-700 transition-colors">
                    Mua
                  </button>
                </div>
              </div>
            </div>
          </Link>
          );
        })}
      </div>

      {currentPage < totalPages && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-gray-900 text-white font-semibold hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loadingMore ? 'Đang tải...' : 'Xem thêm sản phẩm'}
          </button>
        </div>
      )}
    </div>
  );
}