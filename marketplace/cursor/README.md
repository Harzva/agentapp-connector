# Cursor Plugin 包（占位）

- 平台：Cursor（cursor）
- 状态：**NOT-SUBMITTED** —— 占位骨架，没有提交、没有审核、没有上架
- 该类目规范：已找到该类目官方公开提交规范
- 市场入口：https://cursor.com/marketplace
- 依据登记日期：2026-11-11

> 本目录由 `src/packs.mjs` 从政策注册表生成，不要手改。所有地址、主体、凭据字段都是占位符。
> OpenBot 目前只有桌面内 `127.0.0.1` 的端点，没有公网常驻 HTTPS MCP Server、OAuth 与多用户隔离。

## 官方格式

- 采用 Cursor Plugin 格式：`.cursor-plugin/plugin.json` 清单 + 根目录 `mcp.json`。
- `variables` schema 必须声明 `mcp.json` 里出现的每个 `${VAR}`；仓库内不得放密钥。
- 提交按官方 Plugins reference：推到公开 Git 仓库，再到 cursor.com/marketplace/publish 提交仓库链接。

## 未提供的资产

- 公开 Git 仓库、logo、本地实机测试记录
- 发布者条款 3.1 要求插件免费；若 OpenBot 要收费，须先解决商业模式冲突

