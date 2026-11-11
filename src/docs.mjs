import {
  platforms, DOCUMENTED_AT, validateRegistry,
  SUBMISSION_SPEC, PLATFORM_SUBMISSION_SPEC,
} from './policies.mjs';
import { targets, plannedTargets } from './targets.mjs';
import { CONNECTOR_CALL_TIMEOUT_MS, DEFAULT_VERIFY_TIMEOUT_MS } from './verify.mjs';

const EVIDENCE_LABEL = {
  fetched: '已抓正文',
  indexed: '索引摘要',
  sample: '本机样本',
  tutorial: '第三方教程',
};
const KIND_LABEL = { official: '官方', 'third-party': '第三方', local: '本机' };
const CATEGORY_LABEL = {
  terms: '服务协议', privacy: '隐私', data: '数据', developer: '开发者',
  usage: '使用政策', review: '审核/上架', 'local-config': '本地配置', market: '市场',
};

function table(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell).replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ')} |`),
  ].join('\n');
}

function docRows(docs) {
  return docs.map((item) => [
    `[${item.title}](${item.url})`,
    CATEGORY_LABEL[item.category],
    KIND_LABEL[item.kind],
    EVIDENCE_LABEL[item.evidence],
    item.note,
  ]);
}

function renderPolicies() {
  const lines = [
    '# 各平台政策与文档地址',
    '',
    `> 由 \`src/policies.mjs\` 生成，登记日期 ${DOCUMENTED_AT}。修改政策注册表后运行 \`npm run docs\` 重新生成。`,
    '',
    '证据等级说明：`已抓正文` = 本轮直接抓到页面正文；`索引摘要` = 只拿到搜索索引或需登录的页面（协议页多为 JS 壳）；',
    '`本机样本` = 本机文件；`第三方教程` = 非官方，不能当官方规范引用。',
    '**正式提交前，所有「索引摘要」的协议条款都必须在平台后台按全文复核一遍。**',
    '',
    '## 平台总览',
    '',
    table(['平台', '主体', '政策条数', '本地模式', '市场上架', '该类目规范', '关联 target'],
      platforms.map((item) => [
        item.label, item.vendor, item.policies.length,
        item.localMode.available ? '有' : '无',
        item.marketplace.available ? `${item.marketplace.status}` : '未找到公开市场路径',
        SUBMISSION_SPEC[PLATFORM_SUBMISSION_SPEC[item.id]],
        item.targets.map((id) => `\`${id}\``).join(', '),
      ])),
    '',
  ];
  for (const platform of platforms) {
    lines.push(`## ${platform.label}（${platform.id}）`, '');
    lines.push('### 政策 / 协议', '');
    lines.push(table(['文档', '类别', '来源', '证据', '要点'], docRows(platform.policies)), '');
    lines.push('### 本地模式依据', '');
    lines.push(table(['文档', '类别', '来源', '证据', '要点'], docRows(platform.localMode.docs)), '');
    lines.push('### 市场上架依据', '');
    lines.push(table(['文档', '类别', '来源', '证据', '要点'], docRows(platform.marketplace.docs)), '');
    lines.push('### 关键约束', '');
    for (const note of platform.notes) lines.push(`- ${note}`);
    lines.push('');
  }
  const allDocs = platforms.flatMap((item) => [
    ...item.policies, ...item.localMode.docs, ...item.marketplace.docs,
  ]);
  lines.push('## 取证边界', '');
  lines.push(`- 登记文档共 ${allDocs.length} 条；其中已抓正文 ${allDocs.filter((d) => d.evidence === 'fetched').length} 条，索引摘要 ${allDocs.filter((d) => d.evidence === 'indexed').length} 条。`);
  lines.push('- 腾讯规则中心开发者服务协议页面仍是 JS 壳，但搜索索引已给出第四条全文，4.3(7) 关于封装 / 转售 / 分发 / 同类 PaaS/MaaS 的原文已核对；正式提交前仍需按后台版本复核是否有修订。');
  lines.push('- 千问办公扩展能力广场服务协议、《连接器管理》、《创建连接器 API》、企业旗舰版连接器本轮都抓到正文；上一轮写成「未找到连接器类目提交规范」是错的，真实情况是公共市场个人上传标记「即将推出」，当前只开放企业/组织内提交。');
  lines.push('- 豆包开放平台内测邀请制：技能接入指南直接抓取返回「登录」壳，正文来自搜索索引；服务商连接器规范需入驻后可见，不是不存在。');
  lines.push('- 豆包工作自定义连接器表单字段来自官方帮助文档 + 第三方教程交叉印证，未见官方 JSON 配置导入说明。');
  lines.push('- Cursor 的 DPA、发布者条款、Plugins reference，以及 Anthropic 的 Legal Center、目录 Terms / Policy、connector submission 均已抓到正文；不再引用按惯例拼的子路径或第三方镜像。');
  lines.push('- ZCode 的官方 MCP 文档（mcp-services）、Plugin 文档与官方市场 CONTRIBUTING.md 本轮抓到正文；市场注册结构与 catalog 字段按本机 known_marketplaces.json 与官方市场 marketplace.json 真实样本核对。ZCode 平台侧服务条款 / 隐私政策未取证，登记为待补，不编造条款。');
  lines.push('- ZCode 配置文件（mcp.servers）不展开 ${...} 模板、schema 严格（未知键整条服务被丢弃）；模板展开与 user_config 是插件自带 MCP 才有的能力。因此 zcode HTTP target 的 authPlaceholderSupported=false。');
  lines.push('- `available` 只表示存在市场路径；`submissionSpec` 区分公开规范 / 企业组织内提交 / 内测邀请制，不能一概写成「未找到」。');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function renderLocalModes() {
  const lines = [
    '# 本地模式清单',
    '',
    `> 由 \`src/policies.mjs\` 与 \`src/targets.mjs\` 生成，登记日期 ${DOCUMENTED_AT}。`,
    '',
    '七个平台都有本地接入方式，但差别很大：**Claude 的远程自定义连接器从 Anthropic 云端发起，本机 `127.0.0.1` 不可达**；',
    'ChatGPT 网页版不读取本机 `config.toml`；豆包工作自定义连接器只能在本地电脑客户端里用；ZCode 用嵌套 `mcp.servers` 键、schema 严格且配置文件不展开 `${...}` 模板。',
    '配置文件写好 ≠ 客户端已安装：本机没有 Claude Desktop 与千问办公客户端，写了配置也不会被读取。',
    '',
    table(['平台', '入口', '传输', '配置文件', 'UI 信任', 'loopback', '依据'],
      platforms.map((item) => [
        item.label,
        item.localMode.entry,
        item.localMode.transports.join(' / '),
        item.localMode.configPaths.join('<br>') || '（客户端 UI 内部）',
        item.localMode.trustRequired ? '需要' : '不需要',
        item.localMode.loopback,
        item.localMode.docs.filter((d) => d.kind === 'official').map((d) => d.url).join('<br>'),
      ])),
    '',
    '## 配置生成器覆盖的 target',
    '',
    table(['target', '客户端', '输出形态', '传输', '默认配置路径', '实机连接'],
      targets.map((item) => [
        `\`${item.id}\``, item.label, item.format, item.transport,
        item.configPath || '（UI 表单）', item.liveTested ? '已完成' : '未完成',
      ])),
    '',
    `所有 target 的 \`liveTested\` 都是 \`false\`：协议层握手通过不等于在客户端里连上。`,
    '',
    '## 本机怎么试',
    '',
    '```sh',
    'node src/cli.mjs doctor                       # 只读探测 + stdio 协议层握手',
    `node src/cli.mjs verify-local                 # stdio 真实只读 tools/call（不派发任务，默认外层 ${DEFAULT_VERIFY_TIMEOUT_MS}ms）`,
    'node src/cli.mjs local-status                 # 七个平台逐平台本地状态',
    'node src/cli.mjs install-local --all               # 逐 target 输出计划，绝不批量落盘',
    'node src/cli.mjs install-local --target codex-stdio --write-to ./local-test/config.toml',
    'node src/cli.mjs doctor --home ./local-test/home --no-handshake',
    '```',
    '',
    '`install-local` 默认只输出安装计划；只有显式给 `--write-to` 才写文件，写前备份已存在的目标文件，JSON 走 `mcpServers` 键合并、TOML 走追加表（已存在同名表时 `--force` 会**替换整张表**，绝不追加重复表），不会整体覆盖客户端配置。`--all` 是逐 target 的批量计划视图（`writes=0`），HTTP target 用占位地址并标 `addressIsPlaceholder`，**不接受** `--write-to` / `--force`，避免把不可达地址或无人读取的配置批量写进真实客户端。',
    '**TOML 同名表按结构判断，不靠字符串包含**：`findTomlTableRange()` 按行解析表头，容忍 `[ mcp_servers.openbot ]` 的空格、忽略注释行；旧实现用 `existingText.includes(\'[mcp_servers.openbot]\')`，带空格的合法表头被漏判、注释里提到表名被误判成「已存在」。更严重的是旧 `--force` 只跳过检查继续追加，写出两张同名表（标准解析器报 `Cannot declare (\'mcp_servers\',\'openbot\') twice`）。现在 `--force` 替换该表到下一表头之间的行，保留表前表后内容并补回空行，`action` 如实记为 `replace-table`。',
    '',
    'WorkBuddy 的「信任」、豆包 / 千问办公的 UI 表单与 OAuth 授权仍需人在客户端里完成。',
    '',
    '**`local-status` 的逐平台验证结论**：只有 `workbuddy` 有可从外部进程直连的 stdio 连接器，所以只有它的 `verification` 反映真实结论，分 `verified` / 失败（`partial`，带下层 `blockingReason`、`failureKinds`、`summary` 与 `timeout`）/ `not-run`（`--no-verify` 或没跑）/ 不适用（其余五平台一律 `not-applicable`）四种。**验证失败不等于不适用**：旧实现只要不是 `verified` 就给所有平台写 `not-applicable`，于是 WorkBuddy 桥超时被硬说成「该平台没有可从外部进程直连的本地 stdio 连接器」，还把 `verify-local` 已归一的根因和超时口径全丢了。`--no-verify` 跳过的是「跑」，不是「判定结果」。',
    '',
    '**坏端口不能让整份报告消失**：`endpoint.json` 里的 `port` 只判「是不是整数」不够——桌面崩溃 / 半写状态可能留下 0、负数或 >65535，`http.request` 会同步抛 `ERR_SOCKET_BAD_PORT`。`probeBridgeHttp` 现在先校验 1–65535，越界记 `bad-endpoint`；请求构造阶段的任何同步异常（越界端口、token 里非法 header 字符等）归一为 `request-failed`，两者都判 `blocked` 并带出端口与错误码。`doctor` / `local-status` 仍输出完整 17 项 JSON，不会退化成退出 1、零字节、只剩一句 stderr。',
    '',
    '**报告里的 `nextStep` 也要按状态分原因**：`BRIDGE_NEXT_STEP` 与 `BRIDGE_HTTP_STATUS` 键集合一一对应（测试逐项比对，新增状态忘了补指引会变红），`bad-endpoint` 提示检查 / 删除 `endpoint.json`、只有 `timeout` 才提示重启桌面、`request-failed` 指向 `ERR_INVALID_CHAR` 一类错误码。旧实现所有失败共用一句「确认主窗口、重启 OpenBot.app」，会把坏端口这种数据错误带到无效动作上，还不报错。',
    '',
    '**跳过 ≠ 失败**：`doctor --no-handshake`（以及 `local-status --no-verify`）产生的 `handshake.status=\'skipped\'` 只记 `unknown`，`detail` 写「本次未执行…这不是握手失败」，`nextStep` 指回去掉跳过参数重跑；顶层 `stdioProtocolOk` 从二态改成三态（`true` 通过 / `false` 失败 / `null` 没跑）。旧实现把除 `ok` 以外一律判 `blocked`，于是 detail 自己写着「调用方跳过握手」却算握手失败，还把「没跑」计入 `summary.blocked` 拉低 `verdict`。同类的 `skipped`（`port4818` / `bridgeHttp` / `codexCli`）本来就走 `unknown`，`stdio-handshake` 是唯一漏掉的；真正的握手超时仍判 `blocked`，测试用同一份事实只改 `status` 做对照，防止「所有非 ok 都变 unknown」。',
    '',
    '**`codex-config` 的表存在性也按结构判断**：旧实现用 `codexConfig.text.includes(\'[mcp_servers.openbot]\')`，真机三份文件的结论是双向错的——`[ mcp_servers.openbot ]`（TOML 允许表头内空格）被判「没配」，只有注释 `# [mcp_servers.openbot] was here` 反而被判「已配」（把没配置说成配好了，比漏判更危险），标准表头才碰巧对。现在复用 `findTomlTableRange()`（与 `install-local --force` 同一套解析），新增纯函数 `hasCodexOpenbotTable()`：按行识别表头、忽略注释与键值行、容忍表头内空格、子表不算同一张表。Python `tomllib` 对三份文件都 `PARSE_OK`（两份有表、一份没有）；修复后 `doctor` 与标准解析器逐项一致：带空格 `ok`、只有注释 `blocked`、标准表头 `ok`，17 项检查与退出码 0 不变。**写盘与只读探测必须是同一套结构判断**，否则一边按结构替换、另一边按字符串猜，结论会互相打架。',
    '',
    '**表头存在 ≠ 表可用**：只判「有没有表头」仍会把空表 / 只写注释的表报成 `ok`。真机四份 `config.toml` 经 Python `tomllib` 复核全部 `PARSE_OK`，但空表与只有注释的表 `table_keys=[]`——Codex 没有 `command`（stdio）或 `url`（HTTP）根本起不来 MCP server。新增 `inspectCodexTable()`：在 `findTomlTableRange()` 给出的表体范围里按行扫描顶层 `key = value`（跳过注释行、字符串值里出现的关键字不算键、子表被下一表头截断），返回 `ready` / `empty-table` / `no-table` 与实际读到的键。`codex-config` 四态分开：`ready→ok`（detail 列出 keys，nextStep 明说这只是磁盘声明）、`empty-table→blocked`（指向 `--force` 替换整张表或补 `command`/`url`）、`no-table→blocked`（生成并追加）、**文件在但读不到→`unknown`**（`readTextSafe` 返回 `text:null` + `error:\'unreadable\'`，拿不到证据不能推断已配或未配）。真机对照：空表 / 只有注释 `ok→blocked`，`command` 与 `url` 两种形态仍 `ok`，四次退出码 0、17 项完整。**边界如实说明**：这是行级扫描，不是完整 TOML 解析器，不校验语法、不解析多行值与内联表；语法合法性仍以客户端与 `tomllib` 为准。',
    '',
    '**JSON 客户端的「键存在 ≠ 可用」一次性收口**：`workbuddy-declared` / `cursor-config` / `claude-desktop-config` 三处旧实现都只写 `parsed?.mcpServers?.openbot ? ok : blocked`。真机四种 `~/.workbuddy/mcp.json`：空对象 `{}` 与只有 `type` 的声明都报 `ok`（客户端没有 `command` / `url` 起不来），合法 stdio 声明也 `ok`（碰巧对），非法 JSON 反被判 `blocked`（拿不到证据却说「没配」）。现在新增 `inspectMcpDeclaration()`（`unreadable` / `missing` / `incomplete` / `ready`，返回实到 keys 与 `hasLaunchKey`），三个检查项共用一个 `jsonCheck()` 渲染 helper，状态与指引不会各自漂移：`ready→ok`（明说只是磁盘声明）、`incomplete→blocked`（指 `--force` 替换 openbot 键或补启动键）、`missing→blocked`（生成配置）、**解析失败→`unknown`**（`readJsonSafe` 返回 `parsed:null` + `error:\'invalid-json-or-unreadable\'`）。真机对照：空对象 / 只有 `type` `ok→blocked`、合法声明仍 `ok`、非法 JSON `blocked→unknown`，四次退出码 0、17 项完整。JSON 字面上是 `null`（`error=null`）仍按 `missing` 处理，不与读失败混为一谈；值里出现 `command` 字样也不算启动键。',
    '',
    '**`codex-cli` 做透：命令跑成功 ≠ openbot 已注册**：旧检查项只写 `facts.codexCli.status === \'ok\' ? \'ok\' : \'unknown\'`，`nextStep` 还是一句元描述（「…只记为 unknown」）而不是动作。更上游的 `runCommand` 只看 `result.error`，**进程退出码非 0 也照样返回 `status:\'ok\'`**，报错时的 stdout 会被当成有效证据。真跑本机 `codex mcp list` 拿到的是定宽表格 `Name / ... / Status / Auth`，Env 列的值里带空格、列号不固定，不能按固定位置切列。现在：`runCommand` 新增 `exit-error`（带 `code` 与 stderr 摘要）；`inspectCodexCli()` 用第一列 token 认名字、行尾 3 个 token 认 `enabled` / `disabled`，给出 `registered` / `not-registered` / `disabled` / `unparseable` / `unavailable`；表头认不出、输出为空、状态值认不出、路径里出现 `enabled` 字样都**不下结论**。`codexCliPresentation()` 按根因给动作，五种命令层失败（`skipped` / `not-found` / `timeout` / `error` / `exit-error`）的指引互不重复，测试逐项比对。**口径**：命令层面的问题一律 `unknown`（拿不到证据），只有输出里观察到的事实才判 `ok` / `blocked`。真机复核：真实 `codex mcp list` 解析为 `registered / enabled / 共 4 行`，`doctor` 报 `ok` 且明说「只证明 CLI 列出了它」；另用注入 PATH 的假 `codex` 子进程跑通 5 种场景（已注册 / 没注册 / disabled / 输出认不出 / 退出码 3），17 项检查与退出码 0 不变。',
    '',
    `**\`verify-local\` 的超时口径**：默认外层等 ${DEFAULT_VERIFY_TIMEOUT_MS}ms，上游 \`openbot-workbuddy-connector/connector.cjs\` 每次桥调用自带 ${CONNECTOR_CALL_TIMEOUT_MS}ms 超时，超时后才返回 \`OPENBOT_BRIDGE_TIMEOUT\`。外层必须比上游长，否则默认运行只会拿到「外层 timeout」而看不到真实错误码（上一轮真机外层 12s、靠手动 \`--timeout-ms 30000\` 才看到）。三个 \`tools/call\` 是并发发出的，所以 ${DEFAULT_VERIFY_TIMEOUT_MS}ms = ${CONNECTOR_CALL_TIMEOUT_MS}ms + ${DEFAULT_VERIFY_TIMEOUT_MS - CONNECTOR_CALL_TIMEOUT_MS}ms 余量，不是 3 倍。报告里的 \`timeout\` 带 \`outerMs / connectorCallMs / defaultOuterMs / outerCanObserveConnectorCode\`；手动把 \`--timeout-ms\` 调到 ${CONNECTOR_CALL_TIMEOUT_MS}ms 或更短，最后一项会是 \`false\`。外层超时但已有工具带着上游错误码回来时，\`blockingReason\` 解释那个错误码，而不是「没等齐」这个外层现象。`,
    '',
    '## 尚未适配 / 不能自动生成配置',
    '',
    table(['id', '对象', '原因'], plannedTargets.map((item) => [item.id, item.label, item.reason])),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function renderMarketplace() {
  const lines = [
    '# 市场上架路径与阻塞项',
    '',
    `> 由 \`src/policies.mjs\` 生成，登记日期 ${DOCUMENTED_AT}。当前所有平台的 \`status\` 都不是 \`published\`。`,
    '',
    '**本地模式跑通 ≠ 上架市场。** 公开市场普遍要求：公网 HTTPS 常驻 MCP Server、认证与最小权限、主体认证、包结构与元数据、审核与版本迭代。',
    '`available` 表示存在市场路径；`submissionSpec` 区分公开提交规范、企业/组织内提交与内测邀请制，三者不能混用。',
    '',
  ];
  for (const platform of platforms) {
    const market = platform.marketplace;
    const spec = PLATFORM_SUBMISSION_SPEC[platform.id];
    lines.push(`## ${platform.label}（${platform.id}）`, '');
    lines.push(`- 市场：${market.name}`);
    lines.push(`- 入口：${market.url}`);
    lines.push(`- 该类目规范：${spec === 'none' ? '**未找到**（available=false，不做可以上架的断言）' : SUBMISSION_SPEC[spec]}`);
    lines.push(`- 当前状态：\`${market.status}\``);
    lines.push('', '### 需满足', '');
    for (const item of market.requirements) lines.push(`- ${item}`);
    lines.push('', '### 阻塞项', '');
    for (const item of market.blockers) lines.push(`- ${item}`);
    lines.push('', '### 依据', '');
    lines.push(table(['文档', '类别', '来源', '证据', '要点'], docRows(market.docs)), '');
  }
  lines.push('## 共通的硬缺口', '');
  lines.push('- OpenBot 目前只有 `127.0.0.1:4818` 的桌面内发布端点，退出 App 即停服；没有公网常驻 HTTPS MCP Server，也没有 OAuth / 多用户隔离 / 凭据轮换。');
  lines.push('- 现有 MCP 是异步 job 语义（`dispatch` → `task` → `result`），要进公开目录还需按各平台的工具命名、注解、输出 schema 规范改造。');
  lines.push('- 目录元数据、图标、Skill、测试指南、隐私政策、国家/地区设置都还没准备；协议条款里标为「索引摘要」的部分需后台全文复核。');
  lines.push('- 主体认证口径有差异：WorkBuddy 开放平台列有企业 / 其他组织 / 个人认证，个人开发者可入驻并开发管理连接器，但公开发布权限以后台为准；千问办公当前不开放个人向公共市场上传，但企业/组织内有完整提交与审核规范；豆包开放平台在内测邀请制，接入规范需登录后可见；ZCode 官方市场没有主体认证门槛，走 GitHub PR + 维护者人工审核，但要求披露副作用与许可证来源。');
  lines.push('- 商业化约束：Cursor 发布者条款 3.1 要求市场插件免费、6.3 禁止用插件数据训练模型；Anthropic Directory Policy 禁止采集无关对话数据。这些不是技术检查项，需先确定产品与数据口径。');
  lines.push('- 逐平台的可执行提交步骤与前置检查见 `marketplace/SUBMIT-STEPS.md`；`node src/cli.mjs market-preflight` 可复核当前缺什么。');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

export function renderDocs() {
  const problems = validateRegistry();
  if (problems.length) throw new Error(`政策注册表自检失败：${problems.join('; ')}`);
  return {
    'POLICIES.md': renderPolicies(),
    'LOCAL-MODES.md': renderLocalModes(),
    'MARKETPLACE.md': renderMarketplace(),
  };
}
