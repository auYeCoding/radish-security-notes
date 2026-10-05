import type {
  EditedCustomEntryTypeFieldInput,
  UpdateCustomEntryTypeInput,
} from "@shared/entries/custom-types/custom-entry-type-edit-types";

import { findEntry, type EntryRecord } from "../entries/entry-repository";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import type { VaultService } from "../vault/vault-service";
import {
  ROUTER_NOTE_FIELD_KEY,
  ROUTER_SECRET_FIELD_KEY,
} from "./custom-type-entry-fixture";

/**
 * 默认自定义类型 (路由器) 的类型编号.
 */
export const ROUTER_TYPE_ID = "type-1";

/**
 * 默认自定义类型里摘要字段 "地址" 的字段键.
 */
export const ROUTER_SUMMARY_FIELD_KEY = "account";

/**
 * 构造默认自定义类型三个字段原样提交的修改字段: 地址 (摘要), 口令 (保密), 说明 (多行), 都带着字段键.
 * @returns 修改字段, 顺序与新建时一致.
 */
export function routerEditedFields(): EditedCustomEntryTypeFieldInput[] {
  return [
    {
      key: ROUTER_SUMMARY_FIELD_KEY,
      name: "地址",
      kind: "singleLine",
      isSensitive: false,
      isSummary: true,
    },
    {
      key: ROUTER_SECRET_FIELD_KEY,
      name: "口令",
      kind: "singleLine",
      isSensitive: true,
      isSummary: false,
    },
    {
      key: ROUTER_NOTE_FIELD_KEY,
      name: "说明",
      kind: "multiLine",
      isSensitive: false,
      isSummary: false,
    },
  ];
}

/**
 * 构造默认自定义类型的修改输入, 没有给出的部分是原样提交且没有确认影响.
 * @param overrides 要覆盖的部分.
 * @returns 修改输入.
 */
export function routerUpdateInputOf(
  overrides: Partial<UpdateCustomEntryTypeInput> = {},
): UpdateCustomEntryTypeInput {
  return {
    id: ROUTER_TYPE_ID,
    name: "路由器",
    fields: routerEditedFields(),
    isImpactConfirmed: false,
    ...overrides,
  };
}

/**
 * 取已解锁保险库的数据库查询入口.
 * @param vault 已解锁的保险库服务.
 * @returns 查询入口.
 * @throws Error 当保险库没有解锁时.
 */
export function requireOrm(vault: VaultService): VaultOrm {
  const orm = vault.getOrm();
  if (orm === undefined) {
    throw new Error("保险库应已解锁");
  }
  return orm;
}

/**
 * 直接从条目表读出一个条目的行, 用来核对库里实际保存的取值.
 * @param vault 已解锁的保险库服务.
 * @param id 条目编号.
 * @returns 条目行.
 * @throws Error 当没有这个条目时.
 */
export function storedEntryOf(vault: VaultService, id: string): EntryRecord {
  const record = findEntry(requireOrm(vault), id);
  if (record === undefined) {
    throw new Error(`条目 ${id} 应存在`);
  }
  return record;
}
