# 市场上架路径与阻塞项

> 由 `src/policies.mjs` 生成，登记日期 2026-11-11。当前所有平台的 `status` 都不是 `published`。

**本地模式跑通 ≠ 上架市场。** 公开市场普遍要求：公网 HTTPS 常驻 MCP Server、认证与最小权限、主体认证、包结构与元数据、审核与版本迭代。
`available` 表示存在市场路径；`submissionSpec` 区分公开提交规范、企业/组织内提交与内测邀请制，三者不能混用。

## WorkBuddy（workbuddy）

- 市场：Connector 市场（开放平台）
- 入口：https://open.workbuddy.cn/
- 该类目规范：已找到该类目官方公开提交规范
- 当前状态：`not-submitted`

### 需满足

- 一个 Connector 包只含一个 MCP Server（connector-meta.json + mcp.json + icon + skills/）
- MCP Server 公网或约定网络稳定可达，生产环境地址必须 HTTPS
- 单次请求建议 30 秒内响应，建议 SLA ≥ 99.9%，实现标准 MCP 协议
- 涉及用户数据需认证鉴权；不得在包内硬编码真实 Token；最小权限
- 自查清单通过后提交审核，审核通过转待发布，点击发布后上架；更新需递增 version 重新审核

### 阻塞项

- 当前 OpenBot 没有公网常驻 MCP Server；4818 仅监听 127.0.0.1，退出桌面即停服
- OAuth（auth_mode: server-side）需实现 DCR / 元数据端点并完成域名加白，或改用 token 表单模式
- 主体口径：开放平台文档列有企业 / 其他组织 / 个人认证，上线报道也写明个人开发者可入驻并开发管理连接器；但公开发布权限与审核口径仍以后台实际入口为准
- 开发者服务协议 4.3(7) 只拿到索引摘要，正式提交前需后台全文复核

### 依据

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [开放平台《连接器》](https://open.workbuddy.cn/docs/connector) | 审核/上架 | 官方 | 已抓正文 | 包结构、source 命名、图标、minWorkbuddyVersion、提交检查清单、审核与发布流程。 |
| [入驻开放平台](https://open.workbuddy.cn/docs/onboarding) | 开发者 | 官方 | 已抓正文 | 企业认证（营业执照 + 法人核验）、其他组织机构认证、个人认证（大陆二代身份证）三类；企业/组织主体明确可发布资产，个人主体能否发布 Connector 未在页面写明。 |
| [开放平台上线报道（媒体，非规范）](https://news.qq.com/rain/a/20260903A03VEU00) | 开发者 | 第三方 | 索引摘要 | 报道写明企业认证与个人认证两种方式、个人开发者可开发管理技能 / 专家 / 连接器；属媒体报道，不作为发布权限的正式依据。 |

## 千问办公 QwenWork（qwenwork）

- 市场：千问办公扩展能力广场 / 企业连接器广场
- 入口：https://www.alibabacloud.com/help/zh/doc-detail/3052930.html
- 该类目规范：已找到官方连接器规范，但当前只开放企业/组织内提交与审核；公共市场个人上传尚未开放
- 当前状态：`not-submitted`

### 需满足

- 1.3 连接器是符合 MCP 标准、为 Agent 提供查询/读写/鉴权入口的一组工具；三类能力为技能 / 专家套件 / 连接器
- 2.5 完成实名认证或主体认证才提供发布服务；2.6 平台可按能力形态限制发布者主体类型与认证等级
- 组织内提交路径：管理员开启「允许成员将连接器添加到组织连接器」→ 成员提交 → 「连接器审核」待处理 → 管理员通过并发布到组织连接器 → 按组织要求启用
- 必填字段：连接器键（小写字母/数字/连字符，≤128）、服务 URL（完整 http/https，≤1024，创建后不可改）、授权方式（无需授权 / OAuth）、支持的客户端；可选版本、描述、图标（≤2MB）
- 企业旗舰版还需选认证与凭据（无认证 / MCP OAuth 2.1 DCR / API Key 用户提供）、填连接协议并点「校验配置」，再配置发布策略组
- OpenAPI 提交：`POST /api/openapi/v1/connectors`，带 `Idempotency-Key` 与 Scope `admin.v1.connectors.manage`，`transport` 取 http/stdio、`auth_type` 取 key/none/oauth
- 5.1 审核维度含合规性、安全性、基本功能可用性；5.5 含恶意代码、提示词注入、权限与行为风险检测；5.3 平台可无理由拒绝
- 6.3 / 6.6 如实说明连接器鉴权方式、权限范围与数据边界；不得要求成员上传共享密码或长期密钥；13.1 当前提交、发布、安装、使用免费

### 阻塞项

- 公共市场个人上传在管理后台标记为「即将推出」且暂不能修改，当前没有个人向公共扩展市场提交连接器的入口
- 组织内提交需要企业管理员权限、企业部署的 BASE_URL 与 `admin.v1.connectors.manage` scope，本机不具备这些条件
- 连接器键与服务 URL 创建后不可修改，必须先确定公网生产地址；OpenBot 目前只有 127.0.0.1 端点，没有公网 HTTPS MCP Server
- 2.6 允许平台按能力形态限制发布者主体类型，个人开发者能否作为连接器发布者以后台提交页面公示为准
- 6.2 / 6.4 禁止收集账号鉴权凭证、禁止把能力数据用于模型训练或广告；现有 stdio 形态使用桌面 owner token，需按数据边界重做认证

### 依据

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [扩展能力广场服务协议](https://terms.alicdn.com/legal-agreement/terms/common_product_agreement/20260920094459914/20260920094459914.html) | 审核/上架 | 官方 | 已抓正文 | 本轮抓到全文：定义、准入、审核、下架、数据合规与商业化条款。 |
| [连接器管理](https://www.alibabacloud.com/help/zh/doc-detail/3052930.html) | 审核/上架 | 官方 | 已抓正文 | 组织内提交、审核状态机、字段规则与个人上传「即将推出」的官方依据。 |
| [创建连接器 API](https://help.aliyun.com/zh/qwenwork/connector-management) | 审核/上架 | 官方 | 已抓正文 | 官方 OpenAPI 创建接口与字段清单，提交动作可直接映射到请求体。 |
| [企业旗舰版：连接器](https://help.aliyun.com/zh/qwenwork/enterprise-ultimate-ai-assets-connectors) | 审核/上架 | 官方 | 已抓正文 | 新建企业连接器、OAuth 2.1 DCR、校验配置与发布策略组的官方步骤。 |
| [阿里云《千问办公：扩展》](https://www.alibabacloud.com/help/zh/doc-detail/3047919.html) | 市场 | 官方 | 索引摘要 | 企业空间与公共市场的边界。 |

## 豆包工作（doubao-work）

- 市场：豆包「技能·连接器·伙伴」市场 / 豆包开放平台（内测邀请制）
- 入口：https://open.doubao.com/
- 该类目规范：平台内测邀请制：官方接入规范需登录或入驻后可见，没有公开自助提交
- 当前状态：`not-submitted`

### 需满足

- 开放平台内测：先在 open.doubao.com 提交入驻意向，等平台联系后开通控制台；没有公开自助注册
- 完成企业资质认证，按登录后可见的《平台准入要求》与《技能开发规范》制作能力包（ZIP，含名称 / 简介 / 图标 / 版本号）
- 连接器须是「豆包认可的连接器或已注册工具」；外部 API 不得直接暴露在技能中，须按平台要求完成鉴权、权限与安全验证
- 平台自动校验包结构 / 内容 / 许可证 → 提交审核 → 平台运营在测试商店验收 → 统一发版 → 状态改为「已上架」；版本状态含草稿 / 审核中 / 已拒绝 / 已上线 / 已下架
- 服务商通道按第三方实操需 Streamable HTTP + OAuth + 动态注册，上架到官方连接器库后用户点授权即可用；该口径需入驻后向平台核实

### 阻塞项

- 接入规范不是不存在，而是不对外公开：技能接入指南直接抓取返回「登录」壳，服务商连接器类目的提交入口与审核标准需入驻内测后才可见
- 没有公开自助注册与提交后台，无法在未获平台联系的情况下自行提交
- 企业资质认证是技能上架的明确前提，连接器是否同口径未明确；控制台也没有开发者自行下架入口
- 本机没有公网 HTTPS MCP Server 与 OAuth / 动态注册，第三方实操提到的服务商形态尚未实现

### 依据

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [豆包开放平台首页](https://open.doubao.com/) | 市场 | 官方 | 索引摘要 | 「平台正在内测，欢迎提交入驻意向」与入驻意向入口。 |
| [技能接入指南（登录后可见）](https://open.doubao.com/document/doubao-developer-guide/skill-integration-guide) | 审核/上架 | 官方 | 索引摘要 | 本轮直接抓取返回登录壳，正文来自搜索索引；含技能/版本状态机、企业认证、测试商店验收、统一发版，以及「连接器负责接入外部系统、外部 API 不直接暴露在技能中」的口径。 |
| [豆包工作服务商连接器（第三方实操）](https://apibobo.com/content/posts/doubao-work-connectors-mcp-guide) | 市场 | 第三方 | 第三方教程 | 第三方教程提到服务商规范、官方连接器库与 Streamable HTTP + OAuth + 动态注册；未经官方证实，只用于证明通道存在。 |
| [火山引擎《MCP》文档（营销 Agent 控制台）](https://volcengine.com/docs/data-agent/mcp?lang=zh) | 市场 | 官方 | 索引摘要 | 官方但属于营销 Agent 控制台的 MCP Server 注册流程（域名 / 端口 / 请求头 / Tools 上传 Swagger），不是豆包工作连接器类目的上架规范，不能混用。 |
| [第三方连接器目录的豆包提交说明](https://connector.zone/connectors/io-omfang-manifest/install/doubao) | 市场 | 第三方 | 第三方教程 | 称需在火山引擎插件开发者控制台注册公网 HTTPS MCP 并走审核；第三方 registry 说明，未经官方证实。 |

## ChatGPT 桌面 / Codex CLI / IDE 扩展（chatgpt-codex）

- 市场：ChatGPT App Directory / 插件目录
- 入口：https://chatgpt.com/apps
- 该类目规范：已找到该类目官方公开提交规范
- 当前状态：`not-submitted`

### 需满足

- 组织角色需具备 plugin submission write access（Platform 里标为 Apps Management）
- 提交内容包含 MCP 连接信息、测试指南、目录元数据、国家/地区可用性、隐私政策
- 需提供公网可达 HTTPS 的 /mcp 端点；工具需正确的 readOnlyHint / openWorldHint / destructiveHint 注解
- 遵守 App Submission Guidelines、Usage Policies，内容适合所有受众；写操作按需引入 OAuth 2.1
- 经平台扫描工具元数据、审核与批准后发布，更新需重新提交

### 阻塞项

- 当前 OpenBot 只有本机 127.0.0.1:4818 端点，没有公网 HTTPS /mcp，也没有 OAuth 与多用户隔离
- 工具定义与注解尚未按 Apps SDK 规范改造，仍以异步 job 语义（submit → task → result）为主
- 未准备目录元数据、测试指南、国家/地区设置与隐私政策页面

### 依据

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [Plugin guidelines（App Submission Guidelines）](https://developers.openai.com/apps-sdk/app-submission-guidelines) | 审核/上架 | 官方 | 索引摘要 | 目的与原创性、质量、工具命名与描述、注解、最小输入、可审计行为等发布最低标准。本轮直接抓取返回 HTTP 403 Forbidden（页面正文只有 Forbidden 与请求追踪号），不是「没有规范」而是「当前抓取通道被拒」；提交前须用已登录的开发者账号复核，不得把索引摘要当全文。 |
| [Submit plugins](https://help.openai.com/en/articles/20001040-submitting-apps-to-the-chatgpt-app-directory) | 审核/上架 | 官方 | 索引摘要 | 提交流程、组织角色权限、portal 扫描 MCP Server 与工具元数据。 |
| [Developers can now submit apps to ChatGPT](https://openai.com/blog/developers-can-now-submit-apps-to-chatgpt) | 市场 | 官方 | 索引摘要 | 官方公告：提交包含 MCP 连接信息、测试指南、目录元数据与国家/地区设置；必须附清晰隐私政策。 |
| [Build an MCP server](https://developers.openai.com/apps-sdk/build/mcp-server) | 开发者 | 官方 | 索引摘要 | 工具 schema、outputSchema、注解、instructions 与 structuredContent 规范。 |
| [ChatGPT 应用目录](https://chatgpt.com/apps) | 市场 | 官方 | 索引摘要 | 官方公告明确给出的用户侧目录入口，可从工具菜单或直接访问。 |
| [开发者平台提交入口](https://platform.openai.com/apps-manage) | 市场 | 官方 | 索引摘要 | OpenAI 开发者社区帖给出的提交后台地址；需登录组织账号并具备 Apps Management 权限，提交前以后台实际入口为准。 |
| [ChatGPT 中的应用（帮助中心）](https://help.openai.com/zh-hans-cn/articles/9309188-connected-apps-on-chatgpt) | 市场 | 官方 | 索引摘要 | 应用目录、工作空间管理员控制、自定义应用与提交到目录的官方帮助说明。 |

## Cursor（cursor）

- 市场：Cursor Marketplace（插件 / MCP servers）
- 入口：https://cursor.com/marketplace
- 该类目规范：已找到该类目官方公开提交规范
- 当前状态：`not-submitted`

### 需满足

- 在 cursor.com/marketplace/publish 提交公开 Git 仓库链接（需登录），遵守《Cursor 应用市场发布者条款》；更新已上架插件走 request re-index
- 插件需有效清单：根 plugin.json 或 .cursor-plugin/plugin.json；多插件仓库需 .cursor-plugin/marketplace.json
- 名称全局唯一、小写 kebab-case；描述清楚；组件文件与 frontmatter 合法；清单内路径均为相对路径（无 ..、无绝对路径）
- 插件必须开源、本地测试通过、提供 README.md 与 logo；mcp.json 里的每个 ${VAR} 都要在 variables schema 声明，仓库内不得放密钥
- Cursor 团队对每个插件及每次更新做安全/数据处理/质量人工审查；更新通过后重新索引
- 发布者条款 3.1：市场插件必须免费向用户提供，不得直接或间接收费；6.3：不得用 Plugin Data / User Content 训练 AI 模型

### 阻塞项

- 现有 OpenBot MCP 依赖本机桌面与 127.0.0.1:4818，没有可公开访问的远程 MCP Server，也没有公开 Git 仓库与插件清单
- 市场上架的是「插件包」，不是本机 mcp.json；两者不能互相替代
- 发布者条款 2.2 写明审查与批准完全由 Anysphere 自行决定且不说明理由；3.1 的免费要求与 OpenBot 若走收费 Bot 能力的变现路径直接冲突，上架前须先确定商业模式

### 依据

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [Cursor 应用市场发布者条款](https://cursor.com/marketplace-publisher-terms) | 审核/上架 | 官方 | 已抓正文 | 提交、审查、批准、持续复审、免费分发与数据使用限制的正式条款。 |
| [提交入口](https://cursor.com/marketplace/publish) | 市场 | 官方 | 已抓正文 | 发布者条款 2.1 指定的申请页；本轮直接打开只显示「You need to be signed in to submit a plugin publisher application」，需登录。 |
| [Plugins reference（官方）](https://cursor.com/docs/reference/plugins) | 审核/上架 | 官方 | 已抓正文 | 本轮抓到全文：清单字段、公开 Git 仓库、提交仓库链接三步与 11 项 submission checklist、variables schema 与 ${VAR} 声明要求；已替换上一轮引用的第三方镜像。 |
| [Plugins（官方）](https://cursor.com/docs/plugins) | 市场 | 官方 | 索引摘要 | 插件以 Git 仓库分发、由 Cursor 团队逐个人工审查后上架；团队市场与公开市场是不同路径。 |
| [MCP integrations](https://cursor.com/help/customization/mcp) | 市场 | 官方 | 索引摘要 | 市场一键安装、团队分发与社区目录 cursor.directory 的区别。 |

## Claude / Claude Desktop（claude）

- 市场：Claude Connectors Directory（连接器与插件目录）
- 入口：https://claude.com/connectors
- 该类目规范：已找到该类目官方公开提交规范
- 当前状态：`not-submitted`

### 需满足

- 在开发者后台 claude.ai/directory/manage 选 Submit new → MCP connector；任何付费 Claude 套餐均可提交（Free 不可），Team / Enterprise 由 Owner 提交
- 只接受远程 HTTPS MCP Server；本地 MCPB / 桌面扩展已 deprecated 且不再单独受理，本地服务器必须打包进 plugin
- 认证服务用 OAuth 2.0（回调 https://claude.ai/api/mcp/auth_callback），公开数据可免认证
- 每个工具都要 title 与 readOnlyHint / destructiveHint 注解；工具名 ≤64 字符、描述窄而准确且与功能一致，不得含隐藏指令或诱导跨软件调用
- 提交材料：文档 URL、隐私政策 URL、支持联系人、图标、文档说明，以及给审核用的**填充好数据的测试账号**
- 先在 Claude 里作为自定义连接器逐个调用测试；遵守 Anthropic Software Directory Terms 与 Directory Policy（两条官方地址已核实并抓到正文）
- portal 十步含 Listing / Use cases / Company / Data handling / Test & launch / Compliance，七项 Compliance 确认全部必填；URL slug 发布后永久不可变
- Directory Policy 还要求带样例数据的标准测试账号、至少 3 个可运行 prompts / use cases，并禁止采集无关对话数据或访问 Claude memory / 聊天历史 / 用户上传文件
- 提交后自动策略扫描，默认列为 Community；Multiple URLs / URL pattern 的 listing 只有拿到 Verified label 才能发布

### 阻塞项

- 远程连接器从 Anthropic 云端发起，OpenBot 当前的 127.0.0.1:4818 端点不可达；本地 STDIO 配置不能单独进目录
- 现有 6 个工具没有 title / readOnlyHint / destructiveHint 注解，且是异步 job 语义；Directory Policy 把工具描述当安全边界，需整体重写
- 没有公网 HTTPS MCP Server、OAuth 2.0、隐私政策 URL、测试账号与目录图标
- Directory Terms 要求提交者承担赔偿与持续安全维护义务，Anthropic 可无理由移除 listing；主体与永久 slug 需先确定

### 依据

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [Submit a connector to the directory](https://claude.com/docs/connectors/building/submission) | 审核/上架 | 官方 | 已抓正文 | 本轮抓到全文：付费账号资格、远程 HTTPS、OAuth 2.0、工具注解、隐私政策、测试账号、portal 十步、七项 Compliance 确认与 Community / Verified 差异。 |
| [开发者后台提交入口](https://claude.ai/directory/manage) | 市场 | 官方 | 索引摘要 | 官方提交文档指定的 Submit new → MCP connector 入口，需登录付费 Claude 账号。 |
| [Anthropic Software Directory Terms](https://support.claude.com/en/articles/13145338-anthropic-software-directory-terms) | 审核/上架 | 官方 | 已抓正文 | 官方提交文档直接给出的目录条款地址，本轮抓到正文；上一轮写的「独立 URL 未核实」已更正。 |
| [Anthropic Software Directory Policy](https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy) | 审核/上架 | 官方 | 已抓正文 | 官方提交文档直接给出的目录政策地址，本轮抓到正文；安全、隐私、工具描述与 MCP 附加要求以此为准。 |
| [Connectors Directory](https://claude.com/marketplace/connectors-plugins) | 市场 | 官方 | 索引摘要 | 用户侧目录页，条目带 Verified / Community 标签。 |
| [Get started with connectors](https://claude.com/docs/connectors/getting-started) | 市场 | 官方 | 索引摘要 | 目录、自定义连接器、组织权限与工具开关的官方说明。 |
| [Get started with custom connectors using remote MCP](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp) | 市场 | 官方 | 索引摘要 | 自定义连接器与目录条目的区别、网络要求与组织权限。 |

## ZCode（zcode）

- 市场：ZCode 插件市场（官方市场 zai-org/zcode-plugins + 自建市场分发）
- 入口：https://github.com/zai-org/zcode-plugins
- 该类目规范：已找到该类目官方公开提交规范
- 当前状态：`not-submitted`

### 需满足

- 社区/伙伴插件放 external_plugins/<kebab-case 目录>；plugins/ 仅限官方维护的插件（CONTRIBUTING.md）
- .zcode-plugin/plugin.json 必须含 name / description / version / author；根目录 marketplace.json 条目的 name、version、description 必须与清单一致
- 至少提供一个有用组件：command / skill / hook / agent / MCP server；MCP 走根目录 .mcp.json 或清单 mcpServers 字段，键名命名空间为 plugin:<插件名>:<服务名>
- 必须同时提供 README.md 与 README_CN.md；category 只能选 developer-tools / productivity / utilities / finance / guides / template / other
- README 必须如实披露网络访问、模型/API/服务依赖、文件写入、命令执行、hooks、MCP server 与其它副作用；第三方代码/资产/服务标注许可证与来源
- 不得提交凭据、私有端点、客户数据、机器特定路径、缓存、构建产物、混淆源码或不必要的预编译二进制
- 提交流程：fork zai-org/zcode-plugins → external_plugins/ 下做插件 → 跑 python3 scripts/validate.py、build_dist.py、git diff --check → PR 模板必填 Plugin type（UI Plugin / Standard plugin / Not applicable）声明 → Conventional Commits 标题 → 维护者按功能、安全、可维护性、兼容性、来源与许可证审核
- 已发布版本不可变：改动可安装内容必须同时递增清单与 marketplace.json 的语义化版本，不得复用旧版本号
- 自建市场分发：仓库根目录 marketplace.json 列出条目，用户在 设置 → 插件 → 创建 → 添加插件市场 填 GitHub 仓库 / Git URL / 本地目录添加；该路径无需平台审核，但 ZCode 提示「启用插件就是授予代码执行信任」

### 阻塞项

- OpenBot 连插件源码树都没有：connector.cjs / run.sh 还没打包成 .zcode-plugin/plugin.json + 组件目录；marketplace/zcode/ 目前只有占位骨架
- stdio 形态依赖 OpenBot 桌面在线与 CLI 桥 owner token；插件用户必须装有 OpenBot 桌面端才能真实调用工具，而所有 target 的 liveTested 仍是 false
- HTTP 形态需要公网端点，当前只有 127.0.0.1:4818；ZCode 配置文件不展开 ${...} 模板，HTTP headers 无法用环境变量占位符注入凭据
- 平台侧服务条款 / 隐私政策本轮未取证：现有依据只有产品文档与 GitHub 仓库，上架前需补 ZCode / Z.ai 侧条款，不能引用没有依据的条款
- 官方市场没有自动上架：PR 要过维护者人工审核（功能/安全/可维护性/兼容性/来源/许可证），README×2、副作用披露与版本纪律都要先备齐

### 依据

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [官方市场贡献指南 CONTRIBUTING.md](https://github.com/zai-org/zcode-plugins/blob/main/CONTRIBUTING.md) | 审核/上架 | 官方 | 已抓正文 | 本轮抓到全文：插件契约（external_plugins/ 目录、清单字段、marketplace.json 一致、≥1 组件、双语 README、类目枚举、副作用披露、禁止凭据/机器路径/构建产物）、开发工作流（fork → validate.py → build_dist.py → git diff --check）、PR 模板 Plugin type 必填声明、Conventional Commits、版本不可变与语义化版本递增、维护者审核维度（功能/安全/可维护性/兼容性/来源/许可证）。 |
| [Plugin（官方文档）](https://zcode.z.ai/cn/docs/plugin) | 审核/上架 | 官方 | 已抓正文 | 本轮抓到正文：清单优先 .zcode-plugin/plugin.json（兼容 .claude-plugin/），最小清单只需 name（小写字母/数字开头，可含 . _ -，1–128 字符）；marketplace.json 在市场仓库根目录，顶层 name + plugins[]，条目 source 支持目录/github/git/file/url/npm 七种；「最新版本」取自 marketplace.json 条目、「已安装版本」取自插件清单，发版须同步更新；添加市场走 设置 → 插件 → 创建 → 添加插件市场（GitHub 仓库 / Git URL / 本地目录或文件）；官方目录只能刷新不能移除；该页未给出向官方目录提交的入口，只写了自建团队市场分发。 |
| [官方市场仓库首页](https://github.com/zai-org/zcode-plugins) | 市场 | 官方 | 已抓正文 | 本轮抓到 README 全文：官方市场收录 ZCode 维护插件与社区贡献，提交入口是 GitHub PR；类目表、插件清单、UI 插件（external_plugins/，社区维护）与 finance 插件分区；本地 UI 插件需 Node 24+ / pnpm 构建后注册 dist/local-marketplace。 |
| [本机市场注册表](~/.zcode/cli/plugins/known_marketplaces.json) | 市场 | 本机 | 本机样本 | 本机真实文件：已注册 zcode-plugins-official（source 为 CDN url https://cdn-zcode.z.ai/zcode/official-plugin/marketplace.json，pluginCount 68）与 claude-plugins-official；市场注册结构（id/source/name/description/addedAt/pluginCount）以此样本为据。 |
| [本机官方市场 catalog 样本](~/.zcode/cli/plugins/marketplaces/zcode-plugins-official/marketplace.json) | 市场 | 本机 | 本机样本 | 真实条目字段：source（url + zip + sha256 + path）、description 与 description_i18n、displayName_i18n、version、author、icon（HTTPS URL）、category、keywords、publisherType（official）、componentTypes（如 ["skill","mcp"]）——市场上架材料的字段口径按这份真实样本核对。 |

## 共通的硬缺口

- OpenBot 目前只有 `127.0.0.1:4818` 的桌面内发布端点，退出 App 即停服；没有公网常驻 HTTPS MCP Server，也没有 OAuth / 多用户隔离 / 凭据轮换。
- 现有 MCP 是异步 job 语义（`dispatch` → `task` → `result`），要进公开目录还需按各平台的工具命名、注解、输出 schema 规范改造。
- 目录元数据、图标、Skill、测试指南、隐私政策、国家/地区设置都还没准备；协议条款里标为「索引摘要」的部分需后台全文复核。
- 主体认证口径有差异：WorkBuddy 开放平台列有企业 / 其他组织 / 个人认证，个人开发者可入驻并开发管理连接器，但公开发布权限以后台为准；千问办公当前不开放个人向公共市场上传，但企业/组织内有完整提交与审核规范；豆包开放平台在内测邀请制，接入规范需登录后可见；ZCode 官方市场没有主体认证门槛，走 GitHub PR + 维护者人工审核，但要求披露副作用与许可证来源。
- 商业化约束：Cursor 发布者条款 3.1 要求市场插件免费、6.3 禁止用插件数据训练模型；Anthropic Directory Policy 禁止采集无关对话数据。这些不是技术检查项，需先确定产品与数据口径。
- 逐平台的可执行提交步骤与前置检查见 `marketplace/SUBMIT-STEPS.md`；`node src/cli.mjs market-preflight` 可复核当前缺什么。

