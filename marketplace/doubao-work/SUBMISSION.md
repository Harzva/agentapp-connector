# 豆包工作：提交清单

- 平台：豆包工作（doubao-work）
- 状态：**NOT-SUBMITTED** —— 占位骨架，没有提交、没有审核、没有上架
- 该类目规范：平台内测邀请制：官方接入规范需登录或入驻后可见，没有公开自助提交
- 市场入口：https://open.doubao.com/
- 依据登记日期：2026-11-11

> 本目录由 `src/packs.mjs` 从政策注册表生成，不要手改。所有地址、主体、凭据字段都是占位符。
> OpenBot 目前只有桌面内 `127.0.0.1` 的端点，没有公网常驻 HTTPS MCP Server、OAuth 与多用户隔离。

## 需满足

- [ ] 开放平台内测：先在 open.doubao.com 提交入驻意向，等平台联系后开通控制台；没有公开自助注册
- [ ] 完成企业资质认证，按登录后可见的《平台准入要求》与《技能开发规范》制作能力包（ZIP，含名称 / 简介 / 图标 / 版本号）
- [ ] 连接器须是「豆包认可的连接器或已注册工具」；外部 API 不得直接暴露在技能中，须按平台要求完成鉴权、权限与安全验证
- [ ] 平台自动校验包结构 / 内容 / 许可证 → 提交审核 → 平台运营在测试商店验收 → 统一发版 → 状态改为「已上架」；版本状态含草稿 / 审核中 / 已拒绝 / 已上线 / 已下架
- [ ] 服务商通道按第三方实操需 Streamable HTTP + OAuth + 动态注册，上架到官方连接器库后用户点授权即可用；该口径需入驻后向平台核实

## 阻塞项（逐条解决前不要提交）

- [ ] 接入规范不是不存在，而是不对外公开：技能接入指南直接抓取返回「登录」壳，服务商连接器类目的提交入口与审核标准需入驻内测后才可见
- [ ] 没有公开自助注册与提交后台，无法在未获平台联系的情况下自行提交
- [ ] 企业资质认证是技能上架的明确前提，连接器是否同口径未明确；控制台也没有开发者自行下架入口
- [ ] 本机没有公网 HTTPS MCP Server 与 OAuth / 动态注册，第三方实操提到的服务商形态尚未实现

## 依据

- [豆包开放平台首页](https://open.doubao.com/)（official / indexed）
- [技能接入指南（登录后可见）](https://open.doubao.com/document/doubao-developer-guide/skill-integration-guide)（official / indexed）
- [豆包工作服务商连接器（第三方实操）](https://apibobo.com/content/posts/doubao-work-connectors-mcp-guide)（third-party / tutorial）
- [火山引擎《MCP》文档（营销 Agent 控制台）](https://volcengine.com/docs/data-agent/mcp?lang=zh)（official / indexed）
- [第三方连接器目录的豆包提交说明](https://connector.zone/connectors/io-omfang-manifest/install/doubao)（third-party / tutorial）

## 提交动作

- [ ] 在平台后台确认主体认证与发布权限
- [ ] 部署公网 HTTPS MCP Server 并完成认证、最小权限与审计
- [ ] 按目录规范改造工具名 / 描述 / 注解 / 输出 schema
- [ ] 补齐图标、隐私政策、文档 URL、测试账号与测试指南
- [ ] 后台实际提交；提交后把 `status` 从 `NOT-SUBMITTED` 改为平台返回的真实状态

