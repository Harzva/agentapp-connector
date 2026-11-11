import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, delimiter } from 'node:path';

const CLI = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));
const LOCAL = 'http://127.0.0.1:4818/mcp/example';
const STDIO_COMMAND = '/opt/openbot/run.sh';

function run(args, extraEnv = {}) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...extraEnv },
  });
  if (result.error) throw result.error;
  return result;
}

function okJson(args) {
  const result = run(args);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('targets 列出全部客户端与未完成清单', () => {
  const listing = okJson(['targets']);
  assert.equal(listing.default, 'qwenwork');
  assert.deepEqual(listing.targets.map((item) => item.id), [
    'qwenwork', 'workbuddy-http', 'workbuddy-stdio', 'doubao-work', 'codex', 'codex-stdio', 'cursor', 'zcode', 'zcode-stdio', 'claude-desktop',
  ]);
  assert.deepEqual(listing.planned.map((item) => item.id), [
    'chatgpt-web', 'qwenwork-market', 'workbuddy-market', 'dingtalk-market', 'feishu-aily-market', 'baidu-comate', 'wenxin-agents',
  ]);
  assert.equal(listing.targets.every((item) => item.liveTested === false), true);
});

test('targets 拒绝多余参数，退出码为 2', () => {
  const result = run(['targets', 'extra']);
  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.ok(result.stderr.includes('该命令不接受位置参数'));
});

test('config 默认输出千问办公格式且可直接粘贴', () => {
  const result = okJson(['config', LOCAL]);
  assert.equal(result.target, 'qwenwork');
  assert.deepEqual(result.config, {
    mcpServers: { openbot: { type: 'streamable-http', url: LOCAL } },
  });
});

test('config 切换 WorkBuddy HTTP 得到 camelCase 与凭据占位符', () => {
  const result = okJson(['config', LOCAL, '--target', 'workbuddy-http', '--auth', 'placeholder']);
  assert.deepEqual(result.config.mcpServers.openbot, {
    type: 'streamableHttp',
    url: LOCAL,
    headers: { Authorization: 'Bearer ${OPENBOT_GRANT_TOKEN}' },
  });
});

test('config 对 stdio 客户端不要求发布地址', () => {
  const result = okJson(['config', '--target', 'workbuddy-stdio', '--connector-path', STDIO_COMMAND]);
  assert.deepEqual(result.config, {
    mcpServers: { openbot: { type: 'stdio', command: STDIO_COMMAND, args: [] } },
  });
});

test('config 对豆包工作输出表单字段而不是 mcpServers', () => {
  const result = okJson(['config', LOCAL, '--target', 'doubao-work']);
  assert.equal(result.format, 'form');
  assert.equal(result.config.mcpServers, undefined);
  assert.equal(result.config.fields[1].value, 'HTTP');
  assert.equal(result.config.fields[2].value, LOCAL);
});

test('guide 输出配置入口、认证方式、未完成状态与提示', () => {
  const result = run(['guide', LOCAL, '--target', 'doubao-work']);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes('插件·技能·伙伴 → 连接器 → 添加 → 新建自定义连接器'));
  assert.ok(result.stdout.includes('实机连接测试：未完成'));
  assert.ok(result.stdout.includes('Header 值'));
  assert.ok(result.stdout.includes('不要使用桌面 owner token'));
  assert.ok(result.stdout.includes('本机 127.0.0.1 地址未实测'));
});

test('未知客户端退出码为 1，并列出可用 id', () => {
  const result = run(['config', LOCAL, '--target', 'nope']);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.ok(result.stderr.includes('未知客户端 nope'));
  assert.ok(result.stderr.includes('workbuddy-http'));
});

test('未知选项、重复选项与多余地址退出码为 2', () => {
  assert.equal(run(['config', LOCAL, '--bogus']).status, 2);
  assert.equal(run(['config', LOCAL, '--target']).status, 2);
  assert.equal(run(['config', LOCAL, LOCAL]).status, 2);
  assert.equal(run(['config', LOCAL, '--target', 'qwenwork', '--target', 'doubao-work']).status, 2);
});

test('地址或凭据参数不合法时退出码为 1，不输出半份配置', () => {
  const unsafe = run(['config', 'http://example.com/mcp/x']);
  assert.equal(unsafe.status, 1);
  assert.equal(unsafe.stdout, '');
  assert.ok(unsafe.stderr.includes('非本机地址必须使用 HTTPS'));

  const ignored = run(['config', LOCAL, '--connector-path', STDIO_COMMAND]);
  assert.equal(ignored.status, 1);
  assert.equal(ignored.stdout, '');
  assert.ok(ignored.stderr.includes('只有 stdio 客户端支持 --connector-path'));
});

test('platforms / policies / local / market 四张表都可读且自检通过', () => {
  const platforms = okJson(['platforms']);
  assert.equal(platforms.count, 7);
  assert.deepEqual(platforms.validation, { ok: true, problems: [] });
  assert.deepEqual(platforms.platforms.map((item) => item.id), [
    'workbuddy', 'qwenwork', 'doubao-work', 'chatgpt-codex', 'cursor', 'claude', 'zcode',
  ]);

  const policies = okJson(['policies']);
  assert.ok(policies.count > 0);
  assert.equal(policies.count, policies.docs.length);
  assert.ok(policies.docs.some((item) => item.url === 'https://open.workbuddy.cn/docs/connector'));
  assert.ok(policies.docs.some((item) => item.evidence === 'fetched'));

  const local = okJson(['local']);
  assert.equal(local.count, 7);
  assert.equal(local.allHaveLocalMode, true);
  assert.equal(local.modes.find((item) => item.platform === 'claude').loopback, 'unknown');

  const market = okJson(['market']);
  assert.equal(market.submitted, 0);
  assert.equal(market.marketplaces.every((item) => item.status !== 'published'), true);
  assert.equal(market.marketplaces.every((item) => item.available === true), true);
  assert.deepEqual(market.marketplaces.map((item) => item.submissionSpec), [
    'official', 'enterprise', 'invite-only', 'official', 'official', 'official', 'official',
  ]);
  const cursor = market.marketplaces.find((item) => item.platform === 'cursor');
  assert.equal(cursor.available, true);
  assert.equal(cursor.submissionSpecLabel, '已找到该类目官方公开提交规范');

  const preflight = okJson(['market-preflight']);
  assert.equal(preflight.count, 7);
  assert.equal(preflight.readyCount, 0);
  assert.equal(preflight.submitted, 0);
  assert.ok(preflight.platforms.every((item) => item.ready === false && item.missing.length > 0));
  const steps = run(['market-preflight', '--format', 'text']);
  assert.equal(steps.status, 0, steps.stderr);
  assert.ok(steps.stdout.includes('市场上架提交步骤（当前不可提交）'));
  assert.equal(run(['market-preflight', '--platform', 'nope']).status, 1);
  assert.equal(run(['verify-local', '--timeout-ms', 'abc']).status, 1);
});

test('policies 支持过滤与文本输出，未知平台退出码 1', () => {
  const filtered = okJson(['policies', '--platform', 'qwenwork', '--category', 'privacy']);
  assert.equal(filtered.docs.length > 0, true);
  assert.equal(filtered.docs.every((item) => item.platform === 'qwenwork' && item.category === 'privacy'), true);

  const text = run(['policies', '--format', 'text', '--platform', 'cursor']);
  assert.equal(text.status, 0, text.stderr);
  assert.ok(text.stdout.includes('政策文档'));
  assert.ok(text.stdout.includes('[cursor]'));
  assert.ok(text.stdout.includes('https://cursor.com/privacy'));

  const missing = run(['policies', '--platform', 'nope']);
  assert.equal(missing.status, 1);
  assert.ok(missing.stderr.includes('未知平台 nope'));
  assert.equal(run(['policies', '--bogus']).status, 2);
});

test('install-local 默认只给计划，不写任何文件', () => {
  const plan = okJson(['install-local', LOCAL, '--target', 'codex', '--auth', 'placeholder']);
  assert.equal(plan.applied, false);
  assert.equal(plan.mode, 'toml-append');
  assert.equal(plan.destination, '~/.codex/config.toml');
  assert.equal(plan.effectiveDestination, '~/.codex/config.toml');
  assert.equal(plan.destinationOverridden, false);
  assert.equal(plan.isClientConfig, true);
  assert.ok(plan.content.includes('[mcp_servers.openbot]'));
  assert.ok(plan.content.includes('bearer_token_env_var = "OPENBOT_GRANT_TOKEN"'));
  assert.equal(plan.content.includes('obcli_'), false);
  assert.ok(plan.postSteps.length > 0);
});

test('install-local 写入沙箱路径、合并、备份与 doctor 复核闭环', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentapp-cli-'));
  try {
    const home = join(dir, 'home');
    const mcpPath = join(home, '.workbuddy', 'mcp.json');
    const first = okJson(['install-local', LOCAL, '--target', 'workbuddy-http', '--auth', 'placeholder', '--write-to', mcpPath]);
    assert.equal(first.applied, true);
    assert.equal(first.action, 'create');
    assert.equal(first.backupPath, null);
    assert.equal(first.destinationOverridden, true);
    assert.equal(first.effectiveDestination, mcpPath);
    assert.ok(first.note.includes('--write-to 覆盖了'));
    const parsed = JSON.parse(readFileSync(mcpPath, 'utf8'));
    assert.deepEqual(parsed.mcpServers.openbot.headers, { Authorization: 'Bearer ${OPENBOT_GRANT_TOKEN}' });

    const form = okJson(['install-local', LOCAL, '--target', 'doubao-work', '--write-to', join(dir, 'form.txt')]);
    assert.equal(form.applied, true);
    assert.equal(form.mode, 'manual');
    assert.equal(form.isClientConfig, false);

    const doctor = okJson(['doctor', '--home', home, '--no-handshake']);
    assert.equal(doctor.registryProblems.length, 0);
    assert.equal(doctor.checks.find((item) => item.id === 'workbuddy-declared').status, 'ok');
    assert.equal(doctor.checks.find((item) => item.id === 'workbuddy-trusted').status, 'blocked');
    assert.ok(doctor.limitations.includes('所有 target 的 liveTested 仍为 false：客户端内实机连接尚未验收。'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('endpoint.json 带越界端口时 doctor 仍输出完整 JSON 报告，不是只剩一句错误', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentapp-cli-badport-'));
  try {
    const home = join(dir, 'home');
    const bridgeDir = join(home, 'Library', 'Application Support', 'openbot', 'cli-bridge');
    mkdirSync(bridgeDir, { recursive: true });
    writeFileSync(join(bridgeDir, 'endpoint.json'), JSON.stringify({ port: 70000 }), 'utf8');
    writeFileSync(join(bridgeDir, 'token'), 'obcli_placeholder', 'utf8');

    const result = run(['doctor', '--home', home, '--no-handshake']);
    assert.equal(result.status, 0, `doctor 不该崩：${result.stderr}`);
    const doctor = JSON.parse(result.stdout);
    assert.equal(doctor.registryProblems.length, 0);
    assert.equal(doctor.checks.length, 19);
    const bridge = doctor.checks.find((item) => item.id === 'openbot-bridge-http');
    assert.equal(bridge.status, 'blocked');
    assert.ok(bridge.detail.includes('bad-endpoint'));
    assert.ok(bridge.detail.includes('port=70000'));
    // 指引必须跟着根因走：坏端口不该把人带到「重启桌面」这个无效动作上。
    assert.ok(bridge.nextStep.includes('1–65535'));
    assert.equal(bridge.nextStep.includes('重启 OpenBot.app'), false);
    // 其它检查项照常产出，不因为一个坏端口整体消失。
    assert.ok(doctor.checks.some((item) => item.id === 'stdio-handshake'));
    assert.ok(doctor.checks.some((item) => item.id === 'claude-desktop-app'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('doctor --no-handshake 把跳过握手记成 unknown，报告仍完整 19 项', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentapp-cli-skipshake-'));
  try {
    const home = join(dir, 'home');
    mkdirSync(home, { recursive: true });
    const result = run(['doctor', '--home', home, '--no-handshake']);
    assert.equal(result.status, 0, `doctor 不该崩：${result.stderr}`);
    const doctor = JSON.parse(result.stdout);
    assert.equal(doctor.checks.length, 19);
    const handshake = doctor.checks.find((item) => item.id === 'stdio-handshake');
    assert.equal(handshake.status, 'unknown');
    assert.ok(handshake.detail.includes('本次未执行'));
    assert.equal(handshake.detail.includes('握手未通过'), false);
    assert.ok(handshake.nextStep.includes('去掉 --no-handshake'));
    assert.equal(doctor.stdioProtocolOk, null);
    // 汇总数字必须等于逐项统计，不允许把 skipped 偷偷塞进 blocked。
    assert.equal(doctor.summary.blocked, doctor.checks.filter((item) => item.status === 'blocked').length);
    assert.equal(doctor.summary.unknown, doctor.checks.filter((item) => item.status === 'unknown').length);
    assert.equal(doctor.summary.ok + doctor.summary.blocked + doctor.summary.unknown, 19);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('doctor 读真实 config.toml：带空格表头算已配，只有注释的不算', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentapp-cli-codextoml-'));
  try {
    const makeHome = (name, text) => {
      const home = join(dir, name);
      mkdirSync(join(home, '.codex'), { recursive: true });
      writeFileSync(join(home, '.codex', 'config.toml'), text, 'utf8');
      return home;
    };
    const spaced = makeHome('spaced',
      'model = "gpt-5"\n\n[ mcp_servers.openbot ]\ncommand = "/opt/openbot/run.sh"\nargs = []\n\n[other]\na = 1\n');
    const commented = makeHome('commented',
      'model = "gpt-5"\n# [mcp_servers.openbot] was here\n[other]\na = 1\n');
    for (const [home, expected] of [[spaced, 'ok'], [commented, 'blocked']]) {
      const result = run(['doctor', '--home', home, '--no-handshake']);
      assert.equal(result.status, 0, `doctor 不该崩：${result.stderr}`);
      const doctor = JSON.parse(result.stdout);
      assert.equal(doctor.checks.length, 19);
      const codex = doctor.checks.find((item) => item.id === 'codex-config');
      assert.equal(codex.status, expected, `home=${home} detail=${codex.detail}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('doctor 真读 config.toml：空表判 blocked，command / url 两种都判 ok', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentapp-cli-codexshape-'));
  try {
    const cases = [
      ['empty', 'model = "gpt-5"\n\n[mcp_servers.openbot]\n\n[other]\na = 1\n', 'blocked'],
      ['stdio', 'model = "gpt-5"\n\n[mcp_servers.openbot]\ncommand = "/opt/openbot/run.sh"\nargs = []\n', 'ok'],
      ['http', 'model = "gpt-5"\n\n[mcp_servers.openbot]\nurl = "https://mcp.example.invalid/mcp"\n', 'ok'],
    ];
    for (const [name, text, expected] of cases) {
      const home = join(dir, name);
      mkdirSync(join(home, '.codex'), { recursive: true });
      writeFileSync(join(home, '.codex', 'config.toml'), text, 'utf8');
      const result = run(['doctor', '--home', home, '--no-handshake']);
      assert.equal(result.status, 0, `doctor 不该崩：${result.stderr}`);
      const doctor = JSON.parse(result.stdout);
      assert.equal(doctor.checks.length, 19);
      const codex = doctor.checks.find((item) => item.id === 'codex-config');
      assert.equal(codex.status, expected, `${name}: ${codex.detail}`);
      if (name === 'empty') {
        assert.ok(codex.detail.includes('没有 command / url'));
        assert.ok(codex.nextStep.includes('--force'));
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('doctor 真读 mcp.json：空对象 / 缺启动键判 blocked，合法声明判 ok，非法 JSON 判 unknown', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentapp-cli-jsonshape-'));
  try {
    const cases = [
      ['empty', '{"mcpServers": {"openbot": {}}}\n', 'blocked'],
      ['typeonly', '{"mcpServers": {"openbot": {"type": "streamableHttp"}}}\n', 'blocked'],
      ['ready', '{"mcpServers": {"openbot": {"command": "/opt/openbot/run.sh", "args": []}}}\n', 'ok'],
      ['badjson', 'this is not json\n', 'unknown'],
    ];
    for (const [name, text, expected] of cases) {
      const home = join(dir, name);
      mkdirSync(join(home, '.workbuddy'), { recursive: true });
      writeFileSync(join(home, '.workbuddy', 'mcp.json'), text, 'utf8');
      const result = run(['doctor', '--home', home, '--no-handshake']);
      assert.equal(result.status, 0, `doctor 不该崩：${result.stderr}`);
      const doctor = JSON.parse(result.stdout);
      assert.equal(doctor.checks.length, 19);
      const declared = doctor.checks.find((item) => item.id === 'workbuddy-declared');
      assert.equal(declared.status, expected, `${name}: ${declared.detail}`);
      if (name === 'badjson') assert.ok(declared.detail.includes('读不到'));
      if (name === 'empty') assert.ok(declared.nextStep.includes('--force'));
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('doctor 真跑 codex mcp list：列出 openbot 才 ok，没注册 / disabled 判 blocked，报错判 unknown', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentapp-cli-codexlist-'));
  try {
    const bin = join(dir, 'bin');
    mkdirSync(bin, { recursive: true });
    // 假 codex 走真实子进程与真实 PATH，输出由环境变量注入，不 mock 产品代码。
    writeFileSync(join(bin, 'codex'), [
      `#!${process.execPath}`,
      'process.stdout.write(process.env.FAKE_CODEX_STDOUT || "");',
      'if (process.env.FAKE_CODEX_EXIT) {',
      '  process.stderr.write(process.env.FAKE_CODEX_STDERR || "");',
      '  process.exit(Number(process.env.FAKE_CODEX_EXIT));',
      '}',
      '',
    ].join('\n'), { mode: 0o755 });
    const home = join(dir, 'home');
    mkdirSync(home, { recursive: true });
    const header = 'Name          Command              Status    Auth';
    const cases = [
      ['registered', `${header}\nopenbot  /opt/openbot/run.sh  enabled  Unsupported\n`, 'ok', null],
      ['not-registered', `${header}\nnode_repl  /Applications/ChatGPT  enabled  Unsupported\n`, 'blocked', null],
      ['disabled', `${header}\nopenbot  /opt/openbot/run.sh  disabled  Unsupported\n`, 'blocked', null],
      ['unparseable', 'hello from a new CLI\n', 'unknown', null],
      ['exit-error', '', 'unknown', '3'],
    ];
    for (const [name, stdout, expected, exit] of cases) {
      const env = {
        PATH: `${bin}${delimiter}${process.env.PATH}`,
        FAKE_CODEX_STDOUT: stdout,
        FAKE_CODEX_STDERR: 'boom from codex',
        ...(exit ? { FAKE_CODEX_EXIT: exit } : {}),
      };
      const result = run(['doctor', '--home', home, '--no-handshake'], env);
      assert.equal(result.status, 0, `doctor 不该崩：${result.stderr}`);
      const doctor = JSON.parse(result.stdout);
      assert.equal(doctor.checks.length, 19);
      const item = doctor.checks.find((entry) => entry.id === 'codex-cli');
      assert.equal(item.status, expected, `${name}: ${item.detail}`);
      if (name === 'exit-error') assert.ok(item.detail.includes('exit-error'));
      if (name === 'registered') assert.ok(item.nextStep.includes('Codex 对话里验证'));
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('install-local 拒绝覆盖已有 openbot 键，--force 才替换并留备份', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentapp-cli-force-'));
  try {
    const path = join(dir, 'mcp.json');
    okJson(['install-local', LOCAL, '--target', 'cursor', '--write-to', path]);
    const denied = run(['install-local', LOCAL, '--target', 'cursor', '--write-to', path]);
    assert.equal(denied.status, 1);
    assert.ok(denied.stderr.includes('已存在 mcpServers.openbot'));
    const forced = okJson(['install-local', LOCAL, '--target', 'cursor', '--write-to', path, '--force']);
    assert.equal(forced.action, 'replace');
    assert.ok(forced.backupPath && existsSync(forced.backupPath));
    assert.equal(JSON.parse(readFileSync(path, 'utf8')).mcpServers.openbot.url, LOCAL);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('install-local --all 只输出逐平台计划，且拒绝任何会落盘的组合', () => {
  const all = okJson(['install-local', '--all']);
  assert.equal(all.planOnly, true);
  assert.equal(all.writes, 0);
  assert.equal(all.count, 10);
  assert.equal(all.plans.every((item) => item.applied === false), true);
  for (const [args, message] of [
    [['install-local', '--all', '--write-to', '/tmp/aac-should-not-exist.json'], '--all 只输出计划，不接受 --write-to；请逐个 target 显式安装'],
    [['install-local', '--all', '--force'], '--all 只输出计划，不接受 --force'],
    [['install-local', '--all', LOCAL], '--all 不接受发布地址；请逐个 target 显式安装'],
  ]) {
    const result = run(args);
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes(message), `${args.join(' ')} => ${result.stderr}`);
  }
  assert.equal(existsSync('/tmp/aac-should-not-exist.json'), false);
});

test('install-local --target zcode 写嵌套 mcp.servers，doctor 用同一套形状复核', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentapp-cli-zcode-'));
  try {
    const home = join(dir, 'home');
    const configPath = join(home, '.zcode', 'cli', 'config.json');
    const applied = okJson(['install-local', LOCAL, '--target', 'zcode', '--write-to', configPath]);
    assert.equal(applied.mode, 'json-merge');
    assert.equal(applied.destination, '~/.zcode/cli/config.json');
    assert.equal(applied.action, 'create');
    assert.ok(applied.backupPath === null);
    const written = JSON.parse(readFileSync(configPath, 'utf8'));
    assert.deepEqual(written.mcp.servers.openbot, { type: 'http', url: LOCAL });
    assert.equal(written.mcpServers, undefined);

    // 已有同名键时按嵌套路径拒绝，--force 才替换并留备份。
    const denied = run(['install-local', LOCAL, '--target', 'zcode', '--write-to', configPath]);
    assert.equal(denied.status, 1);
    assert.ok(denied.stderr.includes('已存在 mcp.servers.openbot'));
    const forced = okJson(['install-local', LOCAL, '--target', 'zcode', '--write-to', configPath, '--force']);
    assert.equal(forced.action, 'replace');
    assert.ok(forced.backupPath && existsSync(forced.backupPath));

    const doctor = okJson(['doctor', '--home', home, '--no-handshake']);
    assert.equal(doctor.registryProblems.length, 0);
    const zcode = doctor.checks.find((item) => item.id === 'zcode-config');
    assert.equal(zcode.status, 'ok');
    assert.ok(zcode.detail.includes('keys=[type, url]'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
