# Team Development Guide

## Getting Started

### For New Team Members

1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Copy environment file**: `cp .env.example .env.local`
4. **Update `.env.local`** with your local Magento URL
5. **Start dev server**: `npm run dev`

## Code Standards

### TypeScript

- Use TypeScript for all new files
- Define proper interfaces/types
- Avoid `any` type - use `unknown` if type is truly unknown

### Component Structure

```typescript
// Good component structure
interface ComponentProps {
  title: string;
  onClick?: () => void;
}

export default function Component({ title, onClick }: ComponentProps) {
  // Component logic
  return <div>{title}</div>;
}
```

### File Organization

- One component per file
- Use named exports for utilities, default for components
- Group related files in folders

### Naming Conventions

- **Components**: PascalCase (`ProductCard.tsx`)
- **Utilities**: camelCase (`formatPrice.ts`)
- **Types**: PascalCase (`Product`, `CartItem`)
- **Constants**: UPPER_SNAKE_CASE (`API_URL`)

## Git Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates

Examples:
- `feature/product-reviews`
- `fix/cart-total-calculation`
- `refactor/auth-context`

### Commit Messages

Follow conventional commits:

```
type(scope): description

feat(cart): add quantity update functionality
fix(auth): resolve token expiration issue
docs(readme): update installation steps
refactor(products): optimize product loading
```

### Pull Request Process

1. Create feature branch from `main`
2. Make changes and commit
3. Push branch and create PR
4. Request review from team members
5. Address feedback
6. Merge after approval

## Component Development

### Creating New Components

1. Create file in appropriate directory:
   - UI components → `components/ui/`
   - Product components → `components/product/`
   - Layout components → `components/layout/`

2. Define TypeScript interface for props

3. Export component as default

4. Add to index file if creating component library

### Example:

```typescript
// components/product/ProductBadge.tsx
interface ProductBadgeProps {
  text: string;
  variant: 'new' | 'sale' | 'featured';
}

export default function ProductBadge({ text, variant }: ProductBadgeProps) {
  const colors = {
    new: 'bg-blue-500',
    sale: 'bg-red-500',
    featured: 'bg-green-500',
  };

  return (
    <span className={`${colors[variant]} text-white px-2 py-1 rounded`}>
      {text}
    </span>
  );
}
```

## GraphQL Development

### Adding New Queries

1. Create query in `lib/graphql/queries/[category].ts`
2. Use template literals for query definition
3. Add TypeScript types for response
4. Test query in GraphQL playground first

### Example:

```typescript
// lib/graphql/queries/reviews.ts
export const GET_PRODUCT_REVIEWS = `
  query GetProductReviews($sku: String!) {
    products(filter: { sku: { eq: $sku } }) {
      items {
        reviews {
          items {
            average_rating
            nickname
            summary
            text
          }
        }
      }
    }
  }
`;
```

## State Management

### When to Use Context

- Global state (auth, cart)
- Data needed by many components
- State that needs persistence

### When to Use Local State

- Component-specific state
- UI state (modals, dropdowns)
- Form inputs

### Example Context:

```typescript
// context/WishlistContext.tsx
'use client';

import { createContext, useContext, useState } from 'react';

interface WishlistContextType {
  items: string[];
  addItem: (sku: string) => void;
  removeItem: (sku: string) => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<string[]>([]);

  const addItem = (sku: string) => {
    setItems(prev => [...prev, sku]);
  };

  const removeItem = (sku: string) => {
    setItems(prev => prev.filter(item => item !== sku));
  };

  return (
    <WishlistContext.Provider value={{ items, addItem, removeItem }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider');
  return context;
}
```

## Testing Checklist

Before creating a PR:

- [ ] Code builds without errors (`npm run build`)
- [ ] TypeScript checks pass (`npm run type-check`)
- [ ] No linting errors (`npm run lint`)
- [ ] Tested on mobile viewport
- [ ] Tested in Chrome and Firefox
- [ ] No console errors
- [ ] Environment variables documented

## Common Tasks

### Adding a New Page

1. Create folder in `app/` directory
2. Add `page.tsx` for route
3. Optional: Add `layout.tsx` for shared layout
4. Add to navigation if needed

### Adding a New API Call

1. Create GraphQL query in `lib/graphql/queries/`
2. Define TypeScript types in `types/`
3. Use `graphqlClient` helper for fetching
4. Handle loading and error states

### Styling Components

- Use Tailwind utility classes
- Follow mobile-first approach
- Use defined color palette (primary, secondary)
- Add hover/focus states for interactive elements

## Debugging Tips

### GraphQL Issues

1. Check browser Network tab for GraphQL requests
2. Verify query syntax in GraphQL playground
3. Check Magento backend logs
4. Ensure proper authentication headers

### Build Issues

```bash
# Clear all caches
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

### Type Errors

- Check type definitions in `types/` directory
- Ensure GraphQL response matches TypeScript interface
- Use TypeScript hover in VS Code for type info

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Magento GraphQL](https://developer.adobe.com/commerce/webapi/graphql/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Questions?

- Check existing code for examples
- Ask in team chat
- Create a draft PR for early feedback
