'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { graphqlClient } from '@/lib/graphql/client';
import { GET_PRODUCT_DETAIL } from '@/lib/graphql/queries/products';
import { formatPrice } from '@/lib/utils/formatters';
import { getPrimaryProductImageUrl } from '@/lib/utils/image';
import Button from '@/components/ui/Button';
import { useCart } from '@/lib/hooks';

interface Product {
  id: string;
  sku: string;
  name: string;
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
  description?: {
    html: string;
  };
  short_description?: {
    html: string;
  };
  image?: {
    url: string;
    label: string;
  };
  media_gallery?: Array<{
    url: string;
    label: string;
    position: number;
    disabled?: boolean;
  }>;
  updated_at?: string;
  stock_status?: string;
  categories?: Array<{
    id: string;
    name: string;
    url_key?: string;
    url_path?: string;
  }>;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectBrand(productName: string): string {
  const normalized = productName.toLowerCase();
  if (normalized.includes('iphone') || normalized.includes('apple')) return 'Apple';
  if (normalized.includes('samsung')) return 'Samsung';
  if (normalized.includes('xiaomi')) return 'Xiaomi';
  if (normalized.includes('oppo')) return 'OPPO';
  if (normalized.includes('oneplus') || normalized.includes('one plus')) return 'OnePlus';
  if (normalized.includes('vivo')) return 'Vivo';
  if (normalized.includes('asus')) return 'Asus';
  if (normalized.includes('red magic') || normalized.includes('redmagic')) return 'Red Magic';
  return 'điện thoại';
}

function isDescriptionMatchingProduct(productName: string, descriptionText: string): boolean {
  const normalizedName = productName.toLowerCase();
  const normalizedDesc = descriptionText.toLowerCase();

  if (!normalizedDesc) return false;
  if (normalizedDesc.includes(normalizedName)) return true;

  const requiredTokens = normalizedName
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/g, ''))
    .filter((token) => token.length >= 3 || /\d/.test(token));

  if (requiredTokens.length === 0) return false;

  const matched = requiredTokens.filter((token) => normalizedDesc.includes(token)).length;
  return matched >= Math.min(2, requiredTokens.length);
}

function buildAccurateShortDescription(product: Product, displayPrice: string, inStock: boolean): string {
  const brand = detectBrand(product.name);
  return `<p>${product.name} là mẫu ${brand} chính hãng với thiết kế hiện đại, hiệu năng ổn định và trải nghiệm sử dụng mượt mà.</p>
<p>Giá tham khảo hiện tại: <strong>${displayPrice}</strong>. Tình trạng: <strong>${inStock ? 'Còn hàng' : 'Hết hàng'}</strong>.</p>`;
}

function buildAccurateFullDescription(product: Product, displayPrice: string, inStock: boolean): string {
  const brand = detectBrand(product.name);
  const categoryName = product.categories?.[0]?.name || 'Điện thoại';
  const updatedAt = product.updated_at
    ? new Date(product.updated_at).toLocaleDateString('vi-VN')
    : 'Mới nhất';

  return `<p><strong>${product.name}</strong> thuộc nhóm ${categoryName}, là dòng ${brand} phù hợp cho nhu cầu sử dụng hằng ngày và giải trí.</p>
<ul>
  <li>Tên sản phẩm: ${product.name}</li>
  <li>Mã SKU: ${product.sku}</li>
  <li>Giá hiện tại: ${displayPrice}</li>
  <li>Trạng thái kho: ${inStock ? 'Còn hàng' : 'Hết hàng'}</li>
  <li>Cập nhật dữ liệu: ${updatedAt}</li>
</ul>
<p>Thiết bị mang lại trải nghiệm ổn định cho nhu cầu liên lạc, giải trí và làm việc hằng ngày.</p>`;
}

interface ProductDetailClientProps {
  slug: string;
}

export default function ProductDetailClient({ slug }: ProductDetailClientProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const requestControllerRef = useRef<AbortController | null>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    loadProduct();

    return () => {
      requestControllerRef.current?.abort();
    };
  }, [slug]);

  const loadProduct = async () => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;

    setLoading(true);
    try {
      const data = await graphqlClient<{
        products: {
          items: Product[];
        };
      }>({
        query: GET_PRODUCT_DETAIL,
        variables: { sku: slug },
        cache: 'default',
        ttlMs: 15 * 1000,
        signal: controller.signal,
      });

      if (data.products.items.length > 0) {
        setProduct(data.products.items[0]);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      console.error('Failed to load product:', error);
    } finally {
      if (requestControllerRef.current === controller) {
        setLoading(false);
      }
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    setAdding(true);
    try {
      await addToCart(product.sku, quantity);
      alert('Product added to cart!');
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add product to cart');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container-custom">
          <div className="animate-pulse">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="aspect-square bg-gray-200 rounded-lg" />
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4" />
                <div className="h-6 bg-gray-200 rounded w-1/4" />
                <div className="h-20 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container-custom text-center">
          <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
          <p className="text-gray-600">The product you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const price = product.price_range.minimum_price.final_price || product.price_range.minimum_price.regular_price;
  const formattedPrice = formatPrice(price.value, price.currency);
  const imageUrl = getPrimaryProductImageUrl(product);
  const imageLabel = product.media_gallery?.[0]?.label || product.image?.label || product.name;
  const inStock = product.stock_status !== 'OUT_OF_STOCK';
  const rawShortDescription = product.short_description?.html || '';
  const rawFullDescription = product.description?.html || '';
  const trustedShortDescription = isDescriptionMatchingProduct(product.name, stripHtml(rawShortDescription));
  const trustedFullDescription = isDescriptionMatchingProduct(product.name, stripHtml(rawFullDescription));
  const shortDescriptionHtml = trustedShortDescription
    ? rawShortDescription
    : buildAccurateShortDescription(product, formattedPrice, inStock);
  const fullDescriptionHtml = trustedFullDescription
    ? rawFullDescription
    : buildAccurateFullDescription(product, formattedPrice, inStock);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="grid md:grid-cols-2 gap-8 p-6 md:p-8">
            <div>
              <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden mb-4">
                <Image src={imageUrl} alt={imageLabel} fill className="object-cover" priority unoptimized />
              </div>
            </div>

            <div>
              <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
              <p className="text-3xl font-bold text-primary-600 mb-6">{formattedPrice}</p>

              {shortDescriptionHtml && (
                <div className="text-gray-600 mb-6" dangerouslySetInnerHTML={{ __html: shortDescriptionHtml }} />
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-50"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center border border-gray-300 rounded-md px-3 py-2"
                    />
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                </div>

                <Button fullWidth size="lg" onClick={handleAddToCart} disabled={!inStock} loading={adding}>
                  {inStock ? 'Mua' : 'Hết hàng'}
                </Button>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-600">
                  Trạng thái:{' '}
                  <span className={inStock ? 'text-green-600' : 'text-red-600'}>{inStock ? 'Còn hàng' : 'Hết hàng'}</span>
                </p>
              </div>
            </div>
          </div>

          {fullDescriptionHtml && (
            <div className="border-t p-6 md:p-8">
              <h2 className="text-2xl font-bold mb-4">Thông tin sản phẩm</h2>
              <div className="prose max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: fullDescriptionHtml }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
