// API Response Types
export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: {
      category: string;
    };
  }>;
}

export interface ApiError {
  message: string;
  code?: string;
}
