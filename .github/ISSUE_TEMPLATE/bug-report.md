---
name: 缺陷报告
about: doctor / install-local / 生成产物等行为不符合预期
labels: bug
---

## 环境

- OS / 版本：
- Node 版本（`node -v`）：
- agentapp-connector 版本或 commit：

## 现象

一句话说清「预期 vs 实际」。

## 复现步骤

```sh
# 最小复现命令，例如：
# node src/cli.mjs doctor --home /tmp/some-fake-home --no-handshake
```

## 实际输出

```text
# 完整 JSON / stderr。注意：先脱敏，不要粘贴真实 token（本工具输出本身不含凭据）
```

## 备注

- 涉及某平台行为时，附该平台官方文档 URL；
- 「没跑 / 看不到」与「失败」是不同结论，报告时请注明你属于哪一种。
