export const CURRENCIES = {
  EGP: { code: 'EGP', symbol: 'ج.م', name: 'الجنيه المصري' },
  USD: { code: 'USD', symbol: '$', name: 'الدولار الأمريكي' },
  SAR: { code: 'SAR', symbol: 'ر.س', name: 'الريال السعودي' },
  AED: { code: 'AED', symbol: 'د.إ', name: 'الدرهم الإماراتي' }
} as const;

export const DEFAULT_EXCHANGE_RATES = {
  EGP: 1,
  USD: 30.9,
  SAR: 8.24,
  AED: 8.4
};

export const convertToBaseCurrency = (
  amount: number,
  currency: 'EGP' | 'USD' | 'SAR' | 'AED',
  exchangeRate?: number
): number => {
  if (currency === 'EGP') return amount;
  const rate = exchangeRate || DEFAULT_EXCHANGE_RATES[currency];
  return amount * rate;
};

export const formatCurrencyAmount = (
  amount: number,
  currency: 'EGP' | 'USD' | 'SAR' | 'AED'
): string => {
  const currencyInfo = CURRENCIES[currency];
  return `${amount.toLocaleString('ar-EG')} ${currencyInfo.symbol}`;
};

export const getCurrencySymbol = (currency: 'EGP' | 'USD' | 'SAR' | 'AED'): string => {
  return CURRENCIES[currency].symbol;
};


