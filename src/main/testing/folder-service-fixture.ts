import type { EntryService } from "../entries/entry-service";
import { FolderService } from "../folders/folder-service";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import type { VaultService } from "../vault/vault-service";
import { createEntryServiceFixture } from "./entry-service-fixture";
import {
  startService,
  type VaultServiceHarness,
} from "./vault-service-harness";
import { TEST_MASTER_PASSWORD } from "./vault-test-fixtures";

/**
 * 测试里的一次文件夹服务环境.
 */
export interface FolderServiceFixture {
  /**
   * 被测的文件夹服务.
   */
  readonly folders: FolderService;
  /**
   * 服务通过失败回调报告过的错误.
   */
  readonly failures: unknown[];
}

/**
 * 在保险库服务之上创建文件夹服务, 编号依次为 folder-1, folder-2, 时间依次递增.
 * @param vault 保险库服务.
 * @param getOrm 覆盖取数据库的方法, 默认取保险库服务的数据库.
 * @returns 文件夹服务环境.
 */
export function createFolderServiceFixture(
  vault: VaultService,
  getOrm: () => VaultOrm | undefined = () => vault.getOrm(),
): FolderServiceFixture {
  const failures: unknown[] = [];
  let counter = 0;
  const folders = new FolderService({
    getOrm,
    createIdentifier: () => `folder-${(counter += 1)}`,
    now: () => 2000 + counter,
    onFailure: (error) => failures.push(error),
  });
  return { folders, failures };
}

/**
 * 同一个已解锁保险库上的文件夹服务与条目服务.
 */
export interface FolderAndEntryFixture extends FolderServiceFixture {
  /**
   * 条目服务, 编号依次为 id-1, id-2.
   */
  readonly entries: EntryService;
}

/**
 * 用主密码完成首次设置并解锁, 在已解锁的保险库上创建文件夹服务与条目服务.
 * @param harness 保险库服务测试环境.
 * @returns 两个服务.
 */
export async function createUnlockedFolderAndEntryFixture(
  harness: VaultServiceHarness,
): Promise<FolderAndEntryFixture> {
  const vault = await startService(harness);
  await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
  return {
    ...createFolderServiceFixture(vault),
    entries: createEntryServiceFixture(vault).entries,
  };
}

/**
 * 用主密码完成首次设置并解锁, 在已解锁的保险库上创建文件夹服务环境.
 * @param harness 保险库服务测试环境.
 * @returns 文件夹服务环境.
 */
export async function createUnlockedFolderFixture(
  harness: VaultServiceHarness,
): Promise<FolderServiceFixture> {
  const vault = await startService(harness);
  await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
  return createFolderServiceFixture(vault);
}
