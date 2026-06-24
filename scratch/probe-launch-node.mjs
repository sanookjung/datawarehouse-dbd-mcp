// Plain-JS launch probe runnable under Node (no TS loader). Mirrors
// probe-launch.ts. Used to test whether Playwright connects to Chromium
// when launched by Node vs bun on Windows.
import { chromium } from "playwright";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const strategies = [
  { name: "A: default pipe + http2 off", opts: { headless: true, args: ["--no-sandbox", "--disable-http2"] } },
  { name: "B: pipe=false (ws port)", opts: { headless: true, args: ["--no-sandbox", "--disable-http2"], pipe: false } },
];

for (const s of strategies) {
  console.error(`\n=== TRYING ${s.name} ===`);
  let browser = null;
  try {
    browser = await chromium.launch({ ...s.opts, timeout: 60000 });
    const ctx = await browser.newContext({ userAgent: UA });
    const page = await ctx.newPage();
    await page.goto("about:blank", { timeout: 15000 });
    console.error(`SUCCESS: ${s.name}`);
    await browser.close();
    process.exit(0);
  } catch (e) {
    console.error(`FAILED ${s.name}: ${String(e?.message ?? e).split("\n")[0]}`);
    try {
      await browser?.close();
    } catch {}
  }
}
console.error("\nALL STRATEGIES FAILED (node)");
process.exit(1);
