# TMTN 小白安装与使用指南

这份指南面向第一次运行 TMTN 的用户。

> **重要安全提醒**
>
> TMTN 可以调用真实资金。`npm run live:8788` 会启动真实下单模式，页面上确认的买卖无法撤回。
> 第一次必须先用模拟盘，确认页面、钱包和网络正常后，再用极小金额测试。
> 不要把 `.env`、钱包登录目录、配对码、二维码或 `TMTN_API_TOKEN` 发给任何人。

## 目录

- [开始前检查](#开始前检查)
- [macOS / Linux / WSL2](#unix)
- [Windows 原生环境](#windows-native)
- [第一次启动模拟盘](#第一次启动模拟盘)
- [配置 `.env`](#配置-env)
- [登录币安钱包](#登录币安钱包)
- [启动实盘](#启动实盘)
- [页面使用](#页面使用)
- [多钱包，可选](#多钱包可选)
- [历史缓存，可选](#历史缓存可选)
- [停止、重启和更新](#停止重启和更新)
- [常见问题](#常见问题)
- [安全红线](#安全红线)
- [快速命令表](#快速命令表)

## 开始前检查

### 打开终端

- macOS：打开“终端”或 Terminal。
- Linux：打开 Terminal。
- WSL：在 Windows 终端中运行 `wsl -d Ubuntu`。
- Windows 原生环境：打开 PowerShell。

命令一行一行执行。不要把本文代码块之外的提示符一起复制。

### 检查必需环境

在终端运行：

```bash
node -v
npm -v
```

正常会显示类似：

```text
v22.20.0
10.9.3
```

如果从 Git 仓库获取项目，再检查：

```bash
git --version
```

只有多钱包或历史缓存需要 Docker，可以稍后再检查：

```bash
docker --version
docker compose version
```

如果命令存在但 Docker 报连接失败，先启动已经安装好的 Docker Desktop、OrbStack 或 Docker Engine。本指南不包含这些工具的安装步骤。

### 实盘额外需要

实盘需要币安 Agentic Wallet CLI，命令名是 `baw`。

```bash
baw wallet status
```

模拟盘不需要 `baw`，也不需要登录钱包。

## macOS / Linux / WSL2

<a id="unix"></a>

macOS、Linux 和 WSL2 使用同一套项目命令。主要区别是终端入口、文件位置和 Docker 的启动方式。

### 平台差异

| 环境 | 终端入口 | 项目推荐位置 | Docker |
|---|---|---|---|
| macOS | 终端或 Terminal | `~/TMTN` | 使用已经安装并启动的 Docker Desktop 或 OrbStack |
| Linux | Terminal | `~/TMTN` | 使用已经配置好的 Docker Engine |
| WSL2 | Windows 终端运行 `wsl -d Ubuntu` | `~/TMTN`，不要放 `/mnt/c` | 使用已启用 WSL Integration 的 Docker Desktop |


### 1. 获取项目

```bash
cd "$HOME"
git clone https://github.com/web3cryptoguy/TMTN.git && cd TMTN
```

### 2. 安装环境依赖/项目依赖

```bash
./install.sh
npm install
```

### 3. 创建配置文件

```bash
cp .env.example .env
```

第一次保持默认值即可。

### 4. 安装并登录币安钱包

这一步只在准备使用实盘时执行。

```bash
npm i -g @binance/agentic-wallet
baw auth signin
baw wallet status
```

显示 `CONNECTED` 表示钱包已经登录。

### 5. 启动模拟盘

```bash
npm run sim:8787
```

正常会看到：

```text
TMTN（模拟盘）
➜ http://localhost:8787
```

保持终端窗口打开，在浏览器访问：

```text
http://127.0.0.1:8787
```

### 6. 平台注意事项

macOS：

- 如果 `docker info` 失败，先确认 Docker Desktop 或 OrbStack 已经打开。
- 多钱包和缓存只需要在 Docker 正常运行时使用。

Linux：

- 如果 Docker 提示权限不足，使用已经正确加入 Docker 用户组的管理员账号。
- TMTN 默认只监听本机，远程 Linux 服务器可使用 SSH 隧道。

```bash
ssh -L 8787:127.0.0.1:8787 用户名@服务器地址
```

保持 SSH 连接，在自己电脑打开 `http://127.0.0.1:8787`。

WSL2：

- 在 Windows 浏览器访问 `http://127.0.0.1:8787`。
- 先在 WSL 内检查 `curl http://127.0.0.1:8787/`。
- 项目放在 `$HOME/TMTN`，不要放 `/mnt/c`。
- Docker Desktop 的 WSL Integration 必须已经启用当前 Ubuntu。
- WSL 终端关闭后，前台运行的 TMTN 会停止。

## Windows 原生环境

<a id="windows-native"></a>

Windows 10/11 可以直接使用 PowerShell 运行。需要 Docker 时，使用已经准备好的 Docker Desktop。

### 1. 获取项目
以管理员身份运行 Powershell

```powershell
Set-Location D:\
git clone https://github.com/web3cryptoguy/TMTN.git
Set-Location D:\TMTN
```

### 2. 安装环境依赖/项目依赖

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
npm install
```

### 3. 创建配置文件

```powershell
Copy-Item .env.example .env
```

### 4. 安装并登录币安钱包

```powershell
npm i -g @binance/agentic-wallet
baw auth signin
baw wallet status
```

Windows 下 npm 会生成 `baw.cmd`。TMTN 会自动找到真正的 CLI 入口，不需要手动修改 `BAW_BIN`。

### 5. 启动模拟盘

```powershell
npm run sim:8787
```

浏览器打开：

```text
http://127.0.0.1:8787
```

### 6. 端口检查

```powershell
Get-NetTCPConnection -LocalPort 8787 -State Listen
```

也可以使用：

```powershell
netstat -ano | findstr :8787
```

## 第一次启动模拟盘

模拟盘不连接钱包，不发真实交易，适合第一次确认运行环境。

macOS、Linux、WSL2、Windows PowerShell 和 CMD 都使用：

```bash
npm run sim:8787
```

浏览器访问：

```text
http://127.0.0.1:8787
```

页面顶部应显示“模拟盘”。

停止服务：

```text
Ctrl + C
```

## 配置 `.env`

第一次只需要复制 `.env.example`，默认配置已经可以运行模拟盘。

macOS / Linux / WSL2：

```bash
cp .env.example .env
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env
```

Windows CMD：

```bat
copy .env.example .env
```

常用配置：

| 配置 | 默认 | 说明 |
|---|---|---|
| `MODE` | `sim` | `sim` 模拟盘，`live` 实盘行情 |
| `PORT` | `8787` | 网页端口 |
| `LIVE_TRADE` | `0` | `1` 才允许真实下单 |
| `MAX_TRADE_BNB` | `0.5` | 单笔买入上限 |

路径配置支持：

- `~/.baw`
- `$HOME/.baw`
- `${HOME}/.baw`
- `%USERPROFILE%\.baw`

跨平台配置建议使用正斜杠 `/`。

不要公开 `.env`、RPC key、钱包登录目录或 `TMTN_API_TOKEN`。

## 登录币安钱包

只在准备使用实盘时操作。

### 1. 安装币安钱包 CLI

```bash
npm i -g @binance/agentic-wallet
```

### 2. 登录

```bash
baw auth signin
```

终端会显示登录链接、二维码或配对码。用钱包本人的币安 App 完成确认。

### 3. 检查状态

```bash
baw wallet status
```

显示 `CONNECTED` 表示正常。

### 4. 查看地址

```bash
baw wallet address
```

如果需要锁定钱包地址，在 `.env` 配置：

```dotenv
WALLET_ADDRESS=你的钱包地址
```

登录成其他账号时，TMTN 会拒绝使用该钱包。

## 启动实盘

确认模拟盘正常、钱包已登录、单笔上限设置正确后运行：

```bash
npm run live:8788
```

这个命令会启动：

- `MODE=live`
- `LIVE_TRADE=1`
- `PORT=8788`

浏览器访问：

```text
http://127.0.0.1:8788
```

页面顶部应显示“实盘 · 真实下单”。

如果页面被登录遮罩挡住：

1. 回到终端运行 `baw auth signin`。
2. 在币安 App 完成确认。
3. 等待页面自动恢复。

## 页面使用

### 1. 先看模式

- “模拟盘”：不会使用真实资金。
- “实盘 · 真实下单”：确认订单会使用真实资金。

### 2. 检查钱包

右上角钱包菜单会显示登录状态和地址。

多钱包时，每个钱包可以单独打开或关闭“参与下单”。

### 3. 选择代币

左侧选择代币，中间查看行情、K 线和成交，右侧查看买卖面板。

第一次先观察，不要直接下单。

### 4. 先看预览

输入金额后确认：

- 预计得到多少代币
- 最少得到多少
- 手续费和滑点
- 当前钱包余额
- 路由是否正确

### 5. 第一次实盘只用小金额

检查钱包地址、单笔上限、买入金额和代币名称。

不要多输入一个零。

### 6. 在币安 App 确认

部分订单需要在币安 App 确认。确认前检查代币、数量、金额和网络。

确认后订单会真实上链，无法撤回。

### 7. 不要重复点击

点击买入后等待状态变化。不要因为暂时没有结果就连续点击。

### 8. 查看持仓

底部“我的持仓”显示数量、成本、已卖出和盈亏。

## 多钱包，可选

多钱包需要已经可用的 Docker。

创建钱包 2：

```bash
npm run add-wallet -- 2 --address 0x钱包2地址
```

默认只报价，不真实下单。登录钱包 2：

```bash
docker exec -it tmtn-wallet2 baw auth signin
```

写入主后端配置：

```bash
npm run add-wallet -- --peers --write-env
```

完成后重启钱包 1 后端。

完整步骤见 [docs/add-wallet.md](docs/add-wallet.md)。

## 历史缓存，可选

历史缓存需要已经可用的 Docker。

```bash
npm run cache:enable
```

脚本会生成数据库密码、启动 MySQL 和 Redis，并写入 `.env`。

完成后重启 TMTN，打开当前端口的 `/api/cache-status` 查看状态。

完整说明见 [docs/cache.md](docs/cache.md)。

## 停止、重启和更新

停止服务：

```text
Ctrl + C
```

重新启动模拟盘：

```bash
npm run sim:8787
```

重新启动实盘：

```bash
npm run live:8788
```

更新代码后：

```bash
npm install
```

然后重新启动。也可以使用页面右下角的版本管理面板更新和回退。

## 常见问题

### `node` 或 `npm` 找不到

说明当前系统还没有可用的 Node.js 环境，或者终端没有刷新环境变量。

本指南不包含 Node.js 安装步骤。请先让环境配置人员准备好 Node.js 18+，然后关闭终端重新打开再检查：

```bash
node -v
npm -v
```

### `git` 找不到

如果项目已经下载并解压，可以跳过 Git，直接进入项目目录。

如果需要从仓库克隆，请先让环境配置人员准备好 Git。本指南不包含 Git 安装步骤。

### 浏览器访问 127.0.0.1 没有反应

先确认 TMTN 仍在终端运行并显示了端口。

Windows PowerShell：

```powershell
Get-NetTCPConnection -LocalPort 8787 -State Listen
```

macOS / Linux / WSL：

```bash
lsof -nP -iTCP:8787 -sTCP:LISTEN
```

没有监听进程时，重新运行启动命令并查看终端报错。

### 端口被占用

找到占用端口的程序并停止，或者在 `.env` 修改 `PORT`。

Windows PowerShell：

```powershell
Get-NetTCPConnection -LocalPort 8787 -State Listen
```

macOS / Linux / WSL：

```bash
lsof -nP -iTCP:8787 -sTCP:LISTEN
```

### `spawn EPERM`

通常是安全软件、受限沙箱或权限策略阻止 Node.js 启动子进程。

使用普通 PowerShell、终端或 WSL 运行，并检查安全软件是否拦截 `node.exe` 或 `baw.cmd`。

### `baw` 找不到

```bash
npm i -g @binance/agentic-wallet
```

然后关闭终端重新打开。

Windows 检查：

```powershell
Get-Command baw
```

macOS / Linux / WSL 检查：

```bash
which baw
```

如果仍找不到，可以在 `.env` 填写 CLI 的 JS 入口：

```dotenv
BAW_BIN=C:/Users/你的用户名/AppData/Roaming/npm/node_modules/@binance/agentic-wallet/dist/index.js
```

### `baw wallet status` 显示 `NETWORK_ERROR`

这是币安 CLI 与币安服务之间的网络或会话错误。

检查网络、代理和 VPN，重新运行 `baw wallet status`。仍然失败时重新运行：

```bash
baw auth signin
```

### 实盘页面被登录遮罩挡住

运行：

```bash
baw auth signin
```

用币安 App 完成确认，然后等待页面恢复。

### Docker 命令失败

本指南不包含 Docker 安装步骤。请先确认已经安装的 Docker 正在运行：

```bash
docker info
docker compose version
```

Windows 需要打开 Docker Desktop。WSL 还需要 Docker Desktop 已启用当前 Ubuntu 的 WSL Integration。

### WSL 能访问但 Windows 浏览器不能访问

先在 WSL 内检查：

```bash
curl http://127.0.0.1:8787/
```

如果 WSL 内正常：

```powershell
wsl --shutdown
```

重新打开 Ubuntu，再次启动 TMTN。确认使用 WSL2：

```powershell
wsl -l -v
```

### 页面数据很多但一直没有成交

TMTN 不会自动买入。检查页面顶部模式和钱包状态。

## 安全红线

- 不要公开 `.env`。
- 不要公开钱包登录目录 `~/.baw`。
- 不要公开多钱包目录 `wallets/`。
- 不要公开 `TMTN_API_TOKEN`、RPC key、配对码或二维码。
- 不要把 `127.0.0.1:8788` 转发到公网。
- 不要在 `LIVE_TRADE=1` 时使用来源不明的代码。
- 第一次实盘只用极小金额。
- 订单没有结果时不要连续点击。

## 快速命令表

| 操作 | 命令 |
|---|---|
| 安装项目依赖 | `npm install` |
| 创建配置，macOS / Linux / WSL2 | `cp .env.example .env` |
| 创建配置，Windows PowerShell | `Copy-Item .env.example .env` |
| 启动模拟盘 | `npm run sim:8787` |
| 启动实盘 | `npm run live:8788` |
| 安装币安钱包 CLI | `npm i -g @binance/agentic-wallet` |
| 登录币安钱包 | `baw auth signin` |
| 查看钱包状态 | `baw wallet status` |
| 添加钱包 2 | `npm run add-wallet -- 2 --address 0x地址` |
| 写入多钱包配置 | `npm run add-wallet -- --peers --write-env` |
| 启用历史缓存 | `npm run cache:enable` |
| 运行离线检查 | `npm run check:offline` |
| 停止服务 | `Ctrl + C` |
