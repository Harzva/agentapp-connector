# Changelog

所有重要变更记录在本文件。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循语义化版本。

## [0.0.4] - 2026-11-11

### 新增

- **第七个平台 ZCode**：`zcode`（HTTP）与 `zcode-stdio` 两个 target，嵌套 `mcp.servers` 键形状贯穿配置生成、JSON 合并与 doctor 复核三处；配置文件不展开 `${...}` 模板，两个 target 均不接受 `--auth placeholder`。
- ZCode 市场档案：按官方 CONTRIBUTING（GitHub PR + 维护者审核）登记为 `official`；`marketplace/zcode/` 占位包（`.zcode-plugin/plugin.json` + `marketplace.placeholder.json`，市场清单刻意不叫 `marketplace.json`，避免占位骨架被当作可添加的本地市场直接安装）。
- doctor 新增 `zcode-app` / `zcode-config` 检查项（17 → 19）。
- 开源发布物料：README 宣传头部（banner / 徽章 / 7 平台真实 logo 墙 / 快速上手）、`assets/`（banner、logo、社交卡片、来源登记）、LICENSE（MIT，第三方商标除外）、CI、CONTRIBUTING、CHANGELOG。
- **真机本机验收**：桌面在线后 `verify-local` 拿到 **3/3 `verified`**（OpenBot 1.0.33，exit 0）；真实 home 完整 `doctor` 19 项通过（早前的 `~/.codex/config.toml` 读保护消失）；`local-status` workbuddy 验证结论 `verified`。客户端 UI 层验收（信任 / 实机调用）仍未做，`liveTested` 保持 false。
- 主 banner 升级为合成位图（`banner.html` → `banner.png`，800×300 @2x）：7 个平台**真实 logo 芯片墙 + 数据胶囊**直接进首屏，并修复 `cursor-white.svg` 重复 fill 属性导致的静默拒载。
- 发布安全与协作配套：`test/publish.test.mjs` 发布面泄漏扫描（凭据模式 + 本机绝对路径，占位符反向钉住）、PR / Issue 模板、`SECURITY.md`、资产与链接完整性闸门。
- `docs/README_EN.md` 英文简介。

### 变更

- 政策·本地·市场依据 90 → 98 条（ZCode 官方 mcp-services / plugin 文档正文、`zai-org/zcode-plugins` 的 README 与 CONTRIBUTING 全文、本机市场注册样本）。
- 测试 119 → 129 条（ZCode 行为 7 条 + 资产一致性 2 条 + 发布面泄漏扫描 1 条）；`EXPECTED_CASES` 同步。

### 修复

- `mergeJsonText` / `inspectMcpDeclaration` 此前只认顶层 `mcpServers`；现按文件内容识别 ZCode 嵌套 `mcp.servers`，两套形状互不误认。

## [0.0.3] - 2026-11-11

### 新增

- 市场包骨架 + `market-preflight`（六平台 `ready=false`，9 项前置检查）。
- `verify-local` 超时口径（默认外层 20000ms > 上游连接器 15000ms，能拿到 `OPENBOT_BRIDGE_TIMEOUT` 等真实错误码）。
- `local-status` 逐平台验证四态（verified / partial / not-run / not-applicable），只有 workbuddy 反映真实结论。

### 修复

- 坏端口（越界 port）不再让整份 doctor 报告消失：`bad-endpoint` / `request-failed` 分原因，请求构造同步异常归一为 blocked。
- `nextStep` 按 `BRIDGE_HTTP_STATUS` 根因一一对应（`BRIDGE_NEXT_STEP` 键集合由测试锁定）。
- TOML 同名表按结构判断（`findTomlTableRange`），`--force` 真正替换整张表而不是追加第二张。
- `codex-config` 表头存在 ≠ 表可用（`inspectCodexTable` 判空表 / 缺启动键）；JSON 客户端「键存在 ≠ 可用」（`inspectMcpDeclaration`），解析失败记 `unknown`。
- `codex-cli`：退出码非 0 不再算 `ok`；解析 `codex mcp list` 表格，没注册 / `disabled` / 输出认不出分开。

## [0.0.2] - 2026-11-11

### 变更

- 从单一配置生成器重构成 target 注册表（8 个 target）与政策注册表（90 条依据），`npm run docs` / `npm run packs` 生成文档与上架材料。

## [0.0.1] - 2026-11-11

### 新增

- 首个可用版本：千问办公 JSON 配置生成，`makeMcpConfig` 兼容入口保留至今。
