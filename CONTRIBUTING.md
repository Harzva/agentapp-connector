# 贡献指南

这是一个纪律很重的项目：**测试闸门与取证纪律是这个仓库的核心资产**，贡献前请先读完本文件。

## 动手前

1. 读 `README.md` 的「工作纪律」背景（正文各轮记录里有踩过的坑）与 `HANDOFF.md` 第 6 节。
2. Node ≥ 18，无第三方依赖；`npm test` 必须全绿（看「条数 + 退出码」两条，不是只看退出码）。

## 硬性纪律

1. **一次只改一个细节**：先取证（真跑或构造临时 home），再改，再测试，再同步文档。
2. **`EXPECTED_CASES` 必须同步**：`test/gate.mjs` 里登记用例总数；新增或删除用例忘了改它会直接红。
3. **「没跑」不是「失败」也不是「通过」**：用 `unknown` / `null` / `not-run` 表达；「看不到」只能 `unknown`。
4. **别用字符串包含判断结构**：TOML 表头、JSON 声明、命令输出都按结构解析。
5. **`nextStep` 必须是可执行动作且按根因分**；所有失败共用一句等于把人带到错处。
6. **测试夹具不能替产品打掩护**：夹具用真实形态，别用「刚好能过」的假数据。
7. **变异验证**：行为级修改在 rsync 副本上逐条跑，确认新用例真的钉住行为（全红才算钉住）。
8. **政策/市场事实必须有依据**：标 `fetched` / `indexed` / `sample` / `tutorial`；抓不到就写「正文缺失」，不编条款。
9. **不把推演写成真机结果**；`marketplace/` 永远不允许把 `NOT-SUBMITTED` 占位写成已提交。
10. **README 徽章里的数字**（平台数 / target 数 / 依据数 / 用例数）是承诺，改了任何一个都要同步。

## 改了注册表必须重新生成

```sh
npm run docs     # docs/*.md 与 src/policies.mjs 逐字比对
npm run packs    # marketplace/ 与 src/packs.mjs 逐字比对
npm test         # 全绿再提交
```

CI 会在生成产物与注册表不同步时直接拒绝（见 `.github/workflows/ci.yml`）。

## 提交

- 一次 PR 只做一件事；提交信息用 Conventional Commits（`feat:` / `fix:` / `docs:` / `test:`）。
- 新增平台或 target 时：先补政策与格式证据（带 URL 与证据等级），再动 `src/targets.mjs` / `src/policies.mjs`，最后同步测试与文档。
- 涉及平台 Logo 的改动：只允许替换为权利人官方来源或 Simple Icons，并在 `assets/logos/SOURCES.md` 登记来源与许可。
