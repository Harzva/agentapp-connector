import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import http from 'node:http';
import { DEFAULT_CONNECTOR_PATH, SERVER_NAME } from './targets.mjs';
import { platforms } from './policies.mjs';
// 只读探测复用写盘路径那套表头解析：同一份 config.toml 不能两处用两套「表是否存在」。
// install.mjs 顶层只有 import 与常量，引入它不会触发任何写盘动作。
import { findTomlTableRange } from './install.mjs';

const APP_CANDIDATES = {
  workbuddy: ['WorkBuddy.app'],
  doubao: ['Doubao.app', '豆包.app'],
  chatgpt: ['ChatGPT.app'],
  cursor: ['Cursor.app'],
  claude: ['Claude.app'],
  openbot: ['OpenBot.app'],
  qwenwork: ['QwenWork.app', 'Qwen.app', '千问办公.app'],
  zcode: ['ZCode.app'],
};

export function readJsonSafe(path) {
  if (!existsSync(path)) return { exists: false, parsed: null, error: null };
  try { return { exists: true, parsed: JSON.parse(readFileSync(path, 'utf8')), error: null }; }
  catch { return { exists: true, parsed: null, error: 'invalid-json-or-unreadable' }; }
}

export function readTextSafe(path) {
  if (!existsSync(path)) return { exists: false, text: null, error: null };
  try { return { exists: true, text: readFileSync(path, 'utf8'), error: null }; }
  catch { return { exists: true, text: null, error: 'unreadable' }; }
}

export function pathInfo(path) {
  if (!existsSync(path)) return { exists: false, executable: false };
  try {
    return { exists: true, executable: Boolean(statSync(path).mode & 0o111) };
  } catch { return { exists: true, executable: false }; }
}

/** 对 stdio MCP server 做真实的 initialize / tools/list / ping 握手。 */
export function stdioHandshake({ command, args = [], timeoutMs = 4000 }) {
  const requests = [
    {
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: {
        protocolVersion: '2025-06-18', capabilities: {},
        clientInfo: { name: 'agentapp-doctor', version: '0.0.4' },
      },
    },
    { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
    { jsonrpc: '2.0', id: 3, method: 'ping', params: {} },
  ];
  return new Promise((resolvePromise) => {
    let child;
    try {
      child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (error) {
      resolvePromise({ status: 'spawn-failed', reason: error.message, responses: {} });
      return;
    }
    const responses = {};
    let buffer = '';
    let stderr = '';
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { child.kill('SIGTERM'); } catch { /* 已退出 */ }
      resolvePromise(result);
    };
    const timer = setTimeout(() => {
      finish({
        status: 'timeout', reason: `${timeoutMs}ms 内没有收齐 3 个响应`,
        responses, received: Object.keys(responses).length, stderr: stderr.slice(0, 400),
      });
    }, timeoutMs);

    child.on('error', (error) => {
      finish({ status: 'spawn-failed', reason: error.message, responses });
    });
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      if (buffer.length > 512 * 1024) buffer = buffer.slice(-512 * 1024);
      let index;
      while ((index = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);
        if (!line) continue;
        try {
          const message = JSON.parse(line);
          if (message && Number.isInteger(message.id)) responses[message.id] = message;
        } catch { /* 忽略非 JSON-RPC 行 */ }
      }
      if (responses[1] && responses[2] && responses[3]) {
        const init = responses[1].result || {};
        const tools = Array.isArray(responses[2].result?.tools)
          ? responses[2].result.tools.map((item) => item.name)
          : [];
        finish({
          status: 'ok',
          serverInfo: init.serverInfo || null,
          protocolVersion: init.protocolVersion || null,
          tools,
          toolCount: tools.length,
          responses: { initialize: true, toolsList: true, ping: true },
        });
      }
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-4096); });
    child.on('exit', (code, signal) => {
      if (!settled) {
        finish({
          status: 'incomplete', reason: `子进程提前退出（code=${code}, signal=${signal || 'none'}）`,
          responses, received: Object.keys(responses).length, stderr: stderr.slice(0, 400),
        });
      }
    });
    // 故意不 end stdin：readline 的 close 会让 server 立即 exit(0)，
    // 异步 handler 的响应可能被截断。收齐响应后由 finish() 杀掉子进程。
    for (const request of requests) child.stdin.write(`${JSON.stringify(request)}\n`);
  });
}

/** TCP 层探测 4818：只判断端口，不假称完成了 MCP HTTP 握手。 */
export function probeTcp({ host = '127.0.0.1', port = 4818, timeoutMs = 1200 } = {}) {
  return new Promise((resolvePromise) => {
    let settled = false;
    const socket = net.createConnection({ host, port });
    const finish = (status, reason) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { socket.destroy(); } catch { /* 已关闭 */ }
      resolvePromise({ status, reason });
    };
    const timer = setTimeout(() => finish('timeout', `${timeoutMs}ms 未连接成功`), timeoutMs);
    socket.on('connect', () => finish('listening', null));
    socket.on('error', (error) => {
      if (error.code === 'ECONNREFUSED') finish('refused', '连接被拒绝：4818 没有监听');
      else finish('error', error.code || error.message);
    });
  });
}

/**
 * CLI 桥 HTTP 层探测：endpoint.json / token 存在 ≠ 桥能应答。
 * 本机出现过 TCP 可连、HTTP 永不回包（桌面主进程卡住），只看文件会误报 ok。
 * token 只用于 Authorization 头，绝不写进返回的报告。
 */
export function probeBridgeHttp({ endpointPath, tokenPath, timeoutMs = 1800 } = {}) {
  return new Promise((resolvePromise) => {
    const endpoint = readJsonSafe(endpointPath);
    const token = readTextSafe(tokenPath);
    if (!endpoint.exists) {
      resolvePromise({ status: 'no-endpoint', reason: 'endpoint.json 不存在' });
      return;
    }
    if (!endpoint.parsed || !Number.isInteger(endpoint.parsed.port)) {
      resolvePromise({ status: 'bad-endpoint', reason: 'endpoint.json 里没有合法 port' });
      return;
    }
    if (!token.exists || !token.text?.trim()) {
      resolvePromise({ status: 'no-token', reason: 'token 文件不存在或读不到' });
      return;
    }
    const port = endpoint.parsed.port;
    // 整数不等于可用端口：桌面崩溃 / 半写状态可能留下 0、负数或 >65535。
    // http.request 拿到越界端口会同步抛 ERR_SOCKET_BAD_PORT，旧实现让整个
    // Promise reject，doctor / local-status 因而退出 1、JSON 报告 0 字节（本机已复现）。
    if (port < 1 || port > 65535) {
      resolvePromise({ status: 'bad-endpoint', reason: `endpoint.json 里 port=${port} 不在 1–65535`, port });
      return;
    }
    let settled = false;
    let timer;
    let request = null;
    const finish = (status, reason, extra = {}) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { request?.destroy(); } catch { /* 已关闭或尚未构造 */ }
      resolvePromise({ status, reason, port, ...extra });
    };
    try {
      request = http.request({
        host: '127.0.0.1', port, path: '/v1/status', method: 'GET',
        headers: { Authorization: `Bearer ${token.text.trim()}` },
      }, (response) => {
        let bytes = 0;
        response.on('data', (chunk) => { bytes += Buffer.byteLength(chunk); });
        response.on('end', () => finish(
          response.statusCode >= 200 && response.statusCode < 300 ? 'ok' : 'http-error',
          `HTTP ${response.statusCode}`,
          { httpStatus: response.statusCode, bytes },
        ));
      });
      timer = setTimeout(() => finish('timeout', `${timeoutMs}ms 内没有 HTTP 响应`), timeoutMs);
      request.on('error', (error) => finish(
        error.code === 'ECONNREFUSED' ? 'refused' : 'error',
        error.code || error.message,
      ));
      request.end();
    } catch (error) {
      // 构造 / 发起请求时的同步异常（越界端口、非法 header 字符等）必须落到
      // 探测结果里，成为一项 blocked，而不是让上层 17 项诊断整份消失。
      settled = true;
      clearTimeout(timer);
      try { request?.destroy(); } catch { /* 已关闭或尚未构造 */ }
      resolvePromise({
        status: 'request-failed',
        reason: `${error.code || error.name}: ${error.message}`,
        port,
      });
    }
  });
}

export function runCommand(command, args = [], timeoutMs = 4000) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: timeoutMs });
  if (result.error?.code === 'ENOENT') return { status: 'not-found', stdout: '' };
  if (result.error?.code === 'ETIMEDOUT') return { status: 'timeout', stdout: '' };
  if (result.error) return { status: 'error', stdout: '', reason: result.error.message };
  const stdout = String(result.stdout || '');
  const stderr = String(result.stderr || '');
  // 只看 result.error 会把「进程正常结束但退出码非 0」误记成 ok：
  // CLI 明确报错时的 stdout 不是有效证据，必须单独分出来，并带上 stderr 摘要。
  if (result.status !== 0) {
    return {
      status: 'exit-error', stdout, stderr, code: result.status,
      reason: stderr.trim().slice(0, 200) || `exit ${result.status}`,
    };
  }
  return { status: 'ok', stdout, stderr, code: result.status };
}

function findApps(home, appDirs) {
  const found = {};
  for (const [id, candidates] of Object.entries(APP_CANDIDATES)) {
    found[id] = appDirs.some((dir) => candidates.some((name) => existsSync(join(dir, name))));
  }
  return found;
}

export async function collectLocalFacts(options = {}) {
  const home = options.home || homedir();
  const appDirs = options.appDirs || ['/Applications', join(home, 'Applications')];
  const connectorPath = options.connectorPath || DEFAULT_CONNECTOR_PATH;
  const paths = {
    workbuddyMcp: join(home, '.workbuddy', 'mcp.json'),
    approvals: join(home, '.workbuddy', 'mcp-approvals.json'),
    codexConfig: join(home, '.codex', 'config.toml'),
    cursorMcp: join(home, '.cursor', 'mcp.json'),
    zcodeConfig: join(home, '.zcode', 'cli', 'config.json'),
    claudeConfig: join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
    openbotEndpoint: join(home, 'Library', 'Application Support', 'openbot', 'cli-bridge', 'endpoint.json'),
    openbotToken: join(home, 'Library', 'Application Support', 'openbot', 'cli-bridge', 'token'),
    connectorRunSh: connectorPath,
  };
  const checks = {
    apps: findApps(home, appDirs),
    workbuddyMcp: readJsonSafe(paths.workbuddyMcp),
    approvals: readJsonSafe(paths.approvals),
    codexConfig: readTextSafe(paths.codexConfig),
    cursorMcp: readJsonSafe(paths.cursorMcp),
    zcodeConfig: readJsonSafe(paths.zcodeConfig),
    claudeConfig: readJsonSafe(paths.claudeConfig),
    openbotEndpoint: pathInfo(paths.openbotEndpoint),
    openbotToken: pathInfo(paths.openbotToken),
    connectorRunSh: pathInfo(paths.connectorRunSh),
    port4818: options.skipTcp ? { status: 'skipped', reason: '调用方跳过端口探测' } : await probeTcp(),
    bridgeHttp: options.skipBridgeHttp
      ? { status: 'skipped', reason: '调用方跳过 CLI 桥 HTTP 探测' }
      : await probeBridgeHttp({
        endpointPath: paths.openbotEndpoint,
        tokenPath: paths.openbotToken,
        timeoutMs: options.bridgeHttpTimeoutMs || 1800,
      }),
    handshake: options.skipHandshake
      ? { status: 'skipped', reason: '调用方跳过握手' }
      : await stdioHandshake({ command: connectorPath, args: [], timeoutMs: options.handshakeTimeoutMs || 4000 }),
    codexCli: options.skipCommands
      ? { status: 'skipped', stdout: '' }
      : runCommand('codex', ['mcp', 'list'], options.commandTimeoutMs || 4000),
  };
  return {
    checkedAt: options.now || new Date().toISOString(),
    home,
    paths,
    ...checks,
  };
}

function check(id, platform, status, detail, nextStep) {
  return { id, platform, status, detail, nextStep };
}

/** 桥 HTTP 探测结果到 doctor 状态的映射；超时是观察到的「不应答」，不是「不知道」。 */
export const BRIDGE_HTTP_STATUS = {
  ok: 'ok',
  'no-endpoint': 'blocked',
  'bad-endpoint': 'blocked',
  'no-token': 'blocked',
  refused: 'blocked',
  timeout: 'blocked',
  'http-error': 'blocked',
  // 请求构造阶段就失败（越界端口、非法 header 等）是明确的「桥不通」，不是「不知道」。
  'request-failed': 'blocked',
  error: 'unknown',
  skipped: 'unknown',
  unknown: 'unknown',
};

/**
 * 桥状态对应的下一步动作，与 BRIDGE_HTTP_STATUS 一一对应。
 * 旧实现所有失败都给同一句「确认主窗口、重启 OpenBot.app」：port=70000 这种
 * 坏数据也被叫去重开桌面，把动作带到错处且不报错（真机重启后文件并不重写）。
 * test/local.test.mjs 断言两张表键集合一致，新增状态必须同时补指引。
 */
export const BRIDGE_NEXT_STEP = {
  ok: '桥 HTTP 已应答；tools/call 仍需在客户端对话里实际验证',
  'no-endpoint': 'endpoint.json 不存在：打开 OpenBot.app 等主窗口出现，让 CLI 桥写出文件',
  'bad-endpoint': 'endpoint.json 的 port 缺失或不在 1–65535：检查文件内容，必要时删掉让桌面重新生成；单纯重启不保证会重写',
  'no-token': 'CLI 桥 token 文件不存在或读不到：打开 OpenBot.app 等主窗口出现；不要在配置里手填凭据',
  refused: '端口不可达：确认 OpenBot 桌面在线，且 endpoint.json 里的端口仍有效',
  timeout: 'TCP 可连但 /v1/status 不回包：桌面主进程可能卡住，重启 OpenBot.app 后重试',
  'http-error': '桥返回 HTTP 错误：看 detail 里的 httpStatus，确认桌面主窗口已出现，必要时重启 OpenBot.app',
  'request-failed': '请求构造失败：看 detail 里的错误码；token 含换行/控制字符会触发 ERR_INVALID_CHAR，检查 token 与 endpoint.json',
  error: 'HTTP 请求报错：看 detail 里的错误码，确认本机网络与桌面状态',
  skipped: '调用方跳过了桥 HTTP 探测；本次没有桥可用性结论，重跑 doctor 时不要加跳过参数',
  unknown: '桥状态未知：重新运行 doctor 获取可判定的探测结果，不要据此推断桥可用',
};

/**
 * config.toml 里是否真的声明了 [mcp_servers.openbot]。
 * 旧实现用 `text.includes('[mcp_servers.openbot]')`：带空格的合法表头 `[ mcp_servers.openbot ]`
 * 被漏判成「没配」，而注释里提到表名又被误判成「已配」。后者更危险——把没配置说成配好了。
 */
export function hasCodexOpenbotTable(text) {
  if (typeof text !== 'string' || !text) return false;
  return Boolean(findTomlTableRange(text, `mcp_servers.${SERVER_NAME}`));
}

/** Codex 起一个 MCP server 至少需要 stdio 的 command 或 HTTP 的 url。 */
export const CODEX_LAUNCH_KEYS = ['command', 'url'];

/**
 * 表头存在 ≠ 表可用：空表 / 只写注释的表，标准解析器得到 `{}`，Codex 起不来。
 * 这里是行级扫描（只认表体顶层的 `key = value`），不是完整 TOML 解析器：
 * 不做语法校验，也不解析多行值 / 内联表；子表被 findTomlTableRange 当作下一表头截断。
 * 目的只有一个——判断有没有启动键，语法合法性交给客户端与独立解析器复核。
 */
export function inspectCodexTable(text) {
  // 先复用上一轮的表头结构判断，保证「表是否存在」全项目只有一套口径。
  if (!hasCodexOpenbotTable(text)) {
    return { verdict: 'no-table', declared: false, keys: [], hasLaunchKey: false };
  }
  const range = findTomlTableRange(text, `mcp_servers.${SERVER_NAME}`);
  if (!range) return { verdict: 'no-table', declared: false, keys: [], hasLaunchKey: false };
  const keys = [];
  for (const line of text.split('\n').slice(range.start + 1, range.end)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim().replace(/^["']|["']$/g, '');
    if (key) keys.push(key);
  }
  const hasLaunchKey = keys.some((key) => CODEX_LAUNCH_KEYS.includes(key));
  return {
    verdict: hasLaunchKey ? 'ready' : 'empty-table',
    declared: true,
    keys,
    hasLaunchKey,
  };
}

/** JSON 客户端配置里 openbot 的启动键：stdio 用 command，HTTP 用 url。 */
export const MCP_LAUNCH_KEYS = ['command', 'url'];

/**
 * 键存在 ≠ 声明可用：`{"mcpServers":{"openbot":{}}}` 和只有 `type` 的声明
 * 都过不了客户端启动。JSON 解析失败则是「拿不到证据」，不能推断成「没配」。
 * 形状按文件内容判断：ZCode 用嵌套 mcp.servers，其余客户端用顶层 mcpServers；
 * 只有该文件真有合法 mcp.servers 对象时才按嵌套读，避免两套形状互相误认。
 */
export function inspectMcpDeclaration(file) {
  if (file?.exists && file.parsed === null && Boolean(file.error)) {
    return { verdict: 'unreadable', declared: false, keys: [] };
  }
  const nested = file?.parsed?.mcp;
  const useNested = nested && typeof nested === 'object' && !Array.isArray(nested)
    && nested.servers && typeof nested.servers === 'object' && !Array.isArray(nested.servers);
  const entry = useNested
    ? nested.servers[SERVER_NAME]
    : file?.parsed?.mcpServers?.[SERVER_NAME];
  if (entry === undefined || entry === null) {
    return { verdict: 'missing', declared: false, keys: [] };
  }
  if (typeof entry !== 'object' || Array.isArray(entry)) {
    return { verdict: 'incomplete', declared: true, keys: [] };
  }
  const keys = Object.keys(entry);
  const hasLaunchKey = keys.some((key) => MCP_LAUNCH_KEYS.includes(key));
  return { verdict: hasLaunchKey ? 'ready' : 'incomplete', declared: true, keys, hasLaunchKey };
}

/**
 * `codex mcp list` 跑成功 ≠ openbot 已注册。真实输出是定宽表格，含 Name / Status 列，
 * 但 Env 列的值里带空格，列号不固定，所以不能按固定位置切列：
 * 用第一列 token 认名字、用行尾 3 个 token 认 Status（Auth 在 Status 右边）。
 * 表头认不出 / 输出为空 / 状态认不出一律是「拿不到证据」，不是「没有」。
 */
export function inspectCodexCli(result) {
  if (!result || result.status !== 'ok') {
    return {
      verdict: 'unavailable',
      commandStatus: result?.status || 'missing',
      reason: result?.reason || null,
      code: result?.code ?? null,
    };
  }
  const lines = String(result.stdout || '').split('\n')
    .map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return { verdict: 'unparseable', reason: 'stdout 为空' };
  const header = lines[0].split(/\s+/);
  if (header[0]?.toLowerCase() !== 'name'
    || !header.some((cell) => cell.toLowerCase() === 'status')) {
    return { verdict: 'unparseable', reason: '表头认不出：缺 Name / Status 列' };
  }
  const rows = lines.slice(1);
  const hit = rows.find((line) => line.split(/\s+/)[0] === 'openbot');
  if (!hit) return { verdict: 'not-registered', rowCount: rows.length };
  const state = hit.split(/\s+/).slice(-3).reverse()
    .find((cell) => cell === 'enabled' || cell === 'disabled');
  if (!state) return { verdict: 'unparseable', reason: 'openbot 行的 Status 值认不出' };
  return state === 'enabled'
    ? { verdict: 'registered', status: 'enabled', rowCount: rows.length }
    : { verdict: 'disabled', status: 'disabled', rowCount: rows.length };
}

/** 命令层面的问题 = unknown（拿不到证据）；输出里观察到的事实才判 ok / blocked。 */
export function codexCliPresentation(info) {
  if (info.verdict === 'unavailable') {
    const steps = {
      skipped: '重跑 doctor 时不要跳过命令（local-status 去掉 --no-verify）即可得到结论',
      'not-found': '安装 Codex CLI 或确认它在 PATH 里；命令不存在时本项不下结论',
      timeout: '手动跑 codex mcp list 看是否卡住；超时不能推断没有 MCP 服务器',
      error: '看 detail 里的错误原因，手动跑 codex mcp list 复核',
      'exit-error': '看 detail 里的退出码与 stderr，手动跑 codex mcp list 复核报错',
    };
    return {
      status: 'unknown',
      detail: `codex mcp list 本次没有有效输出：${info.commandStatus}${info.code !== null && info.code !== undefined ? `（exit ${info.code}）` : ''}${info.reason ? ` | ${info.reason}` : ''}`,
      nextStep: steps[info.commandStatus] || '看 detail 里的命令状态，手动跑 codex mcp list 复核',
    };
  }
  if (info.verdict === 'unparseable') {
    return {
      status: 'unknown',
      detail: `codex mcp list 输出认不出：${info.reason}`,
      nextStep: '手动跑 codex mcp list 复核输出格式；本工具只认含 Name / Status 列的表格',
    };
  }
  if (info.verdict === 'not-registered') {
    return {
      status: 'blocked',
      detail: `codex mcp list 表格可解析（${info.rowCount} 行），但没有 openbot`,
      nextStep: '用 install-local --target codex-stdio 写入 config.toml，再跑 codex mcp list 确认',
    };
  }
  if (info.verdict === 'disabled') {
    return {
      status: 'blocked',
      detail: 'codex mcp list 里 openbot 状态是 disabled',
      nextStep: '在 Codex 配置里检查 openbot 被禁用的原因并启用；本工具不改客户端状态',
    };
  }
  if (info.verdict === 'registered') {
    return {
      status: 'ok',
      detail: `codex mcp list 里 openbot 状态 enabled（共 ${info.rowCount} 行）`,
      nextStep: '这只证明 CLI 列出了 openbot；能否实际调用仍需在 Codex 对话里验证',
    };
  }
  return {
    status: 'unknown',
    detail: `codex mcp list 结论未知：${info.verdict}`,
    nextStep: '重跑 doctor 获取可判定的命令输出',
  };
}

/** 纯函数：把事实翻译成报告；测试可以注入确定的事实，不依赖本机状态。 */
export function buildReport(facts) {
  const knownPlatforms = new Set(platforms.map((item) => item.id));
  const { apps, workbuddyMcp, approvals, codexConfig, cursorMcp, zcodeConfig, claudeConfig } = facts;
  const handshakeStatus = facts.handshake.status;
  const handshakeOk = handshakeStatus === 'ok';
  // 跳过 ≠ 失败：--no-handshake / local-status --no-verify 会给出 status='skipped'，
  // 旧实现把除 ok 以外一律判 blocked，detail 写着「调用方跳过握手」却记成失败，
  // 还把「没跑」算进 blocked 计数拉低 verdict。没跑只能记 unknown。
  const handshakeSkipped = handshakeStatus === 'skipped';
  const codexTable = inspectCodexTable(codexConfig.text);
  const codexCli = codexCliPresentation(inspectCodexCli(facts.codexCli));
  // 文件在但读不到 ≠ 「没配」也 ≠ 「配好了」：拿不到证据时只能记 unknown。
  const codexUnreadable = codexConfig.exists
    && typeof codexConfig.text !== 'string'
    && Boolean(codexConfig.error);
  // 三个 JSON 客户端共用一套「声明是否可用」判定，避免三份各写一遍、口径慢慢分叉。
  const jsonCheck = (id, platform, file, pathLabel, generateStep, repairStep) => {
    const info = inspectMcpDeclaration(file);
    const status = info.verdict === 'unreadable' ? 'unknown'
      : info.verdict === 'ready' ? 'ok' : 'blocked';
    const detail = info.verdict === 'unreadable'
      ? `${pathLabel} 读不到或不是合法 JSON（${file?.error}）；本次无法判断声明内容`
      : !file?.exists
        ? `${pathLabel} 不存在`
        : info.verdict === 'ready'
          ? `${pathLabel} 中 openbot 已声明且含启动键 command/url（keys=[${info.keys.join(', ')}]）；这只是磁盘声明`
          : info.verdict === 'incomplete'
            ? `${pathLabel} 中 openbot 已声明但没有 command / url（keys=[${info.keys.length ? info.keys.join(', ') : '空'}]）；键存在 ≠ 可用`
            : `${pathLabel} 中 openbot 键=false`;
    const nextStep = info.verdict === 'unreadable'
      ? `检查 ${pathLabel} 的 JSON 语法与权限后重跑 doctor；读不到时不要推断已配置`
      : info.verdict === 'ready'
        ? '这只是磁盘声明；客户端里能否连上仍需 UI 信任与对话内实机验证'
        : info.verdict === 'incomplete' ? repairStep : generateStep;
    return check(id, platform, status, detail, nextStep);
  };
  const checks = [
    check(
      'stdio-handshake', 'workbuddy',
      handshakeOk ? 'ok' : handshakeSkipped ? 'unknown' : 'blocked',
      handshakeOk
        ? `run.sh 协议层握手通过：initialize / tools/list / ping，${facts.handshake.toolCount} 个工具（${facts.handshake.tools.join(', ')}）`
        : handshakeSkipped
          ? `run.sh 握手本次未执行：${facts.handshake.reason || '调用方跳过'}；这不是握手失败`
          : `run.sh 握手未通过：${handshakeStatus} ${facts.handshake.reason || ''}`.trim(),
      handshakeOk
        ? '这只是 MCP 协议层验收；tools/call 仍需 OpenBot 桌面在线，且不等于 WorkBuddy UI 已注入工具'
        : handshakeSkipped
          ? '重跑 doctor 时去掉 --no-handshake（local-status 去掉 --no-verify）即可得到握手结论'
          : '检查 run.sh 可执行权限与 Node >= 18，再重跑 doctor',
    ),
    check('openbot-app', 'workbuddy', apps.openbot ? 'ok' : 'blocked',
      apps.openbot ? '检测到 OpenBot.app' : '未在 /Applications 或 ~/Applications 找到 OpenBot.app',
      '安装/打开 OpenBot 桌面端，让 CLI 桥写出 endpoint.json 与 token'),
    check('openbot-service-4818', 'workbuddy',
      facts.port4818.status === 'listening' ? 'ok'
        : facts.port4818.status === 'refused' ? 'blocked' : 'unknown',
      `4818 TCP：${facts.port4818.status} ${facts.port4818.reason || ''}`.trim(),
      'HTTP 发布端点需在「设置 → 应用连接 → BOT API 与 MCP 服务」手动启动；TCP 可连不代表 MCP HTTP 握手成功'),
    check('openbot-cli-bridge', 'workbuddy',
      facts.openbotEndpoint.exists && facts.openbotToken.exists ? 'ok' : 'blocked',
      `endpoint.json=${facts.openbotEndpoint.exists} token=${facts.openbotToken.exists}（只检查文件存在性，不读取内容；HTTP 可用性另看 openbot-bridge-http）`,
      '打开 OpenBot 桌面端并等主窗口出现'),
    check('openbot-bridge-http', 'workbuddy', BRIDGE_HTTP_STATUS[facts.bridgeHttp?.status] || 'unknown',
      `CLI 桥 /v1/status：${facts.bridgeHttp?.status || 'unknown'} ${facts.bridgeHttp?.reason || '调用方未提供 HTTP 探测结果'}${facts.bridgeHttp?.port ? ` port=${facts.bridgeHttp.port}` : ''}`.trim(),
      BRIDGE_NEXT_STEP[facts.bridgeHttp?.status]
        || 'endpoint.json / token 存在不代表桥能应答；确认桌面主窗口已出现，必要时重启 OpenBot.app'),
    jsonCheck('workbuddy-declared', 'workbuddy', workbuddyMcp, '~/.workbuddy/mcp.json',
      '用 install-local --target workbuddy-stdio 生成合并后的配置',
      '声明已存在但缺启动键：用 install-local --target workbuddy-stdio --force 替换 openbot 键，或手工补 command（stdio）/ url（http）'),
    check('workbuddy-trusted', 'workbuddy',
      approvals.parsed?.openbot ? 'ok' : 'blocked',
      approvals.exists
        ? `mcp-approvals.json keys=[${Object.keys(approvals.parsed || {}).join(', ')}]`
        : 'mcp-approvals.json 不存在',
      '在 WorkBuddy「自定义连接器」入口点一次「信任」；本工具不代替 UI 操作'),
    check('codex-config', 'chatgpt-codex',
      codexUnreadable ? 'unknown' : codexTable.verdict === 'ready' ? 'ok' : 'blocked',
      codexUnreadable
        ? `~/.codex/config.toml 读不到（${codexConfig.error}）；本次无法判断表体内容`
        : !codexConfig.exists
          ? '~/.codex/config.toml 不存在'
          : codexTable.verdict === 'ready'
            ? `~/.codex/config.toml 中 openbot 表已声明且含启动键 command/url（keys=[${codexTable.keys.join(', ')}]）；按表头与键值结构判断，注释不算`
            : codexTable.verdict === 'empty-table'
              ? `~/.codex/config.toml 中 openbot 表已声明但表体没有 command / url（keys=[${codexTable.keys.length ? codexTable.keys.join(', ') : '空'}]）；表存在 ≠ 可用`
              : '~/.codex/config.toml 中 openbot 表=false（按表头结构判断，注释不算、表头内空格算）',
      codexUnreadable
        ? '检查文件权限后重跑 doctor；读不到时不要推断已配置'
        : codexTable.verdict === 'ready'
          ? '这只是磁盘声明；Codex 客户端里能否连上仍需 codex mcp list 与对话内实机验证'
          : codexTable.verdict === 'empty-table'
            ? '表已存在但缺启动键：用 install-local --target codex --force 替换整张表，或手工补 command（stdio）/ url（http）'
            : '用 install-local --target codex 生成 TOML 表并追加'),
    check('codex-cli', 'chatgpt-codex', codexCli.status, codexCli.detail, codexCli.nextStep),
    check('cursor-app', 'cursor', apps.cursor ? 'ok' : 'blocked',
      apps.cursor ? '检测到 Cursor.app' : '未找到 Cursor.app',
      '安装 Cursor 客户端；只有配置文件而没装客户端时配置不会被读取'),
    jsonCheck('cursor-config', 'cursor', cursorMcp, '~/.cursor/mcp.json',
      '用 install-local --target cursor 生成配置；保存后重启 Cursor',
      '声明已存在但缺启动键：用 install-local --target cursor --force 替换 openbot 键，或手工补 command / url；保存后重启 Cursor'),
    check('claude-desktop-app', 'claude', apps.claude ? 'ok' : 'blocked',
      apps.claude ? '检测到 Claude.app' : '未找到 Claude.app（配置存在也不代表有客户端读取）',
      '安装 Claude Desktop；远程自定义连接器由 Anthropic 云端发起，本机 127.0.0.1 不可达'),
    jsonCheck('claude-desktop-config', 'claude', claudeConfig, 'claude_desktop_config.json',
      '用 install-local --target claude-desktop 生成配置；还需安装 Claude Desktop 客户端并重启',
      '声明已存在但缺启动键：用 install-local --target claude-desktop --force 替换 openbot 键，或手工补 command / url；还需客户端'),
    check('zcode-app', 'zcode', apps.zcode ? 'ok' : 'blocked',
      apps.zcode ? '检测到 ZCode.app' : '未找到 ZCode.app（配置存在也不代表有客户端读取）',
      '安装 ZCode 客户端；配置文件在 ~/.zcode/cli/config.json，但客户端缺失时不会被读取'),
    jsonCheck('zcode-config', 'zcode', zcodeConfig, '~/.zcode/cli/config.json',
      '用 install-local --target zcode 生成配置（嵌套 mcp.servers 键）；保存后重启会话，在 设置 → MCP 确认状态',
      '声明已存在但缺启动键：用 install-local --target zcode --force 替换 mcp.servers 下的 openbot 键，或手工补 command（stdio）/ url（http）；保存后重启会话'),
    check('qwenwork-client', 'qwenwork', apps.qwenwork ? 'ok' : 'blocked',
      apps.qwenwork ? '检测到千问办公客户端' : '未找到千问办公客户端',
      '客户端未安装时只能生成 JSON 配置，无法做实机连接验收'),
    check('doubao-client', 'doubao-work', apps.doubao ? 'ok' : 'blocked',
      apps.doubao ? '检测到 Doubao.app' : '未找到 Doubao.app',
      '自定义连接器在客户端 UI 表单里新建，仅本地电脑可用'),
    check('doubao-connector-config', 'doubao-work', 'unknown',
      '未找到可校验磁盘路径的豆包工作连接器配置；表单内容存在客户端内部',
      '需在「插件·技能·伙伴 → 连接器」手工新建并授权，doctor 无法验证'),
    check('chatgpt-client', 'chatgpt-codex', apps.chatgpt ? 'ok' : 'blocked',
      apps.chatgpt ? '检测到 ChatGPT.app' : '未找到 ChatGPT.app',
      'ChatGPT 桌面与 Codex CLI 共享 config.toml；网页版不读取本机配置'),
  ];
  const counts = checks.reduce((acc, item) => {
    acc[item.status] += 1;
    return acc;
  }, { ok: 0, blocked: 0, unknown: 0 });
  const invalid = checks.filter((item) => !knownPlatforms.has(item.platform)).map((item) => item.id);
  return {
    checkedAt: facts.checkedAt,
    home: facts.home,
    checks,
    summary: { ...counts, total: checks.length },
    verdict: counts.blocked === 0 && counts.unknown === 0 ? 'ready' : 'partial',
    // 三态：true=握手通过，false=握手失败，null=本次没跑。旧实现 skipped 也给 false，
    // 等于把「调用方主动跳过」当成协议失败，和 checks 里的 unknown 自相矛盾。
    stdioProtocolOk: handshakeSkipped ? null : handshakeOk,
    registryProblems: invalid.length ? [`检查项引用了未知平台：${invalid.join(', ')}`] : [],
    limitations: [
      'doctor 只做本机只读探测与 stdio 协议层握手，不修改任何客户端配置文件。',
      'initialize / tools/list / ping 不调用 OpenBot CLI 桥；握手通过不代表 Bot 真的能执行任务。',
      'TCP 可连不等于 MCP over HTTP 握手成功；HTTP 端点还需要发布地址与 grant token。',
      'CLI 桥 endpoint.json / token 存在 ≠ HTTP 可用；doctor 单独探测 /v1/status，超时与拒绝分开记。',
      'WorkBuddy 的「信任」、豆包 / 千问办公的 UI 表单与 OAuth 授权必须由人在客户端里完成。',
      '所有 target 的 liveTested 仍为 false：客户端内实机连接尚未验收。',
    ],
  };
}

export async function runDoctor(options = {}) {
  return buildReport(await collectLocalFacts(options));
}
