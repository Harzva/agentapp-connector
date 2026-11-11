import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import net from 'node:net';
import http from 'node:http';
import {
  readJsonSafe, readTextSafe, pathInfo, stdioHandshake, probeTcp,
  probeBridgeHttp, runCommand, buildReport, hasCodexOpenbotTable,
  inspectCodexTable, CODEX_LAUNCH_KEYS,
  inspectMcpDeclaration, MCP_LAUNCH_KEYS,
  inspectCodexCli, codexCliPresentation, BRIDGE_HTTP_STATUS, BRIDGE_NEXT_STEP,
} from '../src/local.mjs';

const FAKE_SERVER = String.raw`
const readline = require('node:readline');
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  let m;
  try { m = JSON.parse(line); } catch { return; }
  let result = {};
  if (m.method === 'initialize') result = { protocolVersion: '2025-06-18', serverInfo: { name: 'fake-mcp', version: '1.0.0' } };
  if (m.method === 'tools/list') result = { tools: [{ name: 'probe_one' }, { name: 'probe_two' }] };
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: m.id, result }) + "\n");
});
`;

function facts(overrides = {}) {
  return {
    checkedAt: '2026-11-11T00:00:00.000Z',
    home: '/tmp/agentapp-home',
    apps: {
      workbuddy: true, doubao: true, chatgpt: true, cursor: true,
      claude: false, openbot: true, qwenwork: false, zcode: true,
    },
    // 夹具代表本机真实状态：openbot 是 stdio 声明，有 command，不是空对象。
    workbuddyMcp: {
      exists: true,
      parsed: { mcpServers: { openbot: { command: '/opt/openbot/run.sh', args: [] } } },
      error: null,
    },
    approvals: { exists: true, parsed: {}, error: null },
    codexConfig: { exists: true, text: '[mcp_servers.openbot]\nurl = "x"\n', error: null },
    cursorMcp: { exists: false, parsed: null, error: null },
    // 复刻本机真实状态：~/.zcode/cli/config.json 存在但没有 mcp.servers，openbot 未声明。
    zcodeConfig: {
      exists: true,
      parsed: { plugins: { 'zcode-guide': true } },
      error: null,
    },
    claudeConfig: { exists: false, parsed: null, error: null },
    // 复刻本机真实状态：桥文件都在，TCP 能连，但 /v1/status 永不回包。
    openbotEndpoint: { exists: true, executable: false },
    openbotToken: { exists: true, executable: false },
    connectorRunSh: { exists: true, executable: true },
    port4818: { status: 'refused', reason: '连接被拒绝：4818 没有监听' },
    bridgeHttp: { status: 'timeout', reason: '1800ms 内没有 HTTP 响应', port: 55066 },
    handshake: { status: 'ok', tools: ['a', 'b'], toolCount: 2 },
    // 复刻本机 `codex mcp list` 的真实表格形状：含 Name / Status 列，openbot 为 enabled。
    codexCli: {
      status: 'ok',
      stdout: [
        'Name          Command                       Status    Auth',
        'computer-use  ./SkyComputerUseClient         disabled  Unsupported',
        'openbot       /opt/openbot/run.sh            enabled   Unsupported',
        '',
      ].join('\n'),
    },
    ...overrides,
  };
}

test('文件探测按存在 / 非法 JSON / 可执行位分原因', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentapp-probe-'));
  try {
    const good = join(dir, 'good.json');
    const bad = join(dir, 'bad.json');
    writeFileSync(good, '{"a":1}');
    writeFileSync(bad, 'not json');
    assert.deepEqual(readJsonSafe(good), { exists: true, parsed: { a: 1 }, error: null });
    assert.deepEqual(readJsonSafe(bad), { exists: true, parsed: null, error: 'invalid-json-or-unreadable' });
    assert.deepEqual(readJsonSafe(join(dir, 'missing')), { exists: false, parsed: null, error: null });
    assert.equal(readTextSafe(good).text, '{"a":1}');
    assert.equal(pathInfo(good).exists, true);
    assert.equal(pathInfo(good).executable, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('stdioHandshake 对真实子进程收齐 initialize / tools/list / ping', async () => {
  const result = await stdioHandshake({
    command: process.execPath, args: ['-e', FAKE_SERVER], timeoutMs: 4000,
  });
  assert.equal(result.status, 'ok');
  assert.deepEqual(result.tools, ['probe_one', 'probe_two']);
  assert.equal(result.toolCount, 2);
  assert.equal(result.protocolVersion, '2025-06-18');
  assert.deepEqual(result.serverInfo, { name: 'fake-mcp', version: '1.0.0' });
  assert.deepEqual(result.responses, { initialize: true, toolsList: true, ping: true });
});

test('stdioHandshake 把超时 / 起不来分成不同原因，不压成一个空串', async () => {
  const timedOut = await stdioHandshake({
    command: process.execPath,
    args: ['-e', 'setInterval(() => {}, 1000);'],
    timeoutMs: 350,
  });
  assert.equal(timedOut.status, 'timeout');
  assert.ok(timedOut.reason.includes('350ms'));
  assert.equal(timedOut.received, 0);

  const missing = await stdioHandshake({
    command: '/definitely/not/a/binary', args: [], timeoutMs: 1000,
  });
  assert.equal(missing.status, 'spawn-failed');
  assert.ok(missing.reason.length > 0);
});

test('probeTcp 区分监听与被拒绝，runCommand 区分命令不存在', async () => {
  const server = net.createServer();
  await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));
  const port = server.address().port;
  try {
    assert.equal((await probeTcp({ port, timeoutMs: 1000 })).status, 'listening');
  } finally {
    await new Promise((resolvePromise) => server.close(resolvePromise));
  }
  const refused = await probeTcp({ port: 65534, timeoutMs: 1000 });
  assert.ok(['refused', 'timeout'].includes(refused.status));
  assert.deepEqual(runCommand('agentapp-no-such-command-xyz', [], 500), { status: 'not-found', stdout: '' });
});

test('buildReport 把事实翻译成 ok / blocked / unknown，不把「看不到」写成「没有」', () => {
  const report = buildReport(facts());
  assert.equal(report.checkedAt, '2026-11-11T00:00:00.000Z');
  assert.equal(report.summary.total, 19);
  assert.equal(report.verdict, 'partial');
  assert.equal(report.stdioProtocolOk, true);
  assert.deepEqual(report.registryProblems, []);
  const byId = Object.fromEntries(report.checks.map((item) => [item.id, item]));
  assert.equal(byId['stdio-handshake'].status, 'ok');
  assert.ok(byId['stdio-handshake'].detail.includes('2 个工具（a, b）'));
  assert.equal(byId['openbot-service-4818'].status, 'blocked');
  // 文件存在是 ok，但同一份事实里的 HTTP 超时必须单独判 blocked，不许被文件存在盖过去。
  assert.equal(byId['openbot-cli-bridge'].status, 'ok');
  assert.ok(byId['openbot-cli-bridge'].detail.includes('另看 openbot-bridge-http'));
  assert.equal(byId['openbot-bridge-http'].status, 'blocked');
  assert.ok(byId['openbot-bridge-http'].detail.includes('timeout'));
  assert.equal(buildReport(facts({ bridgeHttp: { status: 'ok', reason: 'HTTP 200', port: 55066 } }))
    .checks.find((item) => item.id === 'openbot-bridge-http').status, 'ok');
  assert.equal(byId['workbuddy-declared'].status, 'ok');
  assert.equal(byId['workbuddy-trusted'].status, 'blocked');
  assert.equal(byId['codex-config'].status, 'ok');
  // 夹具里本机装了 Cursor.app 但没装 Claude.app：客户端与配置必须分别判定。
  assert.equal(byId['cursor-app'].status, 'ok');
  assert.equal(byId['cursor-config'].status, 'blocked');
  assert.equal(byId['claude-desktop-app'].status, 'blocked');
  assert.equal(byId['claude-desktop-config'].status, 'blocked');
  assert.equal(byId['qwenwork-client'].status, 'blocked');
  assert.equal(byId['doubao-connector-config'].status, 'unknown');
  // 客户端缺失时，下一步必须指向「装客户端」，不能只叫人再写一遍配置。
  assert.ok(byId['claude-desktop-app'].nextStep.includes('安装 Claude Desktop'));
  assert.ok(byId['cursor-app'].nextStep.includes('安装 Cursor 客户端'));
  assert.ok(byId['stdio-handshake'].nextStep.includes('不等于 WorkBuddy UI 已注入工具'));
  // 客户端装了 / 没装，不能反过来影响配置文件探测的结论。
  const noCursor = buildReport(facts({ apps: { ...facts().apps, cursor: false } }));
  const noCursorById = Object.fromEntries(noCursor.checks.map((item) => [item.id, item]));
  assert.equal(noCursorById['cursor-app'].status, 'blocked');
  assert.equal(noCursorById['cursor-config'].status, 'blocked');
  assert.equal(noCursorById['claude-desktop-app'].status, 'blocked');
  assert.equal(noCursor.summary.total, 19);
  assert.ok(report.limitations.includes('所有 target 的 liveTested 仍为 false：客户端内实机连接尚未验收。'));
});

test('buildReport 对握手失败 / 端口超时 / CLI 超时给出不同状态', () => {
  const report = buildReport(facts({
    handshake: { status: 'timeout', reason: '4000ms 内没有收齐 3 个响应' },
    port4818: { status: 'timeout', reason: '1200ms 未连接成功' },
    codexCli: { status: 'timeout', stdout: '' },
    approvals: { exists: false, parsed: null, error: null },
  }));
  const byId = Object.fromEntries(report.checks.map((item) => [item.id, item]));
  assert.equal(report.stdioProtocolOk, false);
  assert.equal(byId['stdio-handshake'].status, 'blocked');
  assert.ok(byId['stdio-handshake'].detail.includes('timeout'));
  assert.equal(byId['openbot-service-4818'].status, 'unknown');
  assert.equal(byId['codex-cli'].status, 'unknown');
  assert.equal(byId['workbuddy-trusted'].status, 'blocked');
  assert.ok(byId['workbuddy-trusted'].detail.includes('不存在'));
  assert.equal(report.checks.every((item) => ['ok', 'blocked', 'unknown'].includes(item.status)), true);
});

test('跳过握手记 unknown / stdioProtocolOk=null，不把「没跑」算进 blocked', () => {
  const skipped = buildReport(facts({ handshake: { status: 'skipped', reason: '调用方跳过握手' } }));
  const skippedById = Object.fromEntries(skipped.checks.map((item) => [item.id, item]));
  const handshake = skippedById['stdio-handshake'];
  assert.equal(handshake.status, 'unknown');
  assert.ok(handshake.detail.includes('本次未执行'));
  assert.ok(handshake.detail.includes('这不是握手失败'));
  assert.ok(handshake.detail.includes('调用方跳过握手'));
  assert.equal(handshake.detail.includes('握手未通过'), false);
  assert.ok(handshake.nextStep.includes('去掉 --no-handshake'));
  assert.ok(handshake.nextStep.includes('--no-verify'));
  assert.equal(skipped.stdioProtocolOk, null);
  assert.equal(skipped.summary.total, 19);

  // 同一份事实只把 status 换成真正的失败，才能确认不是「所有非 ok 都变 unknown」。
  const failed = buildReport(facts({ handshake: { status: 'timeout', reason: '4000ms 内没有收齐 3 个响应' } }));
  assert.equal(failed.checks.find((item) => item.id === 'stdio-handshake').status, 'blocked');
  assert.equal(failed.stdioProtocolOk, false);
  assert.equal(failed.summary.blocked, skipped.summary.blocked + 1);
  assert.equal(failed.summary.unknown, skipped.summary.unknown - 1);
  assert.equal(failed.summary.ok, skipped.summary.ok);
});

test('skipped 与 ok 只差一项状态，不会丢检查项也不会冒充握手通过', () => {
  const okReport = buildReport(facts());
  const skipped = buildReport(facts({ handshake: { status: 'skipped', reason: '调用方跳过握手' } }));
  assert.equal(okReport.stdioProtocolOk, true);
  assert.equal(okReport.checks.find((item) => item.id === 'stdio-handshake').status, 'ok');
  assert.equal(okReport.summary.ok, skipped.summary.ok + 1);
  assert.equal(okReport.summary.unknown, skipped.summary.unknown - 1);
  assert.equal(okReport.summary.blocked, skipped.summary.blocked);
  assert.deepEqual(okReport.checks.map((item) => item.id), skipped.checks.map((item) => item.id));
  // 跳过只影响这一项，其余仍按事实判定，报告照样是完整 19 项。
  assert.equal(skipped.checks.length, 19);
  assert.equal(skipped.verdict, 'partial');
});

test('codex-config 的表存在性按表头结构判断，注释不算、表头内空格算', () => {
  // 期望值写字面表头，不读被测实现导出的常量；这三种是 TOML 标准解析器认可的真实形态。
  assert.equal(hasCodexOpenbotTable('[mcp_servers.openbot]\ncommand = "x"\n'), true);
  assert.equal(hasCodexOpenbotTable('[ mcp_servers.openbot ]\ncommand = "x"\n'), true);
  assert.equal(hasCodexOpenbotTable('model = "gpt-5"\n# [mcp_servers.openbot] was here\n[other]\na = 1\n'), false);
  assert.equal(hasCodexOpenbotTable('note = "[mcp_servers.openbot]"\n'), false);
  assert.equal(hasCodexOpenbotTable('[mcp_servers.openbot.extra]\na = 1\n'), false);
  assert.equal(hasCodexOpenbotTable('# [mcp_servers.openbot]\n[mcp_servers.openbot]\ncommand = "x"\n'), true);
  for (const empty of ['', undefined, null, 123]) assert.equal(hasCodexOpenbotTable(empty), false);
});

test('buildReport 不把注释里的表名当配置，也不把带空格的合法表头说成没配', () => {
  const codexOf = (text) => buildReport(facts({ codexConfig: { exists: true, text, error: null } }))
    .checks.find((item) => item.id === 'codex-config');

  const spaced = codexOf('model = "gpt-5"\n\n[ mcp_servers.openbot ]\ncommand = "/opt/openbot/run.sh"\n');
  assert.equal(spaced.status, 'ok');
  // 产品行为从「只判表头」升级到「还要判启动键」后，detail 跟着行为改；
  // 断言钉的是新语义（已声明且有启动键），不再钉旧的字符串 `openbot 表=true`。
  assert.ok(spaced.detail.includes('已声明且含启动键 command/url'));

  const commented = codexOf('model = "gpt-5"\n# [mcp_servers.openbot] was here\n[other]\na = 1\n');
  assert.equal(commented.status, 'blocked');
  assert.ok(commented.detail.includes('openbot 表=false'));
  assert.equal(commented.detail.includes('表头结构判断'), true);

  assert.equal(codexOf('[mcp_servers.openbot]\ncommand = "x"\n').status, 'ok');
  // 文件不存在时仍按事实写，不因为「没读到文本」编出一句「表存在」。
  const missing = buildReport(facts({ codexConfig: { exists: false, text: '', error: null } }))
    .checks.find((item) => item.id === 'codex-config');
  assert.equal(missing.status, 'blocked');
  assert.ok(missing.detail.includes('不存在'));
});

test('inspectCodexTable 把空表 / 只有注释 / 有启动键分开，注释与字符串值不算键', () => {
  assert.deepEqual(inspectCodexTable('[mcp_servers.openbot]\n'), {
    verdict: 'empty-table', declared: true, keys: [], hasLaunchKey: false,
  });
  const commented = inspectCodexTable('[mcp_servers.openbot]\n# command = "/fake"\n# url = "x"\n');
  assert.equal(commented.verdict, 'empty-table');
  assert.deepEqual(commented.keys, []);
  const asValue = inspectCodexTable('[mcp_servers.openbot]\nnote = "command"\n');
  assert.equal(asValue.verdict, 'empty-table');
  assert.deepEqual(asValue.keys, ['note']);

  const stdio = inspectCodexTable('[ mcp_servers.openbot ]\ncommand = "x"\nargs = []\n');
  assert.equal(stdio.verdict, 'ready');
  assert.deepEqual(stdio.keys, ['command', 'args']);
  assert.equal(stdio.hasLaunchKey, true);
  assert.equal(inspectCodexTable('[mcp_servers.openbot]\nurl = "https://mcp.example.invalid/mcp"\n').verdict, 'ready');

  // 子表被当作下一表头截断，子表里的 command 不能冒充主表的启动键。
  const sub = inspectCodexTable('[mcp_servers.openbot]\n[mcp_servers.openbot.extra]\ncommand = "x"\n');
  assert.equal(sub.verdict, 'empty-table');
  assert.deepEqual(sub.keys, []);
  assert.equal(inspectCodexTable('model = "gpt-5"\n').verdict, 'no-table');
  assert.equal(inspectCodexTable(undefined).declared, false);
  // 期望值写字面值，不读回被测实现导出的常量当唯一依据。
  assert.deepEqual(CODEX_LAUNCH_KEYS, ['command', 'url']);
});

test('codex-config 把「表存在但没启动键」判 blocked，读不到判 unknown，指引按根因分', () => {
  const codexOf = (config) => buildReport(facts({ codexConfig: config }))
    .checks.find((item) => item.id === 'codex-config');

  const empty = codexOf({ exists: true, text: '[mcp_servers.openbot]\n', error: null });
  assert.equal(empty.status, 'blocked');
  assert.ok(empty.detail.includes('没有 command / url'));
  assert.ok(empty.detail.includes('表存在 ≠ 可用'));
  assert.ok(empty.nextStep.includes('--force'));

  const ready = codexOf({ exists: true, text: '[mcp_servers.openbot]\ncommand = "x"\n', error: null });
  assert.equal(ready.status, 'ok');
  assert.ok(ready.detail.includes('keys=[command]'));
  assert.ok(ready.nextStep.includes('磁盘声明'));
  assert.equal(ready.nextStep.includes('--force'), false);

  const unreadable = codexOf({ exists: true, text: null, error: 'unreadable' });
  assert.equal(unreadable.status, 'unknown');
  assert.ok(unreadable.detail.includes('读不到'));
  assert.ok(unreadable.nextStep.includes('检查文件权限'));

  const missing = codexOf({ exists: false, text: null, error: null });
  assert.equal(missing.status, 'blocked');
  assert.ok(missing.detail.includes('不存在'));
  assert.ok(missing.nextStep.includes('生成 TOML 表并追加'));
  assert.notEqual(empty.status, ready.status);
});

test('inspectMcpDeclaration 把空对象 / 缺启动键 / 合法声明 / 解析失败分开', () => {
  const of = (parsed, error = null, exists = true) => inspectMcpDeclaration({ exists, parsed, error });
  const empty = of({ mcpServers: { openbot: {} } });
  assert.equal(empty.verdict, 'incomplete');
  assert.equal(empty.declared, true);
  assert.deepEqual(empty.keys, []);

  const typeOnly = of({ mcpServers: { openbot: { type: 'streamableHttp' } } });
  assert.equal(typeOnly.verdict, 'incomplete');
  assert.deepEqual(typeOnly.keys, ['type']);

  const stdio = of({ mcpServers: { openbot: { command: 'x', args: [] } } });
  assert.equal(stdio.verdict, 'ready');
  assert.deepEqual(stdio.keys, ['command', 'args']);
  assert.equal(stdio.hasLaunchKey, true);
  assert.equal(of({ mcpServers: { openbot: { type: 'streamableHttp', url: 'https://mcp.example.invalid/mcp' } } })
    .verdict, 'ready');

  // 值里出现 command/url 字样不等于有启动键，防止退回字符串包含判断。
  assert.equal(of({ mcpServers: { openbot: { note: 'command' } } }).verdict, 'incomplete');
  assert.equal(of({ mcpServers: { openbot: 'yes' } }).verdict, 'incomplete');
  assert.equal(of({ mcpServers: { openbot: [] } }).verdict, 'incomplete');
  assert.equal(of({ mcpServers: {} }).verdict, 'missing');
  assert.equal(of(null, null, false).verdict, 'missing');
  assert.equal(of(null, 'invalid-json-or-unreadable').verdict, 'unreadable');
  // JSON 字面上是 null 与「读失败」是两回事，不能都当成拿不到证据。
  assert.equal(of(null, null).verdict, 'missing');
  assert.deepEqual(MCP_LAUNCH_KEYS, ['command', 'url']);
});

test('三个 JSON 客户端检查项共用一套声明判定，空对象与非法 JSON 不算已配', () => {
  const ids = ['workbuddy-declared', 'cursor-config', 'claude-desktop-config'];
  const fileOf = (parsed, error = null, exists = true) => ({ exists, parsed, error });
  const reportOf = (file) => buildReport(facts({
    workbuddyMcp: file, cursorMcp: file, claudeConfig: file,
  }));
  const checkOf = (report, id) => report.checks.find((item) => item.id === id);

  const empty = reportOf(fileOf({ mcpServers: { openbot: {} } }));
  for (const id of ids) {
    const item = checkOf(empty, id);
    assert.equal(item.status, 'blocked', id);
    assert.ok(item.detail.includes('没有 command / url'), id);
    assert.ok(item.nextStep.includes('--force'), id);
  }

  const ready = reportOf(fileOf({ mcpServers: { openbot: { command: 'x', args: [] } } }));
  for (const id of ids) {
    const item = checkOf(ready, id);
    assert.equal(item.status, 'ok', id);
    assert.ok(item.nextStep.includes('磁盘声明'), id);
    assert.equal(item.nextStep.includes('--force'), false, id);
  }

  const bad = reportOf(fileOf(null, 'invalid-json-or-unreadable'));
  for (const id of ids) {
    const item = checkOf(bad, id);
    assert.equal(item.status, 'unknown', id);
    assert.ok(item.detail.includes('读不到'), id);
  }

  const missing = reportOf(fileOf(null, null, false));
  for (const id of ids) {
    const item = checkOf(missing, id);
    assert.equal(item.status, 'blocked', id);
    assert.ok(item.detail.includes('不存在'), id);
  }
});

test('runCommand 把退出码非 0 与命令不存在分开，不再把 CLI 报错当成 ok', () => {
  const failed = runCommand(process.execPath,
    ['-e', "process.stdout.write('partial');process.stderr.write('boom');process.exit(3);"], 2000);
  assert.equal(failed.status, 'exit-error');
  assert.equal(failed.code, 3);
  assert.equal(failed.stdout, 'partial');
  assert.ok(failed.stderr.includes('boom'));
  assert.ok(failed.reason.includes('boom'));
  const ok = runCommand(process.execPath, ['-e', "process.stdout.write('hello');"], 2000);
  assert.equal(ok.status, 'ok');
  assert.equal(ok.stdout, 'hello');
  assert.equal(ok.code, 0);
  assert.deepEqual(runCommand('agentapp-no-such-command-xyz', [], 500), { status: 'not-found', stdout: '' });
});

const CODEX_LIST_HEADER = 'Name          Command                       Status    Auth';

test('inspectCodexCli 从真实表格里认 openbot 与状态，认不出的输出不下结论', () => {
  const of = (stdout, extra = {}) => inspectCodexCli({ status: 'ok', stdout, ...extra });
  const table = (...rows) => [CODEX_LIST_HEADER, ...rows, ''].join('\n');

  const enabled = of(table('computer-use  ./x  disabled  Unsupported',
    'openbot  /opt/openbot/run.sh  enabled  Unsupported'));
  assert.equal(enabled.verdict, 'registered');
  assert.equal(enabled.status, 'enabled');
  assert.equal(enabled.rowCount, 2);

  const missing = of(table('node_repl  /Applications/ChatGPT  enabled  Unsupported'));
  assert.equal(missing.verdict, 'not-registered');
  assert.equal(missing.rowCount, 1);
  assert.equal(of(table('openbot  /opt/openbot/run.sh  disabled  Unsupported')).verdict, 'disabled');

  // 「看不到」≠「没有」：空输出 / 表头不认识 / 状态值不认识都只能记 unknown。
  assert.equal(of('').verdict, 'unparseable');
  assert.equal(of('Name Command\nopenbot /x enabled Unsupported\n').verdict, 'unparseable');
  assert.equal(of(table('openbot  /x  pending  Unsupported')).verdict, 'unparseable');
  // 路径里带 enabled 字样不能被当成状态列。
  assert.equal(of(table('openbot  /enabled/run.sh  pending  Unsupported')).verdict, 'unparseable');

  for (const status of ['skipped', 'not-found', 'timeout', 'error', 'exit-error']) {
    const info = inspectCodexCli({ status, stdout: '', reason: status === 'exit-error' ? 'boom' : null });
    assert.equal(info.verdict, 'unavailable');
    assert.equal(info.commandStatus, status);
  }
  assert.equal(inspectCodexCli(undefined).verdict, 'unavailable');
});

test('codex-cli 命令层面失败记 unknown，输出里的事实才判 ok / blocked，指引按根因分', () => {
  const of = (result) => buildReport(facts({ codexCli: result }))
    .checks.find((item) => item.id === 'codex-cli');
  const table = (...rows) => [CODEX_LIST_HEADER, ...rows, ''].join('\n');

  const registered = of({ status: 'ok', stdout: table('openbot  /x  enabled  Unsupported') });
  assert.equal(registered.status, 'ok');
  assert.ok(registered.detail.includes('enabled'));
  assert.ok(registered.nextStep.includes('Codex 对话里验证'));

  const missing = of({ status: 'ok', stdout: table('node_repl  /x  enabled  Unsupported') });
  assert.equal(missing.status, 'blocked');
  assert.ok(missing.nextStep.includes('codex-stdio'));

  const disabled = of({ status: 'ok', stdout: table('openbot  /x  disabled  Unsupported') });
  assert.equal(disabled.status, 'blocked');
  assert.ok(disabled.nextStep.includes('启用'));

  const failed = of({ status: 'exit-error', stdout: '', stderr: 'boom', code: 3, reason: 'boom' });
  assert.equal(failed.status, 'unknown');
  assert.ok(failed.detail.includes('exit-error'));
  assert.ok(failed.nextStep.includes('stderr'));

  const skipped = of({ status: 'skipped', stdout: '' });
  assert.equal(skipped.status, 'unknown');
  assert.ok(skipped.detail.includes('skipped'));
  assert.ok(skipped.nextStep.includes('--no-verify'));

  const unparseable = of({ status: 'ok', stdout: 'hello\n' });
  assert.equal(unparseable.status, 'unknown');
  assert.ok(unparseable.detail.includes('认不出'));

  // 五种命令层失败的指引必须各不相同，不能压成一句通用话。
  const steps = ['skipped', 'not-found', 'timeout', 'error', 'exit-error']
    .map((status) => codexCliPresentation(inspectCodexCli({ status, stdout: '' })).nextStep);
  assert.equal(new Set(steps).size, steps.length);
});

test('probeBridgeHttp 对 200 / 500 / 端点文件缺失分原因，且不把 token 写进报告', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentapp-bridge-'));
  const endpointPath = join(dir, 'endpoint.json');
  const tokenPath = join(dir, 'token');
  const sockets = new Set();
  let statusCode = 200;
  const server = http.createServer((_req, res) => {
    res.writeHead(statusCode, { 'content-type': 'application/json' });
    res.end('{"ok":true}');
  });
  server.on('connection', (socket) => sockets.add(socket));
  await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));
  const port = server.address().port;
  writeFileSync(endpointPath, JSON.stringify({ version: 1, port, pid: 1 }));
  writeFileSync(tokenPath, 'obcli_secret_probe_token\n');
  const probe = { endpointPath, tokenPath, timeoutMs: 2000 };
  try {
    const good = await probeBridgeHttp(probe);
    assert.equal(good.status, 'ok');
    assert.equal(good.httpStatus, 200);
    assert.equal(good.port, port);
    assert.ok(!JSON.stringify(good).includes('obcli_secret_probe_token'));
    statusCode = 500;
    const bad = await probeBridgeHttp(probe);
    assert.equal(bad.status, 'http-error');
    assert.equal(bad.httpStatus, 500);
    unlinkSync(endpointPath);
    const missing = await probeBridgeHttp(probe);
    assert.equal(missing.status, 'no-endpoint');
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise((resolvePromise) => server.close(resolvePromise));
    rmSync(dir, { recursive: true, force: true });
  }
});

test('probeBridgeHttp 区分「TCP 连上但永不回包」与「端口被拒绝」', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentapp-bridge-hang-'));
  const endpointPath = join(dir, 'endpoint.json');
  const tokenPath = join(dir, 'token');
  const sockets = new Set();
  const server = net.createServer((socket) => { sockets.add(socket); /* 故意不回包 */ });
  await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));
  const port = server.address().port;
  writeFileSync(endpointPath, JSON.stringify({ version: 1, port, pid: 1 }));
  writeFileSync(tokenPath, 'obcli_secret_probe_token\n');
  const probe = { endpointPath, tokenPath, timeoutMs: 300 };
  try {
    const hung = await probeBridgeHttp(probe);
    assert.equal(hung.status, 'timeout');
    assert.ok(hung.reason.includes('300ms'));
    assert.equal(hung.port, port);
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise((resolvePromise) => server.close(resolvePromise));
  }
  try {
    const refused = await probeBridgeHttp({ ...probe, timeoutMs: 1000 });
    assert.equal(refused.status, 'refused');
    assert.equal(buildReport(facts({ bridgeHttp: refused })).checks
      .find((item) => item.id === 'openbot-bridge-http').status, 'blocked');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('越界端口只是一项 bad-endpoint，绝不 reject 把整份 doctor 报告拖没', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentapp-bridge-badport-'));
  const endpointPath = join(dir, 'endpoint.json');
  const tokenPath = join(dir, 'token');
  writeFileSync(tokenPath, 'obcli_placeholder', 'utf8');
  try {
    // 70000 会让 http.request 同步抛 ERR_SOCKET_BAD_PORT；0 / -1 也是整数但不可用。
    for (const port of [70000, 0, -1]) {
      writeFileSync(endpointPath, JSON.stringify({ version: 1, port, pid: 1 }), 'utf8');
      const result = await probeBridgeHttp({ endpointPath, tokenPath, timeoutMs: 300 });
      assert.equal(result.status, 'bad-endpoint', `port=${port}`);
      assert.equal(result.port, port);
      assert.ok(result.reason.includes(String(port)), `port=${port}`);
      assert.ok(result.reason.includes('1–65535'));
      assert.equal(BRIDGE_HTTP_STATUS[result.status], 'blocked');
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('请求构造同步抛错归一为 request-failed，并判成 blocked 而不是 unknown', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentapp-bridge-badheader-'));
  const endpointPath = join(dir, 'endpoint.json');
  const tokenPath = join(dir, 'token');
  writeFileSync(endpointPath, JSON.stringify({ version: 1, port: 4818, pid: 1 }), 'utf8');
  // header 值里的换行让 http.request 同步抛 ERR_INVALID_CHAR，不需要 mock。
  writeFileSync(tokenPath, 'obcli_a\nobcli_b', 'utf8');
  try {
    const result = await probeBridgeHttp({ endpointPath, tokenPath, timeoutMs: 300 });
    assert.equal(result.status, 'request-failed');
    assert.equal(result.port, 4818);
    assert.ok(result.reason.includes('ERR_INVALID_CHAR'));
    assert.equal(BRIDGE_HTTP_STATUS['request-failed'], 'blocked');
    const byId = Object.fromEntries(
      buildReport(facts({ bridgeHttp: result })).checks.map((item) => [item.id, item]),
    );
    assert.equal(byId['openbot-bridge-http'].status, 'blocked');
    assert.ok(byId['openbot-bridge-http'].detail.includes('request-failed'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('桥状态表与下一步指引表键集合一致，且每个状态的指引都不重复', () => {
  const statusKeys = Object.keys(BRIDGE_HTTP_STATUS).sort();
  const stepKeys = Object.keys(BRIDGE_NEXT_STEP).sort();
  assert.deepEqual(stepKeys, statusKeys);
  // 期望值写字面值，不拿被测表互相当期望；新增状态忘了补指引会直接红。
  assert.equal(statusKeys.length, 11);
  const steps = statusKeys.map((key) => BRIDGE_NEXT_STEP[key]);
  assert.equal(new Set(steps).size, steps.length);
  for (const step of steps) assert.ok(step.length > 10);
});

test('桥探测的下一步指引按状态分原因，坏数据不再被叫去重启桌面', () => {
  assert.ok(BRIDGE_NEXT_STEP['bad-endpoint'].includes('1–65535'));
  assert.ok(BRIDGE_NEXT_STEP['bad-endpoint'].includes('删掉'));
  assert.equal(BRIDGE_NEXT_STEP['bad-endpoint'].includes('重启 OpenBot.app'), false);
  assert.ok(BRIDGE_NEXT_STEP['request-failed'].includes('ERR_INVALID_CHAR'));
  assert.equal(BRIDGE_NEXT_STEP['request-failed'].includes('重启 OpenBot.app'), false);
  assert.ok(BRIDGE_NEXT_STEP.timeout.includes('重启 OpenBot.app'));
  assert.ok(BRIDGE_NEXT_STEP['no-endpoint'].includes('打开 OpenBot.app'));
  assert.ok(BRIDGE_NEXT_STEP.ok.includes('tools/call 仍需在客户端对话里实际验证'));

  const bridgeOf = (status, extra = {}) => Object.fromEntries(
    buildReport(facts({ bridgeHttp: { status, reason: 'probe', ...extra } })).checks
      .map((item) => [item.id, item]),
  )['openbot-bridge-http'];

  const bad = bridgeOf('bad-endpoint', { port: 70000 });
  assert.equal(bad.status, 'blocked');
  assert.ok(bad.nextStep.includes('1–65535'));
  assert.equal(bad.nextStep.includes('重启 OpenBot.app'), false);
  assert.ok(bridgeOf('timeout').nextStep.includes('重启 OpenBot.app'));
  const ok = bridgeOf('ok');
  assert.equal(ok.status, 'ok');
  assert.ok(ok.nextStep.includes('tools/call 仍需在客户端对话里实际验证'));
});

test('桥状态缺失或未知时给通用兜底，不编造故障结论', () => {
  const asMap = (bridgeHttp) => Object.fromEntries(
    buildReport(facts({ bridgeHttp })).checks.map((item) => [item.id, item]),
  )['openbot-bridge-http'];
  const missing = asMap(undefined);
  assert.equal(missing.status, 'unknown');
  assert.ok(missing.detail.includes('调用方未提供 HTTP 探测结果'));
  assert.ok(missing.nextStep.includes('确认桌面主窗口已出现'));
  const unknownStatus = asMap({ status: 'mystery', reason: 'x' });
  assert.equal(unknownStatus.status, 'unknown');
  assert.ok(unknownStatus.nextStep.includes('确认桌面主窗口已出现'));
});

test('inspectMcpDeclaration 认得 ZCode 嵌套 mcp.servers，两套形状互不误认', () => {
  const of = (parsed, error = null, exists = true) => inspectMcpDeclaration({ exists, parsed, error });
  // 嵌套形状：合法 http 声明 → ready。
  const ready = of({ mcp: { servers: { openbot: { type: 'http', url: 'https://mcp.example.invalid/mcp' } } } });
  assert.equal(ready.verdict, 'ready');
  assert.deepEqual(ready.keys, ['type', 'url']);
  assert.equal(ready.hasLaunchKey, true);

  // 嵌套形状的空对象 / 缺启动键同样是 incomplete，语义与顶层形状一致。
  assert.equal(of({ mcp: { servers: { openbot: {} } } }).verdict, 'incomplete');
  const typeOnly = of({ mcp: { servers: { openbot: { enabled: true } } } });
  assert.equal(typeOnly.verdict, 'incomplete');
  assert.deepEqual(typeOnly.keys, ['enabled']);

  // 没有合法 mcp.servers 对象时才落到顶层 mcpServers，互不误认：
  assert.equal(of({ plugins: {} }).verdict, 'missing');
  assert.equal(of({ mcp: { other: 1 }, mcpServers: { openbot: { command: 'x' } } }).verdict, 'ready');
  assert.equal(of({ mcpServers: { openbot: {} } }).verdict, 'incomplete');
  assert.equal(of({}).verdict, 'missing');
});

test('doctor 的 zcode 两项按事实分状态：客户端装了但配置未声明判 blocked', () => {
  const byIdOf = (overrides) => Object.fromEntries(
    buildReport(facts(overrides)).checks.map((item) => [item.id, item]),
  );

  // 夹具基线：ZCode.app 在（doctor 本来就跑在 ZCode 里），config.json 存在但没声明 openbot。
  const base = byIdOf({});
  assert.equal(base['zcode-app'].status, 'ok');
  assert.equal(base['zcode-config'].status, 'blocked');
  assert.ok(base['zcode-config'].detail.includes('不存在') === false);
  assert.ok(base['zcode-config'].nextStep.includes('--target zcode'));

  // 嵌套声明有启动键 → ok，且明说只是磁盘声明。
  const declared = byIdOf({
    zcodeConfig: {
      exists: true,
      parsed: { mcp: { servers: { openbot: { type: 'http', url: 'https://mcp.example.invalid/mcp' } } } },
      error: null,
    },
  });
  assert.equal(declared['zcode-config'].status, 'ok');
  assert.ok(declared['zcode-config'].detail.includes('keys=[type, url]'));
  assert.ok(declared['zcode-config'].nextStep.includes('磁盘声明'));

  // 客户端缺失不能反过来把配置判成「已配好」：两项独立。
  const noApp = byIdOf({ apps: { ...facts().apps, zcode: false } });
  assert.equal(noApp['zcode-app'].status, 'blocked');
  assert.equal(noApp['zcode-config'].status, 'blocked');

  // JSON 坏了是「拿不到证据」→ unknown，与未声明分开。
  const bad = byIdOf({ zcodeConfig: { exists: true, parsed: null, error: 'invalid-json-or-unreadable' } });
  assert.equal(bad['zcode-config'].status, 'unknown');
  assert.ok(bad['zcode-config'].detail.includes('读不到'));
});
