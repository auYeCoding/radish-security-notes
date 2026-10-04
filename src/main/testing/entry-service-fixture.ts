import { vi } from "vitest";

import type {
  EntryDetail,
  NewEntryInput,
  UpdateEntryInput,
} from "@shared/entries/entry-types";
import type { PresetEntryTypeDefinition } from "@shared/entries/preset-entry-types";
import { LOGIN_TYPE } from "@shared/entries/preset-types/login-type";

import type { ClipboardPort } from "../entries/clipboard-port";
import { EntryService } from "../entries/entry-service";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import type { VaultService } from "../vault/vault-service";
import {
  startService,
  type VaultServiceHarness,
} from "./vault-service-harness";
import { TEST_MASTER_PASSWORD } from "./vault-test-fixtures";

/**
 * 测试里的一次条目服务环境.
 */
export interface EntryServiceFixture {
  /**
   * 被测的条目服务.
   */
  readonly entries: EntryService;
  /**
   * 假剪贴板写入方法的间谍.
   */
  readonly writeText: ReturnType<typeof vi.fn<(text: string) => void>>;
  /**
   * 服务通过失败回调报告过的错误.
   */
  readonly failures: unknown[];
}

/**
 * 在保险库服务之上创建条目服务, 编号依次为 id-1, id-2, 时间依次递增.
 * @param vault 保险库服务.
 * @param getOrm 覆盖取数据库的方法, 默认取保险库服务的数据库.
 * @returns 条目服务环境.
 */
export function createEntryServiceFixture(
  vault: VaultService,
  getOrm: () => VaultOrm | undefined = () => vault.getOrm(),
): EntryServiceFixture {
  const writeText = vi.fn<(text: string) => void>();
  const clipboard: ClipboardPort = { writeText };
  const failures: unknown[] = [];
  let counter = 0;
  const entries = new EntryService({
    getOrm,
    clipboard,
    createIdentifier: () => `id-${(counter += 1)}`,
    now: () => 1000 + counter,
    onFailure: (error) => failures.push(error),
  });
  return { entries, writeText, failures };
}

/**
 * 用主密码完成首次设置并解锁, 在已解锁的保险库上创建条目服务环境.
 * @param harness 保险库服务测试环境.
 * @returns 条目服务环境.
 */
export async function createUnlockedEntryFixture(
  harness: VaultServiceHarness,
): Promise<EntryServiceFixture> {
  const vault = await startService(harness);
  await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
  return createEntryServiceFixture(vault);
}

/**
 * 类型的全部字段都为空串的取值.
 * @param type 条目类型定义.
 * @returns 字段键到空串的取值.
 */
export function emptyFieldValuesOf(
  type: PresetEntryTypeDefinition,
): Record<string, string> {
  return Object.fromEntries(type.fields.map((field) => [field.key, ""]));
}

/**
 * 类型的全部字段都有值的取值: 值里带类型键与字段键, 彼此不同, 多行字段的值有两行.
 * @param type 条目类型定义.
 * @returns 字段键到非空值的取值.
 */
export function sampleFieldValuesOf(
  type: PresetEntryTypeDefinition,
): Record<string, string> {
  return Object.fromEntries(
    type.fields.map((field) => {
      const value = `${type.key}-${field.key}`;
      return [field.key, field.isMultiline ? `${value}-1\n${value}-2` : value];
    }),
  );
}

/**
 * 构造新建输入, 没有给出的字段取通用登录的空值.
 * @param overrides 要覆盖的字段.
 * @returns 新建输入.
 */
export function newEntryInputOf(
  overrides: Partial<NewEntryInput> = {},
): NewEntryInput {
  return {
    type: "login",
    name: "条目",
    fields: emptyFieldValuesOf(LOGIN_TYPE),
    notes: "",
    notesFormat: "plain",
    customFields: [],
    totp: "",
    ...overrides,
  };
}

/**
 * 构造更新输入, 没有给出的字段取通用登录的空值, 不改动也不移除 TOTP.
 * @param overrides 要覆盖的字段.
 * @returns 更新输入.
 */
export function updateEntryInputOf(
  overrides: Partial<UpdateEntryInput> = {},
): UpdateEntryInput {
  return {
    name: "条目",
    fields: emptyFieldValuesOf(LOGIN_TYPE),
    notes: "",
    notesFormat: "plain",
    customFields: [],
    totp: "",
    removeTotp: false,
    ...overrides,
  };
}

/**
 * 构造期望的条目详情, 没有给出的字段取通用登录的空值, 编号默认是第一个新建条目的 id-1.
 * @param overrides 要覆盖的字段.
 * @returns 条目详情.
 */
export function detailOf(overrides: Partial<EntryDetail> = {}): EntryDetail {
  return {
    id: "id-1",
    name: "条目",
    type: "login",
    account: "",
    fields: emptyFieldValuesOf(LOGIN_TYPE),
    notes: "",
    notesFormat: "plain",
    customFields: [],
    hasTotp: false,
    ...overrides,
  };
}
