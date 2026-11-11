# 各平台政策与文档地址

> 由 `src/policies.mjs` 生成，登记日期 2026-11-11。修改政策注册表后运行 `npm run docs` 重新生成。

证据等级说明：`已抓正文` = 本轮直接抓到页面正文；`索引摘要` = 只拿到搜索索引或需登录的页面（协议页多为 JS 壳）；
`本机样本` = 本机文件；`第三方教程` = 非官方，不能当官方规范引用。
**正式提交前，所有「索引摘要」的协议条款都必须在平台后台按全文复核一遍。**

## 平台总览

| 平台 | 主体 | 政策条数 | 本地模式 | 市场上架 | 该类目规范 | 关联 target |
| --- | --- | --- | --- | --- | --- | --- |
| WorkBuddy | 腾讯 | 6 | 有 | not-submitted | 已找到该类目官方公开提交规范 | `workbuddy-http`, `workbuddy-stdio` |
| 千问办公 QwenWork | 阿里 / 钉钉 | 8 | 有 | not-submitted | 已找到官方连接器规范，但当前只开放企业/组织内提交与审核；公共市场个人上传尚未开放 | `qwenwork` |
| 豆包工作 | 字节跳动 | 6 | 有 | not-submitted | 平台内测邀请制：官方接入规范需登录或入驻后可见，没有公开自助提交 | `doubao-work` |
| ChatGPT 桌面 / Codex CLI / IDE 扩展 | OpenAI | 8 | 有 | not-submitted | 已找到该类目官方公开提交规范 | `codex`, `codex-stdio` |
| Cursor | Anysphere | 7 | 有 | not-submitted | 已找到该类目官方公开提交规范 | `cursor` |
| Claude / Claude Desktop | Anthropic | 9 | 有 | not-submitted | 已找到该类目官方公开提交规范 | `claude-desktop` |
| ZCode | Z.ai（zcode.z.ai / zai-org） | 0 | 有 | not-submitted | 已找到该类目官方公开提交规范 | `zcode`, `zcode-stdio` |

## WorkBuddy（workbuddy）

### 政策 / 协议

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [开发者服务协议](https://rule.tencent.com/rule/202608300002) | 服务协议 | 官方 | 索引摘要 | 规则中心页本身仍是 JS 壳（直接抓取只有标题），但搜索索引已给出第四条全文：4.1 合法合规开发、4.2 基本运营规范、4.3 禁止行为 (1)–(12)。4.3(7) 原文：「未经本平台事先书面同意，将本服务（含API接口、模型能力）进行直接封装、转售、分发或作为同类PaaS/MaaS平台的基础能力对外提供。」这一条直接约束 bot-as-API / bot-as-MCP 的对外提供方式；正式提交前仍需按后台版本复核是否有修订。 |
| [WorkBuddy 服务协议（用户侧）](https://www.workbuddy.cn/document/term) | 服务协议 | 官方 | 已抓正文 | 本轮抓到全文（Tencent WorkBuddy Service Agreement，Last updated: August 2026，只给月份）：9.2(a)(d) Input 权属保留、Output 归用户并转让；9.2(c) 用户授予为运营服务所需的内容许可；9.2(g) 原文「Tencent will not use your Content to train Tencent’s AI models…unless you grant your explicit opt-in consent」，训练是 opt-in 且撤回不追溯；3.1 明列 Third-Party Integration Risks（第三方 LLM / 插件 / API 自有条款、可能保留或训练数据、跨域合规错配、级联失败）；3.6 第三方服务/输出/链接风险自负；10.3 对 Third Party Materials 免责。注意这是用户侧协议，与开放平台《开发者服务协议》不是同一份，不能互相替代。 |
| [隐私保护指引](https://rule.tencent.com/rule/202608300001) | 隐私 | 官方 | 索引摘要 | 本轮直接抓取只返回一行「用户规则中心」，无标题、无日期、无条款正文；严格说是「正文缺失」，疑似 JS 动态渲染或渲染前抓取。不能据此引用任何隐私条款，提交前须在后台或渲染后 DOM 复核。 |
| [数据处理协议](https://rule.tencent.com/rule/202608300003) | 数据 | 官方 | 索引摘要 | 本轮直接抓取同样只返回「用户规则中心」，未见数据处理协议标题、日期、委托处理或跨境条款；正文缺失，不能作为合规依据，提交前须按后台版本复核。 |
| [企业连接器管理](https://cloud.tencent.cn/document/product/1831/134453) | 开发者 | 官方 | 索引摘要 | 企业控制台下发连接器、可见范围与工具权限过滤，属于组织内使用路径。 |
| [Web 应用 / 发布为应用](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/App-Publishing/Web-App) | 本地配置 | 官方 | 索引摘要 | 生成在线预览链接，不是对话内可调用的 MCP 连接器；别把「发布为应用」当成上架连接器市场。 |

### 本地模式依据

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [开放平台《连接器》](https://open.workbuddy.cn/docs/connector) | 本地配置 | 官方 | 已抓正文 | 明确 mcp.json 只取第一个 Server、远程地址必须 HTTPS、30 秒响应建议、SLA ≥ 99.9%、提交审核与发布流程。 |
| [本机 connectors/default/mcp.json](~/.workbuddy/connectors/default/mcp.json) | 本地配置 | 本机 | 本机样本 | 122 个键中 streamableHttp 92 个、streamable-http 2 个，是本机主流写法的依据。 |

### 市场上架依据

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [开放平台《连接器》](https://open.workbuddy.cn/docs/connector) | 审核/上架 | 官方 | 已抓正文 | 包结构、source 命名、图标、minWorkbuddyVersion、提交检查清单、审核与发布流程。 |
| [入驻开放平台](https://open.workbuddy.cn/docs/onboarding) | 开发者 | 官方 | 已抓正文 | 企业认证（营业执照 + 法人核验）、其他组织机构认证、个人认证（大陆二代身份证）三类；企业/组织主体明确可发布资产，个人主体能否发布 Connector 未在页面写明。 |
| [开放平台上线报道（媒体，非规范）](https://news.qq.com/rain/a/20260903A03VEU00) | 开发者 | 第三方 | 索引摘要 | 报道写明企业认证与个人认证两种方式、个人开发者可开发管理技能 / 专家 / 连接器；属媒体报道，不作为发布权限的正式依据。 |

### 关键约束

- 本机自定义连接器不上市场、无需平台审核，但只在本机生效且需要 UI 信任。
- 企业私有连接器由企业控制台下发，可见范围与工具权限可过滤，不等于公开市场上架。

## 千问办公 QwenWork（qwenwork）

### 政策 / 协议

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [千问办公扩展能力广场服务协议](https://terms.alicdn.com/legal-agreement/terms/common_product_agreement/20260920094459914/20260920094459914.html) | 服务协议 | 官方 | 已抓正文 | 生效 2026-09-20，本轮抓到第一条至第十四条全文。1.3 把连接器定义为符合 MCP 标准、为 Agent 提供查询/读写/鉴权入口的一组工具；2.5 完成实名或主体认证才提供发布服务；2.6 平台可按能力形态限制发布者主体类型与认证等级；5.1/5.3 审核合规、安全、基本功能可用性且可无理由拒绝；6.3/6.6 要求如实披露连接器鉴权方式、权限范围与数据边界；6.2/6.4 禁止收集账号鉴权凭证、禁止把数据用于训练或广告；12.4 上传者可自主下架；13.1 当前提交、发布、安装、使用均免费。 |
| [连接器管理（阿里云官方帮助）](https://www.alibabacloud.com/help/zh/doc-detail/3052930.html) | 审核/上架 | 官方 | 已抓正文 | 更新 2026-11-02，抓到全文：管理员可控制公共市场可见性、成员提交与审核；「允许上传个人连接器」当前标记为「即将推出」且暂不能修改；成员提交进入「连接器审核」，状态有待处理/已通过/已拒绝/已取消，通过后发布到组织连接器；连接器键与服务 URL 创建后不可修改。 |
| [创建连接器 API（开发者手册）](https://help.aliyun.com/zh/qwenwork/connector-management) | 开发者 | 官方 | 已抓正文 | 更新 2026-11-10，抓到全文：`POST /api/openapi/v1/connectors`，必填 `Idempotency-Key`，Scope `admin.v1.connectors.manage`；字段 `server_key`、`transport`(http/stdio)、`auth_type`(key/none/oauth)、`url`、`clients`、`oauth_client_registration`(dcr)、`api_key.header_name` 等。这是企业管理员侧的真实提交接口。 |
| [企业旗舰版：连接器](https://help.aliyun.com/zh/qwenwork/enterprise-ultimate-ai-assets-connectors) | 开发者 | 官方 | 已抓正文 | 更新 2026-11-03，抓到全文：广场管理区分官方/企业市场与专属/私有市场；新建企业连接器需填基础信息 → 认证与凭据（无认证 / MCP OAuth 2.1 DCR / API Key 用户提供）→ 连接协议并点「校验配置」→ 保存 → 发布策略组；官方连接器仅支持桌面端。 |
| [千问开放平台服务协议](https://terms.alicdn.com/legal-agreement/terms/b_platform_service_agreement/20260622215132874/20260622215132874.html) | 开发者 | 官方 | 索引摘要 | 入驻资质审核、内容合规审核、功能安全审核；未通过审核的 Agent/Skill 无法发布上线；平台可下架。 |
| [千问办公服务协议](https://terms.alicdn.com/legal-agreement/terms/b_end_product_protocol/20260708175856831/20260708175856831.html) | 服务协议 | 官方 | 已抓正文 | 本轮抓到第一章至第二十章全文，生效日期 2026-10-10（页面未标单独更新日）。与 OpenBot 作为外部能力接入直接相关：1.6 把第三方 API/插件/技能/平台定义为「第三方服务」；3.4(4) 禁止「利用本服务开发、训练、优化、蒸馏、增强或验证与我们存在竞争关系的产品」，3.4(5) 禁止未经书面同意做基准/压力/公开评测；4.2 访问本地文件、API、数据库等一经启用即视为用户本人行为；8.1 要求遵守《千问办公扩展能力广场服务协议》，8.2 平台只提供技术兼容与连接入口、非第三方服务提供者，8.3 第三方协议与安全要求由用户自行审查，8.4 明列恶意代码/提示注入/凭证窃取风险由接入方自担，8.5 API Key / Webhook / 数据库连接信息等接入资源自行取得授权并评估数据流；10.3 数据原则上存于中国境内；7.8 用户内容不用于训练模型。 |
| [隐私政策](https://terms.alicdn.com/legal-agreement/terms/privacy_policy_full/20260811165222571/20260811165222571.html) | 隐私 | 官方 | 索引摘要 | 官方隐私政策全文页。 |
| [隐私与安全](https://help.aliyun.com/zh/qwenwork/qw-privacy-security) | 隐私 | 官方 | 索引摘要 | 产品侧隐私与安全说明。 |

### 本地模式依据

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [官方《连接器》帮助页](https://qwenwork.cn/docs/features/connectors) | 本地配置 | 官方 | 已抓正文 | 粘贴 JSON 配置与手动填写两种入口，Streamable HTTP / SSE / STDIO 三种服务器类型的字段说明。 |
| [阿里云《千问办公：扩展》](https://www.alibabacloud.com/help/zh/doc-detail/3047919.html) | 市场 | 官方 | 索引摘要 | 扩展市场与企业空间的差别；个人用户当前版本不允许向公共扩展市场上传或发布自定义能力。 |

### 市场上架依据

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [扩展能力广场服务协议](https://terms.alicdn.com/legal-agreement/terms/common_product_agreement/20260920094459914/20260920094459914.html) | 审核/上架 | 官方 | 已抓正文 | 本轮抓到全文：定义、准入、审核、下架、数据合规与商业化条款。 |
| [连接器管理](https://www.alibabacloud.com/help/zh/doc-detail/3052930.html) | 审核/上架 | 官方 | 已抓正文 | 组织内提交、审核状态机、字段规则与个人上传「即将推出」的官方依据。 |
| [创建连接器 API](https://help.aliyun.com/zh/qwenwork/connector-management) | 审核/上架 | 官方 | 已抓正文 | 官方 OpenAPI 创建接口与字段清单，提交动作可直接映射到请求体。 |
| [企业旗舰版：连接器](https://help.aliyun.com/zh/qwenwork/enterprise-ultimate-ai-assets-connectors) | 审核/上架 | 官方 | 已抓正文 | 新建企业连接器、OAuth 2.1 DCR、校验配置与发布策略组的官方步骤。 |
| [阿里云《千问办公：扩展》](https://www.alibabacloud.com/help/zh/doc-detail/3047919.html) | 市场 | 官方 | 索引摘要 | 企业空间与公共市场的边界。 |

### 关键约束

- 官方连接器文档里的 JSON 示例使用 `streamable-http`，与 WorkBuddy 的 `streamableHttp` 不同。
- 官方文档区分「公共连接器市场」与「组织/企业连接器」：个人上传标记「即将推出」，企业提交走「连接器审核」，通过只发布到组织内，不等于公开上架。
- 本轮纠正：上一轮写成「未找到连接器类目公开提交规范」是错的——官方有连接器管理、企业旗舰版步骤与 OpenAPI 创建接口，只是公共市场个人通道尚未开放。

## 豆包工作（doubao-work）

### 政策 / 协议

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [豆包用户协议](https://www.doubao.com/legal/terms) | 服务协议 | 官方 | 已抓正文 | 更新 2026-09-10 / 生效 2026-09-17；适用范围明确包含豆包工作客户端；2.2 写明生成内容仅供参考、不得作为专业建议或商业用途，需评估对 Bot 输出商业化场景的影响。 |
| [豆包隐私政策](https://www.doubao.com/legal/privacy) | 隐私 | 官方 | 已抓正文 | 本轮抓到全文：更新 2026-09-10 / 生效 2026-09-17；明确「豆包客户端、豆包工作客户端」若关联版本无独立隐私政策则适用本政策，有独立政策则同时适用且以特定版本为准；第 3 章「数据使用过程中涉及的合作方以及转移、公开个人信息」按合法/正当最小必要/安全审慎三原则处理合作方数据，区分委托处理、共同处理、第三方信息共享清单，并说明合作方可使用必要的设备、账号及日志信息。 |
| [豆包开放平台](https://open.doubao.com/) | 开发者 | 官方 | 索引摘要 | 页面写明「平台正在内测，欢迎提交入驻意向」，不提供公开自助注册。 |
| [技能接入指南（登录后可见）](https://open.doubao.com/document/doubao-developer-guide/skill-integration-guide) | 审核/上架 | 官方 | 索引摘要 | 本轮直接抓取只返回「开发文档 · 豆包开放平台 → 登录」壳，正文来自搜索索引，属于登录/入驻后才可见的文档。「技能与连接器的关系」原文：连接器负责把外部系统、数据和业务动作接入豆包；外部 API 不应直接暴露在技能中，应通过豆包认可的连接器或已注册工具接入，并按平台要求完成鉴权、权限和安全验证。另含企业资质认证、ZIP 包自动校验、测试商店验收、统一发版与状态机。 |
| [豆包工作服务商连接器（第三方实操）](https://apibobo.com/content/posts/doubao-work-connectors-mcp-guide) | 市场 | 第三方 | 第三方教程 | 第三方教程提到「豆包工作对服务商的规范」与「官方连接器库」，服务商版本需 Streamable HTTP + OAuth + 动态注册，上架后用户点授权即可用；未经官方证实，不作为提交依据，但说明服务商通道确实存在。 |
| [豆包工作本地 STDIO 连接器（第三方实操）](http://mediaclaw.app/en/features/doubao-integration) | 本地配置 | 第三方 | 第三方教程 | 第三方教程给出完整本地步骤：新建自定义连接器可填 STDIO 的 command / args / env，保存后需确认开关打开、完成设备配对批准，并用真实 tool call 验证；不是官方规范。 |

### 本地模式依据

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [飞书帮助中心《在飞书中使用豆包工作》](https://www.feishu.cn/hc/zh-CN/articles/282796994123-%E5%9C%A8%E9%A3%9E%E4%B9%A6%E4%B8%AD%E4%BD%BF%E7%94%A8%E8%B1%86%E5%8C%85%E5%B7%A5%E4%BD%9C) | 本地配置 | 官方 | 索引摘要 | 官方产品帮助文档，写明 + 添加 → 新建自定义连接器需填写服务器名称、服务器 URL 等信息。 |
| [自定义连接器表单截图与步骤（第三方教程）](http://mp.weixin.qq.com/s?__biz=MzkxNDI3NjUwNQ==&mid=2247488740&idx=1&sn=dd2752b2bef90adb4809cb2cd3435cf6) | 本地配置 | 第三方 | 第三方教程 | 表单里明确「自定义连接器仅支持在本地电脑中使用」，并展示 HTTP / 服务器 URL / 自定义 Headers 与授权步骤；不是官方规范。 |
| [豆包工作自定义 MCP 接入教程（第三方）](https://www.idcspy.net/32442.html) | 本地配置 | 第三方 | 第三方教程 | 第三方格式依据，用于交叉印证表单字段。 |

### 市场上架依据

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [豆包开放平台首页](https://open.doubao.com/) | 市场 | 官方 | 索引摘要 | 「平台正在内测，欢迎提交入驻意向」与入驻意向入口。 |
| [技能接入指南（登录后可见）](https://open.doubao.com/document/doubao-developer-guide/skill-integration-guide) | 审核/上架 | 官方 | 索引摘要 | 本轮直接抓取返回登录壳，正文来自搜索索引；含技能/版本状态机、企业认证、测试商店验收、统一发版，以及「连接器负责接入外部系统、外部 API 不直接暴露在技能中」的口径。 |
| [豆包工作服务商连接器（第三方实操）](https://apibobo.com/content/posts/doubao-work-connectors-mcp-guide) | 市场 | 第三方 | 第三方教程 | 第三方教程提到服务商规范、官方连接器库与 Streamable HTTP + OAuth + 动态注册；未经官方证实，只用于证明通道存在。 |
| [火山引擎《MCP》文档（营销 Agent 控制台）](https://volcengine.com/docs/data-agent/mcp?lang=zh) | 市场 | 官方 | 索引摘要 | 官方但属于营销 Agent 控制台的 MCP Server 注册流程（域名 / 端口 / 请求头 / Tools 上传 Swagger），不是豆包工作连接器类目的上架规范，不能混用。 |
| [第三方连接器目录的豆包提交说明](https://connector.zone/connectors/io-omfang-manifest/install/doubao) | 市场 | 第三方 | 第三方教程 | 称需在火山引擎插件开发者控制台注册公网 HTTPS MCP 并走审核；第三方 registry 说明，未经官方证实。 |

### 关键约束

- 本地自定义连接器与服务商上架是两回事：前者只在本地电脑，后者需入驻内测、企业认证与平台审核。
- 本轮纠正：连接器规范不是「没找到」，而是内测邀请制、登录后可见；第三方实操显示服务商通道需要 Streamable HTTP + OAuth + 动态注册。
- 表单字段来自官方帮助文档与第三方教程交叉印证，未见官方 JSON 配置导入说明。

## ChatGPT 桌面 / Codex CLI / IDE 扩展（chatgpt-codex）

### 政策 / 协议

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [条款与政策总览](https://openai.com/zh-Hans-CN/policies/) | 服务协议 | 官方 | 已抓正文 | 官方政策索引页，逐条链接已核对。 |
| [App Developer Terms（连接器与操作条款）](https://openai.com/policies/developer-apps-terms/) | 开发者 | 官方 | 已抓正文 | 更新 2026-09-28；明确覆盖 custom connectors 与经 MCP server 暴露的 API；1.2 限定请求数据处理目的，2.1/2.3 要求安全措施与事先隐私告知，7.1 提交时须保证合规。Service terms 第 5/7 节指向的规范路径是 /policies/connectors-actions-terms/，本轮另核该页同样返回 App Developer Terms 正文，两条 URL 并列登记。 |
| [App Developer Terms（Service terms 引用的规范路径）](https://openai.com/policies/connectors-actions-terms/) | 开发者 | 官方 | 已抓正文 | 本轮抓到全文，Updated: September 28, 2026，不是 404/403。原文适用范围含「custom apps, connectors, plugins, and actions」，并明列「custom connectors created in ChatGPT developer mode」；把「your API or to another service that exposes an API, including via an MCP server」定义为 API。这是 bot-as-MCP 在 ChatGPT 侧最直接的开发者条款依据。 |
| [使用政策](https://openai.com/policies/usage-policies/) | 使用政策 | 官方 | 已抓正文 | 本轮抓到全文：页面标 Effective: November 20, 2026，Changelog 最近条目 2026-10-21（即按 2026-11-11 计尚未生效，提交前须按生效版本重核）。原文「If you operate a model-access intermediary platform or other service that enables third parties to directly access OpenAI models, you must obtain our prior review and approval. This requirement does not apply solely because an application integrates OpenAI models to power its features or functionality.」另禁止敏感领域无人工审查的高风险行动自动化，并限制用输出训练替代模型；正文没有专门的 connectors 条款。 |
| [隐私政策](https://openai.com/policies/privacy-policy/) | 隐私 | 官方 | 索引摘要 | 官方隐私政策。 |
| [服务条款](https://openai.com/policies/service-terms/) | 服务协议 | 官方 | 已抓正文 | 本轮抓到全文：Updated: November 10, 2026（页面未给单独生效日）。第 7 节 Apps and Actions 原文「Apps and Actions…allow ChatGPT to send and receive information from a third-party application or website」，「Any custom App is subject to our App Developer Terms」，启用 App 即授权把部分 Content 与国家/州等 App Data 发给第三方 Application，OpenAI 对第三方接收后的 App Data 不负责；第 5 节 GPTs/Actions 也要求每个 Action 遵守 App Developer Terms；第 4 节提示 Codex 输出可能受第三方/开源许可证约束；第 2 节 Beta Services 按 as-is 且排除赔偿。 |
| [数据处理附录](https://openai.com/policies/data-processing-addendum/) | 数据 | 官方 | 索引摘要 | 个人数据处理附录。 |
| [使用条款](https://openai.com/policies/terms-of-use/) | 服务协议 | 官方 | 索引摘要 | 个人用户条款，生效 2026-01-01。 |

### 本地模式依据

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [Model Context Protocol（Codex 官方文档）](https://learn.chatgpt.com/docs/extend/mcp) | 本地配置 | 官方 | 索引摘要 | STDIO / Streamable HTTP、Bearer token、OAuth、config.toml 字段与桌面 UI 入口。 |
| [模型上下文协议（官方中文镜像）](https://developers.openai.ac.cn/codex/extend/mcp) | 本地配置 | 官方 | 已抓正文 | 取到完整 config.toml 字段：url / bearer_token_env_var / http_headers / env_http_headers / command / args / env。 |
| [Docs MCP（官方示例）](https://platform.openai.com/docs/docs-mcp) | 本地配置 | 官方 | 索引摘要 | 给出 `codex mcp add`、`codex mcp list` 与 [mcp_servers.*] 的最小示例。 |

### 市场上架依据

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [Plugin guidelines（App Submission Guidelines）](https://developers.openai.com/apps-sdk/app-submission-guidelines) | 审核/上架 | 官方 | 索引摘要 | 目的与原创性、质量、工具命名与描述、注解、最小输入、可审计行为等发布最低标准。本轮直接抓取返回 HTTP 403 Forbidden（页面正文只有 Forbidden 与请求追踪号），不是「没有规范」而是「当前抓取通道被拒」；提交前须用已登录的开发者账号复核，不得把索引摘要当全文。 |
| [Submit plugins](https://help.openai.com/en/articles/20001040-submitting-apps-to-the-chatgpt-app-directory) | 审核/上架 | 官方 | 索引摘要 | 提交流程、组织角色权限、portal 扫描 MCP Server 与工具元数据。 |
| [Developers can now submit apps to ChatGPT](https://openai.com/blog/developers-can-now-submit-apps-to-chatgpt) | 市场 | 官方 | 索引摘要 | 官方公告：提交包含 MCP 连接信息、测试指南、目录元数据与国家/地区设置；必须附清晰隐私政策。 |
| [Build an MCP server](https://developers.openai.com/apps-sdk/build/mcp-server) | 开发者 | 官方 | 索引摘要 | 工具 schema、outputSchema、注解、instructions 与 structuredContent 规范。 |
| [ChatGPT 应用目录](https://chatgpt.com/apps) | 市场 | 官方 | 索引摘要 | 官方公告明确给出的用户侧目录入口，可从工具菜单或直接访问。 |
| [开发者平台提交入口](https://platform.openai.com/apps-manage) | 市场 | 官方 | 索引摘要 | OpenAI 开发者社区帖给出的提交后台地址；需登录组织账号并具备 Apps Management 权限，提交前以后台实际入口为准。 |
| [ChatGPT 中的应用（帮助中心）](https://help.openai.com/zh-hans-cn/articles/9309188-connected-apps-on-chatgpt) | 市场 | 官方 | 索引摘要 | 应用目录、工作空间管理员控制、自定义应用与提交到目录的官方帮助说明。 |

### 关键约束

- 本地 config.toml 与网页版插件是两条独立路径：网页版不读本机配置。
- App Developer Terms 把「经 MCP server 暴露的 API」纳入适用范围，bot-as-MCP 上架不是纯技术问题。

## Cursor（cursor）

### 政策 / 协议

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [Cursor 隐私政策](https://cursor.com/privacy) | 隐私 | 官方 | 已抓正文 | 本轮抓到全文，Last updated November 6, 2026。第 3 节 How we share personal data 明确「Third-Party Services and Integrations」：与第三方网站/应用/服务集成时，用户选择交互即可能把个人数据直接披露给第三方并受其自身条款与隐私政策约束，Cursor 的链接或集成不代表背书或关联；另列 Business Account Administrators、用户主动共享的 Inputs/Suggestions、经同意的披露与 trust.cursor.com/subprocessors 子处理者名单。 |
| [Cursor 服务条款](https://cursor.com/terms-of-service) | 服务协议 | 官方 | 已抓正文 | 本轮抓到中文正文：Anysphere, Inc. 的访问与使用、内容、模型训练、可接受使用政策等条款；URL 已核实，不再是推测路径。 |
| [Cursor 应用市场发布者条款](https://cursor.com/marketplace-publisher-terms) | 审核/上架 | 官方 | 已抓正文 | Last updated 2026-05-06，本轮抓到全文：2.1 在 /marketplace/publish 提交申请、更新走 request re-index 而非重复申请；2.2 核验发布者身份与业务合法性并审查代码，可无理由拒绝且不说明理由；2.3 上线后随时可复审；3.1 市场插件必须免费提供，不得直接或间接收费；6.3 不得用 Plugin Data / User Content 训练 AI 模型；7.1 可随时下架。 |
| [Data Processing Addendum](https://www.cursor.com/terms/dpa) | 数据 | 官方 | 已抓正文 | Last updated 2025-11-05；Anysphere 作为 Vendor/processor，含 01–13 条与 ANNEX 1–3，第 10 条要求数据泄露 48 小时内书面通知。 |
| [Security and compliance documents](https://cursor.com/help/security-and-privacy/compliance) | 数据 | 官方 | 已抓正文 | 官方列出的 DPA 短链 cursor.com/dpa、MSA 短链 cursor.com/msa，以及 Trust Center 资料申请路径。 |
| [Trust Center](https://trust.cursor.com/) | 数据 | 官方 | 索引摘要 | 列出 Cursor DPA / Privacy / TOS 与 SOC 2、ISO 证书；本轮从官方帮助页与 /terms/dpa 正文确认真实 URL，不再拼 Trust Center 内部链接。 |
| [Privacy and Data Governance](https://cursor.com/docs/enterprise/privacy-and-data-governance) | 数据 | 官方 | 索引摘要 | 数据流、Privacy Mode、数据驻留与加密说明。 |

### 本地模式依据

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [Model Context Protocol (MCP)](https://cursor.com/docs/context/mcp) | 本地配置 | 官方 | 已抓正文 | 本轮抓到全文：三种传输 stdio / SSE / Streamable HTTP；远程示例只写 url + headers（不写 type），STDIO 示例只写 command / args / env；但「STDIO server configuration」字段表把 type 标为必填且值为 "stdio"——官方页自身示例与字段表不一致，本机 ~/.cursor/mcp.json 按示例不写 type，仍需 UI 复核，不能据字段表擅自改配置。另含静态 OAuth 的 auth.CLIENT_ID / CLIENT_SECRET / scopes、固定回调 https://www.cursor.com/agents/mcp/oauth/callback 与 http://localhost:8787/callback、${env:NAME} 插值、项目级 .cursor/mcp.json 与全局 ~/.cursor/mcp.json、OAuth 2.0 授权码 + PKCE + DCR（RFC 9728 / RFC 8707）、企业 MCP Allowlist 与工具审批。 |
| [MCP integrations](https://cursor.com/help/customization/mcp) | 本地配置 | 官方 | 索引摘要 | 一键安装 / 手动安装、全局与项目级文件、工具审批与排错。 |

### 市场上架依据

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [Cursor 应用市场发布者条款](https://cursor.com/marketplace-publisher-terms) | 审核/上架 | 官方 | 已抓正文 | 提交、审查、批准、持续复审、免费分发与数据使用限制的正式条款。 |
| [提交入口](https://cursor.com/marketplace/publish) | 市场 | 官方 | 已抓正文 | 发布者条款 2.1 指定的申请页；本轮直接打开只显示「You need to be signed in to submit a plugin publisher application」，需登录。 |
| [Plugins reference（官方）](https://cursor.com/docs/reference/plugins) | 审核/上架 | 官方 | 已抓正文 | 本轮抓到全文：清单字段、公开 Git 仓库、提交仓库链接三步与 11 项 submission checklist、variables schema 与 ${VAR} 声明要求；已替换上一轮引用的第三方镜像。 |
| [Plugins（官方）](https://cursor.com/docs/plugins) | 市场 | 官方 | 索引摘要 | 插件以 Git 仓库分发、由 Cursor 团队逐个人工审查后上架；团队市场与公开市场是不同路径。 |
| [MCP integrations](https://cursor.com/help/customization/mcp) | 市场 | 官方 | 索引摘要 | 市场一键安装、团队分发与社区目录 cursor.directory 的区别。 |

### 关键约束

- Cursor 远程 MCP 配置不写 type 字段；只有 SSE 端点才显式写 type: "sse"。
- 上一轮把 Cursor 市场写成「未找到公开提交规范」是错的：官方有发布者条款、Plugins reference 与 /marketplace/publish 提交入口，本轮已更正。
- 市场收的是开源插件包（含 mcpServers），本地 mcp.json 只在自己电脑上生效。
- 发布者条款 3.1 要求免费、6.3 禁止用插件数据训练模型，这两条是商业化约束，不是技术检查项。

## Claude / Claude Desktop（claude）

### 政策 / 协议

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [Legal center](https://www.anthropic.com/legal) | 服务协议 | 官方 | 已抓正文 | 本轮抓到完整条目与链接，逐条核对了 Consumer / Commercial Terms、隐私、使用政策、DPA 的真实路径。 |
| [Consumer Terms of Service](https://www.anthropic.com/legal/consumer-terms) | 服务协议 | 官方 | 索引摘要 | Free / Pro / Max 个人用户条款。 |
| [Commercial Terms of Service](https://www.anthropic.com/legal/commercial-terms) | 服务协议 | 官方 | 索引摘要 | API 与 Team / Enterprise 商业条款。 |
| [Privacy Policy（2026-09-10）](https://www.anthropic.com/legal/privacy) | 隐私 | 官方 | 索引摘要 | Legal center 列出的真实路径，已核对。 |
| [Usage Policy（2026-11-12 生效）](https://www.anthropic.com/legal/aup) | 使用政策 | 官方 | 已抓正文 | 本轮抓到全文：页面只写 Effective Nov 12, 2026（无单独最后更新日），按 2026-11-11 计尚未生效，提交前须按生效版复核。上一轮按惯例拼的 /legal/usage-policy 是错的，Legal center 真实路径是 /legal/aup。适用范围覆盖 API/开发者平台、云与授权经销商客户及「end users of products or services integrating Claude」；原文「Agentic use cases must comply with the Usage Policy. Users are responsible for ensuring that agents they build or deploy, including actions those agents take through tools, browsers, or connected systems, comply with this Usage Policy.」；「Resell, proxy, or otherwise provide access to Claude through unauthorized means」被禁止；「Software listed in our Directories must comply with our Software Directory Policy」；面向外部用户的 chatbot / AI agent 必须披露 AI 身份；禁止未经授权用输出训练模型。 |
| [Data Processing Addendum](https://www.anthropic.com/legal/data-processing-addendum) | 数据 | 官方 | 已抓正文 | 本轮抓到全文：Effective Feb 24, 2025，Audience: Business，页面未标单独更新日；上一轮写的 /legal/dpa 是错的，真实路径是 /legal/data-processing-addendum。Customer 为 controller、Anthropic 为 processor，仅按客户书面指示为提供/维护 Services 处理；子处理者采用「概括授权 + 新增前合理通知 + 15 日异议期 + 逾期视为同意」；跨境以 EU SCCs Module Two/Three + UK Addendum + Swiss Addendum 为基础，冲突优先级 SCCs > DPA > Agreement；终止后 30 天内删除 Customer Data（法定/争议/滥用对抗保留除外）。本页没有第三方连接器专章，集成数据流需另看 Agreement 与产品条款。 |
| [Service Specific Terms](https://www.anthropic.com/legal/service-specific-terms) | 服务协议 | 官方 | 索引摘要 | 特定产品与功能的附加条款。 |
| [Anthropic Software Directory Terms](https://support.claude.com/en/articles/13145338-anthropic-software-directory-terms) | 开发者 | 官方 | 已抓正文 | 本轮抓到全文，页面列示 March 16, 2026（未标明是生效日还是更新日）：提交者承担权利、合规、隐私政策、持续安全与赔偿责任；Anthropic 可无理由拒绝收录或随时移除、可使用并共享 functional metadata，条款可无事先通知修改。 |
| [Anthropic Software Directory Policy](https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy) | 审核/上架 | 官方 | 已抓正文 | 本轮抓到全文：禁止收集无关对话数据、访问 Claude memory / 聊天历史 / 对话摘要 / 用户文件；工具描述必须窄而准确、无隐藏或动态拉取的指令；MCP 工具名 ≤64 字符、必须带 title / readOnlyHint / destructiveHint；需测试账号与至少 3 个可运行用例；持续审核与重大变更重新审核。 |

### 本地模式依据

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [Get started with custom connectors using remote MCP](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp) | 本地配置 | 官方 | 索引摘要 | 远程连接器必须公网可达；Team/Enterprise 由 Owner 添加；Free 用户限一个自定义连接器。 |
| [Get started with MCP Apps](https://claude.com/docs/connectors/building/mcp-apps/getting-started) | 本地配置 | 官方 | 索引摘要 | Claude Desktop 通过配置文件用 command + args 启动本地 MCP 示例服务器。 |

### 市场上架依据

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [Submit a connector to the directory](https://claude.com/docs/connectors/building/submission) | 审核/上架 | 官方 | 已抓正文 | 本轮抓到全文：付费账号资格、远程 HTTPS、OAuth 2.0、工具注解、隐私政策、测试账号、portal 十步、七项 Compliance 确认与 Community / Verified 差异。 |
| [开发者后台提交入口](https://claude.ai/directory/manage) | 市场 | 官方 | 索引摘要 | 官方提交文档指定的 Submit new → MCP connector 入口，需登录付费 Claude 账号。 |
| [Anthropic Software Directory Terms](https://support.claude.com/en/articles/13145338-anthropic-software-directory-terms) | 审核/上架 | 官方 | 已抓正文 | 官方提交文档直接给出的目录条款地址，本轮抓到正文；上一轮写的「独立 URL 未核实」已更正。 |
| [Anthropic Software Directory Policy](https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy) | 审核/上架 | 官方 | 已抓正文 | 官方提交文档直接给出的目录政策地址，本轮抓到正文；安全、隐私、工具描述与 MCP 附加要求以此为准。 |
| [Connectors Directory](https://claude.com/marketplace/connectors-plugins) | 市场 | 官方 | 索引摘要 | 用户侧目录页，条目带 Verified / Community 标签。 |
| [Get started with connectors](https://claude.com/docs/connectors/getting-started) | 市场 | 官方 | 索引摘要 | 目录、自定义连接器、组织权限与工具开关的官方说明。 |
| [Get started with custom connectors using remote MCP](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp) | 市场 | 官方 | 索引摘要 | 自定义连接器与目录条目的区别、网络要求与组织权限。 |

### 关键约束

- 本地 STDIO 能用不等于远程连接器能用：后者要求公网可达，这是与 WorkBuddy / Codex / Cursor 最大的差异。
- 上一轮把 Claude 目录写成「未找到公开提交规范」是错的：官方有 submission 文档与开发者后台，本轮已更正。
- 上一轮按惯例拼的 /legal/usage-policy、/legal/dpa 两个 URL 是错的，已按 Legal center 改成 /legal/aup 与 /legal/data-processing-addendum。
- 上一轮写「Directory Terms / Policy 独立 URL 未核实」也已更正：官方提交文档给出两条 support.claude.com 地址，本轮均抓到正文。

## ZCode（zcode）

### 政策 / 协议

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |

### 本地模式依据

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [MCP（官方文档）](https://zcode.z.ai/cn/docs/mcp-services) | 本地配置 | 官方 | 已抓正文 | 本轮抓到正文：用户级 ~/.zcode/cli/config.json 与工作区级 <项目根>/.zcode/config.json 都用嵌套 mcp.servers 键；~/.agents/mcp.json 是同作用域回退且用顶层 mcpServers；stdio 示例字段 command / args / env；HTTP/SSE 填服务地址与可选请求头（如 Authorization）；工作区服务与用户级一样自动连接；OAuth 仅适用 HTTP/SSE 远程服务，本地服务经环境变量传凭据；面板写入永远落在 .zcode；停用写 enable: false。 |
| [MCP 配置诊断（官方 zcode-guide 插件随附文档）](~/.zcode/cli/plugins/cache/zcode-plugins-official/zcode-guide/0.3.0/skills/diagnosing-mcp/SKILL.md) | 本地配置 | 官方 | 本机样本 | 本机官方插件随附正文：schema 严格、未知键整条服务被丢弃；模板 ${...} 只对插件自带 MCP 展开，配置文件不展开、须写绝对路径；建议配置文件用规范字段（env / headers / enabled / type: "http"），legacy 形态（remote / environment / enable / http_headers）由 CLI 读取时自动迁移；默认超时 30000ms，可加 timeoutMs；OpenCode 式 command 数组会被静默丢弃。 |
| [本机用户级配置](~/.zcode/cli/config.json) | 本地配置 | 本机 | 本机样本 | 本机真实文件当前只有 plugins 启停状态，没有 mcp.servers——openbot 尚未向 ZCode 声明；写入走 install-local --target zcode --write-to。 |

### 市场上架依据

| 文档 | 类别 | 来源 | 证据 | 要点 |
| --- | --- | --- | --- | --- |
| [官方市场贡献指南 CONTRIBUTING.md](https://github.com/zai-org/zcode-plugins/blob/main/CONTRIBUTING.md) | 审核/上架 | 官方 | 已抓正文 | 本轮抓到全文：插件契约（external_plugins/ 目录、清单字段、marketplace.json 一致、≥1 组件、双语 README、类目枚举、副作用披露、禁止凭据/机器路径/构建产物）、开发工作流（fork → validate.py → build_dist.py → git diff --check）、PR 模板 Plugin type 必填声明、Conventional Commits、版本不可变与语义化版本递增、维护者审核维度（功能/安全/可维护性/兼容性/来源/许可证）。 |
| [Plugin（官方文档）](https://zcode.z.ai/cn/docs/plugin) | 审核/上架 | 官方 | 已抓正文 | 本轮抓到正文：清单优先 .zcode-plugin/plugin.json（兼容 .claude-plugin/），最小清单只需 name（小写字母/数字开头，可含 . _ -，1–128 字符）；marketplace.json 在市场仓库根目录，顶层 name + plugins[]，条目 source 支持目录/github/git/file/url/npm 七种；「最新版本」取自 marketplace.json 条目、「已安装版本」取自插件清单，发版须同步更新；添加市场走 设置 → 插件 → 创建 → 添加插件市场（GitHub 仓库 / Git URL / 本地目录或文件）；官方目录只能刷新不能移除；该页未给出向官方目录提交的入口，只写了自建团队市场分发。 |
| [官方市场仓库首页](https://github.com/zai-org/zcode-plugins) | 市场 | 官方 | 已抓正文 | 本轮抓到 README 全文：官方市场收录 ZCode 维护插件与社区贡献，提交入口是 GitHub PR；类目表、插件清单、UI 插件（external_plugins/，社区维护）与 finance 插件分区；本地 UI 插件需 Node 24+ / pnpm 构建后注册 dist/local-marketplace。 |
| [本机市场注册表](~/.zcode/cli/plugins/known_marketplaces.json) | 市场 | 本机 | 本机样本 | 本机真实文件：已注册 zcode-plugins-official（source 为 CDN url https://cdn-zcode.z.ai/zcode/official-plugin/marketplace.json，pluginCount 68）与 claude-plugins-official；市场注册结构（id/source/name/description/addedAt/pluginCount）以此样本为据。 |
| [本机官方市场 catalog 样本](~/.zcode/cli/plugins/marketplaces/zcode-plugins-official/marketplace.json) | 市场 | 本机 | 本机样本 | 真实条目字段：source（url + zip + sha256 + path）、description 与 description_i18n、displayName_i18n、version、author、icon（HTTPS URL）、category、keywords、publisherType（official）、componentTypes（如 ["skill","mcp"]）——市场上架材料的字段口径按这份真实样本核对。 |

### 关键约束

- ZCode 是七个平台里唯一的「插件包」市场：插件可自带 stdio MCP（插件作用域会展开 ${CLAUDE_PLUGIN_ROOT} / ${user_config.键} 等模板变量），因此是唯一不强制公网 HTTPS 端点的上架路径；但 CONTRIBUTING 要求如实披露命令执行、hooks、MCP server 等副作用。
- 配置文件与插件是两条通道：~/.zcode/cli/config.json 的 mcp.servers 不展开模板、schema 严格（未知键整条丢弃）；模板展开与 user_config 是插件自带 MCP 的能力。
- 本机正在运行 ZCode：known_marketplaces.json 已注册官方市场（CDN 分发 68 插件）；官方文档页没写向官方目录提交的入口，提交路径以 zai-org/zcode-plugins 的 CONTRIBUTING.md（GitHub PR + 人工审核）为准。
- 平台侧条款（服务协议/隐私政策）未取证：本轮只有产品文档与 GitHub 仓库依据，不能编造条款内容。

## 取证边界

- 登记文档共 98 条；其中已抓正文 43 条，索引摘要 44 条。
- 腾讯规则中心开发者服务协议页面仍是 JS 壳，但搜索索引已给出第四条全文，4.3(7) 关于封装 / 转售 / 分发 / 同类 PaaS/MaaS 的原文已核对；正式提交前仍需按后台版本复核是否有修订。
- 千问办公扩展能力广场服务协议、《连接器管理》、《创建连接器 API》、企业旗舰版连接器本轮都抓到正文；上一轮写成「未找到连接器类目提交规范」是错的，真实情况是公共市场个人上传标记「即将推出」，当前只开放企业/组织内提交。
- 豆包开放平台内测邀请制：技能接入指南直接抓取返回「登录」壳，正文来自搜索索引；服务商连接器规范需入驻后可见，不是不存在。
- 豆包工作自定义连接器表单字段来自官方帮助文档 + 第三方教程交叉印证，未见官方 JSON 配置导入说明。
- Cursor 的 DPA、发布者条款、Plugins reference，以及 Anthropic 的 Legal Center、目录 Terms / Policy、connector submission 均已抓到正文；不再引用按惯例拼的子路径或第三方镜像。
- ZCode 的官方 MCP 文档（mcp-services）、Plugin 文档与官方市场 CONTRIBUTING.md 本轮抓到正文；市场注册结构与 catalog 字段按本机 known_marketplaces.json 与官方市场 marketplace.json 真实样本核对。ZCode 平台侧服务条款 / 隐私政策未取证，登记为待补，不编造条款。
- ZCode 配置文件（mcp.servers）不展开 ${...} 模板、schema 严格（未知键整条服务被丢弃）；模板展开与 user_config 是插件自带 MCP 才有的能力。因此 zcode HTTP target 的 authPlaceholderSupported=false。
- `available` 只表示存在市场路径；`submissionSpec` 区分公开规范 / 企业组织内提交 / 内测邀请制，不能一概写成「未找到」。

