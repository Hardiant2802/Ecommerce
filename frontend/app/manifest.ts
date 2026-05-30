import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AH Phone Store',
    short_name: 'AH Phone',
    description: 'Mua bán điện thoại chính hãng giá tốt nhất',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff',
    theme_color: '#0284c7',
    icons: [
      {
        src: '/images/placeholder.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
