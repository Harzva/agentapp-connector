import { spawn } from 'node:child_process';
import { DEFAULT_CONNECTOR_PATH } from './targets.mjs';

/**
 * 只读工具白名单：只查状态、Bot 列表与历史任务，绝不派发任务。
 * 这是「本地模式真的能不能调到 Bot 运行时」的可复现验证，不是模拟。
 */
export const READ_ONLY_TOOLS = ['openbot_status', 'openbot_bots', 'openbot_tasks'];

/** 已知错误码归一到可读原因；未知码用 code:<CODE> 独立归类，不并进 isError 形状。 */
export const CODE_KIND = {
  OPENBOT_DESKTOP_NOT_RUNNING: 'desktop-not-running',
  OPENBOT_BRIDGE_TIMEOUT: 'bridge-timeout',
  OPENBOT_BRIDGE_UNREACHABLE: 'bridge-unreachable',
};

/** 这些是上游运行时给出的根因；「无响应 / RPC 报错」只是外层没等到，不能算根因。 */
const UPSTREAM_KINDS = new Set(Object.values(CODE_KIND));

/**
 * 上游 openbot-workbuddy-connector/connector.cjs 的 CALL_TIMEOUT_MS = 15000：
 * 连接器每次桥调用自带 15s 超时，超时后才返回 OPENBOT_BRIDGE_TIMEOUT。
 * 外层 verify 超时必须比它长，否则默认运行只会拿到「外层 timeout」，
 * 拿不到连接器自己的错误码（上一轮真机靠手动 --timeout-ms 30000 才看到）。
 * 三个 tools/call 是并发发出的，所以 15s + 5s 余量足够，不是 3 × 15s。
 * 这是登记值而不是运行时读取：本工程独立，不依赖兄弟工程源码；
 * test/verify.test.mjs 里另有「上游源码存在时」的交叉校验防止它悄悄漂移。
 */
export const CONNECTOR_CALL_TIMEOUT_MS = 15000;
export const DEFAULT_VERIFY_TIMEOUT_MS = CONNECTOR_CALL_TIMEOUT_MS + 5000;

const REQUESTS = [
  {
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: {
      protocolVersion: '2025-06-18', capabilities: {},
      clientInfo: { name: 'agentapp-verify-local', version: '0.0.3' },
    },
  },
  { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
  ...READ_ONLY_TOOLS.map((name, index) => ({
    jsonrpc: '2.0', id: 3 + index, method: 'tools/call', params: { name, arguments: {} },
  })),
];

/**
 * 成败不能只看 isError：openbot_status 在桌面端没开时会返回
 * isError=false，但 structuredContent 里是 ok=false / reachable=false /
 * code=OPENBOT_DESKTOP_NOT_RUNNING。只读返回体本身才能避免「协议成功=验证通过」。
 */
function summarize(name, message) {
  const result = message?.result || {};
  const text = Array.isArray(result.content) ? String(result.content[0]?.text || '') : '';
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { /* 非 JSON 也能验，只是不给结构化摘要 */ }
  const structured = result.structuredContent && typeof result.structuredContent === 'object'
    ? result.structuredContent : null;
  const body = structured || (parsed && typeof parsed === 'object' ? parsed : null);
  const summary = { bytes: Buffer.byteLength(text) };
  if (body) {
    for (const key of ['appVersion', 'port', 'pid', 'activeTasks', 'total', 'returned', 'available', 'dispatchable', 'count', 'reachable']) {
      if (Object.hasOwn(body, key)) summary[key] = body[key];
    }
    if (body.verdict) summary.verdict = String(body.verdict).slice(0, 160);
    if (body.bots && typeof body.bots === 'object') {
      for (const key of ['total', 'available', 'dispatchable']) {
        if (Object.hasOwn(body.bots, key)) summary[`bots.${key}`] = body.bots[key];
      }
    }
    if (Object.hasOwn(body, 'ok')) summary.ok = body.ok;
    if (Object.hasOwn(body, 'code')) summary.code = String(body.code).slice(0, 120);
    if (typeof body.message === 'string') summary.bodyMessage = body.message.slice(0, 200);
  }
  const toolError = message?.error?.message || null;
  const isError = result.isError === true;
  const bodyFailure = Boolean(body) && (body.ok === false || body.reachable === false);
  // 返回体里的 code 是根因，优先于 isError 形状：同一个「桌面没开 / 桥超时」故障，
  // openbot_status 报 isError=false，另外两个报 isError=true，不该被拆成两种原因。
  // 未知错误码也要按码归一，不能退回按 isError 形状分类。
  const code = typeof body?.code === 'string' ? body.code : null;
  const codeKind = code ? (CODE_KIND[code] || `code:${code}`) : null;
  const bodyError = code ? `${code}: ${body.message || ''}` : null;
  let failureKind = null;
  let error = null;
  if (!message) {
    failureKind = 'no-response';
    error = '无响应';
  } else if (toolError) {
    failureKind = 'rpc-error';
    error = toolError;
  } else if (codeKind) {
    failureKind = codeKind;
    error = bodyError;
  } else if (isError) {
    failureKind = 'tool-isError';
    error = bodyError || '工具返回 isError=true';
  } else if (bodyFailure) {
    failureKind = 'body-not-ok';
    error = bodyError || '返回体声明 ok=false / reachable=false';
  }
  return {
    name,
    responded: Boolean(message),
    ok: failureKind === null,
    failureKind,
    isError,
    error,
    summary: { ...summary, name },
  };
}

/** 与 doctor 的握手分开：这里必须真的发 tools/call，且只发只读工具。 */
export function stdioExchange({ command, args = [], timeoutMs = DEFAULT_VERIFY_TIMEOUT_MS }) {
  return new Promise((resolvePromise) => {
    let child;
    try { child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] }); }
    catch (error) {
      resolvePromise({ timeoutMs, status: 'spawn-failed', reason: error.message, responses: {} });
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
      // 把「这次到底用了哪个超时」带回报告，别让调用方靠默认值去猜。
      resolvePromise({ timeoutMs, ...result });
    };
    const expected = REQUESTS.length;
    const collect = () => {
      const tools = Array.isArray(responses[2]?.result?.tools)
        ? responses[2].result.tools.map((item) => item.name) : [];
      return {
        status: 'ok',
        serverInfo: responses[1]?.result?.serverInfo || null,
        tools,
        toolCount: tools.length,
        calls: READ_ONLY_TOOLS.map((name, index) => summarize(name, responses[3 + index])),
      };
    };
    const timer = setTimeout(() => finish({
      status: 'timeout',
      reason: `${timeoutMs}ms 内没有收齐 ${expected} 个响应`
        + `（上游连接器每次桥调用自带 ${CONNECTOR_CALL_TIMEOUT_MS}ms 超时；`
        + (timeoutMs <= CONNECTOR_CALL_TIMEOUT_MS
          ? '本次外层比上游短，可能在上游给出错误码之前就被截断）'
          : '本次外层留有观察上游错误码的余量）'),
      responses,
      received: Object.keys(responses).length,
      calls: READ_ONLY_TOOLS.map((name, index) => summarize(name, responses[3 + index])),
      stderr: stderr.slice(0, 400),
    }), timeoutMs);
    child.on('error', (error) => finish({ status: 'spawn-failed', reason: error.message, responses }));
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      if (buffer.length > 1024 * 1024) buffer = buffer.slice(-1024 * 1024);
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
      if (Object.keys(responses).length >= expected) finish(collect());
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-4096); });
    child.on('exit', (code, signal) => {
      if (!settled) finish({
        status: 'incomplete',
        reason: `子进程提前退出（code=${code}, signal=${signal || 'none'}）`,
        responses,
        received: Object.keys(responses).length,
        calls: READ_ONLY_TOOLS.map((name, index) => summarize(name, responses[3 + index])),
        stderr: stderr.slice(0, 400),
      });
    });
    // 故意不 end stdin：connector.cjs 的 readline close 会立刻 exit(0)，截断异步响应。
    for (const request of REQUESTS) child.stdin.write(`${JSON.stringify(request)}\n`);
  });
}

const FAILURE_LABEL = {
  'desktop-not-running': 'OpenBot 桌面端没运行，CLI 桥（endpoint.json / token）不存在；先打开 OpenBot.app 等主窗口出现再重试',
  'bridge-timeout': `OpenBot CLI 桥文件在、TCP 能连，但 /v1/status 在 ${CONNECTOR_CALL_TIMEOUT_MS / 1000}s 内没有回包；桌面主进程可能卡住，重启 OpenBot.app 后重试`,
  'bridge-unreachable': 'OpenBot CLI 桥端口不可达；确认桌面端在线且 endpoint.json 里的端口仍有效',
  'body-not-ok': '工具返回体声明 ok=false / reachable=false，协议层成功不等于验证通过',
  'tool-isError': '工具返回 isError=true',
  'rpc-error': 'JSON-RPC 层报错',
  'no-response': '工具没有响应',
};

export function buildVerifyReport(exchange, options = {}) {
  const calls = exchange.calls || [];
  const allOk = exchange.status === 'ok'
    && calls.length === READ_ONLY_TOOLS.length
    && calls.every((item) => item.responded && item.ok && !item.isError);
  const failureKinds = [...new Set(calls.map((item) => item.failureKind).filter(Boolean))];
  const firstFailure = calls.find((item) => !item.ok);
  const singleKind = failureKinds.length === 1 ? failureKinds[0] : null;
  const rootCause = singleKind
    ? (FAILURE_LABEL[singleKind] || firstFailure?.error || singleKind)
    : (failureKinds.length > 1 ? `多种失败原因：${failureKinds.join(', ')}` : null);
  // 外层 timeout 只是「没等齐」，不是根因。若已有工具带着上游错误码回来，
  // 优先解释那个错误码，别让 20000ms 这类外层数字盖掉真实故障。
  // 只有上游码算根因；no-response / rpc-error 是「还没等到」，不能冒充根因。
  const upstreamKinds = failureKinds.filter(
    (kind) => UPSTREAM_KINDS.has(kind) || kind.startsWith('code:'),
  );
  const timeoutRootCause = exchange.status !== 'timeout' ? null
    : (upstreamKinds.length === 1
      ? (FAILURE_LABEL[upstreamKinds[0]] || firstFailure?.error || upstreamKinds[0])
      : (upstreamKinds.length > 1 ? `多种上游故障：${upstreamKinds.join(', ')}` : null));
  const blockingReason = allOk ? null
    : timeoutRootCause
      || exchange.reason
      || rootCause
      || '未能完成只读工具验证';
  const outerMs = Number.isInteger(exchange.timeoutMs) ? exchange.timeoutMs : null;
  const timeout = {
    outerMs,
    connectorCallMs: CONNECTOR_CALL_TIMEOUT_MS,
    defaultOuterMs: DEFAULT_VERIFY_TIMEOUT_MS,
    // 只有本次实际用的外层超时已知才可判断；手写夹具没带它时不猜。
    outerCanObserveConnectorCode: outerMs === null ? null : outerMs > CONNECTOR_CALL_TIMEOUT_MS,
  };
  return {
    checkedAt: options.now || new Date().toISOString(),
    verdict: allOk ? 'verified' : 'partial',
    status: exchange.status,
    reason: exchange.reason || null,
    blockingReason,
    failureKinds,
    timeout,
    transport: 'stdio',
    readOnlyOnly: true,
    toolsCalled: READ_ONLY_TOOLS,
    serverInfo: exchange.serverInfo || null,
    toolCount: exchange.toolCount ?? 0,
    calls,
    summary: {
      ok: calls.filter((item) => item.ok && !item.isError).length,
      failed: calls.filter((item) => !item.ok || item.isError).length,
      total: calls.length,
    },
    limitations: [
      '只调用 openbot_status / openbot_bots / openbot_tasks 三个只读工具；没有派发任务，也没有验证 Bot 真的执行过任务。',
      '成败同时看 isError 与返回体里的 ok / reachable / code；openbot_status 的 isError=false 也可能是桌面端没开。',
      '这是从外部进程直连 stdio 连接器，不等于在 WorkBuddy / Cursor / Codex / Claude 的对话里调用过工具。',
      '所有 target 的 liveTested 仍为 false；客户端内实机连接需要人在 UI 里完成。',
      `外层默认等 ${DEFAULT_VERIFY_TIMEOUT_MS}ms，上游连接器每次桥调用自带 ${CONNECTOR_CALL_TIMEOUT_MS}ms 超时；手动把 --timeout-ms 调到 ${CONNECTOR_CALL_TIMEOUT_MS}ms 或更短，会在上游给出 OPENBOT_BRIDGE_TIMEOUT 之前先被截断。`,
    ],
  };
}

export async function runVerifyLocal(options = {}) {
  // 用 ?? 而不是 ||：显式传 0 / 负数属于调用错误，不该被静默换成默认值。
  const timeoutMs = options.timeoutMs ?? DEFAULT_VERIFY_TIMEOUT_MS;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 60000) {
    throw new Error(`timeoutMs 需为 1000–60000 的整数，实际为 ${timeoutMs}`);
  }
  const exchange = await stdioExchange({
    command: options.connectorPath || DEFAULT_CONNECTOR_PATH,
    args: [],
    timeoutMs,
  });
  return buildVerifyReport(exchange, options);
}
