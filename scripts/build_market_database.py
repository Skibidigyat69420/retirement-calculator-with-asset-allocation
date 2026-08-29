#!/usr/bin/env python3
"""
Market database builder: `SELECT *` for Angel One + Yahoo Finance.

Downloads the full Angel One instrument master, fetches daily historical
prices for the requested universe, merges with yfinance international data,
and writes a consolidated backend bundle used by the MVO and Monte Carlo
engines.

Usage:
    export ANGEL_API_KEY=...
    export ANGEL_CLIENT_CODE=...
    export ANGEL_PIN=...
    export ANGEL_TOTP_SECRET=...
    .venv/bin/python scripts/build_market_database.py

Output:
    data/instruments_master.csv       full Angel One instrument master
    data/prices/{symbol}.csv          one CSV per fetched symbol
    public/data/market-data.json      aligned price matrix + metadata
"""
import argparse
import json
import os
import time
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import requests
import yfinance as yf

from fetch_angel_all import AngelSmartAPI, fetch_series_yahoo, save_json

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
PRICES_DIR = DATA_DIR / "prices"
PUBLIC_DATA_DIR = ROOT / "public" / "data"
MASTER_URL = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"

# International ETFs fetched from Yahoo Finance.
YAHOO_UNIVERSE = [
    {"symbol": "SPY", "name": "SPDR S&P 500 ETF Trust", "exchange": "NYSE", "yahoo": "SPY", "category": "equity"},
    {"symbol": "QQQ", "name": "Invesco QQQ Trust", "exchange": "NASDAQ", "yahoo": "QQQ", "category": "equity"},
    {"symbol": "VTI", "name": "Vanguard Total Stock Market ETF", "exchange": "NYSE", "yahoo": "VTI", "category": "equity"},
    {"symbol": "VT", "name": "Vanguard Total World Stock ETF", "exchange": "NYSE", "yahoo": "VT", "category": "equity"},
    {"symbol": "VXUS", "name": "Vanguard Total International Stock ETF", "exchange": "NASDAQ", "yahoo": "VXUS", "category": "equity"},
    {"symbol": "EEM", "name": "iShares MSCI Emerging Markets ETF", "exchange": "NYSE", "yahoo": "EEM", "category": "equity"},
    {"symbol": "BND", "name": "Vanguard Total Bond Market ETF", "exchange": "NASDAQ", "yahoo": "BND", "category": "debt"},
    {"symbol": "TLT", "name": "iShares 20+ Year Treasury Bond ETF", "exchange": "NASDAQ", "yahoo": "TLT", "category": "debt"},
    {"symbol": "GLD", "name": "SPDR Gold Shares", "exchange": "NYSE", "yahoo": "GLD", "category": "gold"},
    {"symbol": "AGG", "name": "iShares Core U.S. Aggregate Bond ETF", "exchange": "NYSE", "yahoo": "AGG", "category": "debt"},
    {"symbol": "IEF", "name": "iShares 7-10 Year Treasury Bond ETF", "exchange": "NASDAQ", "yahoo": "IEF", "category": "debt"},
    {"symbol": "VWO", "name": "Vanguard FTSE Emerging Markets ETF", "exchange": "NYSE", "yahoo": "VWO", "category": "equity"},
    {"symbol": "VEA", "name": "Vanguard FTSE Developed Markets ETF", "exchange": "NYSE", "yahoo": "VEA", "category": "equity"},
    {"symbol": "IJH", "name": "iShares Core S&P Mid-Cap ETF", "exchange": "NYSE", "yahoo": "IJH", "category": "equity"},
    {"symbol": "IJR", "name": "iShares Core S&P Small-Cap ETF", "exchange": "NYSE", "yahoo": "IJR", "category": "equity"},
    {"symbol": "VNQ", "name": "Vanguard Real Estate ETF", "exchange": "NYSE", "yahoo": "VNQ", "category": "equity"},
    {"symbol": "DBC", "name": "Invesco DB Commodity Index Tracking Fund", "exchange": "NYSE", "yahoo": "DBC", "category": "commodity"},
]


def download_instrument_master():
    """Download and cache the full Angel One instrument master."""
    master_path = DATA_DIR / "instruments_master.csv"
    print("[+] Downloading instrument master...")
    r = requests.get(MASTER_URL, timeout=120)
    r.raise_for_status()
    data = r.json()
    df = pd.DataFrame(data)
    df.columns = [c.lower().strip() for c in df.columns]
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(master_path, index=False)
    print(f"[+] Saved {len(df):,} instruments to {master_path}")
    return df


def load_instrument_master(refresh: bool = False):
    master_path = DATA_DIR / "instruments_master.csv"
    if not master_path.exists() or refresh:
        return download_instrument_master()
    return pd.read_csv(master_path, dtype=str)


def clean_symbol(row: pd.Series) -> str:
    """Return a canonical symbol from an instrument master row."""
    itype = str(row.get("instrumenttype", "")).strip()
    symbol = str(row.get("symbol", "")).strip()
    name = str(row.get("name", "")).strip()
    token = str(row.get("token", "")).strip()

    # Manual overrides for indices where the display symbol differs from the
    # canonical ticker used elsewhere in the app.
    INDEX_TOKEN_MAP = {
        "99926009": "BANKNIFTY",   # display: Nifty Bank
        "99919000": "SENSEX",      # display: S&P BSE SENSEX
    }
    if token in INDEX_TOKEN_MAP:
        return INDEX_TOKEN_MAP[token]

    if itype in ("AMXIDX", "INDEX"):
        # Indices: use the display symbol, normalized to a ticker-like name.
        return symbol.upper().replace(" ", "").replace("-", "")

    # Cash equities / ETFs: symbol usually ends in -EQ; strip it.
    sym = symbol.upper()
    if sym.endswith("-EQ"):
        sym = sym[:-3]
    return sym.replace(" ", "")


def build_universe(master: pd.DataFrame, mode: str, max_stocks: int = 500):
    """
    Build the target symbol universe from the instrument master.

    Modes:
      - core: indices + ETFs only (fast, ~200 symbols)
      - broad: core + top NSE cash stocks by name presence (default 500)
      - all: everything in the master with a token (very slow, thousands)
    """
    rows = []

    # --- NSE / BSE / MCX indices
    idx_mask = master["exch_seg"].isin(["NSE", "BSE", "MCX"]) & master["instrumenttype"].isin(["AMXIDX", "INDEX"])
    for _, r in master[idx_mask].iterrows():
        rows.append({
            "symbol": clean_symbol(r),
            "name": r["name"],
            "exchange": r["exch_seg"],
            "token": r["token"],
            "category": "index",
            "source": "angel",
        })

    # --- NSE ETFs (cash market symbols containing ETF/BEES etc.)
    # Cash-market rows have instrumenttype as NaN / empty.
    nse = master[(master["exch_seg"] == "NSE") & (master["instrumenttype"].isna() | (master["instrumenttype"] == ""))]
    etf_mask = nse["name"].str.contains(r"ETF|BEES|LIQUID|GOLD|NIFTY|BANK|PSU|CPSE|INFRABEES|SHARIABEES", case=False, na=False)
    for _, r in nse[etf_mask].iterrows():
        # Avoid duplicating indices that may have slipped through
        rows.append({
            "symbol": clean_symbol(r),
            "name": r["name"],
            "exchange": "NSE",
            "token": r["token"],
            "category": "equity",
            "source": "angel",
        })

    # --- Top NSE cash stocks (broad mode)
    if mode in ("broad", "all"):
        stocks = nse[~etf_mask].copy()
        # Exclude bonds/NCDs, mutual funds, BE/illiquid series, prefs, warrants, rights.
        excluded_suffixes = (r"-N\d+$|-N[A-Z]$|-MF$|-BE$|-P$|-PS$|-W$|-R$|-T$|-SM$|-XT$|-D$|-E$|-N$")
        stocks = stocks[~stocks["symbol"].str.contains(excluded_suffixes, case=False, na=False, regex=True)]
        # After stripping -EQ, the ticker should be alphabetic only (no embedded digits).
        stocks = stocks[stocks["symbol"].str.replace(r"-EQ$", "", regex=True).str.match(r"^[A-Z]+$", case=False, na=False)]
        # Prefer large-cap / liquid names first, then alphabetical.
        large_cap = {
            "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN", "BHARTIARTL",
            "ITC", "KOTAKBANK", "LT", "AXISBANK", "HCLTECH", "WIPRO", "MARUTI",
            "SUNPHARMA", "TATAMOTORS", "ONGC", "NTPC", "POWERGRID", "COALINDIA",
            "HDFC", "ICICI", "KOTAK", "AXIS", "HCL", "SBILIFE", "TATASTEEL",
            "ULTRACEMCO", "BAJFINANCE", "BAJAJFINSV", "ASIANPAINT", "NESTLEIND",
            "TITAN", "TECHM", "ADANIENT", "ADANIPORTS", "GRASIM", "CIPLA",
            "DIVISLAB", "DRREDDY", "EICHERMOT", "HEROMOTOCO", "HINDALCO",
            "INDUSINDBK", "JSWSTEEL", "M&M", "BAJAJAUTO", "APOLLOHOSP", "BRITANNIA",
            "HDFCLIFE", "TATACONSUM", "UPL", "VEDL", "SHREECEM",
        }
        stocks["clean_symbol"] = stocks["symbol"].str.replace(r"-EQ$", "", regex=True).str.upper()
        stocks["priority"] = stocks["clean_symbol"].isin(large_cap).astype(int)
        stocks = stocks.sort_values(["priority", "symbol"], ascending=[False, True])
        limit = len(stocks) if mode == "all" else max_stocks
        for _, r in stocks.head(limit).iterrows():
            rows.append({
                "symbol": clean_symbol(r),
                "name": r["name"],
                "exchange": "NSE",
                "token": r["token"],
                "category": "equity",
                "source": "angel",
            })

    # --- International ETFs via Yahoo Finance
    for inst in YAHOO_UNIVERSE:
        rows.append({
            "symbol": inst["symbol"],
            "name": inst["name"],
            "exchange": inst["exchange"],
            "token": "",
            "category": inst.get("category", "equity"),
            "source": "yahoo",
            "yahoo": inst["yahoo"],
        })

    # Deduplicate by symbol (Angel symbols override Yahoo if clash)
    seen = {}
    unique = []
    for r in rows:
        sym = r["symbol"]
        if sym not in seen:
            seen[sym] = True
            unique.append(r)
    print(f"[+] Universe: {len(unique):,} symbols (mode={mode})")
    return unique


def fetch_angel_historical(api: AngelSmartAPI, inst: dict, fromdate: str, todate: str):
    """Fetch one symbol's daily candles from Angel One."""
    res = api.get_candle_data(inst["exchange"], inst["token"], "ONE_DAY", fromdate, todate)
    if not res.get("status") or not isinstance(res.get("data"), list):
        msg = res.get("message", "unknown")
        return None, msg
    rows = []
    for row in res["data"]:
        rows.append({
            "datetime": row[0],
            "open": row[1],
            "high": row[2],
            "low": row[3],
            "close": row[4],
            "volume": row[5],
        })
    df = pd.DataFrame(rows)
    return df, None


def fetch_one_symbol(args):
    """Worker: fetch one symbol and write CSV."""
    inst, api_kwargs, fromdate, todate, delay = args
    symbol = inst["symbol"]
    path = PRICES_DIR / f"{symbol}.csv"

    # Resume if already exists and recent
    if path.exists():
        try:
            existing = pd.read_csv(path)
            if len(existing) >= 100:
                return {"symbol": symbol, "status": "cached", "rows": len(existing)}
        except Exception:
            pass

    try:
        if inst.get("source") == "yahoo":
            s = fetch_series_yahoo(inst.get("yahoo", symbol), period="max")
            if s is None or len(s) < 60:
                return {"symbol": symbol, "status": "no_data"}
            df = pd.DataFrame({
                "datetime": s.index,
                "open": s.values,
                "high": s.values,
                "low": s.values,
                "close": s.values,
                "volume": 0,
            })
        else:
            # Lazy API init per worker so we don't share sessions across threads
            api = AngelSmartAPI(**api_kwargs)
            if not api.login():
                return {"symbol": symbol, "status": "login_failed"}
            df, err = fetch_angel_historical(api, inst, fromdate, todate)
            if df is None:
                return {"symbol": symbol, "status": "error", "error": err}
            time.sleep(delay)

        if df.empty:
            return {"symbol": symbol, "status": "no_data"}
        PRICES_DIR.mkdir(parents=True, exist_ok=True)
        df.to_csv(path, index=False)
        return {"symbol": symbol, "status": "ok", "rows": len(df)}
    except Exception as e:
        return {"symbol": symbol, "status": "exception", "error": str(e)}


def fetch_historical_universe(universe: list, api_kwargs: dict, fromdate: str, todate: str, workers: int = 3, delay: float = 0.4):
    """Fetch historical prices for the whole universe with thread pool."""
    PRICES_DIR.mkdir(parents=True, exist_ok=True)
    tasks = [(inst, api_kwargs, fromdate, todate, delay) for inst in universe]

    results = []
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futures = {ex.submit(fetch_one_symbol, t): t[0]["symbol"] for t in tasks}
        for fut in as_completed(futures):
            sym = futures[fut]
            try:
                res = fut.result()
            except Exception as e:
                res = {"symbol": sym, "status": "future_exception", "error": str(e)}
            results.append(res)
            if res["status"] == "ok":
                print(f"  [ok] {sym}: {res['rows']} rows")
            elif res["status"] in ("no_data", "error", "exception"):
                print(f"  [!] {sym}: {res.get('error', res['status'])}")

    ok = sum(1 for r in results if r["status"] == "ok")
    cached = sum(1 for r in results if r["status"] == "cached")
    failed = len(results) - ok - cached
    print(f"[+] Historical fetch complete: {ok} fetched, {cached} cached, {failed} failed")
    return results


RISK_FREE_RATE = 0.06
TRADING_DAYS = 252
DEFAULT_ALLOCATION_SYMBOLS = ["NIFTY50", "NIFTY500", "BANKNIFTY", "GOLDBEES", "LIQUIDBEES"]


def _compute_log_returns(closes: np.ndarray):
    return np.log(closes[1:] / closes[:-1])


def _compute_stats(symbol: str, closes: np.ndarray):
    returns = _compute_log_returns(closes)
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


def build_bundle(universe: list, output_path: Path):
    """Build the frontend MarketDataSet bundle from all CSVs."""
    print("[+] Building market-data bundle...")
    series: dict[str, pd.Series] = {}
    instruments_out = []

    for inst in universe:
        sym = inst["symbol"]
        path = PRICES_DIR / f"{sym}.csv"
        if not path.exists() or path.stat().st_size == 0:
            continue
        try:
            df = pd.read_csv(path, dtype={"datetime": str})
        except pd.errors.EmptyDataError:
            continue
        if df.empty or "close" not in df.columns:
            continue
        date_col = "datetime" if "datetime" in df.columns else ("Date" if "Date" in df.columns else None)
        if date_col is None:
            continue
        df[date_col] = pd.to_datetime(df[date_col]).dt.strftime("%Y-%m-%d")
        df = df.drop_duplicates(subset=[date_col], keep="first").sort_values(date_col)
        s = pd.Series(df["close"].values, index=df[date_col].values, name=sym)
        series[sym] = s
        instruments_out.append({
            "symbol": sym,
            "name": inst.get("name", sym),
            "exchange": inst.get("exchange", ""),
            "token": inst.get("token", ""),
            "category": inst.get("category", "equity"),
        })

    if not series:
        print("[-] No price data available to bundle")
        return None

    # Build full price list first (each symbol keeps its own date range)
    full_prices = [
        {"symbol": sym, "dates": s.index.tolist(), "closes": s.round(4).tolist()}
        for sym, s in series.items()
    ]

    # For covariance/stats, start from the default MVO basket (longest common
    # history) and add any other symbol that covers at least 95% of that range.
    min_days = 500
    long_series = {sym: s for sym, s in series.items() if len(s) >= min_days}
    print(f"[+] {len(long_series)}/{len(series)} symbols have >= {min_days} days of history")

    if len(long_series) < 2:
        print(f"[-] Only {len(long_series)} symbol(s) with sufficient history")
        return None

    # Anchor on default symbols that we actually fetched
    anchor_symbols = [s for s in DEFAULT_ALLOCATION_SYMBOLS if s in long_series]
    if len(anchor_symbols) < 2:
        anchor_symbols = list(long_series.keys())[:5]
    anchor_df = pd.DataFrame({s: long_series[s] for s in anchor_symbols})
    anchor_df = anchor_df.dropna(how="any")
    anchor_start = anchor_df.index[0]
    anchor_end = anchor_df.index[-1]
    anchor_range = pd.date_range(anchor_start, anchor_end, freq="B")
    print(f"[+] Anchor range ({len(anchor_df)} days): {anchor_start} -> {anchor_end}")

    selected = {s: long_series[s] for s in anchor_symbols}
    for sym, s in long_series.items():
        if sym in selected:
            continue
        overlap = len(s.loc[anchor_start:anchor_end])
        if overlap >= len(anchor_range) * 0.95:
            selected[sym] = s

    df = pd.DataFrame(selected)
    df = df.dropna(how="any")
    if len(df) < 60:
        print(f"[-] Only {len(df)} common trading days available; need at least 60.")
        return None

    common_dates = [str(d)[:10] for d in df.index.tolist()]
    symbols = list(selected.keys())

    prices_aligned = [
        {"symbol": sym, "dates": common_dates, "closes": df[sym].round(4).tolist()}
        for sym in symbols
    ]

    close_matrix = df.values
    returns_matrix = np.log(close_matrix[1:] / close_matrix[:-1]).T.tolist()
    returns_array = np.array(returns_matrix)
    means = returns_array.mean(axis=1, keepdims=True)
    obs = returns_array.shape[1]
    cov = ((returns_array - means) @ (returns_array - means).T) / (obs - 1)
    cov = cov * TRADING_DAYS
    corr = np.zeros_like(cov)
    for i in range(len(symbols)):
        for j in range(len(symbols)):
            denom = np.sqrt(cov[i, i] * cov[j, j])
            corr[i, j] = cov[i, j] / denom if denom > 0 else 0.0

    stats = [_compute_stats(sym, df[sym].values) for sym in symbols]

    market_data = {
        "symbols": symbols,
        "instruments": [i for i in instruments_out if i["symbol"] in symbols],
        "prices": prices_aligned,
        "returnsMatrix": returns_matrix,
        "covariance": cov.round(8).tolist(),
        "correlation": corr.round(4).tolist(),
        "stats": stats,
        "dateRange": {"from": common_dates[0], "to": common_dates[-1]},
        "defaultSymbols": DEFAULT_ALLOCATION_SYMBOLS,
        "defaultDateRange": {"from": common_dates[0], "to": common_dates[-1]},
        "fetchedAt": datetime.utcnow().isoformat() + "Z",
        "source": "angel",
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(market_data, f, indent=2, default=str)
    print(f"[+] Bundle saved: {output_path} ({len(common_dates):,} days x {len(symbols)} symbols)")
    return market_data


def main():
    parser = argparse.ArgumentParser(description="Build market database from Angel One + Yahoo Finance")
    parser.add_argument("--refresh-master", action="store_true", help="Re-download instrument master")
    parser.add_argument("--mode", choices=["core", "broad", "all"], default="broad",
                        help="Universe size: core=indices+ETFs, broad=+top stocks, all=everything")
    parser.add_argument("--max-stocks", type=int, default=500,
                        help="Max NSE cash stocks in broad mode (ignored for all)")
    parser.add_argument("--workers", type=int, default=3, help="Parallel fetch workers")
    parser.add_argument("--delay", type=float, default=0.4, help="Delay between Angel API calls")
    parser.add_argument("--from-date", type=str, default="2000-01-01 09:15",
                        help="Start date for historical candles")
    parser.add_argument("--to-date", type=str, default=None,
                        help="End date for historical candles (default: now)")
    parser.add_argument("--skip-fetch", action="store_true", help="Skip fetch, only rebuild bundle")
    parser.add_argument("--skip-master", action="store_true", help="Skip instrument master download")
    args = parser.parse_args()

    todate = args.to_date or datetime.now().strftime("%Y-%m-%d 15:30")

    # Credentials (read from env only, never written to disk)
    api_kwargs = {
        "api_key": os.getenv("ANGEL_API_KEY", ""),
        "client_code": os.getenv("ANGEL_CLIENT_CODE", ""),
        "pin": os.getenv("ANGEL_PIN", ""),
        "totp_secret": os.getenv("ANGEL_TOTP_SECRET", ""),
    }
    if not all(api_kwargs.values()) or api_kwargs["api_key"] == "your_api_key_here":
        print("[-] Angel One credentials not configured. Set ANGEL_API_KEY, ANGEL_CLIENT_CODE, ANGEL_PIN, ANGEL_TOTP_SECRET.")
        return 1

    # 1. Instrument master
    if not args.skip_master:
        master = load_instrument_master(refresh=args.refresh_master)
    else:
        master = load_instrument_master(refresh=False)

    # 2. Universe
    universe = build_universe(master, args.mode, args.max_stocks)

    # Save universe manifest
    manifest_path = DATA_DIR / "universe_manifest.json"
    save_json(manifest_path, universe)
    print(f"[+] Universe manifest: {manifest_path}")

    # 3. Fetch prices
    if not args.skip_fetch:
        fetch_historical_universe(
            universe, api_kwargs,
            fromdate=args.from_date,
            todate=todate,
            workers=args.workers,
            delay=args.delay,
        )

    # 4. Build bundle
    bundle = build_bundle(universe, PUBLIC_DATA_DIR / "market-data.json")
    if bundle is None:
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
