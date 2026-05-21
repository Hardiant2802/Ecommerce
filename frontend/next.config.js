/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['ahphonestore.id.vn', 'www.ahphonestore.id.vn'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'magento.test',
      },
      {
        protocol: 'http',
        hostname: 'magento.test',
      },
      {
        protocol: 'https',
        hostname: '*.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'ahphonestore.id.vn',
      },
      {
        protocol: 'https',
        hostname: 'www.ahphonestore.id.vn',
      },
    ],
  },
  env: {
    MAGENTO_GRAPHQL_URL: process.env.NEXT_PUBLIC_MAGENTO_GRAPHQL_URL,
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/admin/:path*',
          destination: 'http://app:8000/admin/:path*',
        },
        {
          source: '/static/:path*',
          destination: 'http://app:8000/static/:path*',
        },
        {
          source: '/media/:path*',
          destination: 'http://app:8000/media/:path*',
        },
      ],
    };
  },
};

module.exports = nextConfig;
