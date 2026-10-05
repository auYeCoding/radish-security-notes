import type { NotImportedReason, NotImportedScope } from "./import-reasons";
import type { ImportFileKind } from "./import-source-keys";

/**
 * 导入的对话框标题, 清单文本里用到的文案键. 主进程取当前语言文案时只能用这些键, 渲染端显示
 * 原因代码用同一组 `import.reasons.<原因代码>` 键, 键对应的文案写在 `shared/locales` 里.
 */
export type ImportMessageKey =
  | "import.dialog.openTitle"
  | "import.dialog.saveTitle"
  | "import.dialog.reportFileName"
  | `import.dialog.filter.${ImportFileKind}`
  | "import.report.title"
  | "import.report.total"
  | "import.report.field"
  | "import.report.line"
  | `import.report.scope.${NotImportedScope}`
  | `import.reasons.${NotImportedReason}`;
