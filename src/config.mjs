import {
  SERVER_NAME,
  AUTH_PLACEHOLDER,
  TOKEN_ENV_VAR,
  DEFAULT_CONNECTOR_PATH,
  targets,
  plannedTargets,
} from './targets.mjs';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const AUTH_MODES = new Set(['none', 'placeholder']);
const ALLOWED_OPTION_KEYS = new Set(['targetId', 'address', 'auth', 'connectorPath']);

export function parseEndpoint(address) {
  if (typeof address !== 'string' || !address.trim()) {
    throw new Error('需要 OpenBot MCP 发布地址');
  }
  let url;
  try { url = new URL(address); }
  catch { throw new Error('无效的 MCP 地址'); }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('地址协议必须为 HTTPS 或 HTTP');
  }
  const isLocal = LOCAL_HOSTS.has(url.hostname);
  if (url.protocol === 'http:' && !isLocal) {
    throw new Error('非本机地址必须使用 HTTPS');
  }
  if (url.username || url.password) throw new Error('地址不能包含账号或密码');
  if (url.search) throw new Error('地址不能包含查询参数');
  if (url.hash) throw new Error('地址不能包含片段');
  return { href: url.href, isLocal };
}

export function findTarget(id) {
  const match = targets.find((item) => item.id === id);
  if (!match) {
    throw new Error(`未知客户端 ${id}；可用：${targets.map((item) => item.id).join(', ')}`);
  }
  return match;
}

export function listTargets() {
  return {
    default: 'qwenwork',
    targets: targets.map((item) => ({
      id: item.id,
      label: item.label,
      format: item.format,
      input: item.input,
      transport: item.transport,
      entry: item.entry,
      configPath: item.configPath,
      authPlaceholderSupported: item.authPlaceholderSupported,
      localHttp: item.localHttp,
      liveTested: item.liveTested,
    })),
    planned: plannedTargets,
    note: '所有客户端的实机连接测试均未完成；生成器不写入客户端设置、不生成凭据。',
  };
}

function warningsFor(target, endpoint) {
  const warnings = [
    target.usesOwnerToken
      ? '该 stdio 连接器读取桌面启动时写出的 CLI 桥 token，配置里不含凭据；不要分享本机 token 文件。'
      : '配置不含真实凭据；受限 grant token 需在客户端授权设置中单独提供，不要使用桌面 owner token。',
  ];
  if (endpoint?.isLocal) {
    warnings.push(
      'OpenBot 桌面 App 必须在线；HTTP 发布服务默认仅监听 127.0.0.1:4818，需在「设置 → 应用连接」手动启动，退出即停服。',
    );
    if (target.localHttp === 'unknown') {
      warnings.push('该客户端能否访问本机 127.0.0.1 地址未实测；若任务在云端执行，本机地址不可达。');
    }
  } else if (endpoint) {
    warnings.push('当前 OpenBot 没有公网常驻 MCP Server；远程 HTTPS 地址需自行部署并验收，本工具只生成配置。');
  }
  if (target.requiresTrust) {
    warnings.push('写进 mcp.json 只是声明，还需在「自定义连接器」入口点一次「信任」才注入 MCP 工具。');
  }
  if (target.usesOwnerToken) {
    warnings.push('stdio 变体使用本机 owner token；需要最小权限时改用 HTTP 发布端点 + grant token。');
  }
  if (target.format === 'form') {
    warnings.push('该客户端以表单填写为主，本工具输出的是填表清单，不是可直接粘贴的 JSON。');
  }
  if (target.format === 'toml') {
    if (target.input === 'none') {
      warnings.push('config.toml 追加的是本地 stdio 表（command / args），不需要 MCP 发布地址；与 codex 的 HTTP 表共用同一个表名，只能二选一。');
    } else {
      warnings.push('config.toml 是追加一个 [mcp_servers.openbot] 表，不是 mcpServers JSON；Bearer 凭据只写环境变量名。');
    }
  }
  if (target.id === 'claude-desktop') {
    warnings.push('这里只配置本地 STDIO；Claude 的远程自定义连接器由 Anthropic 云端发起，本机 127.0.0.1 不可达。');
  }
  if (target.mcpKeyShape === 'mcp.servers') {
    warnings.push('ZCode 配置文件不展开 ${...} 模板占位符（只有插件自带的 MCP 服务才展开）；HTTP 表头需要填真实值，本工具不生成凭据，stdio 路径必须写绝对路径。');
    warnings.push('ZCode 的 MCP 配置 schema 是严格的：未知键会导致整条服务被静默丢弃；保存后重启会话，并在 设置 → MCP 确认状态。');
  }
  return warnings;
}

function tomlString(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** ZCode 用嵌套 mcp.servers 键，其余客户端用顶层 mcpServers；形状差异在这里一处收口。 */
function wrapServers(target, servers) {
  if (target.mcpKeyShape === 'mcp.servers') {
    return { mcp: { servers } };
  }
  return { mcpServers: servers };
}

function buildConfig(target, endpoint, auth, connectorPath) {
  if (target.format === 'form') {
    return {
      format: 'form',
      fields: [
        { label: '服务器名称', value: SERVER_NAME },
        { label: '传输类型', value: target.transport },
        { label: '服务器 URL', value: endpoint.href },
        { label: 'Header 名称', value: 'Authorization' },
        {
          label: 'Header 值',
          value: auth === 'placeholder'
            ? AUTH_PLACEHOLDER
            : '（不由此工具生成：在客户端填写受限 grant token）',
        },
      ],
    };
  }
  if (target.format === 'toml') {
    const lines = [ `[mcp_servers.${SERVER_NAME}]` ];
    if (target.input === 'none') {
      lines.push(`command = ${tomlString(connectorPath)}`, 'args = []');
    } else {
      lines.push(`url = ${tomlString(endpoint.href)}`);
      if (auth === 'placeholder') lines.push(`bearer_token_env_var = ${tomlString(TOKEN_ENV_VAR)}`);
    }
    return { format: 'toml', content: `${lines.join('\n')}\n` };
  }
  if (target.input === 'none') {
    const server = target.includeTransportType
      ? { type: target.transport, command: connectorPath, args: [] }
      : { command: connectorPath, args: [] };
    return wrapServers(target, { [SERVER_NAME]: server });
  }
  const server = { url: endpoint.href };
  if (target.includeTransportType) server.type = target.transport;
  if (auth === 'placeholder') server.headers = { Authorization: AUTH_PLACEHOLDER };
  const ordered = target.includeTransportType
    ? { type: server.type, ...(server.url ? { url: server.url } : {}), ...(server.headers ? { headers: server.headers } : {}) }
    : { ...(server.url ? { url: server.url } : {}), ...(server.headers ? { headers: server.headers } : {}) };
  return wrapServers(target, { [SERVER_NAME]: ordered });
}

export function makeConfig(options = {}) {
  const {
    targetId = 'qwenwork',
    address,
    auth = 'none',
    connectorPath = DEFAULT_CONNECTOR_PATH,
  } = options;
  for (const key of Object.keys(options)) {
    if (!ALLOWED_OPTION_KEYS.has(key)) throw new Error(`未知配置选项 ${key}`);
  }
  const target = findTarget(targetId);
  if (!AUTH_MODES.has(auth)) {
    throw new Error('auth 只能是 none 或 placeholder；本工具不接受真实凭据');
  }
  if (auth === 'placeholder' && !target.authPlaceholderSupported) {
    throw new Error(`客户端 ${target.id} 的凭据由桌面桥提供，不接受 --auth placeholder`);
  }
  if (options.connectorPath !== undefined && target.input !== 'none') {
    throw new Error('只有 stdio 客户端支持 --connector-path');
  }
  if (target.input === 'address' && (address === undefined || address === null)) {
    throw new Error(`客户端 ${target.id} 需要 OpenBot MCP 发布地址`);
  }
  if (target.input === 'none' && address !== undefined && address !== null) {
    throw new Error(`客户端 ${target.id} 使用 stdio 连接器，不需要发布地址`);
  }
  if (target.input === 'none' && (typeof connectorPath !== 'string' || !connectorPath.trim())) {
    throw new Error('stdio 连接器需要可执行的 run.sh 路径');
  }
  const endpoint = target.input === 'address' ? parseEndpoint(address) : null;

  return {
    target: target.id,
    format: target.format,
    config: buildConfig(target, endpoint, auth, connectorPath),
    warnings: warningsFor(target, endpoint),
  };
}

/** 保留 0.0.1 的兼容入口：默认按千问办公格式生成，不含凭据。 */
export function makeMcpConfig(address) {
  return makeConfig({ targetId: 'qwenwork', address }).config;
}

function renderConfig(result) {
  if (result.format === 'toml') return result.config.content.trimEnd().split('\n');
  if (result.format === 'form') {
    return result.config.fields.map((field) => `${field.label}: ${field.value}`);
  }
  return JSON.stringify(result.config, null, 2).split('\n');
}

export function makeGuide(options = {}) {
  const result = makeConfig(options);
  const target = findTarget(result.target);
  const lines = [
    `${target.label}（${target.id}）`,
    `配置入口：${target.entry}`,
    `格式依据：${target.formatSource}`,
    `实机连接测试：${target.liveTested ? '已完成' : '未完成'}`,
    `认证方式：${target.auth}`,
    '',
    '需要填写或粘贴的内容：',
  ];
  for (const line of renderConfig(result)) lines.push(`  ${line}`);
  lines.push('', '说明：', `  ${target.note}`);
  for (const warning of result.warnings) lines.push(`  ${warning}`);
  if (target.postSteps.length) {
    lines.push('', '后续步骤：');
    for (const step of target.postSteps) lines.push(`  ${step}`);
  }
  return lines.join('\n');
}
