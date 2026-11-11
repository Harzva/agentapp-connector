import { makeConfig, makeGuide, listTargets } from './config.mjs';
import {
  listPlatforms, listPolicies, listLocalModes, listMarketplaces,
} from './policies.mjs';
import { buildInstallPlan, buildAllInstallPlans, applyInstallPlan } from './install.mjs';
import { runDoctor } from './local.mjs';
import { runVerifyLocal, CONNECTOR_CALL_TIMEOUT_MS, DEFAULT_VERIFY_TIMEOUT_MS } from './verify.mjs';
import { buildLocalStatus } from './local-status.mjs';
import { buildPreflight, renderSubmitSteps } from './preflight.mjs';

const COMMANDS = {
  'verify-local': {
    values: { '--connector-path': 'connectorPath', '--timeout-ms': 'timeoutMs' },
    flags: {}, maxPositionals: 0,
  },
  'local-status': {
    values: { '--home': 'home', '--connector-path': 'connectorPath' },
    flags: { '--no-verify': 'skipVerify' }, maxPositionals: 0,
  },
  'market-preflight': {
    values: { '--platform': 'platformId', '--format': 'format' },
    flags: {}, maxPositionals: 0,
  },
  targets: { values: {}, flags: {}, maxPositionals: 0 },
  platforms: { values: { '--platform': 'platformId' }, flags: {}, maxPositionals: 0 },
  config: {
    values: { '--target': 'targetId', '--auth': 'auth', '--connector-path': 'connectorPath' },
    flags: {}, maxPositionals: 1,
  },
  guide: {
    values: { '--target': 'targetId', '--auth': 'auth', '--connector-path': 'connectorPath' },
    flags: {}, maxPositionals: 1,
  },
  policies: {
    values: {
      '--platform': 'platformId', '--category': 'category',
      '--kind': 'kind', '--evidence': 'evidence', '--section': 'section', '--format': 'format',
    },
    flags: {}, maxPositionals: 0,
  },
  local: { values: { '--platform': 'platformId' }, flags: {}, maxPositionals: 0 },
  market: { values: { '--platform': 'platformId' }, flags: {}, maxPositionals: 0 },
  doctor: {
    values: { '--home': 'home', '--connector-path': 'connectorPath' },
    flags: { '--no-handshake': 'skipHandshake' }, maxPositionals: 0,
  },
  'install-local': {
    values: {
      '--target': 'targetId', '--auth': 'auth',
      '--connector-path': 'connectorPath', '--write-to': 'writeTo',
    },
    flags: { '--force': 'force', '--all': 'all' }, maxPositionals: 1,
  },
};

const USAGE = [
  '用法:',
  '  node src/cli.mjs targets',
  '  node src/cli.mjs platforms [--platform <id>]    # 平台注册表（政策 / 本地 / 市场总览）',
  '  node src/cli.mjs config [发布地址] [--target <id>] [--auth none|placeholder] [--connector-path <路径>]',
  '  node src/cli.mjs guide  [发布地址] [--target <id>] [--auth none|placeholder] [--connector-path <路径>]',
  '  node src/cli.mjs policies [--platform <id>] [--category <类别>] [--kind <来源>] [--evidence <等级>] [--section policy|local|market] [--format json|text]',
  '  node src/cli.mjs local   [--platform <id>]        # 本地模式清单',
  '  node src/cli.mjs market  [--platform <id>]        # 市场上架条件与阻塞项',
  '  node src/cli.mjs doctor  [--no-handshake] [--home <路径>] [--connector-path <路径>]  # 本机只读探测 + stdio 真实握手',
  '  node src/cli.mjs install-local [发布地址] --target <id> [--write-to <路径>] [--force]',
  '  node src/cli.mjs install-local --all                       # 逐 target 输出计划，绝不批量落盘',
  `  node src/cli.mjs verify-local [--connector-path <路径>] [--timeout-ms <毫秒>]  # stdio 真实只读 tools/call（默认外层 ${DEFAULT_VERIFY_TIMEOUT_MS}ms）`,
  '  node src/cli.mjs local-status [--no-verify] [--home <路径>]                   # 七平台逐平台本地状态',
  '  node src/cli.mjs market-preflight [--platform <id>] [--format json|text]      # 上架前置检查 / 提交步骤',
  '',
  '不传 --target 时默认 qwenwork；stdio 客户端不需要发布地址。',
  'install-local 默认只输出计划，不写文件；只有 --write-to 才落盘，并会先备份已存在的目标文件。',
  `verify-local 默认外层 ${DEFAULT_VERIFY_TIMEOUT_MS}ms > 上游连接器每次桥调用自带的 ${CONNECTOR_CALL_TIMEOUT_MS}ms；把 --timeout-ms 调到 ${CONNECTOR_CALL_TIMEOUT_MS}ms 或更短会先被外层截断，看不到 OPENBOT_BRIDGE_TIMEOUT 等真实错误码。`,
  '本工具不接受、也不输出真实凭据。',
].join('\n');

function parseOptions(args, spec) {
  const options = { positionals: [] };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (Object.hasOwn(spec.values, arg)) {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`${arg} 缺少取值`);
      const key = spec.values[arg];
      if (options[key] !== undefined) throw new Error(`${arg} 重复`);
      options[key] = value;
      index += 1;
    } else if (Object.hasOwn(spec.flags, arg)) {
      const key = spec.flags[arg];
      if (options[key] !== undefined) throw new Error(`${arg} 重复`);
      options[key] = true;
    } else if (arg.startsWith('--')) {
      throw new Error(`未知选项 ${arg}`);
    } else {
      options.positionals.push(arg);
    }
  }
  if (options.positionals.length > spec.maxPositionals) {
    throw new Error(spec.maxPositionals === 0 ? '该命令不接受位置参数' : '只能给一个发布地址');
  }
  return options;
}

function configOptionsFrom(options) {
  const result = { address: options.positionals[0] };
  for (const key of ['targetId', 'auth', 'connectorPath', 'writeTo']) {
    if (options[key] !== undefined) result[key] = options[key];
  }
  return result;
}

function queryOptionsFrom(options) {
  const result = {};
  for (const key of ['platformId', 'category', 'kind', 'evidence', 'section']) {
    if (options[key] !== undefined) result[key] = options[key];
  }
  return result;
}

function renderPoliciesText(listing) {
  const lines = [
    `政策文档 ${listing.count}/${listing.total} 条（登记于 ${listing.documentedAt}）`,
    `证据等级：${JSON.stringify(listing.byEvidence)}`,
    '',
  ];
  for (const item of listing.docs) {
    lines.push(`[${item.platform}] [${item.section}] [${item.category}] [${item.kind}/${item.evidence}] ${item.title}`);
    lines.push(`  ${item.url}`);
    if (item.note) lines.push(`  ${item.note}`);
  }
  lines.push('', listing.note);
  return lines.join('\n');
}

async function main(argv) {
  const [command, ...rest] = argv;
  if (!command || !Object.hasOwn(COMMANDS, command)) {
    console.error(USAGE);
    return 2;
  }
  let options;
  try { options = parseOptions(rest, COMMANDS[command]); }
  catch (error) {
    console.error(error.message);
    console.error(USAGE);
    return 2;
  }

  const query = queryOptionsFrom(options);
  try {
    if (command === 'targets') {
      console.log(JSON.stringify(listTargets(), null, 2));
      return 0;
    }
    if (command === 'platforms') {
      const listing = listPlatforms(query);
      if (!listing.validation.ok) throw new Error(listing.validation.problems.join('; '));
      console.log(JSON.stringify(listing, null, 2));
      return 0;
    }
    if (command === 'policies') {
      for (const key of ['platformId', 'category', 'kind', 'evidence', 'section']) {
        if (options[key] !== undefined && options[key] === '') throw new Error(`${key} 不能为空`);
      }
      const format = options.format || 'json';
      if (!['json', 'text'].includes(format)) throw new Error('format 只能是 json 或 text');
      const listing = listPolicies(query);
      console.log(format === 'text' ? renderPoliciesText(listing) : JSON.stringify(listing, null, 2));
      return 0;
    }
    if (command === 'local') {
      console.log(JSON.stringify(listLocalModes(query), null, 2));
      return 0;
    }
    if (command === 'market') {
      console.log(JSON.stringify(listMarketplaces(query), null, 2));
      return 0;
    }
    if (command === 'verify-local') {
      let timeoutMs;
      if (options.timeoutMs !== undefined) {
        timeoutMs = Number(options.timeoutMs);
        if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 60000) {
          throw new Error('--timeout-ms 需为 1000–60000 的整数');
        }
      }
      const report = await runVerifyLocal({ connectorPath: options.connectorPath, timeoutMs });
      console.log(JSON.stringify(report, null, 2));
      return report.verdict === 'verified' ? 0 : 1;
    }
    if (command === 'local-status') {
      const skipVerify = options.skipVerify === true;
      const doctorOptions = { skipHandshake: skipVerify, skipCommands: skipVerify };
      if (options.home !== undefined) doctorOptions.home = options.home;
      if (options.connectorPath !== undefined) doctorOptions.connectorPath = options.connectorPath;
      const doctor = await runDoctor(doctorOptions);
      if (doctor.registryProblems.length) throw new Error(doctor.registryProblems.join('; '));
      const verification = skipVerify ? null : await runVerifyLocal({ connectorPath: options.connectorPath });
      console.log(JSON.stringify(buildLocalStatus(doctor, verification), null, 2));
      return 0;
    }
    if (command === 'market-preflight') {
      const format = options.format || 'json';
      if (!['json', 'text'].includes(format)) throw new Error('format 只能是 json 或 text');
      const queryPreflight = { platformId: options.platformId };
      console.log(format === 'text'
        ? renderSubmitSteps(queryPreflight)
        : JSON.stringify(buildPreflight(queryPreflight), null, 2));
      return 0;
    }
    if (command === 'doctor') {
      const doctorOptions = { skipHandshake: options.skipHandshake === true };
      if (options.home !== undefined) doctorOptions.home = options.home;
      if (options.connectorPath !== undefined) doctorOptions.connectorPath = options.connectorPath;
      const report = await runDoctor(doctorOptions);
      if (report.registryProblems.length) throw new Error(report.registryProblems.join('; '));
      console.log(JSON.stringify(report, null, 2));
      return 0;
    }
    if (command === 'install-local') {
      if (options.all === true) {
        if (options.force === true) throw new Error('--all 只输出计划，不接受 --force');
        if (options.positionals.length) throw new Error('--all 不接受发布地址；请逐个 target 显式安装');
        const all = buildAllInstallPlans(configOptionsFrom(options));
        console.log(JSON.stringify(all, null, 2));
        return 0;
      }
      const plan = buildInstallPlan(configOptionsFrom(options));
      if (options.writeTo) {
        const result = applyInstallPlan(plan, { force: options.force === true });
        console.log(JSON.stringify({ ...plan, ...result, applied: true }, null, 2));
      } else {
        console.log(JSON.stringify(plan, null, 2));
      }
      return 0;
    }
    const configOptions = configOptionsFrom(options);
    if (command === 'config') console.log(JSON.stringify(makeConfig(configOptions), null, 2));
    else console.log(makeGuide(configOptions));
    return 0;
  } catch (error) {
    console.error(error.message);
    return 1;
  }
}

main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
