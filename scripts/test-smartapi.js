/**
 * Angel One SmartAPI Standalone Test Script (Node.js)
 * Run with: node scripts/test-smartapi.js
 */

import * as OTPAuth from 'otpauth';

// Configure your credentials or pass via environment variables
const API_KEY = process.env.ANGEL_API_KEY || 'YOUR_API_KEY';
const CLIENT_CODE = process.env.ANGEL_CLIENT_CODE || 'YOUR_CLIENT_CODE';
const PIN = process.env.ANGEL_PIN || 'YOUR_PIN_OR_PASSWORD';
const TOTP_SECRET = process.env.ANGEL_TOTP_SECRET || 'YOUR_TOTP_SECRET_OR_EMPTY';

// Network details
const LOCAL_IP = process.env.ANGEL_LOCAL_IP || '192.168.68.61';
const PUBLIC_IP = process.env.ANGEL_PUBLIC_IP || '122.170.251.47';
const MAC_ADDRESS = process.env.ANGEL_MAC_ADDRESS || 'b0:22:7a:74:16:ec';

const BASE_URL = 'https://apiconnect.angelone.in';

function getTOTP(secret) {
  if (!secret || secret === 'YOUR_TOTP_SECRET_OR_EMPTY') {
    throw new Error('Please specify a valid ANGEL_TOTP_SECRET');
  }
  const clean = secret.replace(/[\s-]/g, '').toUpperCase();
  const totp = new OTPAuth.TOTP({
    issuer: 'AngelOne',
    label: 'SmartAPI',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(clean),
  });
  return totp.generate();
}

async function run() {
  console.log('==================================================');
  console.log('  Angel One SmartAPI Connection Tester');
  console.log('==================================================');
  console.log(`- Local IP    : ${LOCAL_IP}`);
  console.log(`- Public IP   : ${PUBLIC_IP}`);
  console.log(`- MAC Address : ${MAC_ADDRESS}`);
  console.log(`- Client Code : ${CLIENT_CODE}`);
  console.log(`- API Key     : ${API_KEY ? API_KEY.slice(0, 4) + '...' + API_KEY.slice(-4) : 'Not Set'}`);

  if (API_KEY === 'YOUR_API_KEY' || CLIENT_CODE === 'YOUR_CLIENT_CODE') {
    console.log('\n[!] Please provide your credentials:');
    console.log('    Either update the variables in this script or run:');
    console.log('    ANGEL_API_KEY="xxx" ANGEL_CLIENT_CODE="yyy" ANGEL_PIN="1234" ANGEL_TOTP_SECRET="zzz" node scripts/test-smartapi.js\n');
    process.exit(0);
  }

  let totpCode = '';
  try {
    totpCode = getTOTP(TOTP_SECRET);
    console.log(`- Generated 6-digit TOTP: ${totpCode}`);
  } catch (err) {
    console.error(`- TOTP Generation Error: ${err.message}`);
    process.exit(1);
  }

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-UserType': 'USER',
    'X-SourceID': 'WEB',
    'X-ClientLocalIP': LOCAL_IP,
    'X-ClientPublicIP': PUBLIC_IP,
    'X-MACAddress': MAC_ADDRESS,
    'X-PrivateKey': API_KEY,
  };

  console.log('\n1. Logging in to Angel One SmartAPI...');
  try {
    const loginRes = await fetch(`${BASE_URL}/rest/auth/angelbroking/user/v1/loginByPassword`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        clientcode: CLIENT_CODE.toUpperCase(),
        password: PIN,
        totp: totpCode,
      }),
    });

    const loginData = await loginRes.json();

    if (!loginRes.ok || !loginData.status) {
      console.error('[-] Login Failed:', loginData);
      return;
    }

    console.log('[+] Login SUCCESSFUL!');
    const jwtToken = loginData.data.jwtToken;
    const authHeaders = {
      ...headers,
      Authorization: `Bearer ${jwtToken}`,
    };

    console.log('\n2. Fetching User Profile...');
    const profileRes = await fetch(`${BASE_URL}/rest/secure/angelbroking/user/v1/getProfile`, {
      method: 'GET',
      headers: authHeaders,
    });
    const profileData = await profileRes.json();
    if (profileData.status) {
      console.log('[+] User Profile:', profileData.data);
    }

    console.log('\n3. Fetching RMS / Funds...');
    const fundsRes = await fetch(`${BASE_URL}/rest/secure/angelbroking/user/v1/getRMS`, {
      method: 'GET',
      headers: authHeaders,
    });
    const fundsData = await fundsRes.json();
    if (fundsData.status) {
      console.log('[+] RMS Funds:', fundsData.data);
    }

    console.log('\n4. Fetching Portfolio Holdings...');
    const holdingsRes = await fetch(`${BASE_URL}/rest/secure/angelbroking/portfolio/v1/getAllHolding`, {
      method: 'GET',
      headers: authHeaders,
    });
    const holdingsData = await holdingsRes.json();
    if (holdingsData.status) {
      console.log(`[+] Total Holdings: ${holdingsData.data?.holdings?.length || 0}`);
      console.table(
        (holdingsData.data?.holdings || []).map((h) => ({
          Symbol: h.tradingsymbol,
          Qty: h.quantity,
          AvgPrice: h.averageprice,
          LTP: h.ltp,
          TotalVal: h.totalHoldingValue,
          Pnl: h.pnl,
        }))
      );
    }
  } catch (e) {
    console.error('[-] Request failed:', e.message);
  }
}

run();
