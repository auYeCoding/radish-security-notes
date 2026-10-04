import type { NewCustomEntryTypeInput } from "@shared/entries/custom-types/custom-entry-type-types";

import { CustomEntryTypeService } from "../entry-types/custom-entry-type-service";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import type { VaultService } from "../vault/vault-service";
import {
  startService,
  type VaultServiceHarness,
} from "./vault-service-harness";
import { TEST_MASTER_PASSWORD } from "./vault-test-fixtures";

/**
 * 测试里的一次自定义类型服务环境.
 */
export interface CustomEntryTypeFixture {
  /**
   * 被测的自定义类型服务.
   */
  readonly customTypes: CustomEntryTypeService;
  /**
   * 服务通过失败回调报告过的错误.
   */
  readonly failures: unknown[];
}

/**
 * 创建自定义类型服务环境需要的覆盖项.
 */
export interface CustomEntryTypeFixtureOptions {
  /**
   * 覆盖取数据库的方法, 默认取保险库服务的数据库.
   */
  readonly getOrm?: () => VaultOrm | undefined;
  /**
   * 覆盖生成唯一编号的方法, 默认编号依次为 type-1, type-2.
   */
  readonly createIdentifier?: () => string;
}

/**
 * 在保险库服务之上创建自定义类型服务, 默认编号依次为 type-1, type-2, 时间依次递增.
 * @param vault 保险库服务.
 * @param options 覆盖项.
 * @returns 自定义类型服务环境.
 */
export function createCustomEntryTypeFixture(
  vault: VaultService,
  options: CustomEntryTypeFixtureOptions = {},
): CustomEntryTypeFixture {
  const failures: unknown[] = [];
  let counter = 0;
  const customTypes = new CustomEntryTypeService({
    getOrm: options.getOrm ?? (() => vault.getOrm()),
    createIdentifier:
      options.createIdentifier ?? (() => `type-${(counter += 1)}`),
    now: () => 3000 + counter,
    onFailure: (error) => failures.push(error),
  });
  return { customTypes, failures };
}

/**
 * 用主密码完成首次设置并解锁, 在已解锁的保险库上创建自定义类型服务环境.
 * @param harness 保险库服务测试环境.
 * @returns 自定义类型服务环境.
 */
export async function createUnlockedCustomEntryTypeFixture(
  harness: VaultServiceHarness,
): Promise<CustomEntryTypeFixture> {
  const vault = await startService(harness);
  await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
  return createCustomEntryTypeFixture(vault);
}

/**
 * 构造只有一个普通单行字段的新建类型输入.
 * @param name 类型名称.
 * @param fieldName 字段名.
 * @returns 新建类型输入.
 */
export function simpleTypeInputOf(
  name: string,
  fieldName = "甲",
): NewCustomEntryTypeInput {
  return {
    name,
    fields: [
      {
        name: fieldName,
        kind: "singleLine",
        isSensitive: false,
        isSummary: false,
      },
    ],
  };
}

/**
 * 构造新建类型输入, 没有给出的部分取 "路由器": 地址 (摘要), 口令 (保密), 说明 (多行). 默认编号
 * 下类型编号是 type-1, 口令的字段键是 field-type-2, 说明的字段键是 field-type-3.
 * @param overrides 要覆盖的部分.
 * @returns 新建类型输入.
 */
export function newCustomTypeInputOf(
  overrides: Partial<NewCustomEntryTypeInput> = {},
): NewCustomEntryTypeInput {
  return {
    name: "路由器",
    fields: [
      { name: "地址", kind: "singleLine", isSensitive: false, isSummary: true },
      {
        name: "口令",
        kind: "singleLine",
        isSensitive: true,
        isSummary: false,
      },
      {
        name: "说明",
        kind: "multiLine",
        isSensitive: false,
        isSummary: false,
      },
    ],
    ...overrides,
  };
}
