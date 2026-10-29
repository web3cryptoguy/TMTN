import fs from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { expandPath } from '../../engine/live/config.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const problems = [];
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const home = homedir();
for (const value of ['~/TMTN', '$HOME/TMTN', '${HOME}/TMTN', '%USERPROFILE%/TMTN', '~\\TMTN']) {
  if (!expandPath(value).startsWith(home)) problems.push(`expandPath 未展开：${value}`);
}

const pkg = JSON.parse(read('package.json'));
for (const [name, command] of Object.entries(pkg.scripts || {})) {
  if (/(?:^|\s)[A-Z][A-Z0-9_]*=[^\s]+\s+node\b/.test(command)) problems.push(`npm 脚本含 POSIX 专用环境变量语法：${name}`);
}
if (!pkg.engines?.node) problems.push('package.json 未声明 Node.js engines');

const attrs = read('.gitattributes');
for (const rule of ['*.sh text eol=lf', '*.cmd text eol=crlf', '*.png binary']) {
  if (!attrs.includes(rule)) problems.push(`.gitattributes 缺少：${rule}`);
}

for (const f of ['scripts/add-wallet.mjs', 'scripts/enable-cache.mjs', 'scripts/start.mjs']) {
  if (!fs.existsSync(path.join(ROOT, f))) problems.push(`缺少跨平台入口：${f}`);
}
for (const f of ['scripts/add-wallet.sh', 'scripts/enable-cache.sh']) {
  const source = read(f);
  if (!/exec node "\$DIR\/[^"]+\.mjs" "\$@"/.test(source)) problems.push(`${f} 未转发到 Node 实现`);
  if (source.includes('\r')) problems.push(`${f} 不是 LF 换行`);
}

const readme = read('README.md');
for (const word of ['Windows', 'WSL', 'macOS', 'Linux', 'PowerShell']) {
  if (!readme.includes(word)) problems.push(`README.md 缺少跨平台说明：${word}`);
}
if (!readme.includes('GUIDE-CN.md')) problems.push('README.md 未链接 GUIDE-CN.md');
if (!fs.existsSync(path.join(ROOT, 'GUIDE-CN.md'))) problems.push('缺少 GUIDE-CN.md');
else {
  const guide = read('GUIDE-CN.md');
  for (const heading of ['## macOS / Linux / WSL2', '## Windows 原生环境']) {
    if (!guide.includes(heading)) problems.push(`GUIDE-CN.md 缺少章节：${heading.slice(3)}`);
  }
  for (const command of ['brew install', 'deb.nodesource.com', 'rpm.nodesource.com', 'wsl --install', 'docker.io', 'Node.js 官网']) {
    if (guide.includes(command)) problems.push(`GUIDE-CN.md 不应包含工具安装指导：${command}`);
  }
}

for (const p of problems) console.error(`✗ ${p}`);
console.log(problems.length ? `\n跨平台检查：${problems.length} 处问题` : '✓ 跨平台检查：入口、路径展开、换行规则与 README 说明完整');
process.exit(problems.length ? 1 : 0);
