import test from 'node:test';
import assert from 'node:assert/strict';
import {
  platforms, validateRegistry, findPlatform, listPlatforms,
  listPolicies, listLocalModes, listMarketplaces, DOCUMENTED_AT,
} from '../src/policies.mjs';
import { targets, plannedTargets } from '../src/targets.mjs';

function expectMessage(fn, message) {
  assert.throws(fn, (error) => {
    assert.equal(error.message, message);
    return true;
  });
}

test('政策注册表自检通过，且每个 target 恰好归属一个平台', () => {
  assert.deepEqual(validateRegistry(), []);
  assert.equal(platforms.length, 7);
  assert.deepEqual(platforms.map((item) => item.id), [
    'workbuddy', 'qwenwork', 'doubao-work', 'chatgpt-codex', 'cursor', 'claude', 'zcode',
  ]);
  const covered = platforms.flatMap((item) => item.targets);
  assert.equal(covered.length, targets.length);
  assert.equal(new Set(covered).size, targets.length);
  assert.deepEqual([...covered].sort(), targets.map((item) => item.id).sort());
  for (const planned of plannedTargets) {
    assert.equal(targets.some((item) => item.id === planned.id), false);
  }
  const listing = listPlatforms();
  assert.equal(listing.documentedAt, DOCUMENTED_AT);
  assert.deepEqual(listing.validation, { ok: true, problems: [] });
});

test('政策文档每条都有可引用地址、来源与证据等级', () => {
  const listing = listPolicies();
  assert.equal(listing.count, listing.docs.length);
  assert.equal(listing.total, platforms.reduce((sum, item) => sum
    + item.policies.length + item.localMode.docs.length + item.marketplace.docs.length, 0));
  assert.deepEqual(Object.keys(listing.bySection), ['policy', 'local', 'market']);
  assert.equal(listing.bySection.policy > 0, true);
  assert.equal(listing.byEvidence.fetched > 0, true);
  assert.equal(listing.byEvidence.indexed > 0, true);
  assert.equal(listing.byEvidence.sample > 0, true);
  assert.equal(listing.byEvidence.tutorial > 0, true);
  for (const item of listing.docs) {
    assert.ok(item.platform && item.platformLabel && item.title && item.url, `缺字段：${JSON.stringify(item)}`);
    assert.ok(['official', 'third-party', 'local'].includes(item.kind));
    assert.ok(['fetched', 'indexed', 'sample', 'tutorial'].includes(item.evidence));
    if (item.kind === 'official') assert.ok(/^(https?:\/\/|~\/)/.test(item.url), item.url);
    assert.ok(item.note && item.note.length > 0, `${item.title} 没有写取证要点`);
  }
  assert.ok(listing.note.includes('indexed 表示只拿到搜索索引摘要'));
});

test('关键政策地址与事实写字面值，不从被测实现读回常量', () => {
  const urls = listPolicies().docs.map((item) => item.url);
  for (const expected of [
    'https://open.workbuddy.cn/docs/connector',
    'https://open.workbuddy.cn/docs/onboarding',
    'https://rule.tencent.com/rule/202608300002',
    'https://qwenwork.cn/docs/features/connectors',
    'https://terms.alicdn.com/legal-agreement/terms/common_product_agreement/20260920094459914/20260920094459914.html',
    'https://www.doubao.com/legal/terms',
    'https://open.doubao.com/',
    'https://openai.com/policies/developer-apps-terms/',
    'https://developers.openai.com/apps-sdk/app-submission-guidelines',
    'https://cursor.com/privacy',
    'https://cursor.com/terms-of-service',
    'https://cursor.com/marketplace-publisher-terms',
    'https://cursor.com/marketplace/publish',
    'https://cursor.com/docs/reference/plugins',
    'https://www.cursor.com/terms/dpa',
    'https://cursor.com/help/security-and-privacy/compliance',
    'https://www.anthropic.com/legal',
    'https://www.anthropic.com/legal/aup',
    'https://www.anthropic.com/legal/data-processing-addendum',
    'https://support.claude.com/en/articles/13145338-anthropic-software-directory-terms',
    'https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy',
    'https://claude.com/docs/connectors/building/submission',
    'https://claude.ai/directory/manage',
    'https://chatgpt.com/apps',
    'https://platform.openai.com/apps-manage',
    'https://www.workbuddy.cn/document/term',
    'https://volcengine.com/docs/data-agent/mcp?lang=zh',
    'https://www.alibabacloud.com/help/zh/doc-detail/3052930.html',
    'https://help.aliyun.com/zh/qwenwork/connector-management',
    'https://help.aliyun.com/zh/qwenwork/enterprise-ultimate-ai-assets-connectors',
    'https://apibobo.com/content/posts/doubao-work-connectors-mcp-guide',
    'http://mediaclaw.app/en/features/doubao-integration',
    'https://zcode.z.ai/cn/docs/mcp-services',
    'https://zcode.z.ai/cn/docs/plugin',
    'https://github.com/zai-org/zcode-plugins',
    'https://github.com/zai-org/zcode-plugins/blob/main/CONTRIBUTING.md',
    '~/.zcode/cli/plugins/known_marketplaces.json',
    '~/.zcode/cli/plugins/marketplaces/zcode-plugins-official/marketplace.json',
  ]) {
    assert.ok(urls.includes(expected), `缺少政策地址 ${expected}`);
  }
  assert.equal(urls.includes('https://www.anthropic.com/legal/usage-policy'), false);
  assert.equal(urls.includes('https://www.anthropic.com/legal/dpa'), false);
  assert.equal(urls.includes('https://ai-develop.top/blog/1787708554962'), false);
  assert.equal(urls.includes('https://openai.com/zh-Hans-CN/apps'), false);
  const onboarding = listPlatforms({ platformId: 'workbuddy' }).platforms[0]
    .marketplace.docs.find((item) => item.title === '入驻开放平台');
  assert.ok(onboarding.note.includes('个人认证'));
  assert.ok(onboarding.note.includes('企业认证'));
});

test('本地模式七个平台都有，且把云端发起 / 网页版不读配置写清楚', () => {
  const listing = listLocalModes();
  assert.equal(listing.count, 7);
  assert.equal(listing.allHaveLocalMode, true);
  const byId = Object.fromEntries(listing.modes.map((item) => [item.platform, item]));
  assert.equal(byId.workbuddy.trustRequired, true);
  assert.equal(byId.workbuddy.loopback, 'yes');
  assert.deepEqual(byId.qwenwork.transports, ['streamable-http', 'sse', 'stdio']);
  assert.equal(byId['doubao-work'].configPaths.length, 0);
  assert.ok(byId['chatgpt-codex'].note.includes('ChatGPT 网页版不读取本地配置'));
  assert.ok(byId.claude.note.includes('Anthropic 云端发起'));
  assert.ok(byId.cursor.note.includes('项目级优先'));
  // ZCode 的三个事实：嵌套键形状、自动连接、配置文件不展开模板。
  assert.ok(byId.zcode.note.includes('自动连接'));
  assert.ok(byId.zcode.note.includes('不展开 ${...} 模板'));
  assert.ok(byId.zcode.configPaths.some((path) => path.includes('~/.zcode/cli/config.json')));
});

test('市场清单不把未提交写成已上架，阻塞项逐平台登记', () => {
  const listing = listMarketplaces();
  assert.equal(listing.count, 7);
  assert.equal(listing.submitted, 0);
  assert.deepEqual(listing.marketplaces.map((item) => item.status), [
    'not-submitted', 'not-submitted', 'not-submitted', 'not-submitted', 'not-submitted', 'not-submitted', 'not-submitted',
  ]);
  const byId = Object.fromEntries(listing.marketplaces.map((item) => [item.platform, item]));
  assert.deepEqual(listing.marketplaces.map((item) => item.available), [
    true, true, true, true, true, true, true,
  ]);
  assert.deepEqual(listing.marketplaces.map((item) => item.submissionSpec), [
    'official', 'enterprise', 'invite-only', 'official', 'official', 'official', 'official',
  ]);
  assert.ok(listing.note.includes('available 只表示存在市场路径'));
  assert.ok(byId.cursor.requirements.join(' ').includes('免费'));
  assert.ok(byId.cursor.requirements.join(' ').includes('训练 AI 模型'));
  assert.ok(byId.claude.requirements.join(' ').includes('slug 发布后永久不可变'));
  assert.ok(byId.claude.blockers.join(' ').includes('赔偿'));
  assert.ok(byId['doubao-work'].blockers.join(' ').includes('不对外公开'));
  assert.ok(byId.workbuddy.blockers.join(' ').includes('上线报道'));
  assert.ok(byId.qwenwork.requirements.join(' ').includes('POST /api/openapi/v1/connectors'));
  assert.ok(byId.qwenwork.blockers.join(' ').includes('即将推出'));
  // listPlatforms 只给 policyCount；条款明细必须走 listPolicies 取，不能凭字段名猜。
  const tencent = listPolicies({ platformId: 'workbuddy', section: 'policy' }).docs
    .find((item) => item.title === '开发者服务协议');
  assert.ok(tencent, '找不到腾讯开发者服务协议条目');
  assert.ok(tencent.note.includes('未经本平台事先书面同意'));
  assert.ok(tencent.note.includes('同类PaaS/MaaS'));
  for (const item of listing.marketplaces) {
    assert.ok(item.blockers.length > 0, `${item.platform} 没有写阻塞项`);
    assert.ok(item.requirements.length > 0, `${item.platform} 没有写条件`);
    assert.ok(item.docs.length > 0, `${item.platform} 没有写依据`);
  }
  const wb = byId.workbuddy.requirements.join(' ');
  assert.ok(wb.includes('HTTPS'));
  assert.ok(wb.includes('30 秒'));
  assert.ok(wb.includes('99.9%'));
  // 第三轮纠正：不是「不允许个人用户」，而是「个人向公共市场上传即将推出、组织内提交已开放」。
  const qwenBlockers = byId.qwenwork.blockers.join(' ');
  assert.ok(qwenBlockers.includes('即将推出'));
  assert.ok(qwenBlockers.includes('组织内提交需要企业管理员权限'));
  assert.ok(!qwenBlockers.includes('不允许个人用户'));
  assert.ok(byId['doubao-work'].blockers.join(' ').includes('内测'));
  assert.ok(byId['chatgpt-codex'].requirements.join(' ').includes('隐私政策'));
  assert.ok(byId.claude.blockers.join(' ').includes('127.0.0.1'));
  // ZCode：提交规范是官方 CONTRIBUTING（GitHub PR + 人工审核），市场收插件包；平台条款未取证必须如实登记。
  assert.ok(byId.zcode.requirements.join(' ').includes('external_plugins/'));
  assert.ok(byId.zcode.requirements.join(' ').includes('README_CN.md'));
  assert.ok(byId.zcode.blockers.join(' ').includes('插件源码树'));
  assert.ok(byId.zcode.blockers.join(' ').includes('未取证'));
});

test('查询参数按原因拒绝，不接受静默忽略', () => {
  expectMessage(() => findPlatform('nope'),
    '未知平台 nope；可用：workbuddy, qwenwork, doubao-work, chatgpt-codex, cursor, claude, zcode');
  expectMessage(() => listPolicies({ platformId: 'nope' }),
    '未知平台 nope；可用：workbuddy, qwenwork, doubao-work, chatgpt-codex, cursor, claude, zcode');
  expectMessage(() => listPolicies({ tokne: 'x' }), '未知查询选项 tokne');
  expectMessage(() => listMarketplaces({ bogus: 'privacy' }), '未知查询选项 bogus');
  assert.equal(listPolicies({ category: 'privacy' }).docs.every((item) => item.category === 'privacy'), true);
  assert.equal(listPolicies({ kind: 'official' }).docs.every((item) => item.kind === 'official'), true);
  assert.equal(listPolicies({ evidence: 'fetched' }).docs.every((item) => item.evidence === 'fetched'), true);
  const local = listPolicies({ section: 'local', platformId: 'workbuddy' });
  assert.equal(local.docs.length, 2);
  assert.equal(local.docs.every((item) => item.section === 'local' && item.platform === 'workbuddy'), true);
  assert.deepEqual(Object.keys(listPolicies().bySection), ['policy', 'local', 'market']);
});

test('本轮全文复核的官方条款升级为 fetched，且关键条款原文与生效日期写入依据', () => {
  const docs = listPolicies().docs;
  const byUrl = Object.fromEntries(docs.map((item) => [item.url, item]));
  const fetched = [
    'https://www.workbuddy.cn/document/term',
    'https://terms.alicdn.com/legal-agreement/terms/b_end_product_protocol/20260708175856831/20260708175856831.html',
    'https://www.doubao.com/legal/privacy',
    'https://openai.com/policies/usage-policies/',
    'https://openai.com/policies/service-terms/',
    'https://openai.com/policies/connectors-actions-terms/',
    'https://www.anthropic.com/legal/aup',
    'https://www.anthropic.com/legal/data-processing-addendum',
    'https://cursor.com/privacy',
    'https://cursor.com/docs/context/mcp',
  ];
  for (const url of fetched) {
    assert.ok(byUrl[url], `缺少官方条款 ${url}`);
    assert.equal(byUrl[url].evidence, 'fetched', `${url} 不应退回 indexed`);
  }
  // 期望值全部写字面值，不拿被测实现的常量自证。
  assert.ok(byUrl['https://openai.com/policies/connectors-actions-terms/'].note.includes('including via an MCP server'));
  assert.ok(byUrl['https://openai.com/policies/usage-policies/'].note.includes('November 20, 2026'));
  assert.ok(byUrl['https://openai.com/policies/usage-policies/'].note.includes('尚未生效'));
  assert.ok(byUrl['https://www.anthropic.com/legal/aup'].note.includes('Effective Nov 12, 2026'));
  assert.ok(byUrl['https://www.anthropic.com/legal/aup'].note.includes('connected systems'));
  assert.ok(byUrl['https://www.workbuddy.cn/document/term'].note.includes('opt-in consent'));
  const qwen = byUrl['https://terms.alicdn.com/legal-agreement/terms/b_end_product_protocol/20260708175856831/20260708175856831.html'];
  assert.ok(qwen.note.includes('2026-10-10'));
  assert.ok(qwen.note.includes('8.2'));
  assert.ok(qwen.note.includes('竞争关系的产品'));
  assert.ok(byUrl['https://www.doubao.com/legal/privacy'].note.includes('2026-09-17'));
  assert.ok(byUrl['https://cursor.com/docs/context/mcp'].note.includes('字段表'));
  // 403 是「抓取通道被拒」，不是「没有规范」，必须如实写。
  assert.ok(byUrl['https://developers.openai.com/apps-sdk/app-submission-guidelines'].note.includes('403 Forbidden'));
  // 腾讯两份规则中心页没有正文，不许升级成 fetched。
  assert.equal(byUrl['https://rule.tencent.com/rule/202608300001'].evidence, 'indexed');
  assert.equal(byUrl['https://rule.tencent.com/rule/202608300003'].evidence, 'indexed');
  assert.ok(byUrl['https://rule.tencent.com/rule/202608300001'].note.includes('正文缺失'));
});

test('ZCode 证据链分清官方正文与本地样本，平台条款未取证不冒充有依据', () => {
  const docs = listPolicies({ platformId: 'zcode' }).docs;
  assert.equal(docs.length, 8);
  const byUrl = Object.fromEntries(docs.map((item) => [item.url, item]));
  // 两页官方文档与 CONTRIBUTING 本轮抓到正文，必须是 fetched。
  for (const url of [
    'https://zcode.z.ai/cn/docs/mcp-services',
    'https://zcode.z.ai/cn/docs/plugin',
    'https://github.com/zai-org/zcode-plugins/blob/main/CONTRIBUTING.md',
    'https://github.com/zai-org/zcode-plugins',
  ]) {
    assert.equal(byUrl[url].evidence, 'fetched', url);
    assert.equal(byUrl[url].kind, 'official', url);
  }
  // 本机样本是 sample / local，不能升格成「已抓官方正文」。
  assert.equal(byUrl['~/.zcode/cli/plugins/known_marketplaces.json'].evidence, 'sample');
  assert.equal(byUrl['~/.zcode/cli/plugins/known_marketplaces.json'].kind, 'local');
  assert.ok(byUrl['~/.zcode/cli/plugins/marketplaces/zcode-plugins-official/marketplace.json']
    .note.includes('componentTypes'));
  // 关键事实写字面值：嵌套键、schema 严格、不展开模板、PR 审核。
  assert.ok(byUrl['https://zcode.z.ai/cn/docs/mcp-services'].note.includes('mcp.servers'));
  assert.ok(byUrl['~/.zcode/cli/plugins/cache/zcode-plugins-official/zcode-guide/0.3.0/skills/diagnosing-mcp/SKILL.md']
    .note.includes('未知键'));
  assert.ok(byUrl['https://github.com/zai-org/zcode-plugins/blob/main/CONTRIBUTING.md'].note.includes('external_plugins/'));
  assert.ok(byUrl['https://zcode.z.ai/cn/docs/plugin'].note.includes('1–128 字符'));
  // policies 数组刻意为空：平台侧条款没有依据，不编造。
  assert.equal(listPlatforms({ platformId: 'zcode' }).platforms[0].policyCount, 0);
  const zcode = platforms.find((item) => item.id === 'zcode');
  assert.ok(zcode.notes.join(' ').includes('未取证'));
});
