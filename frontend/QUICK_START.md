# 🚀 Quick Start Guide

Get your mobile phone store running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- Magento 2.4+ backend running (optional for UI preview)

## Step 1: Install Dependencies

```bash
cd frontend
npm install
```

⏱️ Takes about 1-2 minutes

## Step 2: Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_MAGENTO_GRAPHQL_URL=http://localhost/graphql
NEXT_PUBLIC_MAGENTO_API_URL=http://localhost
```

## Step 3: Start Development Server

```bash
npm run dev
```

## Step 4: Open in Browser

Navigate to: **http://localhost:3000**

## 🎉 You're Done!

### What You'll See:

✅ **Home Page** - Hero banner and categories  
✅ **Products Page** - Product grid (empty if Magento not connected)  
✅ **Cart** - Shopping cart functionality  
✅ **Login/Register** - Authentication pages

## 📝 Next Steps

### Without Magento Backend

The UI will work but show placeholder data. You can:
- Browse the interface
- Test navigation
- Review code structure
- Customize styling

### With Magento Backend

1. Ensure Magento is running at configured URL
2. Create test products in Magento admin
3. Create categories (iPhone, Samsung, Xiaomi)
4. Test full functionality:
   - Browse products
   - Add to cart
   - Login/Register
   - Complete purchases

## 🔧 Troubleshooting

### Port 3000 Already in Use?

```bash
# Use different port
npm run dev -- -p 3001
```

### CORS Errors?

Configure CORS in your Magento backend or use a proxy.

### Build Errors?

```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install
npm run dev
```

## 📚 Learn More

- **Full Documentation**: See `README.md`
- **Team Guide**: See `DEVELOPMENT.md`
- **GraphQL Examples**: See `GRAPHQL_EXAMPLES.md`
- **Project Summary**: See `PROJECT_SUMMARY.md`

## 🎯 Key Files to Customize

1. **Brand Colors**: `tailwind.config.ts`
2. **Categories**: `constants/categories.ts`
3. **Site Name**: `.env.local`
4. **Homepage Content**: `app/page.tsx`

## 💡 Tips

- Use VS Code for best TypeScript experience
- Install Tailwind CSS IntelliSense extension
- Check browser console for helpful error messages
- Test mobile view using browser dev tools

---

**Need Help?** Check the documentation or contact the team!
