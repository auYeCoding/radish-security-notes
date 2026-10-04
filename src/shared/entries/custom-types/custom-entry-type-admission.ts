import { CUSTOM_ENTRY_TYPE_MAX_COUNT } from "./custom-entry-type-limits";
import { isCustomTypeNameTaken } from "./custom-entry-type-name-check";
import {
  customEntryTypeFailed,
  customEntryTypeSucceeded,
  type CustomEntryTypeResult,
} from "./custom-entry-type-result";
import {
  createCustomEntryTypeSchema,
  type CustomEntryTypeFormValues,
} from "./custom-entry-type-schema";
import type { NewCustomEntryTypeInput } from "./custom-entry-type-types";

/**
 * 新建自定义类型的准入检查, 主进程的类型服务与渲染端测试用的假桥共用, 判定顺序固定: 先按共享的
 * 校验方案校验内容, 再看自定义类型个数是否已达上限, 最后看名称是否与预设类型或已有自定义类型同名.
 * @param input 用户填写的新建输入.
 * @param existingNames 已有自定义类型的名称, 个数就是已有自定义类型的个数.
 * @returns 校验后的输入 (名称与字段名已去首尾空格), 或内容不合规, 个数已达上限, 重名的失败结果.
 */
export function admitNewCustomEntryType(
  input: NewCustomEntryTypeInput,
  existingNames: readonly string[],
): CustomEntryTypeResult<CustomEntryTypeFormValues> {
  const parsed = createCustomEntryTypeSchema().safeParse(input);
  if (!parsed.success) {
    return customEntryTypeFailed("invalid-input");
  }
  if (existingNames.length >= CUSTOM_ENTRY_TYPE_MAX_COUNT) {
    return customEntryTypeFailed("limit-reached");
  }
  if (isCustomTypeNameTaken(parsed.data.name, existingNames)) {
    return customEntryTypeFailed("name-taken");
  }
  return customEntryTypeSucceeded(parsed.data);
}
