import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLocalStatus, PLATFORM_CHECKS, STDIO_PLATFORM } from '../src/local-status.mjs';
import { buildVerifyReport, READ_ONLY_TOOLS } from '../src/verify.mjs';

function makeDoctor(statusMap = {}) {
  const ids = new Set(Object.values(PLATFORM_CHECKS)
    .flatMap((mapping) => [...mapping.apps, ...(mapping.runtime || []), ...mapping.config, ...mapping.ui]));
  return {
    checkedAt: '2026-11-11T00:00:00.000Z',
    verdict: 'partial',
    checks: [...ids].map((id) => ({
      id,
      status: statusMap[id] || 'ok',
      detail: `check ${id}`,
      nextStep: `next ${id}`,
    })),
  };
}

function byPlatform(report) {
  return Object.fromEntries(report.platforms.map((item) => [item.platform, item]));
}

test('配置文件写了但客户端没装，必须判成 client-missing 而不是通过', () => {
  const report = buildLocalStatus(makeDoctor({
    'claude-desktop-app': 'blocked',
    'qwenwork-client': 'blocked',
    'workbuddy-trusted': 'blocked',
    'doubao-connector-config': 'unknown',
  }), null);
  const byId = byPlatform(report);
  assert.equal(report.count, 7);
  assert.equal(report.verdict, 'partial');
  assert.equal(byId.claude.status, 'client-missing');
  assert.equal(byId.claude.configDeclared, true);
  assert.equal(byId.claude.clientAppInstalled, false);
  assert.equal(byId.qwenwork.status, 'client-missing');
  assert.equal(byId.workbuddy.status, 'needs-ui-trust');
  assert.equal(byId['doubao-work'].status, 'needs-manual-verification');
  // nextStep 必须指向「缺客户端」这一项，而不是配置检查项或兜底文案；
  // 具体文案由 local.mjs 的 buildReport 负责，在 local.test.mjs 里单独断言。
  assert.ok(byId.claude.nextStep.includes('claude-desktop-app'));
  assert.ok(!byId.claude.nextStep.includes('claude-desktop-config'));
});

test('CLI 桥 HTTP 不应答时判 runtime-blocked，不能用 UI 信任盖过去', () => {
  const report = buildLocalStatus(makeDoctor({
    'openbot-bridge-http': 'blocked',
    'workbuddy-trusted': 'blocked',
  }), { verdict: 'partial' });
  const byId = byPlatform(report);
  assert.equal(byId.workbuddy.status, 'runtime-blocked');
  assert.equal(byId.workbuddy.runtimeReachable, false);
  assert.equal(byId.workbuddy.clientAppInstalled, true);
  assert.equal(byId.workbuddy.configDeclared, true);
  assert.equal(byId.workbuddy.verifiedViaStdio, false);
  assert.ok(byId.workbuddy.nextStep.includes('openbot-bridge-http'));
  assert.ok(report.limitations.some((item) => item.includes('runtime-blocked')));
  assert.equal(byId.cursor.runtimeReachable, null);
  assert.equal(byId.cursor.status, 'declared');
});

test('只有 WorkBuddy stdio 能标 verified，其它平台一律 not-applicable', () => {
  const verification = { verdict: 'verified', summary: { ok: 3, failed: 0, total: 3 } };
  const report = buildLocalStatus(makeDoctor(), verification);
  const byId = byPlatform(report);
  assert.equal(report.verificationVerdict, 'verified');
  assert.equal(report.verdict, 'ready');
  assert.equal(byId.workbuddy.verifiedViaStdio, true);
  assert.equal(byId.workbuddy.verification.summary.ok, 3);
  for (const id of ['qwenwork', 'doubao-work', 'chatgpt-codex', 'cursor', 'claude', 'zcode']) {
    assert.equal(byId[id].verifiedViaStdio, false, id);
    assert.equal(byId[id].verification.verdict, 'not-applicable', id);
  }
  assert.ok(report.limitations.some((item) => item.includes('配置文件存在 ≠ 客户端已安装')));
  assert.ok(report.note.includes('liveTested'));
});

test('验证跑了但失败时，workbuddy 必须如实记失败并带出下层根因，不能写 not-applicable', () => {
  const verification = {
    verdict: 'partial',
    blockingReason: 'OpenBot CLI 桥文件在、TCP 能连，但 /v1/status 在 15s 内没有回包；桌面主进程可能卡住，重启 OpenBot.app 后重试',
    failureKinds: ['bridge-timeout'],
    summary: { ok: 0, failed: 3, total: 3 },
    timeout: { outerMs: 20000, connectorCallMs: 15000, defaultOuterMs: 20000, outerCanObserveConnectorCode: true },
    readOnlyOnly: true,
  };
  const report = buildLocalStatus(makeDoctor(), verification);
  const wb = byPlatform(report).workbuddy;
  assert.equal(report.verificationVerdict, 'partial');
  assert.equal(wb.verifiedViaStdio, false);
  assert.equal(wb.verification.verdict, 'partial');
  assert.equal(wb.verification.reason, verification.blockingReason);
  assert.deepEqual(wb.verification.failureKinds, ['bridge-timeout']);
  assert.equal(wb.verification.summary.failed, 3);
  assert.equal(wb.verification.timeout.outerMs, 20000);
  assert.equal(wb.verification.readOnlyOnly, true);
  assert.equal(wb.verification.reason.includes('没有可从外部进程直连'), false);
});

test('没跑验证时 workbuddy 是 not-run，其它平台仍是 not-applicable', () => {
  const report = buildLocalStatus(makeDoctor(), null);
  const byId = byPlatform(report);
  assert.equal(report.verificationVerdict, 'not-run');
  assert.equal(byId.workbuddy.verification.verdict, 'not-run');
  assert.ok(byId.workbuddy.verification.reason.includes('--no-verify'));
  assert.notEqual(byId.workbuddy.verification.verdict, 'not-applicable');
  for (const id of ['qwenwork', 'doubao-work', 'chatgpt-codex', 'cursor', 'claude', 'zcode']) {
    assert.equal(byId[id].verification.verdict, 'not-applicable', id);
  }
});

test('验证失败不贴到其它六平台，它们仍是不适用而不是被判失败', () => {
  const report = buildLocalStatus(makeDoctor(), {
    verdict: 'partial', blockingReason: '桌面端没运行', failureKinds: ['desktop-not-running'],
  });
  const byId = byPlatform(report);
  assert.equal(byId.workbuddy.verification.verdict, 'partial');
  for (const id of ['qwenwork', 'doubao-work', 'chatgpt-codex', 'cursor', 'claude', 'zcode']) {
    assert.equal(byId[id].verification.verdict, 'not-applicable', id);
    assert.equal(byId[id].verification.reason.includes('桌面端没运行'), false, id);
  }
});

test('verified 时 workbuddy 带 summary 且没有阻塞原因，其它平台仍不适用', () => {
  const verification = { verdict: 'verified', summary: { ok: 3, failed: 0, total: 3 }, blockingReason: null };
  const report = buildLocalStatus(makeDoctor(), verification);
  const byId = byPlatform(report);
  assert.equal(byId.workbuddy.verifiedViaStdio, true);
  assert.equal(byId.workbuddy.verification.verdict, 'verified');
  assert.equal(byId.workbuddy.verification.summary.ok, 3);
  assert.equal(byId.workbuddy.verification.blockingReason, null);
  assert.equal(byId.cursor.verification.verdict, 'not-applicable');
});

test('下层没给原因时不编造故障结论，也不退回 not-applicable', () => {
  const report = buildLocalStatus(makeDoctor(), { verdict: 'partial' });
  const wb = byPlatform(report).workbuddy;
  assert.equal(wb.verification.verdict, 'partial');
  assert.ok(wb.verification.reason.includes('不编造故障结论'));
  assert.notEqual(wb.verification.verdict, 'not-applicable');
  assert.deepEqual(wb.verification.failureKinds, []);
  assert.equal(wb.verification.timeout, null);
});

test('上层直接读下层 buildVerifyReport 的真实形状，不靠手写夹具', () => {
  const exchange = {
    status: 'ok',
    timeoutMs: 20000,
    calls: READ_ONLY_TOOLS.map((name) => ({
      name, responded: true, ok: false, isError: false,
      failureKind: 'bridge-timeout', error: 'OPENBOT_BRIDGE_TIMEOUT', summary: { code: 'OPENBOT_BRIDGE_TIMEOUT' },
    })),
  };
  const verification = buildVerifyReport(exchange);
  const wb = byPlatform(buildLocalStatus(makeDoctor(), verification)).workbuddy;
  assert.equal(verification.verdict, 'partial');
  assert.equal(wb.verification.verdict, 'partial');
  assert.equal(wb.verification.reason, verification.blockingReason);
  assert.deepEqual(wb.verification.failureKinds, ['bridge-timeout']);
  assert.equal(wb.verification.timeout.outerMs, 20000);
  assert.equal(wb.verification.summary.failed, 3);
  assert.equal(STDIO_PLATFORM, 'workbuddy');
});
