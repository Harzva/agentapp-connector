# 提交 PR 前请确认（维护者会逐项核对）

## 变更类型

- [ ] 缺陷修复
- [ ] 新平台 / 新 target
- [ ] 文档 / 取证更新
- [ ] 测试 / 闸门
- [ ] 其它

## 硬性自检（不通过请不要请求 review）

- [ ] `npm test` 全绿（看「条数 + 退出码」两条；新增/删除用例已同步 `test/gate.mjs` 的 `EXPECTED_CASES`）
- [ ] 改了注册表后已运行 `npm run docs && npm run packs`，生成产物与本 PR 一起提交
- [ ] 一次 PR 只做一件事
- [ ] 行为级修改附变异验证记录（rsync 副本逐条独立进程，新用例全红才算钉住）
- [ ] 「没跑」用 `unknown` / `not-run` 表达；没有把占位 / 推演写成真机结果或已完成
- [ ] 涉及政策 / 市场事实：每条带 URL 与证据等级（`fetched` / `indexed` / `sample` / `tutorial`），抓不到写「正文缺失」，不编条款
- [ ] 涉及平台 Logo：来源为权利人官方或 Simple Icons，并已在 `assets/logos/SOURCES.md` 登记
- [ ] README 徽章里的数字（平台 / target / 依据 / 用例数）与改动保持一致

## 说明

写清楚：解决了什么问题、怎么验证的（真跑的命令与输出摘要）、有没有未完成项。
