const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(`
    <h2>✅ GA SOS Lookup API</h2>
    <p>Use /search?q=Business+Name</p>
    <p>Example: <a href="/search?q=Professional+Advice+LLC">/search?q=Professional Advice LLC</a></p>
  `);
});

app.get('/search', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'Missing ?q= parameter' });

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  try {
    await page.goto('https://ecorp.sos.ga.gov/BusinessSearch', { waitUntil: 'networkidle0' });
    await page.type('#BusinessName', q);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForSelector('table', { timeout: 15000 })
    ]);
    const rows = await page.$$eval('table tr', trs =>
      trs.slice(1).map(tr => {
        const tds = tr.querySelectorAll('td');
        return {
          name: tds[0]?.innerText.trim(),
          control: tds[1]?.innerText.trim(),
          status: tds[2]?.innerText.trim(),
          type: tds[3]?.innerText.trim(),
          address: tds[4]?.innerText.trim(),
          agent: tds[5]?.innerText.trim()
        };
      })
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Scraping failed', detail: err.message });
  } finally {
    await browser.close();
  }
});

app.listen(port, () => console.log(`Listening on port ${port}`));
