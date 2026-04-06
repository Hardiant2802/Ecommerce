# Magento GraphQL Examples

## Testing Queries

You can test these queries in your Magento GraphQL playground at:
`http://your-magento-url/graphql`

## Products

### Get All Products

```graphql
query {
  products(pageSize: 10) {
    items {
      id
      sku
      name
      price_range {
        minimum_price {
          regular_price {
            value
            currency
          }
        }
      }
      small_image {
        url
        label
      }
    }
    total_count
  }
}
```

### Get Products by Category

```graphql
query GetProductsByCategory {
  products(
    filter: { category_url_key: { eq: "iphone" } }
    pageSize: 12
  ) {
    items {
      id
      sku
      name
      url_key
      price_range {
        minimum_price {
          regular_price {
            value
            currency
          }
        }
      }
      thumbnail {
        url
      }
    }
  }
}
```

### Get Product Detail

```graphql
query GetProduct {
  products(filter: { sku: { eq: "PRODUCT-SKU" } }) {
    items {
      id
      sku
      name
      description {
        html
      }
      short_description {
        html
      }
      price_range {
        minimum_price {
          regular_price {
            value
            currency
          }
        }
      }
      image {
        url
        label
      }
      media_gallery {
        url
        label
        position
      }
      stock_status
    }
  }
}
```

## Cart Operations

### Create Empty Cart

```graphql
mutation {
  createEmptyCart
}
```

### Get Cart

```graphql
query GetCart($cartId: String!) {
  cart(cart_id: $cartId) {
    id
    email
    total_quantity
    items {
      id
      product {
        sku
        name
        thumbnail {
          url
        }
      }
      quantity
      prices {
        price {
          value
          currency
        }
        row_total {
          value
        }
      }
    }
    prices {
      grand_total {
        value
        currency
      }
      subtotal_excluding_tax {
        value
      }
    }
  }
}
```

Variables:
```json
{
  "cartId": "your-cart-id-here"
}
```

### Add Product to Cart

```graphql
mutation AddToCart($cartId: String!) {
  addProductsToCart(
    cart_id: $cartId
    cart_items: [
      {
        sku: "PRODUCT-SKU"
        quantity: 1
      }
    ]
  ) {
    cart {
      id
      total_quantity
      items {
        id
        product {
          sku
          name
        }
        quantity
      }
    }
    user_errors {
      code
      message
    }
  }
}
```

Variables:
```json
{
  "cartId": "your-cart-id-here"
}
```

### Update Cart Item Quantity

```graphql
mutation UpdateCartItems($cartId: String!) {
  updateCartItems(
    input: {
      cart_id: $cartId
      cart_items: [
        {
          cart_item_id: 123
          quantity: 2
        }
      ]
    }
  ) {
    cart {
      id
      total_quantity
      items {
        id
        quantity
      }
    }
  }
}
```

### Remove Item from Cart

```graphql
mutation RemoveItem($cartId: String!) {
  removeItemFromCart(
    input: {
      cart_id: $cartId
      cart_item_id: 123
    }
  ) {
    cart {
      id
      total_quantity
    }
  }
}
```

## Authentication

### Generate Customer Token (Login)

```graphql
mutation {
  generateCustomerToken(
    email: "customer@example.com"
    password: "Password123"
  ) {
    token
  }
}
```

### Get Customer Info

```graphql
query {
  customer {
    id
    email
    firstname
    lastname
  }
}
```

Headers:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

### Create Customer (Register)

```graphql
mutation {
  createCustomerV2(
    input: {
      firstname: "John"
      lastname: "Doe"
      email: "john@example.com"
      password: "Password123"
    }
  ) {
    customer {
      id
      email
      firstname
      lastname
    }
  }
}
```

## Categories

### Get Categories

```graphql
query {
  categories(filters: { ids: { in: ["3", "4", "5"] } }) {
    items {
      id
      name
      url_key
      url_path
      product_count
      image
    }
  }
}
```

### Get Category Tree

```graphql
query {
  categories {
    items {
      id
      level
      name
      path
      children {
        id
        name
        url_key
      }
    }
  }
}
```

## Search

### Search Products

```graphql
query SearchProducts {
  products(search: "iphone", pageSize: 10) {
    items {
      id
      sku
      name
      price_range {
        minimum_price {
          regular_price {
            value
          }
        }
      }
      thumbnail {
        url
      }
    }
    total_count
  }
}
```

## Sorting & Filtering

### Sort by Price

```graphql
query {
  products(
    pageSize: 10
    sort: { price: ASC }
  ) {
    items {
      name
      price_range {
        minimum_price {
          regular_price {
            value
          }
        }
      }
    }
  }
}
```

### Filter by Price Range

```graphql
query {
  products(
    filter: {
      price: { from: "100", to: "500" }
    }
    pageSize: 10
  ) {
    items {
      name
      price_range {
        minimum_price {
          regular_price {
            value
          }
        }
      }
    }
  }
}
```

## Tips

1. **Test in GraphQL Playground**: Always test queries in Magento's GraphQL playground first
2. **Check Response**: Verify the response structure matches your TypeScript interfaces
3. **Handle Errors**: Check for `errors` array in response
4. **Use Variables**: Use query variables instead of hardcoding values
5. **Pagination**: Use `pageSize` and `currentPage` for large datasets

## Common Issues

### CORS Errors
- Configure CORS in Magento
- Check `Access-Control-Allow-Origin` headers

### Authentication Required
- Some queries require customer token
- Add `Authorization: Bearer TOKEN` header

### Query Complexity
- Magento limits query complexity
- Optimize queries to request only needed fields

## Resources

- [Magento GraphQL Documentation](https://developer.adobe.com/commerce/webapi/graphql/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
