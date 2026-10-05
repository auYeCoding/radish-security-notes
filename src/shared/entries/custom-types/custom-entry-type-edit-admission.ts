import { isCustomTypeNameTaken } from "./custom-entry-type-name-check";
import type { UpdateCustomEntryTypeInput } from "./custom-entry-type-edit-types";
import {
  customEntryTypeFailed,
  customEntryTypeSucceeded,
  type CustomEntryTypeResult,
} from "./custom-entry-type-result";
import {
  createCustomEntryTypeSchema,
  type CustomEntryTypeFormValues,
} from "./custom-entry-type-schema";
import type { CustomEntryType } from "./custom-entry-type-types";

/**
 * 判断提交字段带的字段键都属于该类型已有的字段且没有重复.
 * @param current 修改前已保存的类型.
 * @param values 经校验方案校验后的取值.
 * @returns 字段键都合法时返回 true.
 */
function areSubmittedKeysValid(
  current: CustomEntryType,
  values: CustomEntryTypeFormValues,
): boolean {
  const knownKeys = new Set(current.fields.map((field) => field.key));
  const submittedKeys = values.fields.flatMap((field) =>
    field.key === undefined ? [] : [field.key],
  );
  return (
    submittedKeys.every((key) => knownKeys.has(key)) &&
    new Set(submittedKeys).size === submittedKeys.length
  );
}

/**
 * 修改自定义类型的准入检查, 主进程的类型服务与渲染端测试用的假桥共用, 判定顺序固定: 先按共享的
 * 校验方案校验内容, 再看提交的字段键是否都属于该类型且不重复, 最后看名称是否与预设类型或其它
 * 自定义类型同名. 类型自己原来的名称不算重名, 类型个数不变所以不查个数上限.
 * @param current 修改前已保存的类型.
 * @param input 用户提交的修改.
 * @param otherNames 其它自定义类型的名称, 不含这个类型自己的.
 * @returns 校验后的取值 (名称与字段名已去首尾空格), 或内容不合规, 重名的失败结果.
 */
export function admitCustomEntryTypeUpdate(
  current: CustomEntryType,
  input: UpdateCustomEntryTypeInput,
  otherNames: readonly string[],
): CustomEntryTypeResult<CustomEntryTypeFormValues> {
  const parsed = createCustomEntryTypeSchema().safeParse({
    name: input.name,
    fields: input.fields,
  });
  if (!parsed.success || !areSubmittedKeysValid(current, parsed.data)) {
    return customEntryTypeFailed("invalid-input");
  }
  if (isCustomTypeNameTaken(parsed.data.name, otherNames)) {
    return customEntryTypeFailed("name-taken");
  }
  return customEntryTypeSucceeded(parsed.data);
}
