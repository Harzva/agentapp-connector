# 市场上架包骨架（占位）

> 由 `src/packs.mjs` 生成，登记日期 2026-11-11。全部状态：NOT-SUBMITTED。

本地配置能跑通不等于能上架。这里只准备**结构与清单**，不代替公网服务、主体认证、审核与发布。

| 平台 | 市场入口 | 该类目规范 | 本目录内容 |
| --- | --- | --- | --- |
| WorkBuddy | https://open.workbuddy.cn/ | 已找到该类目官方公开提交规范 | 提交清单 + 占位包骨架 |
| 千问办公 QwenWork | https://www.alibabacloud.com/help/zh/doc-detail/3052930.html | 已找到官方连接器规范，但当前只开放企业/组织内提交与审核；公共市场个人上传尚未开放 | 提交清单 + OpenAPI 请求体占位（只到组织内提交） |
| 豆包工作 | https://open.doubao.com/ | 平台内测邀请制：官方接入规范需登录或入驻后可见，没有公开自助提交 | 提交清单 + 入驻路径（规范需登录后可见，不生成可提交包） |
| ChatGPT 桌面 / Codex CLI / IDE 扩展 | https://chatgpt.com/apps | 已找到该类目官方公开提交规范 | 提交清单 + 占位包骨架 |
| Cursor | https://cursor.com/marketplace | 已找到该类目官方公开提交规范 | 提交清单 + 占位包骨架 |
| Claude / Claude Desktop | https://claude.com/connectors | 已找到该类目官方公开提交规范 | 提交清单 + 占位包骨架 |
| ZCode | https://github.com/zai-org/zcode-plugins | 已找到该类目官方公开提交规范 | 提交清单 + 占位包骨架 |

## 七个平台的材料性质不同

- 千问办公 `enterprise`：官方有《连接器管理》、企业旗舰版新建流程与 `POST /api/openapi/v1/connectors`，但「允许上传个人连接器」标记「即将推出」；所以只给**组织内提交**材料，不写成公开上架。
- 豆包工作 `invite-only`：开放平台内测邀请制，技能接入指南直接抓取返回「登录」壳；服务商连接器规范需入驻后可见，所以只给**入驻路径与清单**，不伪造可提交包。
- 其余平台 `official`：有官方公开提交规范，但 WorkBuddy / ChatGPT / Cursor / Claude 都要求公网 HTTPS MCP Server 与认证能力，当前同样不可提交。
- ZCode `official`：官方市场（zai-org/zcode-plugins）走 GitHub PR + 维护者人工审核，收的是**插件包**且插件可自带 stdio MCP——是唯一不强制公网 HTTPS 端点的路径；但 OpenBot 连插件源码树都没有，双语 README 与副作用披露也没准备，当前同样不可提交。
- 提交步骤与前置检查见 `SUBMIT-STEPS.md`；当前 7 个平台 `ready=0`。

## 为什么现在不能装到市场

- 没有公网 HTTPS 常驻 MCP Server、OAuth / DCR 与多用户隔离。
- 工具仍是异步 job 语义，缺 title / readOnlyHint / destructiveHint 注解。
- 目录元数据、图标、隐私政策、测试账号与测试指南都还没准备。
- Cursor 发布者条款 3.1 要求市场插件免费、6.3 禁止用插件数据训练模型，这是商业化约束。

## 占位约定

- MCP 端点一律写 `https://mcp.example.invalid/mcp`（RFC 2606 保留域，永远解析不到），不写本机地址或真实域名。
- 凭据只写环境变量名 `OPENBOT_GRANT_TOKEN` 或 ${OPENBOT_GRANT_TOKEN} 占位符，绝不写入真实 token。
- 所有清单项默认是未勾选 `[ ]`；没有完成实测就不能勾。
- WorkBuddy 的 `connector-meta.placeholder.json` 字段名只是占位，正式字段以开放平台《连接器》为准。
- 千问办公的 `connector-payload.placeholder.json` 字段来自官方 OpenAPI，但缺 BASE_URL、Idempotency-Key 与管理员 scope，不能直接 POST。

## 生成

```sh
npm run packs
npm test
```

