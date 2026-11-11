import { targets } from './targets.mjs';

/**
 * 各 Agent 应用平台的政策、本地模式与市场上架条件。
 *
 * 证据等级（evidence）必须如实标注：
 *   fetched  = 本轮直接抓到页面正文
 *   indexed  = 本轮只拿到搜索索引摘要，未取到全文（尤其协议类页面）
 *   sample   = 本机文件 / 客户端界面样本
 *   tutorial = 第三方接入教程，非官方文档
 *
 * kind: official = 官方域名；third-party = 第三方；local = 本机文件。
 * 不要把第三方教程里看到的表单字段写成官方规范，也不要把「没找到」写成「不存在」。
 */

export const EVIDENCE_KINDS = ['fetched', 'indexed', 'sample', 'tutorial'];
export const DOC_CATEGORIES = [
  'terms', 'privacy', 'data', 'developer', 'usage', 'review', 'local-config', 'market',
];
export const DOCUMENTED_AT = '2026-11-11';

function doc(title, url, category, kind, evidence, note) {
  return { title, url, category, kind, evidence, note };
}

export const platforms = [
  {
    id: 'workbuddy',
    label: 'WorkBuddy',
    vendor: '腾讯',
    targets: ['workbuddy-http', 'workbuddy-stdio'],
    localMode: {
      available: true,
      entry: '~/.workbuddy/mcp.json，或 连接器 → 自定义连接器 → 配置 MCP',
      transports: ['stdio', 'streamableHttp', 'sse'],
      configPaths: ['~/.workbuddy/mcp.json'],
      trustRequired: true,
      loopback: 'yes',
      note: '本机客户端进程可访问 127.0.0.1；写进 mcp.json 只是声明，还需在自定义连接器入口点一次「信任」。',
      docs: [
        doc('开放平台《连接器》', 'https://open.workbuddy.cn/docs/connector', 'local-config', 'official', 'fetched',
          '明确 mcp.json 只取第一个 Server、远程地址必须 HTTPS、30 秒响应建议、SLA ≥ 99.9%、提交审核与发布流程。'),
        doc('本机 connectors/default/mcp.json', '~/.workbuddy/connectors/default/mcp.json', 'local-config', 'local', 'sample',
          '122 个键中 streamableHttp 92 个、streamable-http 2 个，是本机主流写法的依据。'),
      ],
    },
    policies: [
      doc('开发者服务协议', 'https://rule.tencent.com/rule/202608300002', 'terms', 'official', 'indexed',
        '规则中心页本身仍是 JS 壳（直接抓取只有标题），但搜索索引已给出第四条全文：4.1 合法合规开发、4.2 基本运营规范、4.3 禁止行为 (1)–(12)。4.3(7) 原文：「未经本平台事先书面同意，将本服务（含API接口、模型能力）进行直接封装、转售、分发或作为同类PaaS/MaaS平台的基础能力对外提供。」这一条直接约束 bot-as-API / bot-as-MCP 的对外提供方式；正式提交前仍需按后台版本复核是否有修订。'),
      doc('WorkBuddy 服务协议（用户侧）', 'https://www.workbuddy.cn/document/term', 'terms', 'official', 'fetched',
        '本轮抓到全文（Tencent WorkBuddy Service Agreement，Last updated: August 2026，只给月份）：9.2(a)(d) Input 权属保留、Output 归用户并转让；9.2(c) 用户授予为运营服务所需的内容许可；9.2(g) 原文「Tencent will not use your Content to train Tencent’s AI models…unless you grant your explicit opt-in consent」，训练是 opt-in 且撤回不追溯；3.1 明列 Third-Party Integration Risks（第三方 LLM / 插件 / API 自有条款、可能保留或训练数据、跨域合规错配、级联失败）；3.6 第三方服务/输出/链接风险自负；10.3 对 Third Party Materials 免责。注意这是用户侧协议，与开放平台《开发者服务协议》不是同一份，不能互相替代。'),
      doc('隐私保护指引', 'https://rule.tencent.com/rule/202608300001', 'privacy', 'official', 'indexed',
        '本轮直接抓取只返回一行「用户规则中心」，无标题、无日期、无条款正文；严格说是「正文缺失」，疑似 JS 动态渲染或渲染前抓取。不能据此引用任何隐私条款，提交前须在后台或渲染后 DOM 复核。'),
      doc('数据处理协议', 'https://rule.tencent.com/rule/202608300003', 'data', 'official', 'indexed',
        '本轮直接抓取同样只返回「用户规则中心」，未见数据处理协议标题、日期、委托处理或跨境条款；正文缺失，不能作为合规依据，提交前须按后台版本复核。'),
      doc('企业连接器管理', 'https://cloud.tencent.cn/document/product/1831/134453', 'developer', 'official', 'indexed',
        '企业控制台下发连接器、可见范围与工具权限过滤，属于组织内使用路径。'),
      doc('Web 应用 / 发布为应用', 'https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/App-Publishing/Web-App', 'local-config', 'official', 'indexed',
        '生成在线预览链接，不是对话内可调用的 MCP 连接器；别把「发布为应用」当成上架连接器市场。'),
    ],
    marketplace: {
      available: true,
      name: 'Connector 市场（开放平台）',
      url: 'https://open.workbuddy.cn/',
      status: 'not-submitted',
      requirements: [
        '一个 Connector 包只含一个 MCP Server（connector-meta.json + mcp.json + icon + skills/）',
        'MCP Server 公网或约定网络稳定可达，生产环境地址必须 HTTPS',
        '单次请求建议 30 秒内响应，建议 SLA ≥ 99.9%，实现标准 MCP 协议',
        '涉及用户数据需认证鉴权；不得在包内硬编码真实 Token；最小权限',
        '自查清单通过后提交审核，审核通过转待发布，点击发布后上架；更新需递增 version 重新审核',
      ],
      blockers: [
        '当前 OpenBot 没有公网常驻 MCP Server；4818 仅监听 127.0.0.1，退出桌面即停服',
        'OAuth（auth_mode: server-side）需实现 DCR / 元数据端点并完成域名加白，或改用 token 表单模式',
        '主体口径：开放平台文档列有企业 / 其他组织 / 个人认证，上线报道也写明个人开发者可入驻并开发管理连接器；但公开发布权限与审核口径仍以后台实际入口为准',
        '开发者服务协议 4.3(7) 只拿到索引摘要，正式提交前需后台全文复核',
      ],
      docs: [
        doc('开放平台《连接器》', 'https://open.workbuddy.cn/docs/connector', 'review', 'official', 'fetched',
          '包结构、source 命名、图标、minWorkbuddyVersion、提交检查清单、审核与发布流程。'),
        doc('入驻开放平台', 'https://open.workbuddy.cn/docs/onboarding', 'developer', 'official', 'fetched',
          '企业认证（营业执照 + 法人核验）、其他组织机构认证、个人认证（大陆二代身份证）三类；企业/组织主体明确可发布资产，个人主体能否发布 Connector 未在页面写明。'),
        doc('开放平台上线报道（媒体，非规范）', 'https://news.qq.com/rain/a/20260903A03VEU00', 'developer', 'third-party', 'indexed',
          '报道写明企业认证与个人认证两种方式、个人开发者可开发管理技能 / 专家 / 连接器；属媒体报道，不作为发布权限的正式依据。'),
      ],
    },
    notes: [
      '本机自定义连接器不上市场、无需平台审核，但只在本机生效且需要 UI 信任。',
      '企业私有连接器由企业控制台下发，可见范围与工具权限可过滤，不等于公开市场上架。',
    ],
  },
  {
    id: 'qwenwork',
    label: '千问办公 QwenWork',
    vendor: '阿里 / 钉钉',
    targets: ['qwenwork'],
    localMode: {
      available: true,
      entry: '扩展 → 连接器 → + 添加 → 粘贴 JSON 配置 / 手动填写配置',
      transports: ['streamable-http', 'sse', 'stdio'],
      configPaths: [],
      trustRequired: false,
      loopback: 'unknown',
      note: '官方示例写 type: streamable-http；STDIO 为本地命令行服务。刚开启或关闭连接器后需新建对话任务才生效。客户端能否访问本机 127.0.0.1 未实测。',
      docs: [
        doc('官方《连接器》帮助页', 'https://qwenwork.cn/docs/features/connectors', 'local-config', 'official', 'fetched',
          '粘贴 JSON 配置与手动填写两种入口，Streamable HTTP / SSE / STDIO 三种服务器类型的字段说明。'),
        doc('阿里云《千问办公：扩展》', 'https://www.alibabacloud.com/help/zh/doc-detail/3047919.html', 'market', 'official', 'indexed',
          '扩展市场与企业空间的差别；个人用户当前版本不允许向公共扩展市场上传或发布自定义能力。'),
      ],
    },
    policies: [
      doc('千问办公扩展能力广场服务协议', 'https://terms.alicdn.com/legal-agreement/terms/common_product_agreement/20260920094459914/20260920094459914.html', 'terms', 'official', 'fetched',
        '生效 2026-09-20，本轮抓到第一条至第十四条全文。1.3 把连接器定义为符合 MCP 标准、为 Agent 提供查询/读写/鉴权入口的一组工具；2.5 完成实名或主体认证才提供发布服务；2.6 平台可按能力形态限制发布者主体类型与认证等级；5.1/5.3 审核合规、安全、基本功能可用性且可无理由拒绝；6.3/6.6 要求如实披露连接器鉴权方式、权限范围与数据边界；6.2/6.4 禁止收集账号鉴权凭证、禁止把数据用于训练或广告；12.4 上传者可自主下架；13.1 当前提交、发布、安装、使用均免费。'),
      doc('连接器管理（阿里云官方帮助）', 'https://www.alibabacloud.com/help/zh/doc-detail/3052930.html', 'review', 'official', 'fetched',
        '更新 2026-11-02，抓到全文：管理员可控制公共市场可见性、成员提交与审核；「允许上传个人连接器」当前标记为「即将推出」且暂不能修改；成员提交进入「连接器审核」，状态有待处理/已通过/已拒绝/已取消，通过后发布到组织连接器；连接器键与服务 URL 创建后不可修改。'),
      doc('创建连接器 API（开发者手册）', 'https://help.aliyun.com/zh/qwenwork/connector-management', 'developer', 'official', 'fetched',
        '更新 2026-11-10，抓到全文：`POST /api/openapi/v1/connectors`，必填 `Idempotency-Key`，Scope `admin.v1.connectors.manage`；字段 `server_key`、`transport`(http/stdio)、`auth_type`(key/none/oauth)、`url`、`clients`、`oauth_client_registration`(dcr)、`api_key.header_name` 等。这是企业管理员侧的真实提交接口。'),
      doc('企业旗舰版：连接器', 'https://help.aliyun.com/zh/qwenwork/enterprise-ultimate-ai-assets-connectors', 'developer', 'official', 'fetched',
        '更新 2026-11-03，抓到全文：广场管理区分官方/企业市场与专属/私有市场；新建企业连接器需填基础信息 → 认证与凭据（无认证 / MCP OAuth 2.1 DCR / API Key 用户提供）→ 连接协议并点「校验配置」→ 保存 → 发布策略组；官方连接器仅支持桌面端。'),
      doc('千问开放平台服务协议', 'https://terms.alicdn.com/legal-agreement/terms/b_platform_service_agreement/20260622215132874/20260622215132874.html', 'developer', 'official', 'indexed',
        '入驻资质审核、内容合规审核、功能安全审核；未通过审核的 Agent/Skill 无法发布上线；平台可下架。'),
      doc('千问办公服务协议', 'https://terms.alicdn.com/legal-agreement/terms/b_end_product_protocol/20260708175856831/20260708175856831.html', 'terms', 'official', 'fetched',
        '本轮抓到第一章至第二十章全文，生效日期 2026-10-10（页面未标单独更新日）。与 OpenBot 作为外部能力接入直接相关：1.6 把第三方 API/插件/技能/平台定义为「第三方服务」；3.4(4) 禁止「利用本服务开发、训练、优化、蒸馏、增强或验证与我们存在竞争关系的产品」，3.4(5) 禁止未经书面同意做基准/压力/公开评测；4.2 访问本地文件、API、数据库等一经启用即视为用户本人行为；8.1 要求遵守《千问办公扩展能力广场服务协议》，8.2 平台只提供技术兼容与连接入口、非第三方服务提供者，8.3 第三方协议与安全要求由用户自行审查，8.4 明列恶意代码/提示注入/凭证窃取风险由接入方自担，8.5 API Key / Webhook / 数据库连接信息等接入资源自行取得授权并评估数据流；10.3 数据原则上存于中国境内；7.8 用户内容不用于训练模型。'),
      doc('隐私政策', 'https://terms.alicdn.com/legal-agreement/terms/privacy_policy_full/20260811165222571/20260811165222571.html', 'privacy', 'official', 'indexed', '官方隐私政策全文页。'),
      doc('隐私与安全', 'https://help.aliyun.com/zh/qwenwork/qw-privacy-security', 'privacy', 'official', 'indexed', '产品侧隐私与安全说明。'),
    ],
    marketplace: {
      available: true,
      name: '千问办公扩展能力广场 / 企业连接器广场',
      url: 'https://www.alibabacloud.com/help/zh/doc-detail/3052930.html',
      status: 'not-submitted',
      requirements: [
        '1.3 连接器是符合 MCP 标准、为 Agent 提供查询/读写/鉴权入口的一组工具；三类能力为技能 / 专家套件 / 连接器',
        '2.5 完成实名认证或主体认证才提供发布服务；2.6 平台可按能力形态限制发布者主体类型与认证等级',
        '组织内提交路径：管理员开启「允许成员将连接器添加到组织连接器」→ 成员提交 → 「连接器审核」待处理 → 管理员通过并发布到组织连接器 → 按组织要求启用',
        '必填字段：连接器键（小写字母/数字/连字符，≤128）、服务 URL（完整 http/https，≤1024，创建后不可改）、授权方式（无需授权 / OAuth）、支持的客户端；可选版本、描述、图标（≤2MB）',
        '企业旗舰版还需选认证与凭据（无认证 / MCP OAuth 2.1 DCR / API Key 用户提供）、填连接协议并点「校验配置」，再配置发布策略组',
        'OpenAPI 提交：`POST /api/openapi/v1/connectors`，带 `Idempotency-Key` 与 Scope `admin.v1.connectors.manage`，`transport` 取 http/stdio、`auth_type` 取 key/none/oauth',
        '5.1 审核维度含合规性、安全性、基本功能可用性；5.5 含恶意代码、提示词注入、权限与行为风险检测；5.3 平台可无理由拒绝',
        '6.3 / 6.6 如实说明连接器鉴权方式、权限范围与数据边界；不得要求成员上传共享密码或长期密钥；13.1 当前提交、发布、安装、使用免费',
      ],
      blockers: [
        '公共市场个人上传在管理后台标记为「即将推出」且暂不能修改，当前没有个人向公共扩展市场提交连接器的入口',
        '组织内提交需要企业管理员权限、企业部署的 BASE_URL 与 `admin.v1.connectors.manage` scope，本机不具备这些条件',
        '连接器键与服务 URL 创建后不可修改，必须先确定公网生产地址；OpenBot 目前只有 127.0.0.1 端点，没有公网 HTTPS MCP Server',
        '2.6 允许平台按能力形态限制发布者主体类型，个人开发者能否作为连接器发布者以后台提交页面公示为准',
        '6.2 / 6.4 禁止收集账号鉴权凭证、禁止把能力数据用于模型训练或广告；现有 stdio 形态使用桌面 owner token，需按数据边界重做认证',
      ],
      docs: [
        doc('扩展能力广场服务协议', 'https://terms.alicdn.com/legal-agreement/terms/common_product_agreement/20260920094459914/20260920094459914.html', 'review', 'official', 'fetched', '本轮抓到全文：定义、准入、审核、下架、数据合规与商业化条款。'),
        doc('连接器管理', 'https://www.alibabacloud.com/help/zh/doc-detail/3052930.html', 'review', 'official', 'fetched', '组织内提交、审核状态机、字段规则与个人上传「即将推出」的官方依据。'),
        doc('创建连接器 API', 'https://help.aliyun.com/zh/qwenwork/connector-management', 'review', 'official', 'fetched', '官方 OpenAPI 创建接口与字段清单，提交动作可直接映射到请求体。'),
        doc('企业旗舰版：连接器', 'https://help.aliyun.com/zh/qwenwork/enterprise-ultimate-ai-assets-connectors', 'review', 'official', 'fetched', '新建企业连接器、OAuth 2.1 DCR、校验配置与发布策略组的官方步骤。'),
        doc('阿里云《千问办公：扩展》', 'https://www.alibabacloud.com/help/zh/doc-detail/3047919.html', 'market', 'official', 'indexed', '企业空间与公共市场的边界。'),
      ],
    },
    notes: [
      '官方连接器文档里的 JSON 示例使用 `streamable-http`，与 WorkBuddy 的 `streamableHttp` 不同。',
      '官方文档区分「公共连接器市场」与「组织/企业连接器」：个人上传标记「即将推出」，企业提交走「连接器审核」，通过只发布到组织内，不等于公开上架。',
      '本轮纠正：上一轮写成「未找到连接器类目公开提交规范」是错的——官方有连接器管理、企业旗舰版步骤与 OpenAPI 创建接口，只是公共市场个人通道尚未开放。',
    ],
  },
  {
    id: 'doubao-work',
    label: '豆包工作',
    vendor: '字节跳动',
    targets: ['doubao-work'],
    localMode: {
      available: true,
      entry: '插件·技能·伙伴 → 连接器 → + 新建自定义连接器',
      transports: ['HTTP（Streamable HTTP）', 'STDIO（本地电脑运行时）'],
      configPaths: [],
      trustRequired: false,
      loopback: 'unknown',
      note: '自定义连接器仅支持在本地电脑客户端中使用；表单字段为服务器名称 / 传输类型 / 服务器 URL / 自定义 Headers，保存后可能还需 OAuth 授权。未见官方 JSON 导入说明。',
      docs: [
        doc('飞书帮助中心《在飞书中使用豆包工作》', 'https://www.feishu.cn/hc/zh-CN/articles/282796994123-%E5%9C%A8%E9%A3%9E%E4%B9%A6%E4%B8%AD%E4%BD%BF%E7%94%A8%E8%B1%86%E5%8C%85%E5%B7%A5%E4%BD%9C', 'local-config', 'official', 'indexed',
          '官方产品帮助文档，写明 + 添加 → 新建自定义连接器需填写服务器名称、服务器 URL 等信息。'),
        doc('自定义连接器表单截图与步骤（第三方教程）', 'http://mp.weixin.qq.com/s?__biz=MzkxNDI3NjUwNQ==&mid=2247488740&idx=1&sn=dd2752b2bef90adb4809cb2cd3435cf6', 'local-config', 'third-party', 'tutorial',
          '表单里明确「自定义连接器仅支持在本地电脑中使用」，并展示 HTTP / 服务器 URL / 自定义 Headers 与授权步骤；不是官方规范。'),
        doc('豆包工作自定义 MCP 接入教程（第三方）', 'https://www.idcspy.net/32442.html', 'local-config', 'third-party', 'tutorial', '第三方格式依据，用于交叉印证表单字段。'),
      ],
    },
    policies: [
      doc('豆包用户协议', 'https://www.doubao.com/legal/terms', 'terms', 'official', 'fetched',
        '更新 2026-09-10 / 生效 2026-09-17；适用范围明确包含豆包工作客户端；2.2 写明生成内容仅供参考、不得作为专业建议或商业用途，需评估对 Bot 输出商业化场景的影响。'),
      doc('豆包隐私政策', 'https://www.doubao.com/legal/privacy', 'privacy', 'official', 'fetched',
        '本轮抓到全文：更新 2026-09-10 / 生效 2026-09-17；明确「豆包客户端、豆包工作客户端」若关联版本无独立隐私政策则适用本政策，有独立政策则同时适用且以特定版本为准；第 3 章「数据使用过程中涉及的合作方以及转移、公开个人信息」按合法/正当最小必要/安全审慎三原则处理合作方数据，区分委托处理、共同处理、第三方信息共享清单，并说明合作方可使用必要的设备、账号及日志信息。'),
      doc('豆包开放平台', 'https://open.doubao.com/', 'developer', 'official', 'indexed',
        '页面写明「平台正在内测，欢迎提交入驻意向」，不提供公开自助注册。'),
      doc('技能接入指南（登录后可见）', 'https://open.doubao.com/document/doubao-developer-guide/skill-integration-guide', 'review', 'official', 'indexed',
        '本轮直接抓取只返回「开发文档 · 豆包开放平台 → 登录」壳，正文来自搜索索引，属于登录/入驻后才可见的文档。「技能与连接器的关系」原文：连接器负责把外部系统、数据和业务动作接入豆包；外部 API 不应直接暴露在技能中，应通过豆包认可的连接器或已注册工具接入，并按平台要求完成鉴权、权限和安全验证。另含企业资质认证、ZIP 包自动校验、测试商店验收、统一发版与状态机。'),
      doc('豆包工作服务商连接器（第三方实操）', 'https://apibobo.com/content/posts/doubao-work-connectors-mcp-guide', 'market', 'third-party', 'tutorial',
        '第三方教程提到「豆包工作对服务商的规范」与「官方连接器库」，服务商版本需 Streamable HTTP + OAuth + 动态注册，上架后用户点授权即可用；未经官方证实，不作为提交依据，但说明服务商通道确实存在。'),
      doc('豆包工作本地 STDIO 连接器（第三方实操）', 'http://mediaclaw.app/en/features/doubao-integration', 'local-config', 'third-party', 'tutorial',
        '第三方教程给出完整本地步骤：新建自定义连接器可填 STDIO 的 command / args / env，保存后需确认开关打开、完成设备配对批准，并用真实 tool call 验证；不是官方规范。'),
    ],
    marketplace: {
      available: true,
      name: '豆包「技能·连接器·伙伴」市场 / 豆包开放平台（内测邀请制）',
      url: 'https://open.doubao.com/',
      status: 'not-submitted',
      requirements: [
        '开放平台内测：先在 open.doubao.com 提交入驻意向，等平台联系后开通控制台；没有公开自助注册',
        '完成企业资质认证，按登录后可见的《平台准入要求》与《技能开发规范》制作能力包（ZIP，含名称 / 简介 / 图标 / 版本号）',
        '连接器须是「豆包认可的连接器或已注册工具」；外部 API 不得直接暴露在技能中，须按平台要求完成鉴权、权限与安全验证',
        '平台自动校验包结构 / 内容 / 许可证 → 提交审核 → 平台运营在测试商店验收 → 统一发版 → 状态改为「已上架」；版本状态含草稿 / 审核中 / 已拒绝 / 已上线 / 已下架',
        '服务商通道按第三方实操需 Streamable HTTP + OAuth + 动态注册，上架到官方连接器库后用户点授权即可用；该口径需入驻后向平台核实',
      ],
      blockers: [
        '接入规范不是不存在，而是不对外公开：技能接入指南直接抓取返回「登录」壳，服务商连接器类目的提交入口与审核标准需入驻内测后才可见',
        '没有公开自助注册与提交后台，无法在未获平台联系的情况下自行提交',
        '企业资质认证是技能上架的明确前提，连接器是否同口径未明确；控制台也没有开发者自行下架入口',
        '本机没有公网 HTTPS MCP Server 与 OAuth / 动态注册，第三方实操提到的服务商形态尚未实现',
      ],
      docs: [
        doc('豆包开放平台首页', 'https://open.doubao.com/', 'market', 'official', 'indexed', '「平台正在内测，欢迎提交入驻意向」与入驻意向入口。'),
        doc('技能接入指南（登录后可见）', 'https://open.doubao.com/document/doubao-developer-guide/skill-integration-guide', 'review', 'official', 'indexed',
          '本轮直接抓取返回登录壳，正文来自搜索索引；含技能/版本状态机、企业认证、测试商店验收、统一发版，以及「连接器负责接入外部系统、外部 API 不直接暴露在技能中」的口径。'),
        doc('豆包工作服务商连接器（第三方实操）', 'https://apibobo.com/content/posts/doubao-work-connectors-mcp-guide', 'market', 'third-party', 'tutorial',
          '第三方教程提到服务商规范、官方连接器库与 Streamable HTTP + OAuth + 动态注册；未经官方证实，只用于证明通道存在。'),
        doc('火山引擎《MCP》文档（营销 Agent 控制台）', 'https://volcengine.com/docs/data-agent/mcp?lang=zh', 'market', 'official', 'indexed',
          '官方但属于营销 Agent 控制台的 MCP Server 注册流程（域名 / 端口 / 请求头 / Tools 上传 Swagger），不是豆包工作连接器类目的上架规范，不能混用。'),
        doc('第三方连接器目录的豆包提交说明', 'https://connector.zone/connectors/io-omfang-manifest/install/doubao', 'market', 'third-party', 'tutorial',
          '称需在火山引擎插件开发者控制台注册公网 HTTPS MCP 并走审核；第三方 registry 说明，未经官方证实。'),
      ],
    },
    notes: [
      '本地自定义连接器与服务商上架是两回事：前者只在本地电脑，后者需入驻内测、企业认证与平台审核。',
      '本轮纠正：连接器规范不是「没找到」，而是内测邀请制、登录后可见；第三方实操显示服务商通道需要 Streamable HTTP + OAuth + 动态注册。',
      '表单字段来自官方帮助文档与第三方教程交叉印证，未见官方 JSON 配置导入说明。',
    ],
  },
  {
    id: 'chatgpt-codex',
    label: 'ChatGPT 桌面 / Codex CLI / IDE 扩展',
    vendor: 'OpenAI',
    targets: ['codex', 'codex-stdio'],
    localMode: {
      available: true,
      entry: 'ChatGPT 桌面 设置 → MCP servers，或 ~/.codex/config.toml 的 [mcp_servers.openbot]',
      transports: ['stdio', 'streamable-http'],
      configPaths: ['~/.codex/config.toml', '.codex/config.toml（项目级，仅受信任项目）'],
      trustRequired: false,
      loopback: 'yes',
      note: 'ChatGPT 桌面、Codex CLI、IDE 扩展共用同一份 config.toml；ChatGPT 网页版不读取本地配置，只能用插件提供的远程 MCP 工具。',
      docs: [
        doc('Model Context Protocol（Codex 官方文档）', 'https://learn.chatgpt.com/docs/extend/mcp', 'local-config', 'official', 'indexed',
          'STDIO / Streamable HTTP、Bearer token、OAuth、config.toml 字段与桌面 UI 入口。'),
        doc('模型上下文协议（官方中文镜像）', 'https://developers.openai.ac.cn/codex/extend/mcp', 'local-config', 'official', 'fetched',
          '取到完整 config.toml 字段：url / bearer_token_env_var / http_headers / env_http_headers / command / args / env。'),
        doc('Docs MCP（官方示例）', 'https://platform.openai.com/docs/docs-mcp', 'local-config', 'official', 'indexed',
          '给出 `codex mcp add`、`codex mcp list` 与 [mcp_servers.*] 的最小示例。'),
      ],
    },
    policies: [
      doc('条款与政策总览', 'https://openai.com/zh-Hans-CN/policies/', 'terms', 'official', 'fetched', '官方政策索引页，逐条链接已核对。'),
      doc('App Developer Terms（连接器与操作条款）', 'https://openai.com/policies/developer-apps-terms/', 'developer', 'official', 'fetched',
        '更新 2026-09-28；明确覆盖 custom connectors 与经 MCP server 暴露的 API；1.2 限定请求数据处理目的，2.1/2.3 要求安全措施与事先隐私告知，7.1 提交时须保证合规。Service terms 第 5/7 节指向的规范路径是 /policies/connectors-actions-terms/，本轮另核该页同样返回 App Developer Terms 正文，两条 URL 并列登记。'),
      doc('App Developer Terms（Service terms 引用的规范路径）', 'https://openai.com/policies/connectors-actions-terms/', 'developer', 'official', 'fetched',
        '本轮抓到全文，Updated: September 28, 2026，不是 404/403。原文适用范围含「custom apps, connectors, plugins, and actions」，并明列「custom connectors created in ChatGPT developer mode」；把「your API or to another service that exposes an API, including via an MCP server」定义为 API。这是 bot-as-MCP 在 ChatGPT 侧最直接的开发者条款依据。'),
      doc('使用政策', 'https://openai.com/policies/usage-policies/', 'usage', 'official', 'fetched',
        '本轮抓到全文：页面标 Effective: November 20, 2026，Changelog 最近条目 2026-10-21（即按 2026-11-11 计尚未生效，提交前须按生效版本重核）。原文「If you operate a model-access intermediary platform or other service that enables third parties to directly access OpenAI models, you must obtain our prior review and approval. This requirement does not apply solely because an application integrates OpenAI models to power its features or functionality.」另禁止敏感领域无人工审查的高风险行动自动化，并限制用输出训练替代模型；正文没有专门的 connectors 条款。'),
      doc('隐私政策', 'https://openai.com/policies/privacy-policy/', 'privacy', 'official', 'indexed', '官方隐私政策。'),
      doc('服务条款', 'https://openai.com/policies/service-terms/', 'terms', 'official', 'fetched',
        '本轮抓到全文：Updated: November 10, 2026（页面未给单独生效日）。第 7 节 Apps and Actions 原文「Apps and Actions…allow ChatGPT to send and receive information from a third-party application or website」，「Any custom App is subject to our App Developer Terms」，启用 App 即授权把部分 Content 与国家/州等 App Data 发给第三方 Application，OpenAI 对第三方接收后的 App Data 不负责；第 5 节 GPTs/Actions 也要求每个 Action 遵守 App Developer Terms；第 4 节提示 Codex 输出可能受第三方/开源许可证约束；第 2 节 Beta Services 按 as-is 且排除赔偿。'),
      doc('数据处理附录', 'https://openai.com/policies/data-processing-addendum/', 'data', 'official', 'indexed', '个人数据处理附录。'),
      doc('使用条款', 'https://openai.com/policies/terms-of-use/', 'terms', 'official', 'indexed', '个人用户条款，生效 2026-01-01。'),
    ],
    marketplace: {
      available: true,
      name: 'ChatGPT App Directory / 插件目录',
      url: 'https://chatgpt.com/apps',
      status: 'not-submitted',
      requirements: [
        '组织角色需具备 plugin submission write access（Platform 里标为 Apps Management）',
        '提交内容包含 MCP 连接信息、测试指南、目录元数据、国家/地区可用性、隐私政策',
        '需提供公网可达 HTTPS 的 /mcp 端点；工具需正确的 readOnlyHint / openWorldHint / destructiveHint 注解',
        '遵守 App Submission Guidelines、Usage Policies，内容适合所有受众；写操作按需引入 OAuth 2.1',
        '经平台扫描工具元数据、审核与批准后发布，更新需重新提交',
      ],
      blockers: [
        '当前 OpenBot 只有本机 127.0.0.1:4818 端点，没有公网 HTTPS /mcp，也没有 OAuth 与多用户隔离',
        '工具定义与注解尚未按 Apps SDK 规范改造，仍以异步 job 语义（submit → task → result）为主',
        '未准备目录元数据、测试指南、国家/地区设置与隐私政策页面',
      ],
      docs: [
        doc('Plugin guidelines（App Submission Guidelines）', 'https://developers.openai.com/apps-sdk/app-submission-guidelines', 'review', 'official', 'indexed',
          '目的与原创性、质量、工具命名与描述、注解、最小输入、可审计行为等发布最低标准。本轮直接抓取返回 HTTP 403 Forbidden（页面正文只有 Forbidden 与请求追踪号），不是「没有规范」而是「当前抓取通道被拒」；提交前须用已登录的开发者账号复核，不得把索引摘要当全文。'),
        doc('Submit plugins', 'https://help.openai.com/en/articles/20001040-submitting-apps-to-the-chatgpt-app-directory', 'review', 'official', 'indexed',
          '提交流程、组织角色权限、portal 扫描 MCP Server 与工具元数据。'),
        doc('Developers can now submit apps to ChatGPT', 'https://openai.com/blog/developers-can-now-submit-apps-to-chatgpt', 'market', 'official', 'indexed',
          '官方公告：提交包含 MCP 连接信息、测试指南、目录元数据与国家/地区设置；必须附清晰隐私政策。'),
        doc('Build an MCP server', 'https://developers.openai.com/apps-sdk/build/mcp-server', 'developer', 'official', 'indexed', '工具 schema、outputSchema、注解、instructions 与 structuredContent 规范。'),
        doc('ChatGPT 应用目录', 'https://chatgpt.com/apps', 'market', 'official', 'indexed',
          '官方公告明确给出的用户侧目录入口，可从工具菜单或直接访问。'),
        doc('开发者平台提交入口', 'https://platform.openai.com/apps-manage', 'market', 'official', 'indexed',
          'OpenAI 开发者社区帖给出的提交后台地址；需登录组织账号并具备 Apps Management 权限，提交前以后台实际入口为准。'),
        doc('ChatGPT 中的应用（帮助中心）', 'https://help.openai.com/zh-hans-cn/articles/9309188-connected-apps-on-chatgpt', 'market', 'official', 'indexed',
          '应用目录、工作空间管理员控制、自定义应用与提交到目录的官方帮助说明。'),
      ],
    },
    notes: [
      '本地 config.toml 与网页版插件是两条独立路径：网页版不读本机配置。',
      'App Developer Terms 把「经 MCP server 暴露的 API」纳入适用范围，bot-as-MCP 上架不是纯技术问题。',
    ],
  },
  {
    id: 'cursor',
    label: 'Cursor',
    vendor: 'Anysphere',
    targets: ['cursor'],
    localMode: {
      available: true,
      entry: '~/.cursor/mcp.json（全局）或 .cursor/mcp.json（项目级），也可 Customize → MCPs',
      transports: ['stdio', 'sse', 'streamable-http'],
      configPaths: ['~/.cursor/mcp.json', '.cursor/mcp.json'],
      trustRequired: false,
      loopback: 'yes',
      note: '全局与项目级配置合并，同名服务器项目级优先；远程服务器用 url + headers，需要重启 Cursor 生效。',
      docs: [
        doc('Model Context Protocol (MCP)', 'https://cursor.com/docs/context/mcp', 'local-config', 'official', 'fetched',
          '本轮抓到全文：三种传输 stdio / SSE / Streamable HTTP；远程示例只写 url + headers（不写 type），STDIO 示例只写 command / args / env；但「STDIO server configuration」字段表把 type 标为必填且值为 "stdio"——官方页自身示例与字段表不一致，本机 ~/.cursor/mcp.json 按示例不写 type，仍需 UI 复核，不能据字段表擅自改配置。另含静态 OAuth 的 auth.CLIENT_ID / CLIENT_SECRET / scopes、固定回调 https://www.cursor.com/agents/mcp/oauth/callback 与 http://localhost:8787/callback、${env:NAME} 插值、项目级 .cursor/mcp.json 与全局 ~/.cursor/mcp.json、OAuth 2.0 授权码 + PKCE + DCR（RFC 9728 / RFC 8707）、企业 MCP Allowlist 与工具审批。'),
        doc('MCP integrations', 'https://cursor.com/help/customization/mcp', 'local-config', 'official', 'indexed',
          '一键安装 / 手动安装、全局与项目级文件、工具审批与排错。'),
      ],
    },
    policies: [
      doc('Cursor 隐私政策', 'https://cursor.com/privacy', 'privacy', 'official', 'fetched',
        '本轮抓到全文，Last updated November 6, 2026。第 3 节 How we share personal data 明确「Third-Party Services and Integrations」：与第三方网站/应用/服务集成时，用户选择交互即可能把个人数据直接披露给第三方并受其自身条款与隐私政策约束，Cursor 的链接或集成不代表背书或关联；另列 Business Account Administrators、用户主动共享的 Inputs/Suggestions、经同意的披露与 trust.cursor.com/subprocessors 子处理者名单。'),
      doc('Cursor 服务条款', 'https://cursor.com/terms-of-service', 'terms', 'official', 'fetched',
        '本轮抓到中文正文：Anysphere, Inc. 的访问与使用、内容、模型训练、可接受使用政策等条款；URL 已核实，不再是推测路径。'),
      doc('Cursor 应用市场发布者条款', 'https://cursor.com/marketplace-publisher-terms', 'review', 'official', 'fetched',
        'Last updated 2026-05-06，本轮抓到全文：2.1 在 /marketplace/publish 提交申请、更新走 request re-index 而非重复申请；2.2 核验发布者身份与业务合法性并审查代码，可无理由拒绝且不说明理由；2.3 上线后随时可复审；3.1 市场插件必须免费提供，不得直接或间接收费；6.3 不得用 Plugin Data / User Content 训练 AI 模型；7.1 可随时下架。'),
      doc('Data Processing Addendum', 'https://www.cursor.com/terms/dpa', 'data', 'official', 'fetched',
        'Last updated 2025-11-05；Anysphere 作为 Vendor/processor，含 01–13 条与 ANNEX 1–3，第 10 条要求数据泄露 48 小时内书面通知。'),
      doc('Security and compliance documents', 'https://cursor.com/help/security-and-privacy/compliance', 'data', 'official', 'fetched',
        '官方列出的 DPA 短链 cursor.com/dpa、MSA 短链 cursor.com/msa，以及 Trust Center 资料申请路径。'),
      doc('Trust Center', 'https://trust.cursor.com/', 'data', 'official', 'indexed',
        '列出 Cursor DPA / Privacy / TOS 与 SOC 2、ISO 证书；本轮从官方帮助页与 /terms/dpa 正文确认真实 URL，不再拼 Trust Center 内部链接。'),
      doc('Privacy and Data Governance', 'https://cursor.com/docs/enterprise/privacy-and-data-governance', 'data', 'official', 'indexed', '数据流、Privacy Mode、数据驻留与加密说明。'),
    ],
    marketplace: {
      available: true,
      name: 'Cursor Marketplace（插件 / MCP servers）',
      url: 'https://cursor.com/marketplace',
      status: 'not-submitted',
      requirements: [
        '在 cursor.com/marketplace/publish 提交公开 Git 仓库链接（需登录），遵守《Cursor 应用市场发布者条款》；更新已上架插件走 request re-index',
        '插件需有效清单：根 plugin.json 或 .cursor-plugin/plugin.json；多插件仓库需 .cursor-plugin/marketplace.json',
        '名称全局唯一、小写 kebab-case；描述清楚；组件文件与 frontmatter 合法；清单内路径均为相对路径（无 ..、无绝对路径）',
        '插件必须开源、本地测试通过、提供 README.md 与 logo；mcp.json 里的每个 ${VAR} 都要在 variables schema 声明，仓库内不得放密钥',
        'Cursor 团队对每个插件及每次更新做安全/数据处理/质量人工审查；更新通过后重新索引',
        '发布者条款 3.1：市场插件必须免费向用户提供，不得直接或间接收费；6.3：不得用 Plugin Data / User Content 训练 AI 模型',
      ],
      blockers: [
        '现有 OpenBot MCP 依赖本机桌面与 127.0.0.1:4818，没有可公开访问的远程 MCP Server，也没有公开 Git 仓库与插件清单',
        '市场上架的是「插件包」，不是本机 mcp.json；两者不能互相替代',
        '发布者条款 2.2 写明审查与批准完全由 Anysphere 自行决定且不说明理由；3.1 的免费要求与 OpenBot 若走收费 Bot 能力的变现路径直接冲突，上架前须先确定商业模式',
      ],
      docs: [
        doc('Cursor 应用市场发布者条款', 'https://cursor.com/marketplace-publisher-terms', 'review', 'official', 'fetched',
          '提交、审查、批准、持续复审、免费分发与数据使用限制的正式条款。'),
        doc('提交入口', 'https://cursor.com/marketplace/publish', 'market', 'official', 'fetched',
          '发布者条款 2.1 指定的申请页；本轮直接打开只显示「You need to be signed in to submit a plugin publisher application」，需登录。'),
        doc('Plugins reference（官方）', 'https://cursor.com/docs/reference/plugins', 'review', 'official', 'fetched',
          '本轮抓到全文：清单字段、公开 Git 仓库、提交仓库链接三步与 11 项 submission checklist、variables schema 与 ${VAR} 声明要求；已替换上一轮引用的第三方镜像。'),
        doc('Plugins（官方）', 'https://cursor.com/docs/plugins', 'market', 'official', 'indexed',
          '插件以 Git 仓库分发、由 Cursor 团队逐个人工审查后上架；团队市场与公开市场是不同路径。'),
        doc('MCP integrations', 'https://cursor.com/help/customization/mcp', 'market', 'official', 'indexed',
          '市场一键安装、团队分发与社区目录 cursor.directory 的区别。'),
      ],
    },
    notes: [
      'Cursor 远程 MCP 配置不写 type 字段；只有 SSE 端点才显式写 type: "sse"。',
      '上一轮把 Cursor 市场写成「未找到公开提交规范」是错的：官方有发布者条款、Plugins reference 与 /marketplace/publish 提交入口，本轮已更正。',
      '市场收的是开源插件包（含 mcpServers），本地 mcp.json 只在自己电脑上生效。',
      '发布者条款 3.1 要求免费、6.3 禁止用插件数据训练模型，这两条是商业化约束，不是技术检查项。',
    ],
  },
  {
    id: 'claude',
    label: 'Claude / Claude Desktop',
    vendor: 'Anthropic',
    targets: ['claude-desktop'],
    localMode: {
      available: true,
      entry: 'Claude Desktop → Settings → Developer → Edit Config → claude_desktop_config.json',
      transports: ['stdio（本地）', 'remote MCP（自定义连接器，需公网可达）'],
      configPaths: ['~/Library/Application Support/Claude/claude_desktop_config.json'],
      trustRequired: false,
      loopback: 'unknown',
      note: '本地 STDIO 服务器走本机网络；远程自定义连接器由 Anthropic 云端发起连接，127.0.0.1 / 内网 / VPN 后的服务器一律连不上，Cowork 与 claude.ai 也看不到本机 STDIO 配置。',
      docs: [
        doc('Get started with custom connectors using remote MCP', 'https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp', 'local-config', 'official', 'indexed',
          '远程连接器必须公网可达；Team/Enterprise 由 Owner 添加；Free 用户限一个自定义连接器。'),
        doc('Get started with MCP Apps', 'https://claude.com/docs/connectors/building/mcp-apps/getting-started', 'local-config', 'official', 'indexed',
          'Claude Desktop 通过配置文件用 command + args 启动本地 MCP 示例服务器。'),
      ],
    },
    policies: [
      doc('Legal center', 'https://www.anthropic.com/legal', 'terms', 'official', 'fetched',
        '本轮抓到完整条目与链接，逐条核对了 Consumer / Commercial Terms、隐私、使用政策、DPA 的真实路径。'),
      doc('Consumer Terms of Service', 'https://www.anthropic.com/legal/consumer-terms', 'terms', 'official', 'indexed', 'Free / Pro / Max 个人用户条款。'),
      doc('Commercial Terms of Service', 'https://www.anthropic.com/legal/commercial-terms', 'terms', 'official', 'indexed', 'API 与 Team / Enterprise 商业条款。'),
      doc('Privacy Policy（2026-09-10）', 'https://www.anthropic.com/legal/privacy', 'privacy', 'official', 'indexed', 'Legal center 列出的真实路径，已核对。'),
      doc('Usage Policy（2026-11-12 生效）', 'https://www.anthropic.com/legal/aup', 'usage', 'official', 'fetched',
        '本轮抓到全文：页面只写 Effective Nov 12, 2026（无单独最后更新日），按 2026-11-11 计尚未生效，提交前须按生效版复核。上一轮按惯例拼的 /legal/usage-policy 是错的，Legal center 真实路径是 /legal/aup。适用范围覆盖 API/开发者平台、云与授权经销商客户及「end users of products or services integrating Claude」；原文「Agentic use cases must comply with the Usage Policy. Users are responsible for ensuring that agents they build or deploy, including actions those agents take through tools, browsers, or connected systems, comply with this Usage Policy.」；「Resell, proxy, or otherwise provide access to Claude through unauthorized means」被禁止；「Software listed in our Directories must comply with our Software Directory Policy」；面向外部用户的 chatbot / AI agent 必须披露 AI 身份；禁止未经授权用输出训练模型。'),
      doc('Data Processing Addendum', 'https://www.anthropic.com/legal/data-processing-addendum', 'data', 'official', 'fetched',
        '本轮抓到全文：Effective Feb 24, 2025，Audience: Business，页面未标单独更新日；上一轮写的 /legal/dpa 是错的，真实路径是 /legal/data-processing-addendum。Customer 为 controller、Anthropic 为 processor，仅按客户书面指示为提供/维护 Services 处理；子处理者采用「概括授权 + 新增前合理通知 + 15 日异议期 + 逾期视为同意」；跨境以 EU SCCs Module Two/Three + UK Addendum + Swiss Addendum 为基础，冲突优先级 SCCs > DPA > Agreement；终止后 30 天内删除 Customer Data（法定/争议/滥用对抗保留除外）。本页没有第三方连接器专章，集成数据流需另看 Agreement 与产品条款。'),
      doc('Service Specific Terms', 'https://www.anthropic.com/legal/service-specific-terms', 'terms', 'official', 'indexed', '特定产品与功能的附加条款。'),
      doc('Anthropic Software Directory Terms', 'https://support.claude.com/en/articles/13145338-anthropic-software-directory-terms', 'developer', 'official', 'fetched',
        '本轮抓到全文，页面列示 March 16, 2026（未标明是生效日还是更新日）：提交者承担权利、合规、隐私政策、持续安全与赔偿责任；Anthropic 可无理由拒绝收录或随时移除、可使用并共享 functional metadata，条款可无事先通知修改。'),
      doc('Anthropic Software Directory Policy', 'https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy', 'review', 'official', 'fetched',
        '本轮抓到全文：禁止收集无关对话数据、访问 Claude memory / 聊天历史 / 对话摘要 / 用户文件；工具描述必须窄而准确、无隐藏或动态拉取的指令；MCP 工具名 ≤64 字符、必须带 title / readOnlyHint / destructiveHint；需测试账号与至少 3 个可运行用例；持续审核与重大变更重新审核。'),
    ],
    marketplace: {
      available: true,
      name: 'Claude Connectors Directory（连接器与插件目录）',
      url: 'https://claude.com/connectors',
      status: 'not-submitted',
      requirements: [
        '在开发者后台 claude.ai/directory/manage 选 Submit new → MCP connector；任何付费 Claude 套餐均可提交（Free 不可），Team / Enterprise 由 Owner 提交',
        '只接受远程 HTTPS MCP Server；本地 MCPB / 桌面扩展已 deprecated 且不再单独受理，本地服务器必须打包进 plugin',
        '认证服务用 OAuth 2.0（回调 https://claude.ai/api/mcp/auth_callback），公开数据可免认证',
        '每个工具都要 title 与 readOnlyHint / destructiveHint 注解；工具名 ≤64 字符、描述窄而准确且与功能一致，不得含隐藏指令或诱导跨软件调用',
        '提交材料：文档 URL、隐私政策 URL、支持联系人、图标、文档说明，以及给审核用的**填充好数据的测试账号**',
        '先在 Claude 里作为自定义连接器逐个调用测试；遵守 Anthropic Software Directory Terms 与 Directory Policy（两条官方地址已核实并抓到正文）',
        'portal 十步含 Listing / Use cases / Company / Data handling / Test & launch / Compliance，七项 Compliance 确认全部必填；URL slug 发布后永久不可变',
        'Directory Policy 还要求带样例数据的标准测试账号、至少 3 个可运行 prompts / use cases，并禁止采集无关对话数据或访问 Claude memory / 聊天历史 / 用户上传文件',
        '提交后自动策略扫描，默认列为 Community；Multiple URLs / URL pattern 的 listing 只有拿到 Verified label 才能发布',
      ],
      blockers: [
        '远程连接器从 Anthropic 云端发起，OpenBot 当前的 127.0.0.1:4818 端点不可达；本地 STDIO 配置不能单独进目录',
        '现有 6 个工具没有 title / readOnlyHint / destructiveHint 注解，且是异步 job 语义；Directory Policy 把工具描述当安全边界，需整体重写',
        '没有公网 HTTPS MCP Server、OAuth 2.0、隐私政策 URL、测试账号与目录图标',
        'Directory Terms 要求提交者承担赔偿与持续安全维护义务，Anthropic 可无理由移除 listing；主体与永久 slug 需先确定',
      ],
      docs: [
        doc('Submit a connector to the directory', 'https://claude.com/docs/connectors/building/submission', 'review', 'official', 'fetched',
          '本轮抓到全文：付费账号资格、远程 HTTPS、OAuth 2.0、工具注解、隐私政策、测试账号、portal 十步、七项 Compliance 确认与 Community / Verified 差异。'),
        doc('开发者后台提交入口', 'https://claude.ai/directory/manage', 'market', 'official', 'indexed',
          '官方提交文档指定的 Submit new → MCP connector 入口，需登录付费 Claude 账号。'),
        doc('Anthropic Software Directory Terms', 'https://support.claude.com/en/articles/13145338-anthropic-software-directory-terms', 'review', 'official', 'fetched',
          '官方提交文档直接给出的目录条款地址，本轮抓到正文；上一轮写的「独立 URL 未核实」已更正。'),
        doc('Anthropic Software Directory Policy', 'https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy', 'review', 'official', 'fetched',
          '官方提交文档直接给出的目录政策地址，本轮抓到正文；安全、隐私、工具描述与 MCP 附加要求以此为准。'),
        doc('Connectors Directory', 'https://claude.com/marketplace/connectors-plugins', 'market', 'official', 'indexed',
          '用户侧目录页，条目带 Verified / Community 标签。'),
        doc('Get started with connectors', 'https://claude.com/docs/connectors/getting-started', 'market', 'official', 'indexed',
          '目录、自定义连接器、组织权限与工具开关的官方说明。'),
        doc('Get started with custom connectors using remote MCP', 'https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp', 'market', 'official', 'indexed',
          '自定义连接器与目录条目的区别、网络要求与组织权限。'),
      ],
    },
    notes: [
      '本地 STDIO 能用不等于远程连接器能用：后者要求公网可达，这是与 WorkBuddy / Codex / Cursor 最大的差异。',
      '上一轮把 Claude 目录写成「未找到公开提交规范」是错的：官方有 submission 文档与开发者后台，本轮已更正。',
      '上一轮按惯例拼的 /legal/usage-policy、/legal/dpa 两个 URL 是错的，已按 Legal center 改成 /legal/aup 与 /legal/data-processing-addendum。',
      '上一轮写「Directory Terms / Policy 独立 URL 未核实」也已更正：官方提交文档给出两条 support.claude.com 地址，本轮均抓到正文。',
    ],
  },
  {
    id: 'zcode',
    label: 'ZCode',
    vendor: 'Z.ai（zcode.z.ai / zai-org）',
    targets: ['zcode', 'zcode-stdio'],
    localMode: {
      available: true,
      entry: '~/.zcode/cli/config.json 的 mcp.servers，或 设置 → MCP 表单（设置面板写入永远落在 .zcode）',
      transports: ['stdio', 'http', 'sse'],
      configPaths: ['~/.zcode/cli/config.json', '<repo>/.zcode/config.json', '~/.agents/mcp.json（同作用域回退，顶层 mcpServers 键）'],
      trustRequired: false,
      loopback: 'yes',
      note: '用户/工作区/插件/环境/CLI 全部作用域的 MCP 服务在会话启动时自动连接，无需逐个信任；同名服务用户配置覆盖工作区；某作用域的 .zcode 里只要读到任何 MCP 服务，同作用域 .agents/mcp.json 就被整体跳过；配置文件 schema 严格，未知键整条服务被丢弃；配置文件不展开 ${...} 模板（模板展开是插件自带 MCP 才有的能力）。',
      docs: [
        doc('MCP（官方文档）', 'https://zcode.z.ai/cn/docs/mcp-services', 'local-config', 'official', 'fetched',
          '本轮抓到正文：用户级 ~/.zcode/cli/config.json 与工作区级 <项目根>/.zcode/config.json 都用嵌套 mcp.servers 键；~/.agents/mcp.json 是同作用域回退且用顶层 mcpServers；stdio 示例字段 command / args / env；HTTP/SSE 填服务地址与可选请求头（如 Authorization）；工作区服务与用户级一样自动连接；OAuth 仅适用 HTTP/SSE 远程服务，本地服务经环境变量传凭据；面板写入永远落在 .zcode；停用写 enable: false。'),
        doc('MCP 配置诊断（官方 zcode-guide 插件随附文档）', '~/.zcode/cli/plugins/cache/zcode-plugins-official/zcode-guide/0.3.0/skills/diagnosing-mcp/SKILL.md', 'local-config', 'official', 'sample',
          '本机官方插件随附正文：schema 严格、未知键整条服务被丢弃；模板 ${...} 只对插件自带 MCP 展开，配置文件不展开、须写绝对路径；建议配置文件用规范字段（env / headers / enabled / type: "http"），legacy 形态（remote / environment / enable / http_headers）由 CLI 读取时自动迁移；默认超时 30000ms，可加 timeoutMs；OpenCode 式 command 数组会被静默丢弃。'),
        doc('本机用户级配置', '~/.zcode/cli/config.json', 'local-config', 'local', 'sample',
          '本机真实文件当前只有 plugins 启停状态，没有 mcp.servers——openbot 尚未向 ZCode 声明；写入走 install-local --target zcode --write-to。'),
      ],
    },
    policies: [],
    marketplace: {
      available: true,
      name: 'ZCode 插件市场（官方市场 zai-org/zcode-plugins + 自建市场分发）',
      url: 'https://github.com/zai-org/zcode-plugins',
      status: 'not-submitted',
      requirements: [
        '社区/伙伴插件放 external_plugins/<kebab-case 目录>；plugins/ 仅限官方维护的插件（CONTRIBUTING.md）',
        '.zcode-plugin/plugin.json 必须含 name / description / version / author；根目录 marketplace.json 条目的 name、version、description 必须与清单一致',
        '至少提供一个有用组件：command / skill / hook / agent / MCP server；MCP 走根目录 .mcp.json 或清单 mcpServers 字段，键名命名空间为 plugin:<插件名>:<服务名>',
        '必须同时提供 README.md 与 README_CN.md；category 只能选 developer-tools / productivity / utilities / finance / guides / template / other',
        'README 必须如实披露网络访问、模型/API/服务依赖、文件写入、命令执行、hooks、MCP server 与其它副作用；第三方代码/资产/服务标注许可证与来源',
        '不得提交凭据、私有端点、客户数据、机器特定路径、缓存、构建产物、混淆源码或不必要的预编译二进制',
        '提交流程：fork zai-org/zcode-plugins → external_plugins/ 下做插件 → 跑 python3 scripts/validate.py、build_dist.py、git diff --check → PR 模板必填 Plugin type（UI Plugin / Standard plugin / Not applicable）声明 → Conventional Commits 标题 → 维护者按功能、安全、可维护性、兼容性、来源与许可证审核',
        '已发布版本不可变：改动可安装内容必须同时递增清单与 marketplace.json 的语义化版本，不得复用旧版本号',
        '自建市场分发：仓库根目录 marketplace.json 列出条目，用户在 设置 → 插件 → 创建 → 添加插件市场 填 GitHub 仓库 / Git URL / 本地目录添加；该路径无需平台审核，但 ZCode 提示「启用插件就是授予代码执行信任」',
      ],
      blockers: [
        'OpenBot 连插件源码树都没有：connector.cjs / run.sh 还没打包成 .zcode-plugin/plugin.json + 组件目录；marketplace/zcode/ 目前只有占位骨架',
        'stdio 形态依赖 OpenBot 桌面在线与 CLI 桥 owner token；插件用户必须装有 OpenBot 桌面端才能真实调用工具，而所有 target 的 liveTested 仍是 false',
        'HTTP 形态需要公网端点，当前只有 127.0.0.1:4818；ZCode 配置文件不展开 ${...} 模板，HTTP headers 无法用环境变量占位符注入凭据',
        '平台侧服务条款 / 隐私政策本轮未取证：现有依据只有产品文档与 GitHub 仓库，上架前需补 ZCode / Z.ai 侧条款，不能引用没有依据的条款',
        '官方市场没有自动上架：PR 要过维护者人工审核（功能/安全/可维护性/兼容性/来源/许可证），README×2、副作用披露与版本纪律都要先备齐',
      ],
      docs: [
        doc('官方市场贡献指南 CONTRIBUTING.md', 'https://github.com/zai-org/zcode-plugins/blob/main/CONTRIBUTING.md', 'review', 'official', 'fetched',
          '本轮抓到全文：插件契约（external_plugins/ 目录、清单字段、marketplace.json 一致、≥1 组件、双语 README、类目枚举、副作用披露、禁止凭据/机器路径/构建产物）、开发工作流（fork → validate.py → build_dist.py → git diff --check）、PR 模板 Plugin type 必填声明、Conventional Commits、版本不可变与语义化版本递增、维护者审核维度（功能/安全/可维护性/兼容性/来源/许可证）。'),
        doc('Plugin（官方文档）', 'https://zcode.z.ai/cn/docs/plugin', 'review', 'official', 'fetched',
          '本轮抓到正文：清单优先 .zcode-plugin/plugin.json（兼容 .claude-plugin/），最小清单只需 name（小写字母/数字开头，可含 . _ -，1–128 字符）；marketplace.json 在市场仓库根目录，顶层 name + plugins[]，条目 source 支持目录/github/git/file/url/npm 七种；「最新版本」取自 marketplace.json 条目、「已安装版本」取自插件清单，发版须同步更新；添加市场走 设置 → 插件 → 创建 → 添加插件市场（GitHub 仓库 / Git URL / 本地目录或文件）；官方目录只能刷新不能移除；该页未给出向官方目录提交的入口，只写了自建团队市场分发。'),
        doc('官方市场仓库首页', 'https://github.com/zai-org/zcode-plugins', 'market', 'official', 'fetched',
          '本轮抓到 README 全文：官方市场收录 ZCode 维护插件与社区贡献，提交入口是 GitHub PR；类目表、插件清单、UI 插件（external_plugins/，社区维护）与 finance 插件分区；本地 UI 插件需 Node 24+ / pnpm 构建后注册 dist/local-marketplace。'),
        doc('本机市场注册表', '~/.zcode/cli/plugins/known_marketplaces.json', 'market', 'local', 'sample',
          '本机真实文件：已注册 zcode-plugins-official（source 为 CDN url https://cdn-zcode.z.ai/zcode/official-plugin/marketplace.json，pluginCount 68）与 claude-plugins-official；市场注册结构（id/source/name/description/addedAt/pluginCount）以此样本为据。'),
        doc('本机官方市场 catalog 样本', '~/.zcode/cli/plugins/marketplaces/zcode-plugins-official/marketplace.json', 'market', 'local', 'sample',
          '真实条目字段：source（url + zip + sha256 + path）、description 与 description_i18n、displayName_i18n、version、author、icon（HTTPS URL）、category、keywords、publisherType（official）、componentTypes（如 ["skill","mcp"]）——市场上架材料的字段口径按这份真实样本核对。'),
      ],
    },
    notes: [
      'ZCode 是七个平台里唯一的「插件包」市场：插件可自带 stdio MCP（插件作用域会展开 ${CLAUDE_PLUGIN_ROOT} / ${user_config.键} 等模板变量），因此是唯一不强制公网 HTTPS 端点的上架路径；但 CONTRIBUTING 要求如实披露命令执行、hooks、MCP server 等副作用。',
      '配置文件与插件是两条通道：~/.zcode/cli/config.json 的 mcp.servers 不展开模板、schema 严格（未知键整条丢弃）；模板展开与 user_config 是插件自带 MCP 的能力。',
      '本机正在运行 ZCode：known_marketplaces.json 已注册官方市场（CDN 分发 68 插件）；官方文档页没写向官方目录提交的入口，提交路径以 zai-org/zcode-plugins 的 CONTRIBUTING.md（GitHub PR + 人工审核）为准。',
      '平台侧条款（服务协议/隐私政策）未取证：本轮只有产品文档与 GitHub 仓库依据，不能编造条款内容。',
    ],
  },
];

/**
 * available 只表示「存在市场路径」；submissionSpec 才表示「有没有该类目的公开提交规范」。
 * 千问办公 / 豆包工作都属于有市场、但缺连接器类目提交规范，不能混成一句「已找到」。
 */
export const SUBMISSION_SPEC = {
  official: '已找到该类目官方公开提交规范',
  enterprise: '已找到官方连接器规范，但当前只开放企业/组织内提交与审核；公共市场个人上传尚未开放',
  'invite-only': '平台内测邀请制：官方接入规范需登录或入驻后可见，没有公开自助提交',
  none: '未找到公开提交规范',
};
export const PLATFORM_SUBMISSION_SPEC = {
  workbuddy: 'official',
  qwenwork: 'enterprise',
  'doubao-work': 'invite-only',
  'chatgpt-codex': 'official',
  cursor: 'official',
  claude: 'official',
  zcode: 'official',
};

export function findPlatform(id) {
  const match = platforms.find((item) => item.id === id);
  if (!match) {
    throw new Error(`未知平台 ${id}；可用：${platforms.map((item) => item.id).join(', ')}`);
  }
  return match;
}

function select(options = {}) {
  for (const key of Object.keys(options)) {
    if (!['platformId', 'category', 'kind', 'evidence', 'section'].includes(key)) {
      throw new Error(`未知查询选项 ${key}`);
    }
  }
  return options.platformId ? [findPlatform(options.platformId)] : platforms;
}

/** 注册表自检：确保政策、target、本地模式、市场条件之间没有悬空引用。 */
export function validateRegistry() {
  const problems = [];
  const platformIds = new Set();
  const covered = new Set();
  for (const platform of platforms) {
    if (platformIds.has(platform.id)) problems.push(`平台 id 重复：${platform.id}`);
    platformIds.add(platform.id);
    if (typeof platform.localMode.available !== 'boolean') problems.push(`${platform.id} 缺少本地模式 availability`);
    if (typeof platform.marketplace.available !== 'boolean') problems.push(`${platform.id} 缺少市场 availability`);
    if (platform.marketplace.available && platform.marketplace.requirements.length === 0) {
      problems.push(`${platform.id} 声称可上架却没有 requirements`);
    }
    if (platform.marketplace.blockers.length === 0) problems.push(`${platform.id} 没有登记 blockers（不允许把未知写成已完成）`);
    if (!Object.hasOwn(SUBMISSION_SPEC, PLATFORM_SUBMISSION_SPEC[platform.id])) {
      problems.push(`${platform.id} 缺少合法的 submissionSpec 登记`);
    }
    if (PLATFORM_SUBMISSION_SPEC[platform.id] !== 'none'
      && !platform.marketplace.docs.some((item) => item.kind === 'official' && item.category === 'review')) {
      problems.push(`${platform.id} 声称已有该平台的提交规范，却没有官方审核/提交依据文档`);
    }
    for (const targetId of platform.targets) {
      if (covered.has(targetId)) problems.push(`target 被多个平台引用：${targetId}`);
      covered.add(targetId);
      if (!targets.some((item) => item.id === targetId)) problems.push(`平台 ${platform.id} 引用了不存在的 target ${targetId}`);
    }
    const docs = [...platform.policies, ...platform.localMode.docs, ...platform.marketplace.docs];
    for (const item of docs) {
      if (!item.title || !item.url) problems.push(`${platform.id} 有未填标题或地址的文档`);
      if (!DOC_CATEGORIES.includes(item.category)) problems.push(`${platform.id} 文档 category 非法：${item.category}`);
      if (!['official', 'third-party', 'local'].includes(item.kind)) problems.push(`${platform.id} 文档 kind 非法：${item.kind}`);
      if (!EVIDENCE_KINDS.includes(item.evidence)) problems.push(`${platform.id} 文档 evidence 非法：${item.evidence}`);
      if (item.kind === 'official' && !/^(https?:\/\/|~\/)/.test(item.url)) {
        problems.push(`${platform.id} 官方文档地址不是 URL：${item.url}`);
      }
    }
  }
  for (const target of targets) {
    if (!covered.has(target.id)) problems.push(`target 没有归属平台：${target.id}`);
  }
  return problems;
}

export function listPlatforms(options = {}) {
  const chosen = select(options);
  const problems = validateRegistry();
  return {
    documentedAt: DOCUMENTED_AT,
    count: chosen.length,
    platforms: chosen.map((item) => ({
      id: item.id,
      label: item.label,
      vendor: item.vendor,
      targets: item.targets,
      localMode: item.localMode,
      policyCount: item.policies.length,
      marketplace: item.marketplace,
      notes: item.notes,
    })),
    evidenceKinds: EVIDENCE_KINDS,
    validation: { ok: problems.length === 0, problems },
  };
}

export function listPolicies(options = {}) {
  const chosen = select(options);
  const docs = [];
  for (const platform of chosen) {
    for (const [section, items] of [
      ['policy', platform.policies],
      ['local', platform.localMode.docs],
      ['market', platform.marketplace.docs],
    ]) {
      for (const item of items) {
        docs.push({ platform: platform.id, platformLabel: platform.label, section, ...item });
      }
    }
  }
  const filtered = docs.filter((item) => {
    if (options.category && item.category !== options.category) return false;
    if (options.kind && item.kind !== options.kind) return false;
    if (options.evidence && item.evidence !== options.evidence) return false;
    if (options.section && item.section !== options.section) return false;
    return true;
  });
  return {
    documentedAt: DOCUMENTED_AT,
    count: filtered.length,
    total: docs.length,
    bySection: ['policy', 'local', 'market'].reduce((acc, section) => {
      acc[section] = filtered.filter((item) => item.section === section).length;
      return acc;
    }, {}),
    byEvidence: EVIDENCE_KINDS.reduce((acc, kind) => {
      acc[kind] = filtered.filter((item) => item.evidence === kind).length;
      return acc;
    }, {}),
    docs: filtered,
    note: 'indexed 表示只拿到搜索索引摘要；tutorial 表示第三方教程，不能当官方规范引用；section 区分政策、本地模式依据与市场上架依据。',
  };
}

export function listLocalModes(options = {}) {
  const chosen = select(options);
  return {
    documentedAt: DOCUMENTED_AT,
    count: chosen.length,
    allHaveLocalMode: chosen.every((item) => item.localMode.available === true),
    modes: chosen.map((item) => ({
      platform: item.id,
      available: item.localMode.available,
      entry: item.localMode.entry,
      transports: item.localMode.transports,
      configPaths: item.localMode.configPaths,
      trustRequired: item.localMode.trustRequired,
      loopback: item.localMode.loopback,
      note: item.localMode.note,
      docs: item.localMode.docs,
    })),
    note: '本地模式存在 ≠ 已经在客户端里连上；loopback 为 no/unknown 的远程连接器不能指向 127.0.0.1。',
  };
}

export function listMarketplaces(options = {}) {
  const chosen = select(options);
  return {
    documentedAt: DOCUMENTED_AT,
    count: chosen.length,
    submitted: chosen.filter((item) => item.marketplace.status === 'published').length,
    marketplaces: chosen.map((item) => ({
      platform: item.id,
      platformLabel: item.label,
      ...item.marketplace,
      submissionSpec: PLATFORM_SUBMISSION_SPEC[item.id],
      submissionSpecLabel: SUBMISSION_SPEC[PLATFORM_SUBMISSION_SPEC[item.id]],
    })),
    note: 'status 为 not-submitted / unknown 时不得写成已上架；available 只表示存在市场路径，submissionSpec 区分公开提交规范 / 企业组织内提交 / 内测邀请制，不能一概写成「未找到」。',
  };
}
