// Product Types
export interface Product {
  id: string;
  sku: string;
  name: string;
  price: {
    regularPrice: {
      amount: {
        value: number;
        currency: string;
      };
    };
    finalPrice?: {
      amount: {
        value: number;
        currency: string;
      };
    };
  };

  price_range?: {
    minimum_price?: {
      regular_price?: {
        value: number;
        currency: string;
      };
      final_price?: {
        value: number;
        currency: string;
      };
    };
  };
  image: {
    url: string;
    label: string;
  };
  small_image?: {
    url: string;
    label: string;
  };
  thumbnail?: {
    url: string;
    label: string;
  };
  description?: {
    html: string;
  };
  short_description?: {
    html: string;
  };
  media_gallery?: Array<{
    url: string;
    label: string;
    position: number;
  }>;
  stock_status?: string;
  categories?: Category[];
  url_key?: string;
}

export interface Category {
  id: number;
  name: string;
  url_key: string;
  url_path: string;
  level: number;
  image?: string;
  product_count?: number;
}

export interface ProductsResponse {
  products: {
    items: Product[];
    page_info: {
      current_page: number;
      page_size: number;
      total_pages: number;
    };
    total_count: number;
  };
}

export interface ProductFilters {
  categoryId?: string;
  search?: string;
  priceMin?: number;
  priceMax?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'name' | 'newest';
}
