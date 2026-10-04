import { ENTRY_ACCOUNT_MAX_LENGTH } from "@shared/entries/common-entry-fields";
import type { NewEntryInput } from "@shared/entries/entry-types";

import type { EntryService } from "../entries/entry-service";
import type { CustomEntryTypeService } from "../entry-types/custom-entry-type-service";
import type { VaultService } from "../vault/vault-service";
import {
  createCustomEntryTypeFixture,
  newCustomTypeInputOf,
} from "./custom-entry-type-fixture";
import {
  createEntryServiceFixture,
  newEntryInputOf,
  type EntryServiceFixture,
} from "./entry-service-fixture";
import {
  startService,
  type VaultServiceHarness,
} from "./vault-service-harness";
import { TEST_MASTER_PASSWORD } from "./vault-test-fixtures";

/**
 * 默认自定义类型 (路由器) 的类型键.
 */
export const ROUTER_TYPE_KEY = "custom:type-1";

/**
 * 默认自定义类型里保密字段 "口令" 的字段键.
 */
export const ROUTER_SECRET_FIELD_KEY = "field-type-2";

/**
 * 默认自定义类型里多行字段 "说明" 的字段键.
 */
export const ROUTER_NOTE_FIELD_KEY = "field-type-3";

/**
 * 用来标记保密字段值的小写文本, 不得出现在列表, 搜索结果与日志里.
 */
export const ROUTER_SECRET_VALUE = "canary-router-secret";

/**
 * 同一个已解锁保险库上的自定义类型服务与条目服务.
 */
export interface CustomTypeEntryFixture {
  /**
   * 自定义类型服务, 编号依次为 type-1, type-2.
   */
  readonly customTypes: CustomEntryTypeService;
  /**
   * 条目服务, 编号依次为 id-1, id-2.
   */
  readonly entries: EntryService;
  /**
   * 两个服务共用的保险库服务.
   */
  readonly vault: VaultService;
  /**
   * 假剪贴板写入方法的间谍.
   */
  readonly writeText: EntryServiceFixture["writeText"];
  /**
   * 条目服务通过失败回调报告过的错误.
   */
  readonly entryFailures: unknown[];
}

/**
 * 在已解锁的保险库上创建两个服务, 并已用 `newCustomTypeInputOf()` 新建了默认自定义类型 "路由器".
 * @param harness 保险库服务测试环境.
 * @returns 两个服务与保险库服务.
 */
export async function createRouterTypeFixture(
  harness: VaultServiceHarness,
): Promise<CustomTypeEntryFixture> {
  const vault = await startService(harness);
  await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
  return createRouterTypeFixtureOn(vault);
}

/**
 * 在已解锁的保险库上创建两个服务, 并新建默认自定义类型 "路由器".
 * @param vault 已解锁的保险库服务.
 * @returns 两个服务与保险库服务.
 */
export function createRouterTypeFixtureOn(
  vault: VaultService,
): CustomTypeEntryFixture {
  const { customTypes } = createCustomEntryTypeFixture(vault);
  const { entries, writeText, failures } = createEntryServiceFixture(vault);
  customTypes.create(newCustomTypeInputOf());
  return { customTypes, entries, vault, writeText, entryFailures: failures };
}

/**
 * 构造默认自定义类型的新建条目输入: 摘要字段, 保密字段与多行字段都有值.
 * @param overrides 要覆盖的字段.
 * @returns 新建输入.
 */
export function routerEntryInputOf(
  overrides: Partial<NewEntryInput> = {},
): NewEntryInput {
  return newEntryInputOf({
    type: ROUTER_TYPE_KEY,
    name: "家里路由器",
    fields: {
      account: "192.168.1.1",
      [ROUTER_SECRET_FIELD_KEY]: ROUTER_SECRET_VALUE,
      [ROUTER_NOTE_FIELD_KEY]: "机房左侧\n第二行",
    },
    ...overrides,
  });
}

/**
 * 摘要字段值的字符数刚好超过上限的文本.
 */
export const OVERLONG_SUMMARY_VALUE = "a".repeat(ENTRY_ACCOUNT_MAX_LENGTH + 1);
