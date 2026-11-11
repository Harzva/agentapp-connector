import {
  platforms, SUBMISSION_SPEC, PLATFORM_SUBMISSION_SPEC, DOCUMENTED_AT,
} from './policies.mjs';

/**
 * 提交前置检查：这些是当前产品事实，不从被测实现里读回「已完成」。
 * state 只有 missing / placeholder / unknown / done 四种；任何 missing 都让 ready=false。
 */
export const PREFLIGHT_ITEMS = [
  { id: 'public-https-mcp', label: '公网 HTTPS 常驻 MCP Server', state: 'missing', evidence: 'OpenBot 只有桌面内 127.0.0.1 端点，退出 App 即停服' },
  { id: 'oauth', label: 'OAuth 与动态客户端注册', state: 'missing', evidence: '现有 stdio 读取桌面 CLI 桥 owner token，没有 OAuth / DCR' },
  { id: 'tool-annotations', label: '工具名 / 描述 / title / readOnlyHint / destructiveHint', state: 'missing', evidence: '6 个工具仍是异步 job 语义，没有目录规范要求的注解' },
  { id: 'multi-tenant', label: '多用户隔离、凭据轮换与审计', state: 'missing', evidence: '只有单机 owner token，没有租户模型' },
  { id: 'subject', label: '主体认证与发布权限', state: 'unknown', evidence: '各平台口径不同，需在后台确认；千问办公企业通道需管理员权限' },
  { id: 'icon-metadata', label: '图标、目录元数据、版本与发布说明', state: 'placeholder', evidence: 'marketplace/ 里只有占位文件' },
  { id: 'privacy-policy', label: '隐私政策 URL 与数据处理说明', state: 'missing', evidence: '平台提交表单普遍必填' },
  { id: 'test-account', label: '带样例数据的审核测试账号与测试指南', state: 'missing', evidence: 'Claude / ChatGPT 目录明确要求' },
  { id: 'policy-fulltext', label: '协议条款后台全文复核', state: 'placeholder', evidence: '腾讯开发者服务协议 4.3(7) 只有搜索索引原文、豆包接入文档需登录；提交前要按后台版本复核' },
];

const OFFICIAL_FIRST_STEP = {
  workbuddy: '在 open.workbuddy.cn 完成主体认证，按《连接器》打包 connector-meta.json + mcp.json + icon + skills/',
  'chatgpt-codex': '用具备 Apps Management 权限的组织账号登录 platform.openai.com/apps-manage 新建 app',
  cursor: '把插件推到公开 Git 仓库，再在 cursor.com/marketplace/publish 提交仓库链接',
  claude: '用付费 Claude 账号在 claude.ai/directory/manage 选 Submit new → MCP connector',
  zcode: '把 connector 打包成 .zcode-plugin/plugin.json 插件，fork zai-org/zcode-plugins 后在 external_plugins/ 下按 CONTRIBUTING.md 提交 PR',
};
const SPEC_FIRST_STEP = {
  enterprise: '先让企业管理员开启「允许成员将连接器添加到组织连接器」，并准备 BASE_URL 与 admin.v1.connectors.manage scope',
  'invite-only': '在 open.doubao.com 提交入驻意向，等平台联系后取登录后可见的连接器接入规范',
  none: '向平台确认该类目是否开放第三方提交，再决定后续路径',
};

export const COMMON_BLOCKERS = [
  '没有公网 HTTPS 常驻 MCP Server、OAuth / DCR 与多用户隔离。',
  '工具仍是异步 job 语义，缺 title / readOnlyHint / destructiveHint 注解与输出 schema。',
  '目录元数据、图标、隐私政策、测试账号、测试指南都还没准备。',
  'marketplace/ 里的包全是占位符：端点用 .invalid 保留域，凭据只写环境变量名。',
  'Cursor 发布者条款 3.1 要求市场插件免费、6.3 禁止用插件数据训练模型；商业化口径需先定。',
];

export function buildPreflight(options = {}) {
  const chosen = options.platformId
    ? platforms.filter((item) => item.id === options.platformId)
    : platforms;
  if (options.platformId && chosen.length === 0) throw new Error(`未知平台 ${options.platformId}`);
  const rows = chosen.map((platform) => {
    const spec = PLATFORM_SUBMISSION_SPEC[platform.id];
    const missing = PREFLIGHT_ITEMS.filter((item) => item.state !== 'done');
    return {
      platform: platform.id,
      platformLabel: platform.label,
      submissionSpec: spec,
      submissionSpecLabel: SUBMISSION_SPEC[spec],
      entry: platform.marketplace.url,
      status: platform.marketplace.status,
      ready: false,
      firstStep: OFFICIAL_FIRST_STEP[platform.id] || SPEC_FIRST_STEP[spec],
      checks: PREFLIGHT_ITEMS.map((item) => ({ ...item })),
      missing: missing.map((item) => item.id),
      platformBlockers: platform.marketplace.blockers.length,
      reviewDocs: platform.marketplace.docs
        .filter((item) => item.category === 'review')
        .map((item) => item.url),
    };
  });
  return {
    documentedAt: DOCUMENTED_AT,
    count: rows.length,
    readyCount: rows.filter((item) => item.ready).length,
    submitted: rows.filter((item) => item.status === 'published').length,
    platforms: rows,
    commonBlockers: COMMON_BLOCKERS,
    note: 'ready=false 是产品事实，不是判断失误：任何 missing / placeholder / unknown 前置项都不能提交。',
  };
}

export function renderSubmitSteps(options = {}) {
  const preflight = buildPreflight(options);
  const lines = [
    '# 市场上架提交步骤（当前不可提交）',
    '',
    `> 由 \`src/preflight.mjs\` 生成，登记日期 ${DOCUMENTED_AT}。所有平台 \`ready=false\`，\`status\` 都不是 \`published\`。`,
    '',
    `**结论：${preflight.count} 个平台现在都不能提交。** 缺的是同一批底层能力，不是填表技巧。`,
    '',
    '## 共通硬缺口',
    '',
    ...preflight.commonBlockers.map((item) => `- ${item}`),
    '',
    '## 逐平台提交路径',
    '',
  ];
  for (const row of preflight.platforms) {
    const platform = platforms.find((item) => item.id === row.platform);
    lines.push(`### ${row.platformLabel}（${row.platform}）`, '');
    lines.push(`- 入口：${row.entry}`);
    lines.push(`- 该类目规范：${row.submissionSpecLabel}`);
    lines.push(`- 当前状态：\`${row.status}\` / ready=\`${row.ready}\``);
    lines.push(`- 第一步：${row.firstStep}`);
    lines.push('', '动作序列（来自官方要求，完整清单见 `SUBMISSION.md`）：', '');
    for (const item of platform.marketplace.requirements) lines.push(`1. ${item}`);
    lines.push('', '提交前必须清掉的前置项：', '');
    for (const item of row.checks.filter((check) => check.state !== 'done')) {
      lines.push(`- [ ] ${item.label}（${item.state}）：${item.evidence}`);
    }
    lines.push('', '审核 / 提交依据：', '');
    for (const url of row.reviewDocs) lines.push(`- ${url}`);
    lines.push('');
  }
  lines.push('## 为什么现在不能装到市场', '');
  lines.push('- `marketplace/` 里的 JSON 是占位骨架，端点为 RFC 2606 保留域，凭据只有环境变量名，提交会被平台直接拒。');
  lines.push('- 千问办公当前只开放企业/组织内提交与审核，公共市场个人上传标记「即将推出」。');
  lines.push('- 豆包开放平台在内测邀请制，接入规范需登录后可见，没有公开自助提交后台。');
  lines.push('- WorkBuddy / ChatGPT / Cursor / Claude 虽有官方提交规范，但都要求公网 HTTPS MCP Server 与认证能力。');
  lines.push('- ZCode 市场收的是插件包且可自带 stdio MCP（不强制公网端点），但 OpenBot 连插件源码树都没有，PR 审核要求的双语 README 与副作用披露也没准备。');
  lines.push('');
  return `${lines.join('\n')}\n`;
}
