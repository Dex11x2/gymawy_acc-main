export type Currency = 'EGP' | 'USD' | 'SAR' | 'AED';

export interface ExchangeRates {
  EGP: number;
  USD: number;
  SAR: number;
  AED: number;
}

export const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  EGP: 1,
  USD: 30.9,
  SAR: 8.5,
  AED: 8.4,
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EGP: 'ج.م',
  USD: '$',
  SAR: 'ر.س',
  AED: 'د.إ',
};

export const CURRENCY_NAMES: Record<Currency, string> = {
  EGP: 'الجنيه المصري',
  USD: 'الدولار الأمريكي',
  SAR: 'الريال السعودي',
  AED: 'الدرهم الإماراتي',
};

export const CURRENCY_FLAGS: Record<Currency, string> = {
  EGP: '🇪🇬',
  USD: '🇺🇸',
  SAR: '🇸🇦',
  AED: '🇦🇪',
};

export const convertCurrency = (
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  exchangeRates: ExchangeRates = DEFAULT_EXCHANGE_RATES
): number => {
  if (fromCurrency === toCurrency) return amount;
  const baseAmount = amount * exchangeRates[fromCurrency];
  return baseAmount / exchangeRates[toCurrency];
};

export const convertToBaseCurrency = (
  amount: number,
  currency: Currency,
  exchangeRates: ExchangeRates = DEFAULT_EXCHANGE_RATES
): number => amount * exchangeRates[currency];

export const getCurrencySymbol = (currency: Currency): string => CURRENCY_SYMBOLS[currency];
export const getCurrencyName = (currency: Currency): string => CURRENCY_NAMES[currency];
export const getCurrencyFlag = (currency: Currency): string => CURRENCY_FLAGS[currency];

export const formatCurrency = (
  amount: number,
  currency: Currency,
  showSymbol: boolean = true
): string => {
  const formatted = amount.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return showSymbol ? `${formatted} ${getCurrencySymbol(currency)}` : formatted;
};

export const getCurrencyInfo = (currency: Currency) => ({
  code: currency,
  symbol: getCurrencySymbol(currency),
  name: getCurrencyName(currency),
  flag: getCurrencyFlag(currency),
  rate: DEFAULT_EXCHANGE_RATES[currency],
});

export const getSupportedCurrencies = (): Currency[] => ['EGP', 'USD', 'SAR', 'AED'];
export const isValidCurrency = (currency: string): currency is Currency => getSupportedCurrencies().includes(currency as Currency);

export const calculateTotalInBaseCurrency = (
  amounts: Array<{ amount: number; currency: Currency }>,
  exchangeRates: ExchangeRates = DEFAULT_EXCHANGE_RATES
): number => amounts.reduce((total, item) => total + convertToBaseCurrency(item.amount, item.currency, exchangeRates), 0);

export const groupAmountsByCurrency = (
  amounts: Array<{ amount: number; currency: Currency }>
): Record<Currency, number> => {
  const grouped: Record<Currency, number> = { EGP: 0, USD: 0, SAR: 0, AED: 0 };
  amounts.forEach((item) => { grouped[item.currency] += item.amount; });
  return grouped;
};

export const saveExchangeRates = (rates: ExchangeRates): void => {
  localStorage.setItem('gemawi-exchange-rates', JSON.stringify(rates));
};

export const loadExchangeRates = (): ExchangeRates => {
  try {
    const stored = localStorage.getItem('gemawi-exchange-rates');
    return stored ? JSON.parse(stored) : DEFAULT_EXCHANGE_RATES;
  } catch {
    return DEFAULT_EXCHANGE_RATES;
  }
};

export const updateExchangeRate = (currency: Currency, rate: number): void => {
  const rates = loadExchangeRates();
  rates[currency] = rate;
  saveExchangeRates(rates);
};

