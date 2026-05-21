// Product GraphQL Queries

export const GET_PRODUCTS = `
  query GetProducts(
    $pageSize: Int = 12
    $currentPage: Int = 1
    $filter: ProductAttributeFilterInput
    $sort: ProductAttributeSortInput
    $search: String
  ) {
    products(
      pageSize: $pageSize
      currentPage: $currentPage
      filter: $filter
      sort: $sort
      search: $search
    ) {
      items {
        id
        sku
        name
        url_key
        categories {
          id
          name
          url_key
          url_path
        }
        updated_at
        stock_status
        price_range {
          minimum_price {
            regular_price {
              value
              currency
            }
            final_price {
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
          disabled
        }
      }
      page_info {
        current_page
        page_size
        total_pages
      }
      total_count
    }
  }
`;

export const GET_PRODUCT_DETAIL = `
  query GetProductDetail($sku: String!) {
    products(filter: { sku: { eq: $sku } }) {
      items {
        id
        sku
        name
        url_key
        updated_at
        stock_status
        price_range {
          minimum_price {
            regular_price {
              value
              currency
            }
            final_price {
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
          disabled
        }
        description {
          html
        }
        short_description {
          html
        }
        ... on SimpleProduct {
          options {
            title
            required
            __typename
            ... on CustomizableDropDownOption {
              value {
                uid
                title
                sort_order
                price
              }
            }
          }
        }
        categories {
          id
          name
          url_key
          url_path
        }
      }
    }
  }
`;

export const GET_PRODUCT_BY_URL_KEY = `
  query GetProductByUrlKey($urlKey: String!) {
    products(filter: { url_key: { eq: $urlKey } }) {
      items {
        id
        sku
        name
        url_key
        updated_at
        stock_status
        price_range {
          minimum_price {
            regular_price {
              value
              currency
            }
            final_price {
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
          disabled
        }
        description {
          html
        }
        short_description {
          html
        }
        ... on SimpleProduct {
          options {
            title
            required
            __typename
            ... on CustomizableDropDownOption {
              value {
                uid
                title
                sort_order
                price
              }
            }
          }
        }
        categories {
          id
          name
          url_key
          url_path
        }
      }
    }
  }
`;

export const GET_CATEGORIES = `
  query GetCategories {
    categories(filters: { ids: { in: ["3", "4", "5"] } }) {
      items {
        id
        name
        url_key
        url_path
        level
        image
        product_count
      }
    }
  }
`;

export const GET_CATEGORY_BY_URL_KEY = `
  query GetCategoryByUrlKey($urlKey: String!) {
    categories(filters: { url_key: { eq: $urlKey } }) {
      items {
        id
        name
        url_key
        url_path
      }
    }
  }
`;

export const SEARCH_PRODUCTS = `
  query SearchProducts($search: String!, $pageSize: Int = 12) {
    products(search: $search, pageSize: $pageSize) {
      items {
        id
        sku
        name
        url_key
        updated_at
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
          disabled
        }
      }
      total_count
    }
  }
`;
