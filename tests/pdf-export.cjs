// Run with Playwright available: node tests/pdf-export.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const server = http.createServer(async (req, res) => {
    const name = req.url === '/' ? 'index.html' : req.url.slice(1);
    if (!['index.html', 'script.js', 'style.css'].includes(name)) {
      res.writeHead(404).end(); return;
    }
    res.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html');
    res.end(await fs.readFile(path.join(root, name)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      state = getDefaultState();
      state.experience = Array.from({ length: 8 }, (_, i) => ({
        id: `exp-${i}`, title: `Backend Engineer ${i}`, company: 'Example Company', date: '2023 - Present',
        description: Array.from({ length: 5 }, (_, j) => `- Delivered automation project ${i}-${j} with reliable publishing, database management, and deployment tooling.`).join('\n')
      }));
      state.skills = ['Python', 'SQL', 'FINAL_CONTENT_MARKER'];
      renderPreview();
      window.jspdf.jsPDF.prototype.save = function () {};
      // jsPDF installs methods on each instance, so wrap its constructor.
      const Original = window.jspdf.jsPDF;
      window.jspdf.jsPDF = function (...args) {
        const doc = new Original(...args);
        doc.save = () => { window.testPdf = Array.from(new Uint8Array(doc.output('arraybuffer'))); };
        return doc;
      };
    });
    const exportAndRead = async mode => page.evaluate(async mode => {
      dom.pdfExportModeSelect.value = mode;
      window.testPdf = null;
      await exportPdf();
      if (!window.testPdf) throw new Error('Export failed');
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(window.testPdf), disableWorker: true }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        text += (await (await pdf.getPage(i)).getTextContent()).items.map(item => item.str).join(' ');
      }
      return { pages: pdf.numPages, text, bytes: window.testPdf, leftover: document.querySelectorAll('.pdf-export-mode').length, disabled: dom.exportPdfBtn.disabled };
    }, mode);
    const one = await exportAndRead('one-page');
    assert.equal(one.pages, 1);
    assert.match(one.text, /FINAL_CONTENT_MARKER/);
    assert.match(one.text, /Backend Engineer 7/);
    assert.equal(one.leftover, 0);
    assert.equal(one.disabled, false);
    await fs.mkdir(path.join(root, 'tmp/pdfs'), { recursive: true });
    await fs.writeFile(path.join(root, 'tmp/pdfs/long-one-page.pdf'), Buffer.from(one.bytes));
    const normal = await exportAndRead('normal');
    assert.ok(normal.pages > 1);
    assert.match(normal.text, /FINAL_CONTENT_MARKER/);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => dom.previewPanel.classList.add('is-collapsed'));
    const mobile = await exportAndRead('one-page');
    assert.equal(mobile.pages, 1);
    assert.match(mobile.text, /FINAL_CONTENT_MARKER/);
    await page.evaluate(() => { state = getDefaultState(); renderPreview(); });
    const short = await exportAndRead('one-page');
    assert.equal(short.pages, 1);
    await page.evaluate(async () => {
      window.html2canvas = () => Promise.reject(new Error('Expected capture failure'));
      await exportPdf();
    });
    assert.equal(await page.locator('.pdf-export-mode').count(), 0);
    assert.equal(await page.locator('#exportPdfBtn').isDisabled(), false);
    console.log(`PASS: long CV one page, all content preserved; normal ${normal.pages} pages; collapsed mobile; short CV; failure cleanup.`);
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
