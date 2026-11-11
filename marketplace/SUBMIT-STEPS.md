# 市场上架提交步骤（当前不可提交）

> 由 `src/preflight.mjs` 生成，登记日期 2026-11-11。所有平台 `ready=false`，`status` 都不是 `published`。

**结论：7 个平台现在都不能提交。** 缺的是同一批底层能力，不是填表技巧。

## 共通硬缺口

- 没有公网 HTTPS 常驻 MCP Server、OAuth / DCR 与多用户隔离。
- 工具仍是异步 job 语义，缺 title / readOnlyHint / destructiveHint 注解与输出 schema。
- 目录元数据、图标、隐私政策、测试账号、测试指南都还没准备。
- marketplace/ 里的包全是占位符：端点用 .invalid 保留域，凭据只写环境变量名。
- Cursor 发布者条款 3.1 要求市场插件免费、6.3 禁止用插件数据训练模型；商业化口径需先定。

## 逐平台提交路径

### WorkBuddy（workbuddy）

- 入口：https://open.workbuddy.cn/
- 该类目规范：已找到该类目官方公开提交规范
- 当前状态：`not-submitted` / ready=`false`
- 第一步：在 open.workbuddy.cn 完成主体认证，按《连接器》打包 connector-meta.json + mcp.json + icon + skills/

动作序列（来自官方要求，完整清单见 `SUBMISSION.md`）：

1. 一个 Connector 包只含一个 MCP Server（connector-meta.json + mcp.json + icon + skills/）
1. MCP Server 公网或约定网络稳定可达，生产环境地址必须 HTTPS
1. 单次请求建议 30 秒内响应，建议 SLA ≥ 99.9%，实现标准 MCP 协议
1. 涉及用户数据需认证鉴权；不得在包内硬编码真实 Token；最小权限
1. 自查清单通过后提交审核，审核通过转待发布，点击发布后上架；更新需递增 version 重新审核

提交前必须清掉的前置项：

- [ ] 公网 HTTPS 常驻 MCP Server（missing）：OpenBot 只有桌面内 127.0.0.1 端点，退出 App 即停服
- [ ] OAuth 与动态客户端注册（missing）：现有 stdio 读取桌面 CLI 桥 owner token，没有 OAuth / DCR
- [ ] 工具名 / 描述 / title / readOnlyHint / destructiveHint（missing）：6 个工具仍是异步 job 语义，没有目录规范要求的注解
- [ ] 多用户隔离、凭据轮换与审计（missing）：只有单机 owner token，没有租户模型
- [ ] 主体认证与发布权限（unknown）：各平台口径不同，需在后台确认；千问办公企业通道需管理员权限
- [ ] 图标、目录元数据、版本与发布说明（placeholder）：marketplace/ 里只有占位文件
- [ ] 隐私政策 URL 与数据处理说明（missing）：平台提交表单普遍必填
- [ ] 带样例数据的审核测试账号与测试指南（missing）：Claude / ChatGPT 目录明确要求
- [ ] 协议条款后台全文复核（placeholder）：腾讯开发者服务协议 4.3(7) 只有搜索索引原文、豆包接入文档需登录；提交前要按后台版本复核

审核 / 提交依据：

- https://open.workbuddy.cn/docs/connector

### 千问办公 QwenWork（qwenwork）

- 入口：https://www.alibabacloud.com/help/zh/doc-detail/3052930.html
- 该类目规范：已找到官方连接器规范，但当前只开放企业/组织内提交与审核；公共市场个人上传尚未开放
- 当前状态：`not-submitted` / ready=`false`
- 第一步：先让企业管理员开启「允许成员将连接器添加到组织连接器」，并准备 BASE_URL 与 admin.v1.connectors.manage scope

动作序列（来自官方要求，完整清单见 `SUBMISSION.md`）：

1. 1.3 连接器是符合 MCP 标准、为 Agent 提供查询/读写/鉴权入口的一组工具；三类能力为技能 / 专家套件 / 连接器
1. 2.5 完成实名认证或主体认证才提供发布服务；2.6 平台可按能力形态限制发布者主体类型与认证等级
1. 组织内提交路径：管理员开启「允许成员将连接器添加到组织连接器」→ 成员提交 → 「连接器审核」待处理 → 管理员通过并发布到组织连接器 → 按组织要求启用
1. 必填字段：连接器键（小写字母/数字/连字符，≤128）、服务 URL（完整 http/https，≤1024，创建后不可改）、授权方式（无需授权 / OAuth）、支持的客户端；可选版本、描述、图标（≤2MB）
1. 企业旗舰版还需选认证与凭据（无认证 / MCP OAuth 2.1 DCR / API Key 用户提供）、填连接协议并点「校验配置」，再配置发布策略组
1. OpenAPI 提交：`POST /api/openapi/v1/connectors`，带 `Idempotency-Key` 与 Scope `admin.v1.connectors.manage`，`transport` 取 http/stdio、`auth_type` 取 key/none/oauth
1. 5.1 审核维度含合规性、安全性、基本功能可用性；5.5 含恶意代码、提示词注入、权限与行为风险检测；5.3 平台可无理由拒绝
1. 6.3 / 6.6 如实说明连接器鉴权方式、权限范围与数据边界；不得要求成员上传共享密码或长期密钥；13.1 当前提交、发布、安装、使用免费

提交前必须清掉的前置项：

- [ ] 公网 HTTPS 常驻 MCP Server（missing）：OpenBot 只有桌面内 127.0.0.1 端点，退出 App 即停服
- [ ] OAuth 与动态客户端注册（missing）：现有 stdio 读取桌面 CLI 桥 owner token，没有 OAuth / DCR
- [ ] 工具名 / 描述 / title / readOnlyHint / destructiveHint（missing）：6 个工具仍是异步 job 语义，没有目录规范要求的注解
- [ ] 多用户隔离、凭据轮换与审计（missing）：只有单机 owner token，没有租户模型
- [ ] 主体认证与发布权限（unknown）：各平台口径不同，需在后台确认；千问办公企业通道需管理员权限
- [ ] 图标、目录元数据、版本与发布说明（placeholder）：marketplace/ 里只有占位文件
- [ ] 隐私政策 URL 与数据处理说明（missing）：平台提交表单普遍必填
- [ ] 带样例数据的审核测试账号与测试指南（missing）：Claude / ChatGPT 目录明确要求
- [ ] 协议条款后台全文复核（placeholder）：腾讯开发者服务协议 4.3(7) 只有搜索索引原文、豆包接入文档需登录；提交前要按后台版本复核

审核 / 提交依据：

- https://terms.alicdn.com/legal-agreement/terms/common_product_agreement/20260920094459914/20260920094459914.html
- https://www.alibabacloud.com/help/zh/doc-detail/3052930.html
- https://help.aliyun.com/zh/qwenwork/connector-management
- https://help.aliyun.com/zh/qwenwork/enterprise-ultimate-ai-assets-connectors

### 豆包工作（doubao-work）

- 入口：https://open.doubao.com/
- 该类目规范：平台内测邀请制：官方接入规范需登录或入驻后可见，没有公开自助提交
- 当前状态：`not-submitted` / ready=`false`
- 第一步：在 open.doubao.com 提交入驻意向，等平台联系后取登录后可见的连接器接入规范

动作序列（来自官方要求，完整清单见 `SUBMISSION.md`）：

1. 开放平台内测：先在 open.doubao.com 提交入驻意向，等平台联系后开通控制台；没有公开自助注册
1. 完成企业资质认证，按登录后可见的《平台准入要求》与《技能开发规范》制作能力包（ZIP，含名称 / 简介 / 图标 / 版本号）
1. 连接器须是「豆包认可的连接器或已注册工具」；外部 API 不得直接暴露在技能中，须按平台要求完成鉴权、权限与安全验证
1. 平台自动校验包结构 / 内容 / 许可证 → 提交审核 → 平台运营在测试商店验收 → 统一发版 → 状态改为「已上架」；版本状态含草稿 / 审核中 / 已拒绝 / 已上线 / 已下架
1. 服务商通道按第三方实操需 Streamable HTTP + OAuth + 动态注册，上架到官方连接器库后用户点授权即可用；该口径需入驻后向平台核实

提交前必须清掉的前置项：

- [ ] 公网 HTTPS 常驻 MCP Server（missing）：OpenBot 只有桌面内 127.0.0.1 端点，退出 App 即停服
- [ ] OAuth 与动态客户端注册（missing）：现有 stdio 读取桌面 CLI 桥 owner token，没有 OAuth / DCR
- [ ] 工具名 / 描述 / title / readOnlyHint / destructiveHint（missing）：6 个工具仍是异步 job 语义，没有目录规范要求的注解
- [ ] 多用户隔离、凭据轮换与审计（missing）：只有单机 owner token，没有租户模型
- [ ] 主体认证与发布权限（unknown）：各平台口径不同，需在后台确认；千问办公企业通道需管理员权限
- [ ] 图标、目录元数据、版本与发布说明（placeholder）：marketplace/ 里只有占位文件
- [ ] 隐私政策 URL 与数据处理说明（missing）：平台提交表单普遍必填
- [ ] 带样例数据的审核测试账号与测试指南（missing）：Claude / ChatGPT 目录明确要求
- [ ] 协议条款后台全文复核（placeholder）：腾讯开发者服务协议 4.3(7) 只有搜索索引原文、豆包接入文档需登录；提交前要按后台版本复核

审核 / 提交依据：

- https://open.doubao.com/document/doubao-developer-guide/skill-integration-guide

### ChatGPT 桌面 / Codex CLI / IDE 扩展（chatgpt-codex）

- 入口：https://chatgpt.com/apps
- 该类目规范：已找到该类目官方公开提交规范
- 当前状态：`not-submitted` / ready=`false`
- 第一步：用具备 Apps Management 权限的组织账号登录 platform.openai.com/apps-manage 新建 app

动作序列（来自官方要求，完整清单见 `SUBMISSION.md`）：

1. 组织角色需具备 plugin submission write access（Platform 里标为 Apps Management）
1. 提交内容包含 MCP 连接信息、测试指南、目录元数据、国家/地区可用性、隐私政策
1. 需提供公网可达 HTTPS 的 /mcp 端点；工具需正确的 readOnlyHint / openWorldHint / destructiveHint 注解
1. 遵守 App Submission Guidelines、Usage Policies，内容适合所有受众；写操作按需引入 OAuth 2.1
1. 经平台扫描工具元数据、审核与批准后发布，更新需重新提交

提交前必须清掉的前置项：

- [ ] 公网 HTTPS 常驻 MCP Server（missing）：OpenBot 只有桌面内 127.0.0.1 端点，退出 App 即停服
- [ ] OAuth 与动态客户端注册（missing）：现有 stdio 读取桌面 CLI 桥 owner token，没有 OAuth / DCR
- [ ] 工具名 / 描述 / title / readOnlyHint / destructiveHint（missing）：6 个工具仍是异步 job 语义，没有目录规范要求的注解
- [ ] 多用户隔离、凭据轮换与审计（missing）：只有单机 owner token，没有租户模型
- [ ] 主体认证与发布权限（unknown）：各平台口径不同，需在后台确认；千问办公企业通道需管理员权限
- [ ] 图标、目录元数据、版本与发布说明（placeholder）：marketplace/ 里只有占位文件
- [ ] 隐私政策 URL 与数据处理说明（missing）：平台提交表单普遍必填
- [ ] 带样例数据的审核测试账号与测试指南（missing）：Claude / ChatGPT 目录明确要求
- [ ] 协议条款后台全文复核（placeholder）：腾讯开发者服务协议 4.3(7) 只有搜索索引原文、豆包接入文档需登录；提交前要按后台版本复核

审核 / 提交依据：

- https://developers.openai.com/apps-sdk/app-submission-guidelines
- https://help.openai.com/en/articles/20001040-submitting-apps-to-the-chatgpt-app-directory

### Cursor（cursor）

- 入口：https://cursor.com/marketplace
- 该类目规范：已找到该类目官方公开提交规范
- 当前状态：`not-submitted` / ready=`false`
- 第一步：把插件推到公开 Git 仓库，再在 cursor.com/marketplace/publish 提交仓库链接

动作序列（来自官方要求，完整清单见 `SUBMISSION.md`）：

1. 在 cursor.com/marketplace/publish 提交公开 Git 仓库链接（需登录），遵守《Cursor 应用市场发布者条款》；更新已上架插件走 request re-index
1. 插件需有效清单：根 plugin.json 或 .cursor-plugin/plugin.json；多插件仓库需 .cursor-plugin/marketplace.json
1. 名称全局唯一、小写 kebab-case；描述清楚；组件文件与 frontmatter 合法；清单内路径均为相对路径（无 ..、无绝对路径）
1. 插件必须开源、本地测试通过、提供 README.md 与 logo；mcp.json 里的每个 ${VAR} 都要在 variables schema 声明，仓库内不得放密钥
1. Cursor 团队对每个插件及每次更新做安全/数据处理/质量人工审查；更新通过后重新索引
1. 发布者条款 3.1：市场插件必须免费向用户提供，不得直接或间接收费；6.3：不得用 Plugin Data / User Content 训练 AI 模型

提交前必须清掉的前置项：

- [ ] 公网 HTTPS 常驻 MCP Server（missing）：OpenBot 只有桌面内 127.0.0.1 端点，退出 App 即停服
- [ ] OAuth 与动态客户端注册（missing）：现有 stdio 读取桌面 CLI 桥 owner token，没有 OAuth / DCR
- [ ] 工具名 / 描述 / title / readOnlyHint / destructiveHint（missing）：6 个工具仍是异步 job 语义，没有目录规范要求的注解
- [ ] 多用户隔离、凭据轮换与审计（missing）：只有单机 owner token，没有租户模型
- [ ] 主体认证与发布权限（unknown）：各平台口径不同，需在后台确认；千问办公企业通道需管理员权限
- [ ] 图标、目录元数据、版本与发布说明（placeholder）：marketplace/ 里只有占位文件
- [ ] 隐私政策 URL 与数据处理说明（missing）：平台提交表单普遍必填
- [ ] 带样例数据的审核测试账号与测试指南（missing）：Claude / ChatGPT 目录明确要求
- [ ] 协议条款后台全文复核（placeholder）：腾讯开发者服务协议 4.3(7) 只有搜索索引原文、豆包接入文档需登录；提交前要按后台版本复核

审核 / 提交依据：

- https://cursor.com/marketplace-publisher-terms
- https://cursor.com/docs/reference/plugins

### Claude / Claude Desktop（claude）

- 入口：https://claude.com/connectors
- 该类目规范：已找到该类目官方公开提交规范
- 当前状态：`not-submitted` / ready=`false`
- 第一步：用付费 Claude 账号在 claude.ai/directory/manage 选 Submit new → MCP connector

动作序列（来自官方要求，完整清单见 `SUBMISSION.md`）：

1. 在开发者后台 claude.ai/directory/manage 选 Submit new → MCP connector；任何付费 Claude 套餐均可提交（Free 不可），Team / Enterprise 由 Owner 提交
1. 只接受远程 HTTPS MCP Server；本地 MCPB / 桌面扩展已 deprecated 且不再单独受理，本地服务器必须打包进 plugin
1. 认证服务用 OAuth 2.0（回调 https://claude.ai/api/mcp/auth_callback），公开数据可免认证
1. 每个工具都要 title 与 readOnlyHint / destructiveHint 注解；工具名 ≤64 字符、描述窄而准确且与功能一致，不得含隐藏指令或诱导跨软件调用
1. 提交材料：文档 URL、隐私政策 URL、支持联系人、图标、文档说明，以及给审核用的**填充好数据的测试账号**
1. 先在 Claude 里作为自定义连接器逐个调用测试；遵守 Anthropic Software Directory Terms 与 Directory Policy（两条官方地址已核实并抓到正文）
1. portal 十步含 Listing / Use cases / Company / Data handling / Test & launch / Compliance，七项 Compliance 确认全部必填；URL slug 发布后永久不可变
1. Directory Policy 还要求带样例数据的标准测试账号、至少 3 个可运行 prompts / use cases，并禁止采集无关对话数据或访问 Claude memory / 聊天历史 / 用户上传文件
1. 提交后自动策略扫描，默认列为 Community；Multiple URLs / URL pattern 的 listing 只有拿到 Verified label 才能发布

提交前必须清掉的前置项：

- [ ] 公网 HTTPS 常驻 MCP Server（missing）：OpenBot 只有桌面内 127.0.0.1 端点，退出 App 即停服
- [ ] OAuth 与动态客户端注册（missing）：现有 stdio 读取桌面 CLI 桥 owner token，没有 OAuth / DCR
- [ ] 工具名 / 描述 / title / readOnlyHint / destructiveHint（missing）：6 个工具仍是异步 job 语义，没有目录规范要求的注解
- [ ] 多用户隔离、凭据轮换与审计（missing）：只有单机 owner token，没有租户模型
- [ ] 主体认证与发布权限（unknown）：各平台口径不同，需在后台确认；千问办公企业通道需管理员权限
- [ ] 图标、目录元数据、版本与发布说明（placeholder）：marketplace/ 里只有占位文件
- [ ] 隐私政策 URL 与数据处理说明（missing）：平台提交表单普遍必填
- [ ] 带样例数据的审核测试账号与测试指南（missing）：Claude / ChatGPT 目录明确要求
- [ ] 协议条款后台全文复核（placeholder）：腾讯开发者服务协议 4.3(7) 只有搜索索引原文、豆包接入文档需登录；提交前要按后台版本复核

审核 / 提交依据：

- https://claude.com/docs/connectors/building/submission
- https://support.claude.com/en/articles/13145338-anthropic-software-directory-terms
- https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy

### ZCode（zcode）

- 入口：https://github.com/zai-org/zcode-plugins
- 该类目规范：已找到该类目官方公开提交规范
- 当前状态：`not-submitted` / ready=`false`
- 第一步：把 connector 打包成 .zcode-plugin/plugin.json 插件，fork zai-org/zcode-plugins 后在 external_plugins/ 下按 CONTRIBUTING.md 提交 PR

动作序列（来自官方要求，完整清单见 `SUBMISSION.md`）：

1. 社区/伙伴插件放 external_plugins/<kebab-case 目录>；plugins/ 仅限官方维护的插件（CONTRIBUTING.md）
1. .zcode-plugin/plugin.json 必须含 name / description / version / author；根目录 marketplace.json 条目的 name、version、description 必须与清单一致
1. 至少提供一个有用组件：command / skill / hook / agent / MCP server；MCP 走根目录 .mcp.json 或清单 mcpServers 字段，键名命名空间为 plugin:<插件名>:<服务名>
1. 必须同时提供 README.md 与 README_CN.md；category 只能选 developer-tools / productivity / utilities / finance / guides / template / other
1. README 必须如实披露网络访问、模型/API/服务依赖、文件写入、命令执行、hooks、MCP server 与其它副作用；第三方代码/资产/服务标注许可证与来源
1. 不得提交凭据、私有端点、客户数据、机器特定路径、缓存、构建产物、混淆源码或不必要的预编译二进制
1. 提交流程：fork zai-org/zcode-plugins → external_plugins/ 下做插件 → 跑 python3 scripts/validate.py、build_dist.py、git diff --check → PR 模板必填 Plugin type（UI Plugin / Standard plugin / Not applicable）声明 → Conventional Commits 标题 → 维护者按功能、安全、可维护性、兼容性、来源与许可证审核
1. 已发布版本不可变：改动可安装内容必须同时递增清单与 marketplace.json 的语义化版本，不得复用旧版本号
1. 自建市场分发：仓库根目录 marketplace.json 列出条目，用户在 设置 → 插件 → 创建 → 添加插件市场 填 GitHub 仓库 / Git URL / 本地目录添加；该路径无需平台审核，但 ZCode 提示「启用插件就是授予代码执行信任」

提交前必须清掉的前置项：

- [ ] 公网 HTTPS 常驻 MCP Server（missing）：OpenBot 只有桌面内 127.0.0.1 端点，退出 App 即停服
- [ ] OAuth 与动态客户端注册（missing）：现有 stdio 读取桌面 CLI 桥 owner token，没有 OAuth / DCR
- [ ] 工具名 / 描述 / title / readOnlyHint / destructiveHint（missing）：6 个工具仍是异步 job 语义，没有目录规范要求的注解
- [ ] 多用户隔离、凭据轮换与审计（missing）：只有单机 owner token，没有租户模型
- [ ] 主体认证与发布权限（unknown）：各平台口径不同，需在后台确认；千问办公企业通道需管理员权限
- [ ] 图标、目录元数据、版本与发布说明（placeholder）：marketplace/ 里只有占位文件
- [ ] 隐私政策 URL 与数据处理说明（missing）：平台提交表单普遍必填
- [ ] 带样例数据的审核测试账号与测试指南（missing）：Claude / ChatGPT 目录明确要求
- [ ] 协议条款后台全文复核（placeholder）：腾讯开发者服务协议 4.3(7) 只有搜索索引原文、豆包接入文档需登录；提交前要按后台版本复核

审核 / 提交依据：

- https://github.com/zai-org/zcode-plugins/blob/main/CONTRIBUTING.md
- https://zcode.z.ai/cn/docs/plugin

## 为什么现在不能装到市场

- `marketplace/` 里的 JSON 是占位骨架，端点为 RFC 2606 保留域，凭据只有环境变量名，提交会被平台直接拒。
- 千问办公当前只开放企业/组织内提交与审核，公共市场个人上传标记「即将推出」。
- 豆包开放平台在内测邀请制，接入规范需登录后可见，没有公开自助提交后台。
- WorkBuddy / ChatGPT / Cursor / Claude 虽有官方提交规范，但都要求公网 HTTPS MCP Server 与认证能力。
- ZCode 市场收的是插件包且可自带 stdio MCP（不强制公网端点），但 OpenBot 连插件源码树都没有，PR 审核要求的双语 README 与副作用披露也没准备。

