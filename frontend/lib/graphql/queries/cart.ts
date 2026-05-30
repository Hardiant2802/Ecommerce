// Cart GraphQL Queries & Mutations

export const CREATE_EMPTY_CART = `
  mutation CreateEmptyCart {
    createEmptyCart
  }
`;

export const GET_CART = `
  query GetCart($cartId: String!) {
    cart(cart_id: $cartId) {
      id
      email
      total_quantity
      items {
        uid
        id
        product {
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
          thumbnail {
            url
            label
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
            currency
          }
        }
        ... on SimpleCartItem {
          customizable_options {
            label
            customizable_option_uid
            values {
              value
              label
              customizable_option_value_uid
            }
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
          currency
        }
      }
    }
  }
`;

export const GET_CUSTOMER_CART = `
  query GetCustomerCart {
    customerCart {
      id
      email
      total_quantity
      items {
        uid
        id
        product {
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
          thumbnail {
            url
            label
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
            currency
          }
        }
        ... on SimpleCartItem {
          customizable_options {
            label
            customizable_option_uid
            values {
              value
              label
              customizable_option_value_uid
            }
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
          currency
        }
      }
    }
  }
`;

export const ADD_TO_CART = `
  mutation AddProductsToCart(
    $cartId: String!
    $cartItems: [CartItemInput!]!
  ) {
    addProductsToCart(
      cartId: $cartId
      cartItems: $cartItems
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
`;

export const UPDATE_CART_ITEMS = `
  mutation UpdateCartItems(
    $cartId: String!
    $cartItems: [CartItemUpdateInput!]!
  ) {
    updateCartItems(
      input: {
        cart_id: $cartId
        cart_items: $cartItems
      }
    ) {
      cart {
        id
        total_quantity
        items {
          id
          quantity
          prices {
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
        }
      }
    }
  }
`;

export const REMOVE_ITEM_FROM_CART = `
  mutation RemoveItemFromCart(
    $cartId: String!
    $cartItemId: Int!
  ) {
    removeItemFromCart(
      input: {
        cart_id: $cartId
        cart_item_id: $cartItemId
      }
    ) {
      cart {
        id
        total_quantity
        items {
          id
        }
        prices {
          grand_total {
            value
            currency
          }
        }
      }
    }
  }
`;

export const MERGE_CARTS = `
  mutation MergeCarts(
    $sourceCartId: String!
    $destinationCartId: String!
  ) {
    mergeCarts(
      source_cart_id: $sourceCartId
      destination_cart_id: $destinationCartId
    ) {
      id
      total_quantity
    }
  }
`;
