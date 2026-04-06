# Mobile Phone Store - Next.js Frontend

A modern, production-ready ecommerce frontend for a mobile phone store built with Next.js 15 and Magento 2 GraphQL backend.

## 🚀 Features

- **Modern Tech Stack**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Headless Architecture**: Magento 2 GraphQL API integration
- **Responsive Design**: Mobile-first, optimized for all devices
- **Product Catalog**: Browse, filter, and sort products by category and price
- **Shopping Cart**: Add to cart, update quantities, remove items
- **User Authentication**: Register, login, and protected routes
- **SEO Optimized**: Next.js metadata, semantic HTML
- **Performance**: Image optimization, code splitting, lazy loading
- **State Management**: React Context API with localStorage persistence
- **Type Safety**: Full TypeScript coverage

## 📦 Project Structure

```
frontend/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth route group
│   ├── products/            # Product listing
│   ├── product/[slug]/      # Product detail
│   ├── cart/                # Shopping cart
│   ├── login/               # Login page
│   ├── register/            # Register page
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   └── globals.css          # Global styles
├── components/              # Reusable components
│   ├── layout/             # Navbar, Footer
│   ├── product/            # ProductCard, ProductGrid
│   ├── cart/               # CartItem, CartSummary
│   └── ui/                 # Button, Input, Card
├── lib/                     # Core utilities
│   ├── graphql/            # GraphQL client & queries
│   ├── utils/              # Helper functions
│   └── hooks/              # Custom React hooks
├── context/                 # React Context providers
│   ├── CartContext.tsx
│   └── AuthContext.tsx
├── types/                   # TypeScript definitions
└── constants/              # App constants
```

## 🛠️ Installation

### Prerequisites

- Node.js 18+ and npm
- Magento 2.4+ backend running (with GraphQL enabled)

### Setup

1. **Clone and navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   ```

4. **Update `.env.local` with your Magento backend URL**:
   ```env
   NEXT_PUBLIC_MAGENTO_GRAPHQL_URL=http://localhost/graphql
   NEXT_PUBLIC_MAGENTO_API_URL=http://localhost
   NEXT_PUBLIC_MAGENTO_STORE_CODE=default
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   NEXT_PUBLIC_SITE_NAME=Mobile Phone Store
   ```

5. **Run development server**:
   ```bash
   npm run dev
   ```

6. **Open browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Check TypeScript types

## 🔌 Magento 2 Backend Setup

### GraphQL Endpoint

Ensure your Magento 2 backend has GraphQL enabled at:
```
http://your-magento-url/graphql
```

### Required Magento Configuration

1. **Enable CORS** (if frontend and backend are on different domains):
   - Configure CORS headers in Magento
   - Or use a reverse proxy

2. **Store Configuration**:
   - Ensure store code matches `NEXT_PUBLIC_MAGENTO_STORE_CODE`
   - Configure base URLs

3. **GraphQL**:
   - Magento 2.4+ has GraphQL enabled by default
   - Test with: `http://your-magento-url/graphql`

## 📚 Key GraphQL Queries

### Products
```graphql
query GetProducts($pageSize: Int, $currentPage: Int, $filter: ProductAttributeFilterInput) {
  products(pageSize: $pageSize, currentPage: $currentPage, filter: $filter) {
    items {
      id
      sku
      name
      price_range { ... }
      small_image { url label }
    }
  }
}
```

### Cart Operations
```graphql
mutation CreateEmptyCart {
  createEmptyCart
}

mutation AddToCart($cartId: String!, $cartItems: [CartItemInput!]!) {
  addProductsToCart(cart_id: $cartId, cart_items: $cartItems) {
    cart { ... }
  }
}
```

### Authentication
```graphql
mutation GenerateCustomerToken($email: String!, $password: String!) {
  generateCustomerToken(email: $email, password: $password) {
    token
  }
}
```

## 🎨 Customization

### Tailwind Theme

Edit `tailwind.config.ts` to customize colors, fonts, etc.:

```typescript
theme: {
  extend: {
    colors: {
      primary: { ... }
    }
  }
}
```

### Categories

Update categories in `constants/categories.ts`:

```typescript
export const CATEGORIES = [
  { id: '3', name: 'iPhone', slug: 'iphone', ... },
  // Add more categories
];
```

## 🚢 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

### Docker

```bash
docker build -t mobile-store .
docker run -p 3000:3000 mobile-store
```

### Traditional Hosting

```bash
npm run build
npm run start
```

## 🧪 Testing

### Test with Mock Data

If Magento backend is not available, you can:
1. Update GraphQL client to use mock data
2. Create mock responses in `lib/graphql/mocks.ts`

### Integration Testing

Ensure Magento backend is running and accessible before testing full integration.

## 🔐 Security

- **Environment Variables**: Never commit `.env.local`
- **Authentication**: Tokens stored in localStorage (consider httpOnly cookies for production)
- **Input Validation**: All forms include client-side validation
- **CORS**: Configure properly for production

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 👥 Team Collaboration

### Code Organization

- **Components**: One component per file
- **Naming**: PascalCase for components, camelCase for utilities
- **Types**: Define in `types/` directory
- **Hooks**: Custom hooks in `lib/hooks/`

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/product-reviews

# Make changes and commit
git add .
git commit -m "Add product reviews feature"

# Push and create PR
git push origin feature/product-reviews
```

## 🐛 Troubleshooting

### CORS Errors

If you see CORS errors:
1. Check Magento CORS configuration
2. Ensure backend URL is correct in `.env.local`
3. Consider using a proxy in development

### GraphQL Errors

- Check Magento GraphQL endpoint is accessible
- Verify GraphQL query syntax
- Check browser console for detailed errors

### Build Errors

```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📧 Support

For issues and questions:
- Open a GitHub issue
- Contact: support@mobilestore.com

---

**Built with ❤️ using Next.js and Magento 2**
