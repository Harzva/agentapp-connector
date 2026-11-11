# 千问办公 QwenWork：提交清单

- 平台：千问办公 QwenWork（qwenwork）
- 状态：**NOT-SUBMITTED** —— 占位骨架，没有提交、没有审核、没有上架
- 该类目规范：已找到官方连接器规范，但当前只开放企业/组织内提交与审核；公共市场个人上传尚未开放
- 市场入口：https://www.alibabacloud.com/help/zh/doc-detail/3052930.html
- 依据登记日期：2026-11-11

> 本目录由 `src/packs.mjs` 从政策注册表生成，不要手改。所有地址、主体、凭据字段都是占位符。
> OpenBot 目前只有桌面内 `127.0.0.1` 的端点，没有公网常驻 HTTPS MCP Server、OAuth 与多用户隔离。

## 需满足

- [ ] 1.3 连接器是符合 MCP 标准、为 Agent 提供查询/读写/鉴权入口的一组工具；三类能力为技能 / 专家套件 / 连接器
- [ ] 2.5 完成实名认证或主体认证才提供发布服务；2.6 平台可按能力形态限制发布者主体类型与认证等级
- [ ] 组织内提交路径：管理员开启「允许成员将连接器添加到组织连接器」→ 成员提交 → 「连接器审核」待处理 → 管理员通过并发布到组织连接器 → 按组织要求启用
- [ ] 必填字段：连接器键（小写字母/数字/连字符，≤128）、服务 URL（完整 http/https，≤1024，创建后不可改）、授权方式（无需授权 / OAuth）、支持的客户端；可选版本、描述、图标（≤2MB）
- [ ] 企业旗舰版还需选认证与凭据（无认证 / MCP OAuth 2.1 DCR / API Key 用户提供）、填连接协议并点「校验配置」，再配置发布策略组
- [ ] OpenAPI 提交：`POST /api/openapi/v1/connectors`，带 `Idempotency-Key` 与 Scope `admin.v1.connectors.manage`，`transport` 取 http/stdio、`auth_type` 取 key/none/oauth
- [ ] 5.1 审核维度含合规性、安全性、基本功能可用性；5.5 含恶意代码、提示词注入、权限与行为风险检测；5.3 平台可无理由拒绝
- [ ] 6.3 / 6.6 如实说明连接器鉴权方式、权限范围与数据边界；不得要求成员上传共享密码或长期密钥；13.1 当前提交、发布、安装、使用免费

## 阻塞项（逐条解决前不要提交）

- [ ] 公共市场个人上传在管理后台标记为「即将推出」且暂不能修改，当前没有个人向公共扩展市场提交连接器的入口
- [ ] 组织内提交需要企业管理员权限、企业部署的 BASE_URL 与 `admin.v1.connectors.manage` scope，本机不具备这些条件
- [ ] 连接器键与服务 URL 创建后不可修改，必须先确定公网生产地址；OpenBot 目前只有 127.0.0.1 端点，没有公网 HTTPS MCP Server
- [ ] 2.6 允许平台按能力形态限制发布者主体类型，个人开发者能否作为连接器发布者以后台提交页面公示为准
- [ ] 6.2 / 6.4 禁止收集账号鉴权凭证、禁止把能力数据用于模型训练或广告；现有 stdio 形态使用桌面 owner token，需按数据边界重做认证

## 依据

- [扩展能力广场服务协议](https://terms.alicdn.com/legal-agreement/terms/common_product_agreement/20260920094459914/20260920094459914.html)（official / fetched）
- [连接器管理](https://www.alibabacloud.com/help/zh/doc-detail/3052930.html)（official / fetched）
- [创建连接器 API](https://help.aliyun.com/zh/qwenwork/connector-management)（official / fetched）
- [企业旗舰版：连接器](https://help.aliyun.com/zh/qwenwork/enterprise-ultimate-ai-assets-connectors)（official / fetched）
- [阿里云《千问办公：扩展》](https://www.alibabacloud.com/help/zh/doc-detail/3047919.html)（official / indexed）

## 提交动作

- [ ] 在平台后台确认主体认证与发布权限
- [ ] 部署公网 HTTPS MCP Server 并完成认证、最小权限与审计
- [ ] 按目录规范改造工具名 / 描述 / 注解 / 输出 schema
- [ ] 补齐图标、隐私政策、文档 URL、测试账号与测试指南
- [ ] 后台实际提交；提交后把 `status` 从 `NOT-SUBMITTED` 改为平台返回的真实状态

