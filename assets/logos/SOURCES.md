# Logo 素材来源与许可

本目录的图标仅用于 README 中**标识平台兼容性**；各平台名称与商标归各自权利人所有。权利人认为使用不妥时，提 Issue 即可移除。

| 文件 | 平台 | 来源（下载于 2026-11-11） | 许可 |
| --- | --- | --- | --- |
| `workbuddy.png` | WorkBuddy（腾讯） | `open.workbuddy.cn` 页面 HTML 声明的官方 CDN 图片（openplatform-cdn.codebuddy.cn） | 平台商标，权利人保留所有权利 |
| `qwenwork.png` | 千问办公 QwenWork（阿里） | `qwenwork.cn` 页面 HTML 声明的阿里 CDN 图标（img.alicdn.com，48px） | 平台商标，权利人保留所有权利 |
| `doubao.png` | 豆包工作（字节跳动） | `doubao.com` 页面 HTML 声明的官方 CDN 图标（lf-flow-web-cdn.doubao.com，192px） | 平台商标，权利人保留所有权利 |
| `zcode.png` | ZCode（Z.ai） | `zcode.z.ai` 官方 favicon（192px） | 平台商标，权利人保留所有权利 |
| `openai.svg` / `openai-white.svg` | OpenAI | [Simple Icons](https://simpleicons.org/) slug `openai`（jsdelivr `simple-icons@13`） | 图标 [CC0](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md)；商标归 OpenAI |
| `cursor.svg` / `cursor-white.svg` | Cursor（Anysphere） | [Simple Icons](https://simpleicons.org/) slug `cursor`（cdn.simpleicons.org） | 同上；商标归 Anysphere |
| `anthropic.svg` / `anthropic-white.svg` | Anthropic | [Simple Icons](https://simpleicons.org/) slug `anthropic`（jsdelivr `simple-icons@13`） | 同上；商标归 Anthropic |
| `claude.svg` | Claude（Anthropic） | [Simple Icons](https://simpleicons.org/) slug `claude`（cdn.simpleicons.org） | 同上 |
| `qwen.svg` | Qwen（备选，未用于 README logo 墙） | [Simple Icons](https://simpleicons.org/) slug `qwen` | 同上 |

`*-white.svg` 是对应单色图标的白色填充变体（`fill="#FFFFFF"`），供 GitHub 深色主题经 `<picture>` 与 banner 合成使用。注意：由 CDN 原件派生白色变体时会引入**重复 fill 属性**（XML 非法、浏览器拒载），生成脚本必须先去掉原 fill 再注入。`../banner.png` 由 `../banner.html`（合成源文件）经 Chrome 无头渲染导出（800×300 @2x），其中内嵌了上表所列各平台真实 logo 芯片——banner 里的第三方 logo 同样只用于标识兼容性，权利与上表一致。
`../logo.svg` 与 `../banner.svg` 为本项目原创，随仓库分发。
