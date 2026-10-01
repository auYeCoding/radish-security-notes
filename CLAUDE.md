# CLAUDE.md

工程规范 (架构, 注释, 选型, 格式化, 提交) 的唯一来源是 `.claude/rules/engineering.md`, 本文件只补充前端骨架规范.

## 前端骨架规范

前端根是 `src/renderer/src`. 路径, 分区, 别名与 token 分层文件的单一事实源是 `.claude/frontend-skeleton.json`, 方案与选型见 `docs/前端骨架方案.md`. 写前端文件前先读这两处.

### 分区与依赖方向

```text
main.tsx -> app -> features/<name> -> components, lib, stores, i18n, theme -> src/shared
```

- `app/` 装配: 根组件, 启动流程, 三栏布局.
- `features/<name>/` 按领域切分, 每个自包含, 互不引用.
- `components/` 跨 feature 复用的 UI, `components/ui/` 只放 Shadcn MCP 引入的组件.
- `lib/` 第三方适配层, `stores/` zustand 状态, `i18n/` 语言同步, `theme/` 主题同步, `styles/` token 与主题样式.
- `testing/` 组件测试支撑 (偏好环境, 启动文件), 只允许测试文件引用.
- 前端代码不能引用 `src/main` 与 `src/preload`, 只能经 preload 暴露的桥访问原生能力.

### 硬约束

由 ESLint 与 Stylelint 执行, 违反即报错, 不加忽略标记, 不放宽规则:

- 依赖方向单向, feature 之间不互相引用 (`boundaries/dependencies`).
- 禁裸原生 `<button>`, `<input>`, `<select>`, `<textarea>`, `<a>`, 用 `components/` 下的封装 (`components/ui` 除外).
- 禁类名任意值 (如 `bg-[#fff]`, `p-[13px]`) 与行内 `style` (`components/ui` 除外), 样式只取自设计 token.
- 脚本不能直接引用 `tokens.primitives.css`, 只能引用语义层与组件层.
- CSS 里原始颜色与尺寸字面量只能出现在 `tokens.primitives.css`, 其它文件用 `var()` 引用 token (`npm run lint:css`).
- 无障碍基线: `eslint-plugin-jsx-a11y` 的 recommended 规则.
- 代码检查命令: `npx eslint .` 与 `npm run lint:css`.

### 软约束

lint 判定不了, 靠自觉遵守 (`.claude/frontend-rules.md` 由钩子在写文件时注入):

- 复用优先: 库里有现成组件就用库, 不够再用 `components/` 已封装的, 不要另起.
- 禁手搓与库等价的复合控件 (Dialog, Dropdown, Tooltip, Modal 等).
- 同类 UI 出现第 2 次就抽象成可复用组件, 不复制粘贴.
- 组件先于页面: 页面只从 `components/` 取组件, 不现搓基元.
- 文案走 i18n, 不硬编码用户可见文案.
- 切换类控件 (主题, 语言) 的按钮内容不随界面语言变化 (图标, 语言自称), 名称放无障碍标签与悬停提示, 切换语言时宽度不变; 其它文字容器不写死宽度.
- 可点击元素的鼠标指针是手型, 基础样式 (`globals.css`) 已补回, 不要再改.

### Shadcn 组件

- 组件只经项目级 Shadcn MCP (`.mcp.json`) 引入: 用 `search_items_in_registries`, `view_items_in_registries`, `get_add_command_for_items` 找到并取得命令, 再运行命令, 不手写拷贝组件源码.
- 引入后按 `engineering.md` 就地改造: prettier 格式化, 补完整 TSDoc 与显式返回类型, 删未使用的导入, 组件文件只导出组件 (变体表另放同目录文件).
- 图标库固定为 lucide (`components.json` 的 `iconLibrary`), 类名合并统一从 `@renderer/lib/class-names` 引入 `cn`.
