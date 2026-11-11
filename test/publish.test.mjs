import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));

/**
 * 发布面 = 公开源仓库时用户会读到、会安装、会渲染的全部文本文件。
 * 这些文件里不允许出现真实凭据模式与本机绝对路径；
 * src/ 与 test/ 里作为「负向断言 / 教育示例」的字面量不在本闸门范围。
 */
function collectPublishFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const info = statSync(path);
    if (info.isDirectory()) out.push(...collectPublishFiles(path));
    else if (/\.(md|json|svg|yml|txt)$/.test(name) || name === 'LICENSE') out.push(path);
  }
  return out;
}

const surfaces = [
  'README.md', 'HANDOFF.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'LICENSE', 'package.json',
  'docs/README_EN.md', 'docs/POLICIES.md', 'docs/LOCAL-MODES.md', 'docs/MARKETPLACE.md',
  '.github/workflows/ci.yml', '.github/PULL_REQUEST_TEMPLATE.md',
  '.github/ISSUE_TEMPLATE/bug-report.md', 'SECURITY.md',
  'assets/logos/SOURCES.md', 'assets/banner.svg', 'assets/logo.svg', 'assets/social-card.svg',
].map((p) => `${projectRoot}${p}`);
for (const dir of [`${projectRoot}marketplace`, `${projectRoot}assets/logos`]) {
  surfaces.push(...collectPublishFiles(dir));
}
const uniqueSurfaces = [...new Set(surfaces)];

const BANNED = [
  // 真实凭据模式（占位符 OPENBOT_GRANT_TOKEN / ${user_config.*} 明确放行）
  [/obcli_[A-Za-z0-9]/, 'CLI 桥 token 前缀'],
  [/obs_[A-Za-z0-9]/, 'grant token 前缀'],
  [/Bearer sk-/i, 'Bearer 密钥'],
  [/sk-ant-/, 'Anthropic 密钥'],
  [/gh[pousr]_/, 'GitHub token'],
  [/AKIA[0-9A-Z]{12}/, 'AWS AccessKey'],
  [/OPENBOT_OWNER_TOKEN/, 'owner token 变量名'],
];
const BANNED_PATHS = [
  [/\/Users\/[^/]+\//, '本机用户目录绝对路径'],
  [/\/private\/tmp\//, 'macOS 会话临时目录'],
  [/\/var\/folders\//, 'macOS 会话临时目录'],
];

test('发布面（README/docs/marketplace/assets/模板）不夹带真实凭据与本机绝对路径', () => {
  assert.ok(uniqueSurfaces.length >= 30, `发布面文件收集异常：${uniqueSurfaces.length}`);
  const violations = [];
  for (const path of uniqueSurfaces) {
    const text = readFileSync(path, 'utf8');
    const label = relative(projectRoot, path);
    for (const [pattern, what] of BANNED) {
      if (pattern.test(text)) violations.push(`${label}：疑似 ${what}（${pattern}）`);
    }
    for (const [pattern, what] of BANNED_PATHS) {
      if (pattern.test(text)) violations.push(`${label}：疑似 ${what}`);
    }
    assert.ok(text.length > 0, `${label} 是空文件`);
  }
  assert.deepEqual(violations, [], `发布面存在泄漏嫌疑：\n${violations.join('\n')}`);
  // 占位凭据必须仍然在场：防 someone 把占位符也当泄漏删掉，材料失去可读性
  const zcode = readFileSync(`${projectRoot}marketplace/zcode/.zcode-plugin/plugin.json`, 'utf8');
  assert.ok(zcode.includes('${user_config.'), 'ZCode 插件骨架的 user_config 占位符丢失');
  assert.ok(readFileSync(`${projectRoot}marketplace/cursor/mcp.json`, 'utf8').includes('${OPENBOT_GRANT_TOKEN}'),
    'Cursor 骨架的环境变量占位符丢失');
});
