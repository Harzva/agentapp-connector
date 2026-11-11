import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  expandPath, renderConfigText, mergeJsonText, mergeTomlText, findTomlTableRange,
  buildInstallPlan, buildAllInstallPlans, applyInstallPlan,
} from '../src/install.mjs';
import { makeConfig } from '../src/config.mjs';
import { targets } from '../src/targets.mjs';

const LOCAL = 'http://127.0.0.1:4818/mcp/example';

function expectMessage(fn, message) {
  assert.throws(fn, (error) => {
    assert.equal(error.message, message);
    return true;
  });
}

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'agentapp-install-'));
}

test('expandPath 正确处理 ~、绝对路径与相对路径', () => {
  assert.equal(expandPath('~'), process.env.HOME);
  assert.equal(expandPath('~/.codex/config.toml'), join(process.env.HOME, '.codex/config.toml'));
  assert.equal(expandPath('/tmp/x'), '/tmp/x');
  assert.equal(expandPath('local/x'), resolve(process.cwd(), 'local/x'));
  expectMessage(() => expandPath(''), '路径不能为空');
});

test('renderConfigText 对三种格式输出可直接使用的文本', () => {
  const json = renderConfigText(makeConfig({ targetId: 'cursor', address: LOCAL }));
  assert.equal(JSON.parse(json).mcpServers.openbot.url, LOCAL);
  const toml = renderConfigText(makeConfig({ targetId: 'codex', address: LOCAL }));
  assert.ok(toml.startsWith('[mcp_servers.openbot]'));
  assert.ok(toml.endsWith('\n'));
  const form = renderConfigText(makeConfig({ targetId: 'doubao-work', address: LOCAL }));
  assert.ok(form.includes('不是客户端配置文件'));
  assert.ok(form.includes(`服务器 URL: ${LOCAL}`));
});

test('mergeJsonText 保留其他服务器，不整体覆盖客户端配置', () => {
  const existing = JSON.stringify({
    mcpServers: { 'workbuddy-bridge': { command: '/opt/bridge/mcp.js', args: [] } },
    otherSetting: 42,
  }, null, 2);
  const generated = renderConfigText(makeConfig({ targetId: 'cursor', address: LOCAL }));
  const result = mergeJsonText(existing, generated);
  const parsed = JSON.parse(result.content);
  assert.equal(result.action, 'merge');
  assert.deepEqual(parsed.mcpServers['workbuddy-bridge'], { command: '/opt/bridge/mcp.js', args: [] });
  assert.equal(parsed.mcpServers.openbot.url, LOCAL);
  assert.equal(parsed.otherSetting, 42);
});

test('mergeJsonText 按原因拒绝坏数据、非对象与重复键', () => {
  const generated = renderConfigText(makeConfig({ targetId: 'cursor', address: LOCAL }));
  expectMessage(() => mergeJsonText('{not json', generated), '目标文件不是有效 JSON，拒绝覆盖；请手动检查后再试');
  expectMessage(() => mergeJsonText('[]', generated), '目标文件顶层不是 JSON 对象，拒绝覆盖');
  const duplicate = JSON.stringify({ mcpServers: { openbot: { url: 'http://old' } } });
  expectMessage(() => mergeJsonText(duplicate, generated), '目标文件已存在 mcpServers.openbot；确认要替换请加 --force');
  assert.equal(mergeJsonText(duplicate, generated, true).action, 'replace');
});

test('mergeTomlText 追加一张表且不静默覆盖同名表', () => {
  const generated = renderConfigText(makeConfig({ targetId: 'codex', address: LOCAL }));
  const appended = mergeTomlText('model = "gpt-5"\n', generated);
  assert.equal(appended.action, 'append');
  assert.equal(appended.content.includes('model = "gpt-5"'), true);
  assert.equal((appended.content.match(/\[mcp_servers\.openbot\]/g) || []).length, 1);
  expectMessage(
    () => mergeTomlText(appended.content, generated),
    '目标文件已存在 [mcp_servers.openbot]；确认要替换这张表请加 --force，否则请手动处理',
  );
});

test('buildInstallPlan 十个 target 都有确定模式且不含真实凭据', () => {
  const expectedMode = {
    qwenwork: 'json-merge',
    'workbuddy-http': 'json-merge',
    'workbuddy-stdio': 'json-merge',
    'doubao-work': 'manual',
    codex: 'toml-append',
    'codex-stdio': 'toml-append',
    cursor: 'json-merge',
    zcode: 'json-merge',
    'zcode-stdio': 'json-merge',
    'claude-desktop': 'json-merge',
  };
  const overridden = buildInstallPlan({ targetId: 'claude-desktop', writeTo: '/tmp/openbot-cursor.json' });
  assert.equal(overridden.destinationOverridden, true);
  assert.equal(overridden.effectiveDestination, '/tmp/openbot-cursor.json');
  assert.ok(overridden.note.includes('--write-to 覆盖了'));
  const samePath = buildInstallPlan({
    targetId: 'claude-desktop',
    writeTo: '~/Library/Application Support/Claude/claude_desktop_config.json',
  });
  assert.equal(samePath.destinationOverridden, false);
  for (const target of targets) {
    const options = { targetId: target.id };
    if (target.input === 'address') options.address = LOCAL;
    const plan = buildInstallPlan(options);
    assert.equal(plan.mode, expectedMode[target.id], target.id);
    assert.equal(plan.applied, false);
    assert.equal(plan.writeTo, null);
    assert.equal(plan.isClientConfig, target.id !== 'doubao-work');
    assert.equal(plan.destination, target.configPath || '（客户端 UI 表单，无已知配置文件路径）');
    assert.ok(plan.postSteps.length > 0);
    for (const prefix of ['obcli_', 'obs_', 'Bearer sk-']) {
      assert.equal(plan.content.includes(prefix), false, `${target.id} 输出了凭据`);
    }
  }
  expectMessage(() => buildInstallPlan({ targetId: 'cursor', address: LOCAL, token: 'obcli_REAL' }),
    '未知安装选项 token');
});

test('applyInstallPlan 不写时报错，写入时回读一致并保留已有服务器', () => {
  const dir = tempDir();
  try {
    const path = join(dir, 'nested', 'mcp.json');
    const plan = buildInstallPlan({ targetId: 'cursor', address: LOCAL, writeTo: path });
    expectMessage(() => applyInstallPlan(buildInstallPlan({ targetId: 'cursor', address: LOCAL })),
      '未指定 --write-to：不会写入任何文件');
    const created = applyInstallPlan(plan);
    assert.equal(created.applied, true);
    assert.equal(created.action, 'create');
    assert.equal(created.backupPath, null);
    assert.equal(readFileSync(path, 'utf8'), plan.content);

    writeFileSync(path, JSON.stringify({
      mcpServers: { 'workbuddy-bridge': { command: '/opt/bridge/mcp.js' } },
    }), 'utf8');
    const merged = applyInstallPlan(plan);
    assert.equal(merged.action, 'merge');
    assert.ok(merged.backupPath && existsSync(merged.backupPath));
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    assert.ok(parsed.mcpServers['workbuddy-bridge']);
    assert.equal(parsed.mcpServers.openbot.url, LOCAL);
    assert.equal(JSON.parse(readFileSync(merged.backupPath, 'utf8')).mcpServers.openbot, undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('buildAllInstallPlans 逐 target 给计划，明确零写入且占位地址被标出', () => {
  const all = buildAllInstallPlans();
  assert.equal(all.planOnly, true);
  assert.equal(all.writes, 0);
  assert.equal(all.count, targets.length);
  assert.equal(all.count, 10);
  assert.equal(all.placeholderAddress, 'http://127.0.0.1:4818/mcp/PUBLICATION_ID');
  assert.deepEqual(all.plans.map((item) => item.target), targets.map((item) => item.id));
  assert.equal(all.plans.every((item) => item.applied === false), true);
  assert.equal(all.plans.every((item) => item.platform !== null), true);
  assert.equal(all.plans.find((item) => item.target === 'doubao-work').requiresUiForm, true);
  assert.equal(all.plans.find((item) => item.target === 'codex-stdio').addressIsPlaceholder, false);
  assert.equal(all.plans.find((item) => item.target === 'cursor').addressIsPlaceholder, true);
  assert.ok(all.plans.find((item) => item.target === 'cursor').content.includes('PUBLICATION_ID'));
  assert.ok(all.note.includes('批量模式只输出计划'));
});

test('buildAllInstallPlans 拒绝写盘与单 target 混用，不静默忽略', () => {
  expectMessage(() => buildAllInstallPlans({ writeTo: '/tmp/aac-no.json' }),
    '--all 只输出计划，不接受 --write-to；请逐个 target 显式安装');
  expectMessage(() => buildAllInstallPlans({ targetId: 'cursor' }),
    '--all 与 --target 不能同时给');
  expectMessage(() => buildAllInstallPlans({ bogus: 1 }), '未知安装选项 bogus');
  const withAddress = buildAllInstallPlans({ address: LOCAL });
  assert.equal(withAddress.plans.find((item) => item.target === 'cursor').addressIsPlaceholder, false);
  assert.ok(withAddress.plans.find((item) => item.target === 'cursor').content.includes('/mcp/example'));
});

// 只数「看起来像表头」的行，不用 \s* 跨行匹配；注释行以 # 开头不会被算进去。
const TABLE_HEADERS = /^[ \t]*\[[ \t]*mcp_servers\.openbot[ \t]*\]/gm;
const countTables = (text) => (text.match(TABLE_HEADERS) || []).length;

test('findTomlTableRange 按行识别表头，容忍空格并忽略注释行', () => {
  const name = 'mcp_servers.openbot';
  assert.equal(findTomlTableRange('model = "gpt-5"\n', name), null);
  assert.equal(findTomlTableRange('# [mcp_servers.openbot] disabled\nmodel = "gpt-5"\n', name), null);
  const spaced = findTomlTableRange('[ mcp_servers.openbot ]\nurl = "old"\n', name);
  assert.equal(spaced.start, 0);
  assert.ok('[ mcp_servers.openbot ]\nurl = "old"\n'.split('\n')
    .slice(spaced.start, spaced.end).join('\n').includes('url = "old"'));

  const text = 'model = "gpt-5"\n\n[mcp_servers.openbot] # inline\nurl = "old"\n\n[other]\na = 1\n';
  const middle = findTomlTableRange(text, name);
  assert.equal(middle.start, 2);
  const range = text.split('\n').slice(middle.start, middle.end).join('\n');
  assert.ok(range.includes('url = "old"'));
  assert.equal(range.includes('[other]'), false);
});

test('带空格的合法表头不再漏判，force 时替换而不是追加重复表', () => {
  const generated = renderConfigText(makeConfig({ targetId: 'codex', address: LOCAL }));
  const existing = '[ mcp_servers.openbot ]\nurl = "old"\n';
  expectMessage(() => mergeTomlText(existing, generated),
    '目标文件已存在 [mcp_servers.openbot]；确认要替换这张表请加 --force，否则请手动处理');
  const replaced = mergeTomlText(existing, generated, true);
  assert.equal(replaced.action, 'replace-table');
  assert.equal(countTables(replaced.content), 1);
  assert.ok(replaced.content.includes(LOCAL));
  assert.equal(replaced.content.includes('url = "old"'), false);
});

test('applyInstallPlan 对已有 TOML 表用 --force 时只保留一张表，且表前表后内容不丢', () => {
  const dir = tempDir();
  const target = join(dir, 'config.toml');
  writeFileSync(target, 'model = "gpt-5"\n\n[mcp_servers.openbot]\nurl = "old"\n\n[other]\na = 1\n', 'utf8');
  try {
    const plan = buildInstallPlan({ targetId: 'codex', address: LOCAL, writeTo: target });
    const result = applyInstallPlan(plan, { force: true });
    assert.equal(result.applied, true);
    assert.equal(result.action, 'replace-table');
    assert.ok(result.backupPath && existsSync(result.backupPath));
    const content = readFileSync(target, 'utf8');
    assert.equal(countTables(content), 1);
    assert.ok(content.includes('model = "gpt-5"'));
    assert.ok(content.includes('[other]'));
    assert.ok(content.includes(`url = "${LOCAL}"\n\n[other]`));
    assert.ok(content.includes('a = 1'));
    assert.ok(content.includes(LOCAL));
    assert.equal(content.includes('url = "old"'), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('注释里只是提到表名时正常追加，不再假拒绝也不产生重复表', () => {
  const generated = renderConfigText(makeConfig({ targetId: 'codex', address: LOCAL }));
  const existing = '# [mcp_servers.openbot] was here\nmodel = "gpt-5"\n';
  const appended = mergeTomlText(existing, generated);
  assert.equal(appended.action, 'append');
  assert.equal(countTables(appended.content), 1);
  assert.ok(appended.content.includes('# [mcp_servers.openbot] was here'));
  const forced = mergeTomlText(existing, generated, true);
  assert.equal(forced.action, 'append');
  assert.equal(countTables(forced.content), 1);
});

test('mergeJsonText 认得 ZCode 嵌套 mcp.servers 形状，保留同层兄弟键', () => {
  const generated = renderConfigText(makeConfig({ targetId: 'zcode', address: LOCAL }));
  // 复刻真实 ~/.zcode/cli/config.json 的形状：plugins 启停状态 + 其它设置。
  const existing = JSON.stringify({
    plugins: { 'zcode-guide': true },
    hooks: { enabled: true },
  }, null, 2);
  const merged = mergeJsonText(existing, generated);
  assert.equal(merged.action, 'merge');
  const parsed = JSON.parse(merged.content);
  assert.deepEqual(parsed.mcp.servers.openbot, { type: 'http', url: LOCAL });
  assert.deepEqual(parsed.plugins, { 'zcode-guide': true });
  assert.deepEqual(parsed.hooks, { enabled: true });

  // 已有同名服务：不 --force 拒绝；--force 替换且保留 mcp 下兄弟键。
  const withOpenbot = JSON.stringify({
    mcp: { enabled: true, servers: { openbot: { url: 'https://old.example.invalid/mcp' } } },
  });
  expectMessage(
    () => mergeJsonText(withOpenbot, generated),
    '目标文件已存在 mcp.servers.openbot；确认要替换请加 --force',
  );
  const replaced = mergeJsonText(withOpenbot, generated, true);
  assert.equal(replaced.action, 'replace');
  const replacedParsed = JSON.parse(replaced.content);
  assert.equal(replacedParsed.mcp.enabled, true);
  assert.equal(replacedParsed.mcp.servers.openbot.url, LOCAL);

  // mcpServers 顶层键与 mcp.servers 嵌套键互不误认：嵌套生成不写进顶层 mcpServers。
  const legacyExisting = JSON.stringify({ mcpServers: { 'other-bridge': { command: 'x' } } });
  const legacyMerged = JSON.parse(mergeJsonText(legacyExisting, generated).content);
  assert.equal(legacyMerged.mcpServers.openbot, undefined);
  assert.deepEqual(legacyMerged.mcp.servers.openbot, { type: 'http', url: LOCAL });
  assert.deepEqual(legacyMerged.mcpServers['other-bridge'], { command: 'x' });

  const stdioGenerated = renderConfigText(makeConfig({ targetId: 'zcode-stdio', connectorPath: '/opt/openbot/run.sh' }));
  const stdioParsed = JSON.parse(mergeJsonText(existing, stdioGenerated).content);
  assert.deepEqual(stdioParsed.mcp.servers.openbot, { type: 'stdio', command: '/opt/openbot/run.sh', args: [] });
});
