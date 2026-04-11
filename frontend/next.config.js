/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ],
  },
  env: {
    MAGENTO_GRAPHQL_URL: process.env.NEXT_PUBLIC_MAGENTO_GRAPHQL_URL,
  },
};

module.exports = nextConfig;
