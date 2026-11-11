import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** 新增或删除测试时必须同步此值；它同时防止「零用例但退出码 0」被当成通过。 */
const EXPECTED_CASES = 129;

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const testDir = fileURLToPath(new URL('.', import.meta.url));
const files = readdirSync(testDir).filter((name) => name.endsWith('.test.mjs')).sort();

function fail(reason, output) {
  console.error(`FAIL: ${reason}`);
  if (output) console.error(output.trimEnd());
  process.exit(1);
}

if (files.length === 0) fail('没有找到任何 *.test.mjs 测试文件');

const result = spawnSync(
  process.execPath,
  ['--test', ...files.map((name) => `test/${name}`)],
  { cwd: projectRoot, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
);

if (result.error) fail(`测试进程起不来：${result.error.message}`);
const output = result.stdout || '';
if (result.status !== 0) fail(`测试进程退出码 ${result.status}`, output);

function count(label) {
  const match = output.match(new RegExp(`^# ${label} (\\d+)$`, 'm'));
  return match ? Number(match[1]) : null;
}

const numbers = {
  tests: count('tests'),
  pass: count('pass'),
  fail: count('fail'),
  skipped: count('skipped'),
  cancelled: count('cancelled'),
  todo: count('todo'),
};
if (Object.values(numbers).some((value) => value === null)) {
  fail('读不到 TAP 汇总（可能被管道截断或根本没跑起来）', output);
}
if (numbers.tests === 0) fail('零用例，退出码 0 不能算通过', output);
if (numbers.fail !== 0 || numbers.cancelled !== 0 || numbers.skipped !== 0 || numbers.todo !== 0) {
  fail(`存在失败/取消/跳过/待办：${JSON.stringify(numbers)}`, output);
}
if (numbers.tests !== EXPECTED_CASES || numbers.pass !== EXPECTED_CASES) {
  fail(
    `用例条数与登记值 ${EXPECTED_CASES} 不符：${JSON.stringify(numbers)}；新增或删除测试请同步 test/gate.mjs 的 EXPECTED_CASES`,
    output,
  );
}

console.log(
  `PASS: ${numbers.pass} 条用例全绿，退出码 0，无失败/跳过/取消/待办；测试文件 ${files.length} 个：${files.join(', ')}`,
);
