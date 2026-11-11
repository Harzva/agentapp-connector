import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPreflight, renderSubmitSteps, PREFLIGHT_ITEMS } from '../src/preflight.mjs';
import { platforms } from '../src/policies.mjs';

test('七个平台都不可提交，前置项逐平台登记且不谎称已完成', () => {
  const preflight = buildPreflight();
  assert.equal(preflight.count, 7);
  assert.equal(preflight.readyCount, 0);
  assert.equal(preflight.submitted, 0);
  assert.equal(preflight.platforms.length, platforms.length);
  assert.equal(PREFLIGHT_ITEMS.length, 9);
  for (const row of preflight.platforms) {
    assert.equal(row.ready, false);
    assert.equal(row.status, 'not-submitted');
    assert.ok(row.missing.includes('public-https-mcp'));
    assert.ok(row.missing.includes('oauth'));
    assert.ok(row.missing.includes('tool-annotations'));
    assert.equal(row.checks.length, 9);
    assert.equal(row.checks.some((item) => item.state === 'done'), false);
    assert.ok(row.firstStep.length > 0);
    assert.ok(row.reviewDocs.length > 0);
  }
});

test('企业内 / 内测邀请 / 公开三种规范给出不同的第一步', () => {
  const byId = Object.fromEntries(buildPreflight().platforms.map((item) => [item.platform, item]));
  assert.equal(byId.qwenwork.submissionSpec, 'enterprise');
  assert.equal(byId.qwenwork.firstStep, '先让企业管理员开启「允许成员将连接器添加到组织连接器」，并准备 BASE_URL 与 admin.v1.connectors.manage scope');
  assert.equal(byId['doubao-work'].submissionSpec, 'invite-only');
  assert.ok(byId['doubao-work'].firstStep.includes('open.doubao.com 提交入驻意向'));
  assert.ok(byId.workbuddy.firstStep.includes('open.workbuddy.cn'));
  assert.ok(byId['chatgpt-codex'].firstStep.includes('platform.openai.com/apps-manage'));
  assert.ok(byId.cursor.firstStep.includes('cursor.com/marketplace/publish'));
  assert.ok(byId.claude.firstStep.includes('claude.ai/directory/manage'));
  // ZCode 走官方市场 GitHub PR，不是平台后台。
  assert.ok(byId.zcode.firstStep.includes('zai-org/zcode-plugins'));
  assert.ok(byId.zcode.firstStep.includes('external_plugins/'));
});

test('提交步骤覆盖七个平台，过滤单一平台时不混入其它平台', () => {
  const all = renderSubmitSteps();
  assert.ok(all.includes('市场上架提交步骤（当前不可提交）'));
  for (const platform of platforms) assert.ok(all.includes(`### ${platform.label}（${platform.id}）`));
  assert.ok(all.includes('POST /api/openapi/v1/connectors'));
  assert.ok(all.includes('插件源码树都没有'));
  const one = renderSubmitSteps({ platformId: 'qwenwork' });
  assert.ok(one.includes('千问办公'));
  assert.equal(one.includes('### Cursor（cursor）'), false);
  assert.throws(() => buildPreflight({ platformId: 'nope' }), /未知平台 nope/);
});
