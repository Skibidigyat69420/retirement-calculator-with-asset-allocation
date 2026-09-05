import * as OTPAuth from 'otpauth';

export interface SmartApiCredentials {
  apiKey: string;
  clientCode: string;
  pin: string;
  totpSecret?: string;
  localIp: string;
  publicIp: string;
  macAddress: string;
}

export interface SmartApiSession {
  jwtToken: string;
  refreshToken: string;
  feedToken: string;
  userProfile?: {
    clientcode: string;
    name: string;
    email: string;
    mobileno: string;
    exchanges: string[];
    products: string[];
  };
  connectedAt: string;
}

export interface SmartApiHolding {
  tradingsymbol: string;
  symboltoken: string;
  exchange: string;
  isin: string;
  quantity: number;
  averageprice: number;
  ltp: number;
  pnl: number;
  close: number;
  totalHoldingValue: number;
  totalPnlPercentage: number;
}

export interface SmartApiFunds {
  net: number;
  availablecash: number;
  availablemargin: number;
  collateral: number;
  m2munrealized: number;
  m2mrealized: number;
  utiliseddebits: number;
}

export const DEFAULT_NETWORK_INFO = {
  localIp: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ANGEL_LOCAL_IP) || '192.168.68.61',
  publicIp: (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_ANGEL_PUBLIC_IP || import.meta.env?.ANGEL_PUBLIC_IP)) || '122.170.251.47',
  macAddress: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ANGEL_MAC_ADDRESS) || 'b0:22:7a:74:16:ec',
};

/**
 * Generate standard 6-digit TOTP from base32 secret
 */
export function generateTOTP(secret: string): string {
  if (!secret) return '';
  try {
    const cleanSecret = secret.replace(/[\s-]/g, '').toUpperCase();
    const totp = new OTPAuth.TOTP({
      issuer: 'AngelOne',
      label: 'SmartAPI',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(cleanSecret),
    });
    return totp.generate();
  } catch (err) {
    console.error('Error generating TOTP:', err);
    return '';
  }
}

/**
 * Build standard Angel One request headers
 */
function buildHeaders(creds: SmartApiCredentials, jwtToken?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-UserType': 'USER',
    'X-SourceID': 'WEB',
    'X-ClientLocalIP': creds.localIp || DEFAULT_NETWORK_INFO.localIp,
    'X-ClientPublicIP': creds.publicIp || DEFAULT_NETWORK_INFO.publicIp,
    'X-MACAddress': creds.macAddress || DEFAULT_NETWORK_INFO.macAddress,
    'X-PrivateKey': creds.apiKey.trim(),
  };

  if (jwtToken) {
    const token = jwtToken.startsWith('Bearer ') ? jwtToken : `Bearer ${jwtToken}`;
    headers['Authorization'] = token;
  }

  return headers;
}

/**
 * Login to Angel One SmartAPI using MPIN / Password and TOTP
 */
export async function loginSmartApi(
  creds: SmartApiCredentials,
  manualTotp?: string
): Promise<{ success: boolean; session?: SmartApiSession; message: string }> {
  try {
    const totpCode = manualTotp || (creds.totpSecret ? generateTOTP(creds.totpSecret) : '');
    if (!totpCode) {
      return {
        success: false,
        message: 'TOTP code could not be generated. Please provide a valid TOTP Secret or 6-digit TOTP code.',
      };
    }

    const payload = {
      clientcode: creds.clientCode.trim().toUpperCase(),
      password: creds.pin.trim(),
      totp: totpCode.trim(),
    };

    const endpoint = '/api/angelone/rest/auth/angelbroking/user/v1/loginByPassword';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: buildHeaders(creds),
      body: JSON.stringify(payload),
    });

    const resData = await response.json();

    if (!response.ok || !resData.status) {
      return {
        success: false,
        message: resData.message || resData.errorcode || `Login failed with status ${response.status}`,
      };
    }

    const session: SmartApiSession = {
      jwtToken: resData.data.jwtToken,
      refreshToken: resData.data.refreshToken,
      feedToken: resData.data.feedToken,
      connectedAt: new Date().toISOString(),
    };

    // Attempt to fetch profile immediately
    try {
      const profile = await fetchUserProfile(creds, session.jwtToken);
      if (profile) {
        session.userProfile = profile;
      }
    } catch {
      // Ignore profile fetch failure during initial auth
    }

    saveSession(session);
    return {
      success: true,
      session,
      message: 'Successfully connected to Angel One SmartAPI!',
    };
  } catch (err: any) {
    console.error('SmartAPI login error:', err);
    return {
      success: false,
      message: err?.message || 'Network error while contacting Angel One API.',
    };
  }
}

/**
 * Fetch User Profile
 */
export async function fetchUserProfile(creds: SmartApiCredentials, jwtToken: string) {
  const endpoint = '/api/angelone/rest/secure/angelbroking/user/v1/getProfile';
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: buildHeaders(creds, jwtToken),
  });

  const data = await response.json();
  if (data.status && data.data) {
    return data.data;
  }
  return null;
}

/**
 * Fetch RMS / Funds / Margins
 */
export async function fetchRMSFunds(
  creds: SmartApiCredentials,
  jwtToken: string
): Promise<{ success: boolean; data?: SmartApiFunds; message?: string }> {
  try {
    const endpoint = '/api/angelone/rest/secure/angelbroking/user/v1/getRMS';
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: buildHeaders(creds, jwtToken),
    });

    const res = await response.json();
    if (res.status && res.data) {
      const d = res.data;
      return {
        success: true,
        data: {
          net: parseFloat(d.net || '0'),
          availablecash: parseFloat(d.availablecash || '0'),
          availablemargin: parseFloat(d.availablemargin || '0'),
          collateral: parseFloat(d.collateral || '0'),
          m2munrealized: parseFloat(d.m2munrealized || '0'),
          m2mrealized: parseFloat(d.m2mrealized || '0'),
          utiliseddebits: parseFloat(d.utiliseddebits || '0'),
        },
      };
    }
    return { success: false, message: res.message || 'Failed to fetch RMS funds' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error fetching funds' };
  }
}

/**
 * Fetch All Portfolio Holdings
 */
export async function fetchAllHoldings(
  creds: SmartApiCredentials,
  jwtToken: string
): Promise<{ success: boolean; data?: SmartApiHolding[]; message?: string }> {
  try {
    const endpoint = '/api/angelone/rest/secure/angelbroking/portfolio/v1/getAllHolding';
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: buildHeaders(creds, jwtToken),
    });

    const res = await response.json();
    if (res.status && res.data?.holdings) {
      const list: SmartApiHolding[] = res.data.holdings.map((h: any) => {
        const qty = Number(h.quantity || 0);
        const avg = Number(h.averageprice || 0);
        const ltp = Number(h.ltp || 0);
        const totalVal = Number(h.totalHoldingValue || (qty * ltp));
        const pnl = Number(h.pnl || (totalVal - (qty * avg)));
        const investedVal = qty * avg;
        const pnlPct = investedVal > 0 ? (pnl / investedVal) * 100 : 0;

        return {
          tradingsymbol: h.tradingsymbol || 'Unknown',
          symboltoken: h.symboltoken || '',
          exchange: h.exchange || 'NSE',
          isin: h.isin || '',
          quantity: qty,
          averageprice: avg,
          ltp: ltp,
          pnl: pnl,
          close: Number(h.close || 0),
          totalHoldingValue: totalVal,
          totalPnlPercentage: pnlPct,
        };
      });

      return { success: true, data: list };
    }
    return { success: false, message: res.message || 'No holdings returned' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error fetching holdings' };
  }
}

/**
 * Fetch Positions
 */
export async function fetchPositions(creds: SmartApiCredentials, jwtToken: string) {
  try {
    const endpoint = '/api/angelone/rest/secure/angelbroking/order/v1/getPosition';
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: buildHeaders(creds, jwtToken),
    });
    return await response.json();
  } catch (err: any) {
    return { status: false, message: err?.message };
  }
}

/**
 * Fetch Order Book
 */
export async function fetchOrderBook(creds: SmartApiCredentials, jwtToken: string) {
  try {
    const endpoint = '/api/angelone/rest/secure/angelbroking/order/v1/getOrderBook';
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: buildHeaders(creds, jwtToken),
    });
    return await response.json();
  } catch (err: any) {
    return { status: false, message: err?.message };
  }
}

/**
 * Fetch Trade Book
 */
export async function fetchTradeBook(creds: SmartApiCredentials, jwtToken: string) {
  try {
    const endpoint = '/api/angelone/rest/secure/angelbroking/order/v1/getTradeBook';
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: buildHeaders(creds, jwtToken),
    });
    return await response.json();
  } catch (err: any) {
    return { status: false, message: err?.message };
  }
}

export interface QuoteInstrument {
  exchange: string;
  symboltoken: string;
}

export interface QuoteRequest {
  mode?: 'FULL' | 'LTP' | 'OHLC';
  exchangeTokens: Record<string, string[]>;
}

/**
 * Fetch market quotes (full depth) for a batch of instruments.
 */
export async function fetchQuotes(
  creds: SmartApiCredentials,
  jwtToken: string,
  request: QuoteRequest,
) {
  try {
    const endpoint = '/api/angelone/rest/secure/angelbroking/market/v1/quote';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: buildHeaders(creds, jwtToken),
      body: JSON.stringify({ mode: request.mode || 'FULL', exchangeTokens: request.exchangeTokens }),
    });
    return await response.json();
  } catch (err: any) {
    return { status: false, message: err?.message };
  }
}

/**
 * Fetch last traded prices (LTP) for a batch of instruments.
 */
export async function fetchLTPs(
  creds: SmartApiCredentials,
  jwtToken: string,
  exchangeTokens: Record<string, string[]>,
) {
  try {
    const endpoint = '/api/angelone/rest/secure/angelbroking/market/v1/quoteLTP';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: buildHeaders(creds, jwtToken),
      body: JSON.stringify({ exchangeTokens }),
    });
    return await response.json();
  } catch (err: any) {
    return { status: false, message: err?.message };
  }
}

// Storage keys for sessionStorage persistence
const STORAGE_KEY_SESSION = 'soundthesis_angel_session_v1';
const STORAGE_KEY_CREDS = 'soundthesis_angel_creds_v1';

/**
 * Storage Helpers
 *
 * Broker sessions and non-sensitive credentials are kept in sessionStorage
 * for the duration of the browser tab. PINs and TOTP secrets are NEVER persisted.
 */
export function saveCredentials(creds: SmartApiCredentials) {
  if (typeof window === 'undefined') return;
  try {
    const safeCreds = {
      apiKey: creds.apiKey,
      clientCode: creds.clientCode,
      localIp: creds.localIp,
      publicIp: creds.publicIp,
      macAddress: creds.macAddress,
    };
    sessionStorage.setItem(STORAGE_KEY_CREDS, JSON.stringify(safeCreds));
  } catch {
    // Ignore storage quota or disabled errors
  }
}

export function loadCredentials(): Partial<SmartApiCredentials> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_CREDS);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: SmartApiSession) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
  } catch {
    // Ignore storage errors
  }
}

export function loadSession(): SmartApiSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY_SESSION);
  } catch {
    // Ignore storage errors
  }
}

export interface CandleDataRequest {
  exchange: string;
  symboltoken: string;
  interval: 'ONE_MINUTE' | 'THREE_MINUTE' | 'FIVE_MINUTE' | 'TEN_MINUTE' | 'FIFTEEN_MINUTE' | 'THIRTY_MINUTE' | 'ONE_HOUR' | 'ONE_DAY';
  fromdate: string; // YYYY-MM-DD HH:mm
  todate: string;
}

export type CandleDataPoint = [string, number, number, number, number, number];

/**
 * Fetch historical candle data from Angel One SmartAPI.
 * Requires a valid authenticated session.
 */
export async function fetchCandleData(
  creds: SmartApiCredentials,
  jwtToken: string,
  params: CandleDataRequest,
): Promise<{ success: boolean; data?: CandleDataPoint[]; message?: string }> {
  try {
    const endpoint = '/api/angelone/rest/secure/angelbroking/historical/v1/getCandleData';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: buildHeaders(creds, jwtToken),
      body: JSON.stringify(params),
    });

    const res = await response.json();
    if (res.status && Array.isArray(res.data)) {
      return { success: true, data: res.data };
    }
    return { success: false, message: res.message || res.errorcode || 'No candle data returned' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error fetching candle data' };
  }
}

/**
 * Build default SmartAPI credentials, preferring environment variables for the API key
 * so deployments can inject it without touching committed source code.
 */
export function buildDefaultCredentials(partial?: Partial<SmartApiCredentials>): SmartApiCredentials {
  const envKey = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_ANGEL_API_KEY as string | undefined) : undefined;
  const saved = loadCredentials();
  return {
    apiKey: envKey || saved?.apiKey || '7mnk8SRp',
    clientCode: saved?.clientCode || '',
    pin: '',
    totpSecret: '',
    localIp: saved?.localIp || DEFAULT_NETWORK_INFO.localIp,
    publicIp: saved?.publicIp || DEFAULT_NETWORK_INFO.publicIp,
    macAddress: saved?.macAddress || DEFAULT_NETWORK_INFO.macAddress,
    ...partial,
  };
}
