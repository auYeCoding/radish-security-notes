import type { RemoveCustomEntryTypeInput } from "@shared/entries/custom-types/custom-entry-type-edit-types";
import {
  RELOCATION_TARGET_TYPE_KEY,
  relocateEntryValues,
} from "@shared/entries/custom-types/custom-entry-type-relocation";
import {
  customEntryTypeFailed,
  customEntryTypeSucceeded,
  type CustomEntryTypeResult,
} from "@shared/entries/custom-types/custom-entry-type-result";

import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { toCustomEntryType } from "./custom-entry-type-mapper";
import { deleteCustomEntryType } from "./custom-entry-type-edit-repository";
import { listCustomEntryTypeRows } from "./custom-entry-type-repository";
import { listEntriesOfType, relocateEntry } from "./type-entry-repository";

/**
 * 删除自定义类型用到的依赖.
 */
export interface RemoveCustomEntryTypeDependencies {
  /**
   * 生成转成自定义字段时用的唯一编号.
   */
  readonly createIdentifier: () => string;
}

/**
 * 删除一个自定义类型: 类型下有条目而用户没有确认时拒绝; 通过后在同一个事务里把每个条目改归安全
 * 笔记, 类型字段里有值的取值转成条目的自定义字段, 再删除类型行与字段行, 任何一步失败整体回滚,
 * 不留下半成功的状态. 条目的名称, 备注, 附件, TOTP, 文件夹与标签都不动. 数据库开着
 * `secure_delete`, 被改写与被删除的内容不会作为可读残留留在文件里.
 * @param orm 已解锁数据库的查询入口.
 * @param dependencies 删除用到的依赖.
 * @param input 用户提交的删除.
 * @returns 删除结果, 没有这个类型或类型下有条目而未确认时为失败结果.
 */
export function removeCustomEntryType(
  orm: VaultOrm,
  dependencies: RemoveCustomEntryTypeDependencies,
  input: RemoveCustomEntryTypeInput,
): CustomEntryTypeResult<undefined> {
  const currentRows = listCustomEntryTypeRows(orm).find(
    (rows) => rows.type.id === input.id,
  );
  if (currentRows === undefined) {
    return customEntryTypeFailed("not-found");
  }
  const current = toCustomEntryType(currentRows);
  const typeEntries = listEntriesOfType(orm, current.key);
  if (typeEntries.length > 0 && !input.isImpactConfirmed) {
    return customEntryTypeFailed("confirmation-required");
  }
  orm.transaction((transaction) => {
    typeEntries.forEach((entry) => {
      const relocated = relocateEntryValues({
        type: current,
        stored: entry.fields,
        customFields: entry.customFields,
        createIdentifier: dependencies.createIdentifier,
      });
      relocateEntry(transaction, entry.id, {
        type: RELOCATION_TARGET_TYPE_KEY,
        ...relocated,
      });
    });
    deleteCustomEntryType(transaction, current.id);
  });
  return customEntryTypeSucceeded(undefined);
}
