import { Product } from '@/types/product';

export type BrandSlug =
  | 'apple'
  | 'iphone'
  | 'samsung'
  | 'xiaomi'
  | 'oppo'
  | 'oneplus'
  | 'vivo'
  | 'asus'
  | 'red-magic'
  | 'tai-nghe'
  | 'phu-kien';

export type FallbackProduct = Product & {
  brandSlug: BrandSlug;
  stock_status: 'IN_STOCK';
  image: {
    url: string;
    label: string;
  };
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
};

const BRAND_ALIAS: Record<string, BrandSlug> = {
  apple: 'apple',
  iphone: 'apple',
  samsung: 'samsung',
  xiaomi: 'xiaomi',
  oppo: 'oppo',
  oneplus: 'oneplus',
  vivo: 'vivo',
  asus: 'asus',
  'red-magic': 'red-magic',
  'tai-nghe': 'tai-nghe',
  'phu-kien': 'phu-kien',
};

export const FALLBACK_PRODUCTS: FallbackProduct[] = [
  {
    id: 'fb-apple-1',
    brandSlug: 'apple',
    sku: 'IPHONE16PM-256-BLACK',
    name: 'iPhone 16 Pro Max 256GB',
    stock_status: 'IN_STOCK',
    price: { regularPrice: { amount: { value: 32990000, currency: 'VND' } } },
    price_range: { minimum_price: { regular_price: { value: 32990000, currency: 'VND' } } },
    image: { url: '/images/placeholder.svg', label: 'iPhone 16 Pro Max' },
  },
  {
    id: 'fb-samsung-1',
    brandSlug: 'samsung',
    sku: 'SAMSUNG-S25U-512-TITANIUM',
    name: 'Samsung Galaxy S25 Ultra 512GB',
    stock_status: 'IN_STOCK',
    price: { regularPrice: { amount: { value: 30990000, currency: 'VND' } } },
    price_range: { minimum_price: { regular_price: { value: 30990000, currency: 'VND' } } },
    image: { url: '/images/placeholder.svg', label: 'Samsung Galaxy S25 Ultra' },
  },
  {
    id: 'fb-xiaomi-1',
    brandSlug: 'xiaomi',
    sku: 'XIAOMI14U-512-BLACK',
    name: 'Xiaomi 14 Ultra 512GB',
    stock_status: 'IN_STOCK',
    price: { regularPrice: { amount: { value: 24990000, currency: 'VND' } } },
    price_range: { minimum_price: { regular_price: { value: 24990000, currency: 'VND' } } },
    image: { url: '/images/placeholder.svg', label: 'Xiaomi 14 Ultra' },
  },
  {
    id: 'fb-oppo-1',
    brandSlug: 'oppo',
    sku: 'OPPO-FINDX8PRO-256-WHITE',
    name: 'OPPO Find X8 Pro 256GB',
    stock_status: 'IN_STOCK',
    price: { regularPrice: { amount: { value: 21990000, currency: 'VND' } } },
    price_range: { minimum_price: { regular_price: { value: 21990000, currency: 'VND' } } },
    image: { url: '/images/placeholder.svg', label: 'OPPO Find X8 Pro' },
  },
  {
    id: 'fb-oneplus-1',
    brandSlug: 'oneplus',
    sku: 'ONEPLUS13-512-BLACK',
    name: 'OnePlus 13 512GB',
    stock_status: 'IN_STOCK',
    price: { regularPrice: { amount: { value: 23990000, currency: 'VND' } } },
    price_range: { minimum_price: { regular_price: { value: 23990000, currency: 'VND' } } },
    image: { url: '/images/placeholder.svg', label: 'OnePlus 13' },
  },
  {
    id: 'fb-vivo-1',
    brandSlug: 'vivo',
    sku: 'VIVO-X200PRO-256-BLUE',
    name: 'vivo X200 Pro 256GB',
    stock_status: 'IN_STOCK',
    price: { regularPrice: { amount: { value: 22990000, currency: 'VND' } } },
    price_range: { minimum_price: { regular_price: { value: 22990000, currency: 'VND' } } },
    image: { url: '/images/placeholder.svg', label: 'vivo X200 Pro' },
  },
  {
    id: 'fb-asus-1',
    brandSlug: 'asus',
    sku: 'ASUS-ROG9-512-BLACK',
    name: 'ASUS ROG Phone 9 512GB',
    stock_status: 'IN_STOCK',
    price: { regularPrice: { amount: { value: 24990000, currency: 'VND' } } },
    price_range: { minimum_price: { regular_price: { value: 24990000, currency: 'VND' } } },
    image: { url: '/images/placeholder.svg', label: 'ASUS ROG Phone 9' },
  },
  {
    id: 'fb-redmagic-1',
    brandSlug: 'red-magic',
    sku: 'REDMAGIC10PRO-512-BLACK',
    name: 'Red Magic 10 Pro 512GB',
    stock_status: 'IN_STOCK',
    price: { regularPrice: { amount: { value: 21990000, currency: 'VND' } } },
    price_range: { minimum_price: { regular_price: { value: 21990000, currency: 'VND' } } },
    image: { url: '/images/placeholder.svg', label: 'Red Magic 10 Pro' },
  },
  {
    id: 'fb-audio-1',
    brandSlug: 'tai-nghe',
    sku: 'TAI-NGHE-AIRPODS-PRO2',
    name: 'Apple AirPods Pro 2 USB-C',
    stock_status: 'IN_STOCK',
    price: { regularPrice: { amount: { value: 6490000, currency: 'VND' } } },
    price_range: { minimum_price: { regular_price: { value: 6490000, currency: 'VND' } } },
    image: { url: '/images/placeholder.svg', label: 'AirPods Pro 2' },
  },
  {
    id: 'fb-phukien-1',
    brandSlug: 'phu-kien',
    sku: 'PK-SAC-65W-GAN',
    name: 'Sạc nhanh GaN 65W USB-C',
    stock_status: 'IN_STOCK',
    price: { regularPrice: { amount: { value: 490000, currency: 'VND' } } },
    price_range: { minimum_price: { regular_price: { value: 490000, currency: 'VND' } } },
    image: { url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=1200&q=80&auto=format&fit=crop', label: 'Sạc nhanh 65W' },
  },
];

interface FallbackQueryOptions {
  brand?: string | null;
  search?: string | null;
  sortBy?: string;
  page?: number;
  pageSize?: number;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function getFallbackProducts(options: FallbackQueryOptions) {
  const {
    brand,
    search,
    sortBy = 'position',
    page = 1,
    pageSize = 12,
  } = options;

  const normalizedBrand = brand ? BRAND_ALIAS[normalize(brand)] : undefined;
  const normalizedSearch = search ? normalize(search) : '';

  let items = FALLBACK_PRODUCTS.filter((item) => {
    if (normalizedBrand && item.brandSlug !== normalizedBrand) {
      return false;
    }

    if (normalizedSearch && !normalize(item.name).includes(normalizedSearch)) {
      return false;
    }

    return true;
  });

  if (sortBy === 'price_asc') {
    items = [...items].sort((a, b) => a.price_range.minimum_price.regular_price.value - b.price_range.minimum_price.regular_price.value);
  } else if (sortBy === 'price_desc') {
    items = [...items].sort((a, b) => b.price_range.minimum_price.regular_price.value - a.price_range.minimum_price.regular_price.value);
  } else if (sortBy === 'name') {
    items = [...items].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }

  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedItems = items.slice(startIndex, startIndex + pageSize);

  return {
    items: pagedItems,
    totalCount,
    totalPages,
    currentPage: safePage,
  };
}
