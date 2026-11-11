import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, existsSync, chmodSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  stdioExchange, buildVerifyReport, runVerifyLocal, READ_ONLY_TOOLS, CODE_KIND,
  CONNECTOR_CALL_TIMEOUT_MS, DEFAULT_VERIFY_TIMEOUT_MS,
} from '../src/verify.mjs';

const FAKE_SERVER = `
process.stdin.setEncoding('utf8');
let buf = '';
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf('\\n')) !== -1) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    const m = JSON.parse(line);
    let r;
    if (m.method === 'initialize') {
      r = { jsonrpc: '2.0', id: m.id, result: { protocolVersion: '2025-06-18', serverInfo: { name: 'fake-openbot', version: '1.0.33' }, capabilities: {} } };
    } else if (m.method === 'tools/list') {
      r = { jsonrpc: '2.0', id: m.id, result: { tools: [{ name: 'openbot_status' }, { name: 'openbot_bots' }, { name: 'openbot_tasks' }] } };
    } else if (m.method === 'tools/call') {
      r = { jsonrpc: '2.0', id: m.id, result: { content: [{ type: 'text', text: JSON.stringify({ ok: true, appVersion: '1.0.33', total: 43, count: 10 }) }], isError: false } };
    } else {
      r = { jsonrpc: '2.0', id: m.id, error: { message: 'unknown method' } };
    }
    process.stdout.write(JSON.stringify(r) + '\\n');
  }
});
`;

/** 复刻真实故障：openbot_status 是 isError=false，但正文 ok=false；另两个工具是 isError=true。 */
function makeDeadServer(code, message, forceNoError = false) {
  const payload = code
    ? { ok: false, reachable: false, code, message }
    : { ok: false, reachable: false, message };
  return `
const DEAD = ${JSON.stringify(payload)};
process.stdin.setEncoding('utf8');
let buf = '';
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf('\\n')) !== -1) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    const m = JSON.parse(line);
    let r;
    if (m.method === 'initialize') {
      r = { jsonrpc: '2.0', id: m.id, result: { protocolVersion: '2025-06-18', serverInfo: { name: 'fake-openbot', version: '1.0.33' }, capabilities: {} } };
    } else if (m.method === 'tools/list') {
      r = { jsonrpc: '2.0', id: m.id, result: { tools: [{ name: 'openbot_status' }, { name: 'openbot_bots' }, { name: 'openbot_tasks' }] } };
    } else if (m.method === 'tools/call') {
      const isStatus = m.params.name === 'openbot_status';
      r = { jsonrpc: '2.0', id: m.id, result: {
        content: [{ type: 'text', text: JSON.stringify(DEAD) }],
        structuredContent: DEAD,
        isError: ${forceNoError ? 'false' : '!isStatus'},
      } };
    } else {
      r = { jsonrpc: '2.0', id: m.id, error: { message: 'unknown method' } };
    }
    process.stdout.write(JSON.stringify(r) + '\\n');
  }
});
`;
}

const FAKE_SERVER_DEAD = makeDeadServer(
  'OPENBOT_DESKTOP_NOT_RUNNING',
  '找不到本机 OpenBot CLI 桥（endpoint.json / token 不存在），桌面端没有在运行。',
);
const FAKE_SERVER_BRIDGE_TIMEOUT = makeDeadServer(
  'OPENBOT_BRIDGE_TIMEOUT',
  'OpenBot CLI 桥在 15s 内没有响应。',
);
// 真实形态之一：正文声明失败但完全没有错误码，isError 也是 false。
const FAKE_SERVER_NO_CODE = makeDeadServer(null, '桥返回异常，但没有给错误码', true);

function withFakeServer(fn, source = FAKE_SERVER) {
  const dir = mkdtempSync(join(tmpdir(), 'agentapp-verify-'));
  const script = join(dir, 'server.cjs');
  writeFileSync(script, source, 'utf8');
  return Promise.resolve(fn(script)).finally(() => rmSync(dir, { recursive: true, force: true }));
}

/** runVerifyLocal 直接用 spawn(connectorPath)，所以要给一个带 shebang 的可执行假服务器。 */
function withExecutableServer(fn, source = FAKE_SERVER) {
  const dir = mkdtempSync(join(tmpdir(), 'agentapp-verify-exec-'));
  const script = join(dir, 'server.cjs');
  writeFileSync(script, `#!${process.execPath}\n${source}`, 'utf8');
  chmodSync(script, 0o755);
  return Promise.resolve(fn(script)).finally(() => rmSync(dir, { recursive: true, force: true }));
}

test('verify-local 对真实子进程发出三个只读 tools/call 并解析响应', async () => {
  await withFakeServer(async (script) => {
    const exchange = await stdioExchange({ command: process.execPath, args: [script], timeoutMs: 6000 });
    assert.equal(exchange.status, 'ok');
    assert.equal(exchange.serverInfo.name, 'fake-openbot');
    assert.equal(exchange.toolCount, 3);
    assert.deepEqual(exchange.calls.map((item) => item.name), READ_ONLY_TOOLS);
    for (const call of exchange.calls) {
      assert.equal(call.responded, true);
      assert.equal(call.ok, true);
      assert.equal(call.isError, false);
      assert.equal(call.summary.appVersion, '1.0.33');
    }
    const report = buildVerifyReport(exchange, { now: '2026-11-11T00:00:00.000Z' });
    assert.equal(report.verdict, 'verified');
    assert.equal(report.summary.ok, 3);
    assert.equal(report.summary.failed, 0);
  });
});

test('isError=false 但正文 ok=false / reachable=false 时必须判失败，不能靠形状猜成败', async () => {
  await withFakeServer(async (script) => {
    const exchange = await stdioExchange({ command: process.execPath, args: [script], timeoutMs: 6000 });
    assert.equal(exchange.status, 'ok');
    const [status, bots, tasks] = exchange.calls;
    assert.equal(status.isError, false);
    assert.equal(status.ok, false);
    assert.equal(status.failureKind, 'desktop-not-running');
    assert.equal(status.summary.reachable, false);
    assert.equal(status.summary.code, 'OPENBOT_DESKTOP_NOT_RUNNING');
    assert.ok(status.error.includes('OPENBOT_DESKTOP_NOT_RUNNING'));
    assert.equal(bots.ok, false);
    assert.equal(tasks.ok, false);
    assert.equal(bots.isError, true);
    // 同一个错误码是同一个根因，不能因为 isError 形状不同被拆成两种原因。
    assert.deepEqual(exchange.calls.map((item) => item.failureKind), [
      'desktop-not-running', 'desktop-not-running', 'desktop-not-running',
    ]);
    const report = buildVerifyReport(exchange);
    assert.equal(report.verdict, 'partial');
    assert.equal(report.summary.ok, 0);
    assert.equal(report.summary.failed, 3);
    assert.deepEqual(report.failureKinds, ['desktop-not-running']);
    assert.ok(report.blockingReason.includes('OpenBot.app'));
    assert.ok(report.limitations.some((item) => item.includes('isError=false 也可能是桌面端没开')));
  }, FAKE_SERVER_DEAD);
});

test('桥超时与「桌面没开」是两个原因，且同一错误码不因 isError 形状被拆分', async () => {
  await withFakeServer(async (script) => {
    const exchange = await stdioExchange({ command: process.execPath, args: [script], timeoutMs: 6000 });
    assert.equal(exchange.status, 'ok');
    // 期望值写字面值，不读被测实现导出的 CODE_KIND，避免两边一起改仍全绿。
    assert.deepEqual(exchange.calls.map((item) => item.failureKind), [
      'bridge-timeout', 'bridge-timeout', 'bridge-timeout',
    ]);
    const report = buildVerifyReport(exchange);
    assert.equal(report.verdict, 'partial');
    assert.deepEqual(report.failureKinds, ['bridge-timeout']);
    assert.ok(report.blockingReason.includes('重启 OpenBot.app'));
    assert.ok(report.blockingReason.includes('/v1/status'));
    assert.notEqual(report.blockingReason, 'desktop-not-running');
    assert.equal(report.calls[0].summary.code, 'OPENBOT_BRIDGE_TIMEOUT');
  }, FAKE_SERVER_BRIDGE_TIMEOUT);
  // 交叉校验：登记表必须与测试里的字面值一致。
  assert.equal(CODE_KIND.OPENBOT_BRIDGE_TIMEOUT, 'bridge-timeout');
  assert.equal(CODE_KIND.OPENBOT_DESKTOP_NOT_RUNNING, 'desktop-not-running');
});

test('isError=false 且没有错误码时，正文 ok=false / reachable=false 仍必须判失败', async () => {
  await withFakeServer(async (script) => {
    const exchange = await stdioExchange({ command: process.execPath, args: [script], timeoutMs: 6000 });
    assert.equal(exchange.status, 'ok');
    assert.deepEqual(exchange.calls.map((item) => item.failureKind), [
      'body-not-ok', 'body-not-ok', 'body-not-ok',
    ]);
    assert.equal(exchange.calls[0].summary.code, undefined);
    assert.equal(exchange.calls[0].summary.ok, false);
    assert.equal(exchange.calls[0].summary.reachable, false);
    assert.equal(exchange.calls[0].isError, false);
    const report = buildVerifyReport(exchange);
    assert.equal(report.verdict, 'partial');
    assert.equal(report.summary.ok, 0);
    assert.deepEqual(report.failureKinds, ['body-not-ok']);
    assert.ok(report.blockingReason.includes('协议层成功不等于验证通过'));
  }, FAKE_SERVER_NO_CODE);
});

test('子进程起不来时如实记为 spawn-failed，不压成空结果', async () => {
  const exchange = await stdioExchange({
    command: '/agentapp/no-such-mcp-server-xyz', args: [], timeoutMs: 1000,
  });
  assert.equal(exchange.status, 'spawn-failed');
  assert.ok(exchange.reason);
  const report = buildVerifyReport(exchange);
  assert.equal(report.verdict, 'partial');
  assert.equal(report.readOnlyOnly, true);
});

test('报告只声明只读能力，且明确不等于客户端内实机连接', () => {
  const failed = buildVerifyReport({
    status: 'timeout',
    timeoutMs: 20000,
    reason: '20000ms 内没有收齐 5 个响应（上游连接器每次桥调用自带 15000ms 超时；本次外层留有观察上游错误码的余量）',
    calls: READ_ONLY_TOOLS.map((name, index) => ({
      name, responded: index < 2, ok: index < 2, isError: false, error: null, summary: {},
    })),
  });
  assert.equal(failed.verdict, 'partial');
  assert.equal(failed.timeout.outerMs, 20000);
  assert.equal(failed.timeout.outerCanObserveConnectorCode, true);
  assert.equal(failed.summary.ok, 2);
  assert.equal(failed.summary.failed, 1);
  assert.deepEqual(failed.toolsCalled, ['openbot_status', 'openbot_bots', 'openbot_tasks']);
  assert.equal(failed.readOnlyOnly, true);
  assert.ok(failed.limitations.some((item) => item.includes('没有派发任务')));
  assert.ok(failed.limitations.some((item) => item.includes('不等于在 WorkBuddy / Cursor / Codex / Claude 的对话里')));
  assert.equal(READ_ONLY_TOOLS.includes('openbot_dispatch'), false);
});

test('默认外层超时按规则文档写死为 20000ms，且必须比上游桥调用长', () => {
  // 期望值写字面数字，不拿被测实现的导出常量互相当期望，避免两边一起改仍全绿。
  assert.equal(CONNECTOR_CALL_TIMEOUT_MS, 15000);
  assert.equal(DEFAULT_VERIFY_TIMEOUT_MS, 20000);
  assert.equal(DEFAULT_VERIFY_TIMEOUT_MS - CONNECTOR_CALL_TIMEOUT_MS, 5000);
  assert.ok(DEFAULT_VERIFY_TIMEOUT_MS > CONNECTOR_CALL_TIMEOUT_MS);
});

test('上游 connector.cjs 存在时交叉校验桥调用超时，防止登记值悄悄漂移', (t) => {
  const upstream = fileURLToPath(new URL('../../openbot-workbuddy-connector/connector.cjs', import.meta.url));
  if (existsSync(upstream)) {
    const source = readFileSync(upstream, 'utf8');
    const match = source.match(/const\s+CALL_TIMEOUT_MS\s*=\s*(\d+)\s*;/);
    assert.ok(match, '上游 connector.cjs 里找不到 CALL_TIMEOUT_MS 声明');
    assert.equal(Number(match[1]), 15000);
    assert.equal(Number(match[1]), CONNECTOR_CALL_TIMEOUT_MS);
    t.diagnostic(`已按上游源码交叉校验：CALL_TIMEOUT_MS=${match[1]}`);
  } else {
    // 本工程可独立分发，兄弟源码可能不在同一工作区；此处不做交叉校验，但不跳过用例。
    assert.equal(CONNECTOR_CALL_TIMEOUT_MS, 15000);
    t.diagnostic('兄弟工程 connector.cjs 不在本工作区，本轮只校验登记值，未做源码交叉校验');
  }
});

test('stdioExchange 不传超时时确实使用 20s 默认值，并把口径带回结果', async () => {
  await withFakeServer(async (script) => {
    const exchange = await stdioExchange({ command: process.execPath, args: [script] });
    assert.equal(exchange.status, 'ok');
    assert.equal(exchange.timeoutMs, 20000);
  });
});

test('runVerifyLocal 默认 20s，报告带外层/上游口径与可观察性判断', async () => {
  await withExecutableServer(async (script) => {
    const report = await runVerifyLocal({ connectorPath: script, now: '2026-11-11T00:00:00.000Z' });
    assert.equal(report.verdict, 'verified');
    assert.equal(report.timeout.outerMs, 20000);
    assert.equal(report.timeout.connectorCallMs, 15000);
    assert.equal(report.timeout.defaultOuterMs, 20000);
    assert.equal(report.timeout.outerCanObserveConnectorCode, true);
    assert.ok(report.limitations.some((item) => item.includes('15000ms') && item.includes('20000ms')));
  });
});

test('显式把外层调到 5s 时如实标记「看不到上游错误码」，不假装可观察', async () => {
  await withExecutableServer(async (script) => {
    const report = await runVerifyLocal({ connectorPath: script, timeoutMs: 5000 });
    assert.equal(report.verdict, 'verified');
    assert.equal(report.timeout.outerMs, 5000);
    assert.equal(report.timeout.outerCanObserveConnectorCode, false);
  });
});

test('runVerifyLocal 拒绝非法的显式超时，不用默认值把它悄悄盖掉', async () => {
  await assert.rejects(
    () => runVerifyLocal({ connectorPath: '/agentapp/no-such', timeoutMs: 0 }),
    /timeoutMs 需为 1000–60000 的整数/,
  );
});

test('外层超时但已收到上游错误码时，blockingReason 解释根因而不是外层等待时间', () => {
  const report = buildVerifyReport({
    status: 'timeout',
    timeoutMs: 20000,
    reason: '20000ms 内没有收齐 5 个响应',
    calls: [
      { name: 'openbot_status', responded: true, ok: false, isError: false, failureKind: 'bridge-timeout', error: 'OPENBOT_BRIDGE_TIMEOUT', summary: {} },
      { name: 'openbot_bots', responded: false, ok: false, isError: false, failureKind: 'no-response', error: '无响应', summary: {} },
      { name: 'openbot_tasks', responded: false, ok: false, isError: false, failureKind: 'no-response', error: '无响应', summary: {} },
    ],
  });
  assert.equal(report.verdict, 'partial');
  assert.deepEqual(report.failureKinds, ['bridge-timeout', 'no-response']);
  assert.ok(report.blockingReason.includes('/v1/status'));
  assert.ok(report.blockingReason.includes('15s'));
  assert.ok(report.blockingReason.includes('重启 OpenBot.app'));
  assert.equal(report.blockingReason.includes('没有收齐'), false);
  // 外层原文仍留在 reason 里，不丢证据。
  assert.ok(report.reason.includes('20000ms'));
});

test('超时但没有上游错误码时，不能凭 no-response 编出一个根因', () => {
  const report = buildVerifyReport({
    status: 'timeout',
    timeoutMs: 20000,
    reason: '20000ms 内没有收齐 5 个响应',
    calls: READ_ONLY_TOOLS.map((name) => ({
      name, responded: false, ok: false, isError: false,
      failureKind: 'no-response', error: '无响应', summary: {},
    })),
  });
  assert.equal(report.blockingReason, '20000ms 内没有收齐 5 个响应');
});
