# Claude / Claude Desktop：提交清单

- 平台：Claude / Claude Desktop（claude）
- 状态：**NOT-SUBMITTED** —— 占位骨架，没有提交、没有审核、没有上架
- 该类目规范：已找到该类目官方公开提交规范
- 市场入口：https://claude.com/connectors
- 依据登记日期：2026-11-11

> 本目录由 `src/packs.mjs` 从政策注册表生成，不要手改。所有地址、主体、凭据字段都是占位符。
> OpenBot 目前只有桌面内 `127.0.0.1` 的端点，没有公网常驻 HTTPS MCP Server、OAuth 与多用户隔离。

## 需满足

- [ ] 在开发者后台 claude.ai/directory/manage 选 Submit new → MCP connector；任何付费 Claude 套餐均可提交（Free 不可），Team / Enterprise 由 Owner 提交
- [ ] 只接受远程 HTTPS MCP Server；本地 MCPB / 桌面扩展已 deprecated 且不再单独受理，本地服务器必须打包进 plugin
- [ ] 认证服务用 OAuth 2.0（回调 https://claude.ai/api/mcp/auth_callback），公开数据可免认证
- [ ] 每个工具都要 title 与 readOnlyHint / destructiveHint 注解；工具名 ≤64 字符、描述窄而准确且与功能一致，不得含隐藏指令或诱导跨软件调用
- [ ] 提交材料：文档 URL、隐私政策 URL、支持联系人、图标、文档说明，以及给审核用的**填充好数据的测试账号**
- [ ] 先在 Claude 里作为自定义连接器逐个调用测试；遵守 Anthropic Software Directory Terms 与 Directory Policy（两条官方地址已核实并抓到正文）
- [ ] portal 十步含 Listing / Use cases / Company / Data handling / Test & launch / Compliance，七项 Compliance 确认全部必填；URL slug 发布后永久不可变
- [ ] Directory Policy 还要求带样例数据的标准测试账号、至少 3 个可运行 prompts / use cases，并禁止采集无关对话数据或访问 Claude memory / 聊天历史 / 用户上传文件
- [ ] 提交后自动策略扫描，默认列为 Community；Multiple URLs / URL pattern 的 listing 只有拿到 Verified label 才能发布

## 阻塞项（逐条解决前不要提交）

- [ ] 远程连接器从 Anthropic 云端发起，OpenBot 当前的 127.0.0.1:4818 端点不可达；本地 STDIO 配置不能单独进目录
- [ ] 现有 6 个工具没有 title / readOnlyHint / destructiveHint 注解，且是异步 job 语义；Directory Policy 把工具描述当安全边界，需整体重写
- [ ] 没有公网 HTTPS MCP Server、OAuth 2.0、隐私政策 URL、测试账号与目录图标
- [ ] Directory Terms 要求提交者承担赔偿与持续安全维护义务，Anthropic 可无理由移除 listing；主体与永久 slug 需先确定

## 依据

- [Submit a connector to the directory](https://claude.com/docs/connectors/building/submission)（official / fetched）
- [开发者后台提交入口](https://claude.ai/directory/manage)（official / indexed）
- [Anthropic Software Directory Terms](https://support.claude.com/en/articles/13145338-anthropic-software-directory-terms)（official / fetched）
- [Anthropic Software Directory Policy](https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy)（official / fetched）
- [Connectors Directory](https://claude.com/marketplace/connectors-plugins)（official / indexed）
- [Get started with connectors](https://claude.com/docs/connectors/getting-started)（official / indexed）
- [Get started with custom connectors using remote MCP](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)（official / indexed）

## 提交动作

- [ ] 在平台后台确认主体认证与发布权限
- [ ] 部署公网 HTTPS MCP Server 并完成认证、最小权限与审计
- [ ] 按目录规范改造工具名 / 描述 / 注解 / 输出 schema
- [ ] 补齐图标、隐私政策、文档 URL、测试账号与测试指南
- [ ] 后台实际提交；提交后把 `status` 从 `NOT-SUBMITTED` 改为平台返回的真实状态

