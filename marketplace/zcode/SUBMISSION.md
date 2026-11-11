# ZCode：提交清单

- 平台：ZCode（zcode）
- 状态：**NOT-SUBMITTED** —— 占位骨架，没有提交、没有审核、没有上架
- 该类目规范：已找到该类目官方公开提交规范
- 市场入口：https://github.com/zai-org/zcode-plugins
- 依据登记日期：2026-11-11

> 本目录由 `src/packs.mjs` 从政策注册表生成，不要手改。所有地址、主体、凭据字段都是占位符。
> OpenBot 目前只有桌面内 `127.0.0.1` 的端点，没有公网常驻 HTTPS MCP Server、OAuth 与多用户隔离。

## 需满足

- [ ] 社区/伙伴插件放 external_plugins/<kebab-case 目录>；plugins/ 仅限官方维护的插件（CONTRIBUTING.md）
- [ ] .zcode-plugin/plugin.json 必须含 name / description / version / author；根目录 marketplace.json 条目的 name、version、description 必须与清单一致
- [ ] 至少提供一个有用组件：command / skill / hook / agent / MCP server；MCP 走根目录 .mcp.json 或清单 mcpServers 字段，键名命名空间为 plugin:<插件名>:<服务名>
- [ ] 必须同时提供 README.md 与 README_CN.md；category 只能选 developer-tools / productivity / utilities / finance / guides / template / other
- [ ] README 必须如实披露网络访问、模型/API/服务依赖、文件写入、命令执行、hooks、MCP server 与其它副作用；第三方代码/资产/服务标注许可证与来源
- [ ] 不得提交凭据、私有端点、客户数据、机器特定路径、缓存、构建产物、混淆源码或不必要的预编译二进制
- [ ] 提交流程：fork zai-org/zcode-plugins → external_plugins/ 下做插件 → 跑 python3 scripts/validate.py、build_dist.py、git diff --check → PR 模板必填 Plugin type（UI Plugin / Standard plugin / Not applicable）声明 → Conventional Commits 标题 → 维护者按功能、安全、可维护性、兼容性、来源与许可证审核
- [ ] 已发布版本不可变：改动可安装内容必须同时递增清单与 marketplace.json 的语义化版本，不得复用旧版本号
- [ ] 自建市场分发：仓库根目录 marketplace.json 列出条目，用户在 设置 → 插件 → 创建 → 添加插件市场 填 GitHub 仓库 / Git URL / 本地目录添加；该路径无需平台审核，但 ZCode 提示「启用插件就是授予代码执行信任」

## 阻塞项（逐条解决前不要提交）

- [ ] OpenBot 连插件源码树都没有：connector.cjs / run.sh 还没打包成 .zcode-plugin/plugin.json + 组件目录；marketplace/zcode/ 目前只有占位骨架
- [ ] stdio 形态依赖 OpenBot 桌面在线与 CLI 桥 owner token；插件用户必须装有 OpenBot 桌面端才能真实调用工具，而所有 target 的 liveTested 仍是 false
- [ ] HTTP 形态需要公网端点，当前只有 127.0.0.1:4818；ZCode 配置文件不展开 ${...} 模板，HTTP headers 无法用环境变量占位符注入凭据
- [ ] 平台侧服务条款 / 隐私政策本轮未取证：现有依据只有产品文档与 GitHub 仓库，上架前需补 ZCode / Z.ai 侧条款，不能引用没有依据的条款
- [ ] 官方市场没有自动上架：PR 要过维护者人工审核（功能/安全/可维护性/兼容性/来源/许可证），README×2、副作用披露与版本纪律都要先备齐

## 依据

- [官方市场贡献指南 CONTRIBUTING.md](https://github.com/zai-org/zcode-plugins/blob/main/CONTRIBUTING.md)（official / fetched）
- [Plugin（官方文档）](https://zcode.z.ai/cn/docs/plugin)（official / fetched）
- [官方市场仓库首页](https://github.com/zai-org/zcode-plugins)（official / fetched）
- [本机市场注册表](~/.zcode/cli/plugins/known_marketplaces.json)（local / sample）
- [本机官方市场 catalog 样本](~/.zcode/cli/plugins/marketplaces/zcode-plugins-official/marketplace.json)（local / sample）

## 提交动作

- [ ] 在平台后台确认主体认证与发布权限
- [ ] 部署公网 HTTPS MCP Server 并完成认证、最小权限与审计
- [ ] 按目录规范改造工具名 / 描述 / 注解 / 输出 schema
- [ ] 补齐图标、隐私政策、文档 URL、测试账号与测试指南
- [ ] 后台实际提交；提交后把 `status` 从 `NOT-SUBMITTED` 改为平台返回的真实状态

