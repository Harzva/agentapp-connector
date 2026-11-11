import {
  platforms, findPlatform, SUBMISSION_SPEC, PLATFORM_SUBMISSION_SPEC, DOCUMENTED_AT,
} from './policies.mjs';
import { renderSubmitSteps, buildPreflight } from './preflight.mjs';

/**
 * 市场上架材料的占位骨架，全部由政策注册表生成。
 * 七个平台都有材料，但性质不同：official 可走公开提交；enterprise 只到组织内提交；
 * invite-only 只有入驻路径；ZCode 收插件包（可自带 stdio MCP，不强制公网端点）但不能伪造可提交包。
 */
export const PACK_PLATFORMS = [
  'workbuddy', 'qwenwork', 'doubao-work', 'chatgpt-codex', 'cursor', 'claude', 'zcode',
];
export const SUBMISSION_STATE = 'NOT-SUBMITTED';
export const PLACEHOLDER_ENDPOINT = 'https://mcp.example.invalid/mcp';
export const TOKEN_ENV_VAR = 'OPENBOT_GRANT_TOKEN';

function header(platformId, title) {
  const platform = findPlatform(platformId);
  return [
    `# ${title}`,
    '',
    `- 平台：${platform.label}（${platform.id}）`,
    `- 状态：**${SUBMISSION_STATE}** —— 占位骨架，没有提交、没有审核、没有上架`,
    `- 该类目规范：${SUBMISSION_SPEC[PLATFORM_SUBMISSION_SPEC[platformId]]}`,
    `- 市场入口：${platform.marketplace.url}`,
    `- 依据登记日期：${DOCUMENTED_AT}`,
    '',
    '> 本目录由 `src/packs.mjs` 从政策注册表生成，不要手改。所有地址、主体、凭据字段都是占位符。',
    '> OpenBot 目前只有桌面内 `127.0.0.1` 的端点，没有公网常驻 HTTPS MCP Server、OAuth 与多用户隔离。',
    '',
  ];
}

function submissionLines(platformId) {
  const platform = findPlatform(platformId);
  const market = platform.marketplace;
  return [
    '## 需满足',
    '',
    ...market.requirements.map((item) => `- [ ] ${item}`),
    '',
    '## 阻塞项（逐条解决前不要提交）',
    '',
    ...market.blockers.map((item) => `- [ ] ${item}`),
    '',
    '## 依据',
    '',
    ...market.docs.map((item) => `- [${item.title}](${item.url})（${item.kind} / ${item.evidence}）`),
    '',
    '## 提交动作',
    '',
    '- [ ] 在平台后台确认主体认证与发布权限',
    '- [ ] 部署公网 HTTPS MCP Server 并完成认证、最小权限与审计',
    '- [ ] 按目录规范改造工具名 / 描述 / 注解 / 输出 schema',
    '- [ ] 补齐图标、隐私政策、文档 URL、测试账号与测试指南',
    `- [ ] 后台实际提交；提交后把 \`status\` 从 \`${SUBMISSION_STATE}\` 改为平台返回的真实状态`,
    '',
  ];
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function renderOverview() {
  const preflight = buildPreflight();
  const lines = [
    '# 市场上架包骨架（占位）',
    '',
    `> 由 \`src/packs.mjs\` 生成，登记日期 ${DOCUMENTED_AT}。全部状态：${SUBMISSION_STATE}。`,
    '',
    '本地配置能跑通不等于能上架。这里只准备**结构与清单**，不代替公网服务、主体认证、审核与发布。',
    '',
    '| 平台 | 市场入口 | 该类目规范 | 本目录内容 |',
    '| --- | --- | --- | --- |',
    ...platforms.map((item) => {
      const spec = PLATFORM_SUBMISSION_SPEC[item.id];
      const content = {
        official: '提交清单 + 占位包骨架',
        enterprise: '提交清单 + OpenAPI 请求体占位（只到组织内提交）',
        'invite-only': '提交清单 + 入驻路径（规范需登录后可见，不生成可提交包）',
        none: '不生成包',
      }[spec];
      return `| ${item.label} | ${item.marketplace.url} | ${SUBMISSION_SPEC[spec]} | ${content} |`;
    }),
    '',
    '## 七个平台的材料性质不同',
    '',
    '- 千问办公 `enterprise`：官方有《连接器管理》、企业旗舰版新建流程与 `POST /api/openapi/v1/connectors`，但「允许上传个人连接器」标记「即将推出」；所以只给**组织内提交**材料，不写成公开上架。',
    '- 豆包工作 `invite-only`：开放平台内测邀请制，技能接入指南直接抓取返回「登录」壳；服务商连接器规范需入驻后可见，所以只给**入驻路径与清单**，不伪造可提交包。',
    '- 其余平台 `official`：有官方公开提交规范，但 WorkBuddy / ChatGPT / Cursor / Claude 都要求公网 HTTPS MCP Server 与认证能力，当前同样不可提交。',
    '- ZCode `official`：官方市场（zai-org/zcode-plugins）走 GitHub PR + 维护者人工审核，收的是**插件包**且插件可自带 stdio MCP——是唯一不强制公网 HTTPS 端点的路径；但 OpenBot 连插件源码树都没有，双语 README 与副作用披露也没准备，当前同样不可提交。',
    `- 提交步骤与前置检查见 \`SUBMIT-STEPS.md\`；当前 ${preflight.count} 个平台 \`ready=${preflight.readyCount}\`。`,
    '',
    '## 为什么现在不能装到市场',
    '',
    '- 没有公网 HTTPS 常驻 MCP Server、OAuth / DCR 与多用户隔离。',
    '- 工具仍是异步 job 语义，缺 title / readOnlyHint / destructiveHint 注解。',
    '- 目录元数据、图标、隐私政策、测试账号与测试指南都还没准备。',
    '- Cursor 发布者条款 3.1 要求市场插件免费、6.3 禁止用插件数据训练模型，这是商业化约束。',
    '',
    '## 占位约定',
    '',
    `- MCP 端点一律写 \`${PLACEHOLDER_ENDPOINT}\`（RFC 2606 保留域，永远解析不到），不写本机地址或真实域名。`,
    `- 凭据只写环境变量名 \`${TOKEN_ENV_VAR}\` 或 \${${TOKEN_ENV_VAR}} 占位符，绝不写入真实 token。`,
    '- 所有清单项默认是未勾选 `[ ]`；没有完成实测就不能勾。',
    '- WorkBuddy 的 `connector-meta.placeholder.json` 字段名只是占位，正式字段以开放平台《连接器》为准。',
    '- 千问办公的 `connector-payload.placeholder.json` 字段来自官方 OpenAPI，但缺 BASE_URL、Idempotency-Key 与管理员 scope，不能直接 POST。',
    '',
    '## 生成',
    '',
    '```sh',
    'npm run packs',
    'npm test',
    '```',
    '',
  ];
  return `${lines.join('\n')}\n`;
}

export function renderPacks() {
  const files = {
    'README.md': renderOverview(),
    'SUBMIT-STEPS.md': renderSubmitSteps(),
  };

  for (const id of PACK_PLATFORMS) {
    files[`${id}/SUBMISSION.md`] = `${[
      ...header(id, `${findPlatform(id).label}：提交清单`),
      ...submissionLines(id),
    ].join('\n')}\n`;
  }

  const wb = header('workbuddy', 'WorkBuddy Connector 包（占位）');
  files['workbuddy/README.md'] = `${[
    ...wb,
    '## 包结构（来自开放平台《连接器》）',
    '',
    '- `connector-meta.json`（本骨架里叫 `connector-meta.placeholder.json`）',
    '- `mcp.json`：一个 Connector 包只含一个 MCP Server',
    '- `icon` 图标与 `skills/` 目录：尚未提供',
    '',
    '正式打包前必须把占位文件名改回官方文件名，并按后台检查清单核对字段、source 命名、minWorkbuddyVersion 与图标规格。',
    '',
  ].join('\n')}\n`;
  files['workbuddy/connector-meta.placeholder.json'] = json({
    _warning: '字段名与必填项以开放平台《连接器》为准；本文件只是占位骨架，不是官方 schema 实例。',
    name: 'openbot',
    version: '0.0.0-placeholder',
    status: SUBMISSION_STATE,
    displayName: 'OpenBot（占位）',
    description: '占位描述：需按提交检查清单重写',
    minWorkbuddyVersion: '0.0.0-placeholder',
    icon: 'icon.png',
    skills: [],
    missingAssets: ['icon.png', 'skills/'],
  });
  files['workbuddy/mcp.json'] = json({
    mcpServers: {
      openbot: {
        type: 'streamableHttp',
        url: PLACEHOLDER_ENDPOINT,
        headers: { Authorization: `Bearer \${${TOKEN_ENV_VAR}}` },
        _warning: '占位端点，不可解析；正式包不得硬编码真实 Token。',
      },
    },
  });

  files['qwenwork/README.md'] = `${[
    ...header('qwenwork', '千问办公组织内连接器（占位）'),
    '## 当前能走到哪一步',
    '',
    '官方文档区分「公共连接器市场」与「组织/企业连接器」。「允许上传个人连接器」标记「即将推出」且暂不能修改，',
    '所以这里只准备**企业/组织内提交**：管理员开启成员提交 → 成员提交 → 「连接器审核」→ 管理员通过并发布到组织连接器 → 启用。',
    '',
    '## OpenAPI 请求体占位',
    '',
    '`connector-payload.placeholder.json` 按 `POST /api/openapi/v1/connectors` 的字段构造，',
    '但还缺企业部署的 BASE_URL、`Idempotency-Key` 与 Scope `admin.v1.connectors.manage`，不能直接发送。',
    '连接器键与服务 URL 创建后不可修改，正式提交前必须换成真实公网生产地址。',
    '',
  ].join('\n')}\n`;
  files['qwenwork/connector-payload.placeholder.json'] = json({
    _warning: '占位请求体：需企业部署 BASE_URL、Idempotency-Key 与 admin.v1.connectors.manage scope；当前不可提交。',
    server_key: 'openbot',
    transport: 'http',
    url: PLACEHOLDER_ENDPOINT,
    auth_type: 'none',
    clients: [],
    display_name: 'OpenBot (placeholder)',
    display_name_cn: 'OpenBot（占位）',
    description: '占位描述：需写明能访问什么业务系统、数据范围与前置条件',
    version: '0.0.0-placeholder',
    status: SUBMISSION_STATE,
  });

  files['cursor/README.md'] = `${[
    ...header('cursor', 'Cursor Plugin 包（占位）'),
    '## 官方格式',
    '',
    '- 采用 Cursor Plugin 格式：`.cursor-plugin/plugin.json` 清单 + 根目录 `mcp.json`。',
    '- `variables` schema 必须声明 `mcp.json` 里出现的每个 `${VAR}`；仓库内不得放密钥。',
    '- 提交按官方 Plugins reference：推到公开 Git 仓库，再到 cursor.com/marketplace/publish 提交仓库链接。',
    '',
    '## 未提供的资产',
    '',
    '- 公开 Git 仓库、logo、本地实机测试记录',
    '- 发布者条款 3.1 要求插件免费；若 OpenBot 要收费，须先解决商业模式冲突',
    '',
  ].join('\n')}\n`;
  files['cursor/.cursor-plugin/plugin.json'] = json({
    _warning: '占位骨架，字段以 https://cursor.com/docs/reference/plugins 为准。',
    name: 'openbot-placeholder',
    version: '0.0.0-placeholder',
    description: '占位描述：需清楚说明插件用途后再提交',
    license: 'PLACEHOLDER',
    logo: 'assets/logo.svg',
    variables: {
      type: 'object',
      properties: {
        [TOKEN_ENV_VAR]: {
          type: 'string',
          title: 'OpenBot grant token',
          description: '受限 grant token，由安装者在 Plugins → Configure 里设置',
        },
      },
      required: [TOKEN_ENV_VAR],
    },
  });
  files['cursor/mcp.json'] = json({
    mcpServers: {
      openbot: {
        url: PLACEHOLDER_ENDPOINT,
        headers: { Authorization: `Bearer \${${TOKEN_ENV_VAR}}` },
      },
    },
  });

  files['zcode/README.md'] = `${[
    ...header('zcode', 'ZCode 插件包（占位）'),
    '## 官方格式（两条分发通道）',
    '',
    '- **官方市场**：fork `zai-org/zcode-plugins`，插件放 `external_plugins/<kebab-case>/`，按 CONTRIBUTING.md 提交 PR，维护者按功能 / 安全 / 可维护性 / 兼容性 / 来源 / 许可证人工审核。',
    '- **自建市场**：插件仓库根目录放 `marketplace.json`，用户在 设置 → 插件 → 创建 → 添加插件市场 填仓库 / Git URL / 本地目录；无需平台审核。',
    '- 清单 `.zcode-plugin/plugin.json` 最小只需 `name`（小写字母/数字开头，可含 . _ -，1–128 字符）；CONTRIBUTING 额外要求 `description` / `version` / `author`。',
    '- 至少一个组件；MCP 走根目录 `.mcp.json` 或清单 `mcpServers` 字段，键名命名空间为 `plugin:<插件名>:<服务名>`。',
    '- 必须同时提供 `README.md` 与 `README_CN.md`，并披露网络访问、命令执行、hooks、MCP server 等副作用；不得提交凭据与机器特定路径。',
    '- 已发布版本不可变：改动可安装内容必须同时递增清单与 `marketplace.json` 的语义化版本。',
    '',
    '## 未提供的资产（逐条补齐前不可提交）',
    '',
    '- 插件源码树：`connector.cjs` / `run.sh` 还没打包成插件组件目录',
    '- `README.md` + `README_CN.md` 双语文档与副作用披露',
    '- 官方市场 PR 所需的 `validate.py` / `build_dist.py` 通过记录',
    '- 图标（HTTPS URL）；官方样本字段按本机 `~/.zcode/cli/plugins/marketplaces/zcode-plugins-official/marketplace.json` 核对',
    '',
    '## 与其它市场的关键差异',
    '',
    '- 插件可自带 stdio MCP，且插件作用域会展开 `${CLAUDE_PLUGIN_ROOT}` / `${user_config.键}` 等模板变量——这是唯一不强制公网 HTTPS 端点的市场上架路径。',
    '- 配置文件（`~/.zcode/cli/config.json` 的 `mcp.servers`）与插件是两条通道：配置文件不展开模板、schema 严格。',
    '',
  ].join('\n')}\n`;
  files['zcode/.zcode-plugin/plugin.json'] = json({
    _warning: '占位骨架：字段以 https://zcode.z.ai/cn/docs/plugin 与 zai-org/zcode-plugins CONTRIBUTING.md 为准；userConfig 条目的 schema 未取证，提交前须按官方样例核对。',
    name: 'openbot-placeholder',
    version: '0.0.0-placeholder',
    description: '占位描述：需写明用途并披露命令执行 / MCP server 等副作用后再提交',
    author: { name: 'PLACEHOLDER' },
    userConfig: {
      [TOKEN_ENV_VAR]: {
        description: '受限 grant token（占位字段名，schema 以官方 userConfig 文档为准）',
        sensitive: true,
      },
    },
    mcpServers: {
      openbot: {
        type: 'http',
        url: PLACEHOLDER_ENDPOINT,
        headers: { Authorization: `Bearer \${user_config.${TOKEN_ENV_VAR}}` },
      },
    },
  });
  // 文件名刻意叫 marketplace.placeholder.json：真实名 marketplace.json 放在本目录
  // 会被 ZCode 当成可添加的本地市场；占位骨架不允许被直接安装。
  files['zcode/marketplace.placeholder.json'] = json({
    _warning: '占位骨架：正式提交时清单要放在插件仓库根目录、文件名 marketplace.json，条目的 name/version/description 与插件清单一致（CONTRIBUTING.md）；本文件不可作为市场添加。',
    name: 'openbot-dev-market',
    plugins: [
      {
        name: 'openbot-placeholder',
        source: './openbot-placeholder',
        version: '0.0.0-placeholder',
        description: '占位描述：与插件清单保持一致',
        displayName: 'OpenBot（占位）',
        displayName_i18n: { en: 'OpenBot (placeholder)', 'zh-CN': 'OpenBot（占位）' },
        description_i18n: { en: 'Placeholder description', 'zh-CN': '占位描述：需写明实际用途' },
        category: 'developer-tools',
      },
    ],
  });

  return files;
}
