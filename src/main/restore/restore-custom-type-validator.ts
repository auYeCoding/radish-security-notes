import { CUSTOM_ENTRY_TYPE_MAX_COUNT } from "@shared/entries/custom-types/custom-entry-type-limits";
import {
  CUSTOM_SUMMARY_FIELD_KEY,
  isCustomFieldKey,
  toCustomTypeKey,
} from "@shared/entries/custom-types/custom-entry-type-key";
import { createCustomEntryTypeSchema } from "@shared/entries/custom-types/custom-entry-type-schema";
import {
  restoreProblem,
  type RestoreProblem,
} from "@shared/restore/restore-problem";

import type { NativeCustomTypeDocument } from "../export/serializers/native/native-format-types";
import { findDuplicatePosition } from "./restore-duplicate-finder";
import { checkNamedItems } from "./restore-named-items-check";

/**
 * 判断一个字段键是否合规: 摘要字段的键, 或 `field-` 加编号.
 * @param key 字段键.
 * @returns 合规时为 true.
 */
function isFieldKeyValid(key: string): boolean {
  return key === CUSTOM_SUMMARY_FIELD_KEY || isCustomFieldKey(key);
}

/**
 * 判断自定义类型的名称与字段是否合规且已是规范形式: 交给新建自定义类型用的同一个校验方案, 校验
 * 通过后名称与字段名不被修剪改动, 这样写进库的就是备份里的原值.
 * @param type 自定义类型.
 * @returns 合规时为 true.
 */
function isDefinitionValid(type: NativeCustomTypeDocument): boolean {
  const parsed = createCustomEntryTypeSchema().safeParse({
    name: type.name,
    fields: type.fields.map((field) => ({
      key: field.key,
      name: field.name,
      kind: field.kind,
      isSensitive: field.isSensitive,
      isSummary: field.key === CUSTOM_SUMMARY_FIELD_KEY,
    })),
  });
  return (
    parsed.success &&
    parsed.data.name === type.name &&
    parsed.data.fields.every(
      (field, index) => field.name === type.fields[index]?.name,
    )
  );
}

/**
 * 找出第一个字段键不合规或重复的自定义类型所在的序号.
 * @param types 备份里的自定义类型.
 * @returns 序号 (从 1 起), 都合规时为 undefined.
 */
function findBadFieldKeyPosition(
  types: readonly NativeCustomTypeDocument[],
): number | undefined {
  const index = types.findIndex(
    (type) =>
      !type.fields.every((field) => isFieldKeyValid(field.key)) ||
      findDuplicatePosition(type.fields.map((field) => field.key)) !==
        undefined,
  );
  return index >= 0 ? index + 1 : undefined;
}

/**
 * 校验自定义类型: 个数不超过上限, 编号与名称互不重复, 类型键等于 `custom:` 加编号, 字段键合规且
 * 互不重复, 名称与字段按新建自定义类型的同一个校验方案校验.
 * @param types 备份里的自定义类型.
 * @returns 第一个问题, 没有问题时为 undefined.
 */
export function validateCustomTypes(
  types: readonly NativeCustomTypeDocument[],
): RestoreProblem | undefined {
  if (types.length > CUSTOM_ENTRY_TYPE_MAX_COUNT) {
    return restoreProblem(
      "customTypes",
      "invalid-value",
      CUSTOM_ENTRY_TYPE_MAX_COUNT + 1,
    );
  }
  const named = checkNamedItems("customTypes", types, isDefinitionValid);
  if (named !== undefined) {
    return named;
  }
  const keyIndex = types.findIndex(
    (type) => type.key !== toCustomTypeKey(type.id),
  );
  if (keyIndex >= 0) {
    return restoreProblem("customTypes", "invalid-value", keyIndex + 1);
  }
  const badFieldKey = findBadFieldKeyPosition(types);
  return badFieldKey === undefined
    ? undefined
    : restoreProblem("customTypes", "invalid-value", badFieldKey);
}
