import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeConfig, makeMcpConfig, makeGuide, listTargets, findTarget, parseEndpoint,
} from '../src/config.mjs';
import { targets, plannedTargets } from '../src/targets.mjs';

const LOCAL = 'http://127.0.0.1:4818/mcp/example';
const REMOTE = 'https://mcp.example.com/mcp/example';
const STDIO_COMMAND = '/opt/openbot/run.sh';
const CREDENTIAL_PREFIXES = ['obcli_', 'obs_', 'Bearer sk-', 'Bearer obcli_'];

function expectMessage(fn, message) {
  assert.throws(fn, (error) => {
    assert.equal(error.message, message);
    return true;
  });
}

test('0.0.1 兼容入口仍输出千问办公格式且不含凭据', () => {
  assert.deepEqual(makeMcpConfig(LOCAL), {
    mcpServers: { openbot: { type: 'streamable-http', url: LOCAL } },
  });
});

test('地址校验按原因区分拒绝', () => {
  expectMessage(() => makeConfig({ address: '' }), '需要 OpenBot MCP 发布地址');
  expectMessage(() => makeConfig({ address: 'not-a-url' }), '无效的 MCP 地址');
  expectMessage(() => makeConfig({ address: 'file:///etc/passwd' }), '地址协议必须为 HTTPS 或 HTTP');
  expectMessage(() => makeConfig({ address: 'http://example.com/mcp/x' }), '非本机地址必须使用 HTTPS');
  expectMessage(() => makeConfig({ address: 'https://a:b@example.com/mcp' }), '地址不能包含账号或密码');
  expectMessage(() => makeConfig({ address: 'https://example.com/mcp?token=x' }), '地址不能包含查询参数');
  expectMessage(() => makeConfig({ address: 'https://example.com/mcp#x' }), '地址不能包含片段');
  assert.deepEqual(parseEndpoint(REMOTE), { href: REMOTE, isLocal: false });
  assert.deepEqual(parseEndpoint(LOCAL), { href: LOCAL, isLocal: true });
});

test('千问办公输出官方示例的 streamable-http 写法', () => {
  const result = makeConfig({ targetId: 'qwenwork', address: LOCAL });
  assert.equal(result.target, 'qwenwork');
  assert.equal(result.format, 'json');
  assert.deepEqual(result.config, {
    mcpServers: { openbot: { type: 'streamable-http', url: LOCAL } },
  });
});

test('WorkBuddy HTTP 输出本机 catalog 的 streamableHttp 写法', () => {
  const result = makeConfig({ targetId: 'workbuddy-http', address: LOCAL });
  assert.deepEqual(result.config, {
    mcpServers: { openbot: { type: 'streamableHttp', url: LOCAL } },
  });
  assert.notEqual(result.config.mcpServers.openbot.type, 'streamable-http');
});

test('WorkBuddy stdio 复用已有 run.sh，不需要发布地址', () => {
  const result = makeConfig({ targetId: 'workbuddy-stdio', connectorPath: STDIO_COMMAND });
  assert.deepEqual(result.config, {
    mcpServers: { openbot: { type: 'stdio', command: STDIO_COMMAND, args: [] } },
  });
  assert.equal(findTarget('workbuddy-stdio').input, 'none');
});

test('豆包工作输出表单字段清单而不是 mcpServers JSON', () => {
  const result = makeConfig({ targetId: 'doubao-work', address: LOCAL });
  assert.equal(result.format, 'form');
  assert.equal(result.config.mcpServers, undefined);
  assert.deepEqual(result.config, {
    format: 'form',
    fields: [
      { label: '服务器名称', value: 'openbot' },
      { label: '传输类型', value: 'HTTP' },
      { label: '服务器 URL', value: LOCAL },
      { label: 'Header 名称', value: 'Authorization' },
      { label: 'Header 值', value: '（不由此工具生成：在客户端填写受限 grant token）' },
    ],
  });
});

test('auth placeholder 只写环境变量占位符，且仅作用于支持它的客户端', () => {
  const placeholder = 'Bearer ${OPENBOT_GRANT_TOKEN}';
  assert.equal(
    makeConfig({ targetId: 'qwenwork', address: LOCAL, auth: 'placeholder' })
      .config.mcpServers.openbot.headers.Authorization,
    placeholder,
  );
  assert.equal(
    makeConfig({ targetId: 'workbuddy-http', address: LOCAL, auth: 'placeholder' })
      .config.mcpServers.openbot.headers.Authorization,
    placeholder,
  );
  assert.equal(
    makeConfig({ targetId: 'doubao-work', address: LOCAL, auth: 'placeholder' })
      .config.fields[4].value,
    placeholder,
  );
  expectMessage(
    () => makeConfig({ targetId: 'workbuddy-stdio', auth: 'placeholder' }),
    '客户端 workbuddy-stdio 的凭据由桌面桥提供，不接受 --auth placeholder',
  );
  expectMessage(
    () => makeConfig({ targetId: 'qwenwork', address: LOCAL, auth: 'real-token' }),
    'auth 只能是 none 或 placeholder；本工具不接受真实凭据',
  );
});

test('任何客户端、任何模式下都不输出真实凭据', () => {
  for (const target of targets) {
    for (const auth of ['none', 'placeholder']) {
      if (auth === 'placeholder' && !target.authPlaceholderSupported) continue;
      const options = { targetId: target.id, auth };
      if (target.input === 'address') options.address = LOCAL;
      else options.connectorPath = STDIO_COMMAND;
      const serialized = JSON.stringify(makeConfig(options));
      for (const prefix of CREDENTIAL_PREFIXES) assert.equal(serialized.includes(prefix), false);
      assert.equal(serialized.includes('OPENBOT_OWNER_TOKEN'), false);
    }
  }
});

test('本机地址按客户端给出可达性与桌面在线提示，并分原因', () => {
  const unknown = makeConfig({ targetId: 'doubao-work', address: LOCAL }).warnings;
  assert.ok(unknown.includes('该客户端能否访问本机 127.0.0.1 地址未实测；若任务在云端执行，本机地址不可达。'));
  assert.ok(unknown.includes('该客户端以表单填写为主，本工具输出的是填表清单，不是可直接粘贴的 JSON。'));
  assert.ok(unknown.includes('OpenBot 桌面 App 必须在线；HTTP 发布服务默认仅监听 127.0.0.1:4818，需在「设置 → 应用连接」手动启动，退出即停服。'));

  const workbuddy = makeConfig({ targetId: 'workbuddy-http', address: LOCAL }).warnings;
  assert.equal(
    workbuddy.includes('该客户端能否访问本机 127.0.0.1 地址未实测；若任务在云端执行，本机地址不可达。'),
    false,
  );
  assert.ok(workbuddy.includes('写进 mcp.json 只是声明，还需在「自定义连接器」入口点一次「信任」才注入 MCP 工具。'));

  const stdio = makeConfig({ targetId: 'workbuddy-stdio' }).warnings;
  assert.ok(stdio.includes('stdio 变体使用本机 owner token；需要最小权限时改用 HTTP 发布端点 + grant token。'));
  assert.ok(stdio.includes('该 stdio 连接器读取桌面启动时写出的 CLI 桥 token，配置里不含凭据；不要分享本机 token 文件。'));
  assert.equal(stdio.some((line) => line.includes('4818')), false);

  const remote = makeConfig({ targetId: 'qwenwork', address: REMOTE }).warnings;
  assert.equal(remote.some((line) => line.includes('桌面 App 必须在线')), false);
  assert.ok(remote.includes('当前 OpenBot 没有公网常驻 MCP Server；远程 HTTPS 地址需自行部署并验收，本工具只生成配置。'));
});

test('不接受被静默忽略的参数', () => {
  expectMessage(
    () => makeConfig({ targetId: 'qwenwork', address: LOCAL, connectorPath: STDIO_COMMAND }),
    '只有 stdio 客户端支持 --connector-path',
  );
  expectMessage(
    () => makeConfig({ targetId: 'workbuddy-stdio', address: LOCAL }),
    '客户端 workbuddy-stdio 使用 stdio 连接器，不需要发布地址',
  );
  expectMessage(
    () => makeConfig({ targetId: 'workbuddy-http' }),
    '客户端 workbuddy-http 需要 OpenBot MCP 发布地址',
  );
  expectMessage(
    () => makeConfig({ targetId: 'workbuddy-stdio', connectorPath: '' }),
    'stdio 连接器需要可执行的 run.sh 路径',
  );
  expectMessage(
    () => findTarget('nope'),
    '未知客户端 nope；可用：qwenwork, workbuddy-http, workbuddy-stdio, doubao-work, codex, codex-stdio, cursor, zcode, zcode-stdio, claude-desktop',
  );
  expectMessage(
    () => makeConfig({ targetId: 'qwenwork', address: LOCAL, token: 'obcli_REAL' }),
    '未知配置选项 token',
  );
  expectMessage(
    () => makeGuide({ targetId: 'qwenwork', address: LOCAL, authh: 'placeholder' }),
    '未知配置选项 authh',
  );
});

test('注册表每个条目都被生成路径真实读取，未完成清单保持未勾', () => {
  const listing = listTargets();
  assert.equal(listing.default, 'qwenwork');
  assert.deepEqual(listing.targets.map((item) => item.id), [
    'qwenwork', 'workbuddy-http', 'workbuddy-stdio', 'doubao-work', 'codex', 'codex-stdio', 'cursor', 'zcode', 'zcode-stdio', 'claude-desktop',
  ]);
  assert.equal(new Set(targets.map((item) => item.id)).size, targets.length);
  assert.equal(listing.targets.every((item) => item.liveTested === false), true);
  assert.deepEqual(listing.planned.map((item) => item.id), [
    'chatgpt-web', 'qwenwork-market', 'workbuddy-market', 'dingtalk-market', 'feishu-aily-market',
  ]);
  assert.deepEqual(listing.planned.map((item) => item.reason), [
    '网页版不读取本地 Codex 配置，需发布为远程 MCP 插件后由工作区安装',
    '当前版本不允许个人用户上传或发布自定义能力，企业空间仅组织内共享',
    '需主体认证、公网 HTTPS MCP Server、Connector 包与平台审核',
    '官方提供第三方 MCP Server 接入路径（AI 能力中心 MCP 广场与助理插件配置，SSE / Streamable HTTP + Headers，见 open.dingtalk.com 文档）；上架与审核口径未取证，暂未建 target',
    '企业内 MCP 市场（{公司前缀}.feishu.cn/ai/mcpservers）支持注册企业内部 MCP 服务与自定义 MCP 工具（HTTP Streaming）；属企业内路径，公开上架口径未取证，暂未建 target',
  ]);
  assert.equal(listing.planned.length, plannedTargets.length);

  const literal = {
    qwenwork: { transport: 'streamable-http', entry: '扩展 → 连接器 → + 添加 → 粘贴 JSON 配置' },
    'workbuddy-http': {
      transport: 'streamableHttp',
      entry: '~/.workbuddy/mcp.json，或 连接器 → 自定义连接器 → 配置 MCP；保存后需点「信任」',
    },
    'workbuddy-stdio': {
      transport: 'stdio',
      entry: '~/.workbuddy/mcp.json 已注册 openbot → run.sh；保存后需点「信任」',
    },
    'doubao-work': {
      transport: 'HTTP',
      entry: '插件·技能·伙伴 → 连接器 → 添加 → 新建自定义连接器',
    },
    codex: {
      transport: 'streamable-http',
      entry: '~/.codex/config.toml 的 [mcp_servers.openbot]，或 桌面 设置 → MCP servers',
    },
    'codex-stdio': {
      transport: 'stdio',
      entry: '~/.codex/config.toml 的 [mcp_servers.openbot]，command 指向 run.sh',
    },
    cursor: {
      transport: 'streamable-http',
      entry: '~/.cursor/mcp.json（全局）或 .cursor/mcp.json（项目级）',
    },
    zcode: {
      transport: 'http',
      entry: '~/.zcode/cli/config.json 的 mcp.servers，或 设置 → MCP 表单',
    },
    'zcode-stdio': {
      transport: 'stdio',
      entry: '~/.zcode/cli/config.json 的 mcp.servers，command 指向 run.sh',
    },
    'claude-desktop': {
      transport: 'stdio',
      entry: 'Settings → Developer → Edit Config → claude_desktop_config.json',
    },
  };

  for (const target of targets) {
    const options = { targetId: target.id };
    if (target.input === 'address') options.address = LOCAL;
    else options.connectorPath = STDIO_COMMAND;
    const result = makeConfig(options);
    assert.equal(result.target, target.id);
    assert.equal(result.format, target.format);
    assert.ok(result.warnings.length > 0);

    const guide = makeGuide(options);
    for (const field of [
      target.label, target.entry, target.auth, target.formatSource, target.note,
    ]) {
      assert.ok(typeof field === 'string' && field.length > 0, `${target.id} 的字段被清空`);
      assert.ok(guide.includes(field), `${target.id} 的 guide 缺少 ${field}`);
    }
    assert.ok(guide.includes('实机连接测试：未完成'));
    assert.ok(guide.includes('需要填写或粘贴的内容：'));
    assert.ok(guide.includes(literal[target.id].entry));

    const listed = listing.targets.find((item) => item.id === target.id);
    assert.equal(listed.transport, literal[target.id].transport);
    assert.equal(listed.entry, literal[target.id].entry);
    assert.equal(listed.input, target.input);
    assert.equal(listed.localHttp, target.localHttp);
    assert.equal(listed.authPlaceholderSupported, target.authPlaceholderSupported);
  }
});

test('Codex 输出官方 config.toml 字段，不是 mcpServers JSON', () => {
  const result = makeConfig({ targetId: 'codex', address: LOCAL });
  assert.equal(result.format, 'toml');
  assert.equal(result.config.mcpServers, undefined);
  assert.equal(
    result.config.content,
    `[mcp_servers.openbot]\nurl = "${LOCAL}"\n`,
  );
  const withAuth = makeConfig({ targetId: 'codex', address: LOCAL, auth: 'placeholder' });
  assert.equal(
    withAuth.config.content,
    `[mcp_servers.openbot]\nurl = "${LOCAL}"\nbearer_token_env_var = "OPENBOT_GRANT_TOKEN"\n`,
  );
  assert.equal(withAuth.config.content.includes('Bearer '), false);
  assert.ok(withAuth.warnings.includes('config.toml 是追加一个 [mcp_servers.openbot] 表，不是 mcpServers JSON；Bearer 凭据只写环境变量名。'));

  const stdio = makeConfig({ targetId: 'codex-stdio', connectorPath: STDIO_COMMAND });
  assert.equal(stdio.format, 'toml');
  assert.equal(
    stdio.config.content,
    `[mcp_servers.openbot]\ncommand = "${STDIO_COMMAND}"\nargs = []\n`,
  );
  assert.equal(stdio.config.content.includes('url = '), false);
  assert.equal(stdio.config.content.includes('bearer_token_env_var'), false);
  assert.equal(stdio.config.mcpServers, undefined);
  assert.ok(stdio.warnings.includes('config.toml 追加的是本地 stdio 表（command / args），不需要 MCP 发布地址；与 codex 的 HTTP 表共用同一个表名，只能二选一。'));
  expectMessage(
    () => makeConfig({ targetId: 'codex-stdio', address: LOCAL }),
    '客户端 codex-stdio 使用 stdio 连接器，不需要发布地址',
  );
});

test('Cursor 与 Claude Desktop 按官方示例不写 type 字段', () => {
  assert.deepEqual(makeConfig({ targetId: 'cursor', address: LOCAL }).config, {
    mcpServers: { openbot: { url: LOCAL } },
  });
  assert.deepEqual(
    makeConfig({ targetId: 'claude-desktop', connectorPath: STDIO_COMMAND }).config,
    { mcpServers: { openbot: { command: STDIO_COMMAND, args: [] } } },
  );
  assert.equal(makeConfig({ targetId: 'qwenwork', address: LOCAL }).config.mcpServers.openbot.type, 'streamable-http');
  assert.equal(makeConfig({ targetId: 'workbuddy-http', address: LOCAL }).config.mcpServers.openbot.type, 'streamableHttp');
  assert.equal(makeConfig({ targetId: 'workbuddy-stdio' }).config.mcpServers.openbot.type, 'stdio');
});

test('guide 对 TOML 与表单输出可读内容，不把转义字符串塞给人看', () => {
  const toml = makeGuide({ targetId: 'codex', address: LOCAL, auth: 'placeholder' });
  assert.ok(toml.includes('[mcp_servers.openbot]'));
  assert.ok(toml.includes('bearer_token_env_var = "OPENBOT_GRANT_TOKEN"'));
  assert.equal(toml.includes('\\n'), false);
  assert.ok(toml.includes('后续步骤：'));
  assert.ok(toml.includes('ChatGPT 网页版不读取本机 config.toml'));

  const form = makeGuide({ targetId: 'doubao-work', address: LOCAL });
  assert.ok(form.includes('服务器 URL: http://127.0.0.1:4818/mcp/example'));
  assert.equal(form.includes('"format": "form"'), false);
});

test('stdio 客户端才可以给 --connector-path，且两个 stdio target 都接受', () => {
  expectMessage(
    () => makeConfig({ targetId: 'codex', address: LOCAL, connectorPath: STDIO_COMMAND }),
    '只有 stdio 客户端支持 --connector-path',
  );
  const claude = makeConfig({ targetId: 'claude-desktop', connectorPath: STDIO_COMMAND });
  assert.equal(claude.config.mcpServers.openbot.command, STDIO_COMMAND);
  assert.ok(claude.warnings.includes('这里只配置本地 STDIO；Claude 的远程自定义连接器由 Anthropic 云端发起，本机 127.0.0.1 不可达。'));
});

test('ZCode 输出官方嵌套 mcp.servers 形状，且配置文件不收凭据占位符', () => {
  const http = makeConfig({ targetId: 'zcode', address: LOCAL });
  assert.equal(http.format, 'json');
  assert.deepEqual(http.config, {
    mcp: { servers: { openbot: { type: 'http', url: LOCAL } } },
  });
  assert.equal(http.config.mcpServers, undefined);
  // 配置文件不展开 ${...} 模板：占位符会被原样发出去，所以 ZCode 不支持 auth placeholder。
  expectMessage(
    () => makeConfig({ targetId: 'zcode', address: LOCAL, auth: 'placeholder' }),
    '客户端 zcode 的凭据由桌面桥提供，不接受 --auth placeholder',
  );
  assert.ok(http.warnings.some((line) => line.includes('不展开 ${...} 模板占位符')));
  assert.ok(http.warnings.some((line) => line.includes('未知键会导致整条服务被静默丢弃')));

  const stdio = makeConfig({ targetId: 'zcode-stdio', connectorPath: STDIO_COMMAND });
  assert.deepEqual(stdio.config, {
    mcp: { servers: { openbot: { type: 'stdio', command: STDIO_COMMAND, args: [] } } },
  });
  assert.equal(stdio.config.mcpServers, undefined);
  expectMessage(
    () => makeConfig({ targetId: 'zcode-stdio', address: LOCAL }),
    '客户端 zcode-stdio 使用 stdio 连接器，不需要发布地址',
  );
});
