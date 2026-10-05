import type {
  RemoveCustomEntryTypeInput,
  UpdateCustomEntryTypeInput,
} from "@shared/entries/custom-types/custom-entry-type-edit-types";
import {
  customEntryTypeFailed,
  type CustomEntryTypeResult,
} from "@shared/entries/custom-types/custom-entry-type-result";
import type { CustomEntryType } from "@shared/entries/custom-types/custom-entry-type-types";

import type { EntryTypeStoreAccess } from "./entry-type-store-actions";

/**
 * 修改一个自定义类型, 成功后列表里的这个类型换成修改后的, 位置不变.
 * @param access store 动作能用到的东西.
 * @param input 要修改的类型编号, 修改后的名称与字段, 以及用户是否已确认影响.
 * @returns 修改结果, 接口调用抛出错误时为意外错误.
 */
export async function updateCustomType(
  access: EntryTypeStoreAccess,
  input: UpdateCustomEntryTypeInput,
): Promise<CustomEntryTypeResult<CustomEntryType>> {
  const { bridge, set, get } = access;
  try {
    const result = await bridge.update(input);
    if (result.ok) {
      set({
        customTypes: get().customTypes.map((type) =>
          type.id === result.value.id ? result.value : type,
        ),
      });
    }
    return result;
  } catch {
    return customEntryTypeFailed("unexpected-error");
  }
}

/**
 * 删除一个自定义类型, 成功后它从列表里移除.
 * @param access store 动作能用到的东西.
 * @param input 要删除的类型编号, 以及用户是否已确认影响.
 * @returns 删除结果, 接口调用抛出错误时为意外错误.
 */
export async function removeCustomType(
  access: EntryTypeStoreAccess,
  input: RemoveCustomEntryTypeInput,
): Promise<CustomEntryTypeResult<undefined>> {
  const { bridge, set, get } = access;
  try {
    const result = await bridge.remove(input);
    if (result.ok) {
      set({
        customTypes: get().customTypes.filter((type) => type.id !== input.id),
      });
    }
    return result;
  } catch {
    return customEntryTypeFailed("unexpected-error");
  }
}
