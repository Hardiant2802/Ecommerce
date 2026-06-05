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
const HOME_FETCH_SIZE = 32;
type SortValue = 'featured' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc';

const SORT_OPTIONS: Array<{ value: SortValue; label: string }> = [
  { value: 'featured', label: 'Mặc định' },
  { value: 'price_asc', label: 'Giá thấp đến cao' },
  { value: 'price_desc', label: 'Giá cao đến thấp' },
  { value: 'name_asc', label: 'Tên A-Z' },
  { value: 'name_desc', label: 'Tên Z-A' },
];

function buildSortInput(sortBy: SortValue): { price?: 'ASC' | 'DESC'; name?: 'ASC' | 'DESC' } | undefined {
  if (sortBy === 'price_asc') return { price: 'ASC' };
  if (sortBy === 'price_desc') return { price: 'DESC' };
  if (sortBy === 'name_asc') return { name: 'ASC' };
  if (sortBy === 'name_desc') return { name: 'DESC' };
  return undefined;
}

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
  const [sortBy, setSortBy] = useState<SortValue>('featured');
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
        sort?: {
          price?: 'ASC' | 'DESC';
          name?: 'ASC' | 'DESC';
        };
      } = {
        pageSize: isSearching ? PAGE_SIZE : HOME_FETCH_SIZE,
        currentPage: isSearching ? page : 1,
      };
      const sortInput = buildSortInput(sortBy);

      if (sortInput) {
        variables.sort = sortInput;
      }

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
        const nextProducts = sortBy === 'featured' ? shuffleBySeed(deduped, shuffleSeed) : deduped;
        setProducts(nextProducts);
        setCurrentPage(1);
        setTotalPages(Math.max(1, Math.ceil(nextProducts.length / PAGE_SIZE)));
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
      console.error('Không thể tải danh sách sản phẩm:', error);
      setProducts([]);
      setCurrentPage(1);
      setTotalPages(1);
    } finally {
      if (requestControllerRef.current === controller) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [isSearching, searchQuery, shuffleSeed, sortBy]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setCurrentPage(1);
    loadProducts(1, false);

    return () => {
      requestControllerRef.current?.abort();
    };
  }, [searchQuery, sortBy, loadProducts]);

  const handleLoadMore = () => {
    if (!isSearching) {
      setVisibleCount((previous) => Math.min(previous + PAGE_SIZE, products.length));
      return;
    }

    if (loadingMore || currentPage >= totalPages) return;
    loadProducts(currentPage + 1, true);
  };

  const displayedProducts = isSearching ? products : products.slice(0, visibleCount);

  const toolbar = (
    <div className={`mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end ${isSearching ? 'sm:justify-between' : 'sm:justify-end'}`}>
      {isSearching ? (
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl md:text-3xl">
            Kết quả tìm kiếm: "{searchQuery}"
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {loading ? 'Đang tải...' : `${products.length} sản phẩm`}
          </p>
        </div>
      ) : null}

      <label className="flex w-full flex-col gap-1.5 text-sm font-medium text-slate-600 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
        <span>Sắp xếp theo:</span>
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortValue)}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 sm:w-auto"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  if (loading) {
    return (
      <div>
        {toolbar}
        <div className="rounded-lg border border-slate-200 bg-white py-20 text-center text-slate-500 shadow-sm">
          <p className="text-lg">Đang tải sản phẩm...</p>
        </div>
      </div>
    );
  }

  if (!displayedProducts.length) {
    return (
      <div>
        {toolbar}
        <div className="rounded-lg border border-slate-200 bg-white py-20 text-center text-slate-500 shadow-sm">
          <p className="text-lg font-semibold text-slate-700">
            {searchQuery ? 'Không tìm thấy sản phẩm' : 'Hiện chưa có sản phẩm'}
          </p>
          <p className="text-sm mt-2">
            {searchQuery ? 'Thử từ khóa khác' : 'Vui lòng quay lại sau để xem sản phẩm mới'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {toolbar}

      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4 md:gap-6">
        {displayedProducts.map((product) => {
          const resolvedImageUrl = product.image?.url ? getPrimaryProductImageUrl(product) : '';
          const imageUrl = resolvedImageUrl.includes('/images/placeholder.svg') ? '' : resolvedImageUrl;
          const productUrl = buildProductPath(product);

          return (
            <Link
              key={product.id}
              href={productUrl}
              className="group h-full"
            >
              <div className="h-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg flex flex-col">
                <div className="aspect-square bg-slate-50 relative overflow-hidden p-3 sm:p-4">
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
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 text-center px-2">
                      Không có ảnh sản phẩm
                    </div>
                  )}
                </div>

                <div className="flex flex-grow flex-col p-3 sm:p-4">
                  <h3 className="mb-2 min-h-[2.75rem] text-sm font-semibold leading-snug text-slate-900 line-clamp-2 transition-colors group-hover:text-primary-700 sm:min-h-[3rem] sm:text-base">
                    {product.name}
                  </h3>

                  <div className="mb-4 flex min-w-0 items-baseline gap-2">
                    <span className="min-w-0 break-words text-base font-bold text-rose-600 sm:text-lg">
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
                    <button className="w-full rounded-md bg-primary-800 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-900">
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
            className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-primary-800 text-white font-semibold hover:bg-primary-900 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {loadingMore ? 'Đang tải...' : 'Xem thêm sản phẩm'}
          </button>
        </div>
      )}
    </div>
  );
}
