import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  renderPacks, PACK_PLATFORMS, SUBMISSION_STATE, PLACEHOLDER_ENDPOINT, TOKEN_ENV_VAR,
} from '../src/packs.mjs';
import { renderSubmitSteps } from '../src/preflight.mjs';
import { platforms, PLATFORM_SUBMISSION_SPEC } from '../src/policies.mjs';

// 期望值一律写字面值，不从被测实现读回常量；否则两边一起改，断言会全绿却什么都没验到。
const LITERAL_ENDPOINT = 'https://mcp.example.invalid/mcp';
const LITERAL_STATE = 'NOT-SUBMITTED';
const LITERAL_TOKEN = 'OPENBOT_GRANT_TOKEN';

const packsDir = fileURLToPath(new URL('../marketplace/', import.meta.url));

function readPack(name) {
  return readFileSync(`${packsDir}${name}`, 'utf8');
}

function jsonPack(name) {
  return JSON.parse(readPack(name));
}

test('市场包骨架与注册表同轮同步，改了注册表没跑 npm run packs 会红', () => {
  const rendered = renderPacks();
  assert.ok(Object.keys(rendered).length >= 14);
  for (const [name, content] of Object.entries(rendered)) {
    assert.equal(readPack(name), content, `${name} 与 packs.mjs 不一致`);
    assert.ok(content.length > 100, `${name} 内容过短`);
  }
});

test('七个平台的提交清单逐字收录条件、阻塞项与依据，且全部未勾选', () => {
  assert.deepEqual(PACK_PLATFORMS, [
    'workbuddy', 'qwenwork', 'doubao-work', 'chatgpt-codex', 'cursor', 'claude', 'zcode',
  ]);
  for (const id of PACK_PLATFORMS) {
    const text = readPack(`${id}/SUBMISSION.md`);
    const platform = platforms.find((item) => item.id === id);
    for (const item of platform.marketplace.requirements) {
      assert.ok(text.includes(`- [ ] ${item}`), `${id} 缺少条件：${item}`);
    }
    for (const item of platform.marketplace.blockers) {
      assert.ok(text.includes(`- [ ] ${item}`), `${id} 缺少阻塞项：${item}`);
    }
    for (const item of platform.marketplace.docs) {
      assert.ok(text.includes(item.url), `${id} 缺少依据 ${item.url}`);
    }
    assert.ok(text.includes(LITERAL_STATE));
    assert.equal(text.includes('- [x]'), false, `${id} 有被勾掉的清单项`);
  }
});

test('JSON 骨架可解析，端点与凭据都是占位符，不含真实 token', () => {
  const files = [
    'workbuddy/connector-meta.placeholder.json',
    'workbuddy/mcp.json',
    'qwenwork/connector-payload.placeholder.json',
    'cursor/.cursor-plugin/plugin.json',
    'cursor/mcp.json',
    'zcode/.zcode-plugin/plugin.json',
    'zcode/marketplace.placeholder.json',
  ];
  const all = files.map((name) => readPack(name)).join('\n');
  for (const prefix of ['obcli_', 'obs_', 'Bearer sk-', 'http://127.0.0.1']) {
    assert.equal(all.includes(prefix), false, `骨架里出现真实凭据或本机地址：${prefix}`);
  }
  for (const name of ['workbuddy/mcp.json', 'cursor/mcp.json']) {
    const server = jsonPack(name).mcpServers.openbot;
    assert.equal(server.url, LITERAL_ENDPOINT, `${name} 端点不是 reserved 占位地址`);
    assert.equal(server.headers.Authorization, `Bearer \${${LITERAL_TOKEN}}`);
  }
  const payload = jsonPack('qwenwork/connector-payload.placeholder.json');
  assert.equal(payload.url, LITERAL_ENDPOINT);
  assert.equal(payload.server_key, 'openbot');
  assert.equal(payload.transport, 'http');
  assert.equal(payload.status, LITERAL_STATE);
  assert.ok(payload._warning.includes('不可提交'));
  assert.equal(jsonPack('workbuddy/connector-meta.placeholder.json').status, LITERAL_STATE);
  assert.ok(jsonPack('cursor/.cursor-plugin/plugin.json')._warning.includes('占位'));
});

test('ZCode 插件骨架用官方形状与 user_config 占位，占位市场清单不叫 marketplace.json', () => {
  const plugin = jsonPack('zcode/.zcode-plugin/plugin.json');
  assert.equal(plugin.name, 'openbot-placeholder');
  assert.equal(plugin.version, '0.0.0-placeholder');
  assert.deepEqual(plugin.author, { name: 'PLACEHOLDER' });
  // 插件作用域才支持模板展开：凭据占位走 ZCode 原生的 user_config，不是环境变量占位符。
  assert.equal(plugin.mcpServers.openbot.url, LITERAL_ENDPOINT);
  assert.equal(plugin.mcpServers.openbot.type, 'http');
  assert.equal(plugin.mcpServers.openbot.headers.Authorization, `Bearer \${user_config.${LITERAL_TOKEN}}`);
  assert.ok(Object.hasOwn(plugin.userConfig, LITERAL_TOKEN));
  assert.equal(plugin.userConfig[LITERAL_TOKEN].sensitive, true);
  assert.ok(plugin._warning.includes('占位'));

  const catalog = jsonPack('zcode/marketplace.placeholder.json');
  assert.equal(catalog.name, 'openbot-dev-market');
  assert.equal(catalog.plugins[0].name, plugin.name);
  assert.equal(catalog.plugins[0].version, plugin.version);
  assert.equal(catalog.plugins[0].category, 'developer-tools');
  // 真名 marketplace.json 会被 ZCode 当成可添加的本地市场；占位骨架不允许被直接安装。
  const names = Object.keys(renderPacks());
  assert.equal(names.includes('zcode/marketplace.json'), false);
  assert.ok(names.includes('zcode/marketplace.placeholder.json'));
  const readme = readPack('zcode/README.md');
  assert.ok(readme.includes('external_plugins/'));
  assert.ok(readme.includes('README_CN.md'));
});

test('Cursor plugin 的 variables schema 声明了 mcp.json 里每个占位变量', () => {
  const mcp = readPack('cursor/mcp.json');
  const declared = [...mcp.matchAll(/\$\{([A-Z_]+)\}/g)].map((match) => match[1]);
  assert.deepEqual(declared, [LITERAL_TOKEN]);
  const schema = jsonPack('cursor/.cursor-plugin/plugin.json').variables;
  assert.equal(schema.type, 'object');
  for (const name of declared) {
    assert.ok(Object.hasOwn(schema.properties, name), `variables 缺少 ${name}`);
  }
  assert.deepEqual(schema.required, [LITERAL_TOKEN]);
});

test('骨架明确未提交，不出现已上架或已审核的状态断言', () => {
  for (const [name, content] of Object.entries(renderPacks())) {
    assert.ok(!content.includes('"status": "published"'), `${name} 写成已上架`);
    assert.ok(!content.includes('已通过审核'), `${name} 写成已通过审核`);
  }
  const overview = readPack('README.md');
  assert.ok(overview.includes(LITERAL_STATE));
  assert.ok(overview.includes(LITERAL_ENDPOINT));
  // 交叉校验：导出的常量本身也不许被悄悄换掉。
  assert.equal(SUBMISSION_STATE, LITERAL_STATE);
  assert.equal(PLACEHOLDER_ENDPOINT, LITERAL_ENDPOINT);
  assert.equal(TOKEN_ENV_VAR, LITERAL_TOKEN);
});

test('企业内 / 内测邀请两类平台都有材料，但不伪装成可提交包', () => {
  const names = Object.keys(renderPacks());
  assert.equal(PLATFORM_SUBMISSION_SPEC.qwenwork, 'enterprise');
  assert.equal(PLATFORM_SUBMISSION_SPEC['doubao-work'], 'invite-only');
  assert.ok(names.includes('qwenwork/SUBMISSION.md'));
  assert.ok(names.includes('qwenwork/connector-payload.placeholder.json'));
  assert.ok(names.includes('doubao-work/SUBMISSION.md'));
  assert.equal(names.includes('doubao-work/mcp.json'), false, '内测邀请制不该有可提交包');
  const overview = readPack('README.md');
  assert.ok(overview.includes('七个平台的材料性质不同'));
  assert.ok(overview.includes('组织内提交'));
  assert.ok(overview.includes('内测邀请制'));
  assert.equal(overview.includes('缺该类目公开提交规范'), false);
});

test('SUBMIT-STEPS.md 与前置检查生成器同轮同步', () => {
  assert.equal(readPack('SUBMIT-STEPS.md'), renderSubmitSteps());
  const text = readPack('SUBMIT-STEPS.md');
  assert.ok(text.includes('市场上架提交步骤（当前不可提交）'));
  assert.ok(text.includes('POST /api/openapi/v1/connectors'));
  assert.ok(text.includes('open.doubao.com 提交入驻意向'));
  assert.ok(text.includes('cursor.com/marketplace/publish'));
});
