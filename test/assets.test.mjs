import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const readme = readFileSync(`${projectRoot}README.md`, 'utf8');

test('README 引用的每个本地资产与相对链接都真实存在且非空，页面不会裂图或死链', () => {
  // README 用 HTML src="assets/xx" 或 markdown (assets/xx) 两种写法引用；都抓出来。
  // 以 … / ... 结尾的是叙述文字里的省略写法，不是文件，必须剔除。
  const refs = [...readme.matchAll(/(?:src="|\()(assets\/[^)"\s]+)/g)]
    .map((m) => m[1])
    .filter((ref) => !/\.\.\.$/.test(ref) && !ref.endsWith('…'));
  assert.ok(refs.length >= 8, `README 里的本地资产引用过少：${refs.length}`);
  for (const ref of new Set(refs)) {
    const info = statSync(`${projectRoot}${ref}`); // 不存在会直接抛错变红
    assert.ok(info.isFile(), `README 引用的资产不是文件：${ref}`);
    assert.ok(info.size > 100, `README 引用的资产为空或过小：${ref}`);
  }
  // 相对链接（markdown [..](xx) 里非 http/#/mailto 的目标）也必须真实存在，防死链。
  for (const [file, text] of [['README.md', readme], ['docs/README_EN.md', readFileSync(`${projectRoot}docs/README_EN.md`, 'utf8')]]) {
    const dir = `${projectRoot}${file.replace(/[^/]+$/, '')}`;
    const links = [...text.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1])
      .filter((t) => !/^(https?:|#|mailto:)/.test(t) && !t.endsWith('...') && !t.endsWith('…'));
    assert.ok(links.length >= 3, `${file} 的本地链接过少：${links.length}`);
    for (const link of new Set(links)) {
      const target = link.split('#')[0];
      assert.ok(target && statSync(`${dir}${decodeURIComponent(target)}`).isFile(), `${file} 存在死链：${link}`);
    }
  }
});

test('关键视觉资产与来源登记缺一不可，深浅色变体成对出现', () => {
  // 被点名的关键资产：README 页面视觉 + 社交卡片 + 项目标志
  for (const required of [
    'assets/banner.svg',
    'assets/banner.html',
    'assets/banner.png',
    'assets/logo.svg',
    'assets/social-card.svg',
    'assets/social-card.png',
    'assets/logos/workbuddy.png',
    'assets/logos/qwenwork.png',
    'assets/logos/doubao.png',
    'assets/logos/zcode.png',
    'assets/logos/openai.svg',
    'assets/logos/openai-white.svg',
    'assets/logos/cursor.svg',
    'assets/logos/cursor-white.svg',
    'assets/logos/claude.svg',
    'assets/logos/SOURCES.md',
  ]) {
    const info = statSync(`${projectRoot}${required}`);
    assert.ok(info.isFile() && info.size > 100, `关键资产缺失或为空：${required}`);
  }

  // logos 目录里每个文件都必须在 SOURCES.md 登记，防止来源不明就进仓库
  const sources = readFileSync(`${projectRoot}assets/logos/SOURCES.md`, 'utf8');
  const files = readdirSync(`${projectRoot}assets/logos`).filter((name) => !name.endsWith('.md'));
  assert.ok(files.length >= 12, `logos 目录文件数异常：${files.length}`);
  for (const name of files) {
    assert.ok(sources.includes(`\`${name}\``), `SOURCES.md 缺少 ${name} 的来源登记`);
  }
  // 白色变体必须能对回基图标，防止只留变体丢了原件
  for (const base of ['openai', 'cursor', 'anthropic']) {
    assert.ok(files.includes(`${base}.svg`), `缺少基图标 ${base}.svg`);
    assert.ok(files.includes(`${base}-white.svg`), `缺少深色主题变体 ${base}-white.svg`);
  }
});
