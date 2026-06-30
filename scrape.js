const { chromium } = require('playwright');
const fs = require('fs');
const { batches } = require('./cities');

const STATE = 'WY';
const STATE_NAME = 'wyoming';

const escapeCSV = (val) => {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
};

(async () => {
  const batchNum = parseInt(process.env.BATCH_NUM, 10);
  if (!batchNum || !batches[batchNum] || batches[batchNum].length === 0) {
    console.log(`Batch ${batchNum} is empty or out of range — nothing to do.`);
    process.exit(0);
  }

  const cities = batches[batchNum];
  console.log(`Running batch ${batchNum} — ${cities.length} cities`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-dev-shm-usage',
      '--renderer-process-limit=2',
      '--js-flags=--max-old-space-size=512',
      '--memory-pressure-off',
      '--disable-extensions',
      '--no-sandbox',
    ]
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  const outputDir = 'US_cities';
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  for (const city of cities) {
    const searchQueries = [
      `CPA in ${city} ${STATE_NAME}`,
      `Accountant in ${city} ${STATE_NAME}`,
      `CPA firm in ${city} ${STATE_NAME}`,
      `Certified Public Accountant ${city} ${STATE_NAME}`,
      `Tax accountant in ${city} ${STATE_NAME}`
    ];

    const filePath = `${outputDir}/${city.replace(/\s+/g, '_')}_CPA.csv`;
    const collectedUrls = new Set();

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, 'url,name,address,city,state,phone\n');
    }

    console.log(`\n=== Processing city: ${city} ===`);

    for (const query of searchQueries) {
      console.log(`Searching: ${query}`);

      await page.goto("https://www.google.com/maps", { waitUntil: 'domcontentloaded', timeout: 60000 });

      try {
        const acceptBtn = page.locator('button:has-text("Accept all"), button:has-text("Agree"), form:nth-child(2) button');
        await acceptBtn.first().click({ timeout: 5000 });
        await page.waitForTimeout(2000);
      } catch (_) { }

      await page.waitForSelector('input#searchboxinput, input[name="q"]', { timeout: 15000 });
      await page.fill('input#searchboxinput, input[name="q"]', query);
      await page.keyboard.press('Enter');

      await page.waitForTimeout(5000);

      const scrollable = await page.$('div[role="feed"]');
      if (!scrollable) {
        console.log('No results feed found, skipping query');
        continue;
      }

      for (let i = 0; i < 15; i++) {
        await scrollable.evaluate(el => el.scrollBy(0, 1000));
        await page.waitForTimeout(2000);
      }

      const listings = await page.$$('div[role="article"]');
      console.log(`Found ${listings.length} listings`);

      for (let i = 0; i < listings.length; i++) {
        try {
          await listings[i].click();
          await page.waitForTimeout(3000);

          const website = await page.$eval('a[data-item-id="authority"]', el => el.href).catch(() => null);

          if (!website || collectedUrls.has(website)) continue;
          collectedUrls.add(website);

          const name = await page.$eval('h1', el => el.textContent.trim()).catch(() => null);
          const addressText = await page.$eval('button[data-item-id="address"]', el => el.textContent.trim()).catch(() => null);
          const phone = await page.$eval('button[data-item-id^="phone:tel:"]', el => el.textContent.trim()).catch(() => null);

          let parsedCity = city;
          let parsedState = STATE;
          if (addressText) {
            const parts = addressText.split(',').map(p => p.trim());
            if (parts.length >= 2) {
              parsedCity = parts[parts.length - 2] || city;
              parsedState = (parts[parts.length - 1] || '').split(' ')[0] || STATE;
            }
          }

          const row = [website, name, addressText, parsedCity, parsedState, phone].map(escapeCSV).join(',');
          console.log(`Found: ${website}`);
          fs.appendFileSync(filePath, row + '\n');

        } catch (err) {
          console.log("Error processing listing:", err.message);
        }
      }
    }

    console.log(`\n✅ Done with ${city} — ${collectedUrls.size} unique URLs saved to ${filePath}`);
  }

  await browser.close();
})();
