# ZCode 插件包（占位）

- 平台：ZCode（zcode）
- 状态：**NOT-SUBMITTED** —— 占位骨架，没有提交、没有审核、没有上架
- 该类目规范：已找到该类目官方公开提交规范
- 市场入口：https://github.com/zai-org/zcode-plugins
- 依据登记日期：2026-11-11

> 本目录由 `src/packs.mjs` 从政策注册表生成，不要手改。所有地址、主体、凭据字段都是占位符。
> OpenBot 目前只有桌面内 `127.0.0.1` 的端点，没有公网常驻 HTTPS MCP Server、OAuth 与多用户隔离。

## 官方格式（两条分发通道）

- **官方市场**：fork `zai-org/zcode-plugins`，插件放 `external_plugins/<kebab-case>/`，按 CONTRIBUTING.md 提交 PR，维护者按功能 / 安全 / 可维护性 / 兼容性 / 来源 / 许可证人工审核。
- **自建市场**：插件仓库根目录放 `marketplace.json`，用户在 设置 → 插件 → 创建 → 添加插件市场 填仓库 / Git URL / 本地目录；无需平台审核。
- 清单 `.zcode-plugin/plugin.json` 最小只需 `name`（小写字母/数字开头，可含 . _ -，1–128 字符）；CONTRIBUTING 额外要求 `description` / `version` / `author`。
- 至少一个组件；MCP 走根目录 `.mcp.json` 或清单 `mcpServers` 字段，键名命名空间为 `plugin:<插件名>:<服务名>`。
- 必须同时提供 `README.md` 与 `README_CN.md`，并披露网络访问、命令执行、hooks、MCP server 等副作用；不得提交凭据与机器特定路径。
- 已发布版本不可变：改动可安装内容必须同时递增清单与 `marketplace.json` 的语义化版本。

## 未提供的资产（逐条补齐前不可提交）

- 插件源码树：`connector.cjs` / `run.sh` 还没打包成插件组件目录
- `README.md` + `README_CN.md` 双语文档与副作用披露
- 官方市场 PR 所需的 `validate.py` / `build_dist.py` 通过记录
- 图标（HTTPS URL）；官方样本字段按本机 `~/.zcode/cli/plugins/marketplaces/zcode-plugins-official/marketplace.json` 核对

## 与其它市场的关键差异

- 插件可自带 stdio MCP，且插件作用域会展开 `${CLAUDE_PLUGIN_ROOT}` / `${user_config.键}` 等模板变量——这是唯一不强制公网 HTTPS 端点的市场上架路径。
- 配置文件（`~/.zcode/cli/config.json` 的 `mcp.servers`）与插件是两条通道：配置文件不展开模板、schema 严格。

