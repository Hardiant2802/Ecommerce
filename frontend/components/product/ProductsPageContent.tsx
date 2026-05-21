'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductGrid from '@/components/product/ProductGrid';
import { graphqlClient } from '@/lib/graphql/client';
import { GET_CATEGORY_BY_URL_KEY, GET_PRODUCTS } from '@/lib/graphql/queries/products';
import { SORT_OPTIONS } from '@/constants/categories';

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
}

interface CategoryLookupResult {
  categories: {
    items: Array<{
      id: number;
      name: string;
      url_key: string;
    }>;
  };
}

interface ProductsPageContentProps {
  forcedBrand?: string;
}

const BRANDS = [
  { name: 'Apple', slug: 'apple', category_id: 55 },
  { name: 'Samsung', slug: 'samsung', category_id: 56 },
  { name: 'Xiaomi', slug: 'xiaomi', category_id: 57 },
  { name: 'Oppo', slug: 'oppo', category_id: 58 },
  { name: 'OnePlus', slug: 'oneplus', category_id: 59 },
  { name: 'Vivo', slug: 'vivo', category_id: 60 },
  { name: 'Asus', slug: 'asus', category_id: 61 },
  { name: 'Red Magic', slug: 'red-magic', category_id: 62 },
  { name: 'Tai nghe', slug: 'tai-nghe', category_id: 63 },
  { name: 'Phụ kiện', slug: 'phu-kien', category_id: 64 },
];

const BRAND_CATEGORY_MAP: Record<string, number> = {
  ...BRANDS.reduce((acc, brand) => {
    acc[brand.slug] = brand.category_id;
    return acc;
  }, {} as Record<string, number>),
  'iphone': 55, // iPhone maps to Apple category
};

export default function ProductsPageContent({ forcedBrand }: ProductsPageContentProps) {
  const PAGE_SIZE = 12;
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('position');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const latestRequestRef = useRef(0);

  const category = searchParams.get('category');
  const brand = searchParams.get('brand');
  const search = searchParams.get('search');

  const activeBrand = forcedBrand || brand;

  const BRAND_LABELS: Record<string, string> = {
    apple: 'Apple',
    samsung: 'Samsung',
    xiaomi: 'Xiaomi',
    oppo: 'Oppo',
    oneplus: 'OnePlus',
    vivo: 'Vivo',
    asus: 'Asus',
    'red-magic': 'Red Magic',
    iphone: 'iPhone',
    'tai-nghe': 'Tai nghe',
    'phu-kien': 'Phụ kiện',
  };

  const loadProducts = useCallback(async (page: number) => {
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    const isStale = () => requestId !== latestRequestRef.current;

    setLoading(true);
    try {
      const variables: any = {
        pageSize: PAGE_SIZE,
        currentPage: page,
      };

      const categorySlug = activeBrand || category;
      if (categorySlug) {
        let categoryId: number | null = BRAND_CATEGORY_MAP[categorySlug] ?? null;

        if (!categoryId) {
          const categoryData = await graphqlClient<CategoryLookupResult>({
            query: GET_CATEGORY_BY_URL_KEY,
            variables: { urlKey: categorySlug },
            cache: 'default',
            ttlMs: 10 * 60 * 1000,
          });

          if (isStale()) {
            return;
          }

          const matchedCategory = categoryData.categories.items[0];
          if (matchedCategory) {
            categoryId = matchedCategory.id;
          }
        }

        if (!categoryId) {
          if (isStale()) {
            return;
          }
          setProducts([]);
          setTotalCount(0);
          setTotalPages(1);
          setCurrentPage(1);
          return;
        }

        variables.filter = {
          category_id: { eq: categoryId },
        };
      }

      if (search) {
        variables.search = search;
      } else if (!categorySlug) {
        variables.filter = {
          ...(variables.filter || {}),
          price: { from: '0' },
        };
      }

      if (sortBy === 'price_asc') {
        variables.sort = { price: 'ASC' };
      } else if (sortBy === 'price_desc') {
        variables.sort = { price: 'DESC' };
      } else if (sortBy === 'name') {
        variables.sort = { name: 'ASC' };
      }

      const data = await graphqlClient<{
        products: {
          items: Product[];
          total_count: number;
          page_info: {
            total_pages: number;
            current_page: number;
          };
        };
      }>({
        query: GET_PRODUCTS,
        variables,
        cache: 'default',
        ttlMs: 10 * 1000,
      });

      if (isStale()) {
        return;
      }

      setProducts(data.products.items);
      setTotalCount(data.products.total_count || 0);
      setTotalPages(data.products.page_info?.total_pages || 1);
      setCurrentPage(data.products.page_info?.current_page || page);
    } catch (error) {
      console.error('Không thể tải sản phẩm:', error);
      if (isStale()) {
        return;
      }
      setProducts([]);
      setTotalCount(0);
      setTotalPages(1);
      setCurrentPage(1);
    } finally {
      if (!isStale()) {
        setLoading(false);
      }
    }
  }, [PAGE_SIZE, activeBrand, category, search, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
    loadProducts(1);

    return () => {
      latestRequestRef.current += 1;
    };
  }, [category, activeBrand, search, sortBy, loadProducts]);

  useEffect(() => {
    if (currentPage === 1) {
      return;
    }

    loadProducts(currentPage);
  }, [currentPage, loadProducts]);

  const categoryName = activeBrand
    ? (BRAND_LABELS[activeBrand] || activeBrand)
    : category
      ? category.charAt(0).toUpperCase() + category.slice(1)
      : search
        ? `Kết quả tìm kiếm: "${search}"`
        : 'Tất cả sản phẩm';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {categoryName}
          </h1>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <p className="text-gray-600">
              {loading ? 'Đang tải...' : `${totalCount} sản phẩm`}
            </p>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Sắp xếp theo:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

          <ProductGrid products={products} loading={loading} currentBrand={activeBrand || undefined} />

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-md border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Trước
            </button>
            <span className="text-sm text-gray-700">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-md border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Sau
            </button>
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="text-center py-20">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Không tìm thấy sản phẩm
            </h3>
            <p className="text-gray-600 mb-8">
              Thử đổi từ khóa hoặc bộ lọc và tìm lại
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
