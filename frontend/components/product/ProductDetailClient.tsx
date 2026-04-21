'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
  const [activeImage, setActiveImage] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    loadProduct();
  }, [slug]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const data = await graphqlClient<{
        products: {
          items: Product[];
        };
      }>({
        query: GET_PRODUCT_DETAIL,
        variables: { sku: slug },
        cache: 'no-store',
      });

      if (data.products.items.length > 0) {
        const loadedProduct = data.products.items[0];
        setProduct(loadedProduct);
        setActiveImage(getPrimaryProductImageUrl(loadedProduct));
      }
    } catch (error) {
      console.error('Failed to load product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    setFeedback(null);
    setAdding(true);
    try {
      await addToCart(product.sku, quantity);
      setFeedback({
        type: 'success',
        message: `Đã thêm ${quantity} sản phẩm vào giỏ hàng.`,
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      setFeedback({
        type: 'error',
        message: 'Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại.',
      });
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
  const regularPrice = product.price_range.minimum_price.regular_price;
  const hasDiscount = Boolean(product.price_range.minimum_price.final_price) && price.value < regularPrice.value;
  const discountPercent = hasDiscount
    ? Math.round(((regularPrice.value - price.value) / regularPrice.value) * 100)
    : 0;

  const gallery = (product.media_gallery || [])
    .filter((media) => !media.disabled && Boolean(media.url))
    .sort((a, b) => a.position - b.position);

  const fallbackImageUrl = getPrimaryProductImageUrl(product);
  const galleryImages = gallery.length > 0 ? gallery : [{ url: fallbackImageUrl, label: product.name, position: 1 }];
  const selectedImage = activeImage || galleryImages[0].url;
  const selectedImageLabel =
    galleryImages.find((item) => item.url === selectedImage)?.label ||
    product.image?.label ||
    product.name;

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

  const category = product.categories?.[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8 md:py-12">
      <div className="container-custom space-y-6">
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gold transition-colors">Trang chủ</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-gold transition-colors">Sản phẩm</Link>
          {category && (
            <>
              <span>/</span>
              <span className="text-gray-700">{category.name}</span>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8 p-6 md:p-8">
            <div className="space-y-4">
              <div className="aspect-square relative bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                <Image src={selectedImage} alt={selectedImageLabel} fill className="object-cover" priority unoptimized />
              </div>

              <div className="grid grid-cols-5 gap-3">
                {galleryImages.slice(0, 10).map((item) => {
                  const isActive = selectedImage === item.url;
                  return (
                    <button
                      key={`${item.url}-${item.position}`}
                      type="button"
                      onClick={() => setActiveImage(item.url)}
                      className={`relative aspect-square rounded-lg overflow-hidden border ${
                        isActive ? 'border-gold ring-2 ring-gold/20' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Image
                        src={item.url}
                        alt={item.label || product.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">{product.name}</h1>

                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={`px-3 py-1 rounded-full font-medium ${inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {inStock ? 'Còn hàng' : 'Tạm hết hàng'}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700">SKU: {product.sku}</span>
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700">{detectBrand(product.name)}</span>
                </div>

                <div className="space-y-1">
                  <p className="text-3xl font-bold text-primary-600">{formattedPrice}</p>
                  {hasDiscount && (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-500 line-through">
                        {formatPrice(regularPrice.value, regularPrice.currency)}
                      </p>
                      <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-md">
                        -{discountPercent}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {shortDescriptionHtml && (
                <div className="prose prose-sm max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: shortDescriptionHtml }} />
              )}

              <div className="space-y-5 bg-slate-50 rounded-xl border border-slate-200 p-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Số lượng</label>
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 border border-gray-300 rounded-md flex items-center justify-center hover:bg-white"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center border border-gray-300 rounded-md px-3 py-2 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 border border-gray-300 rounded-md flex items-center justify-center hover:bg-white"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <Button fullWidth size="lg" onClick={handleAddToCart} disabled={!inStock} loading={adding}>
                    {inStock ? 'Thêm vào giỏ' : 'Hết hàng'}
                  </Button>
                  <Link href="/cart" className="w-full">
                    <Button fullWidth size="lg" variant="outline">
                      Xem giỏ hàng
                    </Button>
                  </Link>
                </div>

                {feedback && (
                  <div
                    className={`rounded-md px-3 py-2 text-sm ${
                      feedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {feedback.message}
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border border-gray-200 px-3 py-2">
                  <p className="text-gray-500">Bảo hành</p>
                  <p className="font-semibold text-gray-900">12 tháng chính hãng</p>
                </div>
                <div className="rounded-lg border border-gray-200 px-3 py-2">
                  <p className="text-gray-500">Giao hàng</p>
                  <p className="font-semibold text-gray-900">Nội thành trong ngày</p>
                </div>
                <div className="rounded-lg border border-gray-200 px-3 py-2">
                  <p className="text-gray-500">Hỗ trợ</p>
                  <p className="font-semibold text-gray-900">Hotline 24/7</p>
                </div>
              </div>
            </div>
          </div>

          {fullDescriptionHtml && (
            <div className="border-t p-6 md:p-8 bg-white">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">Thông tin sản phẩm</h2>
              <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: fullDescriptionHtml }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
