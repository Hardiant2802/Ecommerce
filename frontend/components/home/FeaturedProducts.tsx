'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { graphqlClient } from '@/lib/graphql/client';
import { GET_PRODUCTS } from '@/lib/graphql/queries/products';
import { getPrimaryProductImageUrl } from '@/lib/utils/image';
import { formatPrice } from '@/lib/utils/formatters';
import { buildProductPath } from '@/lib/utils/productRouting';
import { Product } from '@/types/product';

interface FeaturedProductsProps {
  searchQuery?: string;
}

const HOME_PHONE_CATEGORY_IDS = ['55', '56', '57', '58', '59', '60', '61', '62'];
const HOME_FETCH_SIZE = 80;

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function shuffleBySeed(items: Product[], seed: string): Product[] {
  return [...items].sort((a, b) => {
    const aKey = hashString(`${a.sku}-${seed}`);
    const bKey = hashString(`${b.sku}-${seed}`);
    return aKey - bKey;
  });
}

export default function FeaturedProducts({ searchQuery = '' }: FeaturedProductsProps) {
  const PAGE_SIZE = 16;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [shuffleSeed] = useState(() => `${Date.now()}-${Math.random()}`);
  const requestControllerRef = useRef<AbortController | null>(null);
  const isSearching = Boolean(searchQuery.trim());

  const loadProducts = useCallback(async (page: number, append: boolean) => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const variables: {
        pageSize: number;
        currentPage: number;
        search?: string;
        filter?: {
          category_id: { in: string[] };
        };
      } = {
        pageSize: isSearching ? PAGE_SIZE : HOME_FETCH_SIZE,
        currentPage: isSearching ? page : 1,
      };

      if (isSearching) {
        variables.search = searchQuery;
      } else {
        variables.filter = {
          category_id: { in: HOME_PHONE_CATEGORY_IDS },
        };
      }

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
        variables,
        cache: 'default',
        ttlMs: 10 * 1000,
        signal: controller.signal,
      });
      const apiItems = data.products.items || [];

      if (!isSearching) {
        const deduped = apiItems.filter(
          (item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index
        );
        const randomized = shuffleBySeed(deduped, shuffleSeed);
        setProducts(randomized);
        setCurrentPage(1);
        setTotalPages(Math.max(1, Math.ceil(randomized.length / PAGE_SIZE)));
      } else {
        setProducts((prev) => {
          if (!append) {
            return apiItems;
          }

          const existingIds = new Set(prev.map((item) => item.id));
          const nextItems = apiItems.filter((item) => !existingIds.has(item.id));
          return [...prev, ...nextItems];
        });

        setCurrentPage(data.products.page_info?.current_page || page);
        setTotalPages(data.products.page_info?.total_pages || 1);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      console.error('Không thể tải danh sách sản phẩm nổi bật:', error);
      setProducts([]);
      setCurrentPage(1);
      setTotalPages(1);
    } finally {
      if (requestControllerRef.current === controller) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [isSearching, searchQuery, shuffleSeed]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setCurrentPage(1);
    loadProducts(1, false);

    return () => {
      requestControllerRef.current?.abort();
    };
  }, [searchQuery, loadProducts]);

  const handleLoadMore = () => {
    if (!isSearching) {
      setVisibleCount((previous) => Math.min(previous + PAGE_SIZE, products.length));
      return;
    }

    if (loadingMore || currentPage >= totalPages) return;
    loadProducts(currentPage + 1, true);
  };

  const displayedProducts = isSearching ? products : products.slice(0, visibleCount);

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-lg">Đang tải sản phẩm nổi bật...</p>
      </div>
    );
  }

  if (!displayedProducts.length) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-lg">
          {searchQuery ? 'Không tìm thấy sản phẩm' : 'Hiện chưa có sản phẩm'}
        </p>
        <p className="text-sm mt-2">
          {searchQuery ? 'Thử từ khóa khác' : 'Vui lòng quay lại sau để xem sản phẩm mới'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayedProducts.map((product) => {
          const resolvedImageUrl = product.image?.url ? getPrimaryProductImageUrl(product) : '';
          const imageUrl = resolvedImageUrl.includes('/images/placeholder.svg') ? '' : resolvedImageUrl;
          const productUrl = buildProductPath(product);

          return (
            <Link
              key={product.id}
              href={productUrl}
              className="group"
            >
              <div className="card hover:shadow-lg transition-shadow bg-white rounded-lg overflow-hidden border border-gray-100 flex flex-col h-full">
                <div className="aspect-square bg-gray-50 relative overflow-hidden p-4">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.visibility = 'hidden';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 text-center px-2">
                      Không có ảnh sản phẩm
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

      {((isSearching && currentPage < totalPages) || (!isSearching && displayedProducts.length < products.length)) && (
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