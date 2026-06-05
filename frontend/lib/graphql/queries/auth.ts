// Authentication GraphQL Queries & Mutations

export const GENERATE_CUSTOMER_TOKEN = `
  mutation GenerateCustomerToken($email: String!, $password: String!) {
    generateCustomerToken(email: $email, password: $password) {
      token
    }
  }
`;

export const GET_CUSTOMER = `
  query GetCustomer {
    customer {
      id
      email
      firstname
      lastname
      date_of_birth
      gender
      is_subscribed
      created_at
      orders(pageSize: 5) {
        items {
          id
          number
          order_date
          status
          total {
            grand_total { value currency }
          }
          items {
            product_name
            product_sku
            quantity_ordered
            product_sale_price { value currency }
          }
        }
      }
    }
  }
`;

export const CREATE_CUSTOMER = `
  mutation CreateCustomer($input: CustomerCreateInput!) {
    createCustomerV2(input: $input) {
      customer {
        id
        email
        firstname
        lastname
      }
    }
  }
`;

export const REVOKE_CUSTOMER_TOKEN = `
  mutation RevokeCustomerToken {
    revokeCustomerToken {
      result
    }
  }
`;

export const CHANGE_PASSWORD = `
  mutation ChangeCustomerPassword(
    $currentPassword: String!
    $newPassword: String!
  ) {
    changeCustomerPassword(
      currentPassword: $currentPassword
      newPassword: $newPassword
    ) {
      id
      email
    }
  }
`;
