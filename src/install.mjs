import {
  existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync,
} from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { homedir } from 'node:os';
import { makeConfig, findTarget } from './config.mjs';
import { SERVER_NAME, targets } from './targets.mjs';
import { platforms } from './policies.mjs';

const ALLOWED_OPTION_KEYS = new Set(['targetId', 'address', 'auth', 'connectorPath', 'writeTo']);

export function expandPath(input) {
  if (typeof input !== 'string' || !input.trim()) throw new Error('路径不能为空');
  if (input === '~') return homedir();
  if (input.startsWith('~/')) return resolve(homedir(), input.slice(2));
  return isAbsolute(input) ? input : resolve(process.cwd(), input);
}

export function renderConfigText(result) {
  if (result.format === 'toml') return result.config.content;
  if (result.format === 'form') {
    return [
      '# 豆包工作「新建自定义连接器」填表清单（不是客户端配置文件）',
      ...result.config.fields.map((field) => `${field.label}: ${field.value}`),
      '',
    ].join('\n');
  }
  return `${JSON.stringify(result.config, null, 2)}\n`;
}

/**
 * 生成文本的键形状在这里识别一次：ZCode 是嵌套 mcp.servers，其余客户端是顶层 mcpServers。
 * 只按生成侧形状合并，保留目标文件里其它服务器与其它设置。
 */
function generatedServersOf(generated) {
  if (generated.mcp && typeof generated.mcp === 'object' && !Array.isArray(generated.mcp)
    && generated.mcp.servers && typeof generated.mcp.servers === 'object') {
    return {
      shape: 'mcp.servers',
      servers: generated.mcp.servers,
      pathLabel: `mcp.servers.${SERVER_NAME}`,
    };
  }
  if (generated.mcpServers && typeof generated.mcpServers === 'object') {
    return { shape: 'mcpServers', servers: generated.mcpServers, pathLabel: `mcpServers.${SERVER_NAME}` };
  }
  throw new Error('生成配置里既没有 mcp.servers 也没有 mcpServers，拒绝写入');
}

/** JSON 配置只合并服务器表下的同名键，保留客户端已有的其他服务器与设置。 */
export function mergeJsonText(existingText, generatedText, force = false) {
  let existing;
  try { existing = JSON.parse(existingText); }
  catch { throw new Error('目标文件不是有效 JSON，拒绝覆盖；请手动检查后再试'); }
  if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
    throw new Error('目标文件顶层不是 JSON 对象，拒绝覆盖');
  }
  const generatedShape = generatedServersOf(JSON.parse(generatedText));
  let container;
  let servers;
  if (generatedShape.shape === 'mcp.servers') {
    container = (existing.mcp && typeof existing.mcp === 'object' && !Array.isArray(existing.mcp))
      ? existing.mcp
      : {};
    servers = (container.servers && typeof container.servers === 'object' && !Array.isArray(container.servers))
      ? container.servers
      : {};
  } else {
    container = null;
    servers = (existing.mcpServers && typeof existing.mcpServers === 'object')
      ? existing.mcpServers
      : {};
  }
  if (Object.hasOwn(servers, SERVER_NAME) && !force) {
    throw new Error(`目标文件已存在 ${generatedShape.pathLabel}；确认要替换请加 --force`);
  }
  const nextServers = { ...servers, ...generatedShape.servers };
  const merged = generatedShape.shape === 'mcp.servers'
    ? { ...existing, mcp: { ...container, servers: nextServers } }
    : { ...existing, mcpServers: nextServers };
  return {
    content: `${JSON.stringify(merged, null, 2)}\n`,
    action: Object.hasOwn(servers, SERVER_NAME) ? 'replace' : 'merge',
  };
}

/** config.toml 只追加一张表，已存在同名表时不静默覆盖。 */
/**
 * 按行找 TOML 表头，返回该表到下一个表头（或文件尾）之前的行范围。
 * 不能靠 `text.includes('[table]')`：TOML 允许 `[ mcp_servers.openbot ]` 这种
 * 带空格的表头，字符串包含会漏判；而注释里出现表名又会被误判成「表已存在」。
 * 子表 `[mcp_servers.openbot.extra]` 视为新的表头，替换时保守保留。
 */
export function findTomlTableRange(text, tableName) {
  const lines = text.split('\n');
  const target = tableName.trim();
  let start = -1;
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed.startsWith('[')) continue; // 注释行 / 普通键值行
    const close = trimmed.indexOf(']');
    if (close === -1) continue;
    const inner = (trimmed.startsWith('[[') ? trimmed.slice(2, close) : trimmed.slice(1, close)).trim();
    if (start === -1) {
      if (inner === target) start = index;
    } else {
      return { start, end: index };
    }
  }
  return start === -1 ? null : { start, end: lines.length };
}

export function mergeTomlText(existingText, generatedText, force = false) {
  const tableName = `mcp_servers.${SERVER_NAME}`;
  const table = `[${tableName}]`;
  const range = findTomlTableRange(existingText, tableName);
  if (range && !force) {
    throw new Error(`目标文件已存在 ${table}；确认要替换这张表请加 --force，否则请手动处理`);
  }
  const addition = generatedText.trimEnd();
  if (range && force) {
    // force 的语义是「替换」，不是「追加第二张同名表」：后者会写出非法 TOML。
    const lines = existingText.split('\n');
    const before = lines.slice(0, range.start);
    const after = lines.slice(range.end);
    const separator = before.length && before[before.length - 1].trim() !== '' ? [''] : [];
    // 原表后到下一表头之间的空行属于被替换范围，补回来，别让新表键值贴住下一张表头。
    const tailSeparator = after.length && after[0].trim() !== '' ? [''] : [];
    const next = [...before, ...separator, ...addition.split('\n'), ...tailSeparator, ...after];
    return {
      content: `${next.join('\n').trimEnd()}\n`,
      action: 'replace-table',
    };
  }
  const base = existingText.trimEnd();
  return {
    content: `${base}${base ? '\n\n' : ''}${addition}\n`,
    action: 'append',
  };
}

function platformFor(targetId) {
  const match = platforms.find((item) => item.targets.includes(targetId));
  return match ? match.id : null;
}

export function buildInstallPlan(options = {}) {
  for (const key of Object.keys(options)) {
    if (!ALLOWED_OPTION_KEYS.has(key)) throw new Error(`未知安装选项 ${key}`);
  }
  const { writeTo, ...configOptions } = options;
  const result = makeConfig(configOptions);
  const target = findTarget(result.target);
  const configText = renderConfigText(result);
  const mode = result.format === 'form'
    ? 'manual'
    : result.format === 'toml' ? 'toml-append' : 'json-merge';
  const declared = target.configPath || '（客户端 UI 表单，无已知配置文件路径）';
  const writeToPath = writeTo ? expandPath(writeTo) : null;
  const declaredPath = target.configPath ? expandPath(target.configPath) : null;
  const overridden = Boolean(writeToPath && declaredPath && writeToPath !== declaredPath);
  return {
    target: target.id,
    platform: platformFor(target.id),
    format: result.format,
    mode,
    destination: declared,
    effectiveDestination: writeToPath || declared,
    destinationOverridden: overridden,
    isClientConfig: mode !== 'manual',
    content: configText,
    warnings: result.warnings,
    postSteps: target.postSteps,
    writeTo: writeToPath,
    applied: false,
    note: '默认只输出安装计划；只有传 --write-to 才写文件，且写入前会备份已存在的目标文件。'
      + (overridden ? ' 注意：--write-to 覆盖了 target 声明的默认路径，实际写入路径见 effectiveDestination。' : ''),
  };
}

/** --all 只用来给 HTTP target 演示配置形状；明确标成占位，绝不落盘。 */
export const PLAN_PLACEHOLDER_ADDRESS = 'http://127.0.0.1:4818/mcp/PUBLICATION_ID';

/**
 * 逐 target 输出可复核的安装计划。刻意不写任何文件：
 * 七个平台里有 UI 表单、有未安装客户端、有发布地址还没起服务，批量落盘只会制造误导。
 */
export function buildAllInstallPlans(options = {}) {
  for (const key of Object.keys(options)) {
    if (!ALLOWED_OPTION_KEYS.has(key)) throw new Error(`未知安装选项 ${key}`);
  }
  if (options.writeTo) throw new Error('--all 只输出计划，不接受 --write-to；请逐个 target 显式安装');
  if (options.targetId) throw new Error('--all 与 --target 不能同时给');
  const plans = targets.map((target) => {
    const single = buildInstallPlan({
      targetId: target.id,
      ...(target.input === 'address' ? { address: options.address || PLAN_PLACEHOLDER_ADDRESS } : {}),
      ...(options.auth !== undefined ? { auth: options.auth } : {}),
      ...(options.connectorPath !== undefined ? { connectorPath: options.connectorPath } : {}),
    });
    return {
      target: single.target,
      platform: single.platform,
      format: single.format,
      mode: single.mode,
      destination: single.destination,
      isClientConfig: single.isClientConfig,
      requiresUiForm: single.mode === 'manual',
      addressIsPlaceholder: target.input === 'address' && !options.address,
      content: single.content,
      warnings: single.warnings,
      postSteps: single.postSteps,
      applied: false,
    };
  });
  return {
    planOnly: true,
    writes: 0,
    count: plans.length,
    placeholderAddress: PLAN_PLACEHOLDER_ADDRESS,
    note: '批量模式只输出计划，不写任何客户端配置文件；HTTP target 的地址是占位符，4818 未起、publicationId 未拿到时不可实际安装。逐平台状态另看 local-status。',
    plans,
  };
}

/**
 * 真正落盘。返回值本身就是结果（没有 ok 字段）；失败一律抛错。
 * 写完回读比对，防止磁盘写满时静默产生空文件却被当成成功。
 */
export function applyInstallPlan(plan, options = {}) {
  if (!plan.writeTo) throw new Error('未指定 --write-to：不会写入任何文件');
  const path = plan.writeTo;
  const force = options.force === true;
  const existingText = existsSync(path) ? readFileSync(path, 'utf8') : null;
  let content = plan.content;
  let action = 'create';
  if (existingText !== null) {
    if (plan.mode === 'json-merge') {
      const merged = mergeJsonText(existingText, plan.content, force);
      content = merged.content;
      action = merged.action;
    } else if (plan.mode === 'toml-append') {
      const merged = mergeTomlText(existingText, plan.content, force);
      content = merged.content;
      action = merged.action;
    } else if (!force) {
      throw new Error(`目标文件已存在：${path}；确认覆盖请加 --force`);
    } else {
      action = 'overwrite';
    }
  }
  mkdirSync(dirname(path), { recursive: true });
  let backupPath = null;
  if (existingText !== null) {
    backupPath = `${path}.bak-${Date.now()}`;
    copyFileSync(path, backupPath);
    if (!existsSync(backupPath)) throw new Error(`备份失败：${backupPath}`);
  }
  writeFileSync(path, content, 'utf8');
  const readBack = readFileSync(path, 'utf8');
  if (readBack !== content) throw new Error(`写入后回读不一致：${path}`);
  return { applied: true, path, backupPath, action, bytes: Buffer.byteLength(content) };
}
