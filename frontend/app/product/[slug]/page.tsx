'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { graphqlClient } from '@/lib/graphql/client';
import { GET_PRODUCT_DETAIL } from '@/lib/graphql/queries/products';
import { formatPrice } from '@/lib/utils/formatters';
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
  }>;
  stock_status?: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
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
        setProduct(data.products.items[0]);
      }
    } catch (error) {
      console.error('Failed to load product:', error);
    } finally {
      setLoading(false);
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

  const price = product.price_range.minimum_price.final_price || 
    product.price_range.minimum_price.regular_price;
  const images = product.media_gallery || (product.image ? [product.image] : []);
  const inStock = product.stock_status !== 'OUT_OF_STOCK';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="grid md:grid-cols-2 gap-8 p-6 md:p-8">
            {/* Images */}
            <div>
              {images.length > 0 && (
                <>
                  <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden mb-4">
                    <Image
                      src={images[selectedImage].url}
                      alt={images[selectedImage].label || product.name}
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>
                  {images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {images.map((img, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImage(index)}
                          className={`aspect-square relative bg-gray-100 rounded-lg overflow-hidden ${
                            selectedImage === index ? 'ring-2 ring-primary-600' : ''
                          }`}
                        >
                          <Image
                            src={img.url}
                            alt={img.label || `Image ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Product Info */}
            <div>
              <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
              <p className="text-3xl font-bold text-primary-600 mb-6">
                {formatPrice(price.value, price.currency)}
              </p>

              {product.short_description && (
                <div
                  className="text-gray-600 mb-6"
                  dangerouslySetInnerHTML={{ __html: product.short_description.html }}
                />
              )}

              {/* Quantity & Add to Cart */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
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

                <Button
                  fullWidth
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={!inStock}
                  loading={adding}
                >
                  {inStock ? 'Add to Cart' : 'Out of Stock'}
                </Button>
              </div>

              {/* Stock Status */}
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600">
                  Status:{' '}
                  <span className={inStock ? 'text-green-600' : 'text-red-600'}>
                    {inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="border-t p-6 md:p-8">
              <h2 className="text-2xl font-bold mb-4">Description</h2>
              <div
                className="prose max-w-none text-gray-600"
                dangerouslySetInnerHTML={{ __html: product.description.html }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
