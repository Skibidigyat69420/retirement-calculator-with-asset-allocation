#!/usr/bin/env python3
"""
Angel One SmartAPI "SELECT *" extractor.

Logs in once and pulls every accessible endpoint:
  - user profile
  - RMS / funds / margins
  - holdings
  - positions (net + day)
  - order book
  - trade book
  - historical daily candles for all configured instruments
  - market quotes / LTPs for all configured instruments

Usage:
    export ANGEL_API_KEY=...
    export ANGEL_CLIENT_CODE=...
    export ANGEL_PIN=...
    export ANGEL_TOTP_SECRET=...
    python scripts/fetch_angel_all.py

Output:
    data/angel_one/{timestamp}/
        profile.json
        rms.json
        holdings.json
        positions.json
        order_book.json
        trade_book.json
        historical/
            {symbol}.csv
        quotes/
            {symbol}.json
        snapshot.json
"""
import argparse
import json
import os
import time
from datetime import datetime
from pathlib import Path

import pandas as pd
import requests

try:
    import pyotp
except ImportError:
    pyotp = None

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data" / "angel_one"

LOCAL_IP = os.getenv("ANGEL_LOCAL_IP", "192.168.68.61")
PUBLIC_IP = os.getenv("ANGEL_PUBLIC_IP", "122.170.251.47")
MAC_ADDRESS = os.getenv("ANGEL_MAC_ADDRESS", "b0:22:7a:74:16:ec")
BASE_URL = "https://apiconnect.angelone.in"

# Instrument universe. Must stay in sync with src/lib/instruments.ts.
INSTRUMENTS = [
    {"symbol": "NIFTY50", "name": "NIFTY 50", "exchange": "NSE", "token": "99926000", "category": "index"},
    {"symbol": "NIFTYNEXT50", "name": "NIFTY Next 50", "exchange": "NSE", "token": "99926007", "category": "index"},
    {"symbol": "NIFTYMID150", "name": "NIFTY Midcap 150", "exchange": "NSE", "token": "99926012", "category": "index"},
    {"symbol": "NIFTYSMALL250", "name": "NIFTY Smallcap 250", "exchange": "NSE", "token": "99926011", "category": "index"},
    {"symbol": "NIFTY500", "name": "NIFTY 500", "exchange": "NSE", "token": "99926013", "category": "index"},
    {"symbol": "BANKNIFTY", "name": "NIFTY Bank", "exchange": "NSE", "token": "99926009", "category": "index"},
    {"symbol": "SENSEX", "name": "S&P BSE SENSEX", "exchange": "BSE", "token": "99919000", "category": "index"},
    {"symbol": "NIFTYBEES", "name": "Nippon India ETF Nifty BeES", "exchange": "NSE", "token": "590103", "category": "equity"},
    {"symbol": "BANKBEES", "name": "Nippon India ETF Bank BeES", "exchange": "NSE", "token": "590106", "category": "equity"},
    {"symbol": "GOLDBEES", "name": "Nippon India ETF Gold BeES", "exchange": "NSE", "token": "590095", "category": "gold"},
    {"symbol": "LIQUIDBEES", "name": "Nippon India ETF Liquid BeES", "exchange": "NSE", "token": "590070", "category": "debt"},
    {"symbol": "SETFNN50", "name": "SBI ETF Nifty Next 50", "exchange": "NSE", "token": "590111", "category": "equity"},
    {"symbol": "LIQUIDCASE", "name": "DSP Liquidity ETF", "exchange": "NSE", "token": "541519", "category": "debt"},
    {"symbol": "GOLDCASE", "name": "Axis Gold ETF", "exchange": "NSE", "token": "590081", "category": "gold"},
]


class AngelSmartAPI:
    def __init__(self):
        self.api_key = os.getenv("ANGEL_API_KEY", "")
        self.client_code = os.getenv("ANGEL_CLIENT_CODE", "")
        self.pin = os.getenv("ANGEL_PIN", "")
        self.totp_secret = os.getenv("ANGEL_TOTP_SECRET", "")
        self.jwt_token = None
        self.refresh_token = None
        self.feed_token = None
        self._session = requests.Session()

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
        url = f"{BASE_URL}/rest/auth/angelbroking/user/v1/loginByPassword"
        payload = {
            "clientcode": self.client_code.upper(),
            "password": str(self.pin),
            "totp": self._totp(),
        }
        response = self._session.post(url, headers=self._headers(), json=payload, timeout=30)
        data = response.json()
        if data.get("status") and data.get("data"):
            self.jwt_token = data["data"]["jwtToken"]
            self.refresh_token = data["data"]["refreshToken"]
            self.feed_token = data["data"]["feedToken"]
            return True
        print(f"[-] Login failed: {data.get('message')}")
        return False

    def get(self, path: str):
        url = f"{BASE_URL}{path}"
        response = self._session.get(url, headers=self._headers(authenticated=True), timeout=30)
        return response.json()

    def post(self, path: str, payload: dict):
        url = f"{BASE_URL}{path}"
        response = self._session.post(url, headers=self._headers(authenticated=True), json=payload, timeout=30)
        return response.json()

    # User / Account
    def get_profile(self): return self.get("/rest/secure/angelbroking/user/v1/getProfile")
    def get_rms(self): return self.get("/rest/secure/angelbroking/user/v1/getRMS")

    # Portfolio
    def get_holdings(self): return self.get("/rest/secure/angelbroking/portfolio/v1/getAllHolding")
    def get_positions(self): return self.get("/rest/secure/angelbroking/order/v1/getPosition")

    # Orders / Trades
    def get_order_book(self): return self.get("/rest/secure/angelbroking/order/v1/getOrderBook")
    def get_trade_book(self): return self.get("/rest/secure/angelbroking/order/v1/getTradeBook")

    # Historical candles
    def get_candle_data(self, exchange: str, token: str, interval: str, fromdate: str, todate: str):
        payload = {
            "exchange": exchange,
            "symboltoken": token,
            "interval": interval,
            "fromdate": fromdate,
            "todate": todate,
        }
        return self.post("/rest/secure/angelbroking/historical/v1/getCandleData", payload)

    # Market data
    def get_quotes(self, instruments: list):
        # instruments: list of {exchange, symboltoken}
        payload = {"mode": "FULL", "exchangeTokens": {}}
        for inst in instruments:
            exch = inst["exchange"]
            payload["exchangeTokens"].setdefault(exch, []).append(inst["token"])
        return self.post("/rest/secure/angelbroking/market/v1/quote", payload)

    def get_ltps(self, instruments: list):
        payload = {"exchangeTokens": {}}
        for inst in instruments:
            exch = inst["exchange"]
            payload["exchangeTokens"].setdefault(exch, []).append(inst["token"])
        return self.post("/rest/secure/angelbroking/market/v1/quoteLTP", payload)


def save_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2, default=str)


def fetch_all_historical(api: AngelSmartAPI, out_dir: Path, fromdate: str = "2000-01-01 09:15", todate: str = None):
    if todate is None:
        todate = datetime.now().strftime("%Y-%m-%d 15:30")

    hist_dir = out_dir / "historical"
    hist_dir.mkdir(parents=True, exist_ok=True)

    for inst in INSTRUMENTS:
        symbol = inst["symbol"]
        print(f"  [hist] {symbol}")
        try:
            res = api.get_candle_data(inst["exchange"], inst["token"], "ONE_DAY", fromdate, todate)
            if not res.get("status") or not isinstance(res.get("data"), list):
                print(f"      [!] no data: {res.get('message')}")
                continue
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
            df.to_csv(hist_dir / f"{symbol}.csv", index=False)
        except Exception as e:
            print(f"      [!] error: {e}")
        time.sleep(0.25)


def fetch_all_quotes(api: AngelSmartAPI, out_dir: Path):
    quotes_dir = out_dir / "quotes"
    quotes_dir.mkdir(parents=True, exist_ok=True)

    # Fetch in batches of 50 to keep payload reasonable.
    batch_size = 50
    for i in range(0, len(INSTRUMENTS), batch_size):
        batch = INSTRUMENTS[i:i + batch_size]
        print(f"  [quote] batch {i // batch_size + 1} ({len(batch)} symbols)")
        try:
            res = api.get_quotes(batch)
            save_json(quotes_dir / f"batch_{i // batch_size + 1}.json", res)
            if res.get("status") and res.get("data"):
                for token_key, quote in res["data"].items():
                    symbol = token_key.split("|")[-1] if "|" in token_key else token_key
                    save_json(quotes_dir / f"{symbol}.json", quote)
        except Exception as e:
            print(f"      [!] error: {e}")
        time.sleep(0.5)


def main():
    parser = argparse.ArgumentParser(description="Angel One SmartAPI SELECT * extractor")
    parser.add_argument("--skip-historical", action="store_true", help="Skip historical candle download")
    parser.add_argument("--skip-quotes", action="store_true", help="Skip market quote download")
    parser.add_argument("--output", type=str, default=None, help="Output directory name (default: timestamp)")
    args = parser.parse_args()

    api = AngelSmartAPI()
    if not api.has_credentials():
        print("[-] Angel One credentials not configured. Set ANGEL_API_KEY, ANGEL_CLIENT_CODE, ANGEL_PIN, ANGEL_TOTP_SECRET in .env")
        return 1

    print("[+] Logging in...")
    if not api.login():
        return 1

    timestamp = args.output or datetime.now().strftime("%Y%m%d_%H%M%S")
    out_dir = DATA_DIR / timestamp
    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"[+] Output directory: {out_dir}")

    snapshot = {
        "timestamp": datetime.now().isoformat(),
        "client_code": api.client_code,
        "files": {},
    }

    # 1. User profile
    print("[+] Fetching profile...")
    profile = api.get_profile()
    save_json(out_dir / "profile.json", profile)
    snapshot["files"]["profile"] = "profile.json"

    # 2. RMS / funds
    print("[+] Fetching RMS / funds...")
    rms = api.get_rms()
    save_json(out_dir / "rms.json", rms)
    snapshot["files"]["rms"] = "rms.json"

    # 3. Holdings
    print("[+] Fetching holdings...")
    holdings = api.get_holdings()
    save_json(out_dir / "holdings.json", holdings)
    snapshot["files"]["holdings"] = "holdings.json"

    # 4. Positions
    print("[+] Fetching positions...")
    positions = api.get_positions()
    save_json(out_dir / "positions.json", positions)
    snapshot["files"]["positions"] = "positions.json"

    # 5. Order book
    print("[+] Fetching order book...")
    order_book = api.get_order_book()
    save_json(out_dir / "order_book.json", order_book)
    snapshot["files"]["order_book"] = "order_book.json"

    # 6. Trade book
    print("[+] Fetching trade book...")
    trade_book = api.get_trade_book()
    save_json(out_dir / "trade_book.json", trade_book)
    snapshot["files"]["trade_book"] = "trade_book.json"

    # 7. Historical candles
    if not args.skip_historical:
        print("[+] Fetching historical candles...")
        fetch_all_historical(api, out_dir)
        snapshot["files"]["historical"] = "historical/{symbol}.csv"

    # 8. Market quotes
    if not args.skip_quotes:
        print("[+] Fetching market quotes...")
        fetch_all_quotes(api, out_dir)
        snapshot["files"]["quotes"] = "quotes/{symbol}.json"

    save_json(out_dir / "snapshot.json", snapshot)
    print(f"[+] Snapshot saved: {out_dir / 'snapshot.json'}")
    print("[+] Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
