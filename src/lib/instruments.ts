export type Exchange =
  // Indian markets
  | 'NSE'
  | 'BSE'
  | 'MCX'
  // US / International markets (fetched via Yahoo Finance)
  | 'NYSE'
  | 'NASDAQ'
  | 'AMEX'
  | 'LSE'
  | 'XETRA'
  | 'TSE'
  | 'HKEX'
  | 'ASX'
  | 'SGX';

export interface Instrument {
  symbol: string;
  name: string;
  exchange: Exchange;
  token: string;
  category: 'equity' | 'debt' | 'gold' | 'commodity' | 'index';
  benchmark?: boolean;
}

/**
 * Pre-loaded instrument master for Angel One SmartAPI.
 * Tokens are the official Angel One symbol tokens. Verify against the latest
 * instrument master file if a fetch fails; tokens can change after corporate actions.
 */
export const INSTRUMENTS: Instrument[] = [
  // Indian equity benchmarks
  { symbol: 'NIFTY50', name: 'NIFTY 50', exchange: 'NSE', token: '99926000', category: 'index', benchmark: true },
  { symbol: 'NIFTYNEXT50', name: 'NIFTY Next 50', exchange: 'NSE', token: '99926007', category: 'index', benchmark: true },
  { symbol: 'NIFTYMID150', name: 'NIFTY Midcap 150', exchange: 'NSE', token: '99926012', category: 'index', benchmark: true },
  { symbol: 'NIFTYSMALL250', name: 'NIFTY Smallcap 250', exchange: 'NSE', token: '99926011', category: 'index', benchmark: true },
  { symbol: 'NIFTY500', name: 'NIFTY 500', exchange: 'NSE', token: '99926013', category: 'index', benchmark: true },
  { symbol: 'BANKNIFTY', name: 'NIFTY Bank', exchange: 'NSE', token: '99926009', category: 'index', benchmark: true },
  { symbol: 'SENSEX', name: 'S&P BSE SENSEX', exchange: 'BSE', token: '99919000', category: 'index', benchmark: true },

  // ETFs / passive proxies
  { symbol: 'NIFTYBEES', name: 'Nippon India ETF Nifty BeES', exchange: 'NSE', token: '590103', category: 'equity' },
  { symbol: 'BANKBEES', name: 'Nippon India ETF Bank BeES', exchange: 'NSE', token: '590106', category: 'equity' },
  { symbol: 'GOLDBEES', name: 'Nippon India ETF Gold BeES', exchange: 'NSE', token: '590095', category: 'gold' },
  { symbol: 'LIQUIDBEES', name: 'Nippon India ETF Liquid BeES', exchange: 'NSE', token: '590070', category: 'debt' },
  { symbol: 'SETFNN50', name: 'SBI ETF Nifty Next 50', exchange: 'NSE', token: '590111', category: 'equity' },

  // Liquid / overnight proxies
  { symbol: 'LIQUIDCASE', name: 'DSP Liquidity ETF', exchange: 'NSE', token: '541519', category: 'debt' },

  // Gold proxy
  { symbol: 'GOLDCASE', name: 'Axis Gold ETF', exchange: 'NSE', token: '590081', category: 'gold' },

  // US / International equity & bond ETFs
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSE', token: '', category: 'equity' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ', token: '', category: 'equity' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', exchange: 'NYSE', token: '', category: 'equity' },
  { symbol: 'VT', name: 'Vanguard Total World Stock ETF', exchange: 'NYSE', token: '', category: 'equity' },
  { symbol: 'VXUS', name: 'Vanguard Total International Stock ETF', exchange: 'NASDAQ', token: '', category: 'equity' },
  { symbol: 'EEM', name: 'iShares MSCI Emerging Markets ETF', exchange: 'NYSE', token: '', category: 'equity' },
  { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', exchange: 'NASDAQ', token: '', category: 'debt' },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', exchange: 'NASDAQ', token: '', category: 'debt' },
  { symbol: 'GLD', name: 'SPDR Gold Shares', exchange: 'NYSE', token: '', category: 'gold' },
  { symbol: 'AGG', name: 'iShares Core U.S. Aggregate Bond ETF', exchange: 'NYSE', token: '', category: 'debt' },
];

export const INSTRUMENT_MAP: Record<string, Instrument> = Object.fromEntries(
  INSTRUMENTS.map((i) => [i.symbol, i]),
);

export function getInstrument(symbol: string): Instrument | undefined {
  return INSTRUMENT_MAP[symbol];
}

export function getInstrumentsByCategory(category: Instrument['category']): Instrument[] {
  return INSTRUMENTS.filter((i) => i.category === category);
}

// Default MVO basket optimized for the longest available common history while
// covering large-cap equity, broad equity, banking sector, gold, and liquid debt.
export const DEFAULT_ALLOCATION_SYMBOLS = ['NIFTY50', 'NIFTY500', 'BANKNIFTY', 'GOLDBEES', 'LIQUIDBEES'];

export const BENCHMARK_SET: Instrument[] = INSTRUMENTS.filter((i) => i.benchmark);
