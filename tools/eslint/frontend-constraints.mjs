import jsxA11y from "eslint-plugin-jsx-a11y";

import { frontendBoundariesConfigs } from "./frontend-boundaries.mjs";
import { FRONTEND_SCRIPT_FILES } from "./frontend-manifest.mjs";
import { frontendRestrictionConfigs } from "./frontend-restrictions.mjs";

/**
 * 无障碍基线的 ESLint 配置: 前端根内的 JSX 套用 jsx-a11y 的 recommended 规则.
 * @type {import("eslint").Linter.Config}
 */
const frontendAccessibilityConfig = {
  ...jsxA11y.flatConfigs.recommended,
  files: FRONTEND_SCRIPT_FILES,
};

/**
 * 前端骨架的全部硬约束: 依赖边界, 限制规则与无障碍基线.
 * @type {import("eslint").Linter.Config[]}
 */
export const frontendConstraintConfigs = [
  ...frontendBoundariesConfigs,
  ...frontendRestrictionConfigs,
  frontendAccessibilityConfig,
];
