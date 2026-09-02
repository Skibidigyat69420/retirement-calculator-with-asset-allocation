import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';
import { AxePuppeteer } from '@axe-core/puppeteer';

const PORT = 5173;
const BASE_URL = `http://localhost:${PORT}`;
const CHROMIUM = '/usr/bin/chromium';

const require = createRequire(import.meta.url);
const axeCorePath = require.resolve('axe-core');
const axeCoreSource = await readFile(axeCorePath, 'utf8');

function wait(ms){return new Promise(r=>setTimeout(r,ms));}
async function waitForServer(){
  const start=Date.now();
  while(Date.now()-start<30000){
    try{ const res=await fetch(BASE_URL); if(res.ok) return; }catch{}
    await wait(250);
  }
}
async function startDevServer(){
  const child=spawn('npx',['vite','--strictPort','--port',String(PORT)],{cwd:process.cwd(),stdio:'pipe'});
  await waitForServer();
  return child;
}
async function run(){
  const server=await startDevServer();
  const browser=await puppeteer.launch({executablePath:CHROMIUM,headless:true,args:['--no-sandbox','--disable-setuid-sandbox']});
  const page=await browser.newPage();
  await page.setViewport({width:1280,height:800});
  for (const route of ['/', '/master-plan', '/goal', '/retirement', '/allocation', '/mvo', '/reports', '/calculators', '/ips', '/angel-connect', '/angel-data']) {
    await page.goto(`${BASE_URL}${route}`,{waitUntil:'networkidle2'});
    await wait(1200);
    const results=await new AxePuppeteer(page, axeCoreSource).analyze();
    const contrast = results.violations.find(v => v.id === 'color-contrast');
    if (!contrast) continue;
    console.log(`\n--- ${route} (${contrast.nodes.length} nodes) ---`);
    for (const node of contrast.nodes.slice(0,8)) {
      const data = node.any?.[0]?.data || {};
      console.log('  selector:', node.target.join(' > '));
      console.log('  html:', node.html.replace(/\s+/g,' ').slice(0,180));
      console.log('  contrast:', data.contrastRatio, 'expected', data.expectedContrastRatio, 'fg', data.fgColor, 'bg', data.bgColor);
    }
  }
  await browser.close();
  server.kill('SIGTERM');
}
run().catch(e=>{console.error(e);process.exit(1)});
