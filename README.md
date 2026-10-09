# radish-security-notes

[![CI](https://github.com/auYeCoding/radish-security-notes/actions/workflows/ci.yml/badge.svg)](https://github.com/auYeCoding/radish-security-notes/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

本地加密的桌面密码与笔记保险库, 数据只保存在你自己的电脑上, 没有服务器, 没有账号, 日常使用不需要联网. 界面支持简体中文与 English, 浅色, 深色与跟随系统.

> 目前只在 Windows 上打包并验证过. 构建脚本里的 macOS 与 Linux 目标来自项目模板, 没有验证过.

## 功能

**保险库与安全**

- 整个数据库用 SQLCipher 4 加密, 加密密钥是随机生成的 256 位数据密钥.
- 数据密钥由主密码 (Argon2id 派生) 保护; 也可以不设主密码, 改由系统保护 (Electron `safeStorage`).
- 首次设置完成后给出 24 个恢复词 (BIP39), 忘记主密码或密钥文件丢失时凭它找回数据. 详见 [恢复密钥](docs/恢复密钥.md).
- 自动锁定: 空闲一段时间, 锁屏, 系统休眠时锁定保险库.
- 内容保护: 截屏, 录屏, 屏幕共享软件看不到本窗口.

**条目**

- 12 种预设类型: 通用登录, 论坛账号, 数据库, 服务器, 银行卡, 加密钱包, 接口密钥, 软件许可证, 安全笔记, 无线网络凭据, SSH 密钥, 身份信息. 也可以自定义类型与字段.
- 备注支持纯文本与 Markdown, 可以带 TOTP 验证码与附件 (图片可预览).
- 文件夹 (拖拽归类), 标签, 搜索 (名称, 账号, 备注, 网址, 自定义字段与标签名), 批量移动, 加标签, 摘标签与删除.

**导入, 导出与备份**

- 导入: Bitwarden (JSON 与 CSV), 浏览器密码 (CSV), KeePassXC (CSV).
- 导出: 本应用完整格式 (ZIP), Bitwarden (JSON), 浏览器密码 (CSV); 可选口令加密.
- 邮箱备份: 把全部数据发到你自己的邮箱, 支持 QQ 邮箱, 163 邮箱, Gmail, Outlook 与自定义 SMTP, 可以设置自动备份.
- 从备份恢复: 选择备份文件, 预览并确认后恢复.

## 安装

在 [Releases](https://github.com/auYeCoding/radish-security-notes/releases) 页面下载最新的 `radish-security-notes-<版本>-setup.exe`, 运行后按向导安装, 可以选择安装路径.

安装包目前没有代码签名, 所以 Windows SmartScreen 会提示 "Windows 已保护你的电脑". 点 "更多信息", 再点 "仍要运行" 即可. 想确认下载没有被改动, 对照发布页写出的 SHA256:

```powershell
Get-FileHash .\radish-security-notes-<版本>-setup.exe -Algorithm SHA256
```

## 使用须知

- 数据在本机的 Electron 用户数据目录里 (Windows 上通常在 `%APPDATA%` 下), 卸载程序不会删除它. 换电脑或重装系统前, 先用导出或邮箱备份留一份.
- 忘记主密码, 又丢了 24 个恢复词, 数据无法找回, 没有后门.
- 恢复词等同于万能钥匙, 请离线保管, 不要存进保险库, 不要随邮箱备份发出. 目前版本无法更换恢复词.
- 邮箱备份把加密或未加密的备份文件发到你填写的邮箱, 授权码只保存在本机加密的保险库里. 未加密的备份包含全部密码, 建议开启口令加密.
- 这个项目没有经过第三方安全审计, 请根据自己的情况评估后使用.

## 开发

环境要求: Node.js 22.12 及以上 (开发环境是 Node 24).

```bash
npm install

# Electron 42 起, npm install 不再下载 Electron 二进制, 先下载一次
npx install-electron

npm run dev
```

常用命令:

| 命令                | 作用                                     |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | 启动开发环境                             |
| `npm run lint`      | ESLint 与 Stylelint                      |
| `npm run typecheck` | 主进程与渲染进程两个工程的类型检查       |
| `npm test`          | 运行全部测试 (Vitest)                    |
| `npm run build`     | 类型检查并构建                           |
| `npm run build:win` | 构建并打 Windows 安装包 (输出到 `dist/`) |
| `npm run format`    | 用 Prettier 格式化                       |

技术栈: Electron, React 19, TypeScript, Tailwind CSS 4, Base UI 与 shadcn, zustand, react-hook-form 与 zod, Drizzle ORM 与 better-sqlite3-multiple-ciphers, i18next, Vitest.

目录结构:

```text
src/main       主进程: 保险库, 数据库, 导入导出, 邮箱备份, 窗口与系统集成
src/preload    预加载脚本, 向渲染进程暴露受限的接口
src/renderer   渲染进程: 界面, 状态与交互
src/shared     主进程与渲染进程共用的类型, 规则与文案
docs           设计文档
```

设计文档:

- [恢复密钥](docs/恢复密钥.md): 恢复词的原理, 设置, 找回与安全须知.
- [设计语言](docs/设计语言.md): 界面的颜色, 对比度, 字体, 间距与动效.
- [前端骨架方案](docs/前端骨架方案.md): 前端的选型, 目录, token 结构, 主题与国际化.

## 许可证

[MIT](LICENSE)
