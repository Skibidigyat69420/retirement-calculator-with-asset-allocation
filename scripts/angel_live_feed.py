#!/usr/bin/env python3
"""
Angel One live market-data feed to CSV.

Logs in once, fetches full market quotes for a configurable universe in batches,
and appends each snapshot as one row per symbol to data/live_feed.csv.

Usage:
    export ANGEL_API_KEY=...
    export ANGEL_CLIENT_CODE=...
    export ANGEL_PIN=...
    export ANGEL_TOTP_SECRET=...
    .venv/bin/python scripts/angel_live_feed.py

Output:
    data/live_feed.csv
        snapshot_time, symbol, exchange, token, open, high, low, close, ltp,
        change, percent_change, volume, total_buy_qty, total_sell_qty,
        bid_price, ask_price, bid_qty, ask_qty

Control the refresh interval with --interval (seconds) and the universe with
--universe (core|broad|all).
"""
import argparse
import csv
import os
import signal
import sys
import time
from datetime import datetime
from pathlib import Path

import pandas as pd

# Re-use the AngelSmartAPI class from fetch_angel_all.py
sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch_angel_all import AngelSmartAPI

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
LIVE_FEED_PATH = DATA_DIR / "live_feed.csv"
MASTER_PATH = DATA_DIR / "instruments_master.csv"

# Fields to extract from a full Angel One quote response.
QUOTE_FIELDS = [
    "open", "high", "low", "close", "ltp", "change", "percentChange",
    "volume", "totalBuyQty", "totalSellQty",
    "bidprice", "askprice", "bidqty", "askqty",
]


def load_universe(master: pd.DataFrame, mode: str = "core", max_stocks: int = 100):
    """Build a tradeable universe from the instrument master."""
    rows = []

    # Indices
    idx_mask = master["exch_seg"].isin(["NSE", "BSE", "MCX"]) & master["instrumenttype"].isin(["AMXIDX", "INDEX"])
    for _, r in master[idx_mask].iterrows():
        rows.append({
            "symbol": str(r["symbol"]).upper().replace(" ", "").replace("-", ""),
            "exchange": str(r["exch_seg"]).upper(),
            "token": str(r["token"]),
        })

    # Cash market (equities + ETFs)
    nse = master[(master["exch_seg"] == "NSE") & (master["instrumenttype"].isna() | (master["instrumenttype"] == ""))]

    if mode in ("broad", "all"):
        # Exclude bonds, mutual funds, BE series, prefs, warrants, rights.
        excluded = r"-N\d+$|-N[A-Z]$|-MF$|-BE$|-P$|-PS$|-W$|-R$|-T$|-SM$|-XT$|-D$|-E$|-N$"
        stocks = nse[~nse["symbol"].str.contains(excluded, case=False, na=False, regex=True)]
        stocks = stocks[stocks["symbol"].str.replace(r"-EQ$", "", regex=True).str.match(r"^[A-Z]+$", case=False, na=False)]
        limit = len(stocks) if mode == "all" else max_stocks
        for _, r in stocks.head(limit).iterrows():
            sym = str(r["symbol"]).upper()
            if sym.endswith("-EQ"):
                sym = sym[:-3]
            rows.append({
                "symbol": sym,
                "exchange": "NSE",
                "token": str(r["token"]),
            })

    # Deduplicate by exchange+token
    seen = set()
    unique = []
    for row in rows:
        key = (row["exchange"], row["token"])
        if key not in seen and row["token"]:
            seen.add(key)
            unique.append(row)

    return unique


def flatten_quote(quote: dict) -> dict:
    """Flatten one symbol's full quote into a CSV row."""
    depth = quote.get("depth") or {}
    buy = (depth.get("buy") or [{}])[0]
    sell = (depth.get("sell") or [{}])[0]
    return {
        "symbol": quote.get("tradingSymbol", ""),
        "exchange": quote.get("exchange", ""),
        "token": quote.get("symbolToken", ""),
        "open": quote.get("open"),
        "high": quote.get("high"),
        "low": quote.get("low"),
        "close": quote.get("close"),
        "ltp": quote.get("ltp"),
        "change": quote.get("netChange"),
        "percent_change": quote.get("percentChange"),
        "volume": quote.get("tradeVolume"),
        "total_buy_qty": quote.get("totBuyQuan"),
        "total_sell_qty": quote.get("totSellQuan"),
        "bid_price": buy.get("price"),
        "ask_price": sell.get("price"),
        "bid_qty": buy.get("quantity"),
        "ask_qty": sell.get("quantity"),
    }


def fetch_live_snapshot(api: AngelSmartAPI, universe: list) -> list:
    """Fetch one market snapshot for the whole universe."""
    snapshot_time = datetime.now().isoformat()
    rows = []
    batch_size = 50

    for i in range(0, len(universe), batch_size):
        batch = universe[i:i + batch_size]
        try:
            res = api.get_quotes(batch)
            if not res.get("status") or not isinstance(res.get("data"), dict):
                print(f"  [!] quote batch {i // batch_size + 1}: {res.get('message')}")
                continue
            data = res["data"]
            fetched = data.get("fetched") or []
            for quote in fetched:
                row = flatten_quote(quote)
                row["snapshot_time"] = snapshot_time
                rows.append(row)
            unfetched = data.get("unfetched") or []
            if unfetched:
                print(f"  [!] {len(unfetched)} unfetched in batch {i // batch_size + 1}")
        except Exception as e:
            print(f"  [!] batch {i // batch_size + 1} error: {e}")
        time.sleep(0.25)

    return rows


def append_to_csv(path: Path, rows: list):
    """Append snapshot rows to the live feed CSV, creating headers if needed."""
    if not rows:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    file_exists = path.exists() and path.stat().st_size > 0
    fieldnames = [
        "snapshot_time", "symbol", "exchange", "token", "open", "high", "low",
        "close", "ltp", "change", "percent_change", "volume", "total_buy_qty",
        "total_sell_qty", "bid_price", "ask_price", "bid_qty", "ask_qty",
    ]
    with open(path, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerows(rows)


def main():
    parser = argparse.ArgumentParser(description="Angel One live feed to CSV")
    parser.add_argument("--universe", choices=["core", "broad", "all"], default="core",
                        help="Symbol universe: core=indices+ETFs, broad=+top stocks, all=everything")
    parser.add_argument("--max-stocks", type=int, default=100, help="Max stocks in broad mode")
    parser.add_argument("--interval", type=int, default=60, help="Seconds between snapshots")
    parser.add_argument("--duration", type=int, default=0, help="Total seconds to run (0 = until interrupted)")
    parser.add_argument("--output", type=str, default=str(LIVE_FEED_PATH), help="Output CSV path")
    args = parser.parse_args()

    api = AngelSmartAPI()
    if not api.has_credentials():
        print("[-] Angel One credentials not configured.")
        return 1

    print("[+] Logging in...")
    if not api.login():
        return 1

    if not MASTER_PATH.exists():
        print(f"[-] Instrument master not found at {MASTER_PATH}. Run build_market_database.py first.")
        return 1

    master = pd.read_csv(MASTER_PATH, dtype=str)
    universe = load_universe(master, args.universe, args.max_stocks)
    print(f"[+] Universe: {len(universe)} symbols ({args.universe})")

    output_path = Path(args.output)
    stop_time = time.time() + args.duration if args.duration > 0 else None
    running = True

    def on_signal(signum, frame):
        nonlocal running
        print("\n[+] Stopping live feed...")
        running = False

    signal.signal(signal.SIGINT, on_signal)
    signal.signal(signal.SIGTERM, on_signal)

    print(f"[+] Starting live feed every {args.interval}s -> {output_path}")
    while running:
        snapshot_time = datetime.now().isoformat()
        print(f"[snapshot] {snapshot_time}")
        rows = fetch_live_snapshot(api, universe)
        append_to_csv(output_path, rows)
        print(f"  [+] {len(rows)} quotes appended")

        if stop_time and time.time() >= stop_time:
            break

        # Sleep in short chunks so CTRL-C is responsive.
        for _ in range(args.interval):
            if not running:
                break
            time.sleep(1)

    print(f"[+] Done. Feed saved to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
