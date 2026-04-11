// Currency Exchange Types (Vietcombank)

export interface ExchangeRate {
  currencyCode: string;
  currencyName: string;
  buy: string;
  transfer: string;
  sell: string;
}

export interface CurrencyData {
  rates: ExchangeRate[];
  lastUpdated: string;
  source: string;
}

export interface CurrencyApiResponse {
  data?: CurrencyData;
  error?: string;
  cached?: boolean;
  timestamp?: number;
}

export interface ConversionResult {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  result: number;
  rate: number;
  timestamp: number;
}

// Popular currencies for quick access
export const POPULAR_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CNY',
  'KRW',
  'THB',
  'SGD',
] as const;

export type PopularCurrency = typeof POPULAR_CURRENCIES[number];
