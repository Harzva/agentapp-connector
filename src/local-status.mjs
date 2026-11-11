import { platforms } from './policies.mjs';

/**
 * 逐平台本地模式状态。刻意把「配置文件写了」与「客户端装了」分开：
 * 上一轮 Claude Desktop 配置存在但 /Applications 里没有 Claude.app，
 * doctor 却把 claude-desktop-config 记成 ok，属于检查站错位。
 */
/** 当前唯一能从外部进程直连 stdio 连接器、做只读 tools/call 的平台。 */
export const STDIO_PLATFORM = 'workbuddy';

const NOT_APPLICABLE_REASON = '该平台没有可从外部进程直连的本地 stdio 连接器；客户端内调用需人在 UI 里完成';

export const PLATFORM_CHECKS = {
  workbuddy: {
    apps: ['openbot-app'],
    // CLI 桥 HTTP 是运行时事实：文件在、UI 信任了，桥不应答照样调不到 Bot。
    runtime: ['openbot-bridge-http'],
    config: ['workbuddy-declared'],
    ui: ['workbuddy-trusted'],
  },
  qwenwork: { apps: ['qwenwork-client'], runtime: [], config: [], ui: [] },
  'doubao-work': { apps: ['doubao-client'], runtime: [], config: ['doubao-connector-config'], ui: [] },
  'chatgpt-codex': { apps: ['chatgpt-client'], runtime: [], config: ['codex-config'], ui: ['codex-cli'] },
  cursor: { apps: ['cursor-app'], runtime: [], config: ['cursor-config'], ui: [] },
  claude: { apps: ['claude-desktop-app'], runtime: [], config: ['claude-desktop-config'], ui: [] },
  zcode: { apps: ['zcode-app'], runtime: [], config: ['zcode-config'], ui: [] },
};

function pick(checks, ids) {
  return ids.map((id) => checks.find((item) => item.id === id)).filter(Boolean);
}

/**
 * 逐平台验证结论必须分四种（verified / 失败 / not-run / not-applicable），
 * 不能把「验证跑了但失败」压成「不适用」：
 * 旧实现只要 verdict !== 'verified' 就给所有平台写 not-applicable，
 * 于是唯一有 stdio 直连能力的 workbuddy 在桥超时时也被写成
 * 「该平台没有可从外部进程直连的本地 stdio 连接器」，事实正好说反，
 * 而且把 verify-local 已归一的 blockingReason / failureKinds / timeout 全丢了。
 */
function verificationFor(platformId, verification) {
  if (platformId !== STDIO_PLATFORM) {
    return { verdict: 'not-applicable', reason: NOT_APPLICABLE_REASON };
  }
  if (!verification) {
    return {
      verdict: 'not-run',
      reason: '本次没有运行 verify-local（例如 --no-verify）；这不代表不适用，重跑 local-status 即可补上结论',
    };
  }
  if (verification.verdict === 'verified') {
    return {
      verdict: verification.verdict,
      summary: verification.summary || null,
      blockingReason: null,
    };
  }
  return {
    verdict: verification.verdict || 'partial',
    reason: verification.blockingReason || verification.reason
      || '只读工具验证未通过，但下层报告没有给出原因（不编造故障结论）',
    failureKinds: verification.failureKinds || [],
    summary: verification.summary || null,
    timeout: verification.timeout || null,
    readOnlyOnly: verification.readOnlyOnly ?? true,
  };
}

export function buildLocalStatus(doctor, verification, options = {}) {
  const checks = doctor?.checks || [];
  const rows = platforms.map((platform) => {
    const mapping = PLATFORM_CHECKS[platform.id];
    const apps = pick(checks, mapping.apps);
    const runtime = pick(checks, mapping.runtime || []);
    const config = pick(checks, mapping.config);
    const ui = pick(checks, mapping.ui);
    const all = [...apps, ...runtime, ...config, ...ui];
    const blockedApp = apps.find((item) => item.status === 'blocked');
    const blockedRuntime = runtime.find((item) => item.status === 'blocked');
    const blockedConfig = config.find((item) => item.status === 'blocked');
    const blockedUi = ui.find((item) => item.status === 'blocked' && item.id === 'workbuddy-trusted');
    const hasUnknown = all.some((item) => item.status === 'unknown');

    let status = 'declared';
    if (blockedApp) status = 'client-missing';
    else if (blockedRuntime) status = 'runtime-blocked';
    else if (blockedConfig) status = 'config-missing';
    else if (blockedUi) status = 'needs-ui-trust';
    else if (hasUnknown) status = 'needs-manual-verification';

    const next = blockedApp || blockedRuntime || blockedConfig || blockedUi
      || all.find((item) => item.status === 'unknown');
    const verifiedViaStdio = platform.id === STDIO_PLATFORM && verification?.verdict === 'verified';
    return {
      platform: platform.id,
      platformLabel: platform.label,
      localModeAvailable: platform.localMode.available,
      entry: platform.localMode.entry,
      status,
      clientAppInstalled: apps.length ? apps.every((item) => item.status === 'ok') : null,
      runtimeReachable: runtime.length ? runtime.every((item) => item.status === 'ok') : null,
      configDeclared: config.length ? config.every((item) => item.status === 'ok') : null,
      verifiedViaStdio,
      verification: verificationFor(platform.id, verification),
      checks: all.map((item) => ({ id: item.id, status: item.status, detail: item.detail })),
      nextStep: next ? next.nextStep : '配置与客户端都在；仍需在客户端对话里实际调用工具才算实机验收',
    };
  });
  const ready = rows.filter((item) => item.status === 'declared').length;
  return {
    checkedAt: options.now || doctor?.checkedAt || new Date().toISOString(),
    count: rows.length,
    doctorVerdict: doctor?.verdict || 'unknown',
    verificationVerdict: verification?.verdict || 'not-run',
    readyCount: ready,
    verdict: ready === rows.length ? 'ready' : 'partial',
    platforms: rows,
    note: 'declared 只表示本机有配置或客户端；七个平台的客户端内实机连接（liveTested）都还没做。',
    limitations: [
      '只有 WorkBuddy 的 stdio 连接器能从外部进程直连并做只读 tools/call；其它平台需要在各自客户端 UI 里验证。',
      '配置文件存在 ≠ 客户端已安装；Claude Desktop / 千问办公客户端未安装时，写了配置也不会被读取。',
      'CLI 桥文件存在 ≠ /v1/status 能应答；runtime-blocked 时连 UI 信任也无法调通工具。',
      'verify-local 只调用只读工具，没有派发任务，没有验证 Bot 执行任务。',
      '逐平台 verification 分 verified / 失败(partial，带下层 blockingReason 与 timeout) / not-run / not-applicable；只有 workbuddy 反映真实验证结论，其它六平台一律 not-applicable。验证失败不等于不适用。',
    ],
  };
}
