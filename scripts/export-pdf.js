import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function exportPDF() {
  const targetUrl = process.env.URL || 'http://localhost:5173/dossier';
  const outputPath = path.resolve(process.cwd(), 'sound-thesis-portfolio-dossier.pdf');

  console.log(`\n📄 Generating Complete Portfolio Dossier PDF from: ${targetUrl}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--font-render-hinting=none',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1800, deviceScaleFactor: 2 });

    console.log('⏳ Loading dossier page and rendering interactive charts...');
    await page.goto(targetUrl, {
      waitUntil: ['load', 'networkidle0'],
      timeout: 30000,
    });

    // Wait a brief moment for Recharts animations and SVG calculations to settle
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Emulate print media for high-resolution vector rendering
    await page.emulateMediaType('print');

    console.log('🖨️  Rendering PDF document (A4, print background enabled)...');
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '10mm',
        bottom: '12mm',
        left: '12mm',
        right: '12mm',
      },
    });

    const stats = fs.statSync(outputPath);
    const sizeKB = (stats.size / 1024).toFixed(1);

    console.log(`\n✅ Successfully generated Complete Portfolio Dossier!`);
    console.log(`📁 File: ${outputPath}`);
    console.log(`📊 Size: ${sizeKB} KB\n`);
  } catch (err) {
    console.error('❌ Failed to generate PDF:', err.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

exportPDF();
