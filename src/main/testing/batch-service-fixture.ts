import { asc, sql } from "drizzle-orm";

import { BatchService } from "../batch/batch-service";
import type { EntryService } from "../entries/entry-service";
import type { FolderService } from "../folders/folder-service";
import type { TagService } from "../tags/tag-service";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { entries } from "../vault/database/entry-schema";
import { entryTags } from "../vault/database/tag-schema";
import type { VaultService } from "../vault/vault-service";
import {
  createEntryServiceFixture,
  newEntryInputOf,
} from "./entry-service-fixture";
import { createFolderServiceFixture } from "./folder-service-fixture";
import { createTagServiceFixture } from "./tag-service-fixture";
import {
  startService,
  type VaultServiceHarness,
} from "./vault-service-harness";
import { TEST_MASTER_PASSWORD } from "./vault-test-fixtures";

/**
 * 测试里的一次批量服务环境.
 */
export interface BatchServiceFixture {
  /**
   * 被测的批量服务.
   */
  readonly batch: BatchService;
  /**
   * 服务通过失败回调报告过的错误.
   */
  readonly failures: unknown[];
}

/**
 * 同一个已解锁保险库上的批量服务, 条目服务, 文件夹服务与标签服务.
 */
export interface BatchWorkspaceFixture extends BatchServiceFixture {
  /**
   * 保险库服务, 用来取数据库与模拟重启.
   */
  readonly vault: VaultService;
  /**
   * 条目服务, 编号依次为 id-1, id-2.
   */
  readonly entries: EntryService;
  /**
   * 文件夹服务, 编号依次为 folder-1, folder-2.
   */
  readonly folders: FolderService;
  /**
   * 标签服务, 编号依次为 tag-1, tag-2.
   */
  readonly tags: TagService;
}

/**
 * 在保险库服务之上创建批量服务.
 * @param vault 保险库服务.
 * @param getOrm 覆盖取数据库的方法, 默认取保险库服务的数据库.
 * @returns 批量服务环境.
 */
export function createBatchServiceFixture(
  vault: VaultService,
  getOrm: () => VaultOrm | undefined = () => vault.getOrm(),
): BatchServiceFixture {
  const failures: unknown[] = [];
  const batch = new BatchService({
    getOrm,
    onFailure: (error) => failures.push(error),
  });
  return { batch, failures };
}

/**
 * 在已解锁的保险库上创建批量服务与它依赖的三个服务.
 * @param vault 已解锁的保险库服务.
 * @returns 批量服务环境.
 */
export function createBatchWorkspace(
  vault: VaultService,
): BatchWorkspaceFixture {
  return {
    ...createBatchServiceFixture(vault),
    vault,
    entries: createEntryServiceFixture(vault).entries,
    folders: createFolderServiceFixture(vault).folders,
    tags: createTagServiceFixture(vault).tags,
  };
}

/**
 * 用主密码完成首次设置并解锁, 在已解锁的保险库上创建批量服务环境.
 * @param harness 保险库服务测试环境.
 * @returns 批量服务环境.
 */
export async function createUnlockedBatchFixture(
  harness: VaultServiceHarness,
): Promise<BatchWorkspaceFixture> {
  const vault = await startService(harness);
  await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
  return createBatchWorkspace(vault);
}

/**
 * 按名称依次新建通用登录条目.
 * @param entries 条目服务.
 * @param names 条目名称.
 * @returns 新建条目的编号, 顺序与名称一致.
 * @throws Error 当新建失败时.
 */
export function createNamedEntries(
  entries: EntryService,
  names: readonly string[],
): readonly string[] {
  return names.map((name) => {
    const created = entries.create(newEntryInputOf({ name }));
    if (!created.ok) {
      throw new Error(`新建条目失败: ${created.reason}`);
    }
    return created.value.id;
  });
}

/**
 * 取已解锁保险库的数据库.
 * @param vault 保险库服务.
 * @returns 数据库的查询入口.
 * @throws Error 当保险库未解锁时.
 */
function requireOrm(vault: VaultService): VaultOrm {
  const orm = vault.getOrm();
  if (orm === undefined) {
    throw new Error("保险库未解锁");
  }
  return orm;
}

/**
 * 直接往条目表插入若干只有编号与名称的条目, 编号是 `bulk-1`, `bulk-2` 依次递增, 用来准备大批量数据.
 * @param vault 已解锁的保险库服务.
 * @param count 要插入的条目个数.
 * @returns 插入条目的编号.
 */
export function insertBareEntries(
  vault: VaultService,
  count: number,
): readonly string[] {
  const ids = Array.from({ length: count }, (_, index) => `bulk-${index + 1}`);
  const orm = requireOrm(vault);
  for (let start = 0; start < ids.length; start += 100) {
    orm
      .insert(entries)
      .values(
        ids.slice(start, start + 100).map((id, offset) => ({
          id,
          name: id,
          createdAt: start + offset,
        })),
      )
      .run();
  }
  return ids;
}

/**
 * 读出条目与标签的全部关联行, 按条目编号与选择顺序排列.
 * @param vault 已解锁的保险库服务.
 * @returns 关联行.
 */
export function listEntryTagRows(
  vault: VaultService,
): readonly (typeof entryTags.$inferSelect)[] {
  return requireOrm(vault)
    .select()
    .from(entryTags)
    .orderBy(asc(entryTags.entryId), asc(entryTags.position))
    .all();
}

/**
 * 数一数条目表里的记录个数.
 * @param vault 已解锁的保险库服务.
 * @returns 记录个数.
 */
export function countEntryRows(vault: VaultService): number {
  return requireOrm(vault).select().from(entries).all().length;
}

/**
 * 在数据库里执行一条语句, 用来建触发器让之后的写入报错, 模拟事务中途失败.
 * @param vault 已解锁的保险库服务.
 * @param statement 要执行的语句.
 * @throws Error 当保险库未解锁时.
 */
export function injectDatabaseFailure(
  vault: VaultService,
  statement: string,
): void {
  requireOrm(vault).run(sql.raw(statement));
}
