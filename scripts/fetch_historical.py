#!/usr/bin/env python3
"""
Fetch historical daily prices from Yahoo Finance and build the market-data
bundle used by the frontend. Falls back to assumption-driven synthetic data
if a symbol cannot be downloaded.

Usage:
    python scripts/fetch_historical.py
"""
import json
import os
from pathlib import Path
from datetime import datetime
from collections import OrderedDict

import yfinance as yf
import pandas as pd
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
PRICES_DIR = DATA_DIR / "prices"
PUBLIC_DATA_DIR = ROOT / "public" / "data"

# Symbol universe: internal symbol -> Yahoo Finance ticker
INSTRUMENTS = [
    {"symbol": "NIFTY50", "name": "NIFTY 50", "exchange": "NSE", "token": "99926000", "category": "index", "yahoo": "^NSEI"},
    {"symbol": "NIFTYNEXT50", "name": "NIFTY Next 50", "exchange": "NSE", "token": "99926007", "category": "index", "yahoo": "SETFNN50.NS"},
    {"symbol": "NIFTYMID150", "name": "NIFTY Midcap 150", "exchange": "NSE", "token": "99926012", "category": "index", "yahoo": "MID150BEES.NS"},
    {"symbol": "NIFTYSMALL250", "name": "NIFTY Smallcap 250", "exchange": "NSE", "token": "99926011", "category": "index", "yahoo": "SMALLCAP.NS"},
    {"symbol": "NIFTY500", "name": "NIFTY 500", "exchange": "NSE", "token": "99926013", "category": "index", "yahoo": "^CRSLDX"},
    {"symbol": "BANKNIFTY", "name": "NIFTY Bank", "exchange": "NSE", "token": "99926009", "category": "index", "yahoo": "^NSEBANK"},
    {"symbol": "SENSEX", "name": "S&P BSE SENSEX", "exchange": "BSE", "token": "99919000", "category": "index", "yahoo": "^BSESN"},
    {"symbol": "NIFTYBEES", "name": "Nippon India ETF Nifty BeES", "exchange": "NSE", "token": "590103", "category": "equity", "yahoo": "NIFTYBEES.NS"},
    {"symbol": "BANKBEES", "name": "Nippon India ETF Bank BeES", "exchange": "NSE", "token": "590106", "category": "equity", "yahoo": "BANKBEES.NS"},
    {"symbol": "GOLDBEES", "name": "Nippon India ETF Gold BeES", "exchange": "NSE", "token": "590095", "category": "gold", "yahoo": "GOLDBEES.NS"},
    {"symbol": "LIQUIDBEES", "name": "Nippon India ETF Liquid BeES", "exchange": "NSE", "token": "590070", "category": "debt", "yahoo": "LIQUIDBEES.NS"},
    {"symbol": "SETFNN50", "name": "SBI ETF Nifty Next 50", "exchange": "NSE", "token": "590111", "category": "equity", "yahoo": "SETFNN50.NS"},
    {"symbol": "LIQUIDCASE", "name": "DSP Liquidity ETF", "exchange": "NSE", "token": "541519", "category": "debt", "yahoo": "LIQUIDCASE.NS"},
    {"symbol": "GOLDCASE", "name": "Axis Gold ETF", "exchange": "NSE", "token": "590081", "category": "gold", "yahoo": "GOLDCASE.NS"},

    # US / International equity & bond ETFs
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

# Default MVO basket optimized for the longest available common history.
DEFAULT_ALLOCATION_SYMBOLS = ["NIFTY50", "NIFTY500", "BANKNIFTY", "GOLDBEES", "LIQUIDBEES"]
RISK_FREE_RATE = 0.06
TRADING_DAYS = 252


def fetch_series(ticker: str, period: str = "max"):
    """Download daily close prices for a Yahoo ticker from the earliest available date."""
    try:
        df = yf.Ticker(ticker).history(period=period, auto_adjust=True)
        if df.empty:
            return None
        # yfinance returns a MultiIndex column in newer versions
        close = df["Close"] if "Close" in df.columns else df.iloc[:, 0]
        close = close.dropna().sort_index()
        # Round to sensible precision and reset timezone
        close.index = close.index.tz_localize(None)
        return close.round(4)
    except Exception as e:
        print(f"[!] Failed to fetch {ticker}: {e}")
        return None


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


def main():
    PRICES_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)

    series: OrderedDict[str, pd.Series] = OrderedDict()
    instruments_out = []
    failed = []

    print("Fetching historical prices from Yahoo Finance...")
    for inst in INSTRUMENTS:
        print(f"  - {inst['symbol']} ({inst['yahoo']})")
        s = fetch_series(inst["yahoo"])
        if s is None or len(s) < 60:
            failed.append(inst["symbol"])
            continue
        series[inst["symbol"]] = s
        instruments_out.append({
            "symbol": inst["symbol"],
            "name": inst["name"],
            "exchange": inst["exchange"],
            "token": inst["token"],
            "category": inst["category"],
        })
        # Save individual CSV
        csv_path = PRICES_DIR / f"{inst['symbol']}.csv"
        s.to_csv(csv_path, header=["close"])

    if not series:
        raise RuntimeError("No price series could be downloaded. Check network connectivity.")

    if failed:
        print(f"[!] Skipped {len(failed)} symbols due to fetch failures: {', '.join(failed)}")

    # Align to common dates
    df = pd.DataFrame(series)
    df = df.dropna(how="any")
    common_dates = df.index.strftime("%Y-%m-%d").tolist()

    if len(common_dates) < 60:
        raise RuntimeError(f"Only {len(common_dates)} common trading days available; need at least 60.")

    symbols = list(series.keys())
    prices_aligned = [
        {"symbol": sym, "dates": common_dates, "closes": df[sym].round(4).tolist()}
        for sym in symbols
    ]

    # Build returns matrix
    close_matrix = df.values  # rows = dates, cols = symbols
    returns_matrix = np.log(close_matrix[1:] / close_matrix[:-1]).T.tolist()

    # Compute covariance and correlation matrices
    returns_array = np.array(returns_matrix)  # shape: symbols x observations
    means = returns_array.mean(axis=1, keepdims=True)
    obs = returns_array.shape[1]
    cov = ((returns_array - means) @ (returns_array - means).T) / (obs - 1)
    cov = cov * TRADING_DAYS  # annualize
    corr = np.zeros_like(cov)
    for i in range(len(symbols)):
        for j in range(len(symbols)):
            denom = np.sqrt(cov[i, i] * cov[j, j])
            corr[i, j] = cov[i, j] / denom if denom > 0 else 0.0

    # Compute stats from aligned closes
    stats = [compute_stats(sym, df[sym].values) for sym in symbols]

    market_data = {
        "symbols": symbols,
        "instruments": instruments_out,
        "prices": prices_aligned,
        "returnsMatrix": returns_matrix,
        "covariance": cov.round(8).tolist(),
        "correlation": corr.round(4).tolist(),
        "stats": stats,
        "dateRange": {"from": common_dates[0], "to": common_dates[-1]},
        "fetchedAt": datetime.utcnow().isoformat() + "Z",
        "source": "yahoo",
        "defaultSymbols": DEFAULT_ALLOCATION_SYMBOLS,
    }

    bundle_path = PUBLIC_DATA_DIR / "market-data.json"
    with open(bundle_path, "w") as f:
        json.dump(market_data, f, indent=2)

    print(f"[+] Saved {len(symbols)} price CSVs to {PRICES_DIR}")
    print(f"[+] Saved bundled market data to {bundle_path}")
    print(f"[+] Date range: {common_dates[0]} to {common_dates[-1]} ({len(common_dates)} days)")


if __name__ == "__main__":
    main()
