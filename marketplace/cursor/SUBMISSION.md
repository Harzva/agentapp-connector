# Cursor：提交清单

- 平台：Cursor（cursor）
- 状态：**NOT-SUBMITTED** —— 占位骨架，没有提交、没有审核、没有上架
- 该类目规范：已找到该类目官方公开提交规范
- 市场入口：https://cursor.com/marketplace
- 依据登记日期：2026-11-11

> 本目录由 `src/packs.mjs` 从政策注册表生成，不要手改。所有地址、主体、凭据字段都是占位符。
> OpenBot 目前只有桌面内 `127.0.0.1` 的端点，没有公网常驻 HTTPS MCP Server、OAuth 与多用户隔离。

## 需满足

- [ ] 在 cursor.com/marketplace/publish 提交公开 Git 仓库链接（需登录），遵守《Cursor 应用市场发布者条款》；更新已上架插件走 request re-index
- [ ] 插件需有效清单：根 plugin.json 或 .cursor-plugin/plugin.json；多插件仓库需 .cursor-plugin/marketplace.json
- [ ] 名称全局唯一、小写 kebab-case；描述清楚；组件文件与 frontmatter 合法；清单内路径均为相对路径（无 ..、无绝对路径）
- [ ] 插件必须开源、本地测试通过、提供 README.md 与 logo；mcp.json 里的每个 ${VAR} 都要在 variables schema 声明，仓库内不得放密钥
- [ ] Cursor 团队对每个插件及每次更新做安全/数据处理/质量人工审查；更新通过后重新索引
- [ ] 发布者条款 3.1：市场插件必须免费向用户提供，不得直接或间接收费；6.3：不得用 Plugin Data / User Content 训练 AI 模型

## 阻塞项（逐条解决前不要提交）

- [ ] 现有 OpenBot MCP 依赖本机桌面与 127.0.0.1:4818，没有可公开访问的远程 MCP Server，也没有公开 Git 仓库与插件清单
- [ ] 市场上架的是「插件包」，不是本机 mcp.json；两者不能互相替代
- [ ] 发布者条款 2.2 写明审查与批准完全由 Anysphere 自行决定且不说明理由；3.1 的免费要求与 OpenBot 若走收费 Bot 能力的变现路径直接冲突，上架前须先确定商业模式

## 依据

- [Cursor 应用市场发布者条款](https://cursor.com/marketplace-publisher-terms)（official / fetched）
- [提交入口](https://cursor.com/marketplace/publish)（official / fetched）
- [Plugins reference（官方）](https://cursor.com/docs/reference/plugins)（official / fetched）
- [Plugins（官方）](https://cursor.com/docs/plugins)（official / indexed）
- [MCP integrations](https://cursor.com/help/customization/mcp)（official / indexed）

## 提交动作

- [ ] 在平台后台确认主体认证与发布权限
- [ ] 部署公网 HTTPS MCP Server 并完成认证、最小权限与审计
- [ ] 按目录规范改造工具名 / 描述 / 注解 / 输出 schema
- [ ] 补齐图标、隐私政策、文档 URL、测试账号与测试指南
- [ ] 后台实际提交；提交后把 `status` 从 `NOT-SUBMITTED` 改为平台返回的真实状态

