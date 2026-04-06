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
        small_image {
          url
          label
        }
        thumbnail {
          url
          label
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
        small_image {
          url
          label
        }
        thumbnail {
          url
          label
        }
        description {
          html
        }
        short_description {
          html
        }
        media_gallery {
          url
          label
          position
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

export const SEARCH_PRODUCTS = `
  query SearchProducts($search: String!, $pageSize: Int = 12) {
    products(search: $search, pageSize: $pageSize) {
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
          label
        }
      }
      total_count
    }
  }
`;
