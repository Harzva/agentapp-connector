# agentapp-connector 交接提示词

> 直接复制本文件给接手的 agent 或同事。项目根目录：本仓库检出的根目录（下文命令均相对它执行）。

## 0. 产品愿景（后续演进的北极星）

**agentapp-connector 的终点不是 OpenBot 专用工具**，而是一个通用接入器：**任何开发者都能借助它，快速把自己的应用链接到各种 Agent 应用市场**。

具体形态：现在 `openbot` 这个名字、连接器路径、工具清单是写死在代码里的；后续要把「被接入的应用」抽成一份**应用档案（app profile）**——开发者只声明：

- 应用名与市场键（现在写死的 `SERVER_NAME='openbot'` 要变成档案字段）
- MCP 入口：stdio `command` 或 HTTPS `url`
- 工具清单（名称 + `readOnlyHint` / `destructiveHint` 注解）
- 认证方式：token / API Key / OAuth 2.1 DCR

然后 `agentapp-connector` 自动产出：10 个 target 的本地配置、7 个平台的市场材料、逐平台的 `doctor` / `local-status` / `market-preflight`。**平台差异（TOML 表 vs camelCase vs 表单 vs 嵌套 `mcp.servers`、各市场审核口径）全部由连接器吸收，开发者不碰。**

已有的积累直接复用：target 格式契约、政策注册表（98 条依据）、`findTomlTableRange` / `inspectMcpDeclaration` / `inspectCodexCli` 这些结构化解析、闸门与变异纪律——泛化时这些是资产，不是包袱。第一步建议：把 `SERVER_NAME` 与 `DEFAULT_CONNECTOR_PATH` 从 `src/targets.mjs` 常量改成 `makeConfig` 的入参，保持现有 129 条测试全绿的前提下逐步抽。

## 1. 这个项目是什么（当前）

把 OpenBot 的 Bot 能力接到多个 Agent 应用平台（WorkBuddy、千问办公、豆包工作、ChatGPT/Codex、Cursor、Claude Desktop、ZCode），分两层：

- **本地模式**：生成各客户端能读的配置（JSON / TOML / UI 表单），本机跑通，只能自己用。
- **市场模式**：上架到平台连接器市场，需要公网 HTTPS MCP Server + OAuth/API Key + 主体认证 + 审核。

**当前只完成本地模式。市场模式全部是占位材料，七个平台一个都没有提交过。**

## 2. 接手先跑这三条

```sh
cd <仓库根目录>
npm test                                                      # 必须是 129 条全绿、退出码 0
node src/cli.mjs doctor --home /tmp/aac-fake-home --no-handshake
node src/cli.mjs market-preflight
```

`npm test` 不是普通测试：它校验退出码、用例条数（`test/gate.mjs` 的 `EXPECTED_CASES`）、失败/跳过/取消/待办为 0、测试文件非空。新增或删除用例必须同步这个数字，否则闸门红。

## 3. 当前状态（2026-11-11）

- 版本 `0.0.4`；10 个 target、7 个平台；**129 条用例 / 12 个测试文件全绿**；政策·本地·市场依据 98 条
- 0.0.4 新增第七个平台 **ZCode**（用户点名「要包括 zcode 市场」）：2 个 target（`zcode` HTTP / `zcode-stdio`，嵌套 `mcp.servers` 键、schema 严格、配置文件不展开 `${...}` 模板 → `authPlaceholderSupported=false`）；市场档案按官方 CONTRIBUTING（GitHub PR 到 `zai-org/zcode-plugins` + 维护者审核）登记为 `official`；ZCode 是唯一收**插件包**且插件可自带 stdio MCP、不强制公网 HTTPS 端点的市场
- 文档：`README.md`（升级历程最全）、`docs/POLICIES.md`、`docs/LOCAL-MODES.md`、`docs/MARKETPLACE.md`、`marketplace/`（含 `zcode/` 占位包）
- 真实本机已写入：`~/.codex/config.toml`、`~/.cursor/mcp.json`、Claude Desktop 配置（本机没装 `Claude.app`）；**`~/.zcode/cli/config.json` 未写入**（合并/替换已在临时目录与沙箱闭环验证，实际写入留给用户显式执行，ZCode 需重启会话生效）
- ZCode 平台侧服务条款 / 隐私政策未取证：`policies` 数组为空并在 blockers/notes 写明，不编造条款
- 所有 target 的 `liveTested` 仍是 `false`：客户端内实机连接未验收
- `verify-local` **已于 2026-11-11 收尾轮在真机拿到 3/3 verified**（OpenBot 1.0.33 在线、桥 port 64089、exit 0）；真实 home 完整 `doctor` 19 项退出码 0（早前的读保护已消失）；`local-status` workbuddy 验证结论 `verified`。客户端 UI 层验收（信任 / 实机调用 / zcode 写入）仍未做，`liveTested` 全为 false
- **开源发布就绪**：单独克隆复验通过（无同级 OpenBot 工作区的干净副本：闸门 129 全绿、`doctor` 对悬空连接器路径如实上报）；「前提与边界」已写明本仓库不含 stdio 连接器本体、默认路径悬空的行为与 `--connector-path` 出口。- **开源发布就绪**：LICENSE（MIT）/ CONTRIBUTING / CHANGELOG / CI（Node 18/20/22 + 生成产物 diff 检查）/ .gitignore / 英文简介 / banner·logo·social-card·真实 logo 墙全部就位，README 头部为纯 HTML（渲染器无关）；CI 全序列本地预演过（生成产物零漂移）。剩余动作在用户侧：建远程仓库并 push、Settings 上传 `assets/social-card.png`、仓库 slug 定了可换动态徽章；`HANDOFF.md` 是否随仓库公开由用户定（已脱敏本机绝对路径）

## 4. 已完成（10 轮「一个细节」+ 4 个基建阶段）

基建：

1. 0.0.2 从单一配置生成器重构成 target 注册表（8 个 target）
2. 政策 / 本地 / 市场三份机器可读注册表 + 生成文档（90 条依据，39 条已抓正文）
3. 本机真实安装：默认只输出计划，`--write-to` 才写，写前备份、写后回读
4. 市场包骨架 + `market-preflight`（六平台 `ready=false`）
5. 0.0.4 新增 ZCode 第七平台：嵌套 `mcp.servers` 形状贯穿生成 / 合并 / doctor 三处；证据含官方 mcp-services 与 plugin 文档正文、`zai-org/zcode-plugins` 的 CONTRIBUTING 全文与本机市场样本；`marketplace/zcode/` 占位包（市场清单刻意叫 `marketplace.placeholder.json`，避免被当成可添加市场直接安装）

细节：

5. `verify-local` 默认超时 12s → 20s，能等到连接器自身 15s 超时并拿到真实错误码
6. `local-status` 验证四态：`verified` / `partial` / `not-run` / `not-applicable`
7. 坏端口不让整份 `doctor` 报告消失（`bad-endpoint` / `request-failed` 分原因）
8. `nextStep` 按根因分，坏数据不再叫用户去重启桌面
9. TOML 同名表按结构判断，`--force` 真正替换整张表（不再追加第二张）
10. `skipped` ≠ `blocked`；`stdioProtocolOk` 改成 `true` / `false` / `null` 三态
11. `codex-config` 表头按结构判断（注释不算、表头内空格算）
12. `codex-config` 表头存在 ≠ 表可用（空表 / 缺 `command`·`url`）
13. 三个 JSON 检查项「键存在 ≠ 可用」；JSON 解析失败记 `unknown`
14. `codex-cli`：退出码非 0 不再算 `ok`；解析 `codex mcp list` 表格，没注册 / `disabled` / 输出认不出分开

每一条的取证、真机前后对照、变异条数都在 `README.md` 对应小节，别只看这份摘要。

## 5. 未完成（按优先级；不要写成已完成）

**P0 上市场的硬前提**（截图问题的答案也在这里）

- **是的，要上市场必须有云服务**：公网 HTTPS 常驻 MCP Server（现在只有 `127.0.0.1:4818`，桌面退出即停）；千问办公的「连接器键与服务 URL 创建后不可改」条款意味着必须先定公网生产地址。
- **是的，要提供账号信息**：主体认证（WorkBuddy 开放平台列有企业 / 其他组织 / 个人三类；千问办公要求实名或主体认证；Cursor / Claude 有发布者条款）+ 开发者后台账号 + 审核用测试账号（Claude 明确要求「填充好数据的测试账号」）。
- OAuth 2.1 / DCR 或 API Key 认证、多租户隔离、凭据轮换
- 工具注解（`readOnlyHint` / `destructiveHint` / `openWorldHint`）、输出 schema、隐私政策 URL、目录图标

**P1 本机验收**

- WorkBuddy UI「信任」（`~/.workbuddy/mcp-approvals.json` 现在为空）
- 桌面稳定后 `verify-local` 3/3
- 启动 4818 发布服务，跑 HTTP MCP 握手与 `tools/call`
- 真实 home 下复跑 `doctor` / `local-status`：`~/.codex/config.toml` 被本机读保护，单独 `readFileSync` 即 SIGTERM，目前只能用 `--home` 临时目录取证

**P2 客户端实测**

- 千问办公客户端、Claude Desktop 安装；豆包工作 UI 表单 + OAuth 授权
- Cursor STDIO `type` 字段口径在 UI 复核（官方文档自相矛盾，已登记未裁决）
- ZCode：用户显式确认后 `install-local --target zcode-stdio --write-to '~/.zcode/cli/config.json'` 写真实配置，重启会话后在 设置 → MCP 确认 `openbot` connected（`zcode-config` 从 blocked 转 ok 只是第一步，UI 内实机调用才算验收）

**P2 政策复核**

- 腾讯规则中心开发者服务协议 4.3(7)、隐私保护指引、数据处理协议的后台全文
- 豆包服务商连接器规范（登录 / 入驻后可见）
- Anthropic AUP（2026-11-12 生效）、OpenAI Usage Policies（2026-11-20 生效）按生效版本重核

**P3 实际提交**

- 七个平台都没有提交；`marketplace/` 全是 `NOT-SUBMITTED` 占位，端点一律 `https://mcp.example.invalid/mcp`
- ZCode 是当前唯一不需要公网 HTTPS 端点就能走完提交链路的市场：把 `connector.cjs` 打包成 `.zcode-plugin/plugin.json` 插件（stdio 形态），备齐 README.md + README_CN.md 与副作用披露后向 `zai-org/zcode-plugins` 提 PR（`external_plugins/`），走维护者人工审核

## 6. 工作纪律（踩过的坑，必须遵守）

1. **一次只改一个细节**：先取证（真跑或构造临时 home），再改，再测试，再同步文档与 memory。
2. **「没跑」不是「失败」也不是「通过」**：用 `unknown` / `null` / `not-run` 表达，跳过不能计入 `blocked`。
3. **「看不到」不等于「没有」**：解析失败、格式认不出、命令超时都只能 `unknown`。
4. **别用字符串包含判断结构**：TOML 表头、JSON 声明、命令表格都按结构解析。
5. **`nextStep` 必须是可执行动作，且按根因分**；所有失败共用一句，等于把人带到错处。
6. **测试夹具不能替产品打掩护**：夹具要用真实形态，别用「刚好能过」的假数据。
7. **变异验证**：在 rsync 副本跑（`cp -R` 被沙箱拦），每条一个独立进程，跑完逐条 sha256 还原；历史批次不重跑就写明分界。
8. **`EXPECTED_CASES` 必须同步**；判「通过」看「条数 + 退出码」两条。
9. **不许把推演写成真机结果**：没真跑旧二进制就写「按判据推演」。
10. **平台政策只写有依据的**，标 `fetched` / `indexed` / `sample` / `tutorial`；抓不到就写「正文缺失」，不编条款。
11. **不要用「甲方 / 交付 / 验收」话术**；这是自己的产品。但事实性的未完成项必须说清楚。

## 7. 下一步建议（按性价比）

1. **ZCode 插件打包**：把 `connector.cjs` / `run.sh` 打包成 `.zcode-plugin/plugin.json` 插件（stdio + `${CLAUDE_PLUGIN_ROOT}`），备齐双语 README 与副作用披露——这是唯一不强制公网端点的市场上架路径，比继续打磨 `doctor` 更先把「能提交」向前推一格。
2. **泛化第一步**：把 `SERVER_NAME` / `DEFAULT_CONNECTOR_PATH` 抽成应用档案参数，向「任何开发者可用」的愿景推进（见第 0 节）；0.0.4 的 `mcpKeyShape` 已经是档案化形状参数的第一块。
3. `workbuddy-trusted` 只判 `approvals.parsed?.openbot` 真值，不看值形状（`false` / 过期时间 / 对象都算「已信任」）——同类「有响应 ≠ 内容正确」。
4. `stdioHandshake` 只收齐 `initialize` / `tools/list` / `ping` 就判通过，不核对工具名单是否含预期的 6 个工具。
5. 公网 MCP Server 骨架：其余六个市场上架的硬阻塞；对泛化愿景来说它同时就是「任何应用都能上市场」的公共基建。

## 8. 关键文件

| 文件 | 作用 |
| --- | --- |
| `src/targets.mjs` | 10 个 target 的格式契约（JSON / TOML / 表单 / 嵌套 mcp.servers） |
| `src/config.mjs` | 配置生成核心，按 target 输出 |
| `src/install.mjs` | 安装计划、JSON/TOML 合并、备份回读、`findTomlTableRange` |
| `src/local.mjs` | `doctor`、本机事实翻译、表头/声明/命令输出解析 |
| `src/verify.mjs` | `verify-local` 真实 stdio 只读 `tools/call` |
| `src/local-status.mjs` | 六平台逐平台状态与验证四态 |
| `src/policies.mjs` | 政策 / 本地 / 市场注册表（90 条依据） |
| `src/preflight.mjs` | `market-preflight` 上架前置检查 |
| `src/docs.mjs` / `src/packs.mjs` | 生成三份文档与 `marketplace/` |
| `test/gate.mjs` | 验收闸门与 `EXPECTED_CASES` |
| `openbot-workbuddy-connector/connector.cjs` | 现有 WorkBuddy stdio MCP，6 个工具，未修改 |
| `assets/` | 开源发布物料：`banner.svg` / `logo.svg` / `social-card.svg+.png`（原创）与 `logos/`（7 平台真实 logo + `SOURCES.md` 来源许可登记）；README 头部为开源宣传样式，但「未提交」状态仍在首屏如实声明 |
| `LICENSE` / `CONTRIBUTING.md` / `CHANGELOG.md` / `.github/workflows/ci.yml` / `.gitignore` | 开源发布配套：MIT（第三方商标除外）、十条贡献纪律、0.0.1→0.0.4 变更史、Node 18/20/22 闸门 + 生成产物 diff 检查 |
| `docs/README_EN.md` | 英文简介（简版，主文档仍以中文 README 为准） |
| `test/assets.test.mjs` | 资产闸门：README 引用的本地资产与相对链接目标必须存在非空；logos 每个文件必须在 SOURCES.md 登记、深浅色变体成对 |
| `test/publish.test.mjs` | 发布面泄漏闸门：30+ 个发布面文本文件禁真实凭据模式与本机绝对路径前缀；占位凭据（`${OPENBOT_GRANT_TOKEN}` / `${user_config.*}`）反向钉住不许丢 |
| `.github/PULL_REQUEST_TEMPLATE.md` / `.github/ISSUE_TEMPLATE/bug-report.md` / `SECURITY.md` | PR 硬性自检清单、缺陷报告模板（脱敏提醒 + 「没跑 ≠ 失败」的报告纪律）、安全报告通道与使用须知 |
