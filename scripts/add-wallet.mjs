import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);

const USAGE = `添加 / 更新第 N 个币安 Agentic 钱包（N >= 2）

  npm run add-wallet -- N [--address 0x...] [--live] [--quote-only] [--write-env]
  npm run add-wallet -- N --status
  npm run add-wallet -- --peers [--write-env]

  N             钱包编号（2、3、4...）。容器名 tmtn-walletN，端口 127.0.0.1:(8787+N)
  --address     预期 BSC 地址；填了以后扫错账号会被拒绝
  --live        LIVE_TRADE=1；不填或 --quote-only = 只报价
  --write-env   把 WALLET_PEERS 写入根目录 .env（自动备份）
  --status      查看容器、登录和地址状态
  --peers       打印或写入 WALLET_PEERS`;

const die = (s) => { console.error(`✗ ${s}`); process.exit(1); };
const ok = (s) => console.log(`✓ ${s}`);
const portOf = (n) => 8787 + Number(n);
const docker = (args, opts = {}) => spawnSync('docker', args, { cwd: ROOT, encoding: 'utf8', ...opts });
const captured = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', ...opts });
  if (r.status !== 0) throw new Error(String(r.stderr || r.stdout || r.error?.message || `${cmd} failed`).trim());
  return String(r.stdout || '').trim();
};
const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', ...opts });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`${cmd} 退出码 ${r.status}`);
};
const read = (f, d = '') => { try { return fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''); } catch { return d; } };
const saveFile = (f, value, mode) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, value, mode ? { mode } : undefined); };
const envValue = (text, key) => {
  const line = text.split(/\r?\n/).reverse().find((x) => x.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).replace(/^(['"])(.*)\1$/, '$2') : '';
};
const walletDirs = () => {
  try {
    return fs.readdirSync('wallets', { withFileTypes: true })
      .filter((e) => e.isDirectory() && /^wallet\d+$/.test(e.name))
      .map((e) => ({ n: Number(e.name.slice(6)), dir: `wallets/${e.name}` }))
      .filter((x) => x.n >= 2 && fs.existsSync(path.join(x.dir, 'docker-compose.yml')))
      .sort((a, b) => a.n - b.n);
  } catch { return []; }
};
const peersJson = () => JSON.stringify(walletDirs().map(({ n }) => ({
  slot: n,
  label: `钱包 ${n}`,
  url: `http://127.0.0.1:${portOf(n)}`,
  signin: `docker exec -it tmtn-wallet${n} baw auth signin`,
})));
const timestamp = () => {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

function writeEnv() {
  const text = read('.env');
  if (!text) die('项目根目录没有 .env：先复制 .env.example 为 .env');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const line = `WALLET_PEERS=${peersJson()}`;
  let lines = text.split(/\r?\n/);
  let found = false;
  lines = lines.map((x) => {
    if (!x.startsWith('WALLET_PEERS=')) return x;
    if (!found) { found = true; return line; }
    return null;
  }).filter((x) => x !== null);
  if (!found) lines.push(line);
  if (!lines.some((x) => x.startsWith('WALLET_LABEL='))) lines.push('WALLET_LABEL=钱包 1');
  const out = lines.join(eol).replace(new RegExp(`${eol}*$`), eol);
  const backup = `.env.bak-${timestamp()}`;
  fs.copyFileSync('.env', backup);
  fs.writeFileSync('.env', out);
  ok(`.env 已更新（备份：${backup}）`);
  console.log(`  ${line}`);
  console.log('  → 重启钱包 1 后端后生效');
}

function token() {
  const fromEnv = envValue(read('.env'), 'TMTN_API_TOKEN');
  if (fromEnv.length >= 32) return fromEnv;
  const generatedFile = read(path.join('data', 'api-token')).trim();
  if (generatedFile.length >= 32) return generatedFile;
  const value = crypto.randomBytes(32).toString('hex');
  const old = read('.env');
  const eol = old.includes('\r\n') ? '\r\n' : '\n';
  fs.writeFileSync('.env', `${old.replace(new RegExp(`${eol}*$`), '')}${old ? eol : ''}TMTN_API_TOKEN=${value}${eol}`);
  ok('已在 .env 生成 TMTN_API_TOKEN（钱包 1 需要重启）');
  return value;
}

async function status(n) {
  const name = `tmtn-wallet${n}`, port = portOf(n);
  const want = read(`wallets/wallet${n}/address`).trim();
  console.log(`钱包 ${n} · 容器 ${name} · http://127.0.0.1:${port}`);
  const ps = docker(['ps', '--filter', `name=^${name}$`, '--format', '{{.Status}}']);
  const state = ps.status === 0 ? String(ps.stdout || '').trim() : '';
  console.log(`  容器：${state || '没在运行'}`);
  try {
    const r = await fetch(`http://127.0.0.1:${port}/api/wallet-info`, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const info = await r.json();
    const names = { ok: '已登录', wrong_account: '登录的不是预期账号（已拒绝使用）', checking: '检查中', logged_out: '未登录' };
    console.log(`  登录：${names[info.auth] || info.auth || '未知'}`);
    console.log(`  地址：${info.address || '（还没有）'}   预期：${want || '未设置（建议用 --address 锁定）'}`);
    if (want && info.address && info.address.toLowerCase() !== want.toLowerCase()) console.log('  ✗ 地址和预期不一致：登录错账号了');
    else if (want && info.address) console.log('  ✓ 地址和预期一致');
    console.log(`  BNB：${info.bnb ?? '-'}`);
    return 0;
  } catch (e) {
    console.log(`  后端：连不上（${e.message}）`);
    return 1;
  }
}

function randomMac() {
  const used = new Set(walletDirs().map(({ dir }) => read(path.join(dir, 'mac')).trim().toLowerCase()).filter(Boolean));
  for (;;) {
    const value = `02:${crypto.randomBytes(5).toString('hex').match(/../g).join(':')}`;
    if (!used.has(value)) return value;
  }
}

function portBusy(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    const done = (v) => { socket.destroy(); resolve(v); };
    socket.setTimeout(600);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

const args = process.argv.slice(2);
let n = '', address = '', live = null, write = false, onlyStatus = false, peersOnly = false;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--address') address = args[++i] || '';
  else if (a.startsWith('--address=')) address = a.slice(10);
  else if (a === '--live') live = 1;
  else if (a === '--quote-only') live = 0;
  else if (a === '--write-env') write = true;
  else if (a === '--status') onlyStatus = true;
  else if (a === '--peers') peersOnly = true;
  else if (a === '-h' || a === '--help') { console.log(USAGE); process.exit(0); }
  else if (!n) n = a;
  else die(`多余的参数：${a}`);
}

if (peersOnly) {
  console.log(`WALLET_PEERS=${peersJson()}`);
  if (write) writeEnv();
  process.exit(0);
}

const slot = Number(n);
if (!Number.isInteger(slot)) die(`${USAGE}\n\nN 必须是整数`);
if (slot < 2) die('钱包 1 是主后端，这里只添加 2 号及以后的钱包');
if (slot > 99) die('N 不能大于 99');
if (onlyStatus) process.exit(await status(slot));

for (const [cmd, args2] of [['docker', ['info']], ['docker', ['compose', 'version']]]) {
  const r = docker(args2);
  if (r.status !== 0) die(cmd === 'docker' ? 'Docker 没在运行：先打开 Docker Desktop / OrbStack / Docker Engine' : '没有 docker compose v2');
}

const apiToken = token();
const dir = `wallets/wallet${slot}`, name = `tmtn-wallet${slot}`, port = portOf(slot);
fs.mkdirSync(path.join(dir, 'baw'), { recursive: true, mode: 0o700 });
fs.mkdirSync(path.join(dir, 'data'), { recursive: true, mode: 0o700 });

const existing = docker(['ps', '--format', '{{.Names}}']);
const running = existing.status === 0 && String(existing.stdout || '').split(/\r?\n/).includes(name);
if (!running && await portBusy(port)) die(`端口 ${port} 已被其他程序占用`);

let mac = read(path.join(dir, 'mac')).trim();
if (!mac) {
  mac = randomMac();
  saveFile(path.join(dir, 'mac'), `${mac}\n`, 0o600);
}
if (!/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(mac)) die(`${dir}/mac 格式不对：${mac}`);

if (address) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) die(`--address 不是有效的 BSC 地址：${address}`);
  saveFile(path.join(dir, 'address'), `${address}\n`, 0o600);
}
const expected = read(path.join(dir, 'address')).trim();

if (live !== null) saveFile(path.join(dir, 'live'), `${live}\n`, 0o600);
live = Number(read(path.join(dir, 'live')).trim() || 0) === 1 ? 1 : 0;

saveFile(path.join(dir, '.env'), `TMTN_API_TOKEN=${apiToken}\n`, 0o600);
const yml = `# Generated by scripts/add-wallet.mjs. Safe to regenerate.
services:
  ${name}:
    build:
      context: ../..
      dockerfile: docker/Dockerfile
    image: tmtn-wallet:latest
    container_name: ${name}
    hostname: ${name}
    mac_address: ${JSON.stringify(mac)}
    restart: unless-stopped
    env_file: .env
    environment:
      WALLET_SLOT: ${JSON.stringify(String(slot))}
      WALLET_LABEL: ${JSON.stringify(`钱包 ${slot}`)}
      PORT: ${JSON.stringify(String(port))}
      LIVE_TRADE: ${JSON.stringify(String(live))}
      WALLET_ADDRESS: ${JSON.stringify(expected)}
    ports:
      - "127.0.0.1:${port}:${port}"
    volumes:
      - ./baw:/root/.baw
      - ./data:/data
`;
saveFile(path.join(dir, 'docker-compose.yml'), yml);

console.log(`→ 构建镜像并启动 ${name}（第一次可能需要几分钟）`);
run('docker', ['compose', '-p', name, '-f', path.join(dir, 'docker-compose.yml'), 'up', '-d', '--build']);

const got = (() => { try { return captured('docker', ['inspect', '-f', '{{range .NetworkSettings.Networks}}{{.MacAddress}}{{end}}', name]); } catch { return ''; } })();
if (got.toLowerCase() === mac.toLowerCase()) ok(`容器 MAC = ${mac}`);
else console.log(`! 容器 MAC 是「${got}」，预期 ${mac}（Docker 版本过旧可能不支持 mac_address）`);

console.log('→ 等后端起来');
let ready = false;
for (let i = 0; i < 60; i++) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/api/wallet-info`, { signal: AbortSignal.timeout(2000) });
    if (r.ok) { ready = true; break; }
  } catch { /* retry */ }
  process.stdout.write('.');
  await new Promise((r) => setTimeout(r, 1000));
}
console.log();
if (!ready || await status(slot) !== 0) die(`后端没起来：docker logs --tail 50 ${name}`);

console.log(`\n实盘：${live ? '真实下单（LIVE_TRADE=1）' : '只报价（LIVE_TRADE=0），确认无误后加 --live'}`);
console.log(`登录（需要本人操作）：docker exec -it ${name} baw auth signin`);
console.log(`查看状态：npm run add-wallet -- ${slot} --status`);
console.log(`WALLET_PEERS=${peersJson()}`);
if (write) writeEnv();
else console.log('（加 --write-env 可以把 WALLET_PEERS 写入 .env）');
