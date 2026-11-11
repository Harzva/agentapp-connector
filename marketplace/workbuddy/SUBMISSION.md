# WorkBuddy：提交清单

- 平台：WorkBuddy（workbuddy）
- 状态：**NOT-SUBMITTED** —— 占位骨架，没有提交、没有审核、没有上架
- 该类目规范：已找到该类目官方公开提交规范
- 市场入口：https://open.workbuddy.cn/
- 依据登记日期：2026-11-11

> 本目录由 `src/packs.mjs` 从政策注册表生成，不要手改。所有地址、主体、凭据字段都是占位符。
> OpenBot 目前只有桌面内 `127.0.0.1` 的端点，没有公网常驻 HTTPS MCP Server、OAuth 与多用户隔离。

## 需满足

- [ ] 一个 Connector 包只含一个 MCP Server（connector-meta.json + mcp.json + icon + skills/）
- [ ] MCP Server 公网或约定网络稳定可达，生产环境地址必须 HTTPS
- [ ] 单次请求建议 30 秒内响应，建议 SLA ≥ 99.9%，实现标准 MCP 协议
- [ ] 涉及用户数据需认证鉴权；不得在包内硬编码真实 Token；最小权限
- [ ] 自查清单通过后提交审核，审核通过转待发布，点击发布后上架；更新需递增 version 重新审核

## 阻塞项（逐条解决前不要提交）

- [ ] 当前 OpenBot 没有公网常驻 MCP Server；4818 仅监听 127.0.0.1，退出桌面即停服
- [ ] OAuth（auth_mode: server-side）需实现 DCR / 元数据端点并完成域名加白，或改用 token 表单模式
- [ ] 主体口径：开放平台文档列有企业 / 其他组织 / 个人认证，上线报道也写明个人开发者可入驻并开发管理连接器；但公开发布权限与审核口径仍以后台实际入口为准
- [ ] 开发者服务协议 4.3(7) 只拿到索引摘要，正式提交前需后台全文复核

## 依据

- [开放平台《连接器》](https://open.workbuddy.cn/docs/connector)（official / fetched）
- [入驻开放平台](https://open.workbuddy.cn/docs/onboarding)（official / fetched）
- [开放平台上线报道（媒体，非规范）](https://news.qq.com/rain/a/20260903A03VEU00)（third-party / indexed）

## 提交动作

- [ ] 在平台后台确认主体认证与发布权限
- [ ] 部署公网 HTTPS MCP Server 并完成认证、最小权限与审计
- [ ] 按目录规范改造工具名 / 描述 / 注解 / 输出 schema
- [ ] 补齐图标、隐私政策、文档 URL、测试账号与测试指南
- [ ] 后台实际提交；提交后把 `status` 从 `NOT-SUBMITTED` 改为平台返回的真实状态

