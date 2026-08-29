#!/usr/bin/env python3
"""
Fetch maximum-history daily prices from Angel One SmartAPI and build the
market-data bundle used by the frontend. Falls back to Yahoo Finance when
Angel One credentials are missing, login fails, or a symbol is unavailable.

Usage:
    export ANGEL_API_KEY=...
    export ANGEL_CLIENT_CODE=...
    export ANGEL_PIN=...
    export ANGEL_TOTP_SECRET=...
    python scripts/fetch_angel_historical.py

Without Angel One credentials the script still works using Yahoo Finance.
"""
import argparse
import json
import os
import time
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import requests
import yfinance as yf

# Optional Angel One TOTP library; only imported if credentials are present.
try:
    import pyotp
except ImportError:
    pyotp = None

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
PRICES_DIR = DATA_DIR / "prices"
PUBLIC_DATA_DIR = ROOT / "public" / "data"

# Network headers required by Angel One SmartAPI.
LOCAL_IP = os.getenv("ANGEL_LOCAL_IP", "192.168.68.61")
PUBLIC_IP = os.getenv("ANGEL_PUBLIC_IP", "122.170.251.47")
MAC_ADDRESS = os.getenv("ANGEL_MAC_ADDRESS", "b0:22:7a:74:16:ec")
BASE_URL = "https://apiconnect.angelone.in"

# Instrument universe. This must stay in sync with src/lib/instruments.ts.
INSTRUMENTS = [
    # Indian equity benchmarks
    {"symbol": "NIFTY50", "name": "NIFTY 50", "exchange": "NSE", "token": "99926000", "category": "index", "yahoo": "^NSEI"},
    {"symbol": "NIFTYNEXT50", "name": "NIFTY Next 50", "exchange": "NSE", "token": "99926007", "category": "index", "yahoo": "SETFNN50.NS"},
    {"symbol": "NIFTYMID150", "name": "NIFTY Midcap 150", "exchange": "NSE", "token": "99926012", "category": "index", "yahoo": "MID150BEES.NS"},
    {"symbol": "NIFTYSMALL250", "name": "NIFTY Smallcap 250", "exchange": "NSE", "token": "99926011", "category": "index", "yahoo": "SMALLCAP.NS"},
    {"symbol": "NIFTY500", "name": "NIFTY 500", "exchange": "NSE", "token": "99926013", "category": "index", "yahoo": "^CRSLDX"},
    {"symbol": "BANKNIFTY", "name": "NIFTY Bank", "exchange": "NSE", "token": "99926009", "category": "index", "yahoo": "^NSEBANK"},
    {"symbol": "SENSEX", "name": "S&P BSE SENSEX", "exchange": "BSE", "token": "99919000", "category": "index", "yahoo": "^BSESN"},
    # ETFs / passive proxies
    {"symbol": "NIFTYBEES", "name": "Nippon India ETF Nifty BeES", "exchange": "NSE", "token": "590103", "category": "equity", "yahoo": "NIFTYBEES.NS"},
    {"symbol": "BANKBEES", "name": "Nippon India ETF Bank BeES", "exchange": "NSE", "token": "590106", "category": "equity", "yahoo": "BANKBEES.NS"},
    {"symbol": "GOLDBEES", "name": "Nippon India ETF Gold BeES", "exchange": "NSE", "token": "590095", "category": "gold", "yahoo": "GOLDBEES.NS"},
    {"symbol": "LIQUIDBEES", "name": "Nippon India ETF Liquid BeES", "exchange": "NSE", "token": "590070", "category": "debt", "yahoo": "LIQUIDBEES.NS"},
    {"symbol": "SETFNN50", "name": "SBI ETF Nifty Next 50", "exchange": "NSE", "token": "590111", "category": "equity", "yahoo": "SETFNN50.NS"},
    # Liquid / overnight proxies
    {"symbol": "LIQUIDCASE", "name": "DSP Liquidity ETF", "exchange": "NSE", "token": "541519", "category": "debt", "yahoo": "LIQUIDCASE.NS"},
    # Gold proxy
    {"symbol": "GOLDCASE", "name": "Axis Gold ETF", "exchange": "NSE", "token": "590081", "category": "gold", "yahoo": "GOLDCASE.NS"},

    # US / International equity & bond ETFs (always fetched via Yahoo Finance)
    {"symbol": "SPY", "name": "SPDR S&P 500 ETF Trust", "exchange": "NYSE", "token": "", "category": "equity", "yahoo": "SPY"},
    {"symbol": "QQQ", "name": "Invesco QQQ Trust", "exchange": "NASDAQ", "token": "", "category": "equity", "yahoo": "QQQ"},
    {"symbol": "VTI", "name": "Vanguard Total Stock Market ETF", "exchange": "NYSE", "token": "", "category": "equity", "yahoo": "VTI"},
    {"symbol": "VT", "name": "Vanguard Total World Stock ETF", "exchange": "NYSE", "token": "", "category": "equity", "yahoo": "VT"},
    {"symbol": "VXUS", "name": "Vanguard Total International Stock ETF", "exchange": "NASDAQ", "token": "", "category": "equity", "yahoo": "VXUS"},
    {"symbol": "EEM", "name": "iShares MSCI Emerging Markets ETF", "exchange": "NYSE", "token": "", "category": "equity", "yahoo": "EEM"},
    {"symbol": "BND", "name": "Vanguard Total Bond Market ETF", "exchange": "NASDAQ", "token": "", "category": "debt", "yahoo": "BND"},
    {"symbol": "TLT", "name": "iShares 20+ Year Treasury Bond ETF", "exchange": "NASDAQ", "token": "", "category": "debt", "yahoo": "TLT"},
    {"symbol": "GLD", "name": "SPDR Gold Shares", "exchange": "NYSE", "token": "", "category": "gold", "yahoo": "GLD"},
    {"symbol": "AGG", "name": "iShares Core U.S. Aggregate Bond ETF", "exchange": "NYSE", "token": "", "category": "debt", "yahoo": "AGG"},
]

# Default MVO basket optimized for the longest available common history while
# covering large-cap equity, broad equity, banking sector, gold, and liquid debt.
DEFAULT_ALLOCATION_SYMBOLS = ["NIFTY50", "NIFTY500", "BANKNIFTY", "GOLDBEES", "LIQUIDBEES"]
RISK_FREE_RATE = 0.06
TRADING_DAYS = 252


def fetch_series_yahoo(ticker: str, period: str = "max"):
    """Download daily close prices for a Yahoo ticker."""
    try:
        df = yf.Ticker(ticker).history(period=period, auto_adjust=True)
        if df.empty:
            return None
        close = df["Close"] if "Close" in df.columns else df.iloc[:, 0]
        close = close.dropna().sort_index()
        close.index = close.index.tz_localize(None)
        return close.round(4)
    except Exception as e:
        print(f"[!] Yahoo fallback failed for {ticker}: {e}")
        return None


class AngelSmartAPI:
    def __init__(self):
        self.api_key = os.getenv("ANGEL_API_KEY", "")
        self.client_code = os.getenv("ANGEL_CLIENT_CODE", "")
        self.pin = os.getenv("ANGEL_PIN", "")
        self.totp_secret = os.getenv("ANGEL_TOTP_SECRET", "")
        self.jwt_token = None

    def has_credentials(self) -> bool:
        return all([self.api_key, self.client_code, self.pin, self.totp_secret]) and self.api_key != "your_api_key_here"

    def _headers(self, authenticated: bool = False):
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-UserType": "USER",
            "X-SourceID": "WEB",
            "X-ClientLocalIP": LOCAL_IP,
            "X-ClientPublicIP": PUBLIC_IP,
            "X-MACAddress": MAC_ADDRESS,
            "X-PrivateKey": self.api_key,
        }
        if authenticated and self.jwt_token:
            token = self.jwt_token if self.jwt_token.startswith("Bearer ") else f"Bearer {self.jwt_token}"
            headers["Authorization"] = token
        return headers

    def _totp(self) -> str:
        if pyotp is None:
            raise RuntimeError("pyotp is not installed; run: .venv/bin/pip install pyotp")
        totp = pyotp.TOTP(self.totp_secret.replace(" ", "").upper())
        return totp.now()

    def login(self) -> bool:
        try:
            payload = {
                "clientcode": self.client_code.upper(),
                "password": str(self.pin),
                "totp": self._totp(),
            }
            url = f"{BASE_URL}/rest/auth/angelbroking/user/v1/loginByPassword"
            response = requests.post(url, headers=self._headers(), json=payload, timeout=30)
            data = response.json()
            if data.get("status") and data.get("data"):
                self.jwt_token = data["data"]["jwtToken"]
                print("[+] Angel One SmartAPI login successful")
                return True
            print(f"[-] Angel One login failed: {data.get('message')}")
            return False
        except Exception as e:
            print(f"[-] Angel One login error: {e}")
            return False

    def fetch_candles(self, exchange: str, token: str, fromdate: str, todate: str):
        """Fetch daily candles for one chunk. Returns list of [datetime, open, high, low, close, volume]."""
        url = f"{BASE_URL}/rest/secure/angelbroking/historical/v1/getCandleData"
        payload = {
            "exchange": exchange,
            "symboltoken": token,
            "interval": "ONE_DAY",
            "fromdate": fromdate,
            "todate": todate,
        }
        response = requests.post(url, headers=self._headers(authenticated=True), json=payload, timeout=60)
        data = response.json()
        if data.get("status") and isinstance(data.get("data"), list):
            return data["data"]
        return None

    def fetch_series(self, instrument: dict):
        """Fetch full available history by year chunks and return a pandas Series."""
        symbol = instrument["symbol"]
        exchange = instrument["exchange"]
        token = instrument["token"]

        end = datetime.now()
        start = datetime(2000, 1, 1)
        chunks = []
        chunk_start = start
        while chunk_start < end:
            chunk_end = min(chunk_start + timedelta(days=365), end)
            fromdate = chunk_start.strftime("%Y-%m-%d 09:15")
            todate = chunk_end.strftime("%Y-%m-%d 15:30")
            print(f"      Angel: {symbol} {chunk_start.date()} -> {chunk_end.date()}")
            raw = self.fetch_candles(exchange, token, fromdate, todate)
            if raw:
                chunks.extend(raw)
            else:
                print(f"      [!] Angel returned no data for {symbol} chunk {chunk_start.date()}")
            chunk_start = chunk_end + timedelta(days=1)
            time.sleep(0.25)  # Be polite with rate limits.

        if not chunks:
            return None

        # De-duplicate by date and keep close.
        records = {}
        for row in chunks:
            date_str = str(row[0]).split(" ")[0]
            records[date_str] = float(row[4])

        dates = sorted(records.keys())
        series = pd.Series([records[d] for d in dates], index=pd.to_datetime(dates), name=symbol)
        return series.round(4)


def compute_log_returns(closes: np.ndarray):
    return np.log(closes[1:] / closes[:-1])


def compute_stats(symbol: str, closes: np.ndarray):
    returns = compute_log_returns(closes)
    daily_mean = float(np.mean(returns))
    daily_std = float(np.std(returns, ddof=1)) if len(returns) > 1 else 0.0
    annual_return = daily_mean * TRADING_DAYS
    annual_vol = daily_std * np.sqrt(TRADING_DAYS)
    sharpe = (annual_return - RISK_FREE_RATE) / annual_vol if annual_vol > 0 else 0.0

    peak = -np.inf
    max_dd = 0.0
    for price in closes:
        if price > peak:
            peak = price
        dd = (price - peak) / peak
        if dd < max_dd:
            max_dd = dd

    return {
        "symbol": symbol,
        "annualizedReturn": annual_return,
        "annualizedVolatility": annual_vol,
        "sharpeRatio": sharpe,
        "maxDrawdown": max_dd,
        "count": len(returns),
    }


def compute_cov_corr(close_matrix: np.ndarray):
    """Compute annualized covariance and correlation from a close-price matrix (dates x assets)."""
    if close_matrix.shape[0] < 3 or close_matrix.shape[1] < 2:
        return None, None
    returns = np.log(close_matrix[1:] / close_matrix[:-1])
    obs = returns.shape[0]
    means = returns.mean(axis=0, keepdims=True)
    demeaned = returns - means
    cov = (demeaned.T @ demeaned) / (obs - 1)
    cov = cov * TRADING_DAYS
    corr = np.zeros_like(cov)
    for i in range(cov.shape[0]):
        for j in range(cov.shape[1]):
            denom = np.sqrt(cov[i, i] * cov[j, j])
            corr[i, j] = cov[i, j] / denom if denom > 0 else 0.0
    return cov, corr


def main():
    parser = argparse.ArgumentParser(description="Build market-data bundle from Angel One / Yahoo Finance")
    parser.add_argument("--yahoo-only", action="store_true", help="Skip Angel One and use Yahoo Finance only")
    parser.add_argument("--min-days", type=int, default=60, help="Minimum common trading days required")
    args = parser.parse_args()

    PRICES_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)

    angel = AngelSmartAPI()
    use_angel = not args.yahoo_only and angel.has_credentials()
    if use_angel:
        use_angel = angel.login()
        if not use_angel:
            print("[!] Falling back to Yahoo Finance")

    series: dict[str, pd.Series] = {}
    instruments_out = []
    failed = []

    print("Fetching historical prices...")
    for inst in INSTRUMENTS:
        symbol = inst["symbol"]
        is_international = not inst["token"] or inst["exchange"] not in ("NSE", "BSE", "MCX")
        print(f"  - {symbol} ({inst['name']})")
        s = None
        if use_angel and not is_international:
            try:
                s = angel.fetch_series(inst)
            except Exception as e:
                print(f"      [!] Angel fetch error: {e}")
        if s is None or len(s) < args.min_days:
            source = "Yahoo (international)" if is_international else "Yahoo fallback"
            print(f"      -> {source}")
            s = fetch_series_yahoo(inst["yahoo"], period="max")
        if s is None or len(s) < args.min_days:
            failed.append(symbol)
            continue
        series[symbol] = s
        instruments_out.append({
            "symbol": inst["symbol"],
            "name": inst["name"],
            "exchange": inst["exchange"],
            "token": inst["token"],
            "category": inst["category"],
        })
        csv_path = PRICES_DIR / f"{symbol}.csv"
        s.to_csv(csv_path, header=["close"])

    if not series:
        raise RuntimeError("No price series could be downloaded. Check network connectivity.")

    if failed:
        print(f"[!] Skipped {len(failed)} symbols due to fetch failures: {', '.join(failed)}")

    symbols = list(series.keys())

    # Store full per-symbol histories so the frontend can align any subset to its
    # maximum available common history ("all data since earliest date available").
    prices_full = [
        {"symbol": sym, "dates": series[sym].index.strftime("%Y-%m-%d").tolist(), "closes": series[sym].round(4).tolist()}
        for sym in symbols
    ]

    # Per-symbol stats use the full history of each instrument.
    stats = [compute_stats(sym, series[sym].values) for sym in symbols]

    # Default MVO covariance uses the default symbol set aligned to its own common dates
    # so the out-of-the-box optimizer gets the longest possible history for that basket.
    default_symbols = [s for s in DEFAULT_ALLOCATION_SYMBOLS if s in series]
    default_df = pd.DataFrame({s: series[s] for s in default_symbols}).dropna(how="any")
    default_cov, default_corr = compute_cov_corr(default_df.values)
    default_date_range = {
        "from": default_df.index.strftime("%Y-%m-%d").tolist()[0],
        "to": default_df.index.strftime("%Y-%m-%d").tolist()[-1],
    } if len(default_df) >= args.min_days else None

    # Full bundle date range spans every symbol.
    all_dates = sorted({d for s in series.values() for d in s.index.strftime("%Y-%m-%d").tolist()})

    market_data = {
        "symbols": symbols,
        "instruments": instruments_out,
        "prices": prices_full,
        "stats": stats,
        "covariance": default_cov.round(8).tolist() if default_cov is not None else [],
        "correlation": default_corr.round(4).tolist() if default_corr is not None else [],
        "defaultSymbols": default_symbols,
        "defaultDateRange": default_date_range,
        "dateRange": {"from": all_dates[0], "to": all_dates[-1]},
        "fetchedAt": datetime.now().astimezone().isoformat(),
        "source": "angel" if use_angel else "yahoo",
    }

    bundle_path = PUBLIC_DATA_DIR / "market-data.json"
    with open(bundle_path, "w") as f:
        json.dump(market_data, f, indent=2)

    print(f"[+] Saved {len(symbols)} price CSVs to {PRICES_DIR}")
    print(f"[+] Saved bundled market data to {bundle_path}")
    print(f"[+] Full bundle date span: {all_dates[0]} to {all_dates[-1]}")
    if default_date_range:
        print(f"[+] Default MVO basket date range: {default_date_range['from']} to {default_date_range['to']} ({len(default_df)} days)")
    print(f"[+] Data source: {market_data['source']}")


if __name__ == "__main__":
    main()
