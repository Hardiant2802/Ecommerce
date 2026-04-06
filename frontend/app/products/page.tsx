'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductGrid from '@/components/product/ProductGrid';
import { graphqlClient } from '@/lib/graphql/client';
import { GET_PRODUCTS } from '@/lib/graphql/queries/products';
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
  small_image?: {
    url: string;
    label: string;
  };
  thumbnail?: {
    url: string;
    label: string;
  };
  stock_status?: string;
}

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('position');
  
  const category = searchParams.get('category');

  useEffect(() => {
    loadProducts();
  }, [category, sortBy]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const variables: any = {
        pageSize: 12,
        currentPage: 1,
      };

      // Add category filter if present, otherwise use empty search to get all products
      if (category) {
        variables.filter = {
          category_url_key: { eq: category }
        };
      } else {
        // Magento requires either search or filter, so we use empty search to get all products
        variables.search = "";
      }

      // Add sorting
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
        };
      }>({
        query: GET_PRODUCTS,
        variables,
        cache: 'no-store',
      });

      setProducts(data.products.items);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const categoryName = category 
    ? category.charAt(0).toUpperCase() + category.slice(1)
    : 'All Products';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {categoryName}
          </h1>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <p className="text-gray-600">
              {loading ? 'Loading...' : `${products.length} products`}
            </p>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Sort by:</label>
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

        {/* Products Grid */}
        <ProductGrid products={products} loading={loading} />

        {/* Empty State */}
        {!loading && products.length === 0 && (
          <div className="text-center py-20">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No products found
            </h3>
            <p className="text-gray-600 mb-8">
              Try adjusting your filters or check back later
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
