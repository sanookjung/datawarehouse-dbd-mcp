// Diagnostic: try several Chromium launch strategies and report which one
// successfully opens a page. Used to find a Windows-compatible launch config
// when --remote-debugging-pipe times out. Throwaway; not part of the server.
import { chromium } from "playwright";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const strategies: { name: string; opts: any }[] = [
  {
    name: "A: pipe=false (websocket port) + http2 off",
    opts: { headless: true, args: ["--no-sandbox", "--disable-http2"], pipe: false },
  },
  {
    name: "B: pipe=false, minimal args",
    opts: { headless: true, args: ["--no-sandbox"], pipe: false },
  },
  {
    name: "C: channel=chrome headed-new, pipe=false",
    opts: { headless: true, args: ["--no-sandbox", "--disable-http2"], pipe: false, timeout: 60000 },
  },
];

for (const s of strategies) {
  console.error(`\n=== TRYING ${s.name} ===`);
  let browser: any = null;
  try {
    browser = await chromium.launch({ ...s.opts, timeout: 60000 });
    const ctx = await browser.newContext({ userAgent: UA });
    const page = await ctx.newPage();
    await page.goto("about:blank", { timeout: 15000 });
    console.error(`SUCCESS: ${s.name}`);
    await browser.close();
    process.exit(0);
  } catch (e: any) {
    console.error(`FAILED ${s.name}: ${e?.message?.split("\n")[0] ?? e}`);
    try {
      await browser?.close();
    } catch {}
  }
}
console.error("\nALL STRATEGIES FAILED");
process.exit(1);
