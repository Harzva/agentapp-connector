# 本地模式清单

> 由 `src/policies.mjs` 与 `src/targets.mjs` 生成，登记日期 2026-11-11。

七个平台都有本地接入方式，但差别很大：**Claude 的远程自定义连接器从 Anthropic 云端发起，本机 `127.0.0.1` 不可达**；
ChatGPT 网页版不读取本机 `config.toml`；豆包工作自定义连接器只能在本地电脑客户端里用；ZCode 用嵌套 `mcp.servers` 键、schema 严格且配置文件不展开 `${...}` 模板。
配置文件写好 ≠ 客户端已安装：本机没有 Claude Desktop 与千问办公客户端，写了配置也不会被读取。

| 平台 | 入口 | 传输 | 配置文件 | UI 信任 | loopback | 依据 |
| --- | --- | --- | --- | --- | --- | --- |
| WorkBuddy | ~/.workbuddy/mcp.json，或 连接器 → 自定义连接器 → 配置 MCP | stdio / streamableHttp / sse | ~/.workbuddy/mcp.json | 需要 | yes | https://open.workbuddy.cn/docs/connector |
| 千问办公 QwenWork | 扩展 → 连接器 → + 添加 → 粘贴 JSON 配置 / 手动填写配置 | streamable-http / sse / stdio | （客户端 UI 内部） | 不需要 | unknown | https://qwenwork.cn/docs/features/connectors<br>https://www.alibabacloud.com/help/zh/doc-detail/3047919.html |
| 豆包工作 | 插件·技能·伙伴 → 连接器 → + 新建自定义连接器 | HTTP（Streamable HTTP） / STDIO（本地电脑运行时） | （客户端 UI 内部） | 不需要 | unknown | https://www.feishu.cn/hc/zh-CN/articles/282796994123-%E5%9C%A8%E9%A3%9E%E4%B9%A6%E4%B8%AD%E4%BD%BF%E7%94%A8%E8%B1%86%E5%8C%85%E5%B7%A5%E4%BD%9C |
| ChatGPT 桌面 / Codex CLI / IDE 扩展 | ChatGPT 桌面 设置 → MCP servers，或 ~/.codex/config.toml 的 [mcp_servers.openbot] | stdio / streamable-http | ~/.codex/config.toml<br>.codex/config.toml（项目级，仅受信任项目） | 不需要 | yes | https://learn.chatgpt.com/docs/extend/mcp<br>https://developers.openai.ac.cn/codex/extend/mcp<br>https://platform.openai.com/docs/docs-mcp |
| Cursor | ~/.cursor/mcp.json（全局）或 .cursor/mcp.json（项目级），也可 Customize → MCPs | stdio / sse / streamable-http | ~/.cursor/mcp.json<br>.cursor/mcp.json | 不需要 | yes | https://cursor.com/docs/context/mcp<br>https://cursor.com/help/customization/mcp |
| Claude / Claude Desktop | Claude Desktop → Settings → Developer → Edit Config → claude_desktop_config.json | stdio（本地） / remote MCP（自定义连接器，需公网可达） | ~/Library/Application Support/Claude/claude_desktop_config.json | 不需要 | unknown | https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp<br>https://claude.com/docs/connectors/building/mcp-apps/getting-started |
| ZCode | ~/.zcode/cli/config.json 的 mcp.servers，或 设置 → MCP 表单（设置面板写入永远落在 .zcode） | stdio / http / sse | ~/.zcode/cli/config.json<br><repo>/.zcode/config.json<br>~/.agents/mcp.json（同作用域回退，顶层 mcpServers 键） | 不需要 | yes | https://zcode.z.ai/cn/docs/mcp-services<br>~/.zcode/cli/plugins/cache/zcode-plugins-official/zcode-guide/0.3.0/skills/diagnosing-mcp/SKILL.md |

## 配置生成器覆盖的 target

| target | 客户端 | 输出形态 | 传输 | 默认配置路径 | 实机连接 |
| --- | --- | --- | --- | --- | --- |
| `qwenwork` | 千问办公 QwenWork | json | streamable-http | （UI 表单） | 未完成 |
| `workbuddy-http` | WorkBuddy（HTTP 发布端点） | json | streamableHttp | ~/.workbuddy/mcp.json | 未完成 |
| `workbuddy-stdio` | WorkBuddy（openbot-workbuddy-connector，已有 stdio 实现） | json | stdio | ~/.workbuddy/mcp.json | 未完成 |
| `doubao-work` | 豆包工作 | form | HTTP | （UI 表单） | 未完成 |
| `codex` | ChatGPT 桌面 / Codex CLI / IDE 扩展 | toml | streamable-http | ~/.codex/config.toml | 未完成 |
| `codex-stdio` | ChatGPT 桌面 / Codex CLI（本地 STDIO） | toml | stdio | ~/.codex/config.toml | 未完成 |
| `cursor` | Cursor | json | streamable-http | ~/.cursor/mcp.json | 未完成 |
| `zcode` | ZCode（HTTP MCP） | json | http | ~/.zcode/cli/config.json | 未完成 |
| `zcode-stdio` | ZCode（本地 STDIO） | json | stdio | ~/.zcode/cli/config.json | 未完成 |
| `claude-desktop` | Claude Desktop（本地 STDIO） | json | stdio | ~/Library/Application Support/Claude/claude_desktop_config.json | 未完成 |

所有 target 的 `liveTested` 都是 `false`：协议层握手通过不等于在客户端里连上。

## 本机怎么试

```sh
node src/cli.mjs doctor                       # 只读探测 + stdio 协议层握手
node src/cli.mjs verify-local                 # stdio 真实只读 tools/call（不派发任务，默认外层 20000ms）
node src/cli.mjs local-status                 # 七个平台逐平台本地状态
node src/cli.mjs install-local --all               # 逐 target 输出计划，绝不批量落盘
node src/cli.mjs install-local --target codex-stdio --write-to ./local-test/config.toml
node src/cli.mjs doctor --home ./local-test/home --no-handshake
```

`install-local` 默认只输出安装计划；只有显式给 `--write-to` 才写文件，写前备份已存在的目标文件，JSON 走 `mcpServers` 键合并、TOML 走追加表（已存在同名表时 `--force` 会**替换整张表**，绝不追加重复表），不会整体覆盖客户端配置。`--all` 是逐 target 的批量计划视图（`writes=0`），HTTP target 用占位地址并标 `addressIsPlaceholder`，**不接受** `--write-to` / `--force`，避免把不可达地址或无人读取的配置批量写进真实客户端。
**TOML 同名表按结构判断，不靠字符串包含**：`findTomlTableRange()` 按行解析表头，容忍 `[ mcp_servers.openbot ]` 的空格、忽略注释行；旧实现用 `existingText.includes('[mcp_servers.openbot]')`，带空格的合法表头被漏判、注释里提到表名被误判成「已存在」。更严重的是旧 `--force` 只跳过检查继续追加，写出两张同名表（标准解析器报 `Cannot declare ('mcp_servers','openbot') twice`）。现在 `--force` 替换该表到下一表头之间的行，保留表前表后内容并补回空行，`action` 如实记为 `replace-table`。

WorkBuddy 的「信任」、豆包 / 千问办公的 UI 表单与 OAuth 授权仍需人在客户端里完成。

**`local-status` 的逐平台验证结论**：只有 `workbuddy` 有可从外部进程直连的 stdio 连接器，所以只有它的 `verification` 反映真实结论，分 `verified` / 失败（`partial`，带下层 `blockingReason`、`failureKinds`、`summary` 与 `timeout`）/ `not-run`（`--no-verify` 或没跑）/ 不适用（其余五平台一律 `not-applicable`）四种。**验证失败不等于不适用**：旧实现只要不是 `verified` 就给所有平台写 `not-applicable`，于是 WorkBuddy 桥超时被硬说成「该平台没有可从外部进程直连的本地 stdio 连接器」，还把 `verify-local` 已归一的根因和超时口径全丢了。`--no-verify` 跳过的是「跑」，不是「判定结果」。

**坏端口不能让整份报告消失**：`endpoint.json` 里的 `port` 只判「是不是整数」不够——桌面崩溃 / 半写状态可能留下 0、负数或 >65535，`http.request` 会同步抛 `ERR_SOCKET_BAD_PORT`。`probeBridgeHttp` 现在先校验 1–65535，越界记 `bad-endpoint`；请求构造阶段的任何同步异常（越界端口、token 里非法 header 字符等）归一为 `request-failed`，两者都判 `blocked` 并带出端口与错误码。`doctor` / `local-status` 仍输出完整 17 项 JSON，不会退化成退出 1、零字节、只剩一句 stderr。

**报告里的 `nextStep` 也要按状态分原因**：`BRIDGE_NEXT_STEP` 与 `BRIDGE_HTTP_STATUS` 键集合一一对应（测试逐项比对，新增状态忘了补指引会变红），`bad-endpoint` 提示检查 / 删除 `endpoint.json`、只有 `timeout` 才提示重启桌面、`request-failed` 指向 `ERR_INVALID_CHAR` 一类错误码。旧实现所有失败共用一句「确认主窗口、重启 OpenBot.app」，会把坏端口这种数据错误带到无效动作上，还不报错。

**跳过 ≠ 失败**：`doctor --no-handshake`（以及 `local-status --no-verify`）产生的 `handshake.status='skipped'` 只记 `unknown`，`detail` 写「本次未执行…这不是握手失败」，`nextStep` 指回去掉跳过参数重跑；顶层 `stdioProtocolOk` 从二态改成三态（`true` 通过 / `false` 失败 / `null` 没跑）。旧实现把除 `ok` 以外一律判 `blocked`，于是 detail 自己写着「调用方跳过握手」却算握手失败，还把「没跑」计入 `summary.blocked` 拉低 `verdict`。同类的 `skipped`（`port4818` / `bridgeHttp` / `codexCli`）本来就走 `unknown`，`stdio-handshake` 是唯一漏掉的；真正的握手超时仍判 `blocked`，测试用同一份事实只改 `status` 做对照，防止「所有非 ok 都变 unknown」。

**`codex-config` 的表存在性也按结构判断**：旧实现用 `codexConfig.text.includes('[mcp_servers.openbot]')`，真机三份文件的结论是双向错的——`[ mcp_servers.openbot ]`（TOML 允许表头内空格）被判「没配」，只有注释 `# [mcp_servers.openbot] was here` 反而被判「已配」（把没配置说成配好了，比漏判更危险），标准表头才碰巧对。现在复用 `findTomlTableRange()`（与 `install-local --force` 同一套解析），新增纯函数 `hasCodexOpenbotTable()`：按行识别表头、忽略注释与键值行、容忍表头内空格、子表不算同一张表。Python `tomllib` 对三份文件都 `PARSE_OK`（两份有表、一份没有）；修复后 `doctor` 与标准解析器逐项一致：带空格 `ok`、只有注释 `blocked`、标准表头 `ok`，17 项检查与退出码 0 不变。**写盘与只读探测必须是同一套结构判断**，否则一边按结构替换、另一边按字符串猜，结论会互相打架。

**表头存在 ≠ 表可用**：只判「有没有表头」仍会把空表 / 只写注释的表报成 `ok`。真机四份 `config.toml` 经 Python `tomllib` 复核全部 `PARSE_OK`，但空表与只有注释的表 `table_keys=[]`——Codex 没有 `command`（stdio）或 `url`（HTTP）根本起不来 MCP server。新增 `inspectCodexTable()`：在 `findTomlTableRange()` 给出的表体范围里按行扫描顶层 `key = value`（跳过注释行、字符串值里出现的关键字不算键、子表被下一表头截断），返回 `ready` / `empty-table` / `no-table` 与实际读到的键。`codex-config` 四态分开：`ready→ok`（detail 列出 keys，nextStep 明说这只是磁盘声明）、`empty-table→blocked`（指向 `--force` 替换整张表或补 `command`/`url`）、`no-table→blocked`（生成并追加）、**文件在但读不到→`unknown`**（`readTextSafe` 返回 `text:null` + `error:'unreadable'`，拿不到证据不能推断已配或未配）。真机对照：空表 / 只有注释 `ok→blocked`，`command` 与 `url` 两种形态仍 `ok`，四次退出码 0、17 项完整。**边界如实说明**：这是行级扫描，不是完整 TOML 解析器，不校验语法、不解析多行值与内联表；语法合法性仍以客户端与 `tomllib` 为准。

**JSON 客户端的「键存在 ≠ 可用」一次性收口**：`workbuddy-declared` / `cursor-config` / `claude-desktop-config` 三处旧实现都只写 `parsed?.mcpServers?.openbot ? ok : blocked`。真机四种 `~/.workbuddy/mcp.json`：空对象 `{}` 与只有 `type` 的声明都报 `ok`（客户端没有 `command` / `url` 起不来），合法 stdio 声明也 `ok`（碰巧对），非法 JSON 反被判 `blocked`（拿不到证据却说「没配」）。现在新增 `inspectMcpDeclaration()`（`unreadable` / `missing` / `incomplete` / `ready`，返回实到 keys 与 `hasLaunchKey`），三个检查项共用一个 `jsonCheck()` 渲染 helper，状态与指引不会各自漂移：`ready→ok`（明说只是磁盘声明）、`incomplete→blocked`（指 `--force` 替换 openbot 键或补启动键）、`missing→blocked`（生成配置）、**解析失败→`unknown`**（`readJsonSafe` 返回 `parsed:null` + `error:'invalid-json-or-unreadable'`）。真机对照：空对象 / 只有 `type` `ok→blocked`、合法声明仍 `ok`、非法 JSON `blocked→unknown`，四次退出码 0、17 项完整。JSON 字面上是 `null`（`error=null`）仍按 `missing` 处理，不与读失败混为一谈；值里出现 `command` 字样也不算启动键。

**`codex-cli` 做透：命令跑成功 ≠ openbot 已注册**：旧检查项只写 `facts.codexCli.status === 'ok' ? 'ok' : 'unknown'`，`nextStep` 还是一句元描述（「…只记为 unknown」）而不是动作。更上游的 `runCommand` 只看 `result.error`，**进程退出码非 0 也照样返回 `status:'ok'`**，报错时的 stdout 会被当成有效证据。真跑本机 `codex mcp list` 拿到的是定宽表格 `Name / ... / Status / Auth`，Env 列的值里带空格、列号不固定，不能按固定位置切列。现在：`runCommand` 新增 `exit-error`（带 `code` 与 stderr 摘要）；`inspectCodexCli()` 用第一列 token 认名字、行尾 3 个 token 认 `enabled` / `disabled`，给出 `registered` / `not-registered` / `disabled` / `unparseable` / `unavailable`；表头认不出、输出为空、状态值认不出、路径里出现 `enabled` 字样都**不下结论**。`codexCliPresentation()` 按根因给动作，五种命令层失败（`skipped` / `not-found` / `timeout` / `error` / `exit-error`）的指引互不重复，测试逐项比对。**口径**：命令层面的问题一律 `unknown`（拿不到证据），只有输出里观察到的事实才判 `ok` / `blocked`。真机复核：真实 `codex mcp list` 解析为 `registered / enabled / 共 4 行`，`doctor` 报 `ok` 且明说「只证明 CLI 列出了它」；另用注入 PATH 的假 `codex` 子进程跑通 5 种场景（已注册 / 没注册 / disabled / 输出认不出 / 退出码 3），17 项检查与退出码 0 不变。

**`verify-local` 的超时口径**：默认外层等 20000ms，上游 `openbot-workbuddy-connector/connector.cjs` 每次桥调用自带 15000ms 超时，超时后才返回 `OPENBOT_BRIDGE_TIMEOUT`。外层必须比上游长，否则默认运行只会拿到「外层 timeout」而看不到真实错误码（上一轮真机外层 12s、靠手动 `--timeout-ms 30000` 才看到）。三个 `tools/call` 是并发发出的，所以 20000ms = 15000ms + 5000ms 余量，不是 3 倍。报告里的 `timeout` 带 `outerMs / connectorCallMs / defaultOuterMs / outerCanObserveConnectorCode`；手动把 `--timeout-ms` 调到 15000ms 或更短，最后一项会是 `false`。外层超时但已有工具带着上游错误码回来时，`blockingReason` 解释那个错误码，而不是「没等齐」这个外层现象。

## 尚未适配 / 不能自动生成配置

| id | 对象 | 原因 |
| --- | --- | --- |
| chatgpt-web | ChatGPT 网页版 | 网页版不读取本地 Codex 配置，需发布为远程 MCP 插件后由工作区安装 |
| qwenwork-market | 千问办公公共扩展市场 | 当前版本不允许个人用户上传或发布自定义能力，企业空间仅组织内共享 |
| workbuddy-market | WorkBuddy Connector 市场 | 需主体认证、公网 HTTPS MCP Server、Connector 包与平台审核 |

