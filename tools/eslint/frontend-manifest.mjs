import manifest from "../../.claude/frontend-skeleton.json" with { type: "json" };

/**
 * 前端骨架的 manifest, 即前端路径, 分区与约束的单一事实源. 前端相关的 ESLint
 * 规则与 Stylelint 规则都从它派生, 不在别处写死路径.
 * @type {typeof manifest}
 */
export const frontendManifest = manifest;

/**
 * 前端根下全部脚本文件的匹配模式.
 * @type {readonly string[]}
 */
export const FRONTEND_SCRIPT_FILES = [`${manifest.frontendRoot}/**/*.{ts,tsx}`];

/**
 * UI 库封装层的匹配模式. 该目录里的组件由 Shadcn MCP 引入, 需要使用原生元素与
 * 任意值类名, 所以不受 "禁裸原生控件" 与 "禁任意值" 规则约束.
 * @type {readonly string[]}
 */
export const UI_LIBRARY_FILES = [`${manifest.zones.components}/ui/**`];
