'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { graphqlClient } from '@/lib/graphql/client';
import { GET_PRODUCT_BY_URL_KEY, GET_PRODUCT_DETAIL } from '@/lib/graphql/queries/products';
import { formatPrice } from '@/lib/utils/formatters';
import { getPrimaryProductImageUrl, withImageVersion } from '@/lib/utils/image';
import { buildProductPath } from '@/lib/utils/productRouting';
import Button from '@/components/ui/Button';
import { useCart, useAuth } from '@/lib/hooks';

interface MediaItem {
  url: string;
  label: string;
  position: number;
  disabled?: boolean;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  price_range: {
    minimum_price: {
      regular_price: { value: number; currency: string };
      final_price?: { value: number; currency: string };
    };
  };
  description?: { html: string };
  short_description?: { html: string };
  image?: { url: string; label: string };
  media_gallery?: MediaItem[];
  updated_at?: string;
  stock_status?: string;
  categories?: Array<{ id: string; name: string; url_key?: string }>;
}

// ---------------------------------------------------------------------------
// Spec generation helpers
// ---------------------------------------------------------------------------
interface SpecRow {
  label: string;
  value: string;
  isSection?: boolean;
}

interface MobileCitySpecsResponse {
  found: boolean;
  sourceUrl: string | null;
  specs: SpecRow[];
  detailSpecs?: SpecRow[];
  message?: string;
  error?: string;
}

function detectBrandModel(name: string): { brand: string; model: string } {
  const n = name.toLowerCase();
  if (n.includes('iphone') || n.includes('apple')) return { brand: 'Apple', model: name };
  if (n.includes('samsung') || n.includes('galaxy')) return { brand: 'Samsung', model: name };
  if (n.includes('xiaomi') || n.includes('redmi') || n.includes('poco')) return { brand: 'Xiaomi', model: name };
  if (n.includes('oppo') || n.includes('reno') || n.includes('find')) return { brand: 'Oppo', model: name };
  if (n.includes('oneplus') || n.includes('one plus')) return { brand: 'OnePlus', model: name };
  if (n.includes('vivo')) return { brand: 'Vivo', model: name };
  if (n.includes('asus') || n.includes('zenfone') || n.includes('rog')) return { brand: 'Asus', model: name };
  if (n.includes('red magic') || n.includes('redmagic')) return { brand: 'Red Magic', model: name };
  return { brand: 'Điện thoại', model: name };
}

function generateSpecs(product: Product): SpecRow[] {
  const { brand } = detectBrandModel(product.name);
  const n = product.name.toLowerCase();

  let os = 'Android 14';
  let cpu = 'Chipset cao cấp';
  let screen = '6.7 inch, AMOLED, 120Hz';
  let rearCam = '50 MP (chính) + 12 MP (góc rộng) + 8 MP (phụ)';
  let frontCam = '16 MP – 32 MP, tự động lấy nét';
  let battery = '5000 mAh, sạc nhanh 67W';
  let ram = '8 GB / 12 GB';
  let storage = '256 GB / 512 GB';
  let sim = '2 SIM Nano';
  let connectivity = '5G, WiFi 6/6E, Bluetooth 5.3, NFC, USB-C';

  if (brand === 'Apple') {
    os = 'iOS 18';
    cpu = 'Apple A17 Pro';
    screen = '6.1 inch, Super Retina XDR OLED, 60Hz';
    rearCam = '48 MP (chính) + 12 MP (góc rộng)';
    frontCam = '12 MP';
    battery = '3349 mAh, sạc nhanh 20W, MagSafe';
    ram = '6 GB / 8 GB';
    storage = '128 GB / 256 GB / 512 GB';
    sim = '1 SIM + 1 eSIM';

    if (n.includes('17 pro max')) {
      cpu = 'Apple A19 Pro';
      screen = '6.9 inch, LTPO Super Retina XDR OLED, 120Hz';
      rearCam = '48 MP + 48 MP + 12 MP (zoom quang 5x)';
      battery = '4850 mAh, sạc nhanh 35W, MagSafe';
      ram = '12 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.includes('17 pro')) {
      cpu = 'Apple A19 Pro';
      screen = '6.3 inch, LTPO Super Retina XDR OLED, 120Hz';
      rearCam = '48 MP + 12 MP + 12 MP (zoom 3x)';
      battery = '3650 mAh, sạc nhanh 30W, MagSafe';
      ram = '12 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.match(/iphone\s+17(\s|$)/)) {
      cpu = 'Apple A19';
      screen = '6.1 inch, Super Retina XDR OLED, 120Hz';
      rearCam = '48 MP + 12 MP';
      battery = '3600 mAh, sạc nhanh 27W, MagSafe';
      ram = '8 GB';
      storage = '128 GB / 256 GB / 512 GB';
    } else if (n.includes('16 pro max')) {
      cpu = 'Apple A18 Pro';
      screen = '6.9 inch, LTPO Super Retina XDR OLED, 120Hz';
      rearCam = '48 MP + 48 MP + 12 MP (zoom quang 5x)';
      battery = '4676 mAh, sạc nhanh 30W, MagSafe';
      ram = '8 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.includes('16 pro')) {
      cpu = 'Apple A18 Pro';
      screen = '6.3 inch, LTPO Super Retina XDR OLED, 120Hz';
      rearCam = '48 MP + 48 MP + 12 MP (zoom 5x)';
      battery = '3550 mAh, sạc nhanh 30W, MagSafe';
      ram = '8 GB';
      storage = '128 GB / 256 GB / 512 GB / 1 TB';
    } else if (n.includes('16 plus')) {
      cpu = 'Apple A18';
      screen = '6.7 inch, Super Retina XDR OLED, 60Hz';
      rearCam = '48 MP + 12 MP';
      battery = '4674 mAh, sạc nhanh 27W, MagSafe';
      ram = '8 GB';
      storage = '128 GB / 256 GB / 512 GB';
    } else if (n.match(/iphone\s+16(\s|$)/)) {
      cpu = 'Apple A18';
      screen = '6.1 inch, Super Retina XDR OLED, 60Hz';
      rearCam = '48 MP + 12 MP';
      battery = '3561 mAh, sạc nhanh 27W, MagSafe';
      ram = '8 GB';
      storage = '128 GB / 256 GB / 512 GB';
    } else if (n.includes('15 pro max')) {
      cpu = 'Apple A17 Pro';
      screen = '6.7 inch, LTPO Super Retina XDR OLED, 120Hz';
      rearCam = '48 MP + 12 MP + 12 MP (zoom quang 5x)';
      battery = '4422 mAh, sạc nhanh 27W, MagSafe';
      ram = '8 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.includes('15 pro')) {
      cpu = 'Apple A17 Pro';
      screen = '6.1 inch, LTPO Super Retina XDR OLED, 120Hz';
      rearCam = '48 MP + 12 MP + 12 MP (zoom 3x)';
      battery = '3274 mAh, sạc nhanh 27W, MagSafe';
      ram = '8 GB';
      storage = '128 GB / 256 GB / 512 GB / 1 TB';
    } else if (n.includes('15 plus')) {
      cpu = 'Apple A16 Bionic';
      screen = '6.7 inch, Super Retina XDR OLED, 60Hz';
      battery = '4383 mAh, sạc nhanh 20W, MagSafe';
      ram = '6 GB';
    } else if (n.includes('15')) {
      cpu = 'Apple A16 Bionic';
      battery = '3349 mAh, sạc nhanh 20W, MagSafe';
      ram = '6 GB';
    } else if (n.includes('14 pro max')) {
      cpu = 'Apple A16 Bionic';
      screen = '6.7 inch, LTPO Super Retina XDR OLED, 120Hz';
      rearCam = '48 MP + 12 MP + 12 MP';
      battery = '4323 mAh, sạc nhanh 27W, MagSafe';
      ram = '6 GB';
      storage = '128 GB / 256 GB / 512 GB / 1 TB';
    } else if (n.includes('14 pro')) {
      cpu = 'Apple A16 Bionic';
      screen = '6.1 inch, LTPO Super Retina XDR OLED, 120Hz';
      rearCam = '48 MP + 12 MP + 12 MP';
      battery = '3200 mAh, sạc nhanh 20W, MagSafe';
      ram = '6 GB';
      storage = '128 GB / 256 GB / 512 GB / 1 TB';
    } else if (n.includes('14')) {
      cpu = 'Apple A15 Bionic';
      battery = '3279 mAh, sạc nhanh 20W, MagSafe';
      ram = '6 GB';
    } else if (n.includes('13')) {
      cpu = 'Apple A15 Bionic';
      battery = '3240 mAh, sạc nhanh 20W, MagSafe';
      ram = '4 GB / 6 GB';
    } else if (n.includes('12')) {
      cpu = 'Apple A14 Bionic';
      battery = '2815 mAh, sạc nhanh 20W, MagSafe';
      ram = '4 GB';
    } else if (n.includes('se (2022)') || n.includes('se 2022')) {
      cpu = 'Apple A15 Bionic';
      screen = '4.7 inch, Retina IPS LCD, 60Hz';
      rearCam = '12 MP';
      frontCam = '7 MP';
      battery = '2018 mAh, sạc nhanh 20W';
      ram = '4 GB';
      storage = '64 GB / 128 GB / 256 GB';
      sim = '1 SIM + eSIM';
    }
  } else if (brand === 'Samsung') {
    os = 'Android 14';
    cpu = 'Exynos / Snapdragon';
    screen = '6.6 inch, Dynamic AMOLED 2X, 120Hz';
    rearCam = '50 MP + 12 MP + 10 MP';
    battery = '5000 mAh, sạc nhanh 45W';

    if (n.includes('s26 ultra')) {
      cpu = 'Snapdragon 8 Elite for Galaxy';
      screen = '6.9 inch, Dynamic AMOLED 2X, 120Hz';
      rearCam = '200 MP + 50 MP + 50 MP + 12 MP';
      frontCam = '12 MP';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB / 1 TB';
      battery = '5500 mAh, sạc nhanh 65W';
    } else if (n.match(/s26(\s|$)/)) {
      cpu = 'Exynos 2600';
      screen = '6.4 inch, Dynamic AMOLED 2X, 120Hz';
      rearCam = '50 MP + 12 MP + 10 MP';
      frontCam = '12 MP';
      ram = '12 GB';
      storage = '256 GB / 512 GB';
      battery = '4500 mAh, sạc nhanh 45W';
    } else if (n.includes('s25 ultra')) {
      cpu = 'Snapdragon 8 Elite for Galaxy';
      screen = '6.9 inch, Dynamic AMOLED 2X, 120Hz';
      rearCam = '200 MP + 50 MP + 50 MP + 10 MP';
      frontCam = '12 MP';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB / 1 TB';
      battery = '5000 mAh, sạc nhanh 45W';
    } else if (n.includes('s25+')) {
      cpu = 'Exynos 2500';
      screen = '6.7 inch, Dynamic AMOLED 2X, 120Hz';
      rearCam = '50 MP + 12 MP + 10 MP';
      frontCam = '12 MP';
      ram = '12 GB';
      storage = '256 GB / 512 GB';
      battery = '4900 mAh, sạc nhanh 45W';
    } else if (n.includes('s24 ultra')) {
      cpu = 'Snapdragon 8 Gen 3 for Galaxy';
      screen = '6.8 inch, Dynamic AMOLED 2X, 120Hz';
      rearCam = '200 MP + 12 MP + 50 MP + 10 MP';
      frontCam = '12 MP';
      ram = '12 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.includes('s24+')) {
      cpu = 'Exynos 2400';
      screen = '6.7 inch, Dynamic AMOLED 2X, 120Hz';
      rearCam = '50 MP + 12 MP + 10 MP';
      frontCam = '12 MP';
      ram = '12 GB';
      storage = '256 GB / 512 GB';
      battery = '4900 mAh, sạc nhanh 45W';
    } else if (n.includes('s24')) {
      cpu = 'Exynos 2400';
      screen = '6.2 inch, Dynamic AMOLED 2X, 120Hz';
      frontCam = '12 MP';
      ram = '8 GB';
      storage = '128 GB / 256 GB';
      battery = '4000 mAh, sạc nhanh 25W';
    } else if (n.includes('s23 ultra')) {
      cpu = 'Snapdragon 8 Gen 2 for Galaxy';
      screen = '6.8 inch, Dynamic AMOLED 2X, 120Hz';
      rearCam = '200 MP + 12 MP + 10 MP + 10 MP';
      ram = '8 GB / 12 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.includes('s23')) {
      cpu = 'Snapdragon 8 Gen 2 for Galaxy';
      screen = '6.1 inch, Dynamic AMOLED 2X, 120Hz';
      ram = '8 GB';
      storage = '128 GB / 256 GB';
      battery = '3900 mAh, sạc nhanh 25W';
    } else if (n.includes('z fold7')) {
      cpu = 'Snapdragon 8 Elite for Galaxy';
      screen = '8.0 inch (chính) + 6.5 inch (phụ), Dynamic AMOLED 2X, 120Hz';
      rearCam = '200 MP + 12 MP + 10 MP';
      frontCam = '10 MP + 4 MP (under display)';
      battery = '4700 mAh, sạc nhanh 45W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.includes('z flip7')) {
      cpu = 'Snapdragon 8 Elite for Galaxy';
      screen = '6.9 inch (chính) + 4.1 inch (phụ), Dynamic AMOLED 2X, 120Hz';
      rearCam = '50 MP + 12 MP';
      frontCam = '12 MP';
      battery = '4300 mAh, sạc nhanh 45W';
      ram = '12 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('z fold5')) {
      cpu = 'Snapdragon 8 Gen 2 for Galaxy';
      screen = '7.6 inch (chính) + 6.2 inch (phụ), AMOLED, 120Hz';
      rearCam = '50 MP + 12 MP + 10 MP';
      frontCam = '10 MP + 4 MP (under display)';
      battery = '4400 mAh, sạc nhanh 25W';
      ram = '12 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.includes('z flip5')) {
      cpu = 'Snapdragon 8 Gen 2 for Galaxy';
      screen = '6.7 inch (chính) + 3.4 inch (phụ), AMOLED, 120Hz';
      rearCam = '12 MP + 12 MP';
      frontCam = '10 MP';
      battery = '3700 mAh, sạc nhanh 25W';
      ram = '8 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('a56')) {
      cpu = 'Exynos 1580';
      screen = '6.7 inch, Super AMOLED, 120Hz';
      rearCam = '50 MP + 12 MP + 5 MP';
      frontCam = '32 MP';
      battery = '5000 mAh, sạc nhanh 45W';
      ram = '8 GB / 12 GB';
      storage = '128 GB / 256 GB';
    } else if (n.includes('a55')) {
      cpu = 'Exynos 1480';
      screen = '6.6 inch, Super AMOLED, 120Hz';
      rearCam = '50 MP + 12 MP + 5 MP';
      frontCam = '32 MP';
      battery = '5000 mAh, sạc nhanh 25W';
      ram = '8 GB / 12 GB';
      storage = '128 GB / 256 GB';
    } else if (n.includes('a35')) {
      cpu = 'Exynos 1380';
      screen = '6.6 inch, Super AMOLED, 120Hz';
      rearCam = '50 MP + 8 MP + 5 MP';
      frontCam = '13 MP';
      battery = '5000 mAh, sạc nhanh 25W';
      ram = '6 GB / 8 GB';
      storage = '128 GB / 256 GB';
    } else if (n.includes('m55')) {
      cpu = 'Snapdragon 7 Gen 1';
      screen = '6.7 inch, Super AMOLED+, 120Hz';
      rearCam = '50 MP + 8 MP + 2 MP';
      frontCam = '50 MP';
      battery = '5000 mAh, sạc nhanh 45W';
      ram = '8 GB / 12 GB';
      storage = '256 GB';
    }
  } else if (brand === 'Xiaomi') {
    os = 'Android 14 (HyperOS)';
    cpu = 'Snapdragon / Dimensity';
    screen = '6.67 inch, AMOLED, 120Hz';
    rearCam = '50 MP + 8 MP + 2 MP';
    battery = '5000 mAh, sạc nhanh 67W';

    if (n.includes('17 ultra')) {
      cpu = 'Snapdragon 8 Elite Gen 5';
      screen = '6.9 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 50 MP + 50 MP';
      frontCam = '32 MP';
      battery = '6800 mAh, sạc nhanh 100W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.includes('17 pro max')) {
      cpu = 'Snapdragon 8 Elite Gen 5';
      screen = '6.9 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 50 MP + 50 MP';
      frontCam = '32 MP';
      battery = '7500 mAh, sạc nhanh 100W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.includes('17 pro')) {
      cpu = 'Snapdragon 8 Elite Gen 5';
      screen = '6.3 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 50 MP + 50 MP';
      frontCam = '32 MP';
      battery = '6300 mAh, sạc nhanh 100W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.includes('15 ultra')) {
      cpu = 'Snapdragon 8 Elite';
      screen = '6.73 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 50 MP + 200 MP + 50 MP';
      frontCam = '32 MP';
      battery = '5410 mAh, sạc nhanh 90W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.includes('15 pro')) {
      cpu = 'Snapdragon 8 Elite';
      screen = '6.73 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 50 MP + 50 MP';
      frontCam = '32 MP';
      battery = '5400 mAh, sạc nhanh 120W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.includes('redmi k80 pro')) {
      cpu = 'Snapdragon 8 Gen 4';
      screen = '6.67 inch, OLED, 144Hz';
      rearCam = '50 MP + 50 MP + 12 MP';
      frontCam = '20 MP';
      battery = '6000 mAh, sạc nhanh 120W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.includes('redmi k70 pro')) {
      cpu = 'Snapdragon 8 Gen 3';
      screen = '6.67 inch, OLED, 120Hz';
      rearCam = '50 MP + 50 MP + 12 MP';
      frontCam = '16 MP';
      battery = '5000 mAh, sạc nhanh 120W';
      ram = '12 GB / 16 GB / 24 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.includes('k70 ultra')) {
      cpu = 'Dimensity 9300+';
      screen = '6.67 inch, OLED, 144Hz';
      rearCam = '50 MP + 8 MP + 2 MP';
      frontCam = '20 MP';
      battery = '5500 mAh, sạc nhanh 120W';
      ram = '12 GB / 16 GB / 24 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.includes('14 ultra')) {
      cpu = 'Snapdragon 8 Gen 3';
      screen = '6.73 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 50 MP + 50 MP + 50 MP';
      frontCam = '32 MP';
      battery = '5300 mAh, sạc nhanh 90W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.includes('14 pro')) {
      cpu = 'Snapdragon 8 Gen 3';
      screen = '6.73 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 50 MP + 50 MP';
      frontCam = '32 MP';
      battery = '4880 mAh, sạc nhanh 120W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.match(/(^|\s)14(\s|$)/)) {
      cpu = 'Snapdragon 8 Gen 3';
      screen = '6.36 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 50 MP + 50 MP';
      frontCam = '32 MP';
      battery = '4610 mAh, sạc nhanh 90W';
      ram = '8 GB / 12 GB / 16 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('redmi note 13 pro+')) {
      cpu = 'Dimensity 7200 Ultra';
      screen = '6.67 inch, AMOLED, 120Hz';
      rearCam = '200 MP + 8 MP + 2 MP';
      frontCam = '16 MP';
      battery = '5000 mAh, sạc nhanh 120W';
      ram = '8 GB / 12 GB / 16 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('redmi note 13 pro')) {
      cpu = 'Snapdragon 7s Gen 2';
      screen = '6.67 inch, AMOLED, 120Hz';
      rearCam = '200 MP + 8 MP + 2 MP';
      frontCam = '16 MP';
      battery = '5100 mAh, sạc nhanh 67W';
      ram = '8 GB / 12 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('redmi note 13')) {
      cpu = 'Dimensity 6080';
      screen = '6.67 inch, AMOLED, 120Hz';
      rearCam = '108 MP + 8 MP + 2 MP';
      frontCam = '16 MP';
      battery = '5000 mAh, sạc nhanh 33W';
      ram = '6 GB / 8 GB';
      storage = '128 GB / 256 GB';
    } else if (n.includes('13t pro')) {
      cpu = 'Dimensity 9200+';
      screen = '6.67 inch, AMOLED, 144Hz';
      rearCam = '50 MP + 50 MP + 12 MP';
      frontCam = '20 MP';
      battery = '5000 mAh, sạc nhanh 120W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.includes('poco f6 pro')) {
      cpu = 'Snapdragon 8 Gen 2';
      screen = '6.67 inch, AMOLED, 120Hz';
      rearCam = '50 MP + 8 MP + 2 MP';
      frontCam = '16 MP';
      battery = '5000 mAh, sạc nhanh 120W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.includes('poco x6 pro')) {
      cpu = 'Dimensity 8300 Ultra';
      screen = '6.67 inch, AMOLED, 120Hz';
      rearCam = '64 MP + 8 MP + 2 MP';
      frontCam = '16 MP';
      battery = '5000 mAh, sạc nhanh 67W';
      ram = '8 GB / 12 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('poco m6 pro')) {
      cpu = 'Helio G99 Ultra';
      screen = '6.67 inch, AMOLED, 120Hz';
      rearCam = '64 MP + 8 MP + 2 MP';
      frontCam = '16 MP';
      battery = '5000 mAh, sạc nhanh 67W';
      ram = '8 GB / 12 GB';
      storage = '256 GB / 512 GB';
    }
  } else if (brand === 'Oppo') {
    os = 'Android 14 (ColorOS)';
    cpu = 'Snapdragon / Dimensity';
    screen = '6.7 inch, AMOLED, 120Hz';
    rearCam = '50 MP + 8 MP + 2 MP';
    battery = '5000 mAh, sạc nhanh 67W';

    if (n.includes('find x9 ultra')) {
      cpu = 'Snapdragon 8 Elite';
      screen = '6.82 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 50 MP + 200 MP + 50 MP';
      frontCam = '32 MP';
      battery = '6000 mAh, sạc nhanh 100W';
      ram = '16 GB';
      storage = '512 GB / 1 TB';
    } else if (n.includes('find x9 pro')) {
      cpu = 'Dimensity 9500';
      screen = '6.82 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 50 MP + 64 MP';
      frontCam = '32 MP';
      battery = '5700 mAh, sạc nhanh 100W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('find x8 ultra')) {
      cpu = 'Snapdragon 8 Elite';
      screen = '6.82 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 50 MP + 50 MP + 50 MP';
      frontCam = '32 MP';
      battery = '5600 mAh, sạc nhanh 100W';
      ram = '16 GB';
      storage = '512 GB / 1 TB';
    } else if (n.includes('find x8 pro')) {
      cpu = 'Dimensity 9400';
      screen = '6.78 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 50 MP + 64 MP';
      frontCam = '32 MP';
      battery = '5600 mAh, sạc nhanh 80W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('find x8')) {
      cpu = 'Dimensity 9400';
      screen = '6.59 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 50 MP + 50 MP';
      frontCam = '32 MP';
      battery = '5500 mAh, sạc nhanh 80W';
      ram = '12 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('find x7 ultra')) {
      cpu = 'Snapdragon 8 Gen 3';
      screen = '6.82 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 50 MP + 50 MP + 50 MP';
      frontCam = '32 MP';
      battery = '5000 mAh, sạc nhanh 100W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('find x7 pro')) {
      cpu = 'Snapdragon 8 Gen 3';
      screen = '6.82 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 50 MP + 64 MP';
      frontCam = '32 MP';
      battery = '5000 mAh, sạc nhanh 100W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('find x7')) {
      cpu = 'Dimensity 9300';
      screen = '6.78 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 50 MP + 64 MP';
      frontCam = '32 MP';
      battery = '5000 mAh, sạc nhanh 100W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('reno 11 pro') || n.includes('reno11 pro')) {
      cpu = 'Dimensity 8200';
      screen = '6.7 inch, AMOLED, 120Hz';
      rearCam = '50 MP + 32 MP + 8 MP';
      frontCam = '32 MP';
      battery = '4600 mAh, sạc nhanh 80W';
      ram = '12 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('reno 11') || n.includes('reno11')) {
      cpu = 'Dimensity 7050';
      rearCam = '50 MP + 32 MP + 8 MP';
      frontCam = '32 MP';
      battery = '5000 mAh, sạc nhanh 67W';
      ram = '8 GB / 12 GB';
      storage = '256 GB';
    } else if (n.includes('reno 10 pro+')) {
      cpu = 'Snapdragon 8+ Gen 1';
      rearCam = '50 MP + 64 MP + 8 MP';
      frontCam = '32 MP';
      battery = '4700 mAh, sạc nhanh 100W';
      ram = '12 GB';
      storage = '256 GB';
    } else if (n.includes('reno 15 pro') || n.includes('reno15 pro')) {
      cpu = 'Dimensity 9300';
      screen = '6.74 inch, AMOLED, 120Hz';
      rearCam = '50 MP + 50 MP + 8 MP';
      frontCam = '50 MP';
      battery = '5600 mAh, sạc nhanh 80W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('reno 14 f') || n.includes('reno14 f')) {
      cpu = 'Snapdragon 7 Gen 3';
      screen = '6.7 inch, AMOLED, 120Hz';
      rearCam = '50 MP + 8 MP + 2 MP';
      frontCam = '32 MP';
      battery = '5000 mAh, sạc nhanh 67W';
      ram = '8 GB / 12 GB';
      storage = '256 GB';
    } else if (n.includes('a98')) {
      cpu = 'Snapdragon 695';
      screen = '6.72 inch, IPS LCD, 120Hz';
      rearCam = '64 MP + 2 MP + 2 MP';
      frontCam = '32 MP';
      battery = '5000 mAh, sạc nhanh 67W';
      ram = '8 GB';
      storage = '256 GB';
    }
  } else if (brand === 'OnePlus') {
    os = 'Android 14 (OxygenOS)';
    cpu = 'Snapdragon cao cấp';
    screen = '6.7 inch, AMOLED, 120Hz';
    rearCam = '50 MP + 48 MP + 64 MP';
    battery = '5400 mAh, sạc nhanh 100W';
    ram = '12 GB / 16 GB';
    storage = '256 GB / 512 GB';

    if (n.includes('ace 6')) {
      cpu = 'Snapdragon 8 Gen 4';
      screen = '6.78 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 8 MP + 2 MP';
      frontCam = '16 MP';
      battery = '6200 mAh, sạc nhanh 120W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('ace 5 ultra')) {
      cpu = 'Dimensity 9400';
      screen = '6.78 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 8 MP + 2 MP';
      frontCam = '16 MP';
      battery = '6100 mAh, sạc nhanh 120W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('ace 5 pro')) {
      cpu = 'Snapdragon 8 Elite';
      screen = '6.78 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 50 MP + 8 MP';
      frontCam = '16 MP';
      battery = '6100 mAh, sạc nhanh 100W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.includes('ace 5')) {
      cpu = 'Snapdragon 8 Gen 3';
      screen = '6.78 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 8 MP + 2 MP';
      frontCam = '16 MP';
      battery = '6000 mAh, sạc nhanh 100W';
      ram = '12 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('nord 5')) {
      cpu = 'Snapdragon 8s Gen 3';
      screen = '6.74 inch, AMOLED, 120Hz';
      rearCam = '50 MP + 8 MP + 2 MP';
      frontCam = '16 MP';
      battery = '5500 mAh, sạc nhanh 100W';
      ram = '8 GB / 12 GB';
      storage = '128 GB / 256 GB';
    } else if (n.includes('nord 4')) {
      cpu = 'Snapdragon 7+ Gen 3';
      screen = '6.74 inch, AMOLED, 120Hz';
      rearCam = '50 MP + 8 MP';
      frontCam = '16 MP';
      battery = '5500 mAh, sạc nhanh 100W';
      ram = '8 GB / 12 GB';
      storage = '128 GB / 256 GB';
    } else if (n.includes('13r')) {
      cpu = 'Snapdragon 8 Gen 3';
      screen = '6.78 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 8 MP + 2 MP';
      frontCam = '16 MP';
      battery = '6000 mAh, sạc nhanh 100W';
      ram = '12 GB';
      storage = '256 GB / 512 GB';
    } else if (n.match(/oneplus\s+13(\s|$)/)) {
      cpu = 'Snapdragon 8 Elite';
      screen = '6.82 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 50 MP + 50 MP';
      frontCam = '32 MP';
      battery = '6000 mAh, sạc nhanh 100W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.match(/oneplus\s+15(\s|$)/)) {
      cpu = 'Snapdragon 8 Elite';
      screen = '6.82 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 50 MP + 64 MP';
      frontCam = '32 MP';
      battery = '6200 mAh, sạc nhanh 120W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.includes('12r')) {
      cpu = 'Snapdragon 8 Gen 2';
      rearCam = '50 MP + 8 MP + 2 MP';
      battery = '5500 mAh, sạc nhanh 100W';
      ram = '8 GB / 16 GB';
      storage = '128 GB / 256 GB';
    } else if (n.includes('12')) {
      cpu = 'Snapdragon 8 Gen 3';
      screen = '6.82 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 48 MP + 64 MP';
      battery = '5400 mAh, sạc nhanh 100W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('open')) {
      cpu = 'Snapdragon 8 Gen 2';
      screen = '7.82 inch (chính) + 6.31 inch (phụ), LTPO AMOLED, 120Hz';
      rearCam = '48 MP + 64 MP + 48 MP';
      frontCam = '20 MP + 32 MP';
      battery = '4805 mAh, sạc nhanh 67W';
      ram = '16 GB';
      storage = '512 GB / 1 TB';
    } else if (n.includes('11r') || n.includes('ace 3')) {
      cpu = 'Snapdragon 8+ Gen 1';
      rearCam = '50 MP + 8 MP + 2 MP';
      battery = '5000 mAh, sạc nhanh 100W';
      ram = '8 GB / 16 GB';
      storage = '128 GB / 256 GB';
    } else if (n.includes('11')) {
      cpu = 'Snapdragon 8 Gen 2';
      rearCam = '50 MP + 48 MP + 32 MP';
      battery = '5000 mAh, sạc nhanh 100W';
      ram = '8 GB / 16 GB';
      storage = '128 GB / 256 GB';
    }
  } else if (brand === 'Vivo') {
    os = 'Android 14 (Funtouch OS / OriginOS)';
    cpu = 'Snapdragon / Dimensity';
    screen = '6.78 inch, AMOLED, 120Hz';
    rearCam = '50 MP + 50 MP + 64 MP';
    battery = '5000 mAh, sạc nhanh 80W';
    ram = '8 GB / 12 GB';
    storage = '256 GB / 512 GB';

    if (n.includes('x300 ultra')) {
      cpu = 'Snapdragon 8 Elite';
      screen = '6.82 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 50 MP + 200 MP + 50 MP';
      frontCam = '50 MP';
      battery = '6000 mAh, sạc nhanh 120W';
      ram = '16 GB';
      storage = '512 GB / 1 TB';
    } else if (n.includes('x300 pro mini')) {
      cpu = 'Dimensity 9500';
      screen = '6.31 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 50 MP + 50 MP';
      frontCam = '32 MP';
      battery = '5200 mAh, sạc nhanh 90W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('x300 pro')) {
      cpu = 'Dimensity 9500';
      rearCam = '50 MP + 50 MP + 200 MP';
      frontCam = '50 MP';
      battery = '5700 mAh, sạc nhanh 120W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.match(/x300(\s|$)/)) {
      cpu = 'Dimensity 9500';
      rearCam = '50 MP + 64 MP + 50 MP';
      frontCam = '32 MP';
      battery = '5500 mAh, sạc nhanh 100W';
      ram = '12 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('x200 ultra')) {
      cpu = 'Snapdragon 8 Elite';
      rearCam = '50 MP + 50 MP + 200 MP';
      frontCam = '50 MP';
      battery = '5500 mAh, sạc nhanh 100W';
      ram = '16 GB';
      storage = '512 GB / 1 TB';
    } else if (n.includes('x200 pro mini')) {
      cpu = 'Dimensity 9400';
      screen = '6.31 inch, LTPO AMOLED, 120Hz';
      rearCam = '50 MP + 50 MP + 50 MP';
      frontCam = '32 MP';
      battery = '5000 mAh, sạc nhanh 90W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('x200 pro')) {
      cpu = 'Dimensity 9400';
      rearCam = '50 MP + 50 MP + 200 MP';
      frontCam = '32 MP';
      battery = '5400 mAh, sạc nhanh 90W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.match(/x200(\s|$)/)) {
      cpu = 'Dimensity 9400';
      rearCam = '50 MP + 64 MP + 50 MP';
      frontCam = '32 MP';
      battery = '5000 mAh, sạc nhanh 90W';
      ram = '12 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('x100 ultra')) {
      cpu = 'Snapdragon 8 Gen 3';
      rearCam = '50 MP + 50 MP + 200 MP';
      frontCam = '50 MP';
      battery = '5500 mAh, sạc nhanh 80W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.includes('x100 pro')) {
      cpu = 'Dimensity 9300';
      rearCam = '50 MP + 50 MP + 50 MP';
      frontCam = '32 MP';
      battery = '5400 mAh, sạc nhanh 100W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB / 1 TB';
    } else if (n.includes('x100')) {
      cpu = 'Dimensity 9300';
      rearCam = '50 MP + 64 MP + 50 MP';
      frontCam = '32 MP';
      battery = '5000 mAh, sạc nhanh 120W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('x90 pro')) {
      cpu = 'Dimensity 9200';
      rearCam = '50 MP + 50 MP + 12 MP';
      frontCam = '32 MP';
      battery = '4870 mAh, sạc nhanh 120W';
      ram = '12 GB';
      storage = '256 GB';
    } else if (n.includes('v30 pro')) {
      cpu = 'Dimensity 8200';
      rearCam = '50 MP + 50 MP + 50 MP';
      frontCam = '50 MP';
      battery = '5000 mAh, sạc nhanh 80W';
      ram = '12 GB';
      storage = '512 GB';
    } else if (n.includes('v30')) {
      cpu = 'Snapdragon 7 Gen 3';
      rearCam = '50 MP + 50 MP';
      frontCam = '50 MP';
      battery = '5000 mAh, sạc nhanh 80W';
      ram = '8 GB / 12 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('y')) {
      cpu = 'Helio / Snapdragon tầm trung';
      screen = '6.6 inch, LCD/AMOLED, 90Hz';
      rearCam = '50 MP + 2 MP + 2 MP';
      frontCam = '8 MP / 16 MP';
      battery = '5000 mAh, sạc nhanh 44W';
      ram = '6 GB / 8 GB';
      storage = '128 GB / 256 GB';
    }
  } else if (brand === 'Asus') {
    os = 'Android 14';
    cpu = 'Snapdragon 8 Gen 3';
    screen = '6.78 inch, AMOLED, 165Hz';
    rearCam = '50 MP + 13 MP + 32 MP';
    frontCam = '32 MP';
    battery = '5500 mAh, sạc nhanh 65W';
    ram = '12 GB / 16 GB / 24 GB';
    storage = '256 GB / 512 GB / 1 TB';

    if (n.includes('rog phone 9 pro')) {
      cpu = 'Snapdragon 8 Elite';
      screen = '6.78 inch, AMOLED, 185Hz';
      rearCam = '50 MP + 13 MP + 32 MP';
      frontCam = '32 MP';
      battery = '5800 mAh, sạc nhanh 65W';
      ram = '16 GB / 24 GB';
      storage = '512 GB / 1 TB';
    } else if (n.includes('rog phone 9')) {
      cpu = 'Snapdragon 8 Elite';
      screen = '6.78 inch, AMOLED, 165Hz';
      rearCam = '50 MP + 13 MP + 32 MP';
      frontCam = '32 MP';
      battery = '5800 mAh, sạc nhanh 65W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('rog phone 8 pro')) {
      cpu = 'Snapdragon 8 Gen 3';
      screen = '6.78 inch, AMOLED, 165Hz';
      rearCam = '50 MP + 13 MP + 32 MP';
      frontCam = '32 MP';
      battery = '5500 mAh, sạc nhanh 65W';
      ram = '16 GB / 24 GB';
      storage = '512 GB / 1 TB';
    } else if (n.includes('rog phone 8')) {
      cpu = 'Snapdragon 8 Gen 3';
      screen = '6.78 inch, AMOLED, 165Hz';
      rearCam = '50 MP + 13 MP + 32 MP';
      frontCam = '32 MP';
      battery = '5500 mAh, sạc nhanh 65W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('rog phone 7 ultimate')) {
      cpu = 'Snapdragon 8 Gen 2';
      screen = '6.78 inch, AMOLED, 165Hz';
      rearCam = '50 MP + 13 MP + 5 MP';
      frontCam = '32 MP';
      battery = '6000 mAh, sạc nhanh 65W';
      ram = '16 GB';
      storage = '512 GB';
    } else if (n.includes('rog phone 7')) {
      cpu = 'Snapdragon 8 Gen 2';
      screen = '6.78 inch, AMOLED, 165Hz';
      rearCam = '50 MP + 13 MP + 5 MP';
      frontCam = '32 MP';
      battery = '6000 mAh, sạc nhanh 65W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('rog phone 6 pro')) {
      cpu = 'Snapdragon 8+ Gen 1';
      screen = '6.78 inch, AMOLED, 165Hz';
      rearCam = '50 MP + 13 MP + 5 MP';
      frontCam = '12 MP';
      battery = '6000 mAh, sạc nhanh 65W';
      ram = '18 GB';
      storage = '512 GB';
    } else if (n.includes('rog phone 6')) {
      cpu = 'Snapdragon 8+ Gen 1';
      screen = '6.78 inch, AMOLED, 165Hz';
      rearCam = '50 MP + 13 MP + 5 MP';
      frontCam = '12 MP';
      battery = '6000 mAh, sạc nhanh 65W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('zenfone 11 ultra')) {
      screen = '6.78 inch, LTPO AMOLED, 144Hz';
      rearCam = '50 MP + 13 MP + 32 MP';
      battery = '5500 mAh, sạc nhanh 65W';
      ram = '12 GB / 16 GB';
      storage = '256 GB / 512 GB';
    } else if (n.includes('zenfone 10')) {
      cpu = 'Snapdragon 8 Gen 2';
      screen = '5.9 inch, AMOLED, 144Hz';
      rearCam = '50 MP + 13 MP';
      frontCam = '32 MP';
      battery = '4300 mAh, sạc nhanh 30W';
      ram = '8 GB / 16 GB';
      storage = '128 GB / 256 GB / 512 GB';
    } else if (n.includes('zenfone 9')) {
      cpu = 'Snapdragon 8+ Gen 1';
      screen = '5.9 inch, AMOLED, 120Hz';
      rearCam = '50 MP + 12 MP';
      frontCam = '12 MP';
      battery = '4300 mAh, sạc nhanh 30W';
      ram = '8 GB / 16 GB';
      storage = '128 GB / 256 GB';
    } else if (n.includes('zenfone 8')) {
      cpu = 'Snapdragon 888';
      screen = '5.9 inch, AMOLED, 120Hz';
      rearCam = '64 MP + 12 MP';
      frontCam = '12 MP';
      battery = '4000 mAh, sạc nhanh 30W';
      ram = '8 GB / 16 GB';
      storage = '128 GB / 256 GB';
    }
  } else if (brand === 'Red Magic') {
    os = 'Android 14 (REDMAGIC OS)';
    cpu = 'Snapdragon 8 series';
    screen = '6.8 inch, AMOLED, 165Hz';
    rearCam = '50 MP + 50 MP + 2 MP';
    frontCam = '16 MP (UDC)';
    battery = '6500 mAh, sạc nhanh 80W';
    ram = '12 GB / 16 GB / 24 GB';
    storage = '256 GB / 512 GB / 1 TB';

    if (n.includes('9 pro+')) {
      cpu = 'Snapdragon 8 Gen 3';
      battery = '5500 mAh, sạc nhanh 165W';
    } else if (n.includes('9 pro')) {
      cpu = 'Snapdragon 8 Gen 3';
      battery = '6500 mAh, sạc nhanh 80W';
    } else if (n.includes('8s pro') || n.includes('8 pro')) {
      cpu = 'Snapdragon 8 Gen 2';
      battery = '6000 mAh, sạc nhanh 80W';
      screen = '6.8 inch, AMOLED, 120Hz';
    } else if (n.includes('7s pro') || n.includes('7 pro') || n.includes('7')) {
      cpu = 'Snapdragon 8 Gen 1 / 8+ Gen 1';
      battery = '5000 mAh, sạc nhanh 135W';
      screen = '6.8 inch, AMOLED, 120Hz';
    } else if (n.includes('6s pro') || n.includes('6 pro') || n.includes('6')) {
      cpu = 'Snapdragon 888 / 8 Gen 1';
      battery = '5050 mAh, sạc nhanh 66W';
      screen = '6.8 inch, AMOLED, 165Hz';
    }
  }

  return [
    { label: 'Màn hình', value: screen },
    { label: 'Hệ điều hành', value: os },
    { label: 'CPU', value: cpu },
    { label: 'RAM', value: ram },
    { label: 'Bộ nhớ trong', value: storage },
    { label: 'Camera sau', value: rearCam },
    { label: 'Camera trước', value: frontCam },
    { label: 'Dung lượng pin', value: battery },
    { label: 'Thẻ SIM', value: sim },
    { label: 'Kết nối', value: connectivity },
  ];
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function isDescriptionMatchingProduct(productName: string, descriptionText: string): boolean {
  const normalizedName = productName.toLowerCase();
  const normalizedDesc = descriptionText.toLowerCase();
  if (!normalizedDesc) return false;
  if (normalizedDesc.includes(normalizedName)) return true;
  
  const requiredTokens = normalizedName.split(/\s+/).map(t => t.replace(/[^a-z0-9]/g, '')).filter(t => t.length >= 2 || /\d/.test(t));
  if (requiredTokens.length === 0) return false;
  
  const matched = requiredTokens.filter(t => normalizedDesc.includes(t)).length;
  // Yêu cầu khớp gần hết các ký tự để tránh nhầm model cùng dòng xe máy/điện thoại (vd: Redmi K70 so với Redmi Note 13)
  const threshold = requiredTokens.length <= 2 ? requiredTokens.length : requiredTokens.length - 1;
  return matched >= threshold;
}

function buildAccurateShortDescription(product: Product, displayPrice: string, inStock: boolean): string {
  const { brand } = detectBrandModel(product.name);
  return `<p>${product.name} là mẫu ${brand} chính hãng với thiết kế hiện đại, hiệu năng ổn định và trải nghiệm sử dụng mượt mà.</p>
<p>Giá tham khảo: <strong>${displayPrice}</strong>. Tình trạng: <strong>${inStock ? 'Còn hàng' : 'Hết hàng'}</strong>.</p>`;
}

function buildAccurateFullDescription(product: Product, displayPrice: string, inStock: boolean): string {
  const { brand } = detectBrandModel(product.name);
  const categoryName = product.categories?.[0]?.name || 'Điện thoại';
  const updatedAt = product.updated_at ? new Date(product.updated_at).toLocaleDateString('vi-VN') : 'Mới nhất';

  return `<p><strong>${product.name}</strong> thuộc danh mục ${categoryName}, là điện thoại ${brand} tiêu chuẩn.</p>
<ul>
  <li><strong>Tên sản phẩm:</strong> ${product.name}</li>
  <li><strong>Mã SKU:</strong> ${product.sku}</li>
  <li><strong>Giá bán:</strong> ${displayPrice}</li>
  <li><strong>Trạng thái:</strong> ${inStock ? 'Còn hàng' : 'Hết hàng'}</li>
  <li><strong>Cập nhật lúc:</strong> ${updatedAt}</li>
</ul>
<p>Sản phẩm này đảm bảo hiệu năng phục vụ tối đa trải nghiệm liên lạc, giải trí và công việc hàng ngày của bạn.</p>`;
}

function normalizeCategoryText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isAccessoryOrAudioProduct(product: Product): boolean {
  const categoryText = (product.categories || []).map((cat) => `${cat.name} ${cat.url_key || ''}`).join(' ');
  const normalized = normalizeCategoryText(`${categoryText} ${product.name}`);
  return normalized.includes('tai nghe') || normalized.includes('phu kien');
}

function buildGeneralIntro(product: Product, displayPrice: string, inStock: boolean): string {
  const categoryName = product.categories?.[0]?.name || 'sản phẩm';
  return `<p><strong>${product.name}</strong> là ${categoryName.toLowerCase()} chính hãng với thiết kế hoàn thiện tốt, dễ sử dụng và phù hợp nhu cầu hằng ngày.</p>
<p>Sản phẩm được phân phối với mức giá tham khảo <strong>${displayPrice}</strong> và hiện đang <strong>${inStock ? 'còn hàng' : 'hết hàng'}</strong>.</p>
<p>Nếu cần tư vấn phiên bản phù hợp hoặc chính sách bảo hành/đổi trả, bạn có thể liên hệ trực tiếp để được hỗ trợ nhanh.</p>`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface ProductDetailClientProps {
  slug: string;
  brand?: string;
}

export default function ProductDetailClient({ slug, brand: requestedBrand }: ProductDetailClientProps) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [showSpecsModal, setShowSpecsModal] = useState(false);
  const [loadingMobileSpecs, setLoadingMobileSpecs] = useState(false);
  const [mobileCitySpecs, setMobileCitySpecs] = useState<SpecRow[] | null>(null);
  const [mobileCityDetailSpecs, setMobileCityDetailSpecs] = useState<SpecRow[] | null>(null);
  const [mobileCitySourceUrl, setMobileCitySourceUrl] = useState<string | null>(null);
  const [mobileCityError, setMobileCityError] = useState<string | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const requestedPath = requestedBrand ? `/${requestedBrand}/${slug}` : `/product/${slug}`;

  useEffect(() => {
    setMobileCitySpecs(null);
    setMobileCityDetailSpecs(null);
    setMobileCitySourceUrl(null);
    setMobileCityError(null);
    setShowSpecsModal(false);
    loadProduct();
    return () => { requestControllerRef.current?.abort(); };
  }, [slug]);

  // Auto-load MobileCity specs as soon as product is available
  useEffect(() => {
    if (product && !isAccessoryOrAudioProduct(product)) {
      void loadMobileCitySpecs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  // Redirect legacy /product/:slug and mismatched brand paths to canonical product URL.
  useEffect(() => {
    if (!product) return;
    const canonicalPath = buildProductPath(product);
    if (requestedPath !== canonicalPath) {
      router.replace(canonicalPath);
    }
  }, [product, requestedPath, router]);

  const loadProduct = async () => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    setLoading(true);
    setProduct(null);
    try {
      const byUrlKey = await graphqlClient<{ products: { items: Product[] } }>({
        query: GET_PRODUCT_BY_URL_KEY,
        variables: { urlKey: slug },
        cache: 'default',
        ttlMs: 15 * 1000,
        signal: controller.signal,
      });

      if (byUrlKey.products.items.length > 0) {
        setProduct(byUrlKey.products.items[0]);
        return;
      }

      const bySku = await graphqlClient<{ products: { items: Product[] } }>({
        query: GET_PRODUCT_DETAIL,
        variables: { sku: slug },
        cache: 'default',
        ttlMs: 15 * 1000,
        signal: controller.signal,
      });

      if (bySku.products.items.length > 0) {
        setProduct(bySku.products.items[0]);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Failed to load product:', error);
    } finally {
      if (requestControllerRef.current === controller) setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    const productUrl = product ? buildProductPath(product) : requestedPath;
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(productUrl)}`);
      return;
    }
    setAdding(true);
    try {
      await addToCart(product.sku, quantity);
      alert('Đã thêm vào giỏ hàng!');
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (message.includes('auth_required') || message.includes('unauthorized') || message.includes('customer token')) {
        router.push(`/login?redirect=${encodeURIComponent(productUrl)}`);
        return;
      }
      alert('Không thể thêm sản phẩm vào giỏ hàng');
    } finally {
      setAdding(false);
    }
  };

  const loadMobileCitySpecs = async () => {
    if (!product?.name) return;
    if (isAccessoryOrAudioProduct(product)) return;
    if (loadingMobileSpecs) return;
    if ((mobileCitySpecs && mobileCitySpecs.length > 0) || (mobileCityDetailSpecs && mobileCityDetailSpecs.length > 0)) return;

    setLoadingMobileSpecs(true);
    setMobileCityError(null);
    try {
      const query = new URLSearchParams({
        name: product.name,
        sku: product.sku || '',
      });
      const response = await fetch(`/api/mobilecity-specs?${query.toString()}`);
      const data: MobileCitySpecsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Không thể tải thông số từ MobileCity');
      }

      setMobileCitySourceUrl(data.sourceUrl);
      setMobileCityDetailSpecs(data.detailSpecs || []);
      if (data.specs && data.specs.length > 0) {
        setMobileCitySpecs(data.specs);
      } else {
        setMobileCitySpecs([]);
      }
    } catch {
      setMobileCitySpecs([]);
      setMobileCityDetailSpecs([]);
    } finally {
      setLoadingMobileSpecs(false);
    }
  };

  // ---- Loading skeleton ----
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
                <div className="h-12 bg-gray-200 rounded" />
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
        <div className="container-custom text-center py-20">
          <h1 className="text-2xl font-bold mb-4">Không tìm thấy sản phẩm</h1>
          <p className="text-gray-600">Sản phẩm bạn tìm không tồn tại hoặc đã bị xóa.</p>
        </div>
      </div>
    );
  }

  const price = product.price_range.minimum_price.regular_price;
  const formattedPrice = formatPrice(price.value, price.currency);
  const inStock = product.stock_status !== 'OUT_OF_STOCK';
  const isAccessoryProduct = isAccessoryOrAudioProduct(product);
  const generatedSpecs = isAccessoryProduct ? [] : generateSpecs(product);
  const specs = isAccessoryProduct ? [] : (mobileCitySpecs && mobileCitySpecs.length > 0 ? mobileCitySpecs : generatedSpecs);
  const modalSpecs =
    isAccessoryProduct
      ? []
      : (mobileCityDetailSpecs && mobileCityDetailSpecs.length > 0
        ? mobileCityDetailSpecs
        : (mobileCitySpecs && mobileCitySpecs.length > 0 ? mobileCitySpecs : generatedSpecs));

  const rawShortDescription = product.short_description?.html || '';
  const rawFullDescription = product.description?.html || '';
  const trustedShortDescription = isDescriptionMatchingProduct(product.name, stripHtml(rawShortDescription));
  const trustedFullDescription = isDescriptionMatchingProduct(product.name, stripHtml(rawFullDescription));
  
  const shortDescriptionHtml = trustedShortDescription ? rawShortDescription : buildAccurateShortDescription(product, formattedPrice, inStock);
  const fullDescriptionHtml = trustedFullDescription ? rawFullDescription : buildAccurateFullDescription(product, formattedPrice, inStock);
  const generalIntroHtml = trustedShortDescription ? rawShortDescription : buildGeneralIntro(product, formattedPrice, inStock);

  // Build gallery from media_gallery + fallback to image
  const gallery: string[] = (product.media_gallery || [])
    .filter(m => m?.url && !m.disabled)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map(m => withImageVersion(m.url, product.updated_at));

  if (gallery.length === 0) {
    gallery.push(getPrimaryProductImageUrl(product));
  }

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const t = e.currentTarget;
    if (!t.src.endsWith('/images/placeholder.svg')) t.src = '/images/placeholder.svg';
  };

  const { brand: detectedBrand } = detectBrandModel(product.name);

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container-custom">

        {/* ── Top: Image + Info ── */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="grid md:grid-cols-2 gap-0">

            {/* Image gallery */}
            <div className="p-6 border-r border-gray-100">
              {/* Main image */}
              <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
                <img
                  src={gallery[activeImage] || '/images/placeholder.svg'}
                  alt={product.name}
                  className="w-full h-full object-contain p-4"
                  onError={handleImgError}
                />
              </div>

              {/* Thumbnails */}
              {gallery.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {gallery.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(idx)}
                      className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                        activeImage === idx ? 'border-primary-500' : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-contain p-1" onError={handleImgError} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product info */}
            <div className="p-6 flex flex-col">
              {/* Brand badge */}
              <span className="inline-block text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded mb-2 self-start">
                {detectedBrand}
              </span>

              <h1 className="text-2xl font-bold text-gray-900 mb-3">{product.name}</h1>

              {/* Stock status */}
              <div className="flex items-center gap-2 mb-4">
                <span className={`inline-flex items-center gap-1 text-sm font-medium ${inStock ? 'text-green-600' : 'text-red-600'}`}>
                  <span className={`w-2 h-2 rounded-full ${inStock ? 'bg-green-500' : 'bg-red-500'}`} />
                  {inStock ? 'Còn hàng' : 'Hết hàng'}
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-500">SKU: {product.sku}</span>
              </div>

              {/* Price */}
              <div className="bg-red-50 rounded-lg px-4 py-3 mb-5">
                <p className="text-3xl font-bold text-red-600">{formattedPrice}</p>
                <p className="text-xs text-gray-500 mt-0.5">Giá đã bao gồm VAT</p>
              </div>

              {/* Short description */}
              {shortDescriptionHtml && (
                <div
                  className="text-sm text-gray-600 mb-4 leading-relaxed line-clamp-3"
                  dangerouslySetInnerHTML={{ __html: shortDescriptionHtml }}
                />
              )}

              {/* Quantity */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Số lượng</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-9 h-9 border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-50 text-lg font-medium"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={e => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-16 text-center border border-gray-300 rounded-md px-2 py-2 text-sm"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-9 h-9 border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-50 text-lg font-medium"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Buy button */}
              <div className="mt-auto space-y-2">
                <Button fullWidth size="lg" onClick={handleAddToCart} disabled={!inStock} loading={adding}>
                  {inStock
                    ? (isAuthenticated ? '🛒 Thêm vào giỏ hàng' : '🔐 Đăng nhập để mua')
                    : 'Hết hàng'}
                </Button>
                {!isAuthenticated && inStock && (
                  <p className="text-xs text-center text-gray-500">Bạn cần đăng nhập để mua hàng</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom: Spec Table + Description ── */}
        <div className="grid md:grid-cols-3 gap-6">

          {/* Spec Table — 2/3 width */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">
                  {isAccessoryProduct ? '📌 Giới thiệu chung' : '📋 Thông số kỹ thuật'}
                </h2>
              </div>
              {isAccessoryProduct ? (
                <div className="px-6 py-5">
                  <div
                    className="prose max-w-none text-gray-700 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: generalIntroHtml }}
                  />
                </div>
              ) : (
                <>
                  {loadingMobileSpecs ? (
                    <div className="px-6 py-8 flex flex-col items-center gap-3 text-gray-500">
                      <svg className="animate-spin h-6 w-6 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      <span className="text-sm">Đang tải thông số kỹ thuật...</span>
                    </div>
                  ) : (
                  <table className="w-full text-sm">
                    <tbody>
                      {specs.map((row, i) => (
                        <tr key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-3 font-medium text-gray-700 w-44 align-top whitespace-nowrap">
                            {row.label}
                          </td>
                          <td className="px-6 py-3 text-gray-800 leading-relaxed">{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  )}
                  <div className="px-6 pb-5 pt-3">
                    <button
                      onClick={() => {
                        setShowSpecsModal(true);
                        void loadMobileCitySpecs();
                      }}
                      className="w-full md:w-auto inline-flex items-center justify-center rounded-lg border border-primary-600 text-primary-700 px-4 py-2 text-sm font-semibold hover:bg-primary-50 transition-colors"
                    >
                      Xem thêm chi tiết
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sidebar: Category + Warranty info — 1/3 width */}
          <div className="space-y-4">
            {/* Category */}
            {product.categories && product.categories.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Danh mục</h3>
                <div className="flex flex-wrap gap-2">
                  {product.categories.map(cat => (
                    <span key={cat.id} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {cat.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Warranty & benefits */}
            <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">🎁 Ưu đãi khi mua</h3>
              {[
                { icon: '✅', text: 'Hàng chính hãng 100%' },
                { icon: '🛡️', text: 'Bảo hành 12 tháng' },
                { icon: '🔄', text: 'Đổi trả trong 7 ngày' },
                { icon: '🚚', text: 'Giao hàng miễn phí' },
                { icon: '💳', text: 'Hỗ trợ trả góp 0%' },
              ].map(item => (
                <div key={item.text} className="flex items-center gap-2 text-sm text-gray-700">
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>

            {/* Hotline */}
            <div className="bg-primary-600 rounded-xl p-5 text-white text-center">
              <p className="text-xs mb-1">Tư vấn mua hàng</p>
              <p className="text-xl font-bold tracking-wide">0918 317 083</p>
              <p className="text-xs mt-1 opacity-80">Thứ 2 – Chủ nhật: 8:00 – 21:00</p>
            </div>
          </div>
        </div>



      </div>

      {showSpecsModal && !isAccessoryProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 overflow-y-auto">
          <button
            onClick={() => setShowSpecsModal(false)}
            className="fixed top-4 right-4 z-[60] w-9 h-9 rounded-full bg-amber-600 text-white font-bold hover:bg-amber-700 flex items-center justify-center shadow-lg"
            aria-label="Dong thong so"
          >
            ✕
          </button>
          <div className="mx-auto w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-amber-200 my-8 mx-4 sm:mx-auto">
            <div className="px-5 py-4 border-b border-amber-200 bg-amber-50">
              <h3 className="text-lg font-bold text-amber-900">{product.name} - Thông số chi tiết</h3>
            </div>

            <div className="p-4 sm:p-6">
              {loadingMobileSpecs && (
                <div className="text-sm text-gray-600 mb-4">Dang tai thong so tu MobileCity...</div>
              )}

              {mobileCityError && (
                <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  {mobileCityError}
                </div>
              )}

              {modalSpecs.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <tbody>
                      {modalSpecs.map((row, i) => {
                        if (row.isSection) {
                          return (
                            <tr key={`${row.label}-${i}`} className="bg-amber-600">
                              <td colSpan={2} className="px-4 py-2 font-bold text-white uppercase tracking-wide text-xs">
                                {row.label}
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={`${row.label}-${i}`} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 w-44 font-semibold text-gray-800 align-top">{row.label}:</td>
                            <td className="px-4 py-3 text-gray-700 whitespace-pre-line">{row.value}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                !loadingMobileSpecs && !mobileCityError && (
                  <div className="text-sm text-gray-600 border border-gray-200 rounded-lg px-4 py-3">
                    Chua co du lieu thong so chi tiet tu MobileCity cho san pham nay.
                  </div>
                )
              )}


            </div>
          </div>
        </div>
      )}
    </div>
  );
}
