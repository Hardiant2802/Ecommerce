// Currency Service - Vietcombank XML API Parser
import type { CurrencyData, ExchangeRate } from '@/types/currency';

const VIETCOMBANK_API_URL = 'https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx?b=68';

/**
 * Fetch and parse exchange rates from Vietcombank XML API
 * Note: Should be called from API routes to handle CORS
 */
export async function fetchExchangeRates(): Promise<CurrencyData> {
  try {
    const response = await fetch(VIETCOMBANK_API_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch rates: ${response.status}`);
    }

    const xmlText = await response.text();
    const rates = parseVietcombankXML(xmlText);

    return {
      rates,
      lastUpdated: new Date().toISOString(),
      source: 'Vietcombank',
    };
  } catch (error) {
    throw new Error(`Exchange rate fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse Vietcombank XML response to structured data
 */
export function parseVietcombankXML(xmlText: string): ExchangeRate[] {
  const rates: ExchangeRate[] = [];
  
  // Simple XML parsing without external dependencies
  // Vietcombank XML format: <Exrate CurrencyCode="..." CurrencyName="..." Buy="..." Transfer="..." Sell="..." />
  const exrateRegex = /<Exrate\s+([^>]+)\/>/g;
  const attrRegex = /(\w+)="([^"]*)"/g;
  
  let match;
  while ((match = exrateRegex.exec(xmlText)) !== null) {
    const attributes: Record<string, string> = {};
    const attrString = match[1];
    
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrString)) !== null) {
      attributes[attrMatch[1]] = attrMatch[2];
    }
    
    if (attributes.CurrencyCode && attributes.CurrencyName) {
      rates.push({
        currencyCode: attributes.CurrencyCode,
        currencyName: attributes.CurrencyName,
        buy: attributes.Buy || '-',
        transfer: attributes.Transfer || '-',
        sell: attributes.Sell || '-',
      });
    }
  }
  
  return rates;
}

/**
 * Get exchange rate for a specific currency
 */
export function getRate(rates: ExchangeRate[], currencyCode: string): ExchangeRate | undefined {
  return rates.find(rate => rate.currencyCode === currencyCode);
}

/**
 * Convert amount between currencies
 * Uses transfer rate by default
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRate[]
): number {
  // VND is base currency
  if (fromCurrency === 'VND' && toCurrency !== 'VND') {
    const toRate = getRate(rates, toCurrency);
    if (!toRate || toRate.transfer === '-') return 0;
    
    const rate = parseFloat(toRate.transfer.replace(/,/g, ''));
    return amount / rate;
  }
  
  if (fromCurrency !== 'VND' && toCurrency === 'VND') {
    const fromRate = getRate(rates, fromCurrency);
    if (!fromRate || fromRate.transfer === '-') return 0;
    
    const rate = parseFloat(fromRate.transfer.replace(/,/g, ''));
    return amount * rate;
  }
  
  if (fromCurrency !== 'VND' && toCurrency !== 'VND') {
    // Convert through VND
    const fromRate = getRate(rates, fromCurrency);
    const toRate = getRate(rates, toCurrency);
    
    if (!fromRate || !toRate || fromRate.transfer === '-' || toRate.transfer === '-') {
      return 0;
    }
    
    const fromRateValue = parseFloat(fromRate.transfer.replace(/,/g, ''));
    const toRateValue = parseFloat(toRate.transfer.replace(/,/g, ''));
    
    const vndAmount = amount * fromRateValue;
    return vndAmount / toRateValue;
  }
  
  // Same currency
  return amount;
}

/**
 * Format currency value
 */
export function formatCurrency(value: string | number, currency: string = 'VND'): string {
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  
  if (isNaN(numValue)) return '-';
  
  if (currency === 'VND') {
    return new Intl.NumberFormat('vi-VN').format(numValue);
  }
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
}
