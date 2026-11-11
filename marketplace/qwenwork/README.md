# 千问办公组织内连接器（占位）

- 平台：千问办公 QwenWork（qwenwork）
- 状态：**NOT-SUBMITTED** —— 占位骨架，没有提交、没有审核、没有上架
- 该类目规范：已找到官方连接器规范，但当前只开放企业/组织内提交与审核；公共市场个人上传尚未开放
- 市场入口：https://www.alibabacloud.com/help/zh/doc-detail/3052930.html
- 依据登记日期：2026-11-11

> 本目录由 `src/packs.mjs` 从政策注册表生成，不要手改。所有地址、主体、凭据字段都是占位符。
> OpenBot 目前只有桌面内 `127.0.0.1` 的端点，没有公网常驻 HTTPS MCP Server、OAuth 与多用户隔离。

## 当前能走到哪一步

官方文档区分「公共连接器市场」与「组织/企业连接器」。「允许上传个人连接器」标记「即将推出」且暂不能修改，
所以这里只准备**企业/组织内提交**：管理员开启成员提交 → 成员提交 → 「连接器审核」→ 管理员通过并发布到组织连接器 → 启用。

## OpenAPI 请求体占位

`connector-payload.placeholder.json` 按 `POST /api/openapi/v1/connectors` 的字段构造，
但还缺企业部署的 BASE_URL、`Idempotency-Key` 与 Scope `admin.v1.connectors.manage`，不能直接发送。
连接器键与服务 URL 创建后不可修改，正式提交前必须换成真实公网生产地址。

