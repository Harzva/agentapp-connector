import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderDocs } from '../src/docs.mjs';
import { platforms } from '../src/policies.mjs';
import { targets, plannedTargets } from '../src/targets.mjs';

const docsDir = fileURLToPath(new URL('../docs/', import.meta.url));

function readDoc(name) {
  return readFileSync(`${docsDir}${name}`, 'utf8');
}

test('三份文档与注册表同轮同步，改了注册表没跑 npm run docs 会红', () => {
  const rendered = renderDocs();
  assert.deepEqual(Object.keys(rendered).sort(), [
    'LOCAL-MODES.md', 'MARKETPLACE.md', 'POLICIES.md',
  ]);
  for (const [name, content] of Object.entries(rendered)) {
    assert.equal(readDoc(name), content, `${name} 与注册表不一致`);
    assert.ok(content.length > 500, `${name} 内容过短`);
  }
});

test('POLICIES.md 收录注册表里每一条文档地址与证据等级说明', () => {
  const text = readDoc('POLICIES.md');
  const docs = platforms.flatMap((item) => [
    ...item.policies, ...item.localMode.docs, ...item.marketplace.docs,
  ]);
  for (const item of docs) {
    assert.ok(text.includes(item.url), `POLICIES.md 缺少 ${item.url}`);
    assert.ok(text.includes(item.title), `POLICIES.md 缺少 ${item.title}`);
  }
  assert.ok(text.includes('已抓正文'));
  assert.ok(text.includes('索引摘要'));
  assert.ok(text.includes('正式提交前'));
  assert.ok(text.includes('取证边界'));
});

test('POLICIES.md 写出本轮全文复核的条款与生效日期，不把 403 写成「没有规范」', () => {
  const text = readDoc('POLICIES.md');
  for (const expected of [
    'https://openai.com/policies/connectors-actions-terms/',
    'including via an MCP server',
    'Effective Nov 12, 2026',
    'November 20, 2026',
    '尚未生效',
    'opt-in consent',
    '403 Forbidden',
    '正文缺失',
    '字段表',
    '8.2',
  ]) {
    assert.ok(text.includes(expected), `POLICIES.md 缺少 ${expected}`);
  }
  // 没有正文的两份腾讯规则页必须仍标索引摘要。
  assert.ok(text.includes('https://rule.tencent.com/rule/202608300001'));
  assert.ok(text.includes('疑似 JS 动态渲染'));
});

test('MARKETPLACE.md 逐平台写出条件、阻塞项，且不谎称已上架', () => {
  const text = readDoc('MARKETPLACE.md');
  assert.ok(text.includes('当前所有平台的 `status` 都不是 `published`'));
  assert.ok(text.includes('公网 HTTPS 常驻 MCP Server'));
  for (const platform of platforms) {
    for (const item of platform.marketplace.requirements) assert.ok(text.includes(item), `缺少条件：${item}`);
    for (const item of platform.marketplace.blockers) assert.ok(text.includes(item), `缺少阻塞项：${item}`);
  }
  assert.ok(text.includes('已找到官方连接器规范，但当前只开放企业/组织内提交与审核'));
  assert.ok(text.includes('`submissionSpec` 区分公开提交规范、企业/组织内提交与内测邀请制'));
  assert.ok(text.includes('Cursor 发布者条款 3.1 要求市场插件免费'));
  assert.ok(text.includes('Anthropic Directory Policy 禁止采集无关对话数据'));
});

test('LOCAL-MODES.md 覆盖全部 target 与未完成清单原因', () => {
  const text = readDoc('LOCAL-MODES.md');
  for (const target of targets) {
    assert.ok(text.includes(`\`${target.id}\``), `缺少 target ${target.id}`);
    assert.equal(text.includes('已完成'), false);
  }
  for (const planned of plannedTargets) {
    assert.ok(text.includes(planned.id), `缺少 planned ${planned.id}`);
    assert.ok(text.includes(planned.reason), `缺少 planned 原因 ${planned.reason}`);
  }
  assert.ok(text.includes('Anthropic 云端'));
  assert.ok(text.includes('ChatGPT 网页版不读取本机'));
  // ZCode 的形状差异必须写进文档：嵌套键、严格 schema、模板不展开。
  assert.ok(text.includes('mcp.servers'));
  assert.ok(text.includes('不展开'));
});
