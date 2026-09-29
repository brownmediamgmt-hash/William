// Resolve Playwright from the project, then from the global npm root, so the
// skill works in repos that don't list playwright as a dependency.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';

export function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const candidates = [process.cwd(), path.dirname(new URL(import.meta.url).pathname)];
  try {
    candidates.push(execSync('npm root -g', { encoding: 'utf8' }).trim());
  } catch {}
  for (const base of candidates) {
    try {
      return require(require.resolve('playwright', { paths: [base] }));
    } catch {}
  }
  throw new Error('Playwright not found. Install it with: npm i -D playwright && npx playwright install chromium');
}

export async function launch() {
  const { chromium } = loadPlaywright();
  const opts = {};
  // Some sandboxes pre-install Chromium at a fixed path instead of the default cache.
  if (process.env.CHROMIUM_PATH) opts.executablePath = process.env.CHROMIUM_PATH;
  return chromium.launch(opts);
}
