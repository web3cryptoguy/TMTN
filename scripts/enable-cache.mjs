import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);

const die = (s) => { console.error(`✗ ${s}`); process.exit(1); };
const read = (f, d = '') => { try { return fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''); } catch { return d; } };
const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', ...opts });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`${cmd} 退出码 ${r.status}`);
};
const docker = (args, opts = {}) => spawnSync('docker', args, { cwd: ROOT, encoding: 'utf8', ...opts });

for (const [label, args] of [['docker info', ['info']], ['docker compose version', ['compose', 'version']]]) {
  if (docker(args).status !== 0) die(`${label} 失败：先打开 Docker Desktop / OrbStack / Docker Engine`);
}

if (!fs.existsSync('.env')) fs.writeFileSync('.env', '');
let text = read('.env');
const eol = text.includes('\r\n') ? '\r\n' : '\n';
const mysqlLine = text.split(/\r?\n/).reverse().find((x) => x.startsWith('MYSQL_URL='));
let password = '';
if (mysqlLine) {
  const m = /^MYSQL_URL=mysql:\/\/tmtn:([^@]*)@/.exec(mysqlLine);
  if (!m) die('MYSQL_URL 格式不对，应为 mysql://tmtn:<密码>@127.0.0.1:13306/tmtn');
  password = decodeURIComponent(m[1]);
}

if (!password) {
  password = crypto.randomBytes(16).toString('hex');
  const block = `${text.replace(new RegExp(`${eol}*$`), '')}${text ? eol : ''}# 历史数据缓存（由 npm run cache:enable 写入；清空这两行再重启即可关闭）${eol}MYSQL_URL=mysql://tmtn:${password}@127.0.0.1:13306/tmtn${eol}REDIS_URL=redis://127.0.0.1:16379${eol}`;
  fs.writeFileSync('.env', block);
  text = block;
  console.log('已写入 .env：MYSQL_URL / REDIS_URL（密码随机生成）');
} else {
  if (!/^REDIS_URL=redis/m.test(text)) {
    fs.appendFileSync('.env', `${text.endsWith(eol) ? '' : eol}REDIS_URL=redis://127.0.0.1:16379${eol}`);
    text += `${text.endsWith(eol) ? '' : eol}REDIS_URL=redis://127.0.0.1:16379${eol}`;
  }
  console.log('.env 已有 MYSQL_URL，沿用原密码');
}

console.log('安装依赖（mysql2 / ioredis）…');
const npmArgs = ['install', '--no-audit', '--no-fund'];
if (process.env.npm_execpath) run(process.execPath, [process.env.npm_execpath, ...npmArgs]);
else run(process.platform === 'win32' ? 'npm.cmd' : 'npm', npmArgs, { shell: process.platform === 'win32' });

console.log('启动 MySQL + Redis…');
run('docker', ['compose', '-f', 'docker/cache-compose.yml', 'up', '-d'], { env: { ...process.env, TMTN_DB_PASSWORD: password } });

console.log('等待 MySQL 初始化');
let ready = false;
for (let i = 0; i < 60; i++) {
  const r = docker(['exec', 'tmtn-mysql', 'mysqladmin', 'ping', '-h', '127.0.0.1', '-utmtn', `-p${password}`, '--silent'], { stdio: 'ignore' });
  if (r.status === 0) { ready = true; break; }
  process.stdout.write('.');
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
console.log();
if (!ready) console.log('MySQL 还没就绪（首次可能要拉镜像）。程序会每 30 秒自动重试，不影响使用。');
else console.log('MySQL 已就绪');

console.log('完成。重启 TMTN 后打开 /api/cache-status 查看 mysql / redis 状态。');
