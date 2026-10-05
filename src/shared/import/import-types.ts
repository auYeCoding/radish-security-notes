import type { NotImportedItem } from "./import-reasons";
import type { ImportSourceKey } from "./import-source-keys";

/**
 * 判成重复的条目的处理方式: 跳过不导入, 或仍然导入.
 */
export type ImportDuplicatePolicy = "skip" | "import";

/**
 * 预览里重复处理的默认选择.
 */
export const DEFAULT_DUPLICATE_POLICY: ImportDuplicatePolicy = "skip";

/**
 * 判断一个值是否是重复条目的处理方式.
 * @param value 待判断的值.
 * @returns 是处理方式时返回 true.
 */
export function isImportDuplicatePolicy(
  value: unknown,
): value is ImportDuplicatePolicy {
  return value === "skip" || value === "import";
}

/**
 * 确认导入时用户给出的选项.
 */
export interface ImportRunOptions {
  /**
   * 重复条目的处理方式.
   */
  readonly duplicatePolicy: ImportDuplicatePolicy;
}

/**
 * 预览里一种条目类型的条目个数.
 */
export interface ImportTypeCount {
  /**
   * 条目的类型键.
   */
  readonly typeKey: string;
  /**
   * 这种类型的可导入条目个数.
   */
  readonly count: number;
}

/**
 * 解析来源文件之后给渲染端看的概要. 只含计数与分布, 不含任何条目的内容.
 */
export interface ImportPreview {
  /**
   * 来源文件的格式.
   */
  readonly sourceKey: ImportSourceKey;
  /**
   * 来源文件里的条目总数.
   */
  readonly totalEntryCount: number;
  /**
   * 能导入的条目个数, 含判成重复的条目.
   */
  readonly importableEntryCount: number;
  /**
   * 整条跳过的条目个数: 类型不支持或校验不通过.
   */
  readonly skippedEntryCount: number;
  /**
   * 能导入的条目按类型的分布.
   */
  readonly typeCounts: readonly ImportTypeCount[];
  /**
   * 将新建的文件夹个数.
   */
  readonly newFolderCount: number;
  /**
   * 将新建的标签个数.
   */
  readonly newTagCount: number;
  /**
   * 与库里已有条目判成重复的条目个数.
   */
  readonly duplicateCount: number;
  /**
   * 将列入未能带入清单的项数.
   */
  readonly notImportedCount: number;
}

/**
 * 用户取消了对话框的结果.
 */
export interface ImportCancelledOutcome {
  /**
   * 结果的状态, 取消时恒为 cancelled.
   */
  readonly status: "cancelled";
}

/**
 * 文件已解析并给出预览的结果.
 */
export interface ImportReadyOutcome {
  /**
   * 结果的状态, 已解析时恒为 ready.
   */
  readonly status: "ready";
  /**
   * 解析概要.
   */
  readonly preview: ImportPreview;
}

/**
 * 选择文件的结果: 用户取消了对话框, 或文件已解析并给出预览.
 */
export type ImportChooseOutcome = ImportCancelledOutcome | ImportReadyOutcome;

/**
 * 导入完成后的概况与未能带入清单.
 */
export interface ImportOutcome {
  /**
   * 写入库里的条目个数.
   */
  readonly importedCount: number;
  /**
   * 因判成重复而跳过的条目个数.
   */
  readonly skippedDuplicateCount: number;
  /**
   * 整条跳过的条目个数: 类型不支持或校验不通过.
   */
  readonly skippedEntryCount: number;
  /**
   * 新建的文件夹个数.
   */
  readonly createdFolderCount: number;
  /**
   * 新建的标签个数.
   */
  readonly createdTagCount: number;
  /**
   * 未能带入清单, 只含名称, 字段名称与原因代码.
   */
  readonly notImported: readonly NotImportedItem[];
}

/**
 * 未能带入清单已写出文件的结果.
 */
export interface ImportReportSavedOutcome {
  /**
   * 结果的状态, 已写出时恒为 saved.
   */
  readonly status: "saved";
}

/**
 * 保存未能带入清单的结果: 用户取消了保存对话框, 或已写出文件.
 */
export type ImportReportSaveOutcome =
  ImportCancelledOutcome | ImportReportSavedOutcome;

/**
 * 导入所处的阶段.
 */
export type ImportStage =
  "idle" | "reading" | "parsing" | "planning" | "writing";

/**
 * 导入进度的快照, 渲染端轮询它来显示进度.
 */
export interface ImportProgressSnapshot {
  /**
   * 当前阶段.
   */
  readonly stage: ImportStage;
  /**
   * 当前阶段已处理的个数.
   */
  readonly processed: number;
  /**
   * 当前阶段要处理的总数, 总数未知或阶段没有细分进度时为 0.
   */
  readonly total: number;
}
