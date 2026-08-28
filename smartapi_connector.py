"""
Angel One SmartAPI Python Connector Template
Requirements:
  pip install pyotp requests
  (or: pip install smartapi-python)
"""

import os
import json
import pyotp
import requests

# Pre-filled network information from your system
LOCAL_IP = os.getenv("ANGEL_LOCAL_IP", "192.168.68.61")
PUBLIC_IP = os.getenv("ANGEL_PUBLIC_IP", "122.170.251.47")
MAC_ADDRESS = os.getenv("ANGEL_MAC_ADDRESS", "b0:22:7a:74:16:ec")

# Credentials
API_KEY = os.getenv("ANGEL_API_KEY", "YOUR_API_KEY")
CLIENT_CODE = os.getenv("ANGEL_CLIENT_CODE", "YOUR_CLIENT_CODE")
PIN = os.getenv("ANGEL_PIN", "YOUR_PIN_OR_PASSWORD")
TOTP_SECRET = os.getenv("ANGEL_TOTP_SECRET", "YOUR_TOTP_SECRET_QR_CODE")

BASE_URL = "https://apiconnect.angelone.in"


class AngelSmartAPI:
    def __init__(self, api_key=API_KEY, client_code=CLIENT_CODE, pin=PIN, totp_secret=TOTP_SECRET):
        self.api_key = api_key
        self.client_code = client_code
        self.pin = pin
        self.totp_secret = totp_secret
        self.jwt_token = None
        self.refresh_token = None
        self.feed_token = None

    def get_totp(self):
        totp = pyotp.TOTP(self.totp_secret.replace(" ", "").upper())
        return totp.now()

    def get_headers(self, authenticated=False):
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

    def login(self):
        totp_code = self.get_totp()
        url = f"{BASE_URL}/rest/auth/angelbroking/user/v1/loginByPassword"
        payload = {
            "clientcode": self.client_code.upper(),
            "password": str(self.pin),
            "totp": str(totp_code),
        }
        response = requests.post(url, headers=self.get_headers(), json=payload)
        data = response.json()
        if data.get("status"):
            self.jwt_token = data["data"]["jwtToken"]
            self.refresh_token = data["data"]["refreshToken"]
            self.feed_token = data["data"]["feedToken"]
            print("[+] Login Successful!")
            return True
        else:
            print("[-] Login Failed:", data.get("message"))
            return False

    def get_profile(self):
        url = f"{BASE_URL}/rest/secure/angelbroking/user/v1/getProfile"
        return requests.get(url, headers=self.get_headers(authenticated=True)).json()

    def get_rms_funds(self):
        url = f"{BASE_URL}/rest/secure/angelbroking/user/v1/getRMS"
        return requests.get(url, headers=self.get_headers(authenticated=True)).json()

    def get_holdings(self):
        url = f"{BASE_URL}/rest/secure/angelbroking/portfolio/v1/getAllHolding"
        return requests.get(url, headers=self.get_headers(authenticated=True)).json()

    def get_positions(self):
        url = f"{BASE_URL}/rest/secure/angelbroking/order/v1/getPosition"
        return requests.get(url, headers=self.get_headers(authenticated=True)).json()


if __name__ == "__main__":
    api = AngelSmartAPI()
    if API_KEY != "YOUR_API_KEY":
        if api.login():
            print("\nProfile:", json.dumps(api.get_profile(), indent=2))
            print("\nFunds:", json.dumps(api.get_rms_funds(), indent=2))
            print("\nHoldings:", json.dumps(api.get_holdings(), indent=2))
    else:
        print("Set your credentials in environment variables or pass to AngelSmartAPI(...)")
