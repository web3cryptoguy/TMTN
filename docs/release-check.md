# 发版前检查（npm run check）

打 tag 前跑一遍，全绿才发：

```bash
npm run check            # 静态 + 跨平台 + 离线路由 + 在线路由体检（需要 8788 终端在跑）
npm run check:offline    # 只跑前三步（不联网）
```

1. **静态检查**（`scripts/check/lint.mjs`）：所有 .js / .mjs 跑 `node --check`；再找「行尾 `//` 注释后面还藏着字段 / 语句」的写法——这种字段会变成注释，语法合法、启动不报错。确实是举例的注释里写 `lint-ok` 跳过。
2. **跨平台检查**（`scripts/check/platform.mjs`）：确认 npm 脚本不含 POSIX 专用环境变量语法、路径占位符可展开、Bash 入口转发到 Node、Git 换行规则，以及 `GUIDE-CN.md` 的 macOS / Linux / WSL2 统一章节和 Windows 章节完整；指南不得重新加入 Git、Node.js、Docker 安装教学。
3. **离线路由检查**（`scripts/check/offline.mjs`）：构造老盘 / V2 / stocks / V3 / 打新的链上创建事件，走真实的 `gangChain.handle → liveMarket → liveTrader.route`，断言盘型、pad、报价币和买入路由；Flap / Four / 外盘记录断言路由分支。
4. **在线路由体检**（`scripts/check/routes.mjs`）：从运行中的终端抽查每类内盘币（每类最近有成交的 2 个），链上核对 Gang 币到底在哪个合约，调 `/api/preview` 报价，并把 Gang 老盘 buy、Flap 门槛盘 swapExactInput 的真实 calldata 用钱包地址 eth_call 模拟。**只读**：进程里 `LIVE_TRADE=0`、baw 指向不存在的程序，下单模块的 send 换成「模拟通过就停」。可加 `--url`、`--app`、`--per N` 和指定代币地址。

运行时还有 `engine/live/routeGuard.js`：代币的盘型和链上创建事件的来源合约对不上时，在 live.log 打 `[路由自检 ✗✗✗]`、页面顶部出红条；下单前发现这种硬矛盾直接拦下（不发交易），`ROUTE_GUARD=warn` 只报警不拦。
