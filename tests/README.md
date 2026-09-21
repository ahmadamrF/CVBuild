# PDF export regression check

Install Playwright (`npm install --no-save playwright` and `npx playwright install chromium`), then run:

```sh
node tests/pdf-export.cjs
```

The test starts its own local HTTP server and exercises the actual html2canvas/jsPDF export in Chromium. It first reloads a saved CV with all five contact fields three times, checking that every section renders without startup errors and that editing still works. It then checks a long one-page CV (including its final content), normal multipage export with intact entries and line boundaries, oversized entries, a two-column template, unique text extraction, a collapsed mobile preview, a short CV, and cleanup after a capture failure. Internet access is needed for the application's existing CDN dependencies. A visual verification PDF is written to the ignored `tmp/pdfs/` directory.
