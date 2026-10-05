import {
  isImportSourceKey,
  type ImportSourceKey,
} from "@shared/import/import-source-keys";
import {
  isImportDuplicatePolicy,
  type ImportRunOptions,
} from "@shared/import/import-types";

/**
 * 导入参数不合规时的错误信息.
 */
const INVALID_IMPORT_ARGUMENT_MESSAGE = "无效的导入参数";

/**
 * 校验渲染进程传来的来源键是登记过的来源.
 * @param value 渲染进程传来的值.
 * @returns 校验通过的来源键.
 * @throws Error 当参数不是登记过的来源键时.
 */
export function requireImportSourceKey(value: unknown): ImportSourceKey {
  if (!isImportSourceKey(value)) {
    throw new Error(INVALID_IMPORT_ARGUMENT_MESSAGE);
  }
  return value;
}

/**
 * 校验渲染进程传来的确认选项: 是对象, 重复条目的处理方式是登记过的取值. 多余的键被丢弃.
 * @param value 渲染进程传来的值.
 * @returns 校验通过的选项.
 * @throws Error 当参数不是对象或处理方式不合规时.
 */
export function requireImportRunOptions(value: unknown): ImportRunOptions {
  if (
    typeof value !== "object" ||
    value === null ||
    !("duplicatePolicy" in value) ||
    !isImportDuplicatePolicy(value.duplicatePolicy)
  ) {
    throw new Error(INVALID_IMPORT_ARGUMENT_MESSAGE);
  }
  return { duplicatePolicy: value.duplicatePolicy };
}
