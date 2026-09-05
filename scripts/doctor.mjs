import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const envPath = path.join(projectRoot, '.env.local');
const envExamplePath = path.join(projectRoot, 'env.local.example');

function fail(message) {
  console.error(message);
  process.exit(1);
}

const majorVersion = Number.parseInt(process.versions.node.split('.')[0], 10);
if (Number.isNaN(majorVersion) || majorVersion < 22) {
  fail(`Node.js 22 or newer is required. Current version: ${process.versions.node}`);
}

if (!process.env.npm_config_user_agent?.startsWith('npm/')) {
  fail('Run this repo with npm so package-lock.json and scripts stay consistent.');
}

if (!fs.existsSync(envExamplePath)) {
  fail('Missing env.local.example. Restore the tracked template before continuing.');
}

if (!fs.existsSync(envPath)) {
  fail('Missing .env.local. Copy env.local.example to .env.local before running the app.');
}

const envContents = fs.readFileSync(envPath, 'utf8');
for (const key of [
  'NEXT_PUBLIC_AGORA_APP_ID',
  'NEXT_AGORA_APP_CERTIFICATE',
  'APP_BASE_URL',
  'GROQ_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'SESSION_SIGNING_SECRET',
  'E2B_API_KEY',
  'AGORA_WEBHOOK_SECRET',
  'CRON_SECRET',
]) {
  const matcher = new RegExp(`^${key}=.+$`, 'm');
  if (!matcher.test(envContents)) {
    fail(`.env.local is missing a value for ${key}`);
  }
}

console.log('Doctor checks passed');
