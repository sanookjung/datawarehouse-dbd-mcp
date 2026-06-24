// Standalone bootstrap probe: runs the DBD session warmUp and prints the
// full error if Playwright/WAF fails. Used to diagnose cold-start crashes
// on a fresh host (e.g. beelink). Not part of the server.
import { warmUp } from "../src/session.ts";

try {
  console.error("BOOTSTRAP: starting");
  await warmUp();
  console.error("BOOTSTRAP: success");
  process.exit(0);
} catch (e: any) {
  console.error("BOOTSTRAP FAILED:");
  console.error(e?.stack || e?.message || String(e));
  process.exit(1);
}
