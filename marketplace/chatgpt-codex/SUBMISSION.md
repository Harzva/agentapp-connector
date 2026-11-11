# ChatGPT 桌面 / Codex CLI / IDE 扩展：提交清单

- 平台：ChatGPT 桌面 / Codex CLI / IDE 扩展（chatgpt-codex）
- 状态：**NOT-SUBMITTED** —— 占位骨架，没有提交、没有审核、没有上架
- 该类目规范：已找到该类目官方公开提交规范
- 市场入口：https://chatgpt.com/apps
- 依据登记日期：2026-11-11

> 本目录由 `src/packs.mjs` 从政策注册表生成，不要手改。所有地址、主体、凭据字段都是占位符。
> OpenBot 目前只有桌面内 `127.0.0.1` 的端点，没有公网常驻 HTTPS MCP Server、OAuth 与多用户隔离。

## 需满足

- [ ] 组织角色需具备 plugin submission write access（Platform 里标为 Apps Management）
- [ ] 提交内容包含 MCP 连接信息、测试指南、目录元数据、国家/地区可用性、隐私政策
- [ ] 需提供公网可达 HTTPS 的 /mcp 端点；工具需正确的 readOnlyHint / openWorldHint / destructiveHint 注解
- [ ] 遵守 App Submission Guidelines、Usage Policies，内容适合所有受众；写操作按需引入 OAuth 2.1
- [ ] 经平台扫描工具元数据、审核与批准后发布，更新需重新提交

## 阻塞项（逐条解决前不要提交）

- [ ] 当前 OpenBot 只有本机 127.0.0.1:4818 端点，没有公网 HTTPS /mcp，也没有 OAuth 与多用户隔离
- [ ] 工具定义与注解尚未按 Apps SDK 规范改造，仍以异步 job 语义（submit → task → result）为主
- [ ] 未准备目录元数据、测试指南、国家/地区设置与隐私政策页面

## 依据

- [Plugin guidelines（App Submission Guidelines）](https://developers.openai.com/apps-sdk/app-submission-guidelines)（official / indexed）
- [Submit plugins](https://help.openai.com/en/articles/20001040-submitting-apps-to-the-chatgpt-app-directory)（official / indexed）
- [Developers can now submit apps to ChatGPT](https://openai.com/blog/developers-can-now-submit-apps-to-chatgpt)（official / indexed）
- [Build an MCP server](https://developers.openai.com/apps-sdk/build/mcp-server)（official / indexed）
- [ChatGPT 应用目录](https://chatgpt.com/apps)（official / indexed）
- [开发者平台提交入口](https://platform.openai.com/apps-manage)（official / indexed）
- [ChatGPT 中的应用（帮助中心）](https://help.openai.com/zh-hans-cn/articles/9309188-connected-apps-on-chatgpt)（official / indexed）

## 提交动作

- [ ] 在平台后台确认主体认证与发布权限
- [ ] 部署公网 HTTPS MCP Server 并完成认证、最小权限与审计
- [ ] 按目录规范改造工具名 / 描述 / 注解 / 输出 schema
- [ ] 补齐图标、隐私政策、文档 URL、测试账号与测试指南
- [ ] 后台实际提交；提交后把 `status` 从 `NOT-SUBMITTED` 改为平台返回的真实状态

