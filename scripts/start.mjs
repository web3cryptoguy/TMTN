import path from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expandHome = (value) => value.replace(/^(?:\$HOME|\$\{HOME\}|%USERPROFILE%|~)(?=$|[\\/])/i, homedir());
process.chdir(root);

for (const arg of process.argv.slice(2)) {
  const i = arg.indexOf('=');
  if (i < 1 || !/^[A-Z_][A-Z0-9_]*$/.test(arg.slice(0, i))) throw new Error(`invalid environment argument: ${arg}`);
  const key = arg.slice(0, i);
  const value = expandHome(arg.slice(i + 1));
  process.env[key] = value;
}

if (process.env.TMTN_PRINT_ENV === '1') {
  const keys = ['MODE', 'PORT', 'LIVE_TRADE', 'DATA_DIR', 'BINANCE_BAW_DIR', 'BINANCE_INSTANCE_ID', 'WALLET_SLOT', 'WALLET_LABEL', 'WALLET_PEERS', 'FEEDS_PUBLIC'];
  for (const key of keys) if (process.env[key] !== undefined) console.log(`${key}=${process.env[key]}`);
  process.exit(0);
}

await import(pathToFileURL(path.join(root, 'server.js')).href);
